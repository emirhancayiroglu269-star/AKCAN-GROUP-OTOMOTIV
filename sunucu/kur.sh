#!/usr/bin/env bash
# Akcan BizimHesap Analiz — kendi sunucuna Supabase kurulumu (Ubuntu 24.04, root olarak)
# Kullanım (Hetzner Console'da):  curl -fsSL https://raw.githubusercontent.com/emirhancayiroglu269-star/AKCAN-GROUP-OTOMOTIV/analiz-kaynak/sunucu/kur.sh | bash
# Ne yapar: Docker + Supabase (resmi kurulum, sabit sürüm) + HTTPS (Caddy, <ip>.sslip.io adresi; alan adı gerekmez)
#           + bizim sunucu fonksiyonlarımız + gizli değerler (yalnız bu sunucunun klavyesinden sorulur, hiçbir yere gönderilmez)
set -euo pipefail
SURUM="self-hosted/v0.8.3"
DEPO="https://raw.githubusercontent.com/emirhancayiroglu269-star/AKCAN-GROUP-OTOMOTIV/analiz-kaynak"
SITE="https://emirhancayiroglu269-star.github.io"
DIZIN="/opt/akcan"
FONKSIYONLAR="bizimhesap-esitle bizimhesap-rapor otomarmara-muadil otomarmara-ara"

adim() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
hata() { printf '\n\033[1;31mHATA: %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || hata "root olarak çalıştırın"
[ -r /dev/tty ] || hata "Bu betik klavyeden bilgi ister; Hetzner Console ya da SSH terminalinde çalıştırın"

adim "Sunucu adresi"
IP=$(curl -4 -fsS --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
ALAN="${IP//./-}.sslip.io"
echo "IP: $IP   Adres: https://$ALAN"

adim "Sistem güncelleniyor, takas alanı ve güvenlik duvarı"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get -y -qq upgrade >/dev/null
apt-get install -y -qq curl git jq openssl ufw unattended-upgrades >/dev/null
if ! swapon --show | grep -q .; then fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi
ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null; ufw --force enable >/dev/null

adim "Supabase kuruluyor ($SURUM) — birkaç dakika sürer"
mkdir -p "$DIZIN" && cd "$DIZIN"
[ -d supabase ] && hata "$DIZIN/supabase zaten var (yeniden kurmak için önce onu taşıyın/silin)"
curl -fsSL "https://raw.githubusercontent.com/supabase/supabase/$SURUM/docker/setup.sh" -o setup.sh
sh setup.sh -y --ref "$SURUM" --project-dir supabase
cd supabase
chmod 600 .env

adim "Ayarlar"
# özel karakter içeren değerler de bozulmasın diye sed yerine satır sil + ekle
ayarla() { grep -v "^$1=" .env > .env.yeni || true; printf '%s=%s\n' "$1" "$2" >> .env.yeni; cat .env.yeni > .env; rm -f .env.yeni; }
ayarla SUPABASE_PUBLIC_URL "https://$ALAN"
ayarla API_EXTERNAL_URL "https://$ALAN/auth/v1"
ayarla SITE_URL "$SITE/AKCAN-GROUP-OTOMOTIV/"
ayarla ADDITIONAL_REDIRECT_URLS "$SITE/AKCAN-GROUP-OTOMOTIV/"
ayarla PROXY_DOMAIN "$ALAN"
ayarla CERTBOT_EMAIL "admin@$ALAN"
# yeni kullanıcı kaydı kapalı: personel hesapları yönetici panelinden (Studio) eklenir
ayarla DISABLE_SIGNUP true
ayarla ENABLE_ANONYMOUS_USERS false
ayarla FUNCTIONS_VERIFY_JWT true
ayarla STUDIO_DEFAULT_PROJECT "Akcan Analiz"

adim "Sunucu fonksiyonları"
for f in $FONKSIYONLAR; do mkdir -p "volumes/functions/$f" && curl -fsSL "$DEPO/supabase/functions/$f/index.ts" -o "volumes/functions/$f/index.ts"; echo "  $f"; done
curl -fsSL "$DEPO/sunucu/docker-compose.akcan.yml" -o docker-compose.akcan.yml

adim "Gizli değerler (yazdıklarınız ekranda görünmez, yalnız bu sunucuya kaydedilir)"
sor() { local v; read -rsp "  $2: " v < /dev/tty; echo; v=${v//\'/}; ayarla "$1" "'$v'"; }
sor AKCAN_BH_TOKEN "BizimHesap API anahtarı (BH_TOKEN; Supabase'e daha önce girdiğinizle aynı — BizimHesap ayarlarından alınır)"
sor AKCAN_OM_MUSTERI_KODU "Otomarmara müşteri kodu"
sor AKCAN_OM_KULLANICI "Otomarmara kullanıcı adı"
sor AKCAN_OM_SIFRE "Otomarmara şifresi"

adim "Başlatılıyor"
sh run.sh config add caddy akcan >/dev/null
sh run.sh start
echo "Hizmetlerin açılması ve HTTPS sertifikası bekleniyor (en fazla 5 dk)..."
ANON=$(grep '^ANON_KEY=' .env | cut -d= -f2-)
for _ in $(seq 1 60); do
  kod=$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $ANON" "https://$ALAN/rest/v1/" || true)
  [ "$kod" = 200 ] && break; sleep 5
done
[ "${kod:-}" = 200 ] || echo "UYARI: https://$ALAN henüz yanıt vermiyor (son kod: ${kod:-yok}). Birkaç dakika sonra 'cd $DIZIN/supabase && sh run.sh status' ile bakın."

cat <<SON

============================================================
 KURULUM TAMAM
 Adres          : https://$ALAN
 Yönetim paneli : https://$ALAN   (kullanıcı: $(grep '^DASHBOARD_USERNAME=' .env | cut -d= -f2-)  şifre: $(grep '^DASHBOARD_PASSWORD=' .env | cut -d= -f2-))
                  → bu şifreyi kendiniz saklayın, kimseyle paylaşmayın
 Ayarlar dosyası: $DIZIN/supabase/.env  (gizli; yedekleyin)

 Claude'a yalnız şu iki satırı gönderin (ikisi de herkese açık bilgidir):
   ADRES=https://$ALAN
   ANAHTAR=$ANON

 Sonraki adım: verileri taşımak için
   curl -fsSL $DEPO/sunucu/tasi.sh | bash
============================================================
SON
