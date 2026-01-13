"""
SOC Case Study Pipeline - Report Generation Module
Generates executive and technical reports from analysis results.
"""

import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime


class ReportGenerator:
    """Generates markdown reports from pipeline outputs."""
    
    def __init__(self):
        self.output_dir = Path("outputs")
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_all_reports(self, alerts: List[Dict[str, Any]], 
                            entity_scores: Dict[str, Any],
                            events: List[Dict[str, Any]]):
        """Generate all report types."""
        
        # Executive report
        self.generate_executive_report(alerts, entity_scores)
        
        # Technical report
        self.generate_technical_report(alerts, entity_scores, events)
        
        # Summary dashboard JSON
        self.generate_summary_dashboard(alerts, entity_scores, events)
        
        print(f"[REPORT] Generated all reports in {self.output_dir}")
    
    def generate_executive_report(self, alerts: List[Dict[str, Any]], 
                                  entity_scores: Dict[str, Any]):
        """Generate executive summary report."""
        
        critical_alerts = [a for a in alerts if a['severity'] == 'critical']
        high_alerts = [a for a in alerts if a['severity'] == 'high']
        
        report = f"""# Executive Incident Report
## Phishing-Led Account Compromise

**Date:** January 10, 2026  
**Incident ID:** INC-2026-010-001  
**Status:** Contained and Eradicated  
**Severity:** HIGH

---

## Executive Summary

On January 10, 2026, our Security Operations Center detected and responded to an account compromise incident affecting a marketing team member. The attack began with a phishing email, led to credential theft, and resulted in unauthorized access to the user's email account.

**Key Points:**
- **Attack Vector:** Phishing email with malicious link
- **Impact:** One user account compromised, {len(critical_alerts + high_alerts)} critical security alerts generated
- **Data at Risk:** 47 email messages accessed by attacker
- **Response Time:** Detection within 2 hours 15 minutes of initial phishing email
- **Current Status:** Threat contained, no data loss confirmed

---

## What Happened

1. **Initial Access (08:15 UTC):** User received a phishing email impersonating Microsoft, containing a link to a fake login page
2. **Credential Theft (08:18 UTC):** User clicked the link and entered credentials on the fraudulent website
3. **Account Compromise (08:47 UTC):** Attacker successfully logged in from Romania using stolen credentials
4. **Malicious Activity (08:52 UTC):** Attacker created email forwarding rule and searched for sensitive documents
5. **Detection (09:35 UTC):** SOC detected impossible travel alert
6. **Containment (10:05 UTC):** All sessions revoked, password reset enforced
7. **Eradication (11:30 UTC):** Malicious forwarding rule removed

---

## Business Impact

**Affected Assets:**
- 1 user account (sarah.chen@acmecorp.example.com)
- 47 email messages accessed by attacker
- No confirmed data exfiltration

**Operational Impact:**
- User productivity disrupted for approximately 2 hours
- No impact to business operations or customer data

**Financial Impact:**
- Minimal - limited to incident response labor costs
- No ransom demands or data breach penalties

---

## Actions Taken

✅ Revoked all active sessions for affected account  
✅ Forced password reset with MFA enforcement  
✅ Removed malicious email forwarding rule  
✅ Blocked phishing domain at network perimeter  
✅ Reviewed all emails accessed by attacker - no sensitive data exfiltrated  
✅ Notified affected user and security awareness team

---

## Recommendations

### Immediate (Next 7 Days)
1. Deploy email link rewriting/sandboxing technology
2. Enforce conditional access policies for cloud apps
3. Conduct targeted security awareness training for marketing team

### Short-term (Next 30 Days)
1. Implement FIDO2 hardware keys for high-risk users
2. Enable advanced threat protection for email
3. Review and update phishing response playbooks

### Long-term (Next 90 Days)
1. Evaluate EDR deployment for all endpoints
2. Implement SIEM correlation rules for impossible travel
3. Conduct red team exercise simulating similar attack

---

## Conclusion

This incident demonstrates the effectiveness of our layered security controls and SOC monitoring capabilities. While the initial phishing attempt was successful, our detection and response mechanisms prevented data loss and quickly restored normal operations.

The incident highlights the ongoing need for security awareness training and technical controls to prevent phishing attacks.

**Report Prepared By:** SOC Analysis Team  
**Date:** {datetime.now().strftime('%Y-%m-%d')}
"""
        
        output_path = self.output_dir / "report_executive.md"
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"[REPORT] Executive report saved to {output_path}")
    
    def generate_technical_report(self, alerts: List[Dict[str, Any]],
                                  entity_scores: Dict[str, Any],
                                  events: List[Dict[str, Any]]):
        """Generate detailed technical report."""
        
        # Extract IOCs
        ioc_domains = set()
        ioc_ips = set()
        for event in events:
            for match in event.get('ioc_matches', []):
                if match['type'] == 'domain':
                    ioc_domains.add(match['value'])
                elif match['type'] == 'ip':
                    ioc_ips.add(match['value'])
        
        report = f"""# Technical Incident Report
## Phishing-Led Account Compromise - Detailed Analysis

**Incident ID:** INC-2026-010-001  
**Analysis Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}  
**Analyst:** SOC Tier-2 Team

---

## Incident Overview

**Attack Kill Chain:**
Initial Access → Credential Access → Persistence → Collection → (Attempted) Exfiltration → Containment

**Affected Entity:**
- User: sarah.chen@acmecorp.example.com
- Department: Marketing
- Device: SARAH-LAPTOP-01 (legitimate), Unknown Linux device (attacker)

---

## Technical Timeline

### Phase 1: Initial Access (T+0:00)
**2026-01-10 08:15:23 UTC** - Phishing Email Delivered
- **From:** noreply@micros0ft-secure.info (typosquatting)
- **Subject:** "Urgent: Verify your account"
- **URL:** hxxp://login-microsoftonline.verify-account[.]top
- **SPF:** FAIL
- **DKIM:** NONE
- **Verdict:** Clear phishing indicators present

### Phase 2: User Interaction (T+0:02)
**2026-01-10 08:17:45 UTC** - Phishing Link Clicked
- **Source IP:** 192.168.10.45 (corporate network)
- **User Agent:** Chrome/120.0 Windows 10
- **Action:** HTTP GET to phishing site

**2026-01-10 08:18:12 UTC** - Credentials Submitted
- **Action:** HTTP POST to /auth endpoint
- **Evidence:** POST parameters included email and password fields
- **Verdict:** Credential theft confirmed

### Phase 3: Account Compromise (T+0:30 - T+0:32)
**2026-01-10 08:45:31 UTC** - First Failed Login
- **Source IP:** 89.34.126.77 (Romania)
- **Device:** Unknown Linux/Firefox
- **Result:** Invalid password (attacker testing)

**2026-01-10 08:46:02 UTC** - Second Failed Login
- **Source IP:** 89.34.126.77 (Romania)
- **Result:** Invalid password (continued testing)

**2026-01-10 08:47:18 UTC** - Successful Compromise
- **Source IP:** 89.34.126.77 (Romania)
- **Device:** Unknown Linux/Firefox
- **MFA Method:** TOTP (attacker bypassed MFA via real-time phishing)
- **Result:** SUCCESS
- **Verdict:** Account fully compromised

### Phase 4: Post-Compromise Activity (T+0:32 - T+1:00)
**2026-01-10 08:48:05 UTC** - Mailbox Enumeration
- **Operation:** ListFolders
- **Client:** EWS API
- **Verdict:** Attacker mapping mailbox structure

**2026-01-10 08:52:30 UTC** - Persistence Established
- **Operation:** New-InboxRule
- **Rule Name:** "Auto-forward Financial Docs"
- **Conditions:** Subject contains: invoice, contract, financial
- **Actions:** Forward to external-archive@temp-mail[.]io
- **Verdict:** CRITICAL - Persistence mechanism created

**2026-01-10 09:05:12 UTC** - Sensitive Data Search
- **Operation:** SearchMailbox
- **Query:** subject:contract OR subject:financial OR subject:invoice
- **Results:** 47 messages matched
- **Verdict:** Attacker targeting financial/business data

**2026-01-10 09:15:45 UTC** - Data Access
- **Operation:** MailItemsAccessed
- **Count:** 47 messages
- **Verdict:** Bulk access to sensitive emails

### Phase 5: Detection and Response (T+1:20 - T+3:15)
**2026-01-10 09:35:00 UTC** - SOC Alert Generated
- **Alert Type:** Impossible Travel
- **Trigger:** Logins from Romania and US within 45 minutes
- **Analyst:** Tier-1 SOC

**2026-01-10 10:05:00 UTC** - Containment Initiated
- **Action:** Revoke all active sessions for sarah.chen
- **Action:** Force password reset
- **Actor:** soc.analyst@acmecorp.example.com

**2026-01-10 11:30:00 UTC** - Eradication Complete
- **Action:** Malicious inbox rule deleted
- **Action:** Reviewed forwarded emails (none sent)
- **Verdict:** Threat eradicated, no data loss

---

## Alerts Generated

Total Alerts: {len(alerts)}

"""
        
        for i, alert in enumerate(alerts, 1):
            report += f"### Alert {i}: {alert['name']}\n"
            report += f"- **Severity:** {alert['severity'].upper()}\n"
            report += f"- **Confidence:** {alert['confidence']}\n"
            report += f"- **Entity:** {alert['entity']['user']}\n"
            report += f"- **Hypothesis:** {alert['hypothesis']}\n"
            report += f"- **MITRE ATT&CK:** {', '.join([t['id'] for t in alert['mitre']])}\n\n"
        
        report += f"""
---

## Indicators of Compromise (IOCs)

### Malicious Domains
```
{chr(10).join(sorted(ioc_domains))}
```

### Malicious IP Addresses
```
{chr(10).join(sorted(ioc_ips))}
```

### Attacker TTPs
- Typosquatting domain registration
- Real-time phishing (MFA bypass via proxy)
- Email forwarding rule for persistence
- Targeted search for financial documents
- Use of EWS API to avoid detection

---

## Detection Logic

### Rule 1: Impossible Travel
**Trigger:** User authenticated from geographically distant locations within 1 hour
**Logic:**
```
auth.login.success events for same user
WHERE geo_distance(location1, location2) > 500km
AND time_diff < 60 minutes
```

### Rule 2: Suspicious Mailbox Rule
**Trigger:** Inbox rule created with external forwarding
**Logic:**
```
mailbox.new_inboxrule events
WHERE rule_action CONTAINS "ForwardTo"
AND recipient_domain NOT IN corporate_domains
```

### Rule 3: Phishing Click Chain
**Trigger:** Email with IOC → Web click with IOC → Auth event
**Logic:**
```
SEQUENCE by user [
  email.inbound WITH ioc_match,
  web.* WITH ioc_match WITHIN 30 minutes,
  auth.login* WITHIN 60 minutes
]
```

---

## Recommendations

### Detection Improvements
1. Implement real-time link rewriting to detonate suspicious URLs in sandbox
2. Create custom detection rule for EWS API usage from untrusted IPs
3. Baseline normal mailbox rule creation patterns per user

### Prevention Controls
1. Enforce conditional access: Block logins from high-risk countries
2. Deploy FIDO2 hardware keys for phishing-resistant MFA
3. Implement email authentication enforcement (DMARC reject policy)

### Response Enhancements
1. Automate session revocation for impossible travel alerts (SOAR playbook)
2. Create runbook for mailbox rule forensics
3. Integrate threat intelligence feeds for faster IOC matching

---

## Lessons Learned

**What Worked Well:**
✅ SOC detected impossible travel within 2 hours of initial compromise  
✅ Containment prevented data exfiltration  
✅ Layered logging enabled full timeline reconstruction

**Gaps Identified:**
❌ User clicked phishing link despite security awareness training  
❌ No email link protection or sandboxing deployed  
❌ Conditional access policies not enforcing geo-restrictions  
❌ No alerting on EWS API usage from external IPs

**Action Items:**
- [ ] Deploy email link protection within 7 days
- [ ] Review conditional access policies within 14 days
- [ ] Conduct phishing simulation for all marketing team within 30 days
- [ ] Evaluate SOAR platform for automated response workflows

---

**Report Classification:** INTERNAL USE ONLY  
**Prepared By:** SOC Tier-2 Analysis Team
"""
        
        output_path = self.output_dir / "report_technical.md"
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"[REPORT] Technical report saved to {output_path}")
    
    def generate_summary_dashboard(self, alerts: List[Dict[str, Any]],
                                   entity_scores: Dict[str, Any],
                                   events: List[Dict[str, Any]]):
        """Generate JSON summary for dashboard visualization."""
        
        summary = {
            "incident_id": "INC-2026-010-001",
            "incident_date": "2026-01-10",
            "status": "contained_eradicated",
            "severity": "high",
            "metrics": {
                "total_events_analyzed": len(events),
                "total_alerts_generated": len(alerts),
                "alerts_by_severity": {
                    "critical": len([a for a in alerts if a['severity'] == 'critical']),
                    "high": len([a for a in alerts if a['severity'] == 'high']),
                    "medium": len([a for a in alerts if a['severity'] == 'medium']),
                    "low": len([a for a in alerts if a['severity'] == 'low'])
                },
                "affected_users": len(entity_scores),
                "high_risk_users": len([u for u, s in entity_scores.items() if s['severity'] in ['high', 'critical']]),
                "mitre_techniques_detected": len(set([t['id'] for alert in alerts for t in alert['mitre']])),
                "ioc_hits": sum(1 for e in events if e.get('ioc_matches'))
            },
            "timeline": {
                "initial_access": "2026-01-10T08:15:23Z",
                "compromise_confirmed": "2026-01-10T08:47:18Z",
                "detection": "2026-01-10T09:35:00Z",
                "containment": "2026-01-10T10:05:00Z",
                "eradication": "2026-01-10T11:30:00Z",
                "time_to_detect_minutes": 80,  # ~1h 20min from initial access
                "time_to_contain_minutes": 110  # ~1h 50min from initial access
            },
            "attack_chain": [
                "Initial Access (Phishing)",
                "Credential Access (Phishing)",
                "Persistence (Mailbox Rule)",
                "Discovery (Mailbox Enumeration)",
                "Collection (Email Search)",
                "Containment (SOC Response)"
            ],
            "mitre_techniques": list(set([
                f"{t['id']} - {t['name']}"
                for alert in alerts
                for t in alert['mitre']
            ])),
            "affected_entities": {
                "users": list(entity_scores.keys()),
                "high_risk_ips": ["89.34.126.77"],
                "compromised_devices": ["Unknown Linux device"]
            }
        }
        
        output_path = self.output_dir / "summary.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        
        print(f"[REPORT] Dashboard summary saved to {output_path}")


if __name__ == "__main__":
    # Load data
    alerts = []
    with open("outputs/alerts.jsonl", 'r') as f:
        for line in f:
            alerts.append(json.loads(line))
    
    with open("outputs/risk_scores.json", 'r') as f:
        scores = json.load(f)
    
    events = []
    with open("data/normalized/events.jsonl", 'r') as f:
        for line in f:
            events.append(json.loads(line))
    
    # Generate reports
    generator = ReportGenerator()
    generator.generate_all_reports(alerts, scores['entity_scores'], events)
    
    print("\n[SUCCESS] All reports generated")
