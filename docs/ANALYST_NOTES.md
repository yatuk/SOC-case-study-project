# Analyst Notes - Triage Q&A

## INC-2026-010-001: Phishing → Account Compromise

These notes demonstrate SOC analyst critical thinking during alert triage and investigation. Each alert is evaluated with structured questioning to determine validity, severity, and appropriate response.

---

## Alert 1: Phishing Email Clicked - Credential Submission Suspected

### What is the alert and why did it trigger?

**Alert Details:**

- **Detection Rule:** Phishing click correlation (email with IOC → web request to same domain)
- **User:** sarah.chen@acmecorp.example.com
- **Triggering Events:**
  - Email from noreply@micros0ft-secure.info (SPF: FAIL) at 08:15 UTC
  - HTTP POST to login-microsoftonline.verify-account[.]top at 08:18 UTC
- **Evidence:** 3-minute window between email receipt and credential form submission

**Why It Fired:**
The correlation engine linked a phishing email (flagged for typosquatting domain + SPF failure) with a subsequent web request to the same malicious domain, followed by an HTTP POST (indicating form submission, likely credentials).

### What is normal vs. abnormal here?

**Normal Baseline:**

- Sarah regularly accesses legitimate Microsoft services (Office 365, Teams)
- Typical email volume: 50-80 emails/day
- Standard work hours: 07:00-17:00 EST (corporate network)

**Abnormal Indicators:**

- ❌ Typosquatted domain "micros0ft-secure.info" (zero instead of 'o')
- ❌ SPF authentication failure
- ❌ HTTP (not HTTPS) for a "Microsoft login" page
- ❌ HTTP POST containing "email" and "password" fields to non-Microsoft domain

**Verdict:** Highly abnormal. Legitimate Microsoft authentication flows never use HTTP or third-party domains.

### Could this be a false positive? What would disprove it?

**False Positive Scenarios:**

1. Security awareness phishing test (need to check with training team)
2. Legitimate link preview service auto-fetching URLs
3. URL shortener redirecting to benign site

**Evidence to Disprove:**

- ✅ Checked with IT training team: No phishing exercise scheduled for January 10
- ✅ User agent indicates human browser interaction (Chrome), not automated crawler
- ✅ Domain lookup confirms recent registration (Jan 5, 2026) + hosting in known bulletproof hosting ASN

**Conclusion:** True positive. Confidence: HIGH (95%).

### What is the most likely attack path? Alternative scenarios?

**Primary Hypothesis (95% confidence):**

1. Attacker sent credentials phishing email
2. Sarah clicked link and arrived at fake Microsoft login page
3. Sarah entered email + password (now compromised)
4. Attacker will use stolen credentials to access account

**Alternative Scenario (5% confidence):**

- Sarah recognized phishing attempt, visited site to investigate but did not enter credentials
- **Counter-evidence:** HTTP POST with form data suggests submission actually occurred

**Expected Next Steps (if primary hypothesis correct):**

- Attacker login attempt from external IP (likely within 1-2 hours)
- Mailbox enumeration
- Persistence mechanism creation (forwarding rule, OAuth app)
- Data collection/exfiltration

### What is the blast radius?

**Current Impact:**

- **Accounts:** 1 (sarah.chen)
- **Systems:** Cloud email only (no evidence of lateral movement yet)
- **Data:** Credentials compromised; mailbox access pending confirmation

**Potential Impact if Not Contained:**

- Unauthorized access to business emails
- Data exfiltration
- Business email compromise (BEC) using Sarah's account to target finance team
- Installation of persistence mechanisms

**Other Affected Users:**

- Need to check if same phishing campaign targeted other employees

### What is the severity and confidence? Why?

**Severity:** HIGH

- Credential compromise confirmed
- Marketing manager account (moderate privilege)
- Access to confidential business communications

**Confidence:** HIGH (95%)

- Multiple corroborating data points (email, web, POST data)
- IOC match on known-bad domain
- Timeline coherence

### What immediate actions minimize risk?

**Immediate Containment (Next 5 minutes):**

