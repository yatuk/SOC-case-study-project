"""
Generic CSV Normalizer
Handles cybersecurity attack datasets and other generic CSV formats.
"""

from typing import Dict, Optional, List
from ..utils import (
    parse_timestamp, generate_event_id, 
    safe_get, safe_int, safe_float,
    detect_timestamp_field, detect_user_field, detect_ip_field
)
from ..pseudo import (
    pseudonymize_email, pseudonymize_ip, pseudonymize_hostname,
    get_geo_code
)

# Attack type to severity mapping
ATTACK_SEVERITY = {
    "malware": 7,
    "ddos": 6,
    "intrusion": 8,
    "phishing": 6,
    "ransomware": 9,
    "apt": 9,
    "brute_force": 5,
    "sql_injection": 7,
    "xss": 5,
    "data_breach": 8,
}


def detect_family(headers: List[str]) -> bool:
    """Check if this is a cybersecurity attacks dataset."""
    headers_lower = [h.lower() for h in headers]
    
    indicators = [
        'timestamp' in headers_lower,
        any('ip' in h for h in headers_lower),
        'attack type' in headers_lower or 'attack_type' in headers_lower,
        'severity' in headers_lower or 'severity level' in headers_lower,
        'protocol' in headers_lower,
        'action taken' in headers_lower or 'action_taken' in headers_lower,
    ]
    return sum(indicators) >= 3


def normalize_attack_row(row: Dict, row_index: int = 0) -> Optional[Dict]:
    """Normalize a cybersecurity attack dataset row to canonical event."""
    try:
        # Try to find timestamp
        ts_field = None
        for field in ['Timestamp', 'timestamp', 'time', 'Time', 'datetime']:
            if field in row:
                ts_field = field
                break
        
        ts = parse_timestamp(row.get(ts_field, '')) if ts_field else None
        if not ts:
            # Generate a synthetic timestamp
            from datetime import datetime, timedelta
            base = datetime.now() - timedelta(days=7)
            synthetic_ts = base + timedelta(minutes=row_index)
            ts = synthetic_ts.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Extract attack type
        attack_type = (
            row.get('Attack Type') or 
            row.get('attack_type') or 
            row.get('attack') or 
            'unknown'
        ).strip().lower()
        
        event_type = f"attack.{attack_type.replace(' ', '_')}"
        
        # Extract IPs
        src_ip_raw = (
            row.get('Source IP Address') or 
            row.get('source_ip') or 
            row.get('src_ip') or 
            ''
        )
        dst_ip_raw = (
            row.get('Destination IP Address') or 
            row.get('dest_ip') or 
            row.get('dst_ip') or 
            ''
        )
        
        network = None
        if src_ip_raw or dst_ip_raw:
            network = {}
            if src_ip_raw:
                network["src_ip"] = pseudonymize_ip(src_ip_raw, is_source=True)
                network["src_geo"] = get_geo_code(src_ip_raw)
            if dst_ip_raw:
                network["dst_ip"] = pseudonymize_ip(dst_ip_raw, is_source=False)
                network["dst_geo"] = get_geo_code(dst_ip_raw)
            
            # Ports
            src_port = row.get('Source Port') or row.get('source_port')
            dst_port = row.get('Destination Port') or row.get('dest_port')
            if src_port:
                network["src_port"] = safe_int(src_port)
            if dst_port:
                network["dst_port"] = safe_int(dst_port)
            
            # Protocol
            protocol = row.get('Protocol') or row.get('protocol')
            if protocol:
                network["protocol"] = protocol.upper()
        
        # Extract user info
        user_info = row.get('User Information') or row.get('user') or row.get('username')
        user = pseudonymize_email(f"{user_info}@temp.local") if user_info else None
        
        # Extract device info
        device_info = row.get('Device Information') or row.get('device')
        device = None
        if device_info:
            device = {
                "id": f"dev-{hash(device_info) % 10000:04d}",
                "hostname": pseudonymize_hostname(str(device_info)[:30]),
                "user_agent": device_info[:200] if len(str(device_info)) > 30 else None
            }
        
        # Determine severity
        severity_raw = (
            row.get('Severity Level') or 
            row.get('severity') or 
            row.get('Severity') or 
            ''
        ).lower()
        
        if severity_raw in ['critical', 'high']:
            severity = 8
        elif severity_raw == 'medium':
            severity = 5
        elif severity_raw == 'low':
            severity = 3
        else:
            severity = ATTACK_SEVERITY.get(attack_type, 5)
        
        # Anomaly score boost
        anomaly_score = safe_float(row.get('Anomaly Scores') or row.get('anomaly_score'), 0)
        if anomaly_score > 70:
            severity = min(severity + 2, 10)
        elif anomaly_score > 50:
            severity = min(severity + 1, 10)
        
        # Build tags
        tags = ["simulated", "normalized", "attack_dataset"]
        
        if attack_type:
            tags.append(f"attack:{attack_type}")
        
        # Malware indicators
        malware_ind = row.get('Malware Indicators') or row.get('malware_indicators')
        if malware_ind and 'detected' in str(malware_ind).lower():
            tags.append("malware_detected")
            severity = max(severity, 7)
        
        # Alert status
        alert = row.get('Alerts/Warnings') or row.get('alerts')
        if alert and 'triggered' in str(alert).lower():
            tags.append("alert_triggered")
        
        # Action taken
        action = (row.get('Action Taken') or row.get('action') or '').lower()
        if action:
            tags.append(f"action:{action}")
            if 'blocked' in action:
                tags.append("blocked")
        
        # Build canonical event
        event = {
            "event_id": generate_event_id("atk"),
            "ts": ts,
            "source": "attack_dataset",
            "event_type": event_type,
            "severity": severity,
            "tags": tags,
            "raw": {
                "attack_type": attack_type,
                "severity_level": severity_raw,
                "action_taken": action,
                "anomaly_score": anomaly_score
            }
        }
        
        if user:
            event["user"] = user
        if device:
            event["device"] = device
        if network:
            event["network"] = network
        
        # Add payload snippet if available
        payload = row.get('Payload Data') or row.get('payload')
        if payload:
            event["raw"]["payload_snippet"] = str(payload)[:100]
        
        return event
        
    except Exception as e:
        return None


