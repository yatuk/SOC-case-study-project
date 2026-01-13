# Design Assumptions and Decisions

## SOC Case Study Project

This document records key assumptions and design decisions made during the creation of this SOC case-study project.

---

## Data Design

### 1. Synthetic Logs vs. Real Data

**Decision:** Use synthetic but realistic log data  
**Reasoning:**

- No real credentials or PII required
- Full control over scenario narrative
- Reproducible and shareable (no data privacy concerns)
- Demonstrates understanding of real log formats without legal/compliance issues

**Trade-off:** Synthetic data may not capture all edge cases of production environments, but provides sufficient fidelity for demonstration purposes.

---

### 2. Log Formats

**Assumption:** Mix of industry-standard formats to demonstrate versatility  
**Chosen Formats:**

- **Email Gateway:** CSV (common in commercial products like Proofpoint, Mimecast)
- **Identity Provider:** JSON Lines (Office 365, Okta, Azure AD style)
- **Web Proxy:** Apache Common Log Format Extended (Squid, Apache, nginx)
- **Cloud Mailbox:** JSON Lines (Office 365 Unified Audit Log style)
- **Endpoint EDR:** JSON Lines (Sysmon, CrowdStrike, SentinelOne style)

**Reasoning:** Analysts often work with heterogeneous log sources. Demonstrating ability to ingest and normalize different formats shows real-world skill.

---

### 3. Timestamp Synchronization

**Assumption:** All logs use UTC and are properly synchronized  
**Reasoning:**

- UTC is standard for global operations and forensic analysis
- Simplified correlation logic (no timezone conversion needed)
- Real-world best practice

**Note:** In production, timestamp drift and timezone issues are common. Acknowledged limitation for simplicity.

---

### 4. GeoIP Mapping

**Decision:** Use hardcoded geographic mappings instead of real GeoIP database  
**Reasoning:**

- Eliminates external dependency (MaxMind GeoLite2, ip2location, etc.)
- Keeps project self-contained and reproducible
- Sufficient for demonstration (real GeoIP would provide similar results for the scenario)

**Implementation:** Simple Python dictionary mapping IPs to countries/cities.

---

## Attack Scenario

### 5. MFA Bypass via Real-Time Phishing

**Assumption:** Attacker used adversary-in-the-middle (AITM) proxy to bypass TOTP MFA  
**Reasoning:**

- Modern phishing kits (EvilProxy, Modlishka, etc.) can relay MFA prompts in real-time
- Demonstrates that TOTP/SMS MFA is not phishing-resistant
- Highlights need for FIDO2/WebAuthn

**Evidence:** Two failed password attempts followed by successful login with MFA = attacker refined approach

---

### 6. No Malware Execution

**Decision:** Attack uses only cloud API abuse, no malware/scripts  
**Reasoning:**

- Represents modern "living off the land" attacks
- Demonstrates that cloud-native attacks don't require traditional malware
- Simpler to model in logs (no need for process trees, registry changes, etc.)

**Realistic:** Many real-world cloud compromises follow this pattern (Business Email Compromise, OAuth abuse, etc.).

---

### 7. Single User Affected

**Assumption:** Attacker targeted one user, no lateral movement  
**Reasoning:**

- Simplifies narrative and correlation logic
- Focused case-study demonstrates complete kill chain for one victim
- Realistic for opportunistic phishing (mass campaign, not targeted APT)

**Note:** Real incidents may involve lateral movement, privilege escalation, etc. Future enhancement could add these elements.

---

## Detection & Response

### 8. Detection Time (2 hours)

**Assumption:** SOC detected compromise within 2 hours 15 minutes of initial phishing email  
**Reasoning:**

- Realistic for "good" SOC maturity level
- Impossible travel detection is well-established technique
- Demonstrates value of behavioral analytics

**Comparison to Industry:**

- Average dwell time (2023): 16 days (Mandiant M-Trends)
- This scenario: <2 hours = exceptional performance
- Justified by: automated detection, clear indicators, layered logging

---

### 9. No Data Exfiltration

**Decision:** Attacker accessed data but did not successfully exfiltrate  
**Reasoning:**

- Demonstrates "security controls working as designed"
- More realistic for mature organizations with SOC
- Allows focus on detection/response rather than breach notification

**Justification:** Forwarding rule created but deleted before emails matched criteria.

---

### 10. Risk Scoring Model

**Decision:** Use simple additive scoring (0-100) with explainability  
**Formula:**

```
Risk Score = Sum of triggered rule points (capped at 100)

Rules:
- IOC match: +40
- New device: +30
- New geo (non-corporate): +30
- Impossible travel: +50
- Mailbox rule to external: +35
- Failed MFA then success: +25
- Bulk export (>20 items): +30
- Phishing link click: +35
```

**Reasoning:**

- Transparent and auditable (analysts can understand why score is X)
- Simple enough to implement without ML/models
- Realistic for rule-based SIEM alerting

