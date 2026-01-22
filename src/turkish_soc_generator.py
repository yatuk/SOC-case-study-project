"""
Turkish Company Ecosystem SOC Data Generator
Generates realistic SIEM/SOAR/EDR data with fictional Turkish companies.

IMPORTANT: All company names, domains, and identities are FICTIONAL.
They are designed to RESEMBLE Turkish business naming conventions
but do NOT represent any real organizations.

Seed-based for reproducibility. No external dependencies.
"""

import json
import random
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
import os

# Reproducible seed
SEED = int(os.environ.get('SOC_SEED', '1337'))
random.seed(SEED)

# Time range: past 14 days
BASE_TIME = datetime.now() - timedelta(days=14)

# ============== FICTIONAL TURKISH ENTITIES ==============
# NOTE: These are COMPLETELY FICTIONAL and do not represent real companies

FICTIONAL_COMPANIES = [
    {"name": "Anadolu Finans Holding", "domain": "anadolufinans.example.tr", "sector": "Finance"},
    {"name": "Boğaziçi Telekom", "domain": "bogazicitel.example.tr", "sector": "Telecom"},
    {"name": "Marmara Enerji A.Ş.", "domain": "marmaraenerji.example.tr", "sector": "Energy"},
    {"name": "Ege Perakende Grubu", "domain": "egeperakende.example.tr", "sector": "Retail"},
    {"name": "Trakya Lojistik", "domain": "trakyalojistik.example.tr", "sector": "Logistics"},
    {"name": "Kapadokya E-Ticaret", "domain": "kapadokyatech.example.tr", "sector": "E-Commerce"},
    {"name": "Akdeniz Savunma Sistemleri", "domain": "akdenizsavunma.example.tr", "sector": "Defense"},
    {"name": "Karadeniz Holding", "domain": "karadenizholding.example.tr", "sector": "Conglomerate"},
]

# Primary company for this simulation
PRIMARY_COMPANY = FICTIONAL_COMPANIES[0]  # Anadolu Finans Holding

# Fictional Turkish users (common names, no real people)
USERS = [
    {"email": "ayse.demir@anadolufinans.example.tr", "name": "Ayşe Demir", "dept": "Finans", "title": "Finans Analisti", "role": "analyst"},
    {"email": "mehmet.kaya@anadolufinans.example.tr", "name": "Mehmet Kaya", "dept": "BT", "title": "Sistem Yöneticisi", "role": "admin"},
    {"email": "elif.yilmaz@anadolufinans.example.tr", "name": "Elif Yılmaz", "dept": "Yazılım", "title": "Kıdemli Geliştirici", "role": "analyst"},
    {"email": "mustafa.arslan@anadolufinans.example.tr", "name": "Mustafa Arslan", "dept": "Satış", "title": "Satış Müdürü", "role": "viewer"},
    {"email": "zeynep.celik@anadolufinans.example.tr", "name": "Zeynep Çelik", "dept": "İK", "title": "İK Uzmanı", "role": "viewer"},
    {"email": "ali.ozturk@anadolufinans.example.tr", "name": "Ali Öztürk", "dept": "Pazarlama", "title": "Pazarlama Direktörü", "role": "viewer"},
    {"email": "fatma.sahin@anadolufinans.example.tr", "name": "Fatma Şahin", "dept": "Finans", "title": "Muhasebe Müdürü", "role": "analyst"},
    {"email": "ahmet.yildiz@anadolufinans.example.tr", "name": "Ahmet Yıldız", "dept": "Yönetim", "title": "CFO", "role": "admin"},
    {"email": "selin.aksoy@anadolufinans.example.tr", "name": "Selin Aksoy", "dept": "Hukuk", "title": "Hukuk Danışmanı", "role": "viewer"},
    {"email": "emre.korkmaz@anadolufinans.example.tr", "name": "Emre Korkmaz", "dept": "BT", "title": "Siber Güvenlik Analisti", "role": "analyst"},
    {"email": "deniz.aydin@anadolufinans.example.tr", "name": "Deniz Aydın", "dept": "Yazılım", "title": "DevOps Mühendisi", "role": "analyst"},
    {"email": "burak.polat@anadolufinans.example.tr", "name": "Burak Polat", "dept": "Satış", "title": "Bölge Müdürü", "role": "viewer"},
    {"email": "ceren.erdogan@anadolufinans.example.tr", "name": "Ceren Erdoğan", "dept": "Risk", "title": "Risk Analisti", "role": "analyst"},
    {"email": "oguz.tekin@anadolufinans.example.tr", "name": "Oğuz Tekin", "dept": "Operasyon", "title": "Operasyon Müdürü", "role": "viewer"},
    {"email": "gulsen.dogan@anadolufinans.example.tr", "name": "Gülşen Doğan", "dept": "Müşteri Hizmetleri", "title": "Müşteri İlişkileri Yöneticisi", "role": "viewer"},
]

# Fictional devices with Turkish city prefixes
DEVICES = [
    {"id": "DEV-001", "hostname": "IST-WS-001", "os": "Windows 11 Pro", "owner": "ayse.demir@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-002", "hostname": "IST-WS-002", "os": "Windows 11 Pro", "owner": "mehmet.kaya@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-003", "hostname": "ANK-LT-001", "os": "macOS 14 Sonoma", "owner": "elif.yilmaz@anadolufinans.example.tr", "location": "Ankara"},
    {"id": "DEV-004", "hostname": "IST-WS-003", "os": "Windows 11 Pro", "owner": "mustafa.arslan@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-005", "hostname": "IST-WS-004", "os": "Windows 11 Pro", "owner": "zeynep.celik@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-006", "hostname": "IZM-LT-001", "os": "macOS 14 Sonoma", "owner": "ali.ozturk@anadolufinans.example.tr", "location": "İzmir"},
    {"id": "DEV-007", "hostname": "IST-WS-005", "os": "Windows 11 Pro", "owner": "fatma.sahin@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-008", "hostname": "IST-EXC-001", "os": "Windows 11 Pro", "owner": "ahmet.yildiz@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-009", "hostname": "ANK-LT-002", "os": "macOS 14 Sonoma", "owner": "selin.aksoy@anadolufinans.example.tr", "location": "Ankara"},
    {"id": "DEV-010", "hostname": "IST-SEC-001", "os": "Windows 11 Pro", "owner": "emre.korkmaz@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-011", "hostname": "IST-DEV-001", "os": "Ubuntu 22.04 LTS", "owner": "deniz.aydin@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-012", "hostname": "BRS-WS-001", "os": "Windows 11 Pro", "owner": "burak.polat@anadolufinans.example.tr", "location": "Bursa"},
    {"id": "DEV-013", "hostname": "IST-WS-006", "os": "Windows 11 Pro", "owner": "ceren.erdogan@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-014", "hostname": "IST-WS-007", "os": "Windows 11 Pro", "owner": "oguz.tekin@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-015", "hostname": "IST-WS-008", "os": "Windows 11 Pro", "owner": "gulsen.dogan@anadolufinans.example.tr", "location": "İstanbul"},
    # Infrastructure
    {"id": "DEV-016", "hostname": "IST-DC-001", "os": "Windows Server 2022", "owner": "bt-operasyon@anadolufinans.example.tr", "location": "İstanbul DC"},
    {"id": "DEV-017", "hostname": "IST-MAIL-001", "os": "Windows Server 2022", "owner": "bt-operasyon@anadolufinans.example.tr", "location": "İstanbul DC"},
    {"id": "DEV-018", "hostname": "IST-WEB-001", "os": "Ubuntu 22.04 LTS", "owner": "bt-operasyon@anadolufinans.example.tr", "location": "İstanbul DC"},
    {"id": "DEV-019", "hostname": "ANK-VDI-001", "os": "Windows 11 Enterprise", "owner": "vdi-pool@anadolufinans.example.tr", "location": "Ankara DC"},
    {"id": "DEV-020", "hostname": "IST-MOB-001", "os": "iOS 17", "owner": "ahmet.yildiz@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-021", "hostname": "IST-MOB-002", "os": "Android 14", "owner": "mustafa.arslan@anadolufinans.example.tr", "location": "İstanbul"},
    {"id": "DEV-022", "hostname": "IZM-WS-001", "os": "Windows 10 Pro", "owner": "external-consultant@external.example.tr", "location": "İzmir"},
    {"id": "DEV-023", "hostname": "ANT-LT-001", "os": "Windows 11 Pro", "owner": "remote-worker@anadolufinans.example.tr", "location": "Antalya"},
    {"id": "DEV-024", "hostname": "IST-KIOSK-001", "os": "Windows 10 LTSC", "owner": "kiosk@anadolufinans.example.tr", "location": "İstanbul Şube"},
    {"id": "DEV-025", "hostname": "IST-PRINT-001", "os": "Embedded Linux", "owner": "bt-operasyon@anadolufinans.example.tr", "location": "İstanbul"},
]

