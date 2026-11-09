#!/usr/bin/env bash
# YALNIZ YEREL TEST VERİTABANI. Aynı anda 6 köprü çalıştırması: her fatura için tek kayıt ve tek taslak oluşmalı.
# Kalıcı kesim kaydı yazar; bu yüzden akcan-test'te ÇALIŞTIRILMAZ (F2.1 Aşama A'da kalıcı kesim yasak).
# Kullanım: 066_eszamanli.sh "<yerel bağlantı>"
set -uo pipefail
C="$1"; Q() { psql "$C" -X -q -At -v ON_ERROR_STOP=1 "$@"; }
TMP=$(mktemp -d)
Y=$(Q -c "select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1")
SB=$(Q -c "select id from depolar where ad ilike 'SULTANBEYL%' and aktif order by ad limit 1")
CL="{\"role\":\"authenticated\",\"email\":\"$Y\"}"
Q -c "select deneme_veri_yukle()" >/dev/null
Q <<SQL >/dev/null
begin; select set_config('request.jwt.claims', '$CL', true); select kopru_kesim_onayla('$SB', 'alis', '2026-11-07 17:20:05+03', 'yerel eşzamanlılık testi'); commit;
SQL
for i in 1 2 3 4 5 6; do
  ( Q <<SQL > "$TMP/c_$i" 2>&1
begin; set local role authenticated; select set_config('request.jwt.claims', '$CL', true) \g /dev/null
select alis_kopru_calistir('deneme'); commit;
SQL
  ) &
done
wait
HATA=$(grep -l ERROR "$TMP"/c_* | wc -l)
read KK AT ATS TD <<<"$(Q -F' ' -c "select (select count(*) from kopru_kayit), (select count(*) from alis_taslak), (select count(*) from alis_taslak_satir), (select count(*) from tedarikciler)")"
echo "eşzamanlı 6 çalıştırma: hata $HATA · köprü kaydı $KK · alış taslağı $AT · taslak satırı $ATS · tedarikçi $TD"
if [ "$HATA" = 0 ] && [ "$KK" = 10 ] && [ "$AT" = 5 ] && [ "$ATS" = 14 ] && [ "$TD" = 3 ]; then echo "066 eşzamanlılık: GEÇTİ"; else echo "066 eşzamanlılık: KALDI"; cat "$TMP"/c_*; fi
rm -rf "$TMP"
