#!/usr/bin/env python3
"""
SOC Case Study - Master Pipeline Orchestrator
Generates comprehensive synthetic SIEM/SOAR/EDR data with Turkish company simulation.
Now includes dataset normalization from real-looking security logs.

Usage: python run_pipeline.py
"""

import sys
import shutil
import json
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))


def print_banner():
    banner = """
================================================================
    SOC VAKA CALISMASI - GUVENLIK PLATFORMU DEMO
    SIEM + SOAR + EDR Sentetik Veri Ureteci
    
    Sirket: Anadolu Finans Holding (KURGUSAL)
================================================================
"""
    print(banner)


def normalize_datasets():
    """
    Step 0: Normalize external datasets if datasets/ folder exists.
    Returns True if normalization was performed.
    """
    datasets_dir = Path("datasets")
    
    if not datasets_dir.exists():
        print("[BILGI] datasets/ klasoru bulunamadi, normalizasyon atlaniyor")
        return False
    
    # Check if there are any files
    files = list(datasets_dir.glob("**/*"))
    files = [f for f in files if f.is_file() and f.suffix.lower() in ['.json', '.jsonl', '.csv']]
    
    if not files:
        print("[BILGI] datasets/ klasorunde dosya bulunamadi")
        return False
    
    print(f"[NORMALIZASYON] {len(files)} dataset dosyasi bulundu")
    
    try:
        from src.normalize.normalize_datasets import main as normalize_main
        from src.normalize.utils import reset_counters
        from src.normalize.pseudo import clear_cache
        
        # Reset state
        reset_counters()
        clear_cache()
        
        # Run normalization
        result = normalize_main()
        
        return result == 0
        
    except Exception as e:
        print(f"[UYARI] Normalizasyon hatasi: {e}")
        import traceback
        traceback.print_exc()
        return False


