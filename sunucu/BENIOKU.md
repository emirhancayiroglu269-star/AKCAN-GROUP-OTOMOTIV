# Kendi sunucuya taşıma (Supabase'in kendisi, Hetzner)

1. Hetzner Cloud'da sunucu: Ubuntu 24.04, CX22 (2 çekirdek, 4 GB RAM). Root şifresi e-postayla gelir.
2. Windows'ta PowerShell'i açın: `ssh root@SUNUCU_IP` (ilk girişte şifre değiştirmeniz istenir).
3. Kurulum: `curl -fsSL https://raw.githubusercontent.com/emirhancayiroglu269-star/AKCAN-GROUP-OTOMOTIV/analiz-kaynak/sunucu/kur.sh | bash`
   - BizimHesap API anahtarı ve Otomarmara giriş bilgileri sorulur (ekranda görünmez, yalnız sunucuya kaydedilir).
   - Sonunda ADRES ve ANAHTAR satırları yazar: bu iki satır herkese açık bilgidir, Claude'a gönderin.
   - Yönetim paneli şifresini kendiniz saklayın.
4. Taşıma: `curl -fsSL https://raw.githubusercontent.com/emirhancayiroglu269-star/AKCAN-GROUP-OTOMOTIV/analiz-kaynak/sunucu/tasi.sh | bash`
   - Supabase bulut veritabanı bağlantı adresi (şifreli) sorulur; yalnız okuma yapılır.
5. Claude siteyi yeni adrese bağlar, kontrol eder; Supabase buluttaki otomatik görevler durdurulur.
6. "Analize Aktar" yer imini Ayarlar'dan yeniden oluşturun (yeni adresi içerir).

Ayarlar: `/opt/akcan/supabase/.env` (gizli). Durum: `cd /opt/akcan/supabase && sh run.sh status`.
