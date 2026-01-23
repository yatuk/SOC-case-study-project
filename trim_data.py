#!/usr/bin/env python3
"""
Trim large data files for better performance
"""
import json
from pathlib import Path

def trim_file(filepath, max_items):
    """Reduce items in a JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        original_count = len(data) if isinstance(data, list) else len(data.get('entities', []))
        
        if isinstance(data, list):
            data = data[:max_items]
        elif 'entities' in data:
            data['entities'] = data['entities'][:max_items]
        elif 'correlations' in data:
            # Keep correlations structure but limit entries
            if isinstance(data['correlations'], dict):
                pass  # Keep as is if it's a dict
            elif isinstance(data['correlations'], list):
                data['correlations'] = data['correlations'][:max_items]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        new_count = len(data) if isinstance(data, list) else len(data.get('entities', []))
        print(f"✓ {filepath.name}: {original_count} → {new_count}")
        
    except Exception as e:
        print(f"✗ {filepath.name}: {e}")

# Trim large files
data_dir = Path("frontend/public/dashboard_data")

print("Optimizing data files...")
trim_file(data_dir / "iocs.json", 20)
trim_file(data_dir / "entities.json", 30)
trim_file(data_dir / "correlations.json", 20)
trim_file(data_dir / "edr_devices.json", 15)

print("\n✅ Optimization complete!")
