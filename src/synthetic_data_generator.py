"""
Comprehensive Synthetic SOC Data Generator
Generates realistic SIEM/SOAR/EDR data for portfolio demonstration.

Seed-based for reproducibility. No external dependencies.
"""

import json
import random
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
import os

# Reproducible seed
SEED = int(os.environ.get('SOC_SEED', '1337'))
random.seed(SEED)

# Time range: past 14 days
BASE_TIME = datetime.now() - timedelta(days=14)

# ============== ENTITY DEFINITIONS ==============

USERS = [
    {"email": "sarah.chen@acmecorp.com", "name": "Sarah Chen", "dept": "Finance", "title": "Financial Analyst"},
    {"email": "michael.rodriguez@acmecorp.com", "name": "Michael Rodriguez", "dept": "IT", "title": "System Admin"},
    {"email": "priya.patel@acmecorp.com", "name": "Priya Patel", "dept": "Engineering", "title": "Software Engineer"},
    {"email": "james.kim@acmecorp.com", "name": "James Kim", "dept": "Sales", "title": "Account Executive"},
    {"email": "emily.watson@acmecorp.com", "name": "Emily Watson", "dept": "HR", "title": "HR Manager"},
    {"email": "david.brown@acmecorp.com", "name": "David Brown", "dept": "Marketing", "title": "Marketing Lead"},
    {"email": "lisa.nguyen@acmecorp.com", "name": "Lisa Nguyen", "dept": "Finance", "title": "Controller"},
    {"email": "robert.taylor@acmecorp.com", "name": "Robert Taylor", "dept": "Executive", "title": "CFO"},
    {"email": "amanda.clark@acmecorp.com", "name": "Amanda Clark", "dept": "Legal", "title": "Legal Counsel"},
    {"email": "kevin.lee@acmecorp.com", "name": "Kevin Lee", "dept": "IT", "title": "Security Analyst"},
    {"email": "jennifer.white@acmecorp.com", "name": "Jennifer White", "dept": "Engineering", "title": "DevOps Engineer"},
    {"email": "chris.martinez@acmecorp.com", "name": "Chris Martinez", "dept": "Sales", "title": "Sales Director"},
]

DEVICES = [
    {"id": "DEV-001", "hostname": "LAPTOP-SCHEN01", "os": "Windows 11", "owner": "sarah.chen@acmecorp.com"},
    {"id": "DEV-002", "hostname": "LAPTOP-MROD01", "os": "Windows 11", "owner": "michael.rodriguez@acmecorp.com"},
    {"id": "DEV-003", "hostname": "MACBOOK-PPATEL", "os": "macOS 14", "owner": "priya.patel@acmecorp.com"},
    {"id": "DEV-004", "hostname": "LAPTOP-JKIM01", "os": "Windows 11", "owner": "james.kim@acmecorp.com"},
    {"id": "DEV-005", "hostname": "LAPTOP-EWATSON", "os": "Windows 11", "owner": "emily.watson@acmecorp.com"},
    {"id": "DEV-006", "hostname": "MACBOOK-DBROWN", "os": "macOS 14", "owner": "david.brown@acmecorp.com"},
    {"id": "DEV-007", "hostname": "LAPTOP-LNGUYEN", "os": "Windows 11", "owner": "lisa.nguyen@acmecorp.com"},
    {"id": "DEV-008", "hostname": "LAPTOP-RTAYLOR", "os": "Windows 11", "owner": "robert.taylor@acmecorp.com"},
    {"id": "DEV-009", "hostname": "MACBOOK-ACLARK", "os": "macOS 14", "owner": "amanda.clark@acmecorp.com"},
    {"id": "DEV-010", "hostname": "LAPTOP-KLEE01", "os": "Windows 11", "owner": "kevin.lee@acmecorp.com"},
    {"id": "DEV-011", "hostname": "WORKSTATION-JWHITE", "os": "Ubuntu 22.04", "owner": "jennifer.white@acmecorp.com"},
    {"id": "DEV-012", "hostname": "LAPTOP-CMART01", "os": "Windows 11", "owner": "chris.martinez@acmecorp.com"},
    {"id": "DEV-013", "hostname": "SERVER-DC01", "os": "Windows Server 2022", "owner": "it-ops@acmecorp.com"},
    {"id": "DEV-014", "hostname": "SERVER-MAIL01", "os": "Windows Server 2022", "owner": "it-ops@acmecorp.com"},
    {"id": "DEV-015", "hostname": "SERVER-WEB01", "os": "Ubuntu 22.04", "owner": "it-ops@acmecorp.com"},
    {"id": "DEV-016", "hostname": "LAPTOP-SCHEN02", "os": "Windows 11", "owner": "sarah.chen@acmecorp.com"},
    {"id": "DEV-017", "hostname": "MOBILE-JKIM01", "os": "iOS 17", "owner": "james.kim@acmecorp.com"},
    {"id": "DEV-018", "hostname": "MOBILE-RTAYLOR", "os": "iOS 17", "owner": "robert.taylor@acmecorp.com"},
    {"id": "DEV-019", "hostname": "LAPTOP-CONTRACTOR01", "os": "Windows 10", "owner": "contractor@external.com"},
    {"id": "DEV-020", "hostname": "MACBOOK-PPATEL2", "os": "macOS 14", "owner": "priya.patel@acmecorp.com"},
]

MALICIOUS_DOMAINS = [
    "secure-login-verify.tk", "acmecorp-portal.ml", "microsoft-auth.cf",
    "sharepoint-download.ga", "onedrive-share.tk", "outlook-signin.ml",
    "invoice-payment.cf", "hr-benefits.ga", "salary-update.tk"
]

MALICIOUS_IPS = [
    "185.220.101.45", "192.42.116.180", "45.142.213.91",
    "89.248.174.195", "141.98.10.54", "5.188.206.78"
]

BENIGN_IPS = [
    "203.0.113.50", "198.51.100.25", "192.0.2.100", "10.0.0.1",
    "172.16.0.1", "8.8.8.8", "1.1.1.1"
]

