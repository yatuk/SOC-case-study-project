# MITRE ATT&CK Mapping

## INC-2026-010-001: Phishing → Account Compromise

This document maps observed attacker behaviors to MITRE ATT&CK tactics and techniques with specific evidence from the incident timeline.

---

## Attack Kill Chain Overview

| Phase | MITRE Tactic      | Techniques Used | Status           |
| ----- | ----------------- | --------------- | ---------------- |
| 1     | Initial Access    | T1566.002       | ✅ Successful    |
| 2     | Credential Access | T1589.001       | ✅ Successful    |
| 3     | Initial Access    | T1078.004       | ✅ Successful    |
| 4     | Defense Evasion   | T1078           | ✅ Successful    |
| 5     | Persistence       | T1114.003       | ✅ Successful    |
| 6     | Discovery         | T1087           | ✅ Successful    |
| 7     | Collection        | T1114.002       | ✅ Successful    |
| 8     | Exfiltration      | T1048           | ❌ **PREVENTED** |

---

## Detailed Technique Mapping

### Tactic: Initial Access

#### T1566.002 - Phishing: Spearphishing Link

**Description:** Adversaries may send spearphishing emails with a malicious link to gain access to victim systems.

**Evidence:**

- **Event IDs:** evt-email-001
- **Timestamp:** 2026-01-10 08:15:23 UTC
- **Details:**
  - Phishing email sent from noreply@micros0ft-secure.info
  - Email subject: "Urgent: Verify your account"
  - Malicious URL: hxxp://login-microsoftonline.verify-account[.]top
  - SPF: FAIL indicates sender spoofing
- **Log Sources:** Email Gateway logs
- **Justification:** Attacker used typosquatting domain to impersonate Microsoft and deliver malicious link. Classic spearphishing technique targeting cloud credentials.

---

### Tactic: Credential Access

#### T1589.001 - Credentials from Password Stores

**Description:** Adversaries may search for common password storage locations (including phishing forms) to obtain user credentials.

**Evidence:**

- **Event IDs:** evt-web-002
- **Timestamp:** 2026-01-10 08:18:12 UTC
- **Details:**
  - HTTP POST to hxxp://login-microsoftonline.verify-account[.]top/auth
  - POST data contained "email" and "password" fields
  - User submitted credentials to attacker-controlled form
  - Real-time phishing proxy likely used to capture MFA as well
- **Log Sources:** Web Proxy logs
- **Justification:** User entered credentials into fake login form, which were captured by attacker. This technique harvests credentials directly from user input on fraudulent pages.

---

### Tactic: Initial Access (Post-Credential Theft)

#### T1078.004 - Valid Accounts: Cloud Accounts

**Description:** Adversaries may obtain and abuse credentials of cloud accounts to gain initial access.

**Evidence:**

- **Event IDs:** evt-auth-003
- **Timestamp:** 2026-01-10 08:47:18 UTC
- **Details:**
  - Successful login from 89.34.126.77 (Romania)
  - Username: sarah.chen@acmecorp.example.com
  - Device: Unknown Linux/Firefox
  - MFA: TOTP (bypassed via real-time phishing)
  - Session ID: sess-attacker-001
- **Log Sources:** Identity Provider logs
- **Justification:** Attacker used stolen credentials to authenticate to cloud email account. MFA was bypassed using real-time phishing proxy (adversary-in-the-middle). Valid authentication granted full access to cloud resources.

---

### Tactic: Defense Evasion

#### T1078 - Valid Accounts

**Description:** Adversaries may use valid accounts to evade detection and maintain persistence.

**Evidence:**

- **Event IDs:** evt-auth-003, evt-mailbox-001 through evt-mailbox-004
- **Timestamp:** 2026-01-10 08:47:18 - 10:05:00 UTC (entire attacker session)
- **Details:**
  - Attacker used legitimate authentication mechanisms
  - All actions performed using valid session (sess-attacker-001)
  - No malware or exploit code needed
  - Actions blend with normal user behavior from logging perspective
- **Log Sources:** Identity Provider, Cloud Mailbox audit logs
- **Justification:** By using stolen but valid credentials, attacker's actions appear as legitimate user activity. This evades signature-based detection and allows attacker to "live off the land" using built-in features (EWS API, inbox rules).

