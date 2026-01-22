"""
Pseudonymization module for data safety.
Masks domains, hashes emails, randomizes IPs within private ranges.
All data is labeled as SIMULATED.
"""

import hashlib
import os
import re
from typing import Dict, Optional

# Check if raw data is allowed (default: NO)
ALLOW_RAW_DATA = os.environ.get('SOC_ALLOW_RAW_DATA', '0') == '1'

# Simulated organization
SIM_DOMAIN = "anadolufinans.example.tr"
SIM_ORG = "Anadolu Finans Holding"

# Turkish name pools for pseudonymization
TURKISH_FIRST_NAMES = [
    "Ayşe", "Mehmet", "Elif", "Mustafa", "Zeynep", "Ali", "Fatma", "Ahmet",
    "Selin", "Emre", "Deniz", "Burak", "Ceren", "Oğuz", "Gülşen", "Cem",
    "Derya", "Kemal", "Leyla", "Murat", "Nalan", "Orhan", "Pınar", "Serkan",
    "Tuğba", "Uğur", "Vildan", "Yusuf", "Zehra", "Barış", "Cansu", "Doğan"
]

TURKISH_LAST_NAMES = [
    "Demir", "Kaya", "Yılmaz", "Arslan", "Çelik", "Öztürk", "Şahin", "Aksoy",
    "Korkmaz", "Aydın", "Polat", "Erdoğan", "Tekin", "Doğan", "Güneş", "Özdemir",
    "Yıldırım", "Koç", "Kara", "Eren", "Çetin", "Kurt", "Özkan", "Şen",
    "Acar", "Bulut", "Tunç", "Kaplan", "Yalçın", "Güler", "Aslan", "Taş"
]

TURKISH_CITIES = ["IST", "ANK", "IZM", "BRS", "ANT", "ADN", "KON", "GZT"]

# Cache for consistent pseudonymization
_user_cache: Dict[str, Dict] = {}
_device_cache: Dict[str, str] = {}
_ip_cache: Dict[str, str] = {}
_domain_cache: Dict[str, str] = {}


def _stable_hash(value: str, length: int = 8) -> str:
    """Generate stable hash for consistent mapping."""
    return hashlib.sha256(value.lower().encode()).hexdigest()[:length]


def _stable_index(value: str, max_val: int) -> int:
    """Get stable index from string hash."""
    h = int(_stable_hash(value, 8), 16)
    return h % max_val