GEO_LOCATIONS = {
    "185.220.101.45": {"city": "Bucharest", "country": "Romania"},
    "192.42.116.180": {"city": "Moscow", "country": "Russia"},
    "45.142.213.91": {"city": "Beijing", "country": "China"},
    "89.248.174.195": {"city": "Lagos", "country": "Nigeria"},
    "141.98.10.54": {"city": "Sao Paulo", "country": "Brazil"},
    "203.0.113.50": {"city": "San Francisco", "country": "USA"},
    "198.51.100.25": {"city": "New York", "country": "USA"},
}

MITRE_TECHNIQUES = {
    "T1566.001": {"name": "Phishing: Spearphishing Attachment", "tactic": "Initial Access"},
    "T1566.002": {"name": "Phishing: Spearphishing Link", "tactic": "Initial Access"},
    "T1078": {"name": "Valid Accounts", "tactic": "Defense Evasion"},
    "T1078.004": {"name": "Valid Accounts: Cloud Accounts", "tactic": "Defense Evasion"},
    "T1114.002": {"name": "Email Collection: Remote Email Collection", "tactic": "Collection"},
    "T1098": {"name": "Account Manipulation", "tactic": "Persistence"},
    "T1098.001": {"name": "Account Manipulation: Additional Cloud Credentials", "tactic": "Persistence"},
    "T1528": {"name": "Steal Application Access Token", "tactic": "Credential Access"},
    "T1556": {"name": "Modify Authentication Process", "tactic": "Credential Access"},
    "T1059.001": {"name": "Command and Scripting: PowerShell", "tactic": "Execution"},
    "T1059.005": {"name": "Command and Scripting: Visual Basic", "tactic": "Execution"},
    "T1547.001": {"name": "Boot or Logon Autostart: Registry Run Keys", "tactic": "Persistence"},
    "T1071.001": {"name": "Application Layer Protocol: Web Protocols", "tactic": "Command and Control"},
    "T1567.002": {"name": "Exfiltration Over Web Service: Cloud Storage", "tactic": "Exfiltration"},
    "T1110.003": {"name": "Brute Force: Password Spraying", "tactic": "Credential Access"},
}

# ============== EVENT GENERATOR ==============

