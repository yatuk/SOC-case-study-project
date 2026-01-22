#!/usr/bin/env python3
"""
SOC Case Study - Master Pipeline Orchestrator
Generates comprehensive synthetic SIEM/SOAR/EDR data and exports to dashboard.

Usage: python run_pipeline.py
"""

import sys
import shutil
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))


def print_banner():
    banner = """
================================================================
    SOC CASE STUDY - SECURITY PLATFORM DEMO
    SIEM + SOAR + EDR Synthetic Data Generator
================================================================
"""
    print(banner)


def export_to_dashboard():
    """Export outputs to dashboard/dashboard_data/ for GitHub Pages."""
    source_dir = Path("outputs")
    dest_dir = Path("dashboard") / "dashboard_data"
    
    if not source_dir.exists():
        print("[ERROR] outputs/ directory not found")
        return False
    
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    count = 0
    for file in source_dir.glob("*"):
        if file.is_file():
            dest_file = dest_dir / file.name
            shutil.copy2(file, dest_file)
            count += 1
    
    print(f"[EXPORT] Copied {count} files to {dest_dir}")
    return True


def generate_reports():
    """Generate markdown reports."""
    from datetime import datetime
    
    output_dir = Path("outputs")
    
    # Executive Report
    exec_report = f"""# Security Incident Executive Summary

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Overview

This report summarizes security incidents detected across ACME Corp's infrastructure over the past 14 days.

## Key Findings

- **8 Active Security Incidents** requiring investigation
- **Multiple Attack Vectors** including phishing, credential theft, and malware
- **High-Risk Entities** identified across Finance, IT, and Executive departments

## Incident Categories

1. **Phishing Attacks (3 cases)** - Credential harvesting, OAuth consent abuse
2. **Account Compromise (2 cases)** - MFA fatigue, password spray
3. **Malware/C2 Activity (1 case)** - Macro-based malware with C2 beacon
4. **Data Exfiltration (2 cases)** - BEC wire fraud, cloud storage abuse

## Recommended Actions

1. Enforce phishing-resistant MFA across all accounts
2. Implement conditional access policies
3. Deploy endpoint detection and response
4. Conduct security awareness training

## Timeline

All incidents occurred within a 14-day observation window, with the most critical being the malware infection with active C2 communication.

---
*This is a synthetic dataset for demonstration purposes.*
"""
    
    with open(output_dir / "report_executive.md", "w") as f:
        f.write(exec_report)
    
    # Technical Report
    tech_report = f"""# Technical Incident Analysis Report

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

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
"""
    
    with open(output_dir / "report_technical.md", "w") as f:
        f.write(tech_report)
    
    print("[REPORT] Generated executive and technical reports")


def main():
    print_banner()
    
    print("\n[START] Running SOC data generation pipeline...\n")
    
    try:
        # Generate synthetic data
        print("=" * 60)
        print("STEP 1: SYNTHETIC DATA GENERATION")
        print("=" * 60)
        
        from synthetic_data_generator import EventGenerator, save_outputs
        
        gen = EventGenerator()
        data = gen.generate_all()
        save_outputs(data)
        
        # Generate reports
        print("\n" + "=" * 60)
        print("STEP 2: REPORT GENERATION")
        print("=" * 60)
        
        generate_reports()
        
        # Export to dashboard
        print("\n" + "=" * 60)
        print("STEP 3: DASHBOARD EXPORT")
        print("=" * 60)
        
        if export_to_dashboard():
            print("\n[SUCCESS] Pipeline complete!")
            print("\n[NEXT STEPS]")
            print("  1. cd dashboard && python -m http.server 8000")
            print("  2. Open http://localhost:8000")
            print("  3. Or commit and push for GitHub Pages deployment")
        
        return 0
        
    except Exception as e:
        print(f"\n[ERROR] Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