# Fictional malicious domains (clearly fake)
MALICIOUS_DOMAINS = [
    "anadolu-giris-dogrula.example.tk",
    "finans-portal-guvenli.example.ml",
    "microsoft-tr-auth.example.cf",
    "sharepoint-dosya-indir.example.ga",
    "onedrive-paylasim.example.tk",
    "outlook-guvenlik.example.ml",
    "fatura-odeme-sistemi.example.cf",
    "ik-maas-guncelleme.example.ga",
    "yonetim-portal.example.tk",
    "cdn-guncelleme.example.cf",
]

# Fictional malicious IPs (non-routable/reserved for documentation)
MALICIOUS_IPS = [
    "198.51.100.45",   # TEST-NET-2
    "203.0.113.180",   # TEST-NET-3
    "198.51.100.91",
    "203.0.113.195",
    "198.51.100.54",
    "203.0.113.78",
]

# Turkish cities and locations for geo
TURKISH_CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep"]

# Benign IPs (internal + Turkish ISPs fictional)
BENIGN_IPS = [
    "10.10.1.50", "10.10.1.51", "10.10.2.100",  # Internal
    "192.168.1.1", "172.16.0.1",  # Internal
    "192.0.2.100", "192.0.2.101",  # TEST-NET-1 (benign external sim)
]

GEO_LOCATIONS = {
    "198.51.100.45": {"city": "Bükreş", "country": "Romanya"},
    "203.0.113.180": {"city": "Moskova", "country": "Rusya"},
    "198.51.100.91": {"city": "Pekin", "country": "Çin"},
    "203.0.113.195": {"city": "Lagos", "country": "Nijerya"},
    "198.51.100.54": {"city": "São Paulo", "country": "Brezilya"},
    "10.10.1.50": {"city": "İstanbul", "country": "Türkiye"},
    "10.10.1.51": {"city": "Ankara", "country": "Türkiye"},
    "192.0.2.100": {"city": "Amsterdam", "country": "Hollanda"},
}

MITRE_TECHNIQUES = {
    "T1566.001": {"name": "Oltalama: Hedefli Ek Dosya", "tactic": "İlk Erişim"},
    "T1566.002": {"name": "Oltalama: Hedefli Bağlantı", "tactic": "İlk Erişim"},
    "T1078": {"name": "Geçerli Hesaplar", "tactic": "Savunma Atlatma"},
    "T1078.004": {"name": "Geçerli Hesaplar: Bulut Hesapları", "tactic": "Savunma Atlatma"},
    "T1114.002": {"name": "E-posta Toplama: Uzak E-posta Erişimi", "tactic": "Toplama"},
    "T1098": {"name": "Hesap Manipülasyonu", "tactic": "Kalıcılık"},
    "T1098.001": {"name": "Hesap Manipülasyonu: Ek Bulut Kimlik Bilgileri", "tactic": "Kalıcılık"},
    "T1528": {"name": "Uygulama Erişim Jetonu Çalma", "tactic": "Kimlik Bilgisi Erişimi"},
    "T1556": {"name": "Kimlik Doğrulama Sürecini Değiştirme", "tactic": "Kimlik Bilgisi Erişimi"},
    "T1059.001": {"name": "Komut ve Betik: PowerShell", "tactic": "Yürütme"},
    "T1059.005": {"name": "Komut ve Betik: Visual Basic", "tactic": "Yürütme"},
    "T1547.001": {"name": "Önyükleme/Oturum Başlatma: Kayıt Defteri Anahtarları", "tactic": "Kalıcılık"},
    "T1071.001": {"name": "Uygulama Katmanı Protokolü: Web", "tactic": "Komuta ve Kontrol"},
    "T1567.002": {"name": "Web Servisi Üzerinden Veri Sızdırma: Bulut Depolama", "tactic": "Veri Sızdırma"},
    "T1110.003": {"name": "Kaba Kuvvet: Parola Püskürtme", "tactic": "Kimlik Bilgisi Erişimi"},
}

# ============== EVENT GENERATOR ==============

