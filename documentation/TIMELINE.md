# Incident Timeline

## INC-2026-010-001: Phishing → Account Compromise

This timeline reconstructs the complete attack sequence from log evidence. Times are in UTC.

---

## Pre-Attack (Before 08:15)

**2026-01-10 06:30:15 UTC**

- **Source:** Identity Provider
- **Event:** Legitimate login
- **Details:** sarah.chen logs in from corporate office (192.168.10.45, New York) using known device SARAH-LAPTOP-01 with certificate-based MFA
- **Analysis:** Normal start of workday

**2026-01-10 07:00-08:00 UTC**

- **Source:** Email, Web Proxy
- **Event:** Normal work activity
- **Details:** Sarah processes emails, browses news sites, accesses internal systems
- **Analysis:** Baseline normal behavior

---

## Phase 1: Initial Access (08:15 - 08:18)

**2026-01-10 08:15:23 UTC** 🚨 **ATTACK BEGINS**

- **Source:** Email Gateway
- **Event ID:** evt-email-001
- **Event:** Phishing email delivered
- **Details:**
  - **From:** noreply@micros0ft-secure.info (typosquatting)
  - **To:** sarah.chen@acmecorp.example.com
  - **Subject:** "Urgent: Verify your account"
  - **URL:** hxxp://login-microsoftonline.verify-account[.]top
  - **SPF:** FAIL
  - **DKIM:** NONE
- **MITRE:** T1566.002 (Phishing: Spearphishing Link)
- **Analysis:** Email cleared gateway filters (missed detection). User presented with fake urgency to click link.

**2026-01-10 08:17:45 UTC** 🚨 **USER INTERACTION**

- **Source:** Web Proxy
- **Event ID:** evt-web-001
- **Event:** HTTP GET to phishing site
- **Details:**
  - **User:** sarah.chen
  - **Source IP:** 192.168.10.45 (corporate network)
  - **URL:** hxxp://login-microsoftonline.verify-account[.]top/
  - **User-Agent:** Chrome/120.0 (Windows 10)
  - **HTTP Status:** 200 OK (page loaded)
- **Analysis:** User clicked phishing link. Attacker-controlled landing page displayed fake Microsoft login form.

**2026-01-10 08:18:12 UTC** 🚨 **CREDENTIAL THEFT**

- **Source:** Web Proxy
- **Event ID:** evt-web-002
- **Event:** HTTP POST (credential submission)
- **Details:**
  - **URL:** hxxp://login-microsoftonline.verify-account[.]top/auth
  - **Method:** POST
  - **POST Data:** Contains "email" and "password" fields
  - **HTTP Status:** 302 Redirect (credential captured, redirect to legitimate Microsoft)
- **MITRE:** T1589.001 (Credentials from Password Stores)
- **Analysis:** **PASSWORD COMPROMISED.** User entered credentials into fake form. Attacker likely using real-time phishing proxy to immediately relay credentials.

---

## Phase 2: Attacker Access (08:45 - 09:16)

**2026-01-10 08:45:31 UTC** 🚨 **ATTACKER LOGIN ATTEMPT #1**

- **Source:** Identity Provider
- **Event ID:** evt-auth-001
- **Event:** Login failed
- **Details:**
  - **User:** sarah.chen@acmecorp.example.com
  - **Source IP:** 89.34.126.77 (Bucharest, Romania)
  - **Device:** Unknown (Linux, Firefox)
  - **Reason:** Invalid password
- **Analysis:** Attacker testing stolen credentials. Failed on first attempt (possible typo or password variation attempt).

**2026-01-10 08:46:02 UTC** 🚨 **ATTACKER LOGIN ATTEMPT #2**

- **Source:** Identity Provider
- **Event ID:** evt-auth-002
- **Event:** Login failed
- **Details:** Same as previous, second failure
- **Analysis:** Second failed attempt. Attacker refining credential entry.

**2026-01-10 08:47:18 UTC** 🚨 **ACCOUNT COMPROMISE SUCCESSFUL**

- **Source:** Identity Provider
- **Event ID:** evt-auth-003
- **Event:** Login successful
- **Details:**
  - **User:** sarah.chen@acmecorp.example.com
  - **Source IP:** 89.34.126.77 (Romania)
  - **Device:** Unknown Linux/Firefox
  - **MFA Method:** TOTP (Time-based One-Time Password)
  - **Result:** SUCCESS
  - **Session ID:** sess-attacker-001
- **MITRE:** T1078.004 (Valid Accounts: Cloud Accounts), T1078 (Defense Evasion)
- **Analysis:** **CRITICAL - ACCOUNT FULLY COMPROMISED.** Attacker bypassed MFA using real-time phishing proxy (relayed MFA prompt to victim, who likely approved thinking it was her own login). Attacker now has valid authenticated session.

**2026-01-10 08:48:05 UTC** 🚨 **RECONNAISSANCE**

