#!/usr/bin/env python3
"""
SOC Case Study - Master Pipeline Orchestrator
Generates comprehensive synthetic SIEM/SOAR/EDR data with Turkish company simulation.

Usage: python run_pipeline.py
"""

import sys
import shutil
from pathlib import Path

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


def export_to_dashboard():
    """Export outputs to docs/dashboard_data/ for GitHub Pages."""
    source_dir = Path("outputs")
    dest_dir = Path("docs") / "dashboard_data"
    
    if not source_dir.exists():
        print("[HATA] outputs/ klasoru bulunamadi")
        return False
    
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    count = 0
    for file in source_dir.glob("*"):
        if file.is_file():
            dest_file = dest_dir / file.name
            shutil.copy2(file, dest_file)
            count += 1
    
    print(f"[EXPORT] {count} dosya {dest_dir} klasorune kopyalandi")
    return True


def generate_reports():
    """Generate markdown reports in Turkish."""
    from datetime import datetime
    
    output_dir = Path("outputs")
    
    # Executive Report
    exec_report = f"""# Guvenlik Olayi Yonetici Ozeti

**Olusturulma:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Genel Bakis

Bu rapor, Anadolu Finans Holding altyapisinda son 14 gun icinde tespit edilen guvenlik olaylarini ozetlemektedir.

**ONEMLI: Bu tamamen KURGUSAL bir veri setidir. Gercek sirketlerle iliskisi yoktur.**

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
        # Generate synthetic data
        print("=" * 60)
        print("ADIM 1: SENTETIK VERI URETIMI")
        print("=" * 60)
        
        from turkish_soc_generator import TurkishSOCGenerator, save_outputs
        
        gen = TurkishSOCGenerator()
        data = gen.generate_all()
        save_outputs(data)
        
        # Generate reports
        print("\n" + "=" * 60)
        print("ADIM 2: RAPOR URETIMI")
        print("=" * 60)
        
        generate_reports()
        
        # Export to dashboard (docs/ for GitHub Pages)
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
