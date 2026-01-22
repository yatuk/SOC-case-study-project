"""
Utility functions for dataset normalization.
Timestamp parsing, ID generation, field inference.
"""

import re
import hashlib
from datetime import datetime
from typing import Optional, Any, Dict, List

# Event counter for deterministic IDs
_event_counter = 0
_ioc_counter = 0


def reset_counters():
    """Reset counters for deterministic generation."""
    global _event_counter, _ioc_counter
    _event_counter = 0
    _ioc_counter = 0


def generate_event_id(prefix: str = "evt") -> str:
    """Generate sequential event ID."""
    global _event_counter
    _event_counter += 1
    return f"{prefix}-{_event_counter:06d}"


def generate_ioc_id() -> str:
    """Generate sequential IOC ID."""
    global _ioc_counter
    _ioc_counter += 1
    return f"ioc-{_ioc_counter:06d}"


def generate_user_id(email_or_name: str) -> str:
    """Generate stable user ID from identifier."""
    if not email_or_name:
        return "usr-unknown"
    h = hashlib.sha1(email_or_name.lower().encode()).hexdigest()[:8]
    return f"usr-{h}"


def generate_device_id(hostname: str) -> str:
    """Generate stable device ID from hostname."""
    if not hostname:
        return "dev-unknown"
    h = hashlib.sha1(hostname.lower().encode()).hexdigest()[:8]
    return f"dev-{h}"


