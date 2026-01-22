"""
MITRE ATT&CK coverage generator with per-case and overall statistics.
"""

import json
from pathlib import Path
from collections import defaultdict


def generate_mitre_coverage(cases, alerts):
    """Generate MITRE coverage from cases and alerts."""
    overall = defaultdict(int)
    by_case = {}
    technique_details = {}
    
    # Technique metadata
    techniques_map = {
        "T1566.002": {"name": "Phishing: Spearphishing Link", "tactic": "Initial Access"},
        "T1078": {"name": "Valid Accounts", "tactic": "Defense Evasion"},
        "T1114.002": {"name": "Email Collection: Remote Email Collection", "tactic": "Collection"},
        "T1098": {"name": "Account Manipulation", "tactic": "Persistence"},
        "T1528": {"name": "Steal Application Access Token", "tactic": "Credential Access"},
        "T1556": {"name": "Modify Authentication Process", "tactic": "Credential Access"},
        "T1098.001": {"name": "Account Manipulation: Additional Cloud Credentials", "tactic": "Persistence"}
    }
    
    # Process cases
    for case in cases:
        case_id = case["case_id"]
        case_techniques = defaultdict(int)
        
        for tech_id in case.get("mitre_techniques", []):
            overall[tech_id] += 1
            case_techniques[tech_id] += 1
            
            if tech_id not in technique_details:
                technique_details[tech_id] = {
                    "id": tech_id,
                    "name": techniques_map.get(tech_id, {}).get("name", "Unknown"),
                    "tactic": techniques_map.get(tech_id, {}).get("tactic", "Unknown"),
                    "count": 0,
                    "cases": []
                }
            
            technique_details[tech_id]["count"] += 1
            if case_id not in technique_details[tech_id]["cases"]:
                technique_details[tech_id]["cases"].append(case_id)
        
        by_case[case_id] = dict(case_techniques)
    
    # Also process alerts for additional MITRE mappings
    for alert in alerts:
        for mitre_entry in alert.get("mitre", []):
            tech_id = mitre_entry.get("id")
            if tech_id:
                overall[tech_id] += 1
                
                if tech_id not in technique_details:
                    technique_details[tech_id] = {
                        "id": tech_id,
                        "name": mitre_entry.get("name", "Unknown"),
                        "tactic": mitre_entry.get("tactic", "Unknown"),
                        "count": 0,
                        "cases": []
                    }
                
                technique_details[tech_id]["count"] += 1
    
    coverage = {
        "overall": dict(overall),
        "by_case": by_case,
        "techniques": list(technique_details.values()),
        "summary": {
            "total_techniques": len(overall),
            "total_observations": sum(overall.values()),
            "most_common": sorted(overall.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    }
    
    return coverage


def main():
    """Generate MITRE coverage from cases and alerts."""
    # Load cases
    cases_file = Path("outputs") / "cases.json"
    cases = []
    if cases_file.exists():
        with open(cases_file) as f:
            data = json.load(f)
            cases = data.get("cases", [])
    
    # Load alerts
    alerts_file = Path("outputs") / "alerts.jsonl"
    alerts = []
    if alerts_file.exists():
        with open(alerts_file) as f:
            for line in f:
                alerts.append(json.loads(line))
    
    coverage = generate_mitre_coverage(cases, alerts)
    
    # Save
    output_file = Path("outputs") / "mitre_coverage.json"
    with open(output_file, "w") as f:
        json.dump(coverage, f, indent=2)
    
    print(f"[OK] Generated MITRE coverage: {coverage['summary']['total_techniques']} techniques")
    print(f"[OK] Saved to {output_file}")


if __name__ == "__main__":
    main()