class EventGenerator:
    def __init__(self):
        self.event_counter = 0
        self.events = []
        self.alerts = []
        self.cases = []
        self.iocs = []
        self.playbook_runs = []
        
    def _evt_id(self):
        self.event_counter += 1
        return f"EVT-{self.event_counter:06d}"
    
    def _alert_id(self, case_id, num):
        return f"ALR-{case_id[-4:]}-{num:03d}"
    
    def _ts(self, base, offset_minutes=0):
        return (base + timedelta(minutes=offset_minutes)).isoformat()
    
    def _random_device(self, user_email):
        user_devices = [d for d in DEVICES if d["owner"] == user_email]
        if user_devices:
            return random.choice(user_devices)
        return random.choice(DEVICES[:12])
    
    def add_event(self, ts, source, event_type, user, device_id=None, src_ip=None, 
                  domain=None, process=None, parent_process=None, file_path=None,
                  registry_key=None, iocs=None, tags=None, case_id=None, summary=None):
        evt = {
            "event_id": self._evt_id(),
            "timestamp": ts,
            "source": source,
            "event_type": event_type,
            "user": user,
            "device_id": device_id or "",
            "src_ip": src_ip or "",
            "geo": GEO_LOCATIONS.get(src_ip, {"city": "Unknown", "country": "Unknown"}),
            "domain": domain or "",
            "process": process or "",
            "parent_process": parent_process or "",
            "file_path": file_path or "",
            "registry_key": registry_key or "",
            "iocs": iocs or [],
            "tags": tags or [],
            "case_id": case_id or "",
            "summary": summary or f"{event_type} by {user}"
        }
        self.events.append(evt)
        return evt["event_id"]
    
    def add_alert(self, case_id, name, severity, confidence, user, mitre_ids, 
                  evidence_ids, hypothesis, actions, ts):
        alert_num = len([a for a in self.alerts if a["case_id"] == case_id]) + 1
        alert = {
            "alert_id": self._alert_id(case_id, alert_num),
            "case_id": case_id,
            "name": name,
            "severity": severity,
            "confidence": confidence,
            "entity": {"user": user},
            "mitre": [{"id": mid, **MITRE_TECHNIQUES.get(mid, {})} for mid in mitre_ids],
            "evidence": evidence_ids,
            "hypothesis": hypothesis,
            "recommended_actions": actions,
            "time_window": {"start": ts, "end": ts},
            "status": "new"
        }
        self.alerts.append(alert)
        return alert["alert_id"]
    
    def add_case(self, case_id, title, severity, users, devices, mitre_ids, 
                 narrative, start_ts, end_ts):
        case = {
            "case_id": case_id,
            "title": title,
            "severity": severity,
            "status": random.choice(["new", "investigating", "contained"]),
            "owner": random.choice(["analyst-1", "analyst-2", "unassigned"]),
            "created_at": start_ts,
            "updated_at": end_ts,
            "affected_users": users,
            "affected_devices": devices,
            "mitre_techniques": mitre_ids,
            "narrative": narrative,
            "alert_ids": [],
            "evidence_count": 0
        }
        self.cases.append(case)
        return case
    
    # ============== INCIDENT SCENARIOS ==============
    
    def scenario_1_phishing_credential_theft(self):
        """Phishing -> credential theft -> impossible travel -> mailbox persistence"""
        case_id = "CASE-2026-0001"
        user = USERS[0]
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=1)
        
        case = self.add_case(
            case_id, "Phishing-Led Account Compromise", "critical",
            [user["email"]], [device["id"]], ["T1566.002", "T1078", "T1114.002", "T1098"],
            "User received credential phishing email, clicked malicious link, submitted credentials. Attacker authenticated from foreign IP and created mailbox forwarding rule.",
            self._ts(start), self._ts(start, 180)
        )
        
        evidence = []
        
        # Email received
        evidence.append(self.add_event(
            self._ts(start), "email_gateway", "email_delivered", user["email"],
            device["id"], BENIGN_IPS[0], MALICIOUS_DOMAINS[0],
            tags=["phishing", "suspicious"], case_id=case_id,
            summary=f"Phishing email delivered from {MALICIOUS_DOMAINS[0]}"
        ))
        
        # Click
        evidence.append(self.add_event(
            self._ts(start, 5), "proxy", "url_visited", user["email"],
            device["id"], BENIGN_IPS[0], MALICIOUS_DOMAINS[0],
            tags=["click", "suspicious"], case_id=case_id,
            summary=f"User visited credential harvesting page"
        ))
        
        # Credential submission
        evidence.append(self.add_event(
            self._ts(start, 7), "proxy", "http_post", user["email"],
            device["id"], BENIGN_IPS[0], MALICIOUS_DOMAINS[0],
            tags=["credential_submission"], case_id=case_id,
            summary=f"Credentials submitted to phishing page"
        ))
        
        # Attacker login (impossible travel)
        evidence.append(self.add_event(
            self._ts(start, 60), "idp", "login_success", user["email"],
            src_ip=MALICIOUS_IPS[0],
            tags=["impossible_travel", "suspicious_geo"], case_id=case_id,
            summary=f"Login from Romania (impossible travel)"
        ))
        
        # Mailbox rule created
        evidence.append(self.add_event(
            self._ts(start, 90), "m365_audit", "inbox_rule_created", user["email"],
            src_ip=MALICIOUS_IPS[0],
            tags=["persistence", "exfiltration"], case_id=case_id,
            summary=f"Forwarding rule created to external address"
        ))
        
        # Alerts
        self.add_alert(case_id, "Phishing Link Clicked", "high", "high", user["email"],
                      ["T1566.002"], evidence[:3],
                      "User clicked phishing link and likely submitted credentials",
                      ["Reset user password", "Revoke sessions", "Block domain"],
                      self._ts(start, 10))
        
        self.add_alert(case_id, "Impossible Travel Detected", "high", "high", user["email"],
                      ["T1078"], [evidence[3]],
                      "Login from geographically distant location within short timeframe",
                      ["Verify with user", "Check VPN usage", "Consider account compromise"],
                      self._ts(start, 65))
        
        self.add_alert(case_id, "Suspicious Mailbox Rule", "critical", "high", user["email"],
                      ["T1098", "T1114.002"], [evidence[4]],
                      "Mailbox forwarding rule created, potential data exfiltration",
                      ["Remove rule", "Audit sent emails", "Notify user"],
                      self._ts(start, 95))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_DOMAINS[0], "type": "domain", "tags": ["phishing"], "cases": [case_id]})
        self.iocs.append({"indicator": MALICIOUS_IPS[0], "type": "ip", "tags": ["attacker"], "cases": [case_id]})
    
    def scenario_2_oauth_consent_phishing(self):
        """OAuth consent phishing -> token abuse -> mailbox access"""
        case_id = "CASE-2026-0002"
        user = USERS[1]
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=3)
        
        case = self.add_case(
            case_id, "OAuth Consent Phishing - Token Abuse", "high",
            [user["email"]], [device["id"]], ["T1566.002", "T1528", "T1114.002"],
            "User granted OAuth consent to malicious app. Attacker used token to access mailbox and exfiltrate emails.",
            self._ts(start), self._ts(start, 240)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "email_gateway", "email_delivered", user["email"],
            device["id"], tags=["oauth_lure"], case_id=case_id,
            summary="OAuth consent request email received"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 10), "idp", "oauth_consent_granted", user["email"],
            device["id"], tags=["risky_app", "suspicious"], case_id=case_id,
            summary="User granted consent to 'MailSyncPro' app"
        ))
        
        for i in range(15):
            evidence.append(self.add_event(
                self._ts(start, 60 + i*5), "m365_audit", "message_read", user["email"],
                src_ip=MALICIOUS_IPS[1], tags=["bulk_access"], case_id=case_id,
                summary=f"Email accessed via OAuth token (batch {i+1})"
            ))
        
        self.add_alert(case_id, "Suspicious OAuth App Consent", "high", "medium", user["email"],
                      ["T1528"], evidence[:2],
                      "User granted consent to unknown OAuth application",
                      ["Revoke app consent", "Review app permissions", "Notify user"],
                      self._ts(start, 15))
        
        self.add_alert(case_id, "Bulk Mailbox Access via OAuth", "high", "high", user["email"],
                      ["T1114.002"], evidence[2:],
                      "Mass email access detected through OAuth token",
                      ["Revoke OAuth tokens", "Audit accessed emails", "Block app"],
                      self._ts(start, 120))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_IPS[1], "type": "ip", "tags": ["oauth_abuse"], "cases": [case_id]})
    
    def scenario_3_mfa_fatigue(self):
        """MFA fatigue -> session hijack -> privileged action"""
        case_id = "CASE-2026-0003"
        user = USERS[2]
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=5)
        
        case = self.add_case(
            case_id, "MFA Fatigue Attack - Session Hijacking", "critical",
            [user["email"]], [device["id"]], ["T1078", "T1556", "T1098.001"],
            "Attacker bombarded user with MFA push notifications until approved. Used session to access admin portal and escalate privileges.",
            self._ts(start), self._ts(start, 60)
        )
        
        evidence = []
        
        # MFA bombing
        for i in range(15):
            evidence.append(self.add_event(
                self._ts(start, i*2), "idp", "mfa_push_sent", user["email"],
                src_ip=MALICIOUS_IPS[2], tags=["mfa_bombing"], case_id=case_id,
                summary=f"MFA push notification #{i+1} sent"
            ))
        
        evidence.append(self.add_event(
            self._ts(start, 32), "idp", "mfa_approved", user["email"],
            src_ip=MALICIOUS_IPS[2], tags=["fatigue_success"], case_id=case_id,
            summary="User approved MFA push (fatigue)"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 33), "idp", "login_success", user["email"],
            src_ip=MALICIOUS_IPS[2], tags=["suspicious_geo"], case_id=case_id,
            summary="Login successful from China"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 40), "admin_audit", "role_assigned", user["email"],
            src_ip=MALICIOUS_IPS[2], tags=["privilege_escalation"], case_id=case_id,
            summary="GlobalAdmin role assigned to user"
        ))
        
        self.add_alert(case_id, "MFA Push Bombing Detected", "critical", "high", user["email"],
                      ["T1556"], evidence[:15],
                      "Multiple rapid MFA push attempts indicate push bombing attack",
                      ["Contact user immediately", "Block IP", "Revoke sessions"],
                      self._ts(start, 30))
        
        self.add_alert(case_id, "Privilege Escalation After MFA Fatigue", "critical", "high", user["email"],
                      ["T1098.001"], evidence[15:],
                      "Admin role assigned after suspicious MFA approval",
                      ["Remove role", "Audit admin actions", "Full incident review"],
                      self._ts(start, 45))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_IPS[2], "type": "ip", "tags": ["mfa_bombing"], "cases": [case_id]})
    
    def scenario_4_password_spray(self):
        """Password spray -> successful login -> inbox search/exfil"""
        case_id = "CASE-2026-0004"
        user = USERS[3]
        start = BASE_TIME + timedelta(days=7)
        
        case = self.add_case(
            case_id, "Password Spray - Email Exfiltration", "high",
            [user["email"]], [], ["T1110.003", "T1078", "T1114.002"],
            "Password spray attack succeeded against user. Attacker searched mailbox for sensitive terms and exported emails.",
            self._ts(start), self._ts(start, 120)
        )
        
        evidence = []
        
        # Failed attempts against multiple users
        for i, u in enumerate(USERS[:6]):
            evidence.append(self.add_event(
                self._ts(start, i*2), "idp", "login_failed", u["email"],
                src_ip=MALICIOUS_IPS[3], tags=["password_spray"], case_id=case_id,
                summary=f"Failed login attempt (password spray)"
            ))
        
        # Successful login
        evidence.append(self.add_event(
            self._ts(start, 15), "idp", "login_success", user["email"],
            src_ip=MALICIOUS_IPS[3], tags=["spray_success"], case_id=case_id,
            summary="Successful login after spray attack"
        ))
        
        # Mailbox search
        evidence.append(self.add_event(
            self._ts(start, 30), "m365_audit", "mailbox_search", user["email"],
            src_ip=MALICIOUS_IPS[3], tags=["recon"], case_id=case_id,
            summary="Mailbox searched for 'password', 'invoice', 'wire'"
        ))
        
        # Export
        evidence.append(self.add_event(
            self._ts(start, 45), "m365_audit", "mailbox_export", user["email"],
            src_ip=MALICIOUS_IPS[3], tags=["exfiltration"], case_id=case_id,
            summary="Bulk email export initiated"
        ))
        
        self.add_alert(case_id, "Password Spray Attack", "medium", "high", user["email"],
                      ["T1110.003"], evidence[:6],
                      "Multiple failed logins from single IP across multiple accounts",
                      ["Block source IP", "Force password reset for affected users"],
                      self._ts(start, 15))
        
        self.add_alert(case_id, "Mailbox Exfiltration", "high", "high", user["email"],
                      ["T1114.002"], evidence[6:],
                      "Bulk email export after successful spray attack",
                      ["Revoke sessions", "Audit exported data", "Legal notification"],
                      self._ts(start, 50))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_IPS[3], "type": "ip", "tags": ["password_spray"], "cases": [case_id]})
    
    def scenario_5_bec_attack(self):
        """Business email compromise: forwarding + finance lures"""
        case_id = "CASE-2026-0005"
        user = USERS[6]  # Finance - Lisa Nguyen
        start = BASE_TIME + timedelta(days=8)
        
        case = self.add_case(
            case_id, "Business Email Compromise - Invoice Fraud", "critical",
            [user["email"]], [], ["T1566.002", "T1098", "T1114.002"],
            "Finance user compromised. Attacker set up forwarding and sent fraudulent wire transfer requests to partners.",
            self._ts(start), self._ts(start, 300)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "email_gateway", "email_delivered", user["email"],
            domain=MALICIOUS_DOMAINS[6], tags=["finance_lure"], case_id=case_id,
            summary="Finance-themed phishing email delivered"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 10), "idp", "login_success", user["email"],
            src_ip=MALICIOUS_IPS[4], tags=["suspicious_geo"], case_id=case_id,
            summary="Login from Brazil (suspicious)"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 20), "m365_audit", "inbox_rule_created", user["email"],
            src_ip=MALICIOUS_IPS[4], tags=["persistence"], case_id=case_id,
            summary="Rule created to delete emails containing 'fraud'"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 60), "email_gateway", "email_sent", user["email"],
            tags=["bec", "wire_fraud"], case_id=case_id,
            summary="Fraudulent wire transfer request sent to vendor"
        ))
        
        self.add_alert(case_id, "Finance Account Compromise", "critical", "high", user["email"],
                      ["T1078", "T1098"], evidence[:3],
                      "Finance user account accessed from suspicious location with persistence established",
                      ["Immediate password reset", "Remove mailbox rules", "Alert finance team"],
                      self._ts(start, 25))
        
        self.add_alert(case_id, "Business Email Compromise - Wire Fraud", "critical", "high", user["email"],
                      ["T1114.002"], evidence[3:],
                      "Fraudulent financial communication sent from compromised account",
                      ["Contact recipients", "Recall emails", "Legal notification"],
                      self._ts(start, 65))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_DOMAINS[6], "type": "domain", "tags": ["bec"], "cases": [case_id]})
        self.iocs.append({"indicator": MALICIOUS_IPS[4], "type": "ip", "tags": ["bec"], "cases": [case_id]})
    
    def scenario_6_malware_c2(self):
        """Malicious attachment -> macro -> persistence -> C2 beacon"""
        case_id = "CASE-2026-0006"
        user = USERS[4]  # Emily Watson - HR
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=9)
        
        case = self.add_case(
            case_id, "Malware Infection - C2 Communication", "critical",
            [user["email"]], [device["id"]], ["T1566.001", "T1059.005", "T1547.001", "T1071.001"],
            "User opened malicious attachment containing VBA macro. Malware established persistence and initiated C2 communication.",
            self._ts(start), self._ts(start, 180)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "email_gateway", "attachment_delivered", user["email"],
            device["id"], domain="invoice-doc.cf", tags=["malicious_attachment"], case_id=case_id,
            summary="Email with malicious attachment delivered"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 5), "edr", "process_start", user["email"],
            device["id"], process="WINWORD.EXE", tags=["office"], case_id=case_id,
            summary="Word document opened"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 6), "edr", "process_start", user["email"],
            device["id"], process="powershell.exe", parent_process="WINWORD.EXE",
            tags=["macro_execution", "suspicious"], case_id=case_id,
            summary="PowerShell spawned from Word (macro execution)"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 7), "edr", "file_write", user["email"],
            device["id"], process="powershell.exe", 
            file_path="C:\\Users\\ewatson\\AppData\\Local\\Temp\\update.exe",
            tags=["dropper"], case_id=case_id,
            summary="Suspicious file dropped to temp folder"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 8), "edr", "registry_set", user["email"],
            device["id"], process="update.exe",
            registry_key="HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\UpdateService",
            tags=["persistence"], case_id=case_id,
            summary="Registry run key persistence established"
        ))
        
        # C2 beacons
        for i in range(10):
            evidence.append(self.add_event(
                self._ts(start, 15 + i*10), "edr", "network_connect", user["email"],
                device["id"], process="update.exe", domain="cdn-update.cf",
                src_ip=MALICIOUS_IPS[5], tags=["c2", "beacon"], case_id=case_id,
                summary=f"C2 beacon #{i+1} to cdn-update.cf"
            ))
        
        self.add_alert(case_id, "Macro Execution - Malware Delivery", "critical", "high", user["email"],
                      ["T1566.001", "T1059.005"], evidence[:4],
                      "Malicious macro executed PowerShell and dropped payload",
                      ["Isolate endpoint", "Block attachment hash", "Scan similar emails"],
                      self._ts(start, 10))
        
        self.add_alert(case_id, "Malware Persistence Established", "critical", "high", user["email"],
                      ["T1547.001"], [evidence[4]],
                      "Registry run key persistence detected",
                      ["Remove persistence", "Full malware analysis", "Check lateral movement"],
                      self._ts(start, 12))
        
        self.add_alert(case_id, "Command & Control Activity", "critical", "high", user["email"],
                      ["T1071.001"], evidence[5:],
                      "Periodic C2 beacon communication detected",
                      ["Block C2 domain", "Isolate endpoint", "Network forensics"],
                      self._ts(start, 60))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": "cdn-update.cf", "type": "domain", "tags": ["c2"], "cases": [case_id]})
        self.iocs.append({"indicator": MALICIOUS_IPS[5], "type": "ip", "tags": ["c2"], "cases": [case_id]})
        self.iocs.append({"indicator": "a1b2c3d4e5f6789012345678901234567890abcd", "type": "hash", "tags": ["malware"], "cases": [case_id]})
    
    def scenario_7_new_device_anomaly(self):
        """New device enrollment -> risky sign-in -> admin role"""
        case_id = "CASE-2026-0007"
        user = USERS[7]  # Robert Taylor - CFO
        start = BASE_TIME + timedelta(days=10)
        
        case = self.add_case(
            case_id, "New Device Anomaly - Admin Role Assignment", "high",
            [user["email"]], ["DEV-019"], ["T1078.004", "T1098.001"],
            "Unknown device registered to executive account followed by suspicious admin role assignment.",
            self._ts(start), self._ts(start, 60)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "idp", "new_device_enrolled", user["email"],
            "DEV-019", src_ip="89.248.174.195", tags=["new_device", "risky"], case_id=case_id,
            summary="New device 'LAPTOP-CONTRACTOR01' enrolled"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 5), "idp", "login_success", user["email"],
            "DEV-019", src_ip="89.248.174.195", tags=["suspicious_geo"], case_id=case_id,
            summary="Login from Nigeria on new device"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 15), "admin_audit", "role_assigned", user["email"],
            src_ip="89.248.174.195", tags=["privilege_escalation"], case_id=case_id,
            summary="Exchange Administrator role assigned"
        ))
        
        self.add_alert(case_id, "Risky Sign-in from New Device", "high", "medium", user["email"],
                      ["T1078.004"], evidence[:2],
                      "Executive account accessed from new device in risky location",
                      ["Verify with user", "Review device", "Consider blocking"],
                      self._ts(start, 10))
        
        self.add_alert(case_id, "Suspicious Admin Role Assignment", "high", "high", user["email"],
                      ["T1098.001"], [evidence[2]],
                      "Admin role assigned after risky sign-in",
                      ["Remove role", "Audit recent admin actions", "Verify authorization"],
                      self._ts(start, 20))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
    
    def scenario_8_data_exfil_cloud(self):
        """Data exfiltration via cloud storage link share"""
        case_id = "CASE-2026-0008"
        user = USERS[10]  # Jennifer White - DevOps
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=11)
        
        case = self.add_case(
            case_id, "Data Exfiltration via Cloud Share", "high",
            [user["email"]], [device["id"]], ["T1567.002"],
            "User created public sharing links for sensitive files and shared externally.",
            self._ts(start), self._ts(start, 120)
        )
        
        evidence = []
        
        for i in range(5):
            evidence.append(self.add_event(
                self._ts(start, i*10), "m365_audit", "sharing_link_created", user["email"],
                device["id"], tags=["external_share", "sensitive"], case_id=case_id,
                summary=f"Public link created for sensitive file {i+1}"
            ))
        
        evidence.append(self.add_event(
            self._ts(start, 60), "m365_audit", "file_downloaded", user["email"],
            src_ip="45.33.32.156", tags=["external_access"], case_id=case_id,
            summary="Files accessed from external IP via shared links"
        ))
        
        self.add_alert(case_id, "Mass External File Sharing", "high", "medium", user["email"],
                      ["T1567.002"], evidence[:5],
                      "Multiple sensitive files shared externally in short period",
                      ["Review shared files", "Revoke links", "Verify with user"],
                      self._ts(start, 55))
        
        self.add_alert(case_id, "External Access to Shared Files", "high", "high", user["email"],
                      ["T1567.002"], [evidence[5]],
                      "Shared files accessed from unknown external location",
                      ["Disable sharing", "Audit file contents", "DLP review"],
                      self._ts(start, 65))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
    
    def generate_benign_events(self, count=300):
        """Generate normal/benign events to simulate real SIEM noise"""
        event_types = [
            ("idp", "login_success", []),
            ("idp", "login_success", []),
            ("idp", "mfa_approved", []),
            ("email_gateway", "email_delivered", []),
            ("email_gateway", "email_sent", []),
            ("proxy", "url_visited", []),
            ("m365_audit", "file_accessed", []),
            ("m365_audit", "message_read", []),
            ("edr", "process_start", []),
        ]
        
        benign_domains = ["google.com", "microsoft.com", "slack.com", "zoom.us", 
                        "github.com", "salesforce.com", "dropbox.com", "office.com"]
        
        for i in range(count):
            user = random.choice(USERS)
            device = self._random_device(user["email"])
            source, event_type, tags = random.choice(event_types)
            offset = random.randint(0, 14*24*60)  # Random time in 14-day window
            
            self.add_event(
                self._ts(BASE_TIME, offset), source, event_type, user["email"],
                device["id"], random.choice(BENIGN_IPS),
                domain=random.choice(benign_domains) if source == "proxy" else "",
                process="explorer.exe" if source == "edr" else "",
                tags=tags,
                summary=f"Normal {event_type} activity"
            )
    
    def generate_all(self):
        """Generate complete synthetic dataset"""
        print("[GEN] Generating incident scenarios...")
        self.scenario_1_phishing_credential_theft()
        self.scenario_2_oauth_consent_phishing()
        self.scenario_3_mfa_fatigue()
        self.scenario_4_password_spray()
        self.scenario_5_bec_attack()
        self.scenario_6_malware_c2()
        self.scenario_7_new_device_anomaly()
        self.scenario_8_data_exfil_cloud()
        
        print("[GEN] Generating benign noise events...")
        self.generate_benign_events(400)
        
        # Sort events by timestamp
        self.events.sort(key=lambda x: x["timestamp"])
        
        # Finalize IOCs
        for ioc in self.iocs:
            ioc["first_seen"] = self._ts(BASE_TIME)
            ioc["last_seen"] = self._ts(BASE_TIME, 14*24*60)
            ioc["confidence"] = random.choice(["high", "medium"])
        
        print(f"[GEN] Generated {len(self.events)} events")
        print(f"[GEN] Generated {len(self.alerts)} alerts")
        print(f"[GEN] Generated {len(self.cases)} cases")
        print(f"[GEN] Generated {len(self.iocs)} IOCs")
        
        return {
            "events": self.events,
            "alerts": self.alerts,
            "cases": self.cases,
            "iocs": self.iocs,
            "users": USERS,
            "devices": DEVICES,
            "mitre": MITRE_TECHNIQUES
        }


