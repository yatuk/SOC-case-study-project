"""
KPI timeseries generator - creates time-based metrics for trending.
"""

import json
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict


def generate_kpi_timeseries(events, alerts):
    """Generate hourly/daily KPI metrics."""
    # Organize events by hour
    hourly_events = defaultdict(int)
    hourly_alerts = defaultdict(int)
    daily_risk = defaultdict(int)
    
    for event in events:
        timestamp = datetime.fromisoformat(event["timestamp"])
        hour_key = timestamp.strftime("%Y-%m-%d %H:00")
        day_key = timestamp.strftime("%Y-%m-%d")
        
        hourly_events[hour_key] += 1
    
    for alert in alerts:
        if "time_window" in alert and "start" in alert["time_window"]:
            timestamp = datetime.fromisoformat(alert["time_window"]["start"])
            hour_key = timestamp.strftime("%Y-%m-%d %H:00")
            day_key = timestamp.strftime("%Y-%m-%d")
            
            hourly_alerts[hour_key] += 1
            
            # Assign risk score based on severity
            severity_risk = {
                "critical": 100,
                "high": 75,
                "medium": 50,
                "low": 25
            }
            daily_risk[day_key] += severity_risk.get(alert.get("severity", "low"), 25)
    
    # Convert to sorted lists
    timeseries = {
        "events_per_hour": [
            {"timestamp": ts, "count": count}
            for ts, count in sorted(hourly_events.items())
        ],
        "alerts_per_hour": [
            {"timestamp": ts, "count": count}
            for ts, count in sorted(hourly_alerts.items())
        ],
        "risk_per_day": [
            {"date": date, "risk_score": score}
            for date, score in sorted(daily_risk.items())
        ]
    }
    
    return timeseries


def main():
    """Generate KPI timeseries from events and alerts."""
    # Load events
    events_file = Path("outputs") / "events.jsonl"
    events = []
    if events_file.exists():
        with open(events_file) as f:
            for line in f:
                events.append(json.loads(line))
    
    # Load alerts
    alerts_file = Path("outputs") / "alerts.jsonl"
    alerts = []
    if alerts_file.exists():
        with open(alerts_file) as f:
            for line in f:
                alerts.append(json.loads(line))
    
    timeseries = generate_kpi_timeseries(events, alerts)
    
    # Save
    output_file = Path("outputs") / "kpi_timeseries.json"
    with open(output_file, "w") as f:
        json.dump(timeseries, f, indent=2)
    
    print(f"[OK] Generated timeseries with {len(timeseries['events_per_hour'])} hourly data points")
    print(f"[OK] Saved to {output_file}")


if __name__ == "__main__":
    main()
