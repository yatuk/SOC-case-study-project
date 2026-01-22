"""
SOC Console - Dataset Normalization Pipeline
Main entry point for normalizing disparate security datasets into canonical format.

Usage:
    python -m src.normalize.normalize_datasets [--datasets-dir DATASETS_DIR] [--output-dir OUTPUT_DIR]
"""

import os
import sys
import json
import csv
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.normalize.utils import reset_counters, generate_event_id, generate_ioc_id
from src.normalize.pseudo import clear_cache, ALLOW_RAW_DATA
from src.normalize.families import windows, aad, m365defender, phishing_iocs, generic_csv


# Configuration
MAX_EVENTS_PER_FILE = 1000  # Cap to prevent huge output files
MAX_IOCS_PER_FILE = 2000    # Cap IOCs per file
MAX_ROWS_TO_READ = 2000     # Max rows to read from any single file


class DatasetProfiler:
    """Profiles datasets and tracks normalization statistics."""
    
    def __init__(self):
        self.profiles = {}
        self.errors = []
        self.total_events = 0
        self.total_iocs = 0
    
    def add_profile(self, filepath: str, profile: Dict):
        self.profiles[filepath] = profile
    
    def add_error(self, filepath: str, row_num: int, error: str):
        self.errors.append({
            "file": filepath,
            "row": row_num,
            "error": str(error)[:200]
        })
    
    def to_dict(self) -> Dict:
        return {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "pseudonymization_enabled": not ALLOW_RAW_DATA,
            "total_files": len(self.profiles),
            "total_events_normalized": self.total_events,
            "total_iocs_extracted": self.total_iocs,
            "total_errors": len(self.errors),
            "files": self.profiles,
            "errors": self.errors[:100]  # Limit errors in output
        }


def detect_file_type(filepath: Path) -> str:
    """Detect file type from extension."""
    suffix = filepath.suffix.lower()
    if suffix == '.json':
        return 'json'
    elif suffix == '.jsonl':
        return 'jsonl'
    elif suffix == '.csv':
        return 'csv'
    return 'unknown'


def read_json_file(filepath: Path) -> Tuple[List[Dict], str]:
    """Read JSON file (array or JSONL)."""
    records = []
    format_type = 'json'
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read().strip()
        
        # Check if it's a JSON array
        if content.startswith('['):
            try:
                records = json.loads(content)
                format_type = 'json_array'
            except json.JSONDecodeError:
                pass
        
        # If not array, try JSONL
        if not records:
            format_type = 'jsonl'
            for line in content.split('\n'):
                line = line.strip()
                if line:
                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
    
    return records, format_type


def read_csv_file(filepath: Path) -> Tuple[List[Dict], List[str], int]:
    """Read CSV file and return records with headers. Returns (records, headers, total_count)."""
    records = []
    headers = []
    total_count = 0
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        # Use default CSV reader for speed
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        
        for row in reader:
            total_count += 1
            if len(records) < MAX_ROWS_TO_READ:
                records.append(row)
            # Stop counting after a reasonable limit to save time
            if total_count >= MAX_ROWS_TO_READ * 10:
                total_count = -1  # Indicate "many more"
                break
    
    return records, headers, total_count if total_count > 0 else len(records)


def detect_json_family(records: List[Dict]) -> str:
    """Detect the family of JSON records."""
    if not records:
        return 'unknown'
    
    # Sample first few records
    sample = records[:5]
    
    for obj in sample:
        if windows.detect_family(obj):
            return 'windows'
        if aad.detect_family(obj):
            return 'aad'
        if m365defender.detect_family(obj):
            return 'm365defender'
    
    return 'unknown'


def detect_csv_family(headers: List[str]) -> str:
    """Detect the family of CSV records."""
    if phishing_iocs.detect_family_csv(headers):
        return 'phishing_url'
    if phishing_iocs.detect_family_features(headers):
        return 'phishing_features'
    if generic_csv.detect_family(headers):
        return 'attack_dataset'
    return 'generic_csv'