- **Source:** Cloud Mailbox
- **Event ID:** evt-mailbox-001
- **Event:** Mailbox login and folder enumeration
- **Details:**
  - **Operation:** ListFolders
  - **User:** sarah.chen
  - **Source IP:** 89.34.126.77
  - **Client:** EWS API
  - **Folders Found:** 12 (Inbox, Sent, Drafts, etc.)
  - **Session:** sess-attacker-001
- **MITRE:** T1087 (Account Discovery)
- **Analysis:** Attacker mapping mailbox structure. Preparing for data collection.

**2026-01-10 08:52:30 UTC** 🚨 **PERSISTENCE ESTABLISHED**

- **Source:** Cloud Mailbox
- **Event ID:** evt-mailbox-002
- **Event:** Inbox rule created
- **Details:**
  - **Operation:** New-InboxRule
  - **Rule Name:** "Auto-forward Financial Docs"
  - **Conditions:** SubjectContainsWords: invoice, contract, financial
  - **Actions:** ForwardTo: external-archive@temp-mail[.]io
  - **Source IP:** 89.34.126.77
  - **Client:** EWS API
- **MITRE:** T1114.003 (Email Forwarding Rule - Persistence), T1114.002 (Email Collection)
- **Analysis:** **CRITICAL - PERSISTENCE MECHANISM INSTALLED.** Attacker created stealth forwarding rule to capture future sensitive emails even after password reset. Rule targets financial documents specifically.

**2026-01-10 09:05:12 UTC** 🚨 **DATA TARGETING**

- **Source:** Cloud Mailbox
- **Event ID:** evt-mailbox-003
- **Event:** Mailbox search
- **Details:**
  - **Operation:** SearchMailbox
  - **Query:** "subject:contract OR subject:financial OR subject:invoice"
  - **Results:** 47 messages matched
  - **Source IP:** 89.34.126.77
- **MITRE:** T1114.002 (Email Collection)
- **Analysis:** Attacker searching for high-value business documents. Targeting financial and contractual information.

**2026-01-10 09:15:45 UTC** 🚨 **DATA ACCESS**

- **Source:** Cloud Mailbox
- **Event ID:** evt-mailbox-004
- **Event:** Bulk message access
- **Details:**
  - **Operation:** MailItemsAccessed
  - **Count:** 47 messages
  - **Source IP:** 89.34.126.77
  - **Client:** EWS API
- **MITRE:** T1114.002 (Email Collection), T1048 (Exfiltration over Alternative Protocol - attempted)
- **Analysis:** Attacker accessed all 47 messages from search results. Reviewing content for sensitive information.

---

## Phase 3: Legitimate User Returns (09:30 - 09:32)

**2026-01-10 09:30:00 UTC**

- **Source:** Endpoint EDR
- **Event ID:** evt-endpoint-001
- **Event:** Outlook process start
- **Details:**
  - **Host:** SARAH-LAPTOP-01
  - **User:** sarah.chen
  - **Process:** outlook.exe
  - **Source IP:** 192.168.10.45 (corporate)
- **Analysis:** Real Sarah returns to desk, opens Outlook. Unaware of compromise.

**2026-01-10 09:32:15 UTC** ⚠️ **IMPOSSIBLE TRAVEL CONDITION**

- **Source:** Identity Provider
- **Event ID:** evt-auth-004
- **Event:** Legitimate user login
- **Details:**
  - **User:** sarah.chen
  - **Source IP:** 192.168.10.45 (New York, US)
  - **Device:** SARAH-LAPTOP-01 (known device)
  - **MFA:** Certificate-based
  - **Result:** SUCCESS
- **Analysis:** **IMPOSSIBLE TRAVEL DETECTED.** Sarah authenticated from Romania at 08:47, now from New York at 09:32 (45 minutes). Geographic distance ~8,000 km. Physical impossibility triggers SOC alert.

---

## Phase 4: Detection and Response (09:35 - 11:30)

**2026-01-10 09:35:00 UTC** ✅ **SOC DETECTION**

- **Source:** SOC SIEM
- **Event ID:** alert-001
- **Event:** Impossible Travel Alert
- **Details:**
  - **Alert Name:** "Impossible Travel Detected - sarah.chen"
  - **Severity:** HIGH
  - **Confidence:** HIGH
  - **Evidence:** Logins from RO and US within 45 minutes
  - **Assigned To:** Tier-1 Analyst
- **Analysis:** Automated detection successful. Alert escalated to Tier-2 for investigation.

**2026-01-10 09:35-10:05 UTC** ✅ **INVESTIGATION**

- **Source:** SOC Analyst
- **Actions:**
  - Reviewed all authentication events for sarah.chen
  - Discovered phishing email correlation
  - Confirmed mailbox forwarding rule creation
  - Contacted Sarah via phone - confirmed she is in New York, NOT traveling
  - Escalated to Tier-2 for immediate containment
- **Analysis:** Account compromise confirmed with high confidence. Immediate containment required.

