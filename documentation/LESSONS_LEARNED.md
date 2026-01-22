# Lessons Learned

## INC-2026-010-001: Phishing → Account Compromise

**Incident Date:** January 10, 2026  
**Lessons Learned Meeting:** January 15, 2026  
**Participants:** SOC Team, Email Security, IAM Team, Security Management, IT Training

---

## Incident Summary

A credential phishing attack led to account compromise of one marketing team member. The attacker accessed the mailbox, created a forwarding rule for persistence, and searched for financial documents. SOC detected the compromise via impossible travel within 2 hours 15 minutes and successfully contained the threat with no data loss.

**Outcome:** ✅ Successful containment, no data exfiltrated

---

## What Went Well ✅

### 1. Detection Capabilities

**Observation:** SOC monitoring detected impossible travel pattern within 2 hours of initial phishing email.

**Why It Worked:**

- Impossible travel detection rule was properly tuned
- Log aggregation across email, web, auth, and mailbox sources enabled correlation
- Automated alerting routed high-severity alerts to Tier-2 immediately

**Evidence:**

- Alert generated at 09:35 UTC (1 hour 20 minutes after initial compromise at 08:47 UTC)
- Correlation engine successfully linked phishing email → click → authentication → mailbox activity

**Sustain:** Continue investment in behavioral analytics and correlation rules.

---

### 2. Incident Response Process

**Observation:** Containment actions (session revocation, password reset) executed within 30 minutes of alert.

**Why It Worked:**

- Well-defined Account Compromise playbook provided clear steps
- Tier-2 analysts had appropriate permissions to revoke sessions and force password resets
- User contact information was readily available for out-of-band verification

**Evidence:**

- Alert at 09:35 UTC → Investigation complete at 10:05 UTC → Full containment at 10:05 UTC
- 30-minute response time from alert to containment

**Sustain:** Maintain quarterly playbook review and tabletop exercises.

---

### 3. Log Retention and Forensics

**Observation:** Complete attack timeline reconstructed from logs spanning email gateway, web proxy, identity provider, mailbox audit, and endpoint.

**Why It Worked:**

- Centralized SIEM with 90-day retention for all security-relevant logs
- Cloud mailbox auditing enabled (captures all rule creation, searches, and access)
- Proper timestamp synchronization across systems

**Evidence:**

- Full chain of custody from phishing email delivery (08:15 UTC) through eradication (11:30 UTC)
- 15 correlated events across 5 log sources

**Sustain:** Continue current log retention policies. Consider extending retention to 180 days for compliance.

---

### 4. No Data Loss

**Observation:** Despite attacker creating forwarding rule and accessing 47 messages, no data was exfiltrated.

**Why It Worked:**

- Rapid detection and containment prevented forwarding rule from triggering
- Mail transport logs confirmed zero emails were forwarded
- Mailbox rule was deleted before any matching emails were sent

**Evidence:**

- Forwarding rule active from 08:52 - 11:30 UTC (2h 38min)
- Mail transport logs queried: 0 messages sent to external-archive@temp-mail[.]io
- No emails matching rule conditions sent during active period

**Sustain:** Maintain mailbox audit logging and mail transport monitoring.

---

## What Needs Improvement ❌

### 1. User Clicked Phishing Link

**Gap Identified:** User clicked malicious link despite ongoing security awareness training.

**Root Cause:**

- Phishing email was well-crafted (typosquatting domain,legitimate-looking template, urgency)
- No technical controls to prevent/warn user before click (email link protection/sandboxing not deployed)
- Last security awareness training was 6 months ago (may have been forgotten)

**Impact:**

- Credentials compromised
- Required 3+ hours of SOC investigation and remediation time
- User productivity disrupted

**Recommendations:**

| Priority  | Action                                                                                                         | Owner               | Timeline |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------------- | -------- |
| 🔴 HIGH   | Deploy email link rewriting/protection service to detonate suspicious URLs in sandbox before user reaches them | Email Security Team | 7 days   |
| 🔴 HIGH   | Conduct targeted phishing simulation for marketing team with immediate follow-up training for clickers         | IT Training         | 14 days  |
| 🟡 MEDIUM | Implement email banner warnings for external senders                                                           | Email Security Team | 30 days  |
| 🟡 MEDIUM | Increase security awareness training frequency frombiannual to quarterly                                       | IT Training         | Ongoing  |