def normalize_json_record(obj: Dict, family: str) -> Optional[Dict]:
    """Normalize a single JSON record based on family."""
    if family == 'windows':
        return windows.normalize(obj)
    elif family == 'aad':
        return aad.normalize(obj)
    elif family == 'm365defender':
        return m365defender.normalize(obj)
    return None


def normalize_csv_record(row: Dict, family: str, headers: List[str], row_index: int) -> Tuple[Optional[Dict], bool]:
    """
    Normalize a single CSV record.
    Returns (normalized_record, is_ioc).
    """
    if family == 'phishing_url':
        return phishing_iocs.normalize_url_row(row), True
    elif family == 'phishing_features':
        return phishing_iocs.normalize_features_row(row), True
    elif family == 'attack_dataset':
        return generic_csv.normalize_attack_row(row, row_index), False
    else:
        return generic_csv.normalize_generic_row(row, headers, row_index), False


def process_file(filepath: Path, profiler: DatasetProfiler) -> Tuple[List[Dict], List[Dict]]:
    """
    Process a single file and return normalized events and IOCs.
    """
    events = []
    iocs = []
    
    file_type = detect_file_type(filepath)
    filename = filepath.name
    
    profile = {
        "filename": filename,
        "file_type": file_type,
        "family": "unknown",
        "total_rows": 0,
        "normalized_count": 0,
        "error_count": 0,
        "sample_fields": [],
        "timestamp_formats": []
    }
    
    try:
        if file_type in ['json', 'jsonl']:
            records, format_type = read_json_file(filepath)
            profile["format"] = format_type
            profile["total_rows"] = len(records)
            
            if records:
                # Get sample fields
                sample = records[0]
                profile["sample_fields"] = list(sample.keys())[:20]
            
            # Detect family
            family = detect_json_family(records)
            profile["family"] = family
            
            # Normalize records
            for i, obj in enumerate(records):
                if len(events) >= MAX_EVENTS_PER_FILE:
                    profile["truncated"] = True
                    break
                
                try:
                    normalized = normalize_json_record(obj, family)
                    if normalized:
                        events.append(normalized)
                        profile["normalized_count"] += 1
                except Exception as e:
                    profile["error_count"] += 1
                    profiler.add_error(filename, i, str(e))
        
        elif file_type == 'csv':
            records, headers, total_rows = read_csv_file(filepath)
            profile["format"] = "csv"
            profile["total_rows"] = total_rows
            profile["sampled_rows"] = len(records)
            profile["sample_fields"] = headers[:20]
            if len(records) < total_rows:
                profile["truncated_input"] = True
            
            # Detect family
            family = detect_csv_family(headers)
            profile["family"] = family
            
            # Normalize records
            for i, row in enumerate(records):
                if family in ['phishing_url', 'phishing_features']:
                    if len(iocs) >= MAX_IOCS_PER_FILE:
                        profile["truncated"] = True
                        break
                else:
                    if len(events) >= MAX_EVENTS_PER_FILE:
                        profile["truncated"] = True
                        break
                
                try:
                    normalized, is_ioc = normalize_csv_record(row, family, headers, i)
                    if normalized:
                        if is_ioc:
                            iocs.append(normalized)
                        else:
                            events.append(normalized)
                        profile["normalized_count"] += 1
                except Exception as e:
                    profile["error_count"] += 1
                    profiler.add_error(filename, i, str(e))
        
        else:
            profile["error"] = f"Unsupported file type: {file_type}"
    
    except Exception as e:
        profile["error"] = str(e)[:200]
    
    profiler.add_profile(filename, profile)
    return events, iocs