class TurkishSOCGenerator:
    def __init__(self):
        self.event_counter = 0
        self.events = []
        self.alerts = []
        self.cases = []
        self.iocs = []
        self.playbook_runs = []
        
    def _evt_id(self):
        self.event_counter += 1
        return f"EVT-{self.event_counter:06d}"
    
    def _alert_id(self, case_id, num):
        return f"ALR-{case_id[-4:]}-{num:03d}"
    
    def _ts(self, base, offset_minutes=0):
        return (base + timedelta(minutes=offset_minutes)).isoformat()
    
    def _random_device(self, user_email):
        user_devices = [d for d in DEVICES if d["owner"] == user_email]
        if user_devices:
            return random.choice(user_devices)
        return random.choice(DEVICES[:15])
    
    def add_event(self, ts, source, event_type, user, device_id=None, src_ip=None, 
                  domain=None, process=None, parent_process=None, file_path=None,
                  registry_key=None, iocs=None, tags=None, case_id=None, summary=None):
        evt = {
            "event_id": self._evt_id(),
            "timestamp": ts,
            "source": source,
            "event_type": event_type,
            "user": user,
            "device_id": device_id or "",
            "src_ip": src_ip or "",
            "geo": GEO_LOCATIONS.get(src_ip, {"city": "Bilinmiyor", "country": "Bilinmiyor"}),
            "domain": domain or "",
            "process": process or "",
            "parent_process": parent_process or "",
            "file_path": file_path or "",
            "registry_key": registry_key or "",
            "iocs": iocs or [],
            "tags": tags or [],
            "case_id": case_id or "",
            "summary": summary or f"{event_type} - {user}"
        }
        self.events.append(evt)
        return evt["event_id"]
    
    def add_alert(self, case_id, name, severity, confidence, user, mitre_ids, 
                  evidence_ids, hypothesis, actions, ts):
        alert_num = len([a for a in self.alerts if a["case_id"] == case_id]) + 1
        alert = {
            "alert_id": self._alert_id(case_id, alert_num),
            "case_id": case_id,
            "name": name,
            "severity": severity,
            "confidence": confidence,
            "entity": {"user": user},
            "mitre": [{"id": mid, **MITRE_TECHNIQUES.get(mid, {})} for mid in mitre_ids],
            "evidence": evidence_ids,
            "hypothesis": hypothesis,
            "recommended_actions": actions,
            "time_window": {"start": ts, "end": ts},
            "status": "new"
        }
        self.alerts.append(alert)
        return alert["alert_id"]
    
    def add_case(self, case_id, title, severity, users, devices, mitre_ids, 
                 narrative, start_ts, end_ts):
        case = {
            "case_id": case_id,
            "title": title,
            "severity": severity,
            "status": random.choice(["new", "investigating", "contained"]),
            "owner": random.choice(["analyst-1", "analyst-2", "unassigned"]),
            "created_at": start_ts,
            "updated_at": end_ts,
            "affected_users": users,
            "affected_devices": devices,
            "mitre_techniques": mitre_ids,
            "narrative": narrative,
            "alert_ids": [],
            "evidence_count": 0
        }
        self.cases.append(case)
        return case
    
    # ============== INCIDENT SCENARIOS ==============
    
    def scenario_1_phishing_credential_theft(self):
        """Oltalama -> kimlik bilgisi hırsızlığı -> imkansız seyahat -> posta kutusu kuralı"""
        case_id = "CASE-2026-0001"
        user = USERS[0]  # Ayşe Demir
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=1)
        
        case = self.add_case(
            case_id, "Oltalama Kaynaklı Hesap Ele Geçirme", "critical",
            [user["email"]], [device["id"]], ["T1566.002", "T1078", "T1114.002", "T1098"],
            "Kullanıcı oltalama e-postası aldı, zararlı bağlantıya tıkladı ve kimlik bilgilerini girdi. Saldırgan yabancı IP'den giriş yaparak posta kutusu yönlendirme kuralı oluşturdu.",
            self._ts(start), self._ts(start, 180)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "email_gateway", "email_delivered", user["email"],
            device["id"], BENIGN_IPS[0], MALICIOUS_DOMAINS[0],
            tags=["phishing", "suspicious"], case_id=case_id,
            summary=f"{MALICIOUS_DOMAINS[0]} adresinden oltalama e-postası teslim edildi"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 5), "proxy_dns", "url_visited", user["email"],
            device["id"], BENIGN_IPS[0], MALICIOUS_DOMAINS[0],
            tags=["click", "suspicious"], case_id=case_id,
            summary="Kullanıcı kimlik avı sayfasını ziyaret etti"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 7), "proxy_dns", "http_post", user["email"],
            device["id"], BENIGN_IPS[0], MALICIOUS_DOMAINS[0],
            tags=["credential_submission"], case_id=case_id,
            summary="Oltalama sayfasına kimlik bilgileri gönderildi"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 60), "idp_auth", "login_success", user["email"],
            src_ip=MALICIOUS_IPS[0],
            tags=["impossible_travel", "suspicious_geo"], case_id=case_id,
            summary="Romanya'dan giriş (imkansız seyahat)"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 90), "m365_audit", "inbox_rule_created", user["email"],
            src_ip=MALICIOUS_IPS[0],
            tags=["persistence", "exfiltration"], case_id=case_id,
            summary="Harici adrese yönlendirme kuralı oluşturuldu"
        ))
        
        self.add_alert(case_id, "Oltalama Bağlantısına Tıklandı", "high", "high", user["email"],
                      ["T1566.002"], evidence[:3],
                      "Kullanıcı oltalama bağlantısına tıkladı ve muhtemelen kimlik bilgilerini girdi",
                      ["Kullanıcı parolasını sıfırla", "Oturumları sonlandır", "Alan adını engelle"],
                      self._ts(start, 10))
        
        self.add_alert(case_id, "İmkansız Seyahat Tespit Edildi", "high", "high", user["email"],
                      ["T1078"], [evidence[3]],
                      "Kısa sürede coğrafi olarak uzak konumdan giriş algılandı",
                      ["Kullanıcıyla doğrula", "VPN kullanımını kontrol et", "Hesap ele geçirmeyi değerlendir"],
                      self._ts(start, 65))
        
        self.add_alert(case_id, "Şüpheli Posta Kutusu Kuralı", "critical", "high", user["email"],
                      ["T1098", "T1114.002"], [evidence[4]],
                      "Posta kutusu yönlendirme kuralı oluşturuldu, potansiyel veri sızdırma",
                      ["Kuralı kaldır", "Gönderilen e-postaları denetle", "Kullanıcıyı bilgilendir"],
                      self._ts(start, 95))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_DOMAINS[0], "type": "domain", "tags": ["phishing"], "cases": [case_id]})
        self.iocs.append({"indicator": MALICIOUS_IPS[0], "type": "ip", "tags": ["attacker"], "cases": [case_id]})

    def scenario_2_oauth_consent_phishing(self):
        """OAuth onay oltalaması -> token kötüye kullanımı -> posta kutusu erişimi"""
        case_id = "CASE-2026-0002"
        user = USERS[1]  # Mehmet Kaya
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=3)
        
        case = self.add_case(
            case_id, "OAuth Onay Oltalaması - Token Kötüye Kullanımı", "high",
            [user["email"]], [device["id"]], ["T1566.002", "T1528", "T1114.002"],
            "Kullanıcı zararlı uygulamaya OAuth izni verdi. Saldırgan tokeni kullanarak posta kutusuna erişti ve e-postaları sızdırdı.",
            self._ts(start), self._ts(start, 240)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "email_gateway", "email_delivered", user["email"],
            device["id"], tags=["oauth_lure"], case_id=case_id,
            summary="OAuth onay isteği e-postası alındı"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 10), "idp_auth", "oauth_consent_granted", user["email"],
            device["id"], tags=["risky_app", "suspicious"], case_id=case_id,
            summary="Kullanıcı 'MailSyncPro' uygulamasına izin verdi"
        ))
        
        for i in range(12):
            evidence.append(self.add_event(
                self._ts(start, 60 + i*5), "m365_audit", "message_read", user["email"],
                src_ip=MALICIOUS_IPS[1], tags=["bulk_access"], case_id=case_id,
                summary=f"OAuth token ile e-posta erişimi (parti {i+1})"
            ))
        
        self.add_alert(case_id, "Şüpheli OAuth Uygulama İzni", "high", "medium", user["email"],
                      ["T1528"], evidence[:2],
                      "Kullanıcı bilinmeyen OAuth uygulamasına izin verdi",
                      ["Uygulama iznini iptal et", "Uygulama izinlerini gözden geçir", "Kullanıcıyı bilgilendir"],
                      self._ts(start, 15))
        
        self.add_alert(case_id, "OAuth ile Toplu Posta Kutusu Erişimi", "high", "high", user["email"],
                      ["T1114.002"], evidence[2:],
                      "OAuth token aracılığıyla toplu e-posta erişimi tespit edildi",
                      ["OAuth tokenları iptal et", "Erişilen e-postaları denetle", "Uygulamayı engelle"],
                      self._ts(start, 120))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_IPS[1], "type": "ip", "tags": ["oauth_abuse"], "cases": [case_id]})

    def scenario_3_mfa_fatigue(self):
        """MFA yorgunluğu -> oturum ele geçirme -> ayrıcalıklı işlem"""
        case_id = "CASE-2026-0003"
        user = USERS[2]  # Elif Yılmaz
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=5)
        
        case = self.add_case(
            case_id, "MFA Yorgunluk Saldırısı - Oturum Ele Geçirme", "critical",
            [user["email"]], [device["id"]], ["T1078", "T1556", "T1098.001"],
            "Saldırgan kullanıcıyı MFA bildirimleriyle bombardıman etti ve sonunda onay aldı. Oturumu kullanarak admin portalına erişti ve yetki yükseltti.",
            self._ts(start), self._ts(start, 60)
        )
        
        evidence = []
        
        for i in range(15):
            evidence.append(self.add_event(
                self._ts(start, i*2), "idp_auth", "mfa_push_sent", user["email"],
                src_ip=MALICIOUS_IPS[2], tags=["mfa_bombing"], case_id=case_id,
                summary=f"MFA push bildirimi #{i+1} gönderildi"
            ))
        
        evidence.append(self.add_event(
            self._ts(start, 32), "idp_auth", "mfa_approved", user["email"],
            src_ip=MALICIOUS_IPS[2], tags=["fatigue_success"], case_id=case_id,
            summary="Kullanıcı MFA push'ını onayladı (yorgunluk)"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 33), "idp_auth", "login_success", user["email"],
            src_ip=MALICIOUS_IPS[2], tags=["suspicious_geo"], case_id=case_id,
            summary="Çin'den başarılı giriş"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 40), "admin_audit", "role_assigned", user["email"],
            src_ip=MALICIOUS_IPS[2], tags=["privilege_escalation"], case_id=case_id,
            summary="Kullanıcıya GlobalAdmin rolü atandı"
        ))
        
        self.add_alert(case_id, "MFA Push Bombardımanı Tespit Edildi", "critical", "high", user["email"],
                      ["T1556"], evidence[:15],
                      "Çok sayıda hızlı MFA push denemesi push bombardıman saldırısını gösteriyor",
                      ["Kullanıcıyla hemen iletişime geç", "IP'yi engelle", "Oturumları sonlandır"],
                      self._ts(start, 30))
        
        self.add_alert(case_id, "MFA Yorgunluğu Sonrası Yetki Yükseltme", "critical", "high", user["email"],
                      ["T1098.001"], evidence[15:],
                      "Şüpheli MFA onayından sonra admin rolü atandı",
                      ["Rolü kaldır", "Admin işlemlerini denetle", "Tam olay incelemesi"],
                      self._ts(start, 45))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_IPS[2], "type": "ip", "tags": ["mfa_bombing"], "cases": [case_id]})

    def scenario_4_password_spray(self):
        """Parola püskürtme -> başarılı giriş -> posta kutusu arama/sızdırma"""
        case_id = "CASE-2026-0004"
        user = USERS[3]  # Mustafa Arslan
        start = BASE_TIME + timedelta(days=7)
        
        case = self.add_case(
            case_id, "Parola Püskürtme - E-posta Sızdırma", "high",
            [user["email"]], [], ["T1110.003", "T1078", "T1114.002"],
            "Parola püskürtme saldırısı kullanıcıya karşı başarılı oldu. Saldırgan hassas terimler için posta kutusunu aradı ve e-postaları dışarı aktardı.",
            self._ts(start), self._ts(start, 120)
        )
        
        evidence = []
        
        for i, u in enumerate(USERS[:6]):
            evidence.append(self.add_event(
                self._ts(start, i*2), "idp_auth", "login_failed", u["email"],
                src_ip=MALICIOUS_IPS[3], tags=["password_spray"], case_id=case_id,
                summary=f"Başarısız giriş denemesi (parola püskürtme)"
            ))
        
        evidence.append(self.add_event(
            self._ts(start, 15), "idp_auth", "login_success", user["email"],
            src_ip=MALICIOUS_IPS[3], tags=["spray_success"], case_id=case_id,
            summary="Püskürtme saldırısı sonrası başarılı giriş"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 30), "m365_audit", "mailbox_search", user["email"],
            src_ip=MALICIOUS_IPS[3], tags=["recon"], case_id=case_id,
            summary="Posta kutusunda 'parola', 'fatura', 'havale' araması"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 45), "m365_audit", "mailbox_export", user["email"],
            src_ip=MALICIOUS_IPS[3], tags=["exfiltration"], case_id=case_id,
            summary="Toplu e-posta dışa aktarımı başlatıldı"
        ))
        
        self.add_alert(case_id, "Parola Püskürtme Saldırısı", "medium", "high", user["email"],
                      ["T1110.003"], evidence[:6],
                      "Tek IP'den birden fazla hesaba başarısız giriş denemeleri",
                      ["Kaynak IP'yi engelle", "Etkilenen kullanıcıların parolalarını sıfırla"],
                      self._ts(start, 15))
        
        self.add_alert(case_id, "Posta Kutusu Sızdırma", "high", "high", user["email"],
                      ["T1114.002"], evidence[6:],
                      "Başarılı püskürtme saldırısından sonra toplu e-posta dışa aktarımı",
                      ["Oturumları sonlandır", "Dışa aktarılan verileri denetle", "Yasal bildirim"],
                      self._ts(start, 50))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_IPS[3], "type": "ip", "tags": ["password_spray"], "cases": [case_id]})

    def scenario_5_bec_attack(self):
        """İş e-postası ele geçirme: yönlendirme + finans lure"""
        case_id = "CASE-2026-0005"
        user = USERS[6]  # Fatma Şahin - Muhasebe
        start = BASE_TIME + timedelta(days=8)
        
        case = self.add_case(
            case_id, "İş E-postası Ele Geçirme - Havale Dolandırıcılığı", "critical",
            [user["email"]], [], ["T1566.002", "T1098", "T1114.002"],
            "Finans kullanıcısının hesabı ele geçirildi. Saldırgan yönlendirme kurdu ve iş ortaklarına sahte havale talepleri gönderdi.",
            self._ts(start), self._ts(start, 300)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "email_gateway", "email_delivered", user["email"],
            domain=MALICIOUS_DOMAINS[6], tags=["finance_lure"], case_id=case_id,
            summary="Finans temalı oltalama e-postası teslim edildi"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 10), "idp_auth", "login_success", user["email"],
            src_ip=MALICIOUS_IPS[4], tags=["suspicious_geo"], case_id=case_id,
            summary="Brezilya'dan giriş (şüpheli)"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 20), "m365_audit", "inbox_rule_created", user["email"],
            src_ip=MALICIOUS_IPS[4], tags=["persistence"], case_id=case_id,
            summary="'dolandırıcılık' içeren e-postaları silen kural oluşturuldu"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 60), "email_gateway", "email_sent", user["email"],
            tags=["bec", "wire_fraud"], case_id=case_id,
            summary="Tedarikçiye sahte havale talebi gönderildi"
        ))
        
        self.add_alert(case_id, "Finans Hesabı Ele Geçirme", "critical", "high", user["email"],
                      ["T1078", "T1098"], evidence[:3],
                      "Finans kullanıcı hesabına şüpheli konumdan erişildi ve kalıcılık sağlandı",
                      ["Hemen parola sıfırla", "Posta kutusu kurallarını kaldır", "Finans ekibini uyar"],
                      self._ts(start, 25))
        
        self.add_alert(case_id, "İş E-postası Ele Geçirme - Havale Dolandırıcılığı", "critical", "high", user["email"],
                      ["T1114.002"], evidence[3:],
                      "Ele geçirilen hesaptan sahte finansal iletişim gönderildi",
                      ["Alıcılarla iletişime geç", "E-postaları geri çağır", "Yasal bildirim"],
                      self._ts(start, 65))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_DOMAINS[6], "type": "domain", "tags": ["bec"], "cases": [case_id]})
        self.iocs.append({"indicator": MALICIOUS_IPS[4], "type": "ip", "tags": ["bec"], "cases": [case_id]})

    def scenario_6_malware_c2(self):
        """Zararlı ek -> makro -> kalıcılık -> C2 beacon (simülasyon)"""
        case_id = "CASE-2026-0006"
        user = USERS[4]  # Zeynep Çelik - İK
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=9)
        
        case = self.add_case(
            case_id, "Zararlı Yazılım Enfeksiyonu - C2 İletişimi (Simülasyon)", "critical",
            [user["email"]], [device["id"]], ["T1566.001", "T1059.005", "T1547.001", "T1071.001"],
            "Kullanıcı VBA makro içeren zararlı eki açtı. Zararlı yazılım kalıcılık sağladı ve C2 iletişimi başlattı. (Bu tamamen simüle edilmiş bir senaryodur)",
            self._ts(start), self._ts(start, 180)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "email_gateway", "attachment_delivered", user["email"],
            device["id"], domain="fatura-belge.example.cf", tags=["malicious_attachment"], case_id=case_id,
            summary="Zararlı ek içeren e-posta teslim edildi"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 5), "endpoint_edr_sim", "process_start", user["email"],
            device["id"], process="WINWORD.EXE", tags=["office"], case_id=case_id,
            summary="Word belgesi açıldı"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 6), "endpoint_edr_sim", "process_start", user["email"],
            device["id"], process="powershell.exe", parent_process="WINWORD.EXE",
            tags=["macro_execution", "suspicious"], case_id=case_id,
            summary="Word'den PowerShell başlatıldı (makro çalıştırma)"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 7), "endpoint_edr_sim", "file_write", user["email"],
            device["id"], process="powershell.exe", 
            file_path="C:\\Users\\zcelik\\AppData\\Local\\Temp\\guncelleme.exe",
            tags=["dropper"], case_id=case_id,
            summary="Geçici klasöre şüpheli dosya bırakıldı"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 8), "endpoint_edr_sim", "registry_set", user["email"],
            device["id"], process="guncelleme.exe",
            registry_key="HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\UpdateService",
            tags=["persistence"], case_id=case_id,
            summary="Kayıt defteri Run anahtarı kalıcılığı sağlandı"
        ))
        
        for i in range(10):
            evidence.append(self.add_event(
                self._ts(start, 15 + i*10), "endpoint_edr_sim", "network_connect", user["email"],
                device["id"], process="guncelleme.exe", domain=MALICIOUS_DOMAINS[9],
                src_ip=MALICIOUS_IPS[5], tags=["c2", "beacon"], case_id=case_id,
                summary=f"C2 beacon #{i+1} - {MALICIOUS_DOMAINS[9]}"
            ))
        
        self.add_alert(case_id, "Makro Çalıştırma - Zararlı Yazılım Dağıtımı", "critical", "high", user["email"],
                      ["T1566.001", "T1059.005"], evidence[:4],
                      "Zararlı makro PowerShell çalıştırdı ve payload bıraktı",
                      ["Uç noktayı izole et", "Ek hash'ini engelle", "Benzer e-postaları tara"],
                      self._ts(start, 10))
        
        self.add_alert(case_id, "Zararlı Yazılım Kalıcılığı Sağlandı", "critical", "high", user["email"],
                      ["T1547.001"], [evidence[4]],
                      "Kayıt defteri Run anahtarı kalıcılığı tespit edildi",
                      ["Kalıcılığı kaldır", "Tam zararlı yazılım analizi", "Yanal hareketi kontrol et"],
                      self._ts(start, 12))
        
        self.add_alert(case_id, "Komuta ve Kontrol Aktivitesi", "critical", "high", user["email"],
                      ["T1071.001"], evidence[5:],
                      "Periyodik C2 beacon iletişimi tespit edildi",
                      ["C2 alan adını engelle", "Uç noktayı izole et", "Ağ adli bilişimi"],
                      self._ts(start, 60))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        
        self.iocs.append({"indicator": MALICIOUS_DOMAINS[9], "type": "domain", "tags": ["c2"], "cases": [case_id]})
        self.iocs.append({"indicator": MALICIOUS_IPS[5], "type": "ip", "tags": ["c2"], "cases": [case_id]})
        self.iocs.append({"indicator": "a1b2c3d4e5f6789012345678901234567890abcd", "type": "hash", "tags": ["malware"], "cases": [case_id]})

    def scenario_7_new_device_anomaly(self):
        """Yeni cihaz kaydı anomalisi -> riskli giriş -> rol atama"""
        case_id = "CASE-2026-0007"
        user = USERS[7]  # Ahmet Yıldız - CFO
        start = BASE_TIME + timedelta(days=10)
        
        case = self.add_case(
            case_id, "Yeni Cihaz Anomalisi - Admin Rol Atama", "high",
            [user["email"]], ["DEV-022"], ["T1078.004", "T1098.001"],
            "Yönetici hesabına bilinmeyen cihaz kaydedildi, ardından şüpheli admin rol ataması yapıldı.",
            self._ts(start), self._ts(start, 60)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "idp_auth", "new_device_enrolled", user["email"],
            "DEV-022", src_ip="203.0.113.195", tags=["new_device", "risky"], case_id=case_id,
            summary="Yeni cihaz 'IZM-WS-001' kaydedildi"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 5), "idp_auth", "login_success", user["email"],
            "DEV-022", src_ip="203.0.113.195", tags=["suspicious_geo"], case_id=case_id,
            summary="Yeni cihazdan Nijerya'dan giriş"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 15), "admin_audit", "role_assigned", user["email"],
            src_ip="203.0.113.195", tags=["privilege_escalation"], case_id=case_id,
            summary="Exchange Administrator rolü atandı"
        ))
        
        self.add_alert(case_id, "Yeni Cihazdan Riskli Giriş", "high", "medium", user["email"],
                      ["T1078.004"], evidence[:2],
                      "Yönetici hesabına riskli konumda yeni cihazdan erişildi",
                      ["Kullanıcıyla doğrula", "Cihazı incele", "Engellemeyi değerlendir"],
                      self._ts(start, 10))
        
        self.add_alert(case_id, "Şüpheli Admin Rol Atama", "high", "high", user["email"],
                      ["T1098.001"], [evidence[2]],
                      "Riskli girişten sonra admin rolü atandı",
                      ["Rolü kaldır", "Son admin işlemlerini denetle", "Yetkilendirmeyi doğrula"],
                      self._ts(start, 20))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)

    def scenario_8_data_exfil_cloud(self):
        """Bulut depolama üzerinden veri sızdırma (simülasyon)"""
        case_id = "CASE-2026-0008"
        user = USERS[10]  # Deniz Aydın - DevOps
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=11)
        
        case = self.add_case(
            case_id, "Bulut Paylaşımı ile Veri Sızdırma", "high",
            [user["email"]], [device["id"]], ["T1567.002"],
            "Kullanıcı hassas dosyalar için herkese açık paylaşım bağlantıları oluşturdu ve dışarıyla paylaştı.",
            self._ts(start), self._ts(start, 120)
        )
        
        evidence = []
        
        for i in range(5):
            evidence.append(self.add_event(
                self._ts(start, i*10), "m365_audit", "sharing_link_created", user["email"],
                device["id"], tags=["external_share", "sensitive"], case_id=case_id,
                summary=f"Hassas dosya {i+1} için herkese açık bağlantı oluşturuldu"
            ))
        
        evidence.append(self.add_event(
            self._ts(start, 60), "m365_audit", "file_downloaded", user["email"],
            src_ip="192.0.2.100", tags=["external_access"], case_id=case_id,
            summary="Paylaşılan dosyalara harici IP'den erişildi"
        ))
        
        self.add_alert(case_id, "Toplu Harici Dosya Paylaşımı", "high", "medium", user["email"],
                      ["T1567.002"], evidence[:5],
                      "Kısa sürede birden fazla hassas dosya harici olarak paylaşıldı",
                      ["Paylaşılan dosyaları incele", "Bağlantıları iptal et", "Kullanıcıyla doğrula"],
                      self._ts(start, 55))
        
        self.add_alert(case_id, "Paylaşılan Dosyalara Harici Erişim", "high", "high", user["email"],
                      ["T1567.002"], [evidence[5]],
                      "Paylaşılan dosyalara bilinmeyen harici konumdan erişildi",
                      ["Paylaşımı devre dışı bırak", "Dosya içeriklerini denetle", "DLP incelemesi"],
                      self._ts(start, 65))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)

    def scenario_9_false_positive_vpn(self):
        """Yanlış pozitif: VPN kaynaklı imkansız seyahat"""
        case_id = "CASE-2026-0009"
        user = USERS[11]  # Burak Polat
        device = self._random_device(user["email"])
        start = BASE_TIME + timedelta(days=12)
        
        case = self.add_case(
            case_id, "Yanlış Pozitif - VPN İmkansız Seyahat", "low",
            [user["email"]], [device["id"]], ["T1078"],
            "Kullanıcının VPN kullanımı nedeniyle imkansız seyahat uyarısı tetiklendi. İnceleme sonrası yanlış pozitif olarak belirlendi.",
            self._ts(start), self._ts(start, 30)
        )
        
        evidence = []
        
        evidence.append(self.add_event(
            self._ts(start), "idp_auth", "login_success", user["email"],
            device["id"], src_ip=BENIGN_IPS[0], tags=["normal"], case_id=case_id,
            summary="İstanbul'dan normal giriş"
        ))
        
        evidence.append(self.add_event(
            self._ts(start, 5), "idp_auth", "login_success", user["email"],
            device["id"], src_ip="192.0.2.100", tags=["vpn_exit"], case_id=case_id,
            summary="Amsterdam VPN çıkış noktasından giriş"
        ))
        
        self.add_alert(case_id, "İmkansız Seyahat (VPN - Yanlış Pozitif)", "low", "low", user["email"],
                      ["T1078"], evidence,
                      "Coğrafi olarak uzak konumlardan girişler - VPN kullanımı doğrulandı",
                      ["VPN kullanımını doğrula", "Bilinen VPN çıkış noktalarını beyaz listeye ekle"],
                      self._ts(start, 10))
        
        case["alert_ids"] = [a["alert_id"] for a in self.alerts if a["case_id"] == case_id]
        case["evidence_count"] = len(evidence)
        case["status"] = "closed"

    def generate_benign_events(self, count=450):
        """Normal/benign olaylar üret - gerçek SIEM gürültüsünü simüle et"""
        event_types = [
            ("idp_auth", "login_success", []),
            ("idp_auth", "login_success", []),
            ("idp_auth", "mfa_approved", []),
            ("email_gateway", "email_delivered", []),
            ("email_gateway", "email_sent", []),
            ("proxy_dns", "url_visited", []),
            ("m365_audit", "file_accessed", []),
            ("m365_audit", "message_read", []),
            ("endpoint_edr_sim", "process_start", []),
        ]
        
        benign_domains = ["google.com.tr", "microsoft.com", "slack.com", "zoom.us", 
                        "github.com", "salesforce.com", "dropbox.com", "office.com",
                        "turk.net", "turktelekom.com.tr", "garanti.com.tr"]
        
        for i in range(count):
            user = random.choice(USERS)
            device = self._random_device(user["email"])
            source, event_type, tags = random.choice(event_types)
            offset = random.randint(0, 14*24*60)
            
            self.add_event(
                self._ts(BASE_TIME, offset), source, event_type, user["email"],
                device["id"], random.choice(BENIGN_IPS),
                domain=random.choice(benign_domains) if source == "proxy_dns" else "",
                process="explorer.exe" if source == "endpoint_edr_sim" else "",
                tags=tags,
                summary=f"Normal {event_type} aktivitesi"
            )

    def generate_all(self):
        """Tam sentetik veri setini üret"""
        print("[GEN] Olay senaryoları üretiliyor...")
        self.scenario_1_phishing_credential_theft()
        self.scenario_2_oauth_consent_phishing()
        self.scenario_3_mfa_fatigue()
        self.scenario_4_password_spray()
        self.scenario_5_bec_attack()
        self.scenario_6_malware_c2()
        self.scenario_7_new_device_anomaly()
        self.scenario_8_data_exfil_cloud()
        self.scenario_9_false_positive_vpn()
        
        print("[GEN] Benign gürültü olayları üretiliyor...")
        self.generate_benign_events(450)
        
        self.events.sort(key=lambda x: x["timestamp"])
        
        for ioc in self.iocs:
            ioc["first_seen"] = self._ts(BASE_TIME)
            ioc["last_seen"] = self._ts(BASE_TIME, 14*24*60)
            ioc["confidence"] = random.choice(["high", "medium"])
        
        print(f"[GEN] {len(self.events)} olay üretildi")
        print(f"[GEN] {len(self.alerts)} uyarı üretildi")
        print(f"[GEN] {len(self.cases)} vaka üretildi")
        print(f"[GEN] {len(self.iocs)} IOC üretildi")
        
        return {
            "events": self.events,
            "alerts": self.alerts,
            "cases": self.cases,
            "iocs": self.iocs,
            "users": USERS,
            "devices": DEVICES,
            "mitre": MITRE_TECHNIQUES,
            "company": PRIMARY_COMPANY
        }


