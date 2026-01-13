# Technical Incident Report
## Phishing-Led Account Compromise - Detailed Analysis

**Incident ID:** INC-2026-010-001  
**Analysis Date:** 2026-01-13 14:51:39 UTC  
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

Total Alerts: 4

### Alert 1: Phishing Email Clicked - Credential Submission Suspected
- **Severity:** HIGH
- **Confidence:** high
- **Entity:** sarah.chen@acmecorp.example.com
- **Hypothesis:** User received a phishing email, clicked the malicious link, and submitted credentials to a fake login page. This represents a successful phishing attack with high probability of credential compromise.
- **MITRE ATT&CK:** T1566.002, T1589.001

### Alert 2: Impossible Travel Detected
- **Severity:** HIGH
- **Confidence:** high
- **Entity:** sarah.chen@acmecorp.example.com
- **Hypothesis:** User authenticated from geographically distant locations within a short timeframe (Bucharest, RO followed by New York, US). This is physically impossible and indicates account compromise or credential theft.
- **MITRE ATT&CK:** T1078.004, T1078

### Alert 3: Suspicious Mailbox Forwarding Rule Created
- **Severity:** CRITICAL
- **Confidence:** high
- **Entity:** sarah.chen@acmecorp.example.com
- **Hypothesis:** A mailbox rule was created to forward emails to an external address. This is a common persistence technique used by attackers to maintain access to sensitive email communications after initial compromise.
- **MITRE ATT&CK:** T1114.003, T1114.002

### Alert 4: Account Compromise - Multiple Indicators
- **Severity:** CRITICAL
- **Confidence:** high
- **Entity:** sarah.chen@acmecorp.example.com
- **Hypothesis:** Multiple indicators of account compromise detected: Event matches known IOC: micros0ft-secure.info, login-microsoftonline.verify-account.top, verify-account.top, micros0ft-secure.info; User clicked known phishing link; Login from previously unseen device. These combined indicators suggest the account has been compromised and is being actively misused.
- **MITRE ATT&CK:** T1078.004, T1087, T1114


---

## Indicators of Compromise (IOCs)

### Malicious Domains
```
login-microsoftonline.verify-account.top
micros0ft-secure.info
verify-account.top
```

### Malicious IP Addresses
```
89.34.126.77
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