def generate_edr_devices(events, devices):
    """Generate EDR device inventory with recent activity"""
    device_map = {d["id"]: {
        **d,
        "first_seen": None,
        "last_seen": None,
        "risk_score": 0,
        "open_alerts": 0,
        "recent_processes": [],
        "recent_connections": []
    } for d in devices}
    
    for evt in events:
        did = evt.get("device_id")
        if did and did in device_map:
            d = device_map[did]
            ts = evt["timestamp"]
            
            if not d["first_seen"] or ts < d["first_seen"]:
                d["first_seen"] = ts
            if not d["last_seen"] or ts > d["last_seen"]:
                d["last_seen"] = ts
            
            if evt["source"] == "edr":
                if evt["event_type"] == "process_start" and evt["process"]:
                    d["recent_processes"].append({
                        "process": evt["process"],
                        "parent": evt.get("parent_process", ""),
                        "timestamp": ts
                    })
                if evt["event_type"] == "network_connect":
                    d["recent_connections"].append({
                        "domain": evt.get("domain", ""),
                        "ip": evt.get("src_ip", ""),
                        "timestamp": ts
                    })
            
            if "suspicious" in evt.get("tags", []) or "malicious" in evt.get("tags", []):
                d["risk_score"] += 10
    
    # Limit recent items
    for d in device_map.values():
        d["recent_processes"] = d["recent_processes"][-20:]
        d["recent_connections"] = d["recent_connections"][-20:]
        d["risk_score"] = min(d["risk_score"], 100)
    
    return list(device_map.values())


