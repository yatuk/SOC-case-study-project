#!/usr/bin/env python3
"""
Trim JSONL files to reduce size
"""
import json
from pathlib import Path

def trim_jsonl(filepath, max_lines):
    """Keep only first N lines of JSONL file"""
    try:
        lines = []
        with open(filepath, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                if i >= max_lines:
                    break
                lines.append(line)
        
        original = sum(1 for _ in open(filepath, 'r', encoding='utf-8'))
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        print(f"✓ {filepath.name}: {original} → {len(lines)} lines")
        
    except Exception as e:
        print(f"✗ {filepath.name}: {e}")

# Trim JSONL files
data_dir = Path("frontend/public/dashboard_data")

print("Trimming JSONL files...")
trim_jsonl(data_dir / "events.jsonl", 100)  # Keep only 100 events
trim_jsonl(data_dir / "iocs.jsonl", 50)     # Keep only 50 IOCs
trim_jsonl(data_dir / "alerts.jsonl", 20)   # Keep only 20 alerts

print("\n✅ JSONL optimization complete!")
print("Refresh browser (F5) for faster loading")