**Tracking:** Ticket #SEC-2026-001

---

### 2. MFA Was Bypassed

**Gap Identified:** Attacker bypassed TOTP-based MFA using real-time phishing proxy (adversary-in-the-middle).

**Root Cause:**

- TOTP MFA is susceptible to real-time phishing (attacker relays MFA prompt to victim)
- No conditional access policy to block logins from high-risk locations (Romania)
- Current MFA is "something you know" (password) + "something you have" (phone), both compromised in real-time attack

**Impact:**

- MFA did not prevent account compromise
- False sense of security reduced urgency of other controls

**Recommendations:**

| Priority | Action                                                                                       | Owner    | Timeline  |
| -------- | -------------------------------------------------------------------------------------------- | -------- | --------- |
| 🔴 HIGH  | Pilot FIDO2 hardware security keys for high-risk users (executives, finance, IT admins)      | IAM Team | 30 days   |
| 🔴 HIGH  | Implement conditional access policy to block logins from countries without business presence | IAM Team | 14 days   |
| 🟢 LOW   | Long-term: Migrate all users to hardware-based MFA (FIDO2)                                   | IAM Team | 12 months |

**Tracking:** Ticket #SEC-2026-002

---

### 3. No Email Link Protection

**Gap Identified:** Email gateway allowed phishing link to pass through without sandboxing or rewriting.

**Root Cause:**

- Email security stack relies purely on signature/reputation-based detection
- No link rewriting deployed (would force sandbox detonation before user click)
- SPF failures logged but not acted upon (email still delivered)

**Impact:**

- Malicious email delivered to inbox despite clear indicators (SPF: FAIL, typosquatting)
- User had opportunity to click without intermediate warning

**Recommendations:**

| Priority  | Action                                                                                 | Owner               | Timeline |
| --------- | -------------------------------------------------------------------------------------- | ------------------- | -------- |
| 🔴 HIGH   | Deploy email link protection (rewrite all URLs to force sandbox analysis before click) | Email Security Team | 7 days   |
| 🔴 HIGH   | Implement DMARC policy with "reject" action for corporate domain                       | Email Security Team | 30 days  |
| 🟡 MEDIUM | Tune email gateway to quarantine (not deliver) emails with SPF:FAIL                    | Email Security Team | 14 days  |

**Tracking:** Ticket #SEC-2026-003

---

### 4. No Alert on Bulk Mailbox Access

**Gap Identified:** Attacker accessed 47 messages with no alert until impossible travel triggered.

**Root Cause:**

- No detection rule for bulk mailbox access from external IPs
- Mailbox operations are logged but not actively monitored
- Threshold for "bulk" was undefined

**Impact:**

- Attacker had 20+ minutes of undetected access time (08:47 login - 09:35 alert)
- Could have exfiltrated data if not caught by impossible travel rule

**Recommendations:**

| Priority  | Action                                                                                                                 | Owner    | Timeline |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| 🟡 MEDIUM | Create detection rule: Alert when >20 messages accessed in 1 hour from non-corporate IP                                | SOC Team | 14 days  |
| 🟡 MEDIUM | Create detection rule: Alert on mailbox searches containing sensitive keywords (password, confidential, invoice, etc.) | SOC Team | 14 days  |
| 🟢 LOW    | Baseline normal mailbox access patterns per user for anomaly detection                                                 | SOC Team | 90 days  |

**Tracking:** Ticket #SEC-2026-004

---

### 5. No Conditional Access for Mailbox Operations

**Gap Identified:** Attacker could create inbox rules from external, untrusted network.

**Root Cause:**

- No conditional access policy restricting mailbox configuration changes (rule creation, delegation, forwarding settings)
- EWS API accessible from any internet IP without additional authentication

**Impact:**

- Persistence mechanism created from attacker-controlled infrastructure
- No step-up authentication or additional verification required

**Recommendations:**