def generate_kpi_timeseries(events, alerts):
    """Generate time-series KPI data"""
    from collections import defaultdict
    
    hourly_events = defaultdict(int)
    hourly_alerts = defaultdict(int)
    daily_risk = defaultdict(int)
    
    for evt in events:
        ts = evt["timestamp"][:13] + ":00:00"  # Hour bucket
        day = evt["timestamp"][:10]
        hourly_events[ts] += 1
        
        if "suspicious" in evt.get("tags", []):
            daily_risk[day] += 5
    
    for alert in alerts:
        ts = alert["time_window"]["start"][:13] + ":00:00"
        day = alert["time_window"]["start"][:10]
        hourly_alerts[ts] += 1
        
        sev_weight = {"critical": 100, "high": 75, "medium": 50, "low": 25}
        daily_risk[day] += sev_weight.get(alert["severity"], 25)
    
    return {
        "events_per_hour": [{"timestamp": k, "count": v} for k, v in sorted(hourly_events.items())],
        "alerts_per_hour": [{"timestamp": k, "count": v} for k, v in sorted(hourly_alerts.items())],
        "risk_per_day": [{"date": k, "risk": v} for k, v in sorted(daily_risk.items())]
    }


def generate_playbook_runs(cases):
    """Generate simulated SOAR playbook runs"""
    playbooks = []
    templates = [
        {"name": "Phishing Response", "steps": ["Block sender", "Quarantine email", "Reset password", "Notify user"]},
        {"name": "Account Compromise", "steps": ["Revoke sessions", "Reset password", "Review audit logs", "Check lateral movement"]},
        {"name": "Malware Containment", "steps": ["Isolate endpoint", "Collect forensics", "Block IOCs", "Scan similar endpoints"]},
        {"name": "Data Exfiltration", "steps": ["Revoke sharing", "Audit access", "DLP scan", "Legal notification"]}
    ]
    
    for i, case in enumerate(cases):
        template = templates[i % len(templates)]
        start = datetime.fromisoformat(case["created_at"]) + timedelta(minutes=random.randint(5, 30))
        duration = random.randint(60, 300)
        
        playbooks.append({
            "run_id": f"PB-{1000+i}",
            "case_id": case["case_id"],
            "playbook_name": template["name"],
            "started_at": start.isoformat(),
            "finished_at": (start + timedelta(seconds=duration)).isoformat(),
            "status": random.choice(["completed", "completed", "completed", "partial"]),
            "steps": template["steps"],
            "actions_taken": template["steps"][:random.randint(2, len(template["steps"]))],
            "notes": f"Automated response for {case['case_id']}"
        })
    
    return playbooks


