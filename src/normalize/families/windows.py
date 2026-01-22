"""
Windows Security Events Normalizer
Handles Windows Event Log format (EventID 4624, 4625, 4662, 4688, etc.)
"""

from typing import Dict, Optional, List
from ..utils import (
    parse_timestamp, generate_event_id, generate_device_id,
    safe_get, truncate_raw, infer_severity
)
from ..pseudo import (
    pseudonymize_username, pseudonymize_ip, pseudonymize_hostname,
    get_geo_code
)

# Windows Event ID mappings
EVENT_TYPE_MAP = {
    4624: "auth.login_success",
    4625: "auth.login_fail",
    4634: "auth.logoff",
    4647: "auth.logoff_user",
    4648: "auth.login_explicit",
    4662: "ad.object_access",
    4663: "file.access",
    4688: "process.start",
    4689: "process.stop",
    4697: "service.install",
    4698: "task.create",
    4699: "task.delete",
    4700: "task.enable",
    4701: "task.disable",
    4702: "task.update",
    4720: "account.create",
    4722: "account.enable",
    4723: "account.password_change",
    4724: "account.password_reset",
    4725: "account.disable",
    4726: "account.delete",
    4728: "group.member_add",
    4729: "group.member_remove",
    4732: "group.member_add_local",
    4733: "group.member_remove_local",
    4738: "account.modify",
    4740: "account.lockout",
    4756: "group.member_add_universal",
    4757: "group.member_remove_universal",
    4768: "kerberos.tgt_request",
    4769: "kerberos.service_ticket",
    4770: "kerberos.ticket_renew",
    4771: "kerberos.preauth_fail",
    4776: "ntlm.auth",
    4778: "session.reconnect",
    4779: "session.disconnect",
    5136: "ad.object_modify",
    5137: "ad.object_create",
    5138: "ad.object_undelete",
    5139: "ad.object_move",
    5140: "share.access",
    5141: "ad.object_delete",
    5145: "share.access_check",
    5156: "network.connection_allowed",
    5157: "network.connection_blocked",
    7045: "service.install_scm",
    18: "sysmon.pipe_connect",
    1: "sysmon.process_create",
    3: "sysmon.network_connect",
    11: "sysmon.file_create",
    13: "sysmon.registry_value",
    412: "adfs.audit",
    501: "adfs.claims",
    33205: "sql.audit",
}

# Severity by EventID
SEVERITY_MAP = {
    4625: 6,  # Login fail
    4662: 5,  # AD object access
    4688: 3,  # Process start
    4720: 7,  # Account create
    4726: 7,  # Account delete
    4728: 6,  # Group member add
    4740: 7,  # Account lockout
    4771: 6,  # Kerberos preauth fail
    7045: 7,  # Service install
}


def detect_family(obj: Dict) -> bool:
    """Check if this is a Windows Event."""
    indicators = [
        'EventID' in obj,
        'Computer' in obj,
        obj.get('Type') == 'SecurityEvent',
        obj.get('SourceSystem') == 'OpsManager',
        'EventSourceName' in obj,
        'Channel' in obj and 'Security' in str(obj.get('Channel', '')),
    ]
    return sum(indicators) >= 2


def normalize(obj: Dict) -> Optional[Dict]:
    """Normalize Windows Event to canonical format."""
    try:
        # Extract EventID
        event_id_raw = obj.get('EventID')
        if event_id_raw is None:
            return None
        event_id_num = int(event_id_raw) if event_id_raw else 0
        
        # Map event type
        event_type = EVENT_TYPE_MAP.get(event_id_num, f"windows.event_{event_id_num}")
        
        # Extract timestamp
        ts = parse_timestamp(
            obj.get('TimeGenerated') or 
            obj.get('timestamp') or 
            obj.get('TimeCollected')
        )
        if not ts:
            return None
        
        # Extract user info
        user_raw = (
            obj.get('TargetUserName') or 
            obj.get('Account') or 
            obj.get('TargetAccount') or
            obj.get('SubjectUserName') or
            ''
        )
        user = pseudonymize_username(user_raw) if user_raw else None
        
        # Extract device info
        hostname_raw = obj.get('Computer', '')
        hostname = pseudonymize_hostname(hostname_raw)
        device = {
            "id": generate_device_id(hostname_raw),
            "hostname": hostname,
            "os": "Windows Server" if any(x in hostname_raw.lower() for x in ['dc', 'srv', 'adfs']) else "Windows 10"
        } if hostname else None
        
        # Extract network info
        src_ip_raw = obj.get('IpAddress') or obj.get('ClientIPAddress') or ''
        if src_ip_raw and src_ip_raw != '-':
            src_ip = pseudonymize_ip(src_ip_raw, is_source=True)
            network = {
                "src_ip": src_ip,
                "src_geo": get_geo_code(src_ip_raw)
            }
            # Add port if available
            port = obj.get('IpPort')
            if port and port != '-':
                network["src_port"] = int(port) if str(port).isdigit() else None
        else:
            network = None
        
        # Extract process info (for EventID 4688, Sysmon events)
        process = None
        if event_id_num in [4688, 1]:
            process_name = obj.get('ProcessName') or obj.get('Process') or obj.get('Image')
            if process_name and process_name != '-':
                process = {
                    "name": process_name.split('\\')[-1] if process_name else None,
                    "path": process_name,
                    "cmdline": obj.get('CommandLine') or obj.get('ProcessCommandLine')
                }
                pid = obj.get('ProcessId') or obj.get('ProcessId_string')
                if pid and pid != '-':
                    try:
                        process["pid"] = int(pid, 16) if pid.startswith('0x') else int(pid)
                    except:
                        pass
        
        # Sysmon specific
        if event_id_num == 18:  # Pipe connect
            process = {
                "name": obj.get('Image', '').split('\\')[-1],
                "path": obj.get('Image'),
            }
        
        # Determine severity
        severity = SEVERITY_MAP.get(event_id_num, 2)
        
        # Check for suspicious patterns
        activity = obj.get('Activity', '')
        if 'fail' in activity.lower() or 'denied' in activity.lower():
            severity = max(severity, 5)
        if 'admin' in str(user_raw).lower():
            severity = max(severity, 4)
        
        # Build tags
        tags = ["simulated", "normalized", "windows"]
        if event_id_num in [4624, 4625, 4648]:
            tags.append("authentication")
        if event_id_num in [4662, 5136, 5137]:
            tags.append("ad_access")
        if event_id_num in [4688, 1]:
            tags.append("process")
        
        # Logon type for auth events
        logon_type = obj.get('LogonType')
        if logon_type:
            tags.append(f"logon_type_{logon_type}")
        
        # Build canonical event
        event = {
            "event_id": generate_event_id("win"),
            "ts": ts,
            "source": "windows",
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
        
        return event
        
    except Exception as e:
        # Log error and return None
        return None
