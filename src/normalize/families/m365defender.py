"""
Microsoft 365 Defender Events Normalizer
Handles M365 Defender advanced hunting format.
"""

import json
from typing import Dict, Optional
from ..utils import (
    parse_timestamp, generate_event_id, generate_device_id,
    safe_get, truncate_raw
)
from ..pseudo import (
    pseudonymize_email, pseudonymize_ip, pseudonymize_hostname,
    pseudonymize_domain, get_geo_code
)

# ActionType to event_type mapping
ACTION_TYPE_MAP = {
    "LdapSearch": "ad.ldap_search",
    "LdapModify": "ad.ldap_modify",
    "LdapAdd": "ad.ldap_add",
    "LdapDelete": "ad.ldap_delete",
    "Directory Services replication": "ad.dcsync",
    "ProcessCreated": "endpoint.process_start",
    "FileCreated": "endpoint.file_create",
    "FileModified": "endpoint.file_modify",
    "FileDeleted": "endpoint.file_delete",
    "FileRenamed": "endpoint.file_rename",
    "RegistryValueSet": "endpoint.registry_set",
    "RegistryKeyCreated": "endpoint.registry_create",
    "NetworkConnectionCreated": "endpoint.network_connect",
    "DnsQueryResponse": "network.dns_response",
    "ConnectionSuccess": "network.connection_success",
    "ConnectionFailed": "network.connection_failed",
    "MailItemsAccessed": "email.mailbox_access",
    "Add delegated permission grant.": "idp.permission_grant",
    "Consent to application.": "idp.app_consent",
    "AntivirusDetection": "endpoint.av_detect",
    "BehaviorDetection": "endpoint.behavior_detect",
    "ExploitGuardNetworkProtectionBlocked": "endpoint.network_blocked",
}

# High severity action types
HIGH_SEVERITY_ACTIONS = [
    "Directory Services replication",  # DCSync attack indicator
    "AntivirusDetection",
    "BehaviorDetection",
    "ExploitGuardNetworkProtectionBlocked",
]

MEDIUM_SEVERITY_ACTIONS = [
    "MailItemsAccessed",
    "Add delegated permission grant",
    "Consent to application",
    "LdapSearch",  # Can indicate reconnaissance
]


def detect_family(obj: Dict) -> bool:
    """Check if this is an M365 Defender Event."""
    indicators = [
        'ActionType' in obj,
        'DeviceName' in obj or 'DeviceId' in obj,
        'InitiatingProcessFileName' in obj,
        'Timestamp' in obj and 'T' in str(obj.get('Timestamp', '')),
        'ReportId' in obj or 'ReportId_long' in obj,
        obj.get('Application') in ['Active Directory', 'Microsoft Exchange Online', 'Office 365'],
    ]
    return sum(indicators) >= 2