1. ✅ Monitor auth logs for login attempts with Sarah's credentials
2. ✅ Prepare to revoke sessions if unauthorized login occurs
3. ✅ Block phishing domain at proxy/firewall immediately

**Do NOT Reset Password Yet:**

- If we reset password before attacker attempts login, we lose visibility
- Better to monitor for login, then contain when attacker reveals themselves
- **Conditional:** If no attacker login within 2 hours, proceed with password reset as precaution

**Update (09:35 UTC):** Attacker login detected from Romania (89.34.126.77). Proceeding to full containment now.

---

## Alert 2: Impossible Travel Detected

### What is the alert and why did it trigger?

**Alert Details:**

- **Detection Rule:** Impossible travel (logins from distant geos within <1 hour)
- **User:** sarah.chen@acmecorp.example.com
- **Evidence:**
  - Login 1: 08:47 UTC from 89.34.126.77 (Bucharest, Romania) - Unknown Linux device
  - Login 2: 09:32 UTC from 192.168.10.45 (New York, US) - Known device (SARAH-LAPTOP-01)
  - Time delta: 45 minutes
  - Geographic distance: ~8,000 km (impossible to travel in 45 minutes)

**Why It Fired:**
User authenticated from Romania, then from US corporate office 45 minutes later. This implies travel speed of ~10,000 km/h, which is impossible.

### What is normal vs. abnormal?

**Normal:**

- Sarah works from New York office (192.168.10.0/24)
- Occasional VPN use when working from home (known egress IPs)
- Never travels internationally for work

**Abnormal:**

- ❌ Authentication from Romania (no business presence there)
- ❌ Unknown Linux device (Sarah uses Windows laptop)
- ❌ Immediately after credential phishing incident (correlated!)
- ❌ Two failed login attempts before successful login (password guessing)

**Verdict:** Account compromise confirmed.

### Could this be a false positive?

**Possible False Positive Scenarios:**

1. VPN endpoint switching (user connects to Romania VPN endpoint, then switches)
2. Load balancer misattribution (proxy shows wrong geo)
3. Corporate travel not in calendar

**Disproving Evidence:**

- ✅ Sarah confirmed via phone call she is in New York office, NOT traveling
- ✅ Corporate VPN has no Romania endpoints
- ✅ Romania IP (89.34.126.77) is residential ISP, not corporate infrastructure
- ✅ Correlates with prior phishing alert (credentials were stolen)

**Conclusion:** True positive. Confidence: VERY HIGH (99%).

### What is the blast radius?

**Confirmed Compromise:**

- 1 account fully compromised
- Attacker had valid session from 08:47 UTC to 10:05 UTC (78 minutes of access)

**Attacker Actions During Session (from logs):**

1. Mailbox folder enumeration
2. Mailbox rule creation (forwarding to temp-mail[.]io)
3. Email search targeting keywords: "invoice", "contract", "financial"
4. 47 messages accessed

**Data at Risk:**

- 47 business emails accessed (being analyzed for sensitivity)
- Mailbox forwarding rule created (but no emails actually forwarded yet - caught in time)

### What immediate containment steps?

**Executed Actions (10:05 UTC):**

1. ✅ Revoked ALL active sessions for sarah.chen (including attacker)
2. ✅ Forced password reset with MFA re-enrollment
3. ✅ Disabled account temporarily pending investigation
4. ✅ Blocked attacker IP (89.34.126.77) at firewall

**Next Steps:**

- Investigate mailbox rule and remove persistence
- Review accessed emails for data classification
- Determine if data was exfiltrated

---

## Alert 3: Suspicious Mailbox Forwarding Rule Created

### What is the alert?

**Alert Details:**

- **Detection Rule:** External email forwarding rule
- **User:** sarah.chen@acmecorp.example.com
- **Timestamp:** 08:52 UTC (during attacker session)
- **Rule Details:**
  - Name: "Auto-forward Financial Docs"
  - Conditions: Subject contains "invoice", "contract", "financial"
  - Action: Forward to external-archive@temp-mail[.]io
  - Created via: EWS API from 89.34.126.77 (Romania)