**2026-01-10 10:05:00 UTC** ✅ **CONTAINMENT #1: Session Revocation**

- **Source:** Identity Provider (SOC Action)
- **Event ID:** evt-auth-005
- **Event:** All sessions revoked
- **Details:**
  - **User:** sarah.chen
  - **Action:** Revoke all active sessions
  - **Actor:** soc.analyst@acmecorp.example.com
  - **Reason:** impossible_travel_alert
  - **Sessions Terminated:** sess-attacker-001, sess-morning-002
- **Analysis:** **ATTACKER ACCESS TERMINATED.** Both attacker session (Romania) and legitimate user session revoked as precaution.

**2026-01-10 10:05:05 UTC** ✅ **CONTAINMENT #2: Password Reset**

- **Source:** Identity Provider (SOC Action)
- **Event ID:** evt-auth-006
- **Event:** Forced password reset
- **Details:**
  - **User:** sarah.chen
  - **Action:** Force password reset with MFA re-enrollment
  - **Actor:** soc.analyst@acmecorp.example.com
  - **Reason:** account_compromise_suspected
- **Analysis:** Old password invalidated. Attacker can no longer authenticate even if they attempt.

**2026-01-10 10:05-11:30 UTC** ✅ **FORENSICS & ERADICATION**

- **Source:** SOC Analyst
- **Actions:**
  - Reviewed all mailbox operations during attacker session
  - Identified 47 accessed messages - assessed for sensitivity
  - Confirmed NO messages were exfiltrated (forwarding rule not triggered)
  - Prepared to remove forwarding rule
- **Analysis:** Full scope of compromise determined. Preparing final eradication.

**2026-01-10 11:30:00 UTC** ✅ **ERADICATION: Persistence Removed**

- **Source:** Cloud Mailbox (SOC Action)
- **Event ID:** evt-mailbox-005
- **Event:** Inbox rule deleted
- **Details:**
  - **Operation:** Remove-InboxRule
  - **Rule Name:** "Auto-forward Financial Docs"
  - **Actor:** soc.analyst@acmecorp.example.com
  - **Reason:** malicious_rule_removal
- **Analysis:** **PERSISTENCE ERADICATED.** All attacker foothold removed from environment.

**2026-01-10 11:30:20 UTC** ✅ **VERIFICATION**

- **Source:** SOC Analyst
- **Actions:**
  - Verified no additional inbox rules exist
  - Verified no OAuth application consents
  - Verified no mailbox delegates or forwarding settings
  - Confirmed attacker IP blocked at firewall
  - Confirmed phishing domain blocked at proxy
- **Analysis:** **THREAT FULLY CONTAINED AND ERADICATED.**

**2026-01-10 11:45:12 UTC** ✅ **RECOVERY**

- **Source:** Identity Provider
- **Event ID:** evt-auth-007
- **Event:** User re-authentication
- **Details:**
  - **User:** sarah.chen
  - **Source IP:** 192.168.10.45
  - **Device:** SARAH-LAPTOP-01
  - **Result:** SUCCESS (new password, re-enrolled MFA)
- **Analysis:** User account restored. Sarah back to normal operations.

---

## Summary Statistics

| Metric                        | Value                                            |
| ----------------------------- | ------------------------------------------------ |
| **Attack Duration**           | 3 hours 15 minutes (08:15 - 11:30 UTC)           |
| **Attacker Session Duration** | 1 hour 18 minutes (08:47 - 10:05 UTC)            |
| **Time to Initial Detection** | 1 hour 20 minutes (08:15 email → 09:35 alert)    |
| **Time to Containment**       | 1 hour 50 minutes (08:15 → 10:05 session revoke) |
| **Time to Full Eradication**  | 3 hours 15 minutes (08:15 → 11:30 rule removal)  |
| **Data Accessed by Attacker** | 47 emails                                        |
| **Data Exfiltrated**          | 0 emails (prevented)                             |
| **Affected Accounts**         | 1                                                |
| **IOCs Identified**           | 2 domains, 2 IPs                                 |

---

## Key Evidence Chain

```
Phishing Email (08:15)
       ↓
User Click (08:17) [2 min]
       ↓
Credential Submission (08:18) [1 min]
       ↓
Attacker Login Attempts (08:45) [27 min - attacker received creds, began testing]
       ↓
Successful Compromise (08:47) [2 min]
       ↓
Persistence Created (08:52) [5 min]
       ↓
Data Search & Access (09:05-09:15) [13-23 min]
       ↓
Impossible Travel Detected (09:35) [20 min after legitimate user login]
       ↓
Containment (10:05) [30 min investigation]
       ↓
Eradication (11:30) [1h 25min forensics]
```

---

**Timeline Compiled By:** SOC Analysis Team  
**Date:** January 10, 2026  
**Evidence Sources:** Email Gateway, Web Proxy, Identity Provider, Cloud Mailbox, Endpoint EDR