def normalize(obj: Dict) -> Optional[Dict]:
    """Normalize M365 Defender Event to canonical format."""
    try:
        # Extract action type
        action_type = obj.get('ActionType', 'unknown')
        event_type = ACTION_TYPE_MAP.get(action_type, f"m365.{action_type.lower().replace(' ', '_')[:30]}")
        
        # Extract timestamp
        ts = parse_timestamp(obj.get('Timestamp'))
        if not ts:
            return None
        
        # Extract user info
        user = None
        user_fields = [
            'AccountUpn', 'InitiatingProcessAccountUpn', 
            'AccountDisplayName', 'AccountName', 'UserId'
        ]
        for field in user_fields:
            val = obj.get(field)
            if val and val.strip():
                user = pseudonymize_email(val)
                break
        
        # If no user from fields, try nested RawEventData
        if not user:
            raw_data = obj.get('RawEventData') or obj.get('rawData')
            if raw_data and isinstance(raw_data, dict):
                user_id = raw_data.get('UserId') or raw_data.get('MailboxOwnerUPN')
                if user_id:
                    user = pseudonymize_email(user_id)
        
        # Extract device info
        hostname_raw = obj.get('DeviceName', '')
        device = None
        if hostname_raw:
            hostname = pseudonymize_hostname(hostname_raw)
            device = {
                "id": generate_device_id(hostname_raw),
                "hostname": hostname,
                "os": obj.get('OSPlatform') or "Windows"
            }
        
        # Extract network info
        network = None
        src_ip = obj.get('IPAddress') or obj.get('LocalIP') or ''
        dst_ip = obj.get('DestinationIPAddress') or obj.get('RemoteIP') or ''
        
        if src_ip or dst_ip:
            network = {}
            if src_ip:
                network["src_ip"] = pseudonymize_ip(src_ip, is_source=True)
                network["src_geo"] = get_geo_code(src_ip)
            if dst_ip:
                network["dst_ip"] = pseudonymize_ip(dst_ip, is_source=False)
                network["dst_geo"] = get_geo_code(dst_ip)
            
            dst_port = obj.get('DestinationPort') or obj.get('RemotePort')
            if dst_port:
                try:
                    network["dst_port"] = int(dst_port)
                except:
                    pass
        
        # Extract process info
        process = None
        proc_name = obj.get('InitiatingProcessFileName') or obj.get('FileName')
        if proc_name:
            process = {
                "name": proc_name,
                "path": obj.get('InitiatingProcessFolderPath'),
                "cmdline": obj.get('InitiatingProcessCommandLine') or obj.get('ProcessCommandLine'),
            }
            
            pid = obj.get('InitiatingProcessId')
            if pid:
                try:
                    process["pid"] = int(pid)
                except:
                    pass
            
            parent = obj.get('InitiatingProcessParentFileName')
            if parent:
                process["parent_name"] = parent
            
            # Add hashes if available
            sha256 = obj.get('InitiatingProcessSHA256') or obj.get('SHA256')
            if sha256:
                process["sha256"] = sha256
        
        # Extract artifact info
        artifact = None
        file_path = obj.get('FolderPath') or obj.get('FilePath')
        if file_path:
            artifact = {
                "file_path": file_path,
                "file_name": obj.get('FileName')
            }
            sha256 = obj.get('SHA256')
            if sha256:
                artifact["hash"] = f"sha256:{sha256}"
        
        # Determine severity
        if action_type in HIGH_SEVERITY_ACTIONS:
            severity = 8
        elif action_type in MEDIUM_SEVERITY_ACTIONS:
            severity = 5
        elif 'fail' in action_type.lower() or 'blocked' in action_type.lower():
            severity = 6
        else:
            severity = 3
        
        # Boost severity for certain patterns
        if 'dcsync' in event_type.lower() or 'replication' in action_type.lower():
            severity = 9  # DCSync is critical
        if process and process.get('name', '').lower() == 'powershell.exe':
            severity = max(severity, 5)
        
        # Build tags
        tags = ["simulated", "normalized", "m365defender"]
        
        app = obj.get('Application')
        if app:
            tags.append(f"app:{app.lower().replace(' ', '_')[:20]}")
        
        if 'ldap' in action_type.lower():
            tags.append("ldap")
            tags.append("reconnaissance")
        if 'mail' in action_type.lower():
            tags.append("email")
        if 'replication' in action_type.lower():
            tags.append("mitre:T1003.006")  # DCSync
        if 'permission' in action_type.lower() or 'consent' in action_type.lower():
            tags.append("oauth")
        
        # Build canonical event
        event = {
            "event_id": generate_event_id("m365"),
            "ts": ts,
            "source": "m365defender",
            "event_type": event_type,
            "severity": severity,
            "tags": tags,
            "raw": truncate_raw(obj)
        }
        
        if user:
            event["user"] = user
        if device:
            event["device"] = device
        if network:
            event["network"] = network
        if process:
            event["process"] = process
        if artifact:
            event["artifact"] = artifact
        
        return event
        
    except Exception as e:
        return None