### What is normal? What is abnormal?

**Normal:**

- Users occasionally create rules for organizing emails (move to folders)
- Some users set up legitimate forwarding to mobile/personal email (policy violation, but happens)

**Abnormal:**

- ❌ Forwarding to disposable email service (temp-mail[.]io)
- ❌ Targeting financial keywords specifically
- ❌ Created from non-corporate IP (Romania)
- ❌ Created immediately after suspected account compromise
- ❌ User never created forwarding rules before (baseline check)

**Verdict:** Malicious persistence mechanism. Confidence: ABSOLUTE (100%).

### Attack Intent?

**Purpose of This Rule:**

- **Persistence:** Even after password reset, attacker could receive future financial emails
- **Stealth:** Rule is passive; attacker doesn't need to log in again
- **Targeted:** Keywords indicate attacker interested in financial/business data

**Typical Attack Pattern:**
This is a known post-compromise technique (MITRE T1114.003). Attackers use forwarding rules to:

1. Maintain visibility into victim communications
2. Enable follow-up BEC attacks
3. Collect credentials/sensitive info from future emails

### What data is at risk?

**Hypothetical Impact if Not Removed:**

- All future emails with keywords would auto-forward
- Attacker could receive contracts, invoices, payment information
- Could enable business email compromise (BEC) fraud

**Actual Impact:**

- Rule existed for 2 hours 38 minutes (08:52 - 11:30 UTC)
- ✅ Checked mail transport logs: ZERO emails were actually forwarded
- No emails matched the rule conditions during the time window

**Outcome:** No data loss. Caught before any sensitive emails were forwarded.

### Containment Actions?

**Executed (11:30 UTC):**

1. ✅ Deleted malicious inbox rule
2. ✅ Verified no other rules exist for this user
3. ✅ Checked for OAuth app consents (none found)
4. ✅ Reviewed delegate permissions (none found)

**Persistence Fully Eradicated.**

---

## Alert 4: Account Compromise - Multiple Indicators

### What are the combined indicators?

This is a meta-alert aggregating multiple signals:

1. ✅ Phishing link clicked with credential submission
2. ✅ Login from non-corporate IP (Romania)
3. ✅ Impossible travel pattern
4. ✅ Unknown device
5. ✅ Mailbox rule creation (persistence)
6. ✅ Bulk mailbox access (47 messages)

**Risk Score:** 85/100 (CRITICAL)

### What queries should we run for full investigation?

```
# 1. Full timeline for user
GET all events WHERE user = "sarah.chen" AND timestamp BETWEEN 2026-01-10T06:00Z AND 2026-01-10T12:00Z

# 2. Check for other victims of same campaign
GET email WHERE sender_domain = "micros0ft-secure.info"

# 3. Assess if attacker accessed sensitive data
GET mailbox_access WHERE session_id = "sess-attacker-001" | JOIN WITH email_classification

# 4. Look for lateral movement
GET auth WHERE src_ip = "89.34.126.77" AND user != "sarah.chen"
```

### What should be communicated?

**To User (Sarah):**

> "Your account was compromised after clicking a phishing email. We've secured your account with a password reset. No data was lost. Please attend a brief security awareness refresher this week."

**To Management:**

> "Phishing-led account compromise contained with no data loss. One user affected. Incident closed. Three improvement initiatives recommended (email link protection, conditional access policies, FIDO2 MFA)."

**To Security Team:**

> "INC-2026-010-001 successfully contained. IOCs shared for blocking. Detection worked as designed. Recommend implementing preventive controls to stop phishing clicks before they reach users."

---

## Lessons Learned from Triage Process

**What Worked:**

- ✅ Structured questioning helped maintain analytical rigor
- ✅ Correlation of multiple data sources increased confidence
- ✅ Immediate containment prevented data loss

**What to Improve:**

- Automate initial correlation (phishing email + click + auth should auto-generate single high-confidence alert)
- Pre-build response playbooks for one-click containment
- Integrate user calendar/travel data for better impossible travel FP reduction

---

**Analyst:** SOC Tier-2 Team  
**Date:** January 10, 2026
