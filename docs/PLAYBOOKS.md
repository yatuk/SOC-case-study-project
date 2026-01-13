# Playbooks Documentation

## Incident Response Runbooks

This document provides quick-reference versions of the incident response playbooks in markdown format for easy reading. Full YAML playbooks with structured data are available in `/src/playbooks/`.

---

## Table of Contents

1. [Account Compromise Response](#account-compromise-response)
2. [Phishing Email Response](#phishing-email-response)
3. [Mailbox Rule Investigation](#mailbox-rule-investigation)

---

## Account Compromise Response

**Trigger:** High-confidence alert indicating unauthorized account access  
**Owner:** SOC Tier-2 / Incident Response Team

### Workflow

#### 1. Validate Alert (5-10 min) - Tier-1 Analyst

- Review alert evidence and confidence score
- Check for false positive indicators (VPN, authorized travel, new device provisioning)
- Confirm abnormal behavior exists
- Escalate to Tier-2 if true positive

#### 2. Revoke Active Sessions (5 min) - Tier-2 Analyst

- Access identity provider admin console
- Revoke ALL active sessions for affected user
- Document session IDs before revocation
- Notify user via phone (not email - compromised!)

**Commands:**

```powershell
Revoke-UserSession -User sarah.chen@acmecorp.example.com -All
Get-UserSession -User sarah.chen@acmecorp.example.com | Export-Csv sessions_backup.csv
```

#### 3. Force Password Reset (3 min) - Tier-2 Analyst

- Force immediate password reset
- Require MFA re-registration if MFA bypass suspected
- Temporarily disable account if user unavailable
- Set conditional access enforcement flag

**Commands:**

```powershell
Set-UserPasswordReset -User sarah.chen@acmecorp.example.com -Force -RequireMFA
```

#### 4. Review Account Activity (20-30 min) - Tier-2 Analyst

- Pull audit logs for all actions during suspicious sessions
- Identify attacker IPs and devices
- Create timeline of attacker actions
- Determine blast radius (what was accessed/modified/exfiltrated)

**Investigation Queries:**

- All mailbox operations for compromised session IDs
- All file access events during compromise window
- Search for data exfiltration indicators

#### 5. Remove Persistence (15-20 min) - Security Engineer

- Check and remove malicious mailbox rules
- Review and revoke suspicious OAuth application consents
- Check for forwarding rules, delegates, shared access
- Scan for backdoor accounts or service principals

**Commands:**

```powershell
Get-InboxRule -Mailbox user@company.com | Where-Object {$_.ForwardTo -ne $null}
Remove-InboxRule -Identity 'Malicious Rule' -Confirm:$false
Get-OAuth2PermissionGrants -User user@company.com
```

#### 6. Restore Account (10-15 min) - Tier-2 / Help Desk

- Verify user identity out-of-band (phone, in-person)
- Assist with password reset and MFA re-enrollment
- Re-enable account with enhanced security
- Monitor account for 48-72 hours post-recovery

#### 7. Document Incident (30-45 min) - Incident Commander

- Create incident report (timeline, impact, actions)
- Document IOCs for threat intelligence
- Assess data sensitivity of accessed information
- Determine if regulatory notification required

#### 8. Lessons Learned (1-2 hours) - Security Management

- Schedule meeting within 5 business days
- Identify gaps in controls
- Create remediation tasks with ownership
- Update playbooks based on findings

### Escalation Triggers

- Data exfiltration of classified information
- Privileged/admin account compromised
- Lateral movement detected
- Suspected APT/nation-state activity

---

## Phishing Email Response

**Trigger:** Reported or detected phishing email  
**Owner:** SOC Tier-1 / Email Security Team

### Workflow

#### 1. Collect Artifacts (5 min) - Tier-1 Analyst

- Obtain full email (headers + body + attachments)
- Extract sender, subject, URLs, hashes
- Check email gateway for delivery count
- Determine if targeted or mass campaign

#### 2. Analyze Email (10-15 min) - Email Security

- Review headers (SPF, DKIM, DMARC)
- Check for domain spoofing/typosquatting
- Detonate URLs in sandbox
- Scan attachments
- Determine malicious intent

**Tools:** VirusTotal, URLhaus, ANY.RUN, Joe Sandbox

#### 3. Block IOCs (10 min) - Network/Email Team

- Add domains to proxy/firewall blocklist
- Add sender to email gateway blocklist
- Add file hashes to EDR blocklist
- Delete emails from all mailboxes if possible

**Commands:**

```powershell
Add-ProxyBlocklist -Domain phishing-domain.com
Add-EmailBlockSender -Address attacker@evil.com
Search-Mailbox -All -SearchQuery 'subject:Urgent' -DeleteContent
```

#### 4. Identify Affected Users (15-20 min) - Tier-1/2 Analyst

- Query all recipients of phishing email
- Check proxy logs for users who clicked
- Review auth logs for credential submissions
- Create risk-tiered user list

#### 5. User Remediation (Variable) - Tier-2 / IR

- **Clicked only:** Send security awareness reminder
- **Submitted credentials:** Force password reset, revoke sessions (Account Compromise playbook)
- Monitor all affected users for 48 hours

#### 6. Notify Stakeholders (15-30 min) - Communications

- Send internal alert if widespread
- Notify security awareness team
- Update executives if high-profile targets
- Report to external entities (takedown requests)

#### 7. Take Down Infrastructure (20-30 min) - Threat Intel

- Report domain to hosting provider
- Submit to Google Safe Browsing, PhishTank
- Coordinate with threat intel partners
- Monitor for related campaigns

#### 8. Document (20 min) - Tier-1 Lead

- Create incident report
- Update phishing tracker
- Document lessons learned
- Update email filters

### Escalation Triggers

- Mass campaign (>50 recipients)
- Executive/high-value target
- Credential theft confirmed
- Malware delivery (ransomware)

---

## Mailbox Rule Investigation

**Trigger:** Alert for suspicious inbox rule creation  
**Owner:** SOC Tier-2 / Email Security Team

### Workflow

#### 1. Verify Rule (5 min) - Tier-2 Analyst

- Confirm rule still exists
- Retrieve full details (name, conditions, actions)
- Identify who/what created it
- Check if active or disabled

**Commands:**

```powershell
Get-InboxRule -Mailbox user@company.com
Get-MailboxAuditLog -Mailbox user@company.com -Operations New-InboxRule
```

#### 2. Assess Legitimacy (10 min) - Tier-2 Analyst

- Review conditions and actions
- Check if destination is external
- Match against known attack patterns
- Contact user to verify intent

**IOC Indicators:**

- Forwarding to external domain
- Keywords: invoice, password, confidential
- Created from unusual IP
- Created after suspicious login

#### 3. Disable Malicious Rule (5 min) - Tier-2 Analyst

- Delete rule if confirmed malicious
- Backup rule config before deletion
- Check for additional rules
- Follow Account Compromise playbook if needed

**Commands:**

```powershell
Export-InboxRule -Mailbox user@company.com -RuleName 'Rule' > backup.json
Remove-InboxRule -Identity 'Rule Name' -Confirm:$false
```

#### 4. Determine Impact (15-20 min) - Email Security

- Identify emails matching rule conditions
- Check if emails were forwarded/moved
- Assess sensitivity of affected emails
- Verify access at destination

#### 5. Root Cause Analysis (15 min) - Tier-2 Analyst

- Determine how access was gained
- Review authentication timeline
- Check for compromise indicators
- Assess if part of larger campaign

#### 6. Eradicate Access (10-15 min) - IR Team

- Revoke sessions
- Force password reset
- Check for other persistence (OAuth, delegates)
- Remove all malicious configurations

#### 7. Restore Operations (10 min) - Tier-2 Analyst

- Verify legitimate rules intact
- Re-enable account with monitoring
- Set up enhanced alerting
- Notify user of incident

#### 8. Document Findings (20-30 min) - Tier-2 Lead

- Create incident report
- Document IOCs
- Provide detection improvements
- Update detection rules

### Common Malicious Patterns

**Forwarding Rules:**

- ForwardTo external email
- RedirectTo attacker address
- ForwardAsAttachmentTo for exfil

**Stealth Techniques:**

- Mark as read (prevent user notice)
- Move to subfolder (hide)
- Delete after forward (cover tracks)

**Targeted Conditions:**

- Subject: invoice, payment, contract, confidential
- From: executives, finance team
- Has attachments

### Prevention Controls

- Alert on all external forwarding
- Conditional access for rule creation
- MFA for mailbox changes
- User awareness training
- Regular inbox rule audits

---

## Quick Reference - Response Times

| Playbook           | Average Time | Components                                                                                 |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------ |
| Account Compromise | 60-90 min    | Containment: 10 min, Investigation: 30 min, Eradication: 20 min, Documentation: 30 min     |
| Phishing Response  | 40-60 min    | Analysis: 15 min, Blocking: 10 min, User Remediation: 15 min, Documentation: 20 min        |
| Mailbox Rule       | 45-60 min    | Verification: 5 min, Impact Assessment: 20 min, Eradication: 15 min, Documentation: 20 min |

---

**Playbook Documentation Maintained By:** Security Operations Team  
**Last Updated:** January 2026  
**Review Frequency:** Quarterly
