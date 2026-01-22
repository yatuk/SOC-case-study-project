# Teknik Olay Analiz Raporu

**Olusturulma:** 2026-01-22 16:03:23

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