| Priority  | Action                                                                                                     | Owner    | Timeline |
| --------- | ---------------------------------------------------------------------------------------------------------- | -------- | -------- |
| 🔴 HIGH   | Implement conditional access: Require corporate network or trusted IP for inbox rule creation/modification | IAM Team | 30 days  |
| 🟡 MEDIUM | Consider blocking legacy EWS API usage, enforce modern auth (OAuth with limited scopes)                    | IAM Team | 90 days  |

**Tracking:** Ticket #SEC-2026-005

---

## Gaps in Detection

| Gap                      | Current State                                      | Desired State                                              | Priority  |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------------------- | --------- |
| Phishing email detection | Signature-based, SPF/DKIM checked but not enforced | Link sandboxing, DMARC reject, content analysis            | 🔴 HIGH   |
| MFA bypass detection     | No detection (MFA assumed sufficient)              | Detect MFA followed by unusual activity, impossible travel | 🟡 MEDIUM |
| Bulk mailbox access      | Logged but not alerted                             | Alert on threshold breach, non-corporate IP access         | 🟡 MEDIUM |
| Mailbox rule creation    | Alert on external forwarding only                  | Alert on all rule creation from non-corporate networks     | 🟡 MEDIUM |

---

## Gaps in Prevention

| Gap                    | Current State     | Desired State                              | Priority  |
| ---------------------- | ----------------- | ------------------------------------------ | --------- |
| Email link protection  | None              | All links rewritten/sandboxed before click | 🔴 HIGH   |
| Phishing-resistant MFA | TOTP (bypassable) | FIDO2 hardware keys (phishing-proof)       | 🔴 HIGH   |
| Geo-based blocking     | None              | Block logins from non-business countries   | 🔴 HIGH   |
| User awareness         | Biannual training | Quarterly training + simulations           | 🟡 MEDIUM |

---

## Metrics and KPIs

| Metric              | This Incident            | Target             | Met? |
| ------------------- | ------------------------ | ------------------ | ---- |
| Time to Detect      | 1h 20min                 | <2 hours           | ✅   |
| Time to Contain     | 1h 50min                 | <4 hours           | ✅   |
| Time to Eradicate   | 3h 15min                 | <8 hours           | ✅   |
| Data Exfiltrated    | 0 emails                 | 0                  | ✅   |
| False Positive Rate | 0% (all alerts valid)    | <10%               | ✅   |
| User Click Rate     | 1/1 (100% of recipients) | <5% in simulations | ❌   |
| MFA Bypass Rate     | 1/1 (100%)               | 0%                 | ❌   |

---

## Action Plan Summary

### Immediate (Next 7 Days)

1. ✅ Deploy email link rewriting/protection
2. ✅ Block attacker IPs and domains at perimeter
3. ✅ Create detection rule for bulk mailbox access

### Short-term (Next 30 Days)

1. ⏳ Pilot FIDO2 hardware keys for executives
2. ⏳ Implement conditional access for high-risk countries
3. ⏳ Conduct targeted phishing simulation for marketing team
4. ⏳ Implement DMARC reject policy

### Long-term (Next 90+ Days)

1. 🔄 Migrate all users to FIDO2 MFA
2. 🔄 Deploy EDR to all endpoints
3. 🔄 Implement SOAR platform for automated playbook execution
4. 🔄 Build user behavior baselines for anomaly detection

---

## Key Takeaways

1. **Defense in Depth Works:** Despite phishing success, layered logging and detection prevented data loss.
2. **Detection ≠ Prevention:** We need to shift left - prevent phishing clicks, not just detect compromise.
3. **MFA Isn't Enough:** TOTP can be bypassed; phishing-resistant MFA (FIDO2) is critical.
4. **Rapid Response Matters:** 30-minute containment time saved the day; maintain this capability.
5. **User Training Never Ends:** Security awareness must be continuous, not periodic checkboxes.

---

## Follow-up Actions

- [ ] Schedule monthly check-ins to track remediation progress (Tickets #SEC-2026-001 through 005)
- [ ] Present findings to executive team in next security steering committee
- [ ] Update IR playbooks based on lessons learned
- [ ] Share anonymized timeline with industry peers (ISAC)
- [ ] Schedule follow-up tabletop exercise in 3 months to test improvements

---

**Report Compiled By:** Security Management  
**Approvals:** CISO, Director of IT, SOC Manager  
**Next Review:** April 2026 (Quarterly)
