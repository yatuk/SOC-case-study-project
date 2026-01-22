"""
Multi-case incident generator for realistic SOC dashboard data.
Creates 3 diverse incident scenarios with rich event streams.
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path


class CaseGenerator:
    def __init__(self):
        self.base_time = datetime.now() - timedelta(days=7)
        self.users = [
            "sarah.chen@acmecorp.example.com",
            "michael.rodriguez@acmecorp.example.com",
            "priya.patel@acmecorp.example.com",
            "james.kim@acmecorp.example.com"
        ]
        self.malicious_ips = [
            "185.220.101.45", "192.42.116.180", "45.142.213.91",
            "89.248.174.195", "141.98.10.54"
        ]
        self.good_ips = ["203.0.113.50", "198.51.100.25", "8.8.8.8"]
        self.devices = ["LAPTOP-SARAH-01", "DESKTOP-MIKE-02", "MOBILE-PRIYA-01", "WORKSTATION-JAMES-01"]
        
    def generate_all_cases(self):
        """Generate all 3 incident cases with events."""
        cases = []
        all_events = []
        all_iocs = set()
        
        # Case 1: Phishing → Credential Theft → Impossible Travel → Persistence
        case1, events1, iocs1 = self.generate_case1()
        cases.append(case1)
        all_events.extend(events1)
        all_iocs.update(iocs1)
        
        # Case 2: OAuth Consent Phishing → Token Abuse → Mailbox Access
        case2, events2, iocs2 = self.generate_case2()
        cases.append(case2)
        all_events.extend(events2)
        all_iocs.update(iocs2)
        
        # Case 3: MFA Fatigue → Session Hijack → Privileged Action
        case3, events3, iocs3 = self.generate_case3()
        cases.append(case3)
        all_events.extend(events3)
        all_iocs.update(iocs3)
        
        return cases, all_events, list(all_iocs)
    
    def generate_case1(self):
        """Case 1: Classic phishing attack chain."""
        start_time = self.base_time
        user = self.users[0]
        attacker_ip = self.malicious_ips[0]
        
        case = {
            "case_id": "CASE-2026-0001",
            "title": "Phishing-Led Account Compromise",
            "severity": "critical",
            "status": "contained",
            "owner": "tier2_analyst",
            "created_at": start_time.isoformat(),
            "updated_at": (start_time + timedelta(hours=8)).isoformat(),
            "affected_users": [user],
            "impacted_assets": ["corporate_mailbox", "identity_provider"],
            "mitre_techniques": ["T1566.002", "T1078", "T1114.002", "T1098"],
            "narrative": "User received credential phishing email, clicked malicious link, submitted credentials. Attacker authenticated from foreign IP and created mailbox forwarding rule for persistence.",
            "alert_count": 4,
            "evidence_count": 47
        }
        
        events = []
        iocs = set()
        
        # Phishing email delivery
        phish_domain = "secure-login-verify.tk"
        iocs.add(("domain", phish_domain, "phishing"))
        events.append(self._event(start_time, "email_gateway", user, "EmailReceived",
                                 f"Email from external sender with link to {phish_domain}"))
        
        # Click
        events.append(self._event(start_time + timedelta(minutes=5), "web_proxy", user,
                                 "WebRequest", f"User visited {phish_domain}"))
        
        # Credential submission
        events.append(self._event(start_time + timedelta(minutes=7), "web_proxy", user,
                                 "HTTPPost", f"POST to {phish_domain}/submit with credentials"))
        
        # Attacker login
        iocs.add(("ip", attacker_ip, "suspicious"))
        events.append(self._event(start_time + timedelta(hours=1), "identity_provider", user,
                                 "AuthSuccess", f"Login from {attacker_ip} (Romania)", src_ip=attacker_ip))
        
        # Impossible travel
        events.append(self._event(start_time + timedelta(hours=1, minutes=30), "identity_provider", user,
                                 "AuthSuccess", f"Login from 203.0.113.50 (US)", src_ip="203.0.113.50"))
        
        # Mailbox rule creation
        events.append(self._event(start_time + timedelta(hours=2), "cloud_mailbox", user,
                                 "MailboxRuleCreated", f"Forwarding rule to external email", src_ip=attacker_ip))
        
        return case, events, iocs
    
    def generate_case2(self):
        """Case 2: OAuth consent phishing."""
        start_time = self.base_time + timedelta(days=2)
        user = self.users[1]
        attacker_ip = self.malicious_ips[1]
        
        case = {
            "case_id": "CASE-2026-0002",
            "title": "OAuth Consent Phishing - Token Abuse",
            "severity": "high",
            "status": "investigating",
            "owner": "tier1_analyst",
            "created_at": start_time.isoformat(),
            "updated_at": (start_time + timedelta(hours=4)).isoformat(),
            "affected_users": [user],
            "impacted_assets": ["oauth_apps", "cloud_mailbox"],
            "mitre_techniques": ["T1566.002", "T1528", "T1114.002"],
            "narrative": "User granted OAuth consent to malicious app. Attacker used token to access mailbox and exfiltrate emails without authentication.",
            "alert_count": 3,
            "evidence_count": 28
        }
        
        events = []
        iocs = set()
        
        oauth_app = "MailSyncPro"
        iocs.add(("app", oauth_app, "malicious_oauth"))
        
        # OAuth consent email
        events.append(self._event(start_time, "email_gateway", user, "EmailReceived",
                                 f"OAuth consent request for {oauth_app}"))
        
        # Consent granted
        events.append(self._event(start_time + timedelta(minutes=10), "identity_provider", user,
                                 "OAuthConsentGranted", f"User granted consent to {oauth_app}"))
        
        # Token abuse
        events.append(self._event(start_time + timedelta(hours=1), "cloud_mailbox", user,
                                 "MailboxAccess", f"App {oauth_app} accessed mailbox", src_ip=attacker_ip))
        
        # Mass email reading
        for i in range(15):
            events.append(self._event(start_time + timedelta(hours=1, minutes=i*2), "cloud_mailbox", user,
                                     "MessageRead", f"Email {i+1} read by {oauth_app}", src_ip=attacker_ip))
        
        return case, events, iocs
    
    def generate_case3(self):
        """Case 3: MFA fatigue attack."""
        start_time = self.base_time + timedelta(days=5)
        user = self.users[2]
        attacker_ip = self.malicious_ips[2]
        
        case = {
            "case_id": "CASE-2026-0003",
            "title": "MFA Fatigue - Session Hijacking",
            "severity": "high",
            "status": "new",
            "owner": "unassigned",
            "created_at": start_time.isoformat(),
            "updated_at": start_time.isoformat(),
            "affected_users": [user],
            "impacted_assets": ["identity_provider", "admin_portal"],
            "mitre_techniques": ["T1078", "T1556", "T1098.001"],
            "narrative": "Attacker bombarded user with MFA push notifications until approved. Used session to access admin portal and modify account permissions.",
            "alert_count": 3,
            "evidence_count": 35
        }
        
        events = []
        iocs = set()
        iocs.add(("ip", attacker_ip, "brute_force"))
        
        # Multiple MFA push attempts
        for i in range(12):
            events.append(self._event(start_time + timedelta(minutes=i*2), "identity_provider", user,
                                     "MFAPushSent", f"MFA push #{i+1} sent", src_ip=attacker_ip))
        
        # User approves (fatigue)
        events.append(self._event(start_time + timedelta(minutes=25), "identity_provider", user,
                                 "MFAPushApproved", "User approved MFA push", src_ip=attacker_ip))
        
        # Session established
        events.append(self._event(start_time + timedelta(minutes=26), "identity_provider", user,
                                 "AuthSuccess", f"Login from {attacker_ip} (China)", src_ip=attacker_ip))
        
        # Admin portal access
        events.append(self._event(start_time + timedelta(minutes=30), "admin_portal", user,
                                 "AdminAccess", "Accessed admin control panel", src_ip=attacker_ip))
        
        # Privilege escalation
        events.append(self._event(start_time + timedelta(minutes=35), "admin_portal", user,
                                 "RoleModified", "Added GlobalAdmin role to user account", src_ip=attacker_ip))
        
        return case, events, iocs
    
    def _event(self, timestamp, source, user, event_type, description, src_ip=None):
        """Helper to create normalized event."""
        event_id = f"evt-{random.randint(100000, 999999)}"
        return {
            "event_id": event_id,
            "timestamp": timestamp.isoformat(),
            "source": source,
            "event_type": event_type,
            "user": user,
            "src_ip": src_ip or "10.0.0.0",
            "description": description,
            "raw_summary": f"[{source}] {event_type}: {description}"
        }


def main():
    """Generate and save multi-case data."""
    generator = CaseGenerator()
    cases, events, iocs = generator.generate_all_cases()
    
    output_dir = Path("outputs")
    output_dir.mkdir(exist_ok=True)
    
    # Save cases
    with open(output_dir / "cases.json", "w") as f:
        json.dump({"cases": cases}, f, indent=2)
    
    # Save events
    with open(output_dir / "events.jsonl", "w") as f:
        for event in events:
            f.write(json.dumps(event) + "\n")
    
    # Save IOCs
    ioc_list = [{"type": t, "value": v, "tags": [tag]} for t, v, tag in iocs]
    with open(output_dir / "iocs.json", "w") as f:
        json.dump({"iocs": ioc_list}, f, indent=2)
    
    print(f"[OK] Generated {len(cases)} cases")
    print(f"[OK] Generated {len(events)} events")
    print(f"[OK] Generated {len(iocs)} IOCs")


if __name__ == "__main__":
    main()