def generate_mitre_coverage(cases, alerts):
    """Generate MITRE ATT&CK coverage data"""
    from collections import defaultdict
    
    overall = defaultdict(int)
    by_case = {}
    
    for case in cases:
        case_id = case["case_id"]
        by_case[case_id] = defaultdict(int)
        for tech in case.get("mitre_techniques", []):
            overall[tech] += 1
            by_case[case_id][tech] += 1
    
    techniques = []
    for tech_id, count in overall.items():
        info = MITRE_TECHNIQUES.get(tech_id, {"name": "Unknown", "tactic": "Unknown"})
        techniques.append({
            "id": tech_id,
            "name": info["name"],
            "tactic": info["tactic"],
            "count": count,
            "cases": [c["case_id"] for c in cases if tech_id in c.get("mitre_techniques", [])]
        })
    
    return {
        "overall": dict(overall),
        "by_case": {k: dict(v) for k, v in by_case.items()},
        "techniques": techniques,
        "summary": {
            "total_techniques": len(overall),
            "total_observations": sum(overall.values())
        }
    }


def generate_risk_scores(events, users):
    """Generate entity risk scores"""
    from collections import defaultdict
    
    user_scores = defaultdict(lambda: {"score": 0, "reasons": []})
    
    for evt in events:
        user = evt.get("user")
        if not user:
            continue
        
        tags = evt.get("tags", [])
        if "phishing" in tags:
            user_scores[user]["score"] += 20
            user_scores[user]["reasons"].append({"rule": "phishing_target", "points": 20, "description": "Received phishing email"})
        if "impossible_travel" in tags:
            user_scores[user]["score"] += 30
            user_scores[user]["reasons"].append({"rule": "impossible_travel", "points": 30, "description": "Impossible travel detected"})
        if "mfa_bombing" in tags:
            user_scores[user]["score"] += 25
            user_scores[user]["reasons"].append({"rule": "mfa_fatigue", "points": 25, "description": "MFA bombing target"})
        if "c2" in tags:
            user_scores[user]["score"] += 40
            user_scores[user]["reasons"].append({"rule": "c2_activity", "points": 40, "description": "C2 communication detected"})
        if "privilege_escalation" in tags:
            user_scores[user]["score"] += 35
            user_scores[user]["reasons"].append({"rule": "priv_esc", "points": 35, "description": "Privilege escalation"})
    
    # Normalize and classify
    entity_scores = {}
    for user, data in user_scores.items():
        score = min(data["score"], 100)
        severity = "critical" if score >= 80 else "high" if score >= 60 else "medium" if score >= 40 else "low"
        entity_scores[user] = {
            "score": score,
            "severity": severity,
            "reasons": data["reasons"][:5]  # Top 5 reasons
        }
    
    # Add baseline scores for users without incidents
    for u in users:
        if u["email"] not in entity_scores:
            entity_scores[u["email"]] = {"score": random.randint(5, 25), "severity": "low", "reasons": []}
    
    return {"entity_scores": entity_scores}


