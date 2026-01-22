#!/usr/bin/env python3
"""
SOC Case Study - Master Pipeline Orchestrator
Runs the complete SOAR-style automation pipeline.

Usage: python run_pipeline.py
"""

import sys
import shutil
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from ingest import LogIngestor
from normalize import EventNormalizer
from correlate import EventCorrelator
from score import RiskScorer
from detect import AlertDetector
from report import ReportGenerator


def print_banner():
    banner = """
================================================================
    SOC CASE STUDY - AUTOMATED DETECTION PIPELINE
    Phishing -> Account Compromise -> Alert -> Response
================================================================
"""
    print(banner)


def export_to_dashboard():
    """
    Export outputs to dashboard/dashboard_data/ for GitHub Pages.
    Cross-platform (Windows, macOS, Linux).
    """
    source_dir = Path("outputs")
    dest_dir = Path("dashboard") / "dashboard_data"
    
    if not source_dir.exists():
        print("[ERROR] outputs/ directory not found")
        return
    
    # Create dashboard_data directory
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy all files from outputs to dashboard_data
    for file in source_dir.glob("*"):
        if file.is_file():
            dest_file = dest_dir / file.name
            shutil.copy2(file, dest_file)
            print(f"[OK] Exported {file.name}")
    
    print(f"\n[DASHBOARD] Data exported to: {dest_dir}")
    print("[DASHBOARD] Commit dashboard/ to GitHub for Pages deployment")




def main():
    print_banner()
    
    print("\n[PIPELINE START] Running automated SOC detection pipeline...\n")
    
    try:
        # Step 1: Ingest raw logs
        print("=" * 60)
        print("STEP 1: INGESTION")
        print("=" * 60)
        ingestor = LogIngestor()
        raw_logs = ingestor.ingest_all()
        
        # Step 2: Normalize to common schema
        print("\n" + "=" * 60)
        print("STEP 2: NORMALIZATION & ENRICHMENT")
        print("=" * 60)
        normalizer = EventNormalizer()
        normalized_events = normalizer.normalize_all(raw_logs)
        normalizer.save_normalized(normalized_events)
        
        # Step 3: Correlate events
        print("\n" + "=" * 60)
        print("STEP 3: CORRELATION")
        print("=" * 60)
        correlator = EventCorrelator()
        correlations = correlator.correlate(normalized_events)
        correlator.save_correlations(correlations)
        
        # Step 4: Risk scoring
        print("\n" + "=" * 60)
        print("STEP 4: RISK SCORING")
        print("=" * 60)
        scorer = RiskScorer()
        scores = scorer.score_events(normalized_events, correlations)
        scorer.save_scores(scores)
        
        # Step 5: Alert detection
        print("\n" + "=" * 60)
        print("STEP 5: ALERT GENERATION")
        print("=" * 60)
        detector = AlertDetector()
        alerts = detector.detect(scores['scored_events'], scores['entity_scores'], correlations)
        detector.save_alerts()
        
        # Step 6: Report generation
        print("\n" + "=" * 60)
        print("STEP 6: REPORT GENERATION")
        print("=" * 60)
        generator = ReportGenerator()
        generator.generate_all_reports(alerts, scores['entity_scores'], normalized_events)
        
        # Summary
        print("\n" + "=" * 60)
        print("PIPELINE COMPLETE")
        print("=" * 60)
        print(f"\n[OK] Processed {len(normalized_events)} events")
        print(f"[OK] Generated {len(alerts)} alerts")
        print(f"[OK] Identified {len(scores['entity_scores'])} entities")
        
        high_risk = sum(1 for e in scores['entity_scores'].values() 
                       if e['severity'] in ['high', 'critical'])
        print(f"[OK] High-risk entities: {high_risk}")
        
        print(f"\n[OUTPUT] Outputs saved to: ./outputs/")
        print(f"   - alerts.jsonl")
        print(f"   - summary.json")
        print(f"   - report_executive.md")
        print(f"   - report_technical.md")
        print(f"   - risk_scores.json")
        print(f"   - correlations.json")
        
        print("\n[INFO] Review the executive report (outputs/report_executive.md) for incident summary")
        print("[INFO] Review the technical report (outputs/report_technical.md) for detailed analysis")
        print("[INFO] Review alerts (outputs/alerts.jsonl) for detection details\n")
        
        # Export to dashboard (GitHub Pages static)
        print("\n" + "=" * 60)
        print("EXPORTING TO DASHBOARD")
        print("=" * 60)
        export_to_dashboard()
        
        return 0
        
    except Exception as e:
        print(f"\n[ERROR] Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