---

### Tactic: Persistence

#### T1114.003 - Email Collection: Email Forwarding Rule

**Description:** Adversaries may setup email forwarding rules to maintain access to victim emails.

**Evidence:**

- **Event IDs:** evt-mailbox-002
- **Timestamp:** 2026-01-10 08:52:30 UTC
- **Details:**
  - Inbox rule created: "Auto-forward Financial Docs"
  - Rule conditions: SubjectContainsWords: invoice, contract, financial
  - Rule action: ForwardTo: external-archive@temp-mail[.]io (external disposable email)
  - Created via EWS API from 89.34.126.77
- **Log Sources:** Cloud Mailbox audit logs (New-InboxRule operation)
- **Justification:** Attacker created email forwarding rule to maintain access to sensitive communications even after password reset. This persistence mechanism is passive and difficult to detect without mailbox auditing. Targeted keywords indicate specific interest in financial business information.

**Impact:** If not detected, rule would forward all future emails matching conditions to attacker-controlled address indefinitely.

---

### Tactic: Discovery

#### T1087 - Account Discovery

**Description:** Adversaries may attempt to get information about user accounts and their permissions.

**Evidence:**

- **Event IDs:** evt-mailbox-001
- **Timestamp:** 2026-01-10 08:48:05 UTC
- **Details:**
  - Operation: ListFolders
  - Result: 12 mailbox folders enumerated (Inbox, Sent, Drafts, etc.)
  - Client: EWS API
  - Source IP: 89.34.126.77
- **Log Sources:** Cloud Mailbox audit logs
- **Justification:** Attacker enumerated mailbox structure to understand available data and plan collection strategy. This reconnaissance helps attacker identify valuable targets for data theft.

---

### Tactic: Collection

#### T1114.002 - Email Collection: Remote Email Collection

**Description:** Adversaries may target email to collect sensitive information remotely.

**Evidence:**

- **Event IDs:** evt-mailbox-003, evt-mailbox-004
- **Timestamps:**
  - 2026-01-10 09:05:12 UTC (search)
  - 2026-01-10 09:15:45 UTC (access)
- **Details:**
  - **Search operation:**
    - Query: "subject:contract OR subject:financial OR subject:invoice"
    - Results: 47 messages matched
  - **Access operation:**
    - Operation: MailItemsAccessed
    - Count: 47 messages
    - All messages from search results were opened/read
- **Log Sources:** Cloud Mailbox audit logs (SearchMailbox, MailItemsAccessed)
- **Justification:** Attacker systematically searched for high-value business documents using targeted keywords, then accessed all matching messages. This demonstrates intent to collect sensitive business information (financial records, contracts). Collection was remote via cloud API, not requiring malware or physical access.

---

### Tactic: Exfiltration

#### T1048 - Exfiltration Over Alternative Protocol

**Description:** Adversaries may steal data by exfiltrating it over a different protocol than the existing command and control channel.

**Evidence:**

- ❌ **ATTEMPTED BUT PREVENTED**
- **Event IDs:** evt-mailbox-002 (forwarding rule), evt-mailbox-004 (message access)
- **Timestamp:** 2026-01-10 08:52 - 11:30 UTC (rule active window)
- **Details:**
  - Forwarding rule established to exfiltrate via email (alternative to direct download)
  - 47 messages accessed (read) by attacker
  - ✅ **Containment successful:** Mail transport logs confirm ZERO emails actually forwarded
  - Rule deleted at 11:30 UTC before any trigger conditions were met
- **Log Sources:** Cloud Mailbox audit logs, Mail transport logs
- **Justification:** Attacker intended to exfiltrate data by forwarding sensitive emails to external address. This uses email protocol as exfiltration channel (alternative to HTTP download, cloud sync, etc.). **Technique was prepared but not successfully executed due to SOC detection and response.**

**Outcome:** **NO DATA LOSS. Exfiltration prevented by rapid containment.**

---

## Tactics Not Observed

The following common tactics were **NOT** observed in this incident:

