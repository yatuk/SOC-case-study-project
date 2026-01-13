"""
SOC Case Study Pipeline - Risk Scoring Module
Calculates risk scores with explainability.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from collections import defaultdict


class RiskScorer:
    """Calculates risk scores for events and entities."""
    
    def __init__(self):
        self.scoring_rules = {
            "ioc_match": 40,
            "new_device": 30,
            "new_geo": 30,
            "impossible_travel": 50,
            "mailbox_rule_external": 35,
            "failed_mfa_then_success": 25,
            "bulk_mailbox_export": 30,
            "phishing_link_click": 35,
            "auth_failure": 10,
            "off_hours_access": 15
        }
        
        self.severity_thresholds = {
            "low": (0, 30),
            "medium": (30, 60),
            "high": (60, 80),
            "critical": (80, 100)
        }
    
    def score_events(self, events: List[Dict[str, Any]], correlations: Dict[str, Any]) -> Dict[str, Any]:
        """Score all events and calculate entity risk scores."""
        
        scored_events = []
        entity_scores = defaultdict(lambda: {"score": 0, "reasons": [], "events": []})
        
        for event in events:
            score, reasons = self._calculate_event_score(event, events, correlations)
            
            scored_event = event.copy()
            scored_event['risk_score'] = score
            scored_event['score_breakdown'] = reasons
            scored_event['severity'] = self._get_severity(score)
            
            scored_events.append(scored_event)
            
            # Update entity score
            user_email = event['user'].get('email')
            if user_email:
                entity_scores[user_email]['score'] = max(entity_scores[user_email]['score'], score)
                entity_scores[user_email]['reasons'].extend(reasons)
                entity_scores[user_email]['events'].append(event['event_id'])
        
        # Calculate final entity scores
        for entity in entity_scores:
            # Remove duplicate reasons
            unique_reasons = []
            seen = set()
            for reason in entity_scores[entity]['reasons']:
                key = f"{reason['rule']}:{reason['points']}"
                if key not in seen:
                    unique_reasons.append(reason)
                    seen.add(key)
            
            entity_scores[entity]['reasons'] = unique_reasons
            entity_scores[entity]['severity'] = self._get_severity(entity_scores[entity]['score'])
        
        print(f"[SCORE] Calculated risk scores for {len(scored_events)} events")
        print(f"[SCORE] High-risk entities: {sum(1 for e in entity_scores.values() if e['severity'] in ['high', 'critical'])}")
        
        return {
            "scored_events": scored_events,
            "entity_scores": dict(entity_scores)
        }
    
    def _calculate_event_score(self, event: Dict[str, Any], all_events: List[Dict[str, Any]], 
                               correlations: Dict[str, Any]) -> Tuple[int, List[Dict[str, Any]]]:
        """Calculate risk score for a single event with breakdown."""
        score = 0
        reasons = []
        
        # Rule 1: IOC match
        if event['ioc_matches']:
            points = self.scoring_rules['ioc_match']
            score += points
            reasons.append({
                "rule": "ioc_match",
                "points": points,
                "description": f"Event matches known IOC: {', '.join([m['value'] for m in event['ioc_matches']])}"
            })
        
        # Rule 2: New device
        if event['event_type'] == 'auth.login_success' and event['device']['name'] == 'unknown':
            points = self.scoring_rules['new_device']
            score += points
            reasons.append({
                "rule": "new_device",
                "points": points,
                "description": "Login from previously unseen device"
            })
        
        # Rule 3: New geographic location (non-corporate IP)
        if event['event_type'] == 'auth.login_success':
            src_ip = event['network']['src_ip']
            if not src_ip.startswith('192.168.') and not src_ip.startswith('10.'):
                points = self.scoring_rules['new_geo']
                score += points
                geo = event['network']['src_geo']
                reasons.append({
                    "rule": "new_geo",
                    "points": points,
            "description": f"Login from non-corporate network: {geo.get('country', 'Unknown')}"
                })
        
        # Rule 4: Impossible travel (check correlations)
        user_email = event['user'].get('email')
        if user_email and event['event_type'] == 'auth.login_success':
            for corr in correlations.get('correlations', []):
                if corr['pattern'] == 'impossible_travel' and corr['user'] == user_email:
                    if event['event_id'] in corr['events']:
                        points = self.scoring_rules['impossible_travel']
                        score += points
                        reasons.append({
                            "rule": "impossible_travel",
                            "points": points,
                            "description": "Impossible travel detected: logins from distant locations within short time"
                        })
                        break
        
        # Rule 5: Mailbox rule to external domain
        if 'mailbox.new_inboxrule' in event['event_type']:
            rule_actions = event['details'].get('rule_actions', '')
            if 'ForwardTo' in rule_actions and '@' in rule_actions:
                # Check if external domain
                forward_email = rule_actions.split(':')[-1].strip()
                if 'acmecorp.example.com' not in forward_email:
                    points = self.scoring_rules['mailbox_rule_external']
                    score += points
                    reasons.append({
                        "rule": "mailbox_rule_external",
                        "points": points,
                        "description": f"Mailbox rule forwarding to external address: {forward_email}"
                    })
        
        # Rule 6: Failed MFA then success
        if event['event_type'] == 'auth.login_success':
            event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00'))
            
            # Look for recent failures
            recent_failures = [e for e in all_events
                              if e['user'].get('email') == user_email
                              and e['event_type'] == 'auth.login_fail'
                              and abs((datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) - event_time).total_seconds()) < 300]
            
            if len(recent_failures) >= 2:
                points = self.scoring_rules['failed_mfa_then_success']
                score += points
                reasons.append({
                    "rule": "failed_mfa_then_success",
                    "points": points,
                    "description": f"{len(recent_failures)} failed login attempts followed by success"
                })
        
        # Rule 7: Bulk mailbox export
        if 'mailboxitemsaccessed' in event['event_type']:
            operation_count = event['details'].get('operation_count', 0)
            if operation_count > 20:
                points = self.scoring_rules['bulk_mailbox_export']
                score += points
                reasons.append({
                    "rule": "bulk_mailbox_export",
                    "points": points,
                    "description": f"Bulk mailbox access: {operation_count} items"
                })
        
        # Rule 8: Phishing link click
        if event['event_type'].startswith('web.') and event['ioc_matches']:
            points = self.scoring_rules['phishing_link_click']
            score += points
            reasons.append({
                "rule": "phishing_link_click",
                "points": points,
                "description": "User clicked known phishing link"
            })
        
        # Cap score at 100
        score = min(score, 100)
        
        return score, reasons
    
    def _get_severity(self, score: int) -> str:
        """Map score to severity level."""
        for severity, (low, high) in self.severity_thresholds.items():
            if low <= score < high:
                return severity
        return "critical"
    
    def save_scores(self, scores: Dict[str, Any], output_file: str = "outputs/risk_scores.json"):
        """Save risk scores."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(scores, f, indent=2, default=str)
        
        print(f"[SCORE] Saved risk scores to {output_file}")


if __name__ == "__main__":
    # Load normalized events
    events = []
    with open("data/normalized/events.jsonl", 'r') as f:
        for line in f:
            events.append(json.loads(line))
    
    # Load correlations
    with open("outputs/correlations.json", 'r') as f:
        correlations = json.load(f)
    
    # Score
    scorer = RiskScorer()
    scores = scorer.score_events(events, correlations)
    
    # Save
    scorer.save_scores(scores)
    
    # Display top risky entities
    print("\n[HIGH-RISK ENTITIES]")
    for entity, data in sorted(scores['entity_scores'].items(), key=lambda x: x[1]['score'], reverse=True):
        if data['severity'] in ['high', 'critical']:
            print(f"\n{entity}: {data['score']}/100 ({data['severity'].upper()})")
            for reason in data['reasons']:
                print(f"  + {reason['description']} (+{reason['points']})")
