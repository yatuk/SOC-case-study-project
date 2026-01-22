"""
Phishing URL Dataset Normalizer
Converts phishing URL datasets into IOC records.
"""

from typing import Dict, Optional, List
from ..utils import generate_ioc_id, extract_domain, safe_float
from ..pseudo import pseudonymize_url, pseudonymize_domain

# Confidence mapping based on source
SOURCE_CONFIDENCE = {
    "urlhaus": 0.85,
    "phishtank": 0.9,
    "openphish": 0.85,
    "tranco": 0.1,  # These are benign domains
    "alexa": 0.1,
}


def detect_family_csv(headers: List[str]) -> bool:
    """Check if this CSV is a phishing URL dataset."""
    headers_lower = [h.lower() for h in headers]
    
    indicators = [
        'url' in headers_lower,
        'label' in headers_lower,
        any('phish' in h for h in headers_lower),
        'source' in headers_lower,
    ]
    return sum(indicators) >= 2


def detect_family_features(headers: List[str]) -> bool:
    """Check if this CSV is a phishing features dataset."""
    headers_lower = [h.lower() for h in headers]
    
    indicators = [
        'url' in headers_lower,
        'label' in headers_lower,
        'url_length' in headers_lower,
        'num_dots' in headers_lower,
        'has_https' in headers_lower or 'entropy' in headers_lower,
    ]
    return sum(indicators) >= 3


def normalize_url_row(row: Dict) -> Optional[Dict]:
    """Normalize a phishing URL dataset row to IOC format."""
    try:
        url = row.get('url', '').strip()
        if not url:
            return None
        
        # Get label (1 = phishing, 0 = benign)
        label_raw = row.get('label', '')
        try:
            label_num = int(label_raw)
            label = "phishing" if label_num == 1 else "benign"
        except:
            label = "unknown"
        
        # Get source
        source = row.get('source', 'unknown').lower()
        
        # Determine confidence
        base_confidence = SOURCE_CONFIDENCE.get(source, 0.5)
        if label == "benign":
            # For benign URLs, confidence means "confidence it's benign"
            confidence = 1.0 - base_confidence
        else:
            confidence = base_confidence
        
        # Extract domain
        domain = extract_domain(url)
        
        # Pseudonymize
        pseudo_url = pseudonymize_url(url)
        pseudo_domain = pseudonymize_domain(domain) if domain else None
        
        # Build IOC record
        ioc = {
            "ioc_id": generate_ioc_id(),
            "type": "url",
            "value": pseudo_url,
            "label": label,
            "source": f"dataset:{source}",
            "confidence": round(confidence, 2),
            "tags": ["simulated", "normalized"]
        }
        
        if label == "phishing":
            ioc["tags"].append("malicious")
            ioc["tags"].append("mitre:T1566.002")  # Spearphishing Link
        
        if pseudo_domain:
            ioc["domain"] = pseudo_domain
        
        return ioc
        
    except Exception as e:
        return None


def normalize_features_row(row: Dict) -> Optional[Dict]:
    """Normalize a phishing features dataset row to IOC format with enrichment."""
    try:
        url = row.get('url', '').strip()
        if not url:
            return None
        
        # Get label
        label_raw = row.get('label', '')
        try:
            label_num = int(label_raw)
            label = "phishing" if label_num == 1 else "benign"
        except:
            label = "unknown"
        
        # Calculate confidence from features
        suspicious_words = safe_float(row.get('suspicious_words'), 0)
        has_ip = row.get('has_ip') == '1' or row.get('has_ip') == 1
        url_length = safe_float(row.get('url_length'), 0)
        entropy = safe_float(row.get('entropy'), 0)
        
        # Heuristic confidence scoring
        confidence = 0.5
        if label == "phishing":
            confidence = 0.6
            if suspicious_words > 0:
                confidence += 0.1
            if has_ip:
                confidence += 0.1
            if url_length > 75:
                confidence += 0.05
            if entropy > 4.5:
                confidence += 0.05
        else:
            confidence = 0.3
        
        confidence = min(confidence, 0.95)
        
        # Extract domain
        domain = extract_domain(url)
        
        # Pseudonymize
        pseudo_url = pseudonymize_url(url)
        pseudo_domain = pseudonymize_domain(domain) if domain else None
        
        # Build IOC record
        ioc = {
            "ioc_id": generate_ioc_id(),
            "type": "url",
            "value": pseudo_url,
            "label": label,
            "source": "dataset:phishing_features",
            "confidence": round(confidence, 2),
            "tags": ["simulated", "normalized"],
            "features": {
                "url_length": int(url_length),
                "suspicious_words": int(suspicious_words),
                "has_ip": has_ip,
                "entropy": round(entropy, 2)
            }
        }
        
        if label == "phishing":
            ioc["tags"].append("malicious")
            ioc["tags"].append("mitre:T1566.002")
        
        if pseudo_domain:
            ioc["domain"] = pseudo_domain
        
        return ioc
        
    except Exception as e:
        return None
