#!/usr/bin/env python3
"""
Quick data generator - skips large datasets for performance
Generates minimal demo data for fast loading
"""

import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

def main():
    print("=" * 60)
    print("FAST DATA GENERATION (Skipping large datasets)")
    print("=" * 60)
    
    from turkish_soc_generator import TurkishSOCGenerator
    
    # Generate only synthetic data
    print("\n[GEN] Generating minimal synthetic data...")
    gen = TurkishSOCGenerator()
    data = gen.generate_all()
    
    # Save outputs
    output_dir = Path("outputs")
    output_dir.mkdir(exist_ok=True)
    
    # Limit events to 200 for performance
    print(f"[LIMIT] Reducing events from {len(data['events'])} to 200...")
    data['events'] = data['events'][:200]
    
    # Save limited data
    print("[SAVE] Saving optimized data files...")
    
    # Events (JSONL)
    with open(output_dir / "events.jsonl", "w", encoding="utf-8") as f:
        for event in data['events']:
            f.write(json.dumps(event, ensure_ascii=False) + '\n')
    
    # Alerts (JSONL)
    with open(output_dir / "alerts.jsonl", "w", encoding="utf-8") as f:
        for alert in data['alerts']:
            f.write(json.dumps(alert, ensure_ascii=False) + '\n')
    
    # Other JSON files
    for key, value in data.items():
        if key not in ['events', 'alerts']:
            filename = key.replace('_', '_') + '.json'
            if key == 'playbooks':
                filename = 'playbooks.json'
                value = {'playbooks': value}
            elif key == 'playbookRuns':
                filename = 'playbook_runs.jsonl'
                with open(output_dir / filename, 'w', encoding='utf-8') as f:
                    for run in value:
                        f.write(json.dumps(run, ensure_ascii=False) + '\n')
                continue
            
            with open(output_dir / filename, 'w', encoding='utf-8') as f:
                json.dump(value, f, ensure_ascii=False, indent=2)
    
    print(f"\n[SUCCESS] Generated optimized data:")
    print(f"  - Events: {len(data['events'])}")
    print(f"  - Alerts: {len(data['alerts'])}")
    print(f"  - Cases: {len(data.get('cases', []))}")
    
    # Copy to frontend
    import shutil
    frontend_data = Path("frontend/public/dashboard_data")
    frontend_data.mkdir(parents=True, exist_ok=True)
    
    for file in output_dir.glob("*"):
        if file.is_file():
            shutil.copy2(file, frontend_data / file.name)
    
    print(f"\n[EXPORT] Copied to frontend/public/dashboard_data/")
    print("\n[DONE] Fast data generation complete!")
    print("Refresh your browser (F5) to see the optimized data.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
