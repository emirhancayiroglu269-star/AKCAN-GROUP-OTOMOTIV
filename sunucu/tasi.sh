#!/usr/bin/env bash
# Akcan BizimHesap Analiz — verileri Supabase bulutundan kendi sunucuna taşır (kur.sh'den sonra, root olarak)
# Kullanım: curl -fsSL https://raw.githubusercontent.com/emirhancayiroglu269-star/AKCAN-GROUP-OTOMOTIV/analiz-kaynak/sunucu/tasi.sh | bash
# Bulut veritabanı bağlantı adresi (şifresiyle) yalnız bu sunucunun klavyesinden sorulur; hiçbir yere kaydedilmez.
set -euo pipefail
DIZIN="/opt/akcan/supabase"
adim() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
hata() { printf '\n\033[1;31mHATA: %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || hata "root olarak çalıştırın"
[ -f "$DIZIN/.env" ] || hata "Önce kur.sh çalıştırılmalı ($DIZIN/.env yok)"
cd "$DIZIN"
deger() { grep "^$1=" .env | head -n1 | cut -d= -f2- | sed "s/^'//; s/'$//"; }
ANON=$(deger ANON_KEY); ALAN=$(deger PROXY_DOMAIN)
SQL() { docker exec -i supabase-db psql -v ON_ERROR_STOP=1 -q -U supabase_admin -d postgres "$@"; }
docker exec supabase-db pg_isready -U postgres >/dev/null || hata "Veritabanı çalışmıyor: cd $DIZIN && sh run.sh start"

cat <<'BILGI'

Supabase bulut veritabanının bağlantı adresi gerekiyor:
  Supabase paneli → projeniz → üstte "Connect" → "Session pooler" → URI
  Örnek: postgresql://postgres.qmafuyuocmcobrstnmbx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
  [YOUR-PASSWORD] yerine veritabanı şifrenizi yazın (bilmiyorsanız: Project Settings → Database → Reset database password).
Yapıştırdığınız adres ekranda görünmez.
BILGI
read -rsp "Bağlantı adresi: " URI < /dev/tty; echo
case "$URI" in postgres://*|postgresql://*) ;; *) hata "Adres postgresql:// ile başlamalı" ;; esac

IS=$(mktemp -d); trap 'rm -rf "$IS"' EXIT; chmod 700 "$IS"
PGD() { docker run --rm -i --network host -e PGCONNECT_TIMEOUT=20 -v "$IS:/w" postgres:17-alpine "$@"; }

adim "Bulut veritabanı okunuyor (yalnız okuma)"
PGD pg_dump "$URI" --schema=public --no-owner --format=custom --file=/w/public.dump
PGD pg_dump "$URI" --data-only --table=auth.users --table=auth.identities --format=custom --file=/w/auth.dump
ls -lh "$IS"

adim "Yeni veritabanı hazırlanıyor"
SQL <<'EOF'
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
EOF

adim "Tablolar ve veriler yükleniyor"
docker cp "$IS/public.dump" supabase-db:/tmp/public.dump
docker cp "$IS/auth.dump" supabase-db:/tmp/auth.dump
set +e
docker exec supabase-db pg_restore -U supabase_admin -d postgres --no-owner --role=postgres /tmp/public.dump 2> "$IS/public.err"
grep -c "error:" "$IS/public.err" | xargs -I{} echo "  tablo yüklemesinde {} uyarı/hata"; grep "error:" "$IS/public.err" | head -15
docker exec supabase-db pg_restore -U supabase_admin -d postgres --data-only --disable-triggers /tmp/auth.dump 2> "$IS/auth.err"
AUTH_HATA=$(grep -c "error:" "$IS/auth.err"); grep "error:" "$IS/auth.err" | head -5
set -e
docker exec supabase-db rm -f /tmp/public.dump /tmp/auth.dump

adim "Canlı güncelleme ve otomatik görevler"
SQL <<EOF
do \$\$ declare t text; begin
  foreach t in array array['ayarlar','kullanicilar','otomarmara_veri','stok_aksiyon','tahsilat_notlari','urun_kodlari'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t); exception when duplicate_object then null; end;
  end loop;
end \$\$;
select cron.schedule('bizimhesap-esitle', '*/2 * * * *', \$c\$select net.http_post(url := 'http://api-gw:8000/functions/v1/bizimhesap-esitle', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer $ANON'), body := '{}'::jsonb, timeout_milliseconds := 120000)\$c\$);
select cron.schedule('otomarmara-muadil', '* * * * *', \$c\$select net.http_post(url := 'http://api-gw:8000/functions/v1/otomarmara-muadil', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer $ANON'), body := '{}'::jsonb, timeout_milliseconds := 150000) where exists (select 1 from public.otomarmara_veri where durum = 'istendi')\$c\$);
select cron.schedule('otomarmara-toplu-kuyruk', '*/5 * * * *', 'select public.om_kuyruk_besle()');
select cron.schedule('silinen-temizlik', '17 3 * * *', \$c\$delete from public.silinen where zaman < now() - interval '7 days'\$c\$);
EOF
# BizimHesap eşitlemesinin kilidi ve durum alanları temiz başlasın
SQL -c "update public.bh_durum set kilit = null where id = 1; update public.om_durum set kilit = null where id = 1;"

adim "Kontrol"
SQL -At <<'EOF'
select 'ürünler: ' || count(*) from public.urunler;
select 'fatura satırları: ' || count(*) from public.rapor_satirlari;
select 'kasa hareketleri: ' || count(*) from public.kasa_akisi;
select 'Otomarmara: ' || count(*) from public.otomarmara_veri;
select 'OEM kodları: ' || count(*) from public.urun_kodlari;
select 'giriş hesapları: ' || count(*) from auth.users;
select 'otomatik görevler: ' || count(*) from cron.job;
EOF
echo "BizimHesap eşitlemesi deneniyor..."
curl -s --max-time 150 -X POST -H "Authorization: Bearer $ANON" -H 'Content-Type: application/json' -d '{}' "https://$ALAN/functions/v1/bizimhesap-esitle" | head -c 300; echo

cat <<SON

============================================================
 TAŞIMA TAMAM
 Claude'a "taşıma bitti" yazın ve yukarıdaki "Kontrol" satırlarını gönderin
 (sayılar herkese açık bilgi değildir ama hassas da değildir; şifre/anahtar içermez).
SON
if [ "${AUTH_HATA:-0}" != 0 ]; then cat <<'SON2'
 NOT: Giriş hesabı taşınamadı. Yönetim panelinde (https://<adres>) Authentication → Users → "Add user"
      ile aynı e-postayla hesabınızı oluşturup şifrenizi kendiniz belirleyin.
SON2
fi
echo "============================================================"