def generate_edr_devices(events, devices):
    """EDR cihaz envanteri üret"""
    device_map = {d["id"]: {
        **d,
        "first_seen": None,
        "last_seen": None,
        "risk_score": 0,
        "open_alerts": 0,
        "recent_processes": [],
        "recent_connections": []
    } for d in devices}
    
    for evt in events:
        did = evt.get("device_id")
        if did and did in device_map:
            d = device_map[did]
            ts = evt["timestamp"]
            
            if not d["first_seen"] or ts < d["first_seen"]:
                d["first_seen"] = ts
            if not d["last_seen"] or ts > d["last_seen"]:
                d["last_seen"] = ts
            
            if evt["source"] == "endpoint_edr_sim":
                if evt["event_type"] == "process_start" and evt["process"]:
                    d["recent_processes"].append({
                        "process": evt["process"],
                        "parent": evt.get("parent_process", ""),
                        "timestamp": ts
                    })
                if evt["event_type"] == "network_connect":
                    d["recent_connections"].append({
                        "domain": evt.get("domain", ""),
                        "ip": evt.get("src_ip", ""),
                        "timestamp": ts
                    })
            
            if "suspicious" in evt.get("tags", []) or "malicious" in evt.get("tags", []):
                d["risk_score"] += 10
    
    for d in device_map.values():
        d["recent_processes"] = d["recent_processes"][-20:]
        d["recent_connections"] = d["recent_connections"][-20:]
        d["risk_score"] = min(d["risk_score"], 100)
    
    return list(device_map.values())


