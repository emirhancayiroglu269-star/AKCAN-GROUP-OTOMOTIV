#!/usr/bin/env bash
# F2.1 dosya denetimi: 065/066/067 Faz 1 ve BizimHesap tablolarına YAZMAZ, Faz 1 yazma fonksiyonlarını ÇAĞIRMAZ,
# Faz 1 motor ayarını KULLANMAZ, mevcut tablolara yabancı anahtar / tetikleyici / sütun EKLEMEZ.
# Kullanım: bash test/f21_dosya_denetimi.sh   (supabase klasöründen)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
DOSYALAR="065_satin_alma.sql 066_kopru_baslangic.sql 067_deneme_veri.sql"
F1='(belge_turleri|belgeler|belge_satirlari|stok_defteri|stok_bakiye|urun_maliyet|belge_sayac|urun_turu|urunler|urun_depo_stok|rapor_satirlari|cariler|depolar|kullanicilar|denetim)'
GECEN=0; KALAN=0
k() { if [ -z "$2" ]; then echo "GEÇTİ | $1"; GECEN=$((GECEN+1)); else echo "KALDI | $1"; echo "$2" | sed 's/^/        /'; KALAN=$((KALAN+1)); fi; }
# yorum satırları ve satır sonu yorumları denetim dışı
temiz() { sed -E 's/--.*$//' "$@"; }
k "Faz 1 / BizimHesap tablosuna insert, update, delete, truncate yok" \
  "$(temiz $DOSYALAR | grep -nEi "(insert[[:space:]]+into|update|delete[[:space:]]+from|truncate)[[:space:]]+(public\.)?$F1\b" || true)"
k "Faz 1 / BizimHesap tablosunda alter table, create trigger, create index, policy yok" \
  "$(temiz $DOSYALAR | grep -nEi "(alter[[:space:]]+table|on)[[:space:]]+(public\.)?$F1\b" | grep -Ei "alter table|trigger|index|policy" || true)"
k "Mevcut tablolara yabancı anahtar (references) yok" \
  "$(temiz $DOSYALAR | grep -nEi "references[[:space:]]+(public\.)?$F1\b" || true)"
k "Faz 1 yazma fonksiyonları çağrılmıyor (belge_kaydet, belge_onayla, belge_iptal, belge_taslak_sil, _hareket, _kilitle, acilis_taslagi_olustur, urun_turu_belirle)" \
  "$(temiz $DOSYALAR | grep -nEi "\b(belge_kaydet|belge_onayla|belge_iptal|belge_taslak_sil|_hareket|_kilitle|acilis_taslagi_olustur|urun_turu_belirle)[[:space:]]*\(" || true)"
k "Faz 1 motor ayarı (akcan.motor) kullanılmıyor" "$(temiz $DOSYALAR | grep -n "akcan.motor" || true)"
k "Faz 1 fonksiyonu yeniden tanımlanmıyor" \
  "$(temiz $DOSYALAR | grep -nEi "create[[:space:]]+(or[[:space:]]+replace[[:space:]]+)?function[[:space:]]+(public\.)?(belge_|_hareket|_kilitle|_kim\b|acilis_|urun_turu|hizmet_adayi_mi|_stoklu_mu|_belge_koru|_satir_koru|_defter_koru|_motor_tablo_koru|_truncate_yok|_miktar_yaz|denetim_tg|benim_rolum)" || true)"
echo "dosya denetimi: $GECEN geçti, $KALAN kaldı"
[ "$KALAN" -eq 0 ]