**Trade-off:** Not as sophisticated as ML-based anomaly detection, but sufficient for demonstration and easier to tune.

---

## Tool-Agnostic Approach

### 11. Detection Rules as YAML (Sigma-like)

**Decision:** Write detection rules in generic YAML format inspired by Sigma  
**Reasoning:**

- Portable across SIEMs (Splunk, Elastic, Sentinel, Chronicle)
- Demonstrates understanding of detection logic independent of tooling
- Common format for sharing detection content

**Example:** Rules include `conditions`, `false_positives`, `mitre_attack`, `response_actions`

---

### 12. Queries as Pseudocode

**Decision:** Investigation queries written in generic pseudocode, not specific SIEM language  
**Reasoning:**

- Avoids locking project to one platform
- Demonstrates analytical thinking (what to query for) vs. syntax memorization
- Easy to adapt to any platform (Splunk SPL, KQL, SQL, etc.)

---

## Pipeline Design

### 13. Python for Automation

**Decision:** Implement pipeline in Python 3.11+  
**Reasoning:**

- Standard language for security automation and data processing
- Rich libraries (json, csv, pathlib) in standard library
- Easy to read and understand for reviewers/interviewers
- Cross-platform (Windows, macOS, Linux)

**Alternative Considered:** Bash/PowerShell scripts (rejected: less portable and harder to maintain)

---

### 14. No External Dependencies (Minimal)

**Decision:** Use only Python standard library where possible  
**Reasoning:**

- Simplifies setup (no pip install beyond stdlib)
- Faster "time to running" for evaluators
- Demonstrates ability to work without heavy frameworks

**Exceptions:** None in current implementation (all standard library)

---

### 15. Single-Command Execution

**Decision:** Master orchestrator (`run_pipeline.py`) runs entire analysis  
**Reasoning:**

- Easy user experience ("just run this")
- Simulates SOAR-style automation
- Reproducible results

**User Experience Goal:** Evaluator can execute complete analysis in <30 seconds.

---

## Reporting

### 16. Markdown for Reports

**Decision:** Generate reports as Markdown (.md files)  
**Reasoning:**

- Human-readable and renders beautifully on GitHub
- Easy to convert to PDF/HTML if needed
- Professional appearance without complex tooling

**Executive Report:** Less technical, focuses on business impact  
**Technical Report:** Detailed timeline, IOCs, commands, queries

---

### 17. JSON for Machine-Readable Outputs

**Decision:** Alerts and summary in JSON/JSONL format  
**Reasoning:**

- Structured data for downstream tools (SOAR, ticketing, dashboards)
- Easy to parse programmatically
- Industry standard for SIEM/security tool outputs

---

## Documentation

### 18. MITRE ATT&CK Mapping Depth

**Decision:** Map every attacker action to specific techniques with evidence  
**Reasoning:**

- Demonstrates cyber threat intelligence skill
- Shows understanding of adversary TTPs
- Valuable for purple team exercises and detection engineering

**Depth:** Technique-level (not sub-technique) for simplicity, but could be extended

---

### 19. Analyst Notes in Q&A Format

**Decision:** Structure analyst triage as question-and-answer  
**Reasoning:**

- Demonstrates critical thinking process
- More engaging than prose
- Common in SOC documentation and handover notes

**Questions Covered:**

- What is the alert?
- Could this be a false positive?
- What is the blast radius?
- What should we do?

---

## Limitations & Future Enhancements

### Acknowledged Limitations

1. **Synthetic Data:** Not as complex as real production logs
2. **Single Attack Path:** No lateral movement, privilege escalation, or multi-stage campaigns
3. **No Machine Learning:** Risk scoring is rule-based, not ML-based anomaly detection
4. **Simplified GeoIP:** Hardcoded mappings vs. real GeoIP database
5. **No Adversary Persistence Techniques Beyond Mailbox Rule:** (could add OAuth apps, scheduled tasks, etc.)

### Potential Enhancements

1. Add lateral movement (second user account compromised)
2. Implement ML-based scoring (scikit-learn anomaly detection)
3. Add more log sources (DNS, VPN, cloud audit logs)
4. Create web dashboard for visual timeline (Flask + D3.js)
5. Integrate with real threat intel feeds (MISP, OTX)
6. Add automated SOAR playbook execution (trigger containment without human)
7. Create red team scenario where attacker succeeds in data exfiltration

---

## Validation Approach

### Testing Methodology

1. **End-to-End Test:** Run `python run_pipeline.py` and verify outputs generated
2. **Log Coherence:** Manually review timeline to ensure timestamps/entities align
3. **IOC Matching:** Verify IOC enrichment correctly flags malicious domains/IPs
4. **Alert Logic:** Confirm expected alerts generated with correct evidence
5. **Documentation Review:** Read all docs for clarity and completeness

---

**Document Maintained By:** Project Author  
**Last Updated:** January 2026  
**Purpose:** Transparency for evaluators and future contributors
