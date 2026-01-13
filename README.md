# SOC Case Study: Phishing → Account Compromise

## Detection, Investigation & Response Portfolio Project

[![Security](https://img.shields.io/badge/Security-SOC%20Analysis-blue)]() [![MITRE ATT&CK](https://img.shields.io/badge/MITRE-ATT%26CK-red)]() [![Python](https://img.shields.io/badge/Python-3.11%2B-brightgreen)]()

**A production-ready SOC analyst portfolio project demonstrating end-to-end incident detection, investigation, and response capabilities.**

This project simulates a real-world phishing-led account compromise incident with complete automation pipeline, detection rules, incident response playbooks, and professional documentation. Perfect for demonstrating SOC/Detection Engineering skills to recruiters and hiring managers.

---

## 🎯 Project Highlights

- **Complete SOAR-style Pipeline:** Ingest → Normalize → Correlate → Score → Detect → Alert → Report (single-command execution)
- **Realistic Scenario:** Phishing email → Credential theft → Account compromise → Mailbox rule persistence
- **Tool-Agnostic:** Sigma-like detection rules and pseudocode queries adaptable to any SIEM (Splunk, Elastic, Sentinel, Chronicle)
- **MITRE ATT&CK Mapped:** 8 techniques across 7 tactics with evidence citations
- **Professional Documentation:** Executive & technical reports, analyst notes, timeline, playbooks, lessons learned
- **No Dependencies:** Runs with Python standard library only (no Docker, databases, or cloud accounts needed)

---

## ⚡ Quick Start (10 Minutes)

### Prerequisites

- Python 3.11+ (check with `python --version`)
- Windows, macOS, or Linux

### Run the Pipeline

```bash
# Clone this repository (or navigate to the project directory)
cd SOC

# Run the complete SOAR pipeline
python run_pipeline.py
```

**That's it!** The pipeline will:

1. Ingest 40+ synthetic log events from 5 sources
2. Normalize to common schema with IOC enrichment
3. Correlate events by user, IP, and time
4. Calculate risk scores with explainability
5. Generate 4 high-confidence alerts
6. Produce executive and technical reports

**Outputs:** Check `outputs/` folder for alerts, reports, and summary dashboard.

---

## 📊 What You'll See

### Generated Outputs

```
outputs/
├── alerts.jsonl              # 4 security alerts with evidence and recommendations
├── summary.json              # Dashboard-ready metrics
├── report_executive.md       # 1-page executive summary
├── report_technical.md       # Detailed SOC analysis report
├── risk_scores.json          # Risk scoring with explainability
└── correlations.json         # Event correlation graph
```

### Sample Alert (JSONL)

```json
{
  "alert_id": "...",
  "name": "Impossible Travel Detected",
  "severity": "high",
  "confidence": "high",
  "entity": {"user": "sarah.chen@acmecorp.example.com", ...},
  "hypothesis": "User authenticated from Romania, then NY within 45 minutes...",
  "recommended_actions": ["Revoke sessions", "Force password reset", ...],
  "mitre": [{"id": "T1078.004", "name": "Valid Accounts: Cloud Accounts", ...}],
  "evidence": ["evt-001", "evt-002", ...]
}
```

---

## 🏗️ Project Architecture

```
┌─────────────────┐
│  Raw Logs       │  Email Gateway, Web Proxy, Identity Provider,
│  (5 sources)    │  Cloud Mailbox, Endpoint EDR
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ingest.py      │  Parse CSV, JSON Lines, Apache CLF
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Normalize.py   │  Common schema + IOC enrichment + GeoIP
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Correlate.py   │  Link events: phishing chain, impossible travel, post-compromise
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Score.py       │  Risk scoring (0-100) with breakdown
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Detect.py      │  Generate alerts matching detection rules
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Report.py      │  Executive + Technical reports
└────────┬────────┘
         │
         ▼
    📁 Outputs
```

---

## 📖 Scenario: Phishing-Led Account Compromise

### Attack Timeline

1. **08:15 UTC** - Phishing email delivered (typosquatting domain, SPF: FAIL)
2. **08:17 UTC** - User clicks malicious link
3. **08:18 UTC** - Credentials submitted to fake Microsoft login page
4. **08:47 UTC** - Attacker logs in from Romania (MFA bypass via real-time phishing)
5. **08:52 UTC** - Attacker creates mailbox forwarding rule (persistence)
6. **09:15 UTC** - Attacker accesses 47 business emails
7. **09:35 UTC** - **SOC detects impossible travel alert**
8. **10:05 UTC** - **SOC contains threat (sessions revoked, password reset)**
9. **11:30 UTC** - **Eradication complete (forwarding rule deleted, no data loss)**

### MITRE ATT&CK Kill Chain

```
Initial Access (T1566.002) → Credential Access (T1589.001) → Initial Access (T1078.004)
                                                                      ↓
Persistence (T1114.003) ← Discovery (T1087) ← Defense Evasion (T1078)
        ↓
Collection (T1114.002) → Exfiltration (T1048) [PREVENTED]
```

**Outcome:** ✅ Successful containment, zero data loss

---

## 🛡️ What This Project Demonstrates

### SOC Analyst Skills

✅ **Alert Triage:** Structured Q&A approach to validate alerts and assess severity  
✅ **Incident Investigation:** Correlating logs across email, auth, web, mailbox, and endpoint  
✅ **Timeline Reconstruction:** Building minute-by-minute attack narrative from evidence  
✅ **Impact Assessment:** Determining blast radius and data at risk  
✅ **Containment Execution:** Rapid response to prevent data exfiltration

### Detection Engineering Skills

✅ **Detection Logic:** 5 Sigma-like rules (impossible travel, mailbox rules, phishing clicks, etc.)  
✅ **Tool-Agnostic Design:** Queries written in pseudocode (adaptable to Splunk, Elastic, Sentinel)  
✅ **False Positive Handling:** Documented FP scenarios and tuning guidance  
✅ **MITRE ATT&CK Mapping:** Technique-level mapping with evidence justification  
✅ **Risk Scoring:** Explainable scoring model (not a black box)

### Incident Response Skills

✅ **IR Playbooks:** 3 detailed runbooks (account compromise, phishing response, mailbox investigation)  
✅ **SOAR Automation:** Single-command pipeline execution (ingest → report)  
✅ **Stakeholder Communication:** Executive + technical reports tailored to audience  
✅ **Lessons Learned:** Gap analysis with actionable recommendations

---

## 📁 Repository Structure

```
SOC/
├── README.md                          # You are here
├── run_pipeline.py                    # Master orchestrator (SOAR-style)
├── requirements.txt                   # Python dependencies (none!)
│
├── data/
│   ├── raw/                           # Synthetic log files in realistic formats
│   │   ├── email_gateway.log          # CSV: 10 emails including phishing
│   │   ├── identity_provider.log      # JSON Lines: Auth events
│   │   ├── web_proxy.log              # Apache CLF: Web traffic
│   │   ├── cloud_mailbox.log          # JSON Lines: Mailbox operations
│   │   └── endpoint_edr.log           # JSON Lines: Process/network events
│   ├── normalized/
│   │   └── events.jsonl               # Normalized schema output
│   └── iocs/
│       ├── malicious_domains.txt      # Phishing domains
│       ├── malicious_ips.txt          # Attacker IPs
│       └── known_good_ips.txt         # Corporate IP ranges
│
├── src/
│   ├── ingest.py                      # Log loading (CSV, JSON, Apache CLF parsers)
│   ├── normalize.py                   # Schema mapping + IOC enrichment
│   ├── correlate.py                   # Event correlation (phishing chains, impossible travel)
│   ├── score.py                       # Risk scoring with explainability
│   ├── detect.py                      # Alert generation from rules
│   ├── report.py                      # Report generation (markdown + JSON)
│   └── playbooks/
│       ├── account_compromise.yaml    # IR runbook: Account compromise response
│       ├── phishing_response.yaml     # IR runbook: Phishing email handling
│       └── mailbox_rule_investigation.yaml  # IR runbook: Mailbox rule forensics
│
├── detections/
│   ├── rules/
│   │   ├── impossible_travel.yaml     # Detection: Geo-temporal anomaly
│   │   ├── new_device_login.yaml      # Detection: Unknown device auth
│   │   ├── mailbox_rule_created.yaml  # Detection: External forwarding
│   │   ├── phishing_email_clicked.yaml # Detection: Email + web correlation
│   │   └── bulk_mailbox_export.yaml   # Detection: Mass data access
│   └── queries/
│       └── investigation_queries.md   # Tool-agnostic query library
│
├── docs/
│   ├── INCIDENT_OVERVIEW.md           # 1-page incident summary
│   ├── ANALYST_NOTES.md               # Triage Q&A for each alert
│   ├── TIMELINE.md                    # Minute-by-minute reconstruction
│   ├── MITRE_MAPPING.md               # Technique mapping with evidence
│   ├── PLAYBOOKS.md                   # IR runbook documentation
│   ├── LESSONS_LEARNED.md             # Gap analysis + recommendations
│   └── ASSUMPTIONS.md                 # Design decisions + limitations
│
└── outputs/                           # Generated by pipeline
    ├── alerts.jsonl
    ├── summary.json
    ├── report_executive.md
    ├── report_technical.md
    ├── risk_scores.json
    └── correlations.json
```

---

## 🔍 Key Features

### 1. Tool-Agnostic Detection Rules

Detection rules are written in generic YAML format similar to Sigma, making them portable across any SIEM:

```yaml
name: Impossible Travel Detected
conditions:
  - event_type: auth.login.success
  - group_by: user.email
  - different_geolocations: true
  - minimum_distance_km: 500
  - within_timeframe: 60 minutes
mitre_attack:
  - tactic: Initial Access
    technique: T1078.004
response_actions:
  - Verify user travel schedule
  - Revoke suspicious sessions
```

### 2. Explainable Risk Scoring

Every risk score includes a breakdown showing exactly why it was calculated:

```json
{
  "risk_score": 85,
  "severity": "critical",
  "score_breakdown": [
    {
      "rule": "ioc_match",
      "points": 40,
      "description": "Event matches known IOC: micros0ft-secure.info"
    },
    {
      "rule": "new_device",
      "points": 30,
      "description": "Login from previously unseen device"
    },
    {
      "rule": "impossible_travel",
      "points": 50,
      "description": "Impossible travel: Romania to NY in 45 min"
    }
  ]
}
```

No black box ML - analysts understand exactly what triggered alerts.

### 3. Analyst-Focused Documentation

`ANALYST_NOTES.md` demonstrates Tier-1/Tier-2 thinking process:

- "What is this alert and why did it trigger?"
- "Could this be a false positive? What evidence disproves it?"
- "What is the most likely attack path?"
- "What is the blast radius?"
- "What immediate actions minimize risk?"

This shows critical thinking skills valued by SOC hiring managers.

---

## 💼 Interview Talking Points

### For SOC Analyst Roles

- "I built an end-to-end incident investigation demonstrating alert triage, log correlation, and incident response."
- "I created a complete timeline from phishing email to containment using logs from 5 sources."
- "I documented a structured Q&A approach to alert validation that reduces false positives."

### For Detection Engineering Roles

- "I wrote 5 detection rules using Sigma-like format, with false positive analysis and tuning guidance."
- "I implemented a risk scoring engine combining multiple signals with full explainability."
- "I mapped attacker behavior to MITRE ATT&CK with specific log evidence for each technique."

### For Incident Response Roles

- "I created 3 IR playbooks covering account compromise, phishing response, and mailbox rule investigations."
- "I designed a mini-SOAR pipeline automating ingest → detection → alert → report workflows."
- "I conducted a lessons learned analysis identifying gaps and actionable security improvements."

---

## 🧪 Testing & Validation

### Run the Pipeline

```bash
python run_pipeline.py
```

**Expected Output:**

```
[INGEST] Loaded 40 events from 5 sources
[NORMALIZE] Processed 40 events
[NORMALIZE] IOC matches found in 8 events
[CORRELATE] Found 3 correlation patterns
[SCORE] High-risk entities: 1
[DETECT] Generated 4 alerts
[REPORT] Generated all reports

✅ Processed 40 events
✅ Generated 4 alerts
✅ Identified 1 high-risk entity
```

### Verify Outputs

```bash
# Check alerts
cat outputs/alerts.jsonl | python -m json.tool

# Read executive summary
cat outputs/report_executive.md

# View timeline
cat docs/TIMELINE.md
```

---

## 🎓 What Skills Are Demonstrated?

| Skill Category            | Demonstrated Through                                          |
| ------------------------- | ------------------------------------------------------------- |
| **Log Analysis**          | Parsing 5 different log formats (CSV, JSON Lines, Apache CLF) |
| **Threat Hunting**        | Correlation logic for phishing chains and impossible travel   |
| **Detection Engineering** | 5 tool-agnostic detection rules with tuning guidance          |
| **MITRE ATT&CK**          | Technique mapping with evidence citations                     |
| **Incident Response**     | 3 detailed IR playbooks with commands and timelines           |
| **Automation**            | Python pipeline orchestrator (mini-SOAR)                      |
| **Communication**         | Executive + technical reports tailored to audiences           |
| **Critical Thinking**     | Analyst notes with Q&A approach to alert validation           |

---

## 🚀 Use Cases

### Portfolio / GitHub

- ✅ Showcase to recruiters during job applications
- ✅ Include link in resume under "Projects" section
- ✅ Discuss in behavioral interviews ("Tell me about a security project you built")

### Interview Preparation

- ✅ Walk through the incident timeline during technical interviews
- ✅ Explain detection logic and tuning decisions
- ✅ Discuss trade-offs in risk scoring models

### Skill Development

- ✅ Practice log correlation and timeline reconstruction
- ✅ Learn MITRE ATT&CK technique mapping
- ✅ Understand real-world phishing attack patterns

---

## 🛠️ Customization & Extension

This project is designed to be extended:

- **Add More Attacks:** Ransomware, insider threat, supply chain compromise
- **Integrate Threat Intel:** Pull IOCs from MISP, OTX, or VirusTotal
- **Build Dashboard:** Flask app with D3.js timeline visualization
- **Deploy SOAR:** Integrate with Shuffle, Phantom, or custom orchestrator
- **Add ML Scoring:** Replace rule-based scoring with scikit-learn anomaly detection

---

## 📚 References & Learning Resources

- **MITRE ATT&CK:** [attack.mitre.org](https://attack.mitre.org)
- **Sigma Rules:** [github.com/SigmaHQ/sigma](https://github.com/SigmaHQ/sigma)
- **NIST Cybersecurity Framework:** [nist.gov/cyberframework](https://www.nist.gov/cyberframework)
- **SANS Incident Handling:** [sans.org/reading-room](https://www.sans.org/reading-room/)

---

## 📝 License & Usage

This project is open-source and free to use for educational and portfolio purposes.

**Attribution:** If you use this project as a reference or template, please credit it in your work.

---

## 🎉 Results Summary

**Single Command:** `python run_pipeline.py`

**Generated Assets:**

- ✅ 4 security alerts (JSONL format)
- ✅ 2 executive-ready reports (markdown)
- ✅ 1 technical investigation report
- ✅ 1 complete attack timeline (15 events)
- ✅ 1 MITRE ATT&CK mapping (8 techniques)
- ✅ 3 IR playbooks (account compromise, phishing, mailbox investigation)
- ✅ 5 detection rules (Sigma-like, tool-agnostic)
- ✅ Risk scores with explainability
- ✅ Dashboard metrics (JSON)

**Time to Value:** 30 seconds to run, 2 minutes to understand, 10 minutes to explore in depth.

**Interviewer Question:** _"Can you show me a security project you've worked on?"_  
**Your Answer:** _"Let me walk you through this SOC case study..."_ 🚀

---

**Built with:** Python 3.11 | MITRE ATT&CK Framework | Security Best Practices  
**Maintained by:** SOC Analyst Portfolio  
**Last Updated:** January 2026

**Questions? Feedback?** Open an issue or submit a pull request. Happy hunting! 🔍
