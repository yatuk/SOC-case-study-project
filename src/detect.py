"""
SOC Case Study Pipeline - Detection Module
Generates alerts based on detection rules and risk scores.
"""

import json
import uuid
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime


class AlertDetector:
    """Generates alerts from scored events using detection rules."""
    
    def __init__(self, rules_dir: str = "detections/rules"):
        self.rules_dir = Path(rules_dir)
        self.alerts = []
    
    def detect(self, scored_events: List[Dict[str, Any]], entity_scores: Dict[str, Any], 
               correlations: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Run detection logic and generate alerts."""
        
        # Alert 1: Phishing Email Clicked with Credential Submission
        phishing_alerts = self._detect_phishing_click(scored_events, correlations)
        self.alerts.extend(phishing_alerts)
        
        # Alert 2: Impossible Travel
        impossible_travel_alerts = self._detect_impossible_travel(scored_events, correlations)
        self.alerts.extend(impossible_travel_alerts)
        
        # Alert 3: Suspicious Mailbox Rule Creation
        mailbox_rule_alerts = self._detect_mailbox_rule(scored_events)
        self.alerts.extend(mailbox_rule_alerts)
        
        # Alert 4: Account Compromise Indicators
        compromise_alerts = self._detect_account_compromise(entity_scores, scored_events, correlations)
        self.alerts.extend(compromise_alerts)
        
        print(f"[DETECT] Generated {len(self.alerts)} alerts")
        for alert in self.alerts:
            print(f"  - {alert['severity'].upper()}: {alert['name']} ({alert['entity']['user']})")
        
        return self.alerts
    
    def _detect_phishing_click(self, scored_events: List[Dict[str, Any]], 
                               correlations: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect phishing email clicked with credential submission."""
        alerts = []
        
        for corr in correlations.get('correlations', []):
            if corr['pattern'] == 'phishing_click_login':
                # Get evidence events
                evidence_events = [e for e in scored_events if e['event_id'] in corr['events']]
                
                if not evidence_events:
                    continue
                
                # Calculate time window
                timestamps = [datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) 
                             for e in evidence_events]
                time_window = {
                    "start": min(timestamps).isoformat(),
                    "end": max(timestamps).isoformat()
                }
                
                alert = {
                    "alert_id": str(uuid.uuid4()),
                    "name": "Phishing Email Clicked - Credential Submission Suspected",
                    "severity": "high",
                    "confidence": "high",
                    "entity": {
                        "user": corr['user'],
                        "ips": list(set([e['network']['src_ip'] for e in evidence_events if e['network']['src_ip']])),
                        "devices": list(set([e['device']['name'] for e in evidence_events if e['device'].get('name')]))
                    },
                    "time_window": time_window,
                    "evidence": corr['events'],
                    "hypothesis": "User received a phishing email, clicked the malicious link, and submitted credentials to a fake login page. This represents a successful phishing attack with high probability of credential compromise.",
                    "recommended_actions": [
                        "Immediately reset user password",
                        "Revoke all active sessions",
                        "Review recent account activity for unauthorized actions",
                        "Check for mailbox rules, forwarding, or OAuth consents",
                        "Notify user about phishing incident",
                        "Block phishing domain at proxy/firewall"
                    ],
                    "mitre": [
                        {"id": "T1566.002", "name": "Phishing: Spearphishing Link", "tactic": "Initial Access"},
                        {"id": "T1589.001", "name": "Credentials from Password Stores", "tactic": "Credential Access"}
                    ]
                }
                alerts.append(alert)
        
        return alerts
    
    def _detect_impossible_travel(self, scored_events: List[Dict[str, Any]], 
                                  correlations: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect impossible travel patterns."""
        alerts = []
        
        for corr in correlations.get('correlations', []):
            if corr['pattern'] == 'impossible_travel':
                evidence_events = [e for e in scored_events if e['event_id'] in corr['events']]
                
                if not evidence_events:
                    continue
                
                timestamps = [datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) 
                             for e in evidence_events]
                time_window = {
                    "start": min(timestamps).isoformat(),
                    "end": max(timestamps).isoformat()
                }
                
                # Get geographic details
                geos = [f"{e['network']['src_geo'].get('city', 'Unknown')}, {e['network']['src_geo'].get('country', 'Unknown')}" 
                       for e in evidence_events]
                
                alert = {
                    "alert_id": str(uuid.uuid4()),
                    "name": "Impossible Travel Detected",
                    "severity": "high",
                    "confidence": "high",
                    "entity": {
                        "user": corr['user'],
                        "ips": list(set([e['network']['src_ip'] for e in evidence_events])),
                        "devices": list(set([e['device']['name'] for e in evidence_events if e['device'].get('name')]))
                    },
                    "time_window": time_window,
                    "evidence": corr['events'],
                    "hypothesis": f"User authenticated from geographically distant locations within a short timeframe ({geos[0]} followed by {geos[1]}). This is physically impossible and indicates account compromise or credential theft.",
                    "recommended_actions": [
                        "Verify user's actual location and travel schedule",
                        "Review which session performed unauthorized actions",
                        "Revoke suspicious sessions immediately",
                        "Force password reset",
                        "Enable stricter conditional access policies"
                    ],
                    "mitre": [
                        {"id": "T1078.004", "name": "Valid Accounts: Cloud Accounts", "tactic": "Initial Access"},
                        {"id": "T1078", "name": "Valid Accounts", "tactic": "Defense Evasion"}
                    ]
                }
                alerts.append(alert)
        
        return alerts
    
    def _detect_mailbox_rule(self, scored_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect suspicious mailbox rule creation."""
        alerts = []
        
        rule_events = [e for e in scored_events if 'mailbox.new_inboxrule' in e['event_type']]
        
        for event in rule_events:
            # Check if high risk score
            if event['risk_score'] < 30:
                continue
            
            rule_actions = event['details'].get('rule_actions', '')
            
            # Check for external forwarding
            if 'ForwardTo' in rule_actions and 'acmecorp.example.com' not in rule_actions:
                alert = {
                    "alert_id": str(uuid.uuid4()),
                    "name": "Suspicious Mailbox Forwarding Rule Created",
                    "severity": "critical",
                    "confidence": "high",
                    "entity": {
                        "user": event['user']['email'],
                        "ips": [event['network']['src_ip']],
                        "devices": [event['device'].get('name', 'unknown')]
                    },
                    "time_window": {
                        "start": event['timestamp'],
                        "end": event['timestamp']
                    },
                    "evidence": [event['event_id']],
                    "hypothesis": "A mailbox rule was created to forward emails to an external address. This is a common persistence technique used by attackers to maintain access to sensitive email communications after initial compromise.",
                    "recommended_actions": [
                        "Delete the malicious forwarding rule immediately",
                        "Review all emails that were forwarded",
                        "Check for other persistence mechanisms (OAuth apps, additional rules)",
                        "Investigate how the rule was created (compromised account vs. insider threat)",
                        "Notify affected user and security team"
                    ],
                    "mitre": [
                        {"id": "T1114.003", "name": "Email Collection: Email Forwarding Rule", "tactic": "Persistence"},
                        {"id": "T1114.002", "name": "Email Collection: Remote Email Collection", "tactic": "Collection"}
                    ]
                }
                alerts.append(alert)
        
        return alerts
    
    def _detect_account_compromise(self, entity_scores: Dict[str, Any], 
                                   scored_events: List[Dict[str, Any]],
                                   correlations: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect account compromise based on entity risk scores."""
        alerts = []
        
        for user, score_data in entity_scores.items():
            # Only alert on high/critical severity
            if score_data['severity'] not in ['high', 'critical']:
                continue
            
            # Get all events for this user
            user_events = [e for e in scored_events if e['user'].get('email') == user]
            
            if not user_events:
                continue
            
            timestamps = [datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) 
                         for e in user_events]
            time_window = {
                "start": min(timestamps).isoformat(),
                "end": max(timestamps).isoformat()
            }
            
            # Build hypothesis from score reasons
            hypothesis_parts = []
            for reason in score_data['reasons'][:3]:  # Top 3 reasons
                hypothesis_parts.append(reason['description'])
            
            hypothesis = "Multiple indicators of account compromise detected: " + "; ".join(hypothesis_parts) + ". These combined indicators suggest the account has been compromised and is being actively misused."
            
            alert = {
                "alert_id": str(uuid.uuid4()),
                "name": "Account Compromise - Multiple Indicators",
                "severity": score_data['severity'],
                "confidence": "high",
                "entity": {
                    "user": user,
                    "ips": list(set([e['network']['src_ip'] for e in user_events if e['network'].get('src_ip')])),
                    "devices": list(set([e['device']['name'] for e in user_events if e['device'].get('name')]))
                },
                "time_window": time_window,
                "evidence": score_data['events'],
                "hypothesis": hypothesis,
                "recommended_actions": [
                    "Contain: Revoke all active sessions immediately",
                    "Contain: Force password reset with MFA",
                    "Investigate: Review all actions taken during suspicious sessions",
                    "Investigate: Check for data exfiltration attempts",
                    "Eradicate: Remove any persistence mechanisms (rules, OAuth apps)",
                    "Recover: Re-enable account with enhanced security controls",
                    "Document: Create incident report with timeline and impact"
                ],
                "mitre": [
                    {"id": "T1078.004", "name": "Valid Accounts: Cloud Accounts", "tactic": "Initial Access"},
                    {"id": "T1087", "name": "Account Discovery", "tactic": "Discovery"},
                    {"id": "T1114", "name": "Email Collection", "tactic": "Collection"}
                ]
            }
            alerts.append(alert)
        
        return alerts
    
    def save_alerts(self, output_file: str = "outputs/alerts.jsonl"):
        """Save alerts to JSONL file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            for alert in self.alerts:
                f.write(json.dumps(alert) + '\n')
        
        print(f"[DETECT] Saved {len(self.alerts)} alerts to {output_file}")


if __name__ == "__main__":
    # Load data
    scored_events = []
    with open("data/normalized/events.jsonl", 'r') as f:
        for line in f:
            scored_events.append(json.loads(line))
    
    with open("outputs/risk_scores.json", 'r') as f:
        scores = json.load(f)
    
    with open("outputs/correlations.json", 'r') as f:
        correlations = json.load(f)
    
    # Detect
    detector = AlertDetector()
    alerts = detector.detect(scored_events, scores['entity_scores'], correlations)
    
    # Save
    detector.save_alerts()
    
    # Display
    print("\n[ALERTS GENERATED]")
    for alert in alerts:
        print(f"\n{alert['name']} ({alert['severity'].upper()})")
        print(f"  User: {alert['entity']['user']}")
        print(f"  Hypothesis: {alert['hypothesis'][:100]}...")
        print(f"  MITRE: {', '.join([t['id'] for t in alert['mitre']])}")
