"""
SOC Case Study Pipeline - Normalization Module
Maps raw logs to common schema with IOC enrichment.
"""

import json
import uuid
from pathlib import Path
from typing import List, Dict, Any, Set
from datetime import datetime


class EventNormalizer:
    """Normalizes events from various sources into common schema."""
    
    def __init__(self, ioc_dir: str = "data/iocs"):
        self.ioc_dir = Path(ioc_dir)
        self.malicious_domains = self._load_ioc_list("malicious_domains.txt")
        self.malicious_ips = self._load_ioc_list("malicious_ips.txt")
        self.known_good_ips = self._load_ioc_list("known_good_ips.txt")
        
        # Simple GeoIP mock (hardcoded for this scenario)
        self.geo_map = {
            "89.34.126.77": {"country": "RO", "city": "Bucharest"},
            "185.220.101.45": {"country": "RO", "city": "Bucharest"},
            "192.168.10.45": {"country": "US", "city": "New York"},
            "192.168.10.88": {"country": "US", "city": "New York"},
            "192.168.10.120": {"country": "US", "city": "New York"},
            "192.168.1.100": {"country": "US", "city": "New York"}
        }
    
    def _load_ioc_list(self, filename: str) -> Set[str]:
        """Load IOC list from file."""
        iocs = set()
        file_path = self.ioc_dir / filename
        
        if file_path.exists():
            with open(file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        iocs.add(line)
        
        return iocs
    
    def check_ioc_matches(self, event: Dict[str, Any]) -> List[Dict[str, str]]:
        """Check event for IOC matches."""
        matches = []
        
        # Check IPs
        for ip_field in ['src_ip', 'dest_ip', 'client_ip']:
            ip = event.get('network', {}).get(ip_field) or event.get('details', {}).get(ip_field)
            if ip and ip in self.malicious_ips:
                matches.append({"type": "ip", "value": ip, "list": "malicious_ips"})
        
        # Check domains/URLs
        for domain_field in ['dst_domain', 'url', 'urls', 'sender']:
            value = event.get('network', {}).get(domain_field) or event.get('details', {}).get(domain_field)
            if value:
                for malicious_domain in self.malicious_domains:
                    if malicious_domain in str(value):
                        matches.append({"type": "domain", "value": malicious_domain, "list": "malicious_domains"})
        
        return matches
    
    def normalize_all(self, raw_logs: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Normalize all raw logs to common schema."""
        normalized_events = []
        
        for source, events in raw_logs.items():
            for raw_event in events:
                if source == "email_gateway":
                    normalized = self._normalize_email_gateway(raw_event)
                elif source == "identity_provider":
                    normalized = self._normalize_identity_provider(raw_event)
                elif source == "web_proxy":
                    normalized = self._normalize_web_proxy(raw_event)
                elif source == "cloud_mailbox":
                    normalized = self._normalize_cloud_mailbox(raw_event)
                elif source == "endpoint_edr":
                    normalized = self._normalize_endpoint_edr(raw_event)
                else:
                    continue
                
                if normalized:
                    # Add IOC matches
                    normalized['ioc_matches'] = self.check_ioc_matches(normalized)
                    normalized_events.append(normalized)
        
        # Sort by timestamp
        normalized_events.sort(key=lambda x: x['timestamp'])
        
        print(f"[NORMALIZE] Processed {len(normalized_events)} events")
        ioc_hits = sum(1 for e in normalized_events if e['ioc_matches'])
        print(f"[NORMALIZE] IOC matches found in {ioc_hits} events")
        
        return normalized_events
    
    def _get_geo(self, ip: str) -> Dict[str, str]:
        """Get geographic info for IP."""
        return self.geo_map.get(ip, {"country": "Unknown", "city": "Unknown"})
    
    def _normalize_email_gateway(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize email gateway logs."""
        data = raw_event['raw']
        
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": data['timestamp'],
            "source_type": "email_gateway",
            "event_type": f"email.{data['direction']}",
            "severity": "low",
            "user": {
                "email": data['recipient'] if data['direction'] == 'inbound' else data['sender'],
                "username": data['recipient'].split('@')[0] if data['direction'] == 'inbound' else data['sender'].split('@')[0],
                "domain": data['recipient'].split('@')[1] if '@' in data['recipient'] else ""
            },
            "device": {},
            "network": {
                "src_ip": "",
                "src_geo": {},
                "dst_ip": "",
                "dst_domain": data['sender'] if data['direction'] == 'inbound' else data['recipient']
            },
            "details": {
                "message_id": data['message_id'],
                "sender": data['sender'],
                "recipient": data['recipient'],
                "subject": data['subject'],
                "urls": data['urls'],
                "spf_result": data['spf_result'],
                "dkim_result": data['dkim_result'],
                "attachment_hashes": data['attachment_hashes']
            },
            "ioc_matches": [],
            "raw_log": json.dumps(data)
        }
    
    def _normalize_identity_provider(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize identity provider logs."""
        data = raw_event['raw']
        
        src_ip = data.get('src_ip', '')
        
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": data['timestamp'],
            "source_type": "identity",
            "event_type": f"auth.{data['event'].replace('.', '_')}",
            "severity": "medium" if data.get('result') == 'fail' else "low",
            "user": {
                "email": data['user'],
                "username": data['user'].split('@')[0],
                "domain": data['user'].split('@')[1] if '@' in data['user'] else ""
            },
            "device": {
                "name": data.get('device_id', 'unknown'),
                "os": data.get('device_os', 'Unknown'),
                "agent": data.get('device_agent', '')
            },
            "network": {
                "src_ip": src_ip,
                "src_geo": self._get_geo(src_ip),
                "dst_ip": "",
                "dst_domain": ""
            },
            "details": {
                "event": data['event'],
                "result": data.get('result'),
                "mfa_method": data.get('mfa_method'),
                "session_id": data.get('session_id'),
                "reason": data.get('reason'),
                "action": data.get('action'),
                "actor": data.get('actor')
            },
            "ioc_matches": [],
            "raw_log": json.dumps(data)
        }
    
    def _normalize_web_proxy(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize web proxy logs."""
        data = raw_event['raw']
        
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": data['timestamp'],
            "source_type": "web_proxy",
            "event_type": f"web.{data['method'].lower()}",
            "severity": "low",
            "user": {
                "email": f"{data['user']}@acmecorp.example.com" if data['user'] != '-' else "",
                "username": data['user'] if data['user'] != '-' else "",
                "domain": "acmecorp.example.com"
            },
            "device": {
                "name": "",
                "os": self._extract_os_from_ua(data['user_agent']),
                "agent": data['user_agent']
            },
            "network": {
                "src_ip": data['src_ip'],
                "src_geo": self._get_geo(data['src_ip']),
                "dst_ip": "",
                "dst_domain": self._extract_domain(data['url'])
            },
            "details": {
                "method": data['method'],
                "url": data['url'],
                "status": data['status'],
                "referrer": data['referrer'],
                "size": data['size']
            },
            "ioc_matches": [],
            "raw_log": json.dumps(data)
        }
    
    def _normalize_cloud_mailbox(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize cloud mailbox audit logs."""
        data = raw_event['raw']
        
        src_ip = data.get('client_ip', '')
        
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": data['timestamp'],
            "source_type": "cloud_mailbox",
            "event_type": f"mailbox.{data['operation'].lower().replace('-', '_')}",
            "severity": "medium" if 'Rule' in data['operation'] else "low",
            "user": {
                "email": data['user'],
                "username": data['user'].split('@')[0],
                "domain": data['user'].split('@')[1] if '@' in data['user'] else ""
            },
            "device": {
                "name": "",
                "os": "",
                "agent": data.get('client_info', '')
            },
            "network": {
                "src_ip": src_ip,
                "src_geo": self._get_geo(src_ip),
                "dst_ip": "",
                "dst_domain": ""
            },
            "details": {
                "operation": data['operation'],
                "session_id": data.get('session_id'),
                "rule_name": data.get('rule_name'),
                "rule_conditions": data.get('rule_conditions'),
                "rule_actions": data.get('rule_actions'),
                "query": data.get('query'),
                "results_count": data.get('results_count'),
                "operation_count": data.get('operation_count'),
                "actor": data.get('actor'),
                "reason": data.get('reason')
            },
            "ioc_matches": [],
            "raw_log": json.dumps(data)
        }
    
    def _normalize_endpoint_edr(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize endpoint EDR logs."""
        data = raw_event['raw']
        
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": data['timestamp'],
            "source_type": "endpoint",
            "event_type": f"endpoint.{data['event_type']}",
            "severity": "low",
            "user": {
                "email": f"{data['user']}@acmecorp.example.com",
                "username": data['user'],
                "domain": "acmecorp.example.com"
            },
            "device": {
                "name": data['host'],
                "os": "",
                "agent": ""
            },
            "network": {
                "src_ip": "",
                "src_geo": {},
                "dst_ip": data.get('dest_ip', ''),
                "dst_domain": ""
            },
            "details": {
                "event_type": data['event_type'],
                "process": data.get('process'),
                "pid": data.get('pid'),
                "parent_process": data.get('parent_process'),
                "command_line": data.get('command_line'),
                "hash": data.get('hash'),
                "file_path": data.get('file_path'),
                "dest_port": data.get('dest_port'),
                "protocol": data.get('protocol')
            },
            "ioc_matches": [],
            "raw_log": json.dumps(data)
        }
    
    def _extract_os_from_ua(self, user_agent: str) -> str:
        """Extract OS from user agent string."""
        if "Windows NT 10.0" in user_agent:
            return "Windows 10"
        elif "Windows NT" in user_agent:
            return "Windows"
        elif "Macintosh" in user_agent or "Mac OS X" in user_agent:
            return "macOS"
        elif "Linux" in user_agent or "X11" in user_agent:
            return "Linux"
        return "Unknown"
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        if "://" in url:
            domain = url.split("://")[1].split("/")[0]
        else:
            domain = url.split("/")[0]
        return domain
    
    def save_normalized(self, events: List[Dict[str, Any]], output_file: str = "data/normalized/events.jsonl"):
        """Save normalized events to JSON Lines file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            for event in events:
                f.write(json.dumps(event) + '\n')
        
        print(f"[NORMALIZE] Saved {len(events)} normalized events to {output_file}")


if __name__ == "__main__":
    from ingest import LogIngestor
    
    # Load raw logs
    ingestor = LogIngestor()
    raw_logs = ingestor.ingest_all()
    
    # Normalize
    normalizer = EventNormalizer()
    normalized = normalizer.normalize_all(raw_logs)
    
    # Save
    normalizer.save_normalized(normalized)
    
    # Show IOC hits
    print("\n[IOC HITS]")
    for event in normalized:
        if event['ioc_matches']:
            print(f"  {event['timestamp']} | {event['event_type']} | {event['user']['email']}")
            for match in event['ioc_matches']:
                print(f"    -> {match['type']}: {match['value']}")