def merge_normalized_with_synthetic():
    """
    Merge normalized events with synthetic events.
    The synthetic generator overwrites events.jsonl, so we need to restore normalized events.
    Also enriches events with IOC matches.
    """
    output_dir = Path("outputs")
    
    # Load synthetic events (just written by generator)
    events_file = output_dir / "events.jsonl"
    synthetic_events = []
    
    if events_file.exists():
        with open(events_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        synthetic_events.append(json.loads(line))
                    except:
                        pass
    
    print(f"[BIRLESTIRME] {len(synthetic_events)} sentetik olay yuklendi")
    
    # Re-run normalization to get normalized events (they were saved earlier but overwritten)
    # Load them from the temp location or re-generate
    normalized_events = []
    
    datasets_dir = Path("datasets")
    if datasets_dir.exists():
        try:
            from src.normalize.normalize_datasets import process_file, DatasetProfiler, discover_datasets
            from src.normalize.utils import reset_counters
            from src.normalize.pseudo import clear_cache
            
            # Reset for clean IDs
            reset_counters()
            clear_cache()
            
            profiler = DatasetProfiler()
            files = discover_datasets(datasets_dir)
            
            for filepath in files:
                events, _ = process_file(filepath, profiler)
                normalized_events.extend(events)
            
            print(f"  -> {len(normalized_events)} normalize edilmis olay yuklendi")
        except Exception as e:
            print(f"  -> Normalizasyon hatasi: {e}")
    
    # Load IOCs for enrichment
    iocs_file = output_dir / "iocs.jsonl"
    iocs = {}
    
    if iocs_file.exists():
        print("[BIRLESTIRME] IOC'ler yukleniyor...")
        with open(iocs_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        ioc = json.loads(line)
                        # Index by domain and URL for quick lookup
                        if ioc.get('domain'):
                            iocs[ioc['domain'].lower()] = ioc
                        if ioc.get('value'):
                            iocs[ioc['value'].lower()[:100]] = ioc
                    except:
                        pass
        print(f"  -> {len(iocs)} IOC indexed")
    
    # Enrich normalized events with IOC matches
    enriched_count = 0
    for event in normalized_events:
        # Check network domain/URL
        network = event.get('network', {})
        domain = network.get('domain', '').lower()
        
        if domain and domain in iocs:
            ioc = iocs[domain]
            event.setdefault('tags', [])
            if 'ioc_match' not in event['tags']:
                event['tags'].append('ioc_match')
            if ioc.get('label') == 'phishing':
                event['tags'].append('phishing_domain')
                event['severity'] = max(event.get('severity', 0), 7)
            enriched_count += 1
    
    if enriched_count > 0:
        print(f"  -> {enriched_count} olay IOC ile zenginlestirildi")
    
    # Merge: normalized events first (they have richer structure), then synthetic
    all_events = normalized_events + synthetic_events
    
    # Write merged events
    with open(events_file, 'w', encoding='utf-8') as f:
        for event in all_events:
            f.write(json.dumps(event, ensure_ascii=False) + '\n')
    
    print(f"  -> {len(all_events)} toplam olay birlestirildi")
    
    return len(all_events), len(iocs)


def export_to_dashboard():
    """Export outputs to docs/dashboard_data/ for GitHub Pages."""
    source_dir = Path("outputs")
    dest_dir = Path("docs") / "dashboard_data"
    
    if not source_dir.exists():
        print("[HATA] outputs/ klasoru bulunamadi")
        return False
    
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Files to export
    export_files = [
        "summary.json",
        "alerts.jsonl",
        "risk_scores.json",
        "correlations.json",
        "events.jsonl",
        "iocs.jsonl",
        "cases.json",
        "playbook_runs.jsonl",
        "kpi_timeseries.json",
        "edr_devices.json",
        "mitre_coverage.json",
        "playbooks.json",
        "report_executive.md",
        "report_technical.md",
        "dataset_profile.json",  # New: normalization profile
    ]
    
    count = 0
    for filename in export_files:
        source_file = source_dir / filename
        if source_file.exists():
            dest_file = dest_dir / filename
            shutil.copy2(source_file, dest_file)
            count += 1
    
    # Also copy any additional files
    for file in source_dir.glob("*"):
        if file.is_file() and file.name not in export_files:
            dest_file = dest_dir / file.name
            shutil.copy2(file, dest_file)
            count += 1
    
    print(f"[EXPORT] {count} dosya {dest_dir} klasorune kopyalandi")
    return True


def generate_reports():
    """Generate markdown reports in Turkish."""
    output_dir = Path("outputs")
    
    # Load dataset profile for report
    profile_stats = ""
    profile_file = output_dir / "dataset_profile.json"
    if profile_file.exists():
        try:
            with open(profile_file, 'r', encoding='utf-8') as f:
                profile = json.load(f)
            profile_stats = f"""
### Normalize Edilen Veri Setleri
- **Toplam Dosya**: {profile.get('total_files', 0)}
- **Toplam Olay**: {profile.get('total_events_normalized', 0)}
- **Toplam IOC**: {profile.get('total_iocs_extracted', 0)}
- **Pseudonimizasyon**: {'Aktif' if profile.get('pseudonymization_enabled') else 'Devre Disi'}
"""
        except:
            pass
    
    # Executive Report
    exec_report = f"""# Guvenlik Olayi Yonetici Ozeti

**Olusturulma:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Genel Bakis

Bu rapor, Anadolu Finans Holding altyapisinda son 14 gun icinde tespit edilen guvenlik olaylarini ozetlemektedir.

**ONEMLI: Bu tamamen KURGUSAL bir veri setidir. Gercek sirketlerle iliskisi yoktur.**
{profile_stats}
## Temel Bulgular

- **9 Aktif Guvenlik Olayi** inceleme gerektirmektedir
- **Coklu Saldiri Vektorleri**: Oltalama, kimlik bilgisi hirsizligi, zararli yazilim
- **Yuksek Riskli Varliklar**: Finans, BT ve Yonetim departmanlarinda tanimlanmistir

## Olay Kategorileri

1. **Oltalama Saldirilari (3 vaka)** - Kimlik bilgisi toplama, OAuth izin kotu kullanimi
2. **Hesap Ele Gecirme (2 vaka)** - MFA yorgunlugu, parola puskürtme
3. **Zararli Yazilim/C2 Aktivitesi (1 vaka)** - Makro tabanli zararli yazilim ve C2 beacon
4. **Veri Sizdirma (2 vaka)** - BEC havale dolandiriciligi, bulut depolama kotu kullanimi
5. **Yanlis Pozitif (1 vaka)** - VPN kaynakli imkansiz seyahat

## Onerilen Aksiyonlar

1. Tum hesaplarda oltalamaya direncli MFA uygula
2. Kosullu erisim politikalari devreye al
3. Uc nokta algilama ve yanit cozumu dagit
4. Guvenlik farkindalik egitimi duzenle

## Zaman Cizelgesi

Tum olaylar 14 gunluk gozlem penceresinde gerceklesti. En kritik olay, aktif C2 iletisimi olan zararli yazilim enfeksiyonudur.

---
*Bu bir egitim/simulasyon amacli sentetik veri setidir.*
"""
    
    with open(output_dir / "report_executive.md", "w", encoding="utf-8") as f:
        f.write(exec_report)
    
    # Technical Report
    tech_report = f"""# Teknik Olay Analiz Raporu

**Olusturulma:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Algilama Genel Bakisi

### Analiz Edilen Veri Kaynaklari
- E-posta Gecidi Kayitlari
- Kimlik Saglayici (IdP) Kayitlari
- M365 Denetim Kayitlari
- Proxy/DNS Kayitlari
- EDR Telemetrisi
- Azure AD Denetim Kayitlari (Normalize edilmis)
- Windows Guvenlik Olaylari (Normalize edilmis)
- Microsoft 365 Defender Kayitlari (Normalize edilmis)
{profile_stats}
### Olay Istatistikleri
- Toplam Olay: 500+
- Guvenlik Uyarilari: 20+
- Aktif Vakalar: 9
- Etkilenen Kullanicilar: 10+
- Etkilenen Cihazlar: 15+

## MITRE ATT&CK Kapsami

### Tespit Edilen Teknikler
- T1566.001 - Oltalama: Hedefli Ek Dosya
- T1566.002 - Oltalama: Hedefli Baglanti
- T1078 - Gecerli Hesaplar
- T1528 - Uygulama Erisim Jetonu Calma
- T1098 - Hesap Manipulasyonu
- T1114.002 - Uzak E-posta Erisimi
- T1059.001 - PowerShell
- T1547.001 - Kayit Defteri Run Anahtarlari
- T1071.001 - Web Protokolleri (C2)
- T1567.002 - Bulut Depolama Uzerinden Sizdirma
- T1003.006 - DCSync (Normalize edilmis veriden)
- T1550.001 - Alternatif Kimlik Dogrulama Materyali (OAuth)

## Uzlasma Gostergeleri (IOC)

### Zararli Alan Adlari
- anadolu-giris-dogrula.example.tk (oltalama)
- cdn-guncelleme.example.cf (C2)
- fatura-odeme-sistemi.example.cf (BEC)

### Suphe Edilen IP'ler
- 198.51.100.45 (Romanya)
- 203.0.113.180 (Rusya)
- 198.51.100.91 (Cin)

## Inceleme Onerileri

1. **Uc Nokta Adli Bilisimi** - Enfekte cihazlarda tam bellek ve disk analizi
2. **Ag Analizi** - Tum C2 beacon trafik kaliplarini incele
3. **E-posta Denetimi** - Ele gecirilen hesaplardan gelen tum e-postalari izle
4. **Erisim Incelemesi** - Tum admin rol atamalarini denetle
5. **LDAP/AD Incelemesi** - Supheli DCSync aktivitelerini arastir

---
*Bu bir egitim/simulasyon amacli sentetik veri setidir.*
"""
    
    with open(output_dir / "report_technical.md", "w", encoding="utf-8") as f:
        f.write(tech_report)
    
    print("[RAPOR] Yonetici ve teknik raporlar olusturuldu")


def main():
    print_banner()
    
    print("\n[BASLANGIC] SOC veri uretim hatti calistiriliyor...\n")
    
    try:
        # Step 0: Normalize external datasets if present
        print("=" * 60)
        print("ADIM 0: DATASET NORMALIZASYONU (Opsiyonel)")
        print("=" * 60)
        
        normalized = normalize_datasets()
        
        # Step 1: Generate synthetic data
        print("\n" + "=" * 60)
        print("ADIM 1: SENTETIK VERI URETIMI")
        print("=" * 60)
        
        from turkish_soc_generator import TurkishSOCGenerator, save_outputs
        
        gen = TurkishSOCGenerator()
        data = gen.generate_all()
        save_outputs(data)
        
        # Step 1.5: Merge and enrich if normalized data exists
        if normalized:
            print("\n" + "=" * 60)
            print("ADIM 1.5: VERI BIRLESTIRME VE ZENGINLESTIRME")
            print("=" * 60)
            
            events_count, iocs_count = merge_normalized_with_synthetic()
            print(f"  Toplam olaylar: {events_count}, Toplam IOC'ler: {iocs_count}")
        
        # Step 2: Generate reports
        print("\n" + "=" * 60)
        print("ADIM 2: RAPOR URETIMI")
        print("=" * 60)
        
        generate_reports()
        
        # Step 3: Export to dashboard (docs/ for GitHub Pages)
        print("\n" + "=" * 60)
        print("ADIM 3: DASHBOARD EXPORT")
        print("=" * 60)
        
        if export_to_dashboard():
            print("\n[BASARI] Pipeline tamamlandi!")
            print("\n[SONRAKI ADIMLAR]")
            print("  1. cd docs && python -m http.server 8000")
            print("  2. http://localhost:8000 adresini acin")
            print("  3. Veya GitHub Pages dagitimi icin commit ve push yapin")
        
        return 0
        
    except Exception as e:
        print(f"\n[HATA] Pipeline basarisiz: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
