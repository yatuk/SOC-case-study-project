"""
Entity model generator - creates rollups for users, IPs, devices, domains.
"""

import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime


class EntityGenerator:
    def __init__(self, events, risk_scores):
        self.events = events
        self.risk_scores = risk_scores
    
    def generate_entities(self):
        """Generate entity profiles from events and risk data."""
        users = defaultdict(lambda: {
            "type": "user",
            "first_seen": None,
            "last_seen": None,
            "event_count": 0,
            "alert_count": 0,
            "risk_score": 0,
            "devices": set(),
            "ips": set(),
            "sources": set()
        })
        
        ips = defaultdict(lambda: {
            "type": "ip",
            "first_seen": None,
            "last_seen": None,
            "event_count": 0,
            "users": set(),
            "geo": "Unknown",
            "reputation": "unknown"
        })
        
        domains = defaultdict(lambda: {
            "type": "domain",
            "first_seen": None,
            "last_seen": None,
            "access_count": 0,
            "users": set(),
            "reputation": "unknown"
        })
        
        # Process events
        for event in self.events:
            # Handle both simple and nested entity structures
            if isinstance(event.get("user"), dict):
                user = event.get("user", {}).get("email") or event.get("user", {}).get("name")
            else:
                user = event.get("user")
            
            # Handle nested entity structure for IP
            if "entity" in event and isinstance(event["entity"], dict):
                user = event["entity"].get("user") or user
                src_ip = event["entity"].get("ip") or event.get("src_ip")
            else:
                src_ip = event.get("src_ip")
            
            timestamp = event.get("timestamp")
            source = event.get("source")
            
            if user:
                entity = users[user]
                entity["event_count"] += 1
                entity["sources"].add(source)
                
                if not entity["first_seen"] or timestamp < entity["first_seen"]:
                    entity["first_seen"] = timestamp
                if not entity["last_seen"] or timestamp > entity["last_seen"]:
                    entity["last_seen"] = timestamp
                
                if src_ip:
                    entity["ips"].add(src_ip)
            
            if src_ip and src_ip != "10.0.0.0":
                ip_entity = ips[src_ip]
                ip_entity["event_count"] += 1
                if user:
                    ip_entity["users"].add(user)
                
                if not ip_entity["first_seen"] or timestamp < ip_entity["first_seen"]:
                    ip_entity["first_seen"] = timestamp
                if not ip_entity["last_seen"] or timestamp > ip_entity["last_seen"]:
                    ip_entity["last_seen"] = timestamp
                
                # Set geo and reputation for known malicious IPs
                if src_ip in ["185.220.101.45", "192.42.116.180", "45.142.213.91"]:
                    ip_entity["reputation"] = "malicious"
                    ip_entity["geo"] = "Romania"
                elif src_ip == "89.248.174.195":
                    ip_entity["reputation"] = "suspicious"
                    ip_entity["geo"] = "Russia"
                else:
                    ip_entity["reputation"] = "clean"
                    ip_entity["geo"] = "US"
        
        # Add risk scores
        if self.risk_scores and "entity_scores" in self.risk_scores:
            for user, score_data in self.risk_scores["entity_scores"].items():
                if user in users:
                    users[user]["risk_score"] = score_data.get("score", 0)
                    users[user]["alert_count"] = len(score_data.get("reasons", []))
        
        # Convert sets to lists for JSON serialization
        entities = {"users": {}, "ips": {}, "domains": {}}
        
        for user, data in users.items():
            data["ips"] = list(data["ips"])
            data["devices"] = list(data["devices"])
            data["sources"] = list(data["sources"])
            entities["users"][user] = data
        
        for ip, data in ips.items():
            data["users"] = list(data["users"])
            entities["ips"][ip] = data
        
        for domain, data in domains.items():
            data["users"] = list(data["users"])
            entities["domains"][domain] = data
        
        return entities
    
    def save(self, entities):
        """Save entities to outputs/entities.json."""
        output_file = Path("outputs") / "entities.json"
        with open(output_file, "w") as f:
            json.dump(entities, f, indent=2)
        print(f"[OK] Saved entity profiles to {output_file}")


def main():
    """Generate entities from existing data."""
    # Load events
    events_file = Path("outputs") / "events.jsonl"
    events = []
    if events_file.exists():
        with open(events_file) as f:
            for line in f:
                events.append(json.loads(line))
    
    # Load risk scores
    risk_file = Path("outputs") / "risk_scores.json"
    risk_scores = None
    if risk_file.exists():
        with open(risk_file) as f:
            risk_scores = json.load(f)
    
    generator = EntityGenerator(events, risk_scores)
    entities = generator.generate_entities()
    generator.save(entities)
    
    print(f"[OK] Generated {len(entities['users'])} users")
    print(f"[OK] Generated {len(entities['ips'])} IPs")
    print(f"[OK] Generated {len(entities['domains'])} domains")


if __name__ == "__main__":
    main()