| Tactic               | Reason Not Observed                                                                 |
| -------------------- | ----------------------------------------------------------------------------------- |
| Execution            | No malware or scripts executed; attacker used native APIs only                      |
| Privilege Escalation | Attacker accessed only the compromised user's resources (no escalation attempted)   |
| Lateral Movement     | Single account compromised; no movement to other accounts or systems                |
| Command and Control  | Attacker used legitimate web services (EWS API, email); no custom C2 infrastructure |
| Impact               | Destructive actions were not performed (no ransomware, wipers, etc.)                |

---

## ATT&CK Navigator Layer

For visualization in MITRE ATT&CK Navigator:

```json
{
  "domain": "enterprise-attack",
  "name": "INC-2026-010-001 Phishing Account Compromise",
  "versions": {
    "attack": "14",
    "navigator": "4.9"
  },
  "techniques": [
    {
      "techniqueID": "T1566.002",
      "tactic": "initial-access",
      "score": 100,
      "color": "#ff6666",
      "comment": "Phishing email delivered with malicious link"
    },
    {
      "techniqueID": "T1589.001",
      "tactic": "credential-access",
      "score": 100,
      "color": "#ff6666",
      "comment": "Credentials harvested via fake login page"
    },
    {
      "techniqueID": "T1078.004",
      "tactic": "initial-access",
      "score": 100,
      "color": "#ff6666",
      "comment": "Attacker authenticated using stolen cloud credentials"
    },
    {
      "techniqueID": "T1078",
      "tactic": "defense-evasion",
      "score": 100,
      "color": "#ff6666",
      "comment": "Valid account used to blend with normal activity"
    },
    {
      "techniqueID": "T1114.003",
      "tactic": "persistence",
      "score": 100,
      "color": "#ff6666",
      "comment": "Email forwarding rule created for persistence"
    },
    {
      "techniqueID": "T1087",
      "tactic": "discovery",
      "score": 100,
      "color": "#ff6666",
      "comment": "Mailbox folders enumerated"
    },
    {
      "techniqueID": "T1114.002",
      "tactic": "collection",
      "score": 100,
      "color": "#ff6666",
      "comment": "47 emails collected targeting financial keywords"
    },
    {
      "techniqueID": "T1048",
      "tactic": "exfiltration",
      "score": 50,
      "color": "#ffff66",
      "comment": "ATTEMPTED - Email forwarding for exfiltration, prevented by SOC"
    }
  ]
}
```

---

## Detection Coverage Analysis

| Technique | Detection Method            | Coverage     | Notes                                                                          |
| --------- | --------------------------- | ------------ | ------------------------------------------------------------------------------ |
| T1566.002 | Email gateway filtering     | ❌ Missed    | Email cleared filters; recommend improving SPF/DKIM enforcement                |
| T1589.001 | Web proxy + correlation     | ✅ Detected  | Post-click detection via correlation; recommend link rewriting for prevention  |
| T1078.004 | Impossible travel detection | ✅ Detected  | Successful detection triggered containment                                     |
| T1078     | User behavior analytics     | ⚠️ Partial   | Valid credentials are difficult to distinguish; context-based detection needed |
| T1114.003 | Mailbox audit logging       | ✅ Detected  | External forwarding rule flagged immediately                                   |
| T1087     | Mailbox audit logging       | ✅ Logged    | Captured in audit logs; no specific alert (low priority)                       |
| T1114.002 | Mailbox audit logging       | ✅ Logged    | Captured in audit logs; bulk access should trigger alert in future             |
| T1048     | Mail transport logs         | ✅ Prevented | Monitoring confirmed no data exfil occurred                                    |

---

## Recommendations to Improve Coverage

1. **T1566.002 Prevention:**

   - Deploy email link rewriting/sandboxing
   - Enforce DMARC reject policy for corporate domain
   - Train users to report phishing (make it easy with "Report Phishing" button)

2. **T1078.004 Prevention:**

   - Implement FIDO2 hardware keys (phishing-resistant MFA)
   - Deploy conditional access policies (block high-risk countries, require device compliance)

3. **T1114.002 Detection:**
   - Create alert for bulk mailbox access (threshold: >20 messages in 1 hour from non-internal IP)
   - Alert on mailbox searches containing sensitive keywords

---

**MITRE Mapping Compiled By:** SOC Threat Intelligence Team  
**Date:** January 10, 2026  
**Reference:** MITRE ATT&CK v14 (Enterprise)