def generate_entities(events, users, devices):
    """Generate entity profiles"""
    from collections import defaultdict
    
    user_profiles = {}
    ip_profiles = defaultdict(lambda: {"type": "ip", "first_seen": None, "last_seen": None, "users": set(), "reputation": "unknown"})
    
    for u in users:
        user_profiles[u["email"]] = {
            "type": "user",
            "email": u["email"],
            "name": u["name"],
            "dept": u["dept"],
            "title": u["title"],
            "first_seen": None,
            "last_seen": None,
            "event_count": 0,
            "devices": set(),
            "ips": set(),
            "risk_score": 0
        }
    
    for evt in events:
        user = evt.get("user")
        ip = evt.get("src_ip")
        device = evt.get("device_id")
        ts = evt.get("timestamp")
        
        if user and user in user_profiles:
            p = user_profiles[user]
            p["event_count"] += 1
            if device:
                p["devices"].add(device)
            if ip:
                p["ips"].add(ip)
            if not p["first_seen"] or ts < p["first_seen"]:
                p["first_seen"] = ts
            if not p["last_seen"] or ts > p["last_seen"]:
                p["last_seen"] = ts
        
        if ip and ip not in ["", "10.0.0.1"]:
            ip_p = ip_profiles[ip]
            if user:
                ip_p["users"].add(user)
            if not ip_p["first_seen"] or ts < ip_p["first_seen"]:
                ip_p["first_seen"] = ts
            if not ip_p["last_seen"] or ts > ip_p["last_seen"]:
                ip_p["last_seen"] = ts
            
            if ip in MALICIOUS_IPS:
                ip_p["reputation"] = "malicious"
            elif ip in BENIGN_IPS:
                ip_p["reputation"] = "clean"
    
    # Convert sets to lists
    for p in user_profiles.values():
        p["devices"] = list(p["devices"])
        p["ips"] = list(p["ips"])
    
    for p in ip_profiles.values():
        p["users"] = list(p["users"])
    
    return {
        "users": user_profiles,
        "ips": dict(ip_profiles),
        "devices": {d["id"]: d for d in devices}
    }


