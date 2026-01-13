# SOC Case Study: Phishing → Account Compromise

## Detection, Investigation & Response Portfolio Project

[![Security](https://img.shields.io/badge/Security-SOC%20Analysis-blue)]() [![MITRE ATT&CK](https://img.shields.io/badge/MITRE-ATT%26CK-red)]() [![Python](https://img.shields.io/badge/Python-3.11%2B-brightgreen)]()

**A production-ready SOC analyst portfolio project demonstrating end-to-end incident detection, investigation, and response capabilities.**

This project simulates a real-world phishing-led account compromise incident with complete automation pipeline, detection rules, incident response playbooks, and professional documentation. Vibecoded ofc :)

---

##  Project Highlights

- **Complete SOAR-style Pipeline:** Ingest → Normalize → Correlate → Score → Detect → Alert → Report (single-command execution)
- **Realistic Scenario:** Phishing email → Credential theft → Account compromise → Mailbox rule persistence
- **Tool-Agnostic:** Sigma-like detection rules and pseudocode queries adaptable to any SIEM (Splunk, Elastic, Sentinel, Chronicle)
- **MITRE ATT&CK Mapped:** 8 techniques across 7 tactics with evidence citations
- **Professional Documentation:** Executive & technical reports, analyst notes, timeline, playbooks, lessons learned
- **No Dependencies:** Runs with Python standard library only (no Docker, databases, or cloud accounts needed)

---


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

## 📝 License & Usage

This project is open-source and free to use for educational and portfolio purposes.

**Attribution:** If you use this project as a reference or template, please credit it in your work.

