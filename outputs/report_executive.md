# Executive Incident Report
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
- **Impact:** One user account compromised, 4 critical security alerts generated
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
**Date:** 2026-01-13
