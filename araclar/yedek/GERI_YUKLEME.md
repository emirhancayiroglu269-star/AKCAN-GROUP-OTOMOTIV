# Yedek ve geri yükleme

## Yedek nasıl alınıyor?

- GitHub Actions'taki **Veritabanı yedeği** işi her gece 03:30'da (Türkiye) çalışır (`.github/workflows/yedek.yml`, kaynağı `araclar/yedek/yedek.yml`).
- Alınanlar: `public` şemasının tamamı (tüm tablolar, veriler, görünümler, fonksiyonlar, tetikleyiciler, RLS politikaları), giriş hesapları (`auth.users`, `auth.identities`), zamanlanmış görevler listesi ve her tablonun satır sayısı.
- Her yedek, boş bir PostgreSQL 17 veritabanına geri yüklenir; her tablonun satır sayısı canlıyla karşılaştırılır. Sonuç sitede **Ayarlar > Yedekler** bölümünde görünür. 36 saat başarılı yedek olmazsa sabah önerilerine uyarı düşer.
- Dosya AES-256 ile şifrelenir ve 30 gün saklanır: GitHub > depo > **Actions** > Veritabanı yedeği > ilgili çalışma > **Artifacts**.

## Kurulum (bir kez, sizin yapmanız gerekir)

1. Supabase > proje > **Connect** > **Session pooler** bağlantı adresini kopyalayın (`postgresql://postgres.qmafuyuocmcobrstnmbx:[ŞİFRE]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`). `[ŞİFRE]` yerine veritabanı şifresini yazın; şifreyi bilmiyorsanız aynı ekrandan sıfırlayabilirsiniz.
2. GitHub > depo > **Settings > Secrets and variables > Actions > New repository secret**:
   - `SUPABASE_DB_URL` = 1. adımdaki adres
   - `YEDEK_SIFRE` = en az 20 karakterlik bir parola. **Bu parolayı kaybederseniz yedekler açılamaz**; şifre yöneticinizde ya da kâğıtta saklayın.
3. GitHub > **Actions** > Veritabanı yedeği > **Run workflow** ile ilk yedeği hemen alın.

## Geri yükleme (gerekirse)

Bilgisayarda PostgreSQL 17 istemcisi ve `gpg` gerekir (Windows'ta Git Bash ile gelir).

```bash
# 1) şifreyi çöz ve aç
gpg -d akcan-yedek-YYYYMMDD-HHMM.tar.gz.gpg | tar -xzf -      # parola sorulur
# 2) önce yeni (boş) bir Supabase projesine ya da yerel bir veritabanına yükleyin; canlıya doğrudan yüklemeyin
pg_restore -l yedek/public.dump | grep -v -E ' EXTENSION | PUBLICATION |COMMENT - EXTENSION| SCHEMA - public |COMMENT - SCHEMA public' > liste.txt
pg_restore -d "HEDEF_BAGLANTI_ADRESI" --no-owner --no-privileges -L liste.txt yedek/public.dump
# 3) giriş hesapları (yalnız boş bir Supabase projesine)
psql "HEDEF_BAGLANTI_ADRESI" -f yedek/auth_hesaplar.sql
# 4) zamanlanmış görevler: yedek/cron_gorevleri.tsv'deki satırları cron.schedule ile yeniden kurun
```

Yeni Supabase projesine yüklendikten sonra: Edge Functions'ları (`supabase/functions`) yeniden dağıtın ve gizli değerleri (BH_TOKEN, Otomarmara, Neko, Trendyol) yeniden girin; sitenin `src/lib/baglanti.ts` dosyasındaki adres ve anahtarı yeni projeninkiyle değiştirin.

## İzin değişikliğini geri alma

Faz 0'ın yetki değişikliği (`supabase/059_faz0_yetki_denetim.sql`) sorun çıkarırsa `supabase/yedek/059_geri_al.sql` dosyası Supabase SQL Editor'de çalıştırılır. Veri silmez; izinleri 07.11.2026 öncesine döndürür.