def discover_datasets(datasets_dir: Path) -> List[Path]:
    """Discover all dataset files in directory."""
    files = []
    
    for root, dirs, filenames in os.walk(datasets_dir):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for filename in filenames:
            if filename.startswith('.'):
                continue
            
            filepath = Path(root) / filename
            suffix = filepath.suffix.lower()
            
            if suffix in ['.json', '.jsonl', '.csv']:
                files.append(filepath)
    
    return sorted(files)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Normalize security datasets')
    parser.add_argument('--datasets-dir', type=str, default='datasets',
                        help='Directory containing datasets')
    parser.add_argument('--output-dir', type=str, default='outputs',
                        help='Output directory for normalized data')
    args = parser.parse_args()
    
    # Resolve paths
    base_dir = Path(__file__).parent.parent.parent
    datasets_dir = base_dir / args.datasets_dir
    output_dir = base_dir / args.output_dir
    
    print(f"\n{'='*60}")
    print("  SOC Console - Dataset Normalization Pipeline")
    print(f"{'='*60}")
    print(f"  Datasets directory: {datasets_dir}")
    print(f"  Output directory: {output_dir}")
    print(f"  Pseudonymization: {'DISABLED' if ALLOW_RAW_DATA else 'ENABLED'}")
    print(f"{'='*60}\n")
    
    # Check datasets directory
    if not datasets_dir.exists():
        print(f"[!] Datasets directory not found: {datasets_dir}")
        print("    Create the directory and add dataset files (JSON, JSONL, CSV)")
        return 1
    
    # Discover datasets
    files = discover_datasets(datasets_dir)
    if not files:
        print(f"[!] No dataset files found in {datasets_dir}")
        return 1
    
    print(f"[*] Found {len(files)} dataset file(s)")
    for f in files:
        print(f"    - {f.name}")
    print()
    
    # Initialize
    reset_counters()
    clear_cache()
    profiler = DatasetProfiler()
    all_events = []
    all_iocs = []
    
    # Process each file
    for filepath in files:
        print(f"[*] Processing: {filepath.name}...")
        events, iocs = process_file(filepath, profiler)
        
        all_events.extend(events)
        all_iocs.extend(iocs)
        
        profile = profiler.profiles.get(filepath.name, {})
        print(f"    Family: {profile.get('family', 'unknown')}")
        print(f"    Rows: {profile.get('total_rows', 0)} -> Normalized: {profile.get('normalized_count', 0)}")
        if profile.get('error_count', 0) > 0:
            print(f"    Errors: {profile.get('error_count', 0)}")
        print()
    
    # Update profiler totals
    profiler.total_events = len(all_events)
    profiler.total_iocs = len(all_iocs)
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write outputs
    print(f"[*] Writing outputs to {output_dir}...")
    
    # Events JSONL
    if all_events:
        events_path = output_dir / 'events.jsonl'
        with open(events_path, 'w', encoding='utf-8') as f:
            for event in all_events:
                f.write(json.dumps(event, ensure_ascii=False) + '\n')
        print(f"    events.jsonl: {len(all_events)} events")
    
    # IOCs JSONL
    if all_iocs:
        iocs_path = output_dir / 'iocs.jsonl'
        with open(iocs_path, 'w', encoding='utf-8') as f:
            for ioc in all_iocs:
                f.write(json.dumps(ioc, ensure_ascii=False) + '\n')
        print(f"    iocs.jsonl: {len(all_iocs)} IOCs")
    
    # Dataset profile
    profile_path = output_dir / 'dataset_profile.json'
    with open(profile_path, 'w', encoding='utf-8') as f:
        json.dump(profiler.to_dict(), f, indent=2, ensure_ascii=False)
    print(f"    dataset_profile.json: profiling report")
    
    print(f"\n{'='*60}")
    print("  Normalization Complete!")
    print(f"{'='*60}")
    print(f"  Total events: {len(all_events)}")
    print(f"  Total IOCs: {len(all_iocs)}")
    print(f"  Total errors: {len(profiler.errors)}")
    print(f"{'='*60}\n")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
