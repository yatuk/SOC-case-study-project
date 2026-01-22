# Technical Incident Analysis Report

**Generated:** 2026-01-22 13:40:54

## Detection Overview

### Data Sources Analyzed
- Email Gateway Logs
- Identity Provider (IdP) Logs
- M365 Audit Logs
- Proxy/DNS Logs
- EDR Telemetry

### Event Statistics
- Total Events: 400+
- Security Alerts: 20+
- Active Cases: 8
- Affected Users: 8
- Affected Devices: 10+

## MITRE ATT&CK Coverage

### Techniques Detected
- T1566.001 - Phishing: Spearphishing Attachment
- T1566.002 - Phishing: Spearphishing Link
- T1078 - Valid Accounts
- T1528 - Steal Application Access Token
- T1098 - Account Manipulation
- T1114.002 - Remote Email Collection
- T1059.001 - PowerShell
- T1547.001 - Registry Run Keys
- T1071.001 - Web Protocols (C2)
- T1567.002 - Exfil Over Cloud Storage

## Indicators of Compromise

### Malicious Domains
- secure-login-verify.tk (phishing)
- cdn-update.cf (C2)
- invoice-payment.cf (BEC)

### Suspicious IPs
- 185.220.101.45 (Romania)
- 192.42.116.180 (Russia)
- 45.142.213.91 (China)

## Investigation Recommendations

1. **Endpoint Forensics** - Full memory and disk analysis on infected devices
2. **Network Analysis** - Review all C2 beacon traffic patterns
3. **Email Audit** - Trace all emails from compromised accounts
4. **Access Review** - Audit all admin role assignments

---
*This is a synthetic dataset for demonstration purposes.*