def pseudonymize_email(email: str) -> Dict:
    """
    Pseudonymize email address.
    Returns dict with id, email, display name.
    """
    if ALLOW_RAW_DATA:
        return {
            "id": f"usr-{_stable_hash(email)}",
            "email": email,
            "display": email.split('@')[0] if '@' in email else email
        }
    
    if not email:
        return {"id": "usr-unknown", "email": "", "display": "Unknown"}
    
    email_lower = email.lower().strip()
    
    # Check cache
    if email_lower in _user_cache:
        return _user_cache[email_lower]
    
    # Generate pseudonymized identity
    idx = _stable_index(email_lower, len(TURKISH_FIRST_NAMES) * len(TURKISH_LAST_NAMES))
    first_idx = idx % len(TURKISH_FIRST_NAMES)
    last_idx = (idx // len(TURKISH_FIRST_NAMES)) % len(TURKISH_LAST_NAMES)
    
    first_name = TURKISH_FIRST_NAMES[first_idx]
    last_name = TURKISH_LAST_NAMES[last_idx]
    display_name = f"{first_name} {last_name}"
    
    # Create pseudo email
    local_part = f"{first_name.lower()}.{last_name.lower()}"
    # Normalize Turkish characters
    local_part = local_part.replace('ş', 's').replace('ç', 'c').replace('ğ', 'g')
    local_part = local_part.replace('ı', 'i').replace('ö', 'o').replace('ü', 'u')
    pseudo_email = f"{local_part}@{SIM_DOMAIN}"
    
    result = {
        "id": f"usr-{_stable_hash(email_lower)}",
        "email": pseudo_email,
        "display": display_name
    }
    
    _user_cache[email_lower] = result
    return result


def pseudonymize_username(username: str) -> Dict:
    """Pseudonymize username (without domain)."""
    if not username:
        return {"id": "usr-unknown", "email": "", "display": "Unknown"}
    
    # Handle DOMAIN\username format
    if '\\' in username:
        username = username.split('\\')[-1]
    
    # Treat as email for consistent mapping
    return pseudonymize_email(f"{username}@temp.local")


def pseudonymize_ip(ip: str, is_source: bool = True) -> str:
    """
    Pseudonymize IP address to private range.
    Source IPs -> 10.x.x.x
    Dest IPs -> 172.16.x.x
    """
    if ALLOW_RAW_DATA:
        return ip
    
    if not ip:
        return ""
    
    ip = ip.strip()
    
    # Skip already private or local IPs
    if ip.startswith('10.') or ip.startswith('192.168.') or ip.startswith('172.'):
        return ip
    if ip.startswith('127.') or ip == 'localhost' or ip.startswith('fe80:'):
        return ip
    
    # Check cache
    cache_key = f"{ip}_{is_source}"
    if cache_key in _ip_cache:
        return _ip_cache[cache_key]
    
    # Generate pseudo IP
    h = int(_stable_hash(ip, 8), 16)
    
    if is_source:
        # 10.x.x.x range
        octet2 = (h >> 16) % 256
        octet3 = (h >> 8) % 256
        octet4 = h % 254 + 1  # Avoid .0 and .255
        pseudo_ip = f"10.{octet2}.{octet3}.{octet4}"
    else:
        # 172.16.x.x range
        octet3 = (h >> 8) % 256
        octet4 = h % 254 + 1
        pseudo_ip = f"172.16.{octet3}.{octet4}"
    
    _ip_cache[cache_key] = pseudo_ip
    return pseudo_ip


def pseudonymize_hostname(hostname: str) -> str:
    """
    Pseudonymize hostname to Turkish city pattern.
    Format: {CITY}-{TYPE}-{NUMBER}
    """
    if ALLOW_RAW_DATA:
        return hostname
    
    if not hostname:
        return ""
    
    hostname_lower = hostname.lower().strip()
    
    # Check cache
    if hostname_lower in _device_cache:
        return _device_cache[hostname_lower]
    
    # Determine type from hostname
    if 'dc' in hostname_lower or 'domain' in hostname_lower:
        device_type = "DC"
    elif 'srv' in hostname_lower or 'server' in hostname_lower:
        device_type = "SRV"
    elif 'adfs' in hostname_lower:
        device_type = "ADFS"
    elif 'ws' in hostname_lower or 'workstation' in hostname_lower:
        device_type = "WS"
    elif 'lt' in hostname_lower or 'laptop' in hostname_lower:
        device_type = "LT"
    elif 'vdi' in hostname_lower:
        device_type = "VDI"
    else:
        device_type = "WS"
    
    # Generate pseudo hostname
    h = int(_stable_hash(hostname_lower, 8), 16)
    city = TURKISH_CITIES[h % len(TURKISH_CITIES)]
    number = (h % 999) + 1
    
    pseudo_hostname = f"{city}-{device_type}-{number:03d}"
    
    _device_cache[hostname_lower] = pseudo_hostname
    return pseudo_hostname


def pseudonymize_domain(domain: str) -> str:
    """
    Pseudonymize domain name.
    Keeps suspicious-looking patterns but ensures it's not real.
    """
    if ALLOW_RAW_DATA:
        return domain
    
    if not domain:
        return ""
    
    domain_lower = domain.lower().strip()
    
    # Check cache
    if domain_lower in _domain_cache:
        return _domain_cache[domain_lower]
    
    # Keep certain safe patterns
    safe_patterns = ['.example.', '.test.', '.local', '.internal', 'localhost']
    for pat in safe_patterns:
        if pat in domain_lower:
            _domain_cache[domain_lower] = domain
            return domain
    
    # For known suspicious patterns, keep structure but add .example
    suspicious_indicators = [
        'login', 'secure', 'verify', 'account', 'bank', 'update',
        'microsoft', 'google', 'apple', 'paypal', 'amazon'
    ]
    
    for indicator in suspicious_indicators:
        if indicator in domain_lower:
            # Keep the suspicious pattern but make it clearly fake
            pseudo = f"{domain.replace('.', '-')}.phishing.example"
            _domain_cache[domain_lower] = pseudo
            return pseudo
    
    # Generic pseudonymization
    h = _stable_hash(domain_lower, 6)
    pseudo = f"domain-{h}.example.tr"
    _domain_cache[domain_lower] = pseudo
    return pseudo


def pseudonymize_url(url: str) -> str:
    """Pseudonymize URL while keeping structure."""
    if ALLOW_RAW_DATA:
        return url
    
    if not url:
        return ""
    
    # Extract and pseudonymize domain
    match = re.match(r'^(https?://)?([^/:]+)(.*)', url)
    if not match:
        return url
    
    protocol = match.group(1) or "https://"
    domain = match.group(2)
    path = match.group(3) or ""
    
    pseudo_domain = pseudonymize_domain(domain)
    
    # Truncate path if too long
    if len(path) > 50:
        path = path[:47] + "..."
    
    return f"{protocol}{pseudo_domain}{path}"


def get_geo_code(ip: str) -> str:
    """Get simulated geo code from IP."""
    if not ip:
        return "XX"
    
    # Private IPs are Turkish
    if ip.startswith('10.') or ip.startswith('192.168.'):
        return "TR-IST"
    if ip.startswith('172.16.'):
        return "TR-ANK"
    
    # Hash-based geo assignment for pseudo-variety
    h = int(_stable_hash(ip, 4), 16)
    geos = ["TR-IST", "TR-ANK", "TR-IZM", "NL", "DE", "US", "RO", "RU", "CN"]
    return geos[h % len(geos)]


def clear_cache():
    """Clear pseudonymization caches."""
    global _user_cache, _device_cache, _ip_cache, _domain_cache
    _user_cache = {}
    _device_cache = {}
    _ip_cache = {}
    _domain_cache = {}