# Timestamp parsing patterns
TIMESTAMP_PATTERNS = [
    # ISO 8601 variants
    (r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$', '%Y-%m-%dT%H:%M:%S'),
    (r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$', '%Y-%m-%dT%H:%M:%S.%f'),
    # Common datetime formats
    (r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$', '%Y-%m-%d %H:%M:%S'),
    (r'^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}$', '%Y/%m/%d %H:%M:%S'),
    # Date only
    (r'^\d{4}-\d{2}-\d{2}$', '%Y-%m-%d'),
]


def parse_timestamp(value: Any) -> Optional[str]:
    """
    Parse various timestamp formats into ISO 8601 string.
    Returns None if parsing fails.
    """
    if value is None:
        return None
    
    # Handle numeric (epoch)
    if isinstance(value, (int, float)):
        try:
            # Assume milliseconds if > 10 billion
            if value > 10_000_000_000:
                value = value / 1000
            dt = datetime.utcfromtimestamp(value)
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        except:
            return None
    
    value = str(value).strip()
    if not value:
        return None
    
    # Remove trailing Z for parsing, add back later
    has_z = value.endswith('Z')
    if has_z:
        value = value[:-1]
    
    # Handle microseconds with variable precision
    # Truncate to 6 digits if longer
    match = re.match(r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)$', value)
    if match:
        base, frac = match.groups()
        # Truncate or pad to 6 digits
        frac = (frac + '000000')[:6]
        value = f"{base}.{frac}"
        try:
            dt = datetime.strptime(value, '%Y-%m-%dT%H:%M:%S.%f')
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        except:
            pass
    
    # Try each pattern
    for pattern, fmt in TIMESTAMP_PATTERNS:
        if re.match(pattern, value):
            try:
                # Handle the ISO format specially
                if 'T' in value and '.' in value:
                    # Already handled above
                    continue
                dt = datetime.strptime(value.split('.')[0], fmt.split('.')[0])
                return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
            except:
                continue
    
    # Try direct ISO parse as fallback
    try:
        # Remove any timezone suffix
        clean = re.sub(r'[+-]\d{2}:\d{2}$', '', value)
        clean = clean.replace('Z', '')
        if '.' in clean:
            dt = datetime.fromisoformat(clean.split('.')[0])
        else:
            dt = datetime.fromisoformat(clean)
        return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    except:
        pass
    
    return None


def safe_get(obj: Dict, *keys, default=None) -> Any:
    """Safely get nested dictionary value."""
    current = obj
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key, default)
        else:
            return default
        if current is None:
            return default
    return current


def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert to int."""
    if value is None:
        return default
    try:
        return int(value)
    except:
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert to float."""
    if value is None:
        return default
    try:
        return float(value)
    except:
        return default


def extract_domain(url: str) -> Optional[str]:
    """Extract domain from URL."""
    if not url:
        return None
    # Simple regex extraction
    match = re.search(r'(?:https?://)?(?:www\.)?([^/:]+)', url)
    return match.group(1) if match else None


def extract_email_parts(email: str) -> tuple:
    """Extract local part and domain from email."""
    if not email or '@' not in email:
        return (email or '', '')
    parts = email.split('@', 1)
    return (parts[0], parts[1])


def is_private_ip(ip: str) -> bool:
    """Check if IP is in private range."""
    if not ip:
        return False
    # Simple check for common private ranges
    return (
        ip.startswith('10.') or
        ip.startswith('192.168.') or
        ip.startswith('172.16.') or
        ip.startswith('172.17.') or
        ip.startswith('172.18.') or
        ip.startswith('172.19.') or
        ip.startswith('172.2') or
        ip.startswith('172.30.') or
        ip.startswith('172.31.') or
        ip.startswith('127.') or
        ip.startswith('fe80:') or
        ip == 'localhost'
    )


def truncate_raw(obj: Dict, max_keys: int = 15) -> Dict:
    """Truncate raw object to limited keys for storage."""
    if not obj or not isinstance(obj, dict):
        return {}
    
    # Priority keys to keep
    priority = [
        'EventID', 'ActionType', 'OperationName', 'Activity', 'Type',
        'TimeGenerated', 'Timestamp', 'Computer', 'Account',
        'TargetUserName', 'IpAddress', 'Result', 'Severity'
    ]
    
    result = {}
    # Add priority keys first
    for key in priority:
        if key in obj and len(result) < max_keys:
            val = obj[key]
            # Skip large nested objects
            if isinstance(val, (dict, list)):
                if isinstance(val, list) and len(val) > 3:
                    val = val[:3]
                elif isinstance(val, dict) and len(val) > 5:
                    val = {k: v for i, (k, v) in enumerate(val.items()) if i < 5}
            result[key] = val
    
    # Fill remaining slots
    for key, val in obj.items():
        if key not in result and len(result) < max_keys:
            if not isinstance(val, (dict, list)):
                result[key] = val
    
    return result


def detect_timestamp_field(obj: Dict) -> Optional[str]:
    """Detect which field contains the timestamp."""
    candidates = [
        'TimeGenerated', 'Timestamp', 'timestamp', 'ts', 
        'ActivityDateTime', 'EventTime', 'time', 'Time',
        'CreatedDateTime', 'created_at', 'datetime'
    ]
    for field in candidates:
        if field in obj:
            return field
    
    # Regex search
    for key in obj.keys():
        if re.search(r'time|date|timestamp', key, re.I):
            return key
    
    return None


def detect_user_field(obj: Dict) -> Optional[str]:
    """Detect which field contains user information."""
    candidates = [
        'Account', 'TargetUserName', 'UserPrincipalName', 'user',
        'AccountUpn', 'InitiatingUserOrApp', 'UserId', 'username',
        'email', 'Email', 'upn', 'TargetAccount'
    ]
    for field in candidates:
        if field in obj:
            return field
    return None


def detect_ip_field(obj: Dict) -> Optional[str]:
    """Detect which field contains IP address."""
    candidates = [
        'IpAddress', 'IPAddress', 'ip', 'src_ip', 'SourceIP',
        'ClientIPAddress', 'RemoteIP', 'source_ip'
    ]
    for field in candidates:
        if field in obj:
            return field
    return None


def infer_severity(event_type: str, tags: List[str] = None) -> int:
    """Infer severity (0-10) from event type and tags."""
    tags = tags or []
    
    # High severity patterns
    high_patterns = [
        'fail', 'blocked', 'malware', 'attack', 'credential',
        'admin', 'privilege', 'replication', 'suspicious'
    ]
    
    # Medium severity patterns
    medium_patterns = [
        'permission', 'grant', 'consent', 'rule', 'forward',
        'oauth', 'access', 'modify', 'update'
    ]
    
    event_lower = event_type.lower()
    
    # Check high severity
    for pat in high_patterns:
        if pat in event_lower:
            return 7
    
    # Check medium severity
    for pat in medium_patterns:
        if pat in event_lower:
            return 5
    
    # Check tags
    for tag in tags:
        if 'critical' in tag.lower():
            return 9
        if 'high' in tag.lower():
            return 7
        if 'medium' in tag.lower():
            return 5
    
    # Default low
    return 2
