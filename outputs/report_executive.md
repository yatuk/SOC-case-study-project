# Guvenlik Olayi Yonetici Ozeti

**Olusturulma:** 2026-01-22 18:12:08

## Genel Bakis

Bu rapor, Anadolu Finans Holding altyapisinda son 14 gun icinde tespit edilen guvenlik olaylarini ozetlemektedir.

**ONEMLI: Bu tamamen KURGUSAL bir veri setidir. Gercek sirketlerle iliskisi yoktur.**

### Normalize Edilen Veri Setleri
- **Toplam Dosya**: 8
- **Toplam Olay**: 3051
- **Toplam IOC**: 4000
- **Pseudonimizasyon**: Aktif

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
