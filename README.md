# SOC Case Study: Phishing → Account Compromise

# SOC Console - Kurumsal Güvenlik Operasyon Merkezi Simülasyonu

[![Security](https://img.shields.io/badge/Security-SOC%20Platform-blue)]() [![MITRE ATT&CK](https://img.shields.io/badge/MITRE-ATT%26CK-red)]() [![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-black)]()

> **SIEM + SOAR + EDR** simülasyonu. Tamamen statik, tamamen kurgusal, tamamen stdlib.

---

## Ne Bu?

Gerçek dünya güvenlik verilerini normalize eden, sentetik olay üreten ve modern bir SOC dashboard'u sunan **portfolyo projesi**.

- **Dataset Normalizasyonu**: AAD, M365 Defender, Windows Events, Phishing URL'leri → tek canonical şema
- **Pseudonymization**: Tüm veriler Türkçe isimler ve `.example.tr` domain'leriyle maskelenir
- **3500+ Olay**: Normalize edilmiş gerçek formatlar + sentetik saldırı senaryoları
- **4000+ IOC**: Phishing URL dataset'lerinden çıkarılmış göstergeler
- **GitHub Pages**: Backend yok, sadece React + Vite.

## Hızlı Başlangıç

```bash
# Repoyu klonla
git clone https://github.com/yatuk/SOC-case-study-project.git

# Bağımlılıkları yükle (İnternetin yarısını indir)
cd frontend
npm install

# Çalıştır
npm run dev
# http://localhost:5173 adresine git, güneş gözlüklerini tak ve hacker gibi hisset.
```

---

## Hikaye: Bir SOC Analistinin Günlüğü

_Tarih: Pazartesi, 09:00_
Adım Mehmet. Ben bir SOC analistiyim.

Sabah kahvemi içerken SIEM dashboard'una baktım. **4.2 milyon olay**. Güzel, dün sadece 3.8 milyondu. Gelişiyoruz.

**İlk alert:** "Suspicious PowerShell Activity Detected".
Açtım. Bir kullanıcı `Get-Process` çalıştırmış. **KRİTİK SEVİYE**. Tabii ya, adam bilgisayarında hangi programların çalıştığını merak etmiş, kesin APT29.

**İkinci alert:** "Impossible Travel - User logged in from Istanbul and Ankara within 5 minutes".
Kullanıcıyı aradım. "Abi sen nasıl 5 dakikada İstanbul'dan Ankara'ya gittin?"
"VPN kullanıyorum."
"..."
**Alert kapatıldı: False Positive - VPN**

**Üçüncü alert:** "Brute Force Attack Detected - 3 Failed Login Attempts".
Üç. Tam üç deneme. Saldırgan ya çok sabırsız ya da şifresini unutmuş bir çalışan. Spoiler: şifresini unutmuş bir çalışan.

---

_Tarih: Pazartesi, 11:30_
Müdür geldi. "Mehmet, geçen haftaki güvenlik raporunu hazırladın mı?"

Hazırladım tabii. 47 sayfa. İçinde:

- 12 sayfa "her şey yolunda"
- 15 sayfa "potansiyel tehditler" (hepsi false positive)
- 20 sayfa grafik (çünkü yöneticiler grafik seviyor)

En sevdiğim grafik: "Engellenen Saldırılar - Aylık Trend". Çubuklar yukarı gidiyor. Bu iyi bir şey mi? Daha çok saldırı engelliyoruz. Ama aynı zamanda daha çok saldırıya uğruyoruz. Schrödinger'in güvenliği.

---

_Tarih: Pazartesi, 14:00_
**Gerçek bir alert geldi.** Gerçek gerçek.

Bir kullanıcı phishing mailindeki linke tıklamış. Credential'ları çalınmış. Saldırgan mailbox'a erişmiş ve "Tüm Mailleri Dışarı Aktar" kuralı oluşturmuş.

**Klasik.**

Incident response başladı:

1. Hesabı kilitle ✓
2. Session'ları sonlandır ✓
3. Şifreyi sıfırla ✓
4. MFA'yı zorla ✓
5. Kullanıcıya "linke tıklama" eğitimi ver ✓

Kullanıcı: "Ama mail çok gerçekçi görünüyordu!"

Mail konusu: _"ACIL!!! Şifrenizi 5 dakika içinde değiştirin yoksa hesabınız silinecek - Microsoft Güvenlik Takımı (microsoft-guvenlik-takim@gmail.com)"_

Evet. Çok gerçekçi.

---

_Tarih: Pazartesi, 17:45_
Gün bitti. Scorecard'a baktım:

| Metrik          | Değer    |
| --------------- | -------- |
| İncelenen Alert | 127      |
| Gerçek Pozitif  | 1        |
| False Positive  | 126      |
| Kahve Tüketimi  | 6 fincan |
| Saç Kaybı       | 47 tel   |
| İç Çekme        | 89 kez   |

**MTTD (Mean Time To Detect):** 4 dakika
**MTTR (Mean Time To Respond):** 23 dakika
**MTTC (Mean Time To Coffee):** 12 dakika

---

_Tarih: Pazartesi, 18:00_
Eve giderken düşündüm. Bu iş zor. Ama birisi yapmalı.
Çünkü dışarıda bir yerde, bir saldırgan var. Ve o saldırgan, bir gün **dördüncü** login denemesini yapacak.

Ve ben orada olacağım. Alert'i kapatmak için. False positive olarak.

**Yarın görüşürüz.**

---

## 📝 Lisans

MIT. Eğitim ve portfolyo amaçlı kullanımda kaynak belirtmeniz yeterli.

**Not**: Tüm veriler KURGUSALDIR. Gerçek şirketler, kişiler veya olaylarla ilgisi yoktur.

> _"Daha fazla log, daha fazla güvenlik demek değil. Ama daha az uyku demek."_
>
> — Her SOC Analisti