def normalize_generic_row(row: Dict, headers: List[str], row_index: int = 0) -> Optional[Dict]:
    """Normalize a generic CSV row using field detection."""
    try:
        # Detect timestamp field
        ts = None
        for field in headers:
            if any(x in field.lower() for x in ['time', 'date', 'timestamp']):
                ts = parse_timestamp(row.get(field))
                if ts:
                    break
        
        if not ts:
            from datetime import datetime, timedelta
            base = datetime.now() - timedelta(days=7)
            synthetic_ts = base + timedelta(minutes=row_index)
            ts = synthetic_ts.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Detect user field
        user = None
        for field in headers:
            if any(x in field.lower() for x in ['user', 'email', 'account', 'name']):
                val = row.get(field)
                if val and '@' in str(val):
                    user = pseudonymize_email(val)
                elif val:
                    user = pseudonymize_email(f"{val}@temp.local")
                if user:
                    break
        
        # Detect IP field
        network = None
        for field in headers:
            if any(x in field.lower() for x in ['ip', 'address', 'src', 'dst']):
                val = row.get(field)
                if val and '.' in str(val):
                    is_src = 'src' in field.lower() or 'source' in field.lower()
                    ip = pseudonymize_ip(val, is_source=is_src)
                    network = network or {}
                    if is_src:
                        network["src_ip"] = ip
                    else:
                        network["dst_ip"] = ip
        
        # Build event
        event = {
            "event_id": generate_event_id("gen"),
            "ts": ts,
            "source": "generic",
            "event_type": "generic.event",
            "severity": 2,
            "tags": ["simulated", "normalized", "generic"],
            "raw": {k: str(v)[:100] for k, v in list(row.items())[:10]}
        }
        
        if user:
            event["user"] = user
        if network:
            event["network"] = network
        
        return event
        
    except Exception as e:
        return None
