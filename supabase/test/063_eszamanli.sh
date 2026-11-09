#!/usr/bin/env bash
# 063 · aynı ürün × depo için 6 açılış fişi AYNI ANDA onaylanır → yalnız biri geçmeli (çift sayım yok).
# YALNIZ yerel/deneme veritabanında çalıştırılır (kalıcı belge oluşturur). Kullanım: 063_eszamanli.sh "<bağlantı>"
set -uo pipefail
C="$1"; Q() { psql "$C" -X -q -At -v ON_ERROR_STOP=1 "$@"; }; TMP=$(mktemp -d)
Y=$(Q -c "select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1")
D=$(Q -c "select id from depolar where aktif order by ad limit 1")
U=$(Q -c "select x.id from urunler x where x.aktif and not hizmet_adayi_mi(x.ad, x.kategori) and not exists (select 1 from stok_defteri h where h.urun_id = x.id) and not exists (select 1 from belge_satirlari s where s.urun_id = x.id) order by x.id desc limit 1")
yon() { Q <<SQL
begin; set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","email":"$Y"}', true) \g /dev/null
$1
commit;
SQL
}
for i in 1 2 3 4 5 6; do yon "select belge_kaydet('{\"istek_anahtari\":\"$(cat /proc/sys/kernel/random/uuid)\",\"tur\":\"ACL\",\"depo_id\":\"$D\",\"satirlar\":[{\"urun_id\":\"$U\",\"miktar\":7,\"birim_maliyet\":12}]}'::jsonb)->>'id';" > "$TMP/id$i"; done
for i in 1 2 3 4 5 6; do (yon "select belge_onayla('$(cat "$TMP/id$i")', 1);" > "$TMP/o$i" 2>&1) & done; wait
OK=$(grep -l '"no"' "$TMP"/o* | wc -l); RED=$(grep -l 'Açılış reddedildi' "$TMP"/o* | wc -l)
B=$(Q -c "select miktar::numeric(10,0) from stok_bakiye where urun_id = '$U' and depo_id = '$D'")
H=$(Q -c "select count(*) from stok_defteri where urun_id = '$U' and depo_id = '$D'")
echo "onaylanan $OK · reddedilen $RED · bakiye $B · hareket $H"
rm -rf "$TMP"
[ "$OK" = 1 ] && [ "$RED" = 5 ] && [ "$B" = 7 ] && [ "$H" = 1 ] && echo "063 eşzamanlılık: GEÇTİ" || { echo "063 eşzamanlılık: KALDI"; exit 1; }
