"""
SOC Case Study Pipeline - Data Ingestion Module
Loads raw log files from multiple sources.
"""

import json
import csv
import re
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime


class LogIngestor:
    """Handles ingestion of various log formats."""
    
    def __init__(self, data_dir: str = "data/raw"):
        self.data_dir = Path(data_dir)
    
    def ingest_all(self) -> Dict[str, List[Dict[str, Any]]]:
        """Ingest all raw log files."""
        logs = {
            "email_gateway": self.ingest_email_gateway(),
            "identity_provider": self.ingest_identity_provider(),
            "web_proxy": self.ingest_web_proxy(),
            "cloud_mailbox": self.ingest_cloud_mailbox(),
            "endpoint_edr": self.ingest_endpoint_edr()
        }
        
        total_events = sum(len(v) for v in logs.values())
        print(f"[INGEST] Loaded {total_events} events from {len(logs)} sources")
        for source, events in logs.items():
            print(f"  - {source}: {len(events)} events")
        
        return logs
    
    def ingest_email_gateway(self) -> List[Dict[str, Any]]:
        """Ingest email gateway CSV logs."""
        events = []
        file_path = self.data_dir / "email_gateway.log"
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                events.append({
                    "source": "email_gateway",
                    "raw": row
                })
        
        return events
    
    def ingest_identity_provider(self) -> List[Dict[str, Any]]:
        """Ingest identity provider JSON Lines logs."""
        events = []
        file_path = self.data_dir / "identity_provider.log"
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    events.append({
                        "source": "identity_provider",
                        "raw": data
                    })
        
        return events
    
    def ingest_web_proxy(self) -> List[Dict[str, Any]]:
        """Ingest web proxy Apache Common Log Format."""
        events = []
        file_path = self.data_dir / "web_proxy.log"
        
        # Regex for Apache Common Log Extended format
        pattern = r'^(\S+) \S+ (\S+) \[(.*?)\] "(\w+) (.*?) HTTP/\d\.\d" (\d+) (\d+) "(.*?)" "(.*?)"$'
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                match = re.match(pattern, line.strip())
                if match:
                    ip, user, timestamp, method, url, status, size, referrer, user_agent = match.groups()
                    
                    # Convert timestamp: "10/Jan/2026:08:17:45 +0000" -> ISO 8601
                    dt = datetime.strptime(timestamp, "%d/%b/%Y:%H:%M:%S %z")
                    
                    events.append({
                        "source": "web_proxy",
                        "raw": {
                            "src_ip": ip,
                            "user": user,
                            "timestamp": dt.isoformat(),
                            "method": method,
                            "url": url,
                            "status": int(status),
                            "size": int(size),
                            "referrer": referrer,
                            "user_agent": user_agent
                        }
                    })
        
        return events
    
    def ingest_cloud_mailbox(self) -> List[Dict[str, Any]]:
        """Ingest cloud mailbox JSON Lines audit logs."""
        events = []
        file_path = self.data_dir / "cloud_mailbox.log"
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    events.append({
                        "source": "cloud_mailbox",
                        "raw": data
                    })
        
        return events
    
    def ingest_endpoint_edr(self) -> List[Dict[str, Any]]:
        """Ingest endpoint EDR JSON Lines logs."""
        events = []
        file_path = self.data_dir / "endpoint_edr.log"
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    events.append({
                        "source": "endpoint_edr",
                        "raw": data
                    })
        
        return events


if __name__ == "__main__":
    ingestor = LogIngestor()
    logs = ingestor.ingest_all()
    
    print("\n[SAMPLE] First event from each source:")
    for source, events in logs.items():
        if events:
            print(f"\n{source}:")
            print(json.dumps(events[0], indent=2))