def generate_kpi_timeseries(events, alerts):
    """Zaman serisi KPI verisi üret"""
    from collections import defaultdict
    
    hourly_events = defaultdict(int)
    hourly_alerts = defaultdict(int)
    daily_risk = defaultdict(int)
    
    for evt in events:
        ts = evt["timestamp"][:13] + ":00:00"
        day = evt["timestamp"][:10]
        hourly_events[ts] += 1
        
        if "suspicious" in evt.get("tags", []):
            daily_risk[day] += 5
    
    for alert in alerts:
        ts = alert["time_window"]["start"][:13] + ":00:00"
        day = alert["time_window"]["start"][:10]
        hourly_alerts[ts] += 1
        
        sev_weight = {"critical": 100, "high": 75, "medium": 50, "low": 25}
        daily_risk[day] += sev_weight.get(alert["severity"], 25)
    
    return {
        "events_per_hour": [{"timestamp": k, "count": v} for k, v in sorted(hourly_events.items())],
        "alerts_per_hour": [{"timestamp": k, "count": v} for k, v in sorted(hourly_alerts.items())],
        "risk_per_day": [{"date": k, "risk": v} for k, v in sorted(daily_risk.items())]
    }


def generate_playbook_runs(cases):
    """Simüle edilmiş SOAR playbook çalıştırmalarını üret"""
    playbooks = []
    templates = [
        {"name": "Oltalama Yanıt", "steps": ["Göndericiyi engelle", "E-postayı karantinaya al", "Parolayı sıfırla", "Kullanıcıyı bilgilendir"]},
        {"name": "Hesap Ele Geçirme", "steps": ["Oturumları sonlandır", "Parolayı sıfırla", "Denetim kayıtlarını incele", "Yanal hareketi kontrol et"]},
        {"name": "Zararlı Yazılım İzolasyonu", "steps": ["Uç noktayı izole et", "Adli bilişim topla", "IOC'leri engelle", "Benzer uç noktaları tara"]},
        {"name": "Veri Sızdırma", "steps": ["Paylaşımı iptal et", "Erişimi denetle", "DLP taraması", "Yasal bildirim"]}
    ]
    
    for i, case in enumerate(cases):
        template = templates[i % len(templates)]
        start = datetime.fromisoformat(case["created_at"]) + timedelta(minutes=random.randint(5, 30))
        duration = random.randint(60, 300)
        
        playbooks.append({
            "run_id": f"PB-{1000+i}",
            "case_id": case["case_id"],
            "playbook_name": template["name"],
            "started_at": start.isoformat(),
            "finished_at": (start + timedelta(seconds=duration)).isoformat(),
            "status": random.choice(["completed", "completed", "completed", "partial"]),
            "steps": template["steps"],
            "actions_taken": template["steps"][:random.randint(2, len(template["steps"]))],
            "notes": f"{case['case_id']} için otomatik yanıt"
        })
    
    return playbooks


