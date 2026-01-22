# Incident Overview

## Phishing-Led Account Compromise

**Incident ID:** INC-2026-010-001  
**Date:** January 10, 2026  
**Status:** ✅ Contained and Eradicated  
**Severity:** HIGH

---

## Executive Summary

A marketing team member fell victim to a credential phishing attack that led to unauthorized account access and attempted data exfiltration. The SOC successfully detected the compromise within 2 hours and 15 minutes of the initial phishing email, preventing data loss through rapid containment and eradication measures.

---

## What Happened

On the morning of January 10, 2026, user **Sarah Chen** (Marketing Manager) received a sophisticated phishing email impersonating Microsoft. The email urged her to "verify her account" via a malicious link.

**Attack Timeline:**

1. **08:15 UTC** - Phishing email delivered to Sarah's inbox
2. **08:17 UTC** - Sarah clicked the link and visited the fake login page
3. **08:18 UTC** - Sarah entered her credentials on the fraudulent site
4. **08:47 UTC** - Attacker logged in from Romania using stolen credentials (bypassed MFA via real-time phishing proxy)
5. **08:52 UTC** - Attacker created malicious mailbox forwarding rule targeting financial documents
6. **09:15 UTC** - Attacker accessed 47 email messages containing business information
7. **09:35 UTC** - **SOC detected impossible travel alert**
8. **10:05 UTC** - **SOC revoked all sessions and forced password reset**
9. **11:30 UTC** - **SOC removed malicious forwarding rule and confirmed no data exfiltration**

---

## Impact

**Affected Assets:**

- 1 user account (sarah.chen@acmecorp.example.com)
- 47 email messages accessed (no confirmed exfiltration)
- 0 emails actually forwarded (rule created but not triggered before containment)

**Business Impact:**

- Minimal operational disruption (user offline for ~2 hours during remediation)
- No customer data exposed
- No financial loss
- No regulatory notification required

---

## How We Responded

✅ **Detection:** SOC monitoring systems identified impossible travel pattern  
✅ **Containment:** All active sessions revoked within 30 minutes of detection  
✅ **Investigation:** Full timeline reconstructed from logs across email, auth, and mailbox systems  
✅ **Eradication:** Malicious forwarding rule deleted, persistence mechanisms removed  
✅ **Recovery:** User account restored with enhanced MFA enforcement  
✅ **Prevention:** Phishing domain blocked, IOCs shared with security tools

---

## Attack Chain (MITRE ATT&CK)

```
Initial Access (T1566.002)
        ↓
Credential Access (T1589.001)
        ↓
Initial Access (T1078.004) ← Attacker login with stolen creds
        ↓
Persistence (T1114.003) ← Forwarding rule created
        ↓
Discovery (T1087)
        ↓
Collection (T1114.002)
        ↓
[CONTAINMENT] ← SOC response prevented Exfiltration
```

---

## Key Takeaways

**What Worked:**

- Layered logging enabled full attack reconstruction
- SOC impossible travel detection caught the compromise quickly
- Rapid response prevented data exfiltration

**What Needs Improvement:**

- User clicked phishing link despite security awareness training
- No email link protection/sandboxing deployed (would have prevented click)
- MFA was bypassed via real-time phishing proxy (need phishing-resistant MFA like FIDO2)
- No conditional access policy to block logins from high-risk countries

---

## Outcome

This incident demonstrates **effective detective controls and incident response** capabilities, but highlights gaps in **preventive controls**. All recommended improvements have been documented in the Lessons Learned report and assigned to appropriate teams for implementation.

**No customer impact. No data loss. Account secured.**

---

**Report Prepared By:** SOC Analysis Team  
**Last Updated:** January 10, 2026 12:00 UTC
