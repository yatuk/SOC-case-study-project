"""
SOC Case Study Pipeline - Correlation Module
Links related events by user, IP, session, and time windows.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Set
from datetime import datetime, timedelta
from collections import defaultdict


class EventCorrelator:
    """Correlates events across multiple sources."""
    
    def __init__(self):
        self.correlation_graph = defaultdict(lambda: {
            "events": [],
            "users": set(),
            "ips": set(),
            "devices": set(),
            "sessions": set()
        })
    
    def correlate(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Correlate events by multiple dimensions:
        - User account
        - Source IP
        - Device
        - Session ID
        - Time proximity
        """
        
        # Group by user
        user_timelines = defaultdict(list)
        for event in events:
            user_email = event['user'].get('email')
            if user_email:
                user_timelines[user_email].append(event)
        
        # Sort each user's timeline
        for user in user_timelines:
            user_timelines[user].sort(key=lambda x: x['timestamp'])
        
        # Find correlation patterns
        correlations = []
        
        for user, timeline in user_timelines.items():
            # Pattern 1: Email -> Web click -> Login sequence
            email_click_login = self._find_email_click_login_chain(timeline)
            if email_click_login:
                correlations.append({
                    "correlation_id": f"phishing_chain_{user}",
                    "pattern": "phishing_click_login",
                    "user": user,
                    "events": email_click_login,
                    "description": "User received phishing email, clicked link, and suspicious login followed"
                })
            
            # Pattern 2: Impossible travel
            impossible_travel = self._find_impossible_travel(timeline)
            if impossible_travel:
                correlations.append({
                    "correlation_id": f"impossible_travel_{user}",
                    "pattern": "impossible_travel",
                    "user": user,
                    "events": impossible_travel,
                    "description": "User authenticated from geographically distant locations within short timeframe"
                })
            
            # Pattern 3: Post-compromise activity
            post_compromise = self._find_post_compromise_activity(timeline)
            if post_compromise:
                correlations.append({
                    "correlation_id": f"post_compromise_{user}",
                    "pattern": "post_compromise_activity",
                    "user": user,
                    "events": post_compromise,
                    "description": "Suspicious mailbox activity detected after suspicious login"
                })
        
        print(f"[CORRELATE] Found {len(correlations)} correlation patterns")
        for corr in correlations:
            print(f"  - {corr['pattern']}: {corr['description']}")
        
        return {
            "correlations": correlations,
            "user_timelines": {k: [e['event_id'] for e in v] for k, v in user_timelines.items()}
        }
    
    def _find_email_click_login_chain(self, timeline: List[Dict[str, Any]]) -> List[str]:
        """Find phishing email -> click -> login pattern."""
        event_ids = []
        
        # Find phishing email
        phishing_emails = [e for e in timeline if e['event_type'] == 'email.inbound' and e['ioc_matches']]
        
        for email_event in phishing_emails:
            email_time = datetime.fromisoformat(email_event['timestamp'].replace('Z', '+00:00'))
            
            # Look for web click within 30 minutes
            web_clicks = [e for e in timeline 
                         if e['event_type'].startswith('web.') 
                         and e['ioc_matches']
                         and abs((datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) - email_time).total_seconds()) < 1800]
            
            if web_clicks:
                # Look for login within 1 hour of click
                click_time = datetime.fromisoformat(web_clicks[0]['timestamp'].replace('Z', '+00:00'))
                logins = [e for e in timeline
                         if 'auth.login' in e['event_type']
                         and abs((datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) - click_time).total_seconds()) < 3600]
                
                if logins:
                    event_ids = [email_event['event_id'], web_clicks[0]['event_id']] + [l['event_id'] for l in logins[:3]]
                    break
        
        return event_ids
    
    def _find_impossible_travel(self, timeline: List[Dict[str, Any]]) -> List[str]:
        """Find logins from geographically distant locations within short time."""
        event_ids = []
        
        logins = [e for e in timeline if e['event_type'] == 'auth.login_success']
        
        for i in range(len(logins) - 1):
            login1 = logins[i]
            login2 = logins[i + 1]
            
            geo1 = login1['network']['src_geo'].get('country')
            geo2 = login2['network']['src_geo'].get('country')
            
            time1 = datetime.fromisoformat(login1['timestamp'].replace('Z', '+00:00'))
            time2 = datetime.fromisoformat(login2['timestamp'].replace('Z', '+00:00'))
            
            time_diff_minutes = abs((time2 - time1).total_seconds() / 60)
            
            # Different countries within 60 minutes = impossible travel
            if geo1 and geo2 and geo1 != geo2 and time_diff_minutes < 60:
                event_ids = [login1['event_id'], login2['event_id']]
                break
        
        return event_ids
    
    def _find_post_compromise_activity(self, timeline: List[Dict[str, Any]]) -> List[str]:
        """Find suspicious mailbox activity after suspicious login."""
        event_ids = []
        
        # Find suspicious logins (IOC match or new device)
        suspicious_logins = [e for e in timeline 
                            if e['event_type'] == 'auth.login_success' 
                            and (e['ioc_matches'] or e['device']['name'] == 'unknown')]
        
        for login in suspicious_logins:
            login_time = datetime.fromisoformat(login['timestamp'].replace('Z', '+00:00'))
            
            # Look for mailbox rule creation or bulk access within 1 hour
            mailbox_activities = [e for e in timeline
                                 if e['source_type'] == 'cloud_mailbox'
                                 and 'rule' in e['event_type'].lower() or 'search' in e['event_type'].lower()
                                 and abs((datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')) - login_time).total_seconds()) < 3600]
            
            if mailbox_activities:
                event_ids = [login['event_id']] + [m['event_id'] for m in mailbox_activities]
                break
        
        return event_ids
    
    def save_correlations(self, correlations: Dict[str, Any], output_file: str = "outputs/correlations.json"):
        """Save correlation analysis."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(correlations, f, indent=2, default=str)
        
        print(f"[CORRELATE] Saved correlation analysis to {output_file}")


if __name__ == "__main__":
    # Load normalized events
    events = []
    with open("data/normalized/events.jsonl", 'r') as f:
        for line in f:
            events.append(json.loads(line))
    
    # Correlate
    correlator = EventCorrelator()
    correlations = correlator.correlate(events)
    
    # Save
    correlator.save_correlations(correlations)
    
    # Display
    print("\n[CORRELATION PATTERNS]")
    for corr in correlations['correlations']:
        print(f"\n{corr['correlation_id']}:")
        print(f"  Pattern: {corr['pattern']}")
        print(f"  User: {corr['user']}")
        print(f"  Events: {len(corr['events'])}")
        print(f"  Description: {corr['description']}")