def generate_mitre_coverage(cases, alerts):
    """MITRE ATT&CK kapsam verisi üret"""
    from collections import defaultdict
    
    overall = defaultdict(int)
    by_case = {}
    
    for case in cases:
        case_id = case["case_id"]
        by_case[case_id] = defaultdict(int)
        for tech in case.get("mitre_techniques", []):
            overall[tech] += 1
            by_case[case_id][tech] += 1
    
    techniques = []
    for tech_id, count in overall.items():
        info = MITRE_TECHNIQUES.get(tech_id, {"name": "Bilinmiyor", "tactic": "Bilinmiyor"})
        techniques.append({
            "id": tech_id,
            "name": info["name"],
            "tactic": info["tactic"],
            "count": count,
            "cases": [c["case_id"] for c in cases if tech_id in c.get("mitre_techniques", [])]
        })
    
    return {
        "overall": dict(overall),
        "by_case": {k: dict(v) for k, v in by_case.items()},
        "techniques": techniques,
        "summary": {
            "total_techniques": len(overall),
            "total_observations": sum(overall.values())
        }
    }


def generate_risk_scores(events, users):
    """Varlık risk puanları üret"""
    from collections import defaultdict
    
    user_scores = defaultdict(lambda: {"score": 0, "reasons": []})
    
    for evt in events:
        user = evt.get("user")
        if not user:
            continue
        
        tags = evt.get("tags", [])
        if "phishing" in tags:
            user_scores[user]["score"] += 20
            user_scores[user]["reasons"].append({"rule": "phishing_target", "points": 20, "description": "Oltalama e-postası aldı"})
        if "impossible_travel" in tags:
            user_scores[user]["score"] += 30
            user_scores[user]["reasons"].append({"rule": "impossible_travel", "points": 30, "description": "İmkansız seyahat tespit edildi"})
        if "mfa_bombing" in tags:
            user_scores[user]["score"] += 25
            user_scores[user]["reasons"].append({"rule": "mfa_fatigue", "points": 25, "description": "MFA bombardıman hedefi"})
        if "c2" in tags:
            user_scores[user]["score"] += 40
            user_scores[user]["reasons"].append({"rule": "c2_activity", "points": 40, "description": "C2 iletişimi tespit edildi"})
        if "privilege_escalation" in tags:
            user_scores[user]["score"] += 35
            user_scores[user]["reasons"].append({"rule": "priv_esc", "points": 35, "description": "Yetki yükseltme"})
    
    entity_scores = {}
    for user, data in user_scores.items():
        score = min(data["score"], 100)
        severity = "critical" if score >= 80 else "high" if score >= 60 else "medium" if score >= 40 else "low"
        entity_scores[user] = {
            "score": score,
            "severity": severity,
            "reasons": data["reasons"][:5]
        }
    
    for u in users:
        if u["email"] not in entity_scores:
            entity_scores[u["email"]] = {"score": random.randint(5, 25), "severity": "low", "reasons": []}
    
    return {"entity_scores": entity_scores}