def generate_correlations(events, alerts, cases):
    """Generate correlation graph edges"""
    edges = []
    
    # User <-> IP edges
    user_ips = {}
    for evt in events:
        user = evt.get("user")
        ip = evt.get("src_ip")
        if user and ip and ip not in ["", "10.0.0.1"]:
            key = f"{user}-{ip}"
            if key not in user_ips:
                user_ips[key] = {"source": user, "target": ip, "type": "user_ip", "weight": 0}
            user_ips[key]["weight"] += 1
    edges.extend(user_ips.values())
    
    # Case <-> Alert edges
    for case in cases:
        for alert_id in case.get("alert_ids", []):
            edges.append({"source": case["case_id"], "target": alert_id, "type": "case_alert", "weight": 1})
    
    # Alert <-> Evidence edges
    for alert in alerts:
        for evt_id in alert.get("evidence", []):
            edges.append({"source": alert["alert_id"], "target": evt_id, "type": "alert_evidence", "weight": 1})
    
    return {
        "edges": edges[:500],  # Limit for performance
        "patterns": [
            {"name": "phishing_chain", "description": "Phishing email → click → credential theft"},
            {"name": "impossible_travel", "description": "Login from distant locations"},
            {"name": "mfa_fatigue", "description": "Multiple MFA pushes followed by approval"},
            {"name": "c2_beacon", "description": "Periodic outbound connections to C2"}
        ]
    }


def generate_summary(events, alerts, cases, users, devices):
    """Generate dashboard summary"""
    sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for alert in alerts:
        sev_counts[alert["severity"]] = sev_counts.get(alert["severity"], 0) + 1
    
    return {
        "generated_at": datetime.now().isoformat(),
        "seed": SEED,
        "metrics": {
            "total_events_analyzed": len(events),
            "total_alerts_generated": len(alerts),
            "total_cases": len(cases),
            "affected_users": len(set(e.get("user") for e in events if e.get("user"))),
            "affected_devices": len(set(e.get("device_id") for e in events if e.get("device_id"))),
            "alerts_by_severity": sev_counts
        },
        "users": [u["email"] for u in users],
        "devices": [d["id"] for d in devices],
        "mitre_techniques": list(MITRE_TECHNIQUES.keys())
    }


def save_outputs(data):
    """Save all generated data to outputs/"""
    output_dir = Path("outputs")
    output_dir.mkdir(exist_ok=True)
    
    # Events (JSONL)
    with open(output_dir / "events.jsonl", "w") as f:
        for evt in data["events"]:
            f.write(json.dumps(evt) + "\n")
    print(f"[SAVE] events.jsonl ({len(data['events'])} events)")
    
    # Alerts (JSONL)
    with open(output_dir / "alerts.jsonl", "w") as f:
        for alert in data["alerts"]:
            f.write(json.dumps(alert) + "\n")
    print(f"[SAVE] alerts.jsonl ({len(data['alerts'])} alerts)")
    
    # Cases
    with open(output_dir / "cases.json", "w") as f:
        json.dump({"cases": data["cases"]}, f, indent=2)
    print(f"[SAVE] cases.json ({len(data['cases'])} cases)")
    
    # IOCs
    with open(output_dir / "iocs.json", "w") as f:
        json.dump({"iocs": data["iocs"]}, f, indent=2)
    print(f"[SAVE] iocs.json ({len(data['iocs'])} IOCs)")
    
    # EDR Devices
    edr_devices = generate_edr_devices(data["events"], data["devices"])
    with open(output_dir / "edr_devices.json", "w") as f:
        json.dump({"devices": edr_devices}, f, indent=2)
    print(f"[SAVE] edr_devices.json ({len(edr_devices)} devices)")
    
    # Playbook Runs
    playbooks = generate_playbook_runs(data["cases"])
    with open(output_dir / "playbook_runs.jsonl", "w") as f:
        for pb in playbooks:
            f.write(json.dumps(pb) + "\n")
    print(f"[SAVE] playbook_runs.jsonl ({len(playbooks)} runs)")
    
    # MITRE Coverage
    mitre = generate_mitre_coverage(data["cases"], data["alerts"])
    with open(output_dir / "mitre_coverage.json", "w") as f:
        json.dump(mitre, f, indent=2)
    print(f"[SAVE] mitre_coverage.json")
    
    # KPI Timeseries
    kpi = generate_kpi_timeseries(data["events"], data["alerts"])
    with open(output_dir / "kpi_timeseries.json", "w") as f:
        json.dump(kpi, f, indent=2)
    print(f"[SAVE] kpi_timeseries.json")
    
    # Risk Scores
    risk = generate_risk_scores(data["events"], data["users"])
    with open(output_dir / "risk_scores.json", "w") as f:
        json.dump(risk, f, indent=2)
    print(f"[SAVE] risk_scores.json")
    
    # Entities
    entities = generate_entities(data["events"], data["users"], data["devices"])
    with open(output_dir / "entities.json", "w") as f:
        json.dump(entities, f, indent=2)
    print(f"[SAVE] entities.json")
    
    # Correlations
    correlations = generate_correlations(data["events"], data["alerts"], data["cases"])
    with open(output_dir / "correlations.json", "w") as f:
        json.dump(correlations, f, indent=2)
    print(f"[SAVE] correlations.json")
    
    # Summary
    summary = generate_summary(data["events"], data["alerts"], data["cases"], data["users"], data["devices"])
    with open(output_dir / "summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print(f"[SAVE] summary.json")


def main():
    print(f"\n{'='*60}")
    print("SYNTHETIC SOC DATA GENERATOR")
    print(f"Seed: {SEED}")
    print(f"{'='*60}\n")
    
    gen = EventGenerator()
    data = gen.generate_all()
    
    print(f"\n{'='*60}")
    print("SAVING OUTPUTS")
    print(f"{'='*60}\n")
    
    save_outputs(data)
    
    print(f"\n{'='*60}")
    print("GENERATION COMPLETE")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
