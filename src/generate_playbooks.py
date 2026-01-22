"""
Playbook run simulator - generates SOAR automation traces.
"""

import json
import random
from pathlib import Path
from datetime import datetime, timedelta


def generate_playbook_runs(cases):
    """Generate simulated playbook execution logs."""
    playbooks = []
    base_time = datetime.now() - timedelta(days=7)
    
    playbook_templates = {
        "phishing_response": {
            "name": "Phishing Email Response",
            "actions": [
                "Quarantine malicious email",
                "Block sender domain",
                "Reset user credentials",
                "Revoke active sessions",
                "Notify security team"
            ]
        },
        "account_compromise": {
            "name": "Account Compromise Containment",
            "actions": [
                "Force password reset",
                "Revoke all sessions",
                "Disable mailbox forwarding rules",
                "Enable conditional access policy",
                "Generate incident report"
            ]
        },
        "token_abuse": {
            "name": "OAuth Token Revocation",
            "actions": [
                "Revoke application consent",
                "Invalidate OAuth tokens",
                "Review audit logs",
                "Block application",
                "Notify affected user"
            ]
        },
        "mfa_fatigue": {
            "name": "MFA Bombing Investigation",
            "actions": [
                "Terminate active sessions",
                "Enable additional MFA verification",
                "Block source IP",
                "Review recent authentications",
                "Escalate to tier 2"
            ]
        }
    }
    
    for i, case in enumerate(cases):
        # Determine which playbook to use
        if "phishing" in case["title"].lower():
            playbook_key = "phishing_response"
        elif "oauth" in case["title"].lower():
            playbook_key = "token_abuse"
        elif "mfa" in case["title"].lower():
            playbook_key = "mfa_fatigue"
        else:
            playbook_key = "account_compromise"
        
        template = playbook_templates[playbook_key]
        
        # Generate run
        start_time = datetime.fromisoformat(case["created_at"]) + timedelta(minutes=random.randint(10, 60))
        duration = random.randint(120, 600)  # 2-10 minutes
        end_time = start_time + timedelta(seconds=duration)
        
        status = random.choice(["completed", "completed", "completed", "partial"])  # Mostly successful
        
        run = {
            "playbook_id": f"pb-{1000 + i}",
            "name": template["name"],
            "case_id": case["case_id"],
            "started_at": start_time.isoformat(),
            "finished_at": end_time.isoformat(),
            "duration_seconds": duration,
            "status": status,
            "affected_entities": case.get("affected_users", []),
            "actions_taken": template["actions"][:random.randint(3, len(template["actions"]))],
            "executor": "automation_engine"
        }
        
        playbooks.append(run)
    
    # Add a few standalone playbook runs (scheduled scans, etc.)
    standalone_runs = [
        {
            "playbook_id": "pb-9001",
            "name": "Daily Threat Intelligence Refresh",
            "case_id": None,
            "started_at": (base_time + timedelta(hours=6)).isoformat(),
            "finished_at": (base_time + timedelta(hours=6, minutes=5)).isoformat(),
            "duration_seconds": 300,
            "status": "completed",
            "affected_entities": [],
            "actions_taken": ["Update threat feed", "Refresh IOC database", "Generate intel report"],
            "executor": "scheduled_task"
        },
        {
            "playbook_id": "pb-9002",
            "name": "User Risk Score Recalculation",
            "case_id": None,
            "started_at": (base_time + timedelta(days=1)).isoformat(),
            "finished_at": (base_time + timedelta(days=1, minutes=12)).isoformat(),
            "duration_seconds": 720,
            "status": "completed",
            "affected_entities": ["all_users"],
            "actions_taken": ["Calculate risk scores", "Update entity profiles", "Flag high-risk users"],
            "executor": "scheduled_task"
        }
    ]
    
    playbooks.extend(standalone_runs)
    
    return playbooks


def main():
    """Generate playbook runs from cases."""
    # Load cases
    cases_file = Path("outputs") / "cases.json"
    cases = []
    if cases_file.exists():
        with open(cases_file) as f:
            data = json.load(f)
            cases = data.get("cases", [])
    
    playbooks = generate_playbook_runs(cases)
    
    # Save as JSONL
    output_file = Path("outputs") / "playbook_runs.jsonl"
    with open(output_file, "w") as f:
        for run in playbooks:
            f.write(json.dumps(run) + "\n")
    
    print(f"[OK] Generated {len(playbooks)} playbook runs")
    print(f"[OK] Saved to {output_file}")


if __name__ == "__main__":
    main()