def generate_entities(events, users, devices):
    """Varlık profilleri üret"""
    from collections import defaultdict
    
    user_profiles = {}
    ip_profiles = defaultdict(lambda: {"type": "ip", "first_seen": None, "last_seen": None, "users": set(), "reputation": "unknown"})
    
    for u in users:
        user_profiles[u["email"]] = {
            "type": "user",
            "email": u["email"],
            "name": u["name"],
            "dept": u["dept"],
            "title": u["title"],
            "role": u.get("role", "viewer"),
            "first_seen": None,
            "last_seen": None,
            "event_count": 0,
            "devices": set(),
            "ips": set(),
            "risk_score": 0
        }
    
    for evt in events:
        user = evt.get("user")
        ip = evt.get("src_ip")
        device = evt.get("device_id")
        ts = evt.get("timestamp")
        
        if user and user in user_profiles:
            p = user_profiles[user]
            p["event_count"] += 1
            if device:
                p["devices"].add(device)
            if ip:
                p["ips"].add(ip)
            if not p["first_seen"] or ts < p["first_seen"]:
                p["first_seen"] = ts
            if not p["last_seen"] or ts > p["last_seen"]:
                p["last_seen"] = ts
        
        if ip and ip not in ["", "10.0.0.1"]:
            ip_p = ip_profiles[ip]
            if user:
                ip_p["users"].add(user)
            if not ip_p["first_seen"] or ts < ip_p["first_seen"]:
                ip_p["first_seen"] = ts
            if not ip_p["last_seen"] or ts > ip_p["last_seen"]:
                ip_p["last_seen"] = ts
            
            if ip in MALICIOUS_IPS:
                ip_p["reputation"] = "malicious"
            elif ip in BENIGN_IPS:
                ip_p["reputation"] = "clean"
    
    for p in user_profiles.values():
        p["devices"] = list(p["devices"])
        p["ips"] = list(p["ips"])
    
    for p in ip_profiles.values():
        p["users"] = list(p["users"])
    
    return {
        "users": user_profiles,
        "ips": dict(ip_profiles),
        "devices": {d["id"]: d for d in devices}
    }


def generate_correlations(events, alerts, cases):
    """Korelasyon grafiği kenarları üret"""
    edges = []
    
    user_ips = {}
    for evt in events:
        user = evt.get("user")
        ip = evt.get("src_ip")
        if user and ip and ip not in ["", "10.0.0.1"]:
            key = f"{user}-{ip}"
            if key not in user_ips:
                user_ips[key] = {"source": user, "target": ip, "type": "user_ip", "weight": 0}
            user_ips[key]["weight"] += 1
    edges.extend(user_ips.values())
    
    for case in cases:
        for alert_id in case.get("alert_ids", []):
            edges.append({"source": case["case_id"], "target": alert_id, "type": "case_alert", "weight": 1})
    
    for alert in alerts:
        for evt_id in alert.get("evidence", []):
            edges.append({"source": alert["alert_id"], "target": evt_id, "type": "alert_evidence", "weight": 1})
    
    return {
        "edges": edges[:500],
        "patterns": [
            {"name": "phishing_chain", "description": "Oltalama e-postası → tıklama → kimlik bilgisi hırsızlığı"},
            {"name": "impossible_travel", "description": "Uzak konumlardan girişler"},
            {"name": "mfa_fatigue", "description": "Çoklu MFA push'ları ardından onay"},
            {"name": "c2_beacon", "description": "C2'ye periyodik giden bağlantılar"}
        ]
    }


def generate_summary(events, alerts, cases, users, devices, company):
    """Dashboard özeti üret"""
    sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for alert in alerts:
        sev_counts[alert["severity"]] = sev_counts.get(alert["severity"], 0) + 1
    
    return {
        "generated_at": datetime.now().isoformat(),
        "seed": SEED,
        "company": company,
        "metrics": {
            "total_events_analyzed": len(events),
            "total_alerts_generated": len(alerts),
            "total_cases": len(cases),
            "affected_users": len(set(e.get("user") for e in events if e.get("user"))),
            "affected_devices": len(set(e.get("device_id") for e in events if e.get("device_id"))),
            "alerts_by_severity": sev_counts
        },
        "users": [u["email"] for u in users],
        "devices": [d["id"] for d in devices],
        "mitre_techniques": list(MITRE_TECHNIQUES.keys())
    }


def save_outputs(data):
    """Üretilen tüm veriyi outputs/ klasörüne kaydet"""
    output_dir = Path("outputs")
    output_dir.mkdir(exist_ok=True)
    
    with open(output_dir / "events.jsonl", "w", encoding="utf-8") as f:
        for evt in data["events"]:
            f.write(json.dumps(evt, ensure_ascii=False) + "\n")
    print(f"[SAVE] events.jsonl ({len(data['events'])} olay)")
    
    with open(output_dir / "alerts.jsonl", "w", encoding="utf-8") as f:
        for alert in data["alerts"]:
            f.write(json.dumps(alert, ensure_ascii=False) + "\n")
    print(f"[SAVE] alerts.jsonl ({len(data['alerts'])} uyarı)")
    
    with open(output_dir / "cases.json", "w", encoding="utf-8") as f:
        json.dump({"cases": data["cases"]}, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] cases.json ({len(data['cases'])} vaka)")
    
    with open(output_dir / "iocs.json", "w", encoding="utf-8") as f:
        json.dump({"iocs": data["iocs"]}, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] iocs.json ({len(data['iocs'])} IOC)")
    
    edr_devices = generate_edr_devices(data["events"], data["devices"])
    with open(output_dir / "edr_devices.json", "w", encoding="utf-8") as f:
        json.dump({"devices": edr_devices}, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] edr_devices.json ({len(edr_devices)} cihaz)")
    
    playbooks = generate_playbook_runs(data["cases"])
    with open(output_dir / "playbook_runs.jsonl", "w", encoding="utf-8") as f:
        for pb in playbooks:
            f.write(json.dumps(pb, ensure_ascii=False) + "\n")
    print(f"[SAVE] playbook_runs.jsonl ({len(playbooks)} çalıştırma)")
    
    mitre = generate_mitre_coverage(data["cases"], data["alerts"])
    with open(output_dir / "mitre_coverage.json", "w", encoding="utf-8") as f:
        json.dump(mitre, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] mitre_coverage.json")
    
    kpi = generate_kpi_timeseries(data["events"], data["alerts"])
    with open(output_dir / "kpi_timeseries.json", "w", encoding="utf-8") as f:
        json.dump(kpi, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] kpi_timeseries.json")
    
    risk = generate_risk_scores(data["events"], data["users"])
    with open(output_dir / "risk_scores.json", "w", encoding="utf-8") as f:
        json.dump(risk, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] risk_scores.json")
    
    entities = generate_entities(data["events"], data["users"], data["devices"])
    with open(output_dir / "entities.json", "w", encoding="utf-8") as f:
        json.dump(entities, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] entities.json")
    
    correlations = generate_correlations(data["events"], data["alerts"], data["cases"])
    with open(output_dir / "correlations.json", "w", encoding="utf-8") as f:
        json.dump(correlations, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] correlations.json")
    
    summary = generate_summary(data["events"], data["alerts"], data["cases"], 
                               data["users"], data["devices"], data["company"])
    with open(output_dir / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] summary.json")


def main():
    print(f"\n{'='*60}")
    print("TÜRKİYE SOC SİMÜLASYON VERİ ÜRETECİ")
    print(f"Seed: {SEED}")
    print(f"Şirket: {PRIMARY_COMPANY['name']} (KURGUSAL)")
    print(f"{'='*60}\n")
    
    gen = TurkishSOCGenerator()
    data = gen.generate_all()
    
    print(f"\n{'='*60}")
    print("ÇIKTILAR KAYDEDİLİYOR")
    print(f"{'='*60}\n")
    
    save_outputs(data)
    
    print(f"\n{'='*60}")
    print("ÜRETİM TAMAMLANDI")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
