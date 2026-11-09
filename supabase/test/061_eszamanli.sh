#!/usr/bin/env bash
# 061 belge motoru · eşzamanlılık testleri (aynı anda çok bağlantı)
# Kullanım: 061_eszamanli.sh "<bağlantı>"   (ör. "service=test")
# Yalnız yeni belge tablolarına yazar; sonunda test belgelerinin izi temizleme adımında silinir (yalnız test ortamı).
set -uo pipefail
C="$1"; Q() { psql "$C" -X -q -At -v ON_ERROR_STOP=1 "$@"; }
TMP=$(mktemp -d); GECEN=0; KALAN=0
k() { if [ "$2" = "1" ]; then echo "GEÇTİ | $1 | ${3:-}"; GECEN=$((GECEN+1)); else echo "KALDI | $1 | ${3:-}"; KALAN=$((KALAN+1)); fi; }

Y=$(Q -c "select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1")
D1=$(Q -c "select id from depolar where aktif order by ad limit 1"); D2=$(Q -c "select id from depolar where aktif order by ad offset 1 limit 1")
mapfile -t P < <(Q -c "select id from urunler where aktif order by id offset 20 limit 5")
CLAIMS="{\"role\":\"authenticated\",\"email\":\"$Y\"}"
yon() { Q <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claims', '$CLAIMS', true) \\g /dev/null
$1
commit;
SQL
}
kaydet() { yon "select belge_kaydet('{\"istek_anahtari\":\"$(cat /proc/sys/kernel/random/uuid)\",\"tur\":\"$1\",\"depo_id\":\"$2\",\"hedef_depo_id\":${4:-null},\"satirlar\":$3}'::jsonb)->>'id';"; }
onayla_arka() { yon "select belge_onayla('$1', (select surum from belgeler where id = '$1'));" > "$TMP/$2" 2>&1 & }
bakiye() { Q -c "select coalesce((select miktar from stok_bakiye where urun_id = '$1' and depo_id = '$2'), 0)::numeric(14,3)"; }

echo "--- eşzamanlılık testleri ---"
# C1: aynı belgeye aynı anda 20 onay
B=$(kaydet GIR "$D1" "[{\"urun_id\":\"${P[0]}\",\"miktar\":1,\"birim_maliyet\":10}]")
for i in $(seq 1 20); do onayla_arka "$B" "c1_$i"; done; wait
TEK=$(Q -c "select count(*) from stok_defteri where belge_id = '$B'"); ZATEN=$(grep -l '"zaten": true' "$TMP"/c1_* | wc -l); HATA=$(grep -l 'ERROR' "$TMP"/c1_* | wc -l)
k "Aynı belgeye aynı anda 20 onay: tek hareket, tek numara, 19'u 'zaten onaylı'" "$([ "$TEK" = 1 ] && [ "$ZATEN" = 19 ] && [ "$HATA" = 0 ] && [ "$(bakiye "${P[0]}" "$D1")" = "1.000" ] && echo 1)" "hareket $TEK · zaten $ZATEN · hata $HATA"

# C2: 5 adet stoka aynı anda 12 çıkış → 5'i geçer, 7'si eksi stok nedeniyle reddedilir
B=$(kaydet GIR "$D1" "[{\"urun_id\":\"${P[1]}\",\"miktar\":5,\"birim_maliyet\":20}]"); yon "select belge_onayla('$B', 1);" >/dev/null
for i in $(seq 1 12); do echo "$(kaydet CIK "$D1" "[{\"urun_id\":\"${P[1]}\",\"miktar\":1}]")" > "$TMP/c2_id_$i"; done
for i in $(seq 1 12); do onayla_arka "$(cat "$TMP/c2_id_$i")" "c2_$i"; done; wait
OK=$(grep -l '"no"' "$TMP"/c2_[0-9]* | wc -l); EKSI=$(grep -l 'Eksi stok' "$TMP"/c2_[0-9]* | wc -l)
k "5 adet stoka aynı anda 12 çıkış: 5'i onaylanır, 7'si eksi stok nedeniyle reddedilir, bakiye 0" "$([ "$OK" = 5 ] && [ "$EKSI" = 7 ] && [ "$(bakiye "${P[1]}" "$D1")" = "0.000" ] && echo 1)" "onaylanan $OK · reddedilen $EKSI · bakiye $(bakiye "${P[1]}" "$D1")"

# C3: aynı ürüne aynı anda 10 giriş (100…109 TL) → toplam 10, ortalama sıradan bağımsız 104,5
for i in $(seq 0 9); do echo "$(kaydet GIR "$D2" "[{\"urun_id\":\"${P[2]}\",\"miktar\":1,\"birim_maliyet\":$((100+i))}]")" > "$TMP/c3_id_$i"; done
for i in $(seq 0 9); do onayla_arka "$(cat "$TMP/c3_id_$i")" "c3_$i"; done; wait
R=$(Q -c "select toplam_miktar::numeric(14,3) || ' / ' || ort_maliyet from urun_maliyet where urun_id = '${P[2]}'")
k "Aynı ürüne aynı anda 10 giriş: toplam 10, ortalama 104,5000" "$([ "$R" = "10.000 / 104.5000" ] && echo 1)" "$R"

# C4: ters sırada iki ürün içeren 20 çıkış aynı anda → kilitlenme (deadlock) yok, hepsi geçer
B=$(kaydet GIR "$D1" "[{\"urun_id\":\"${P[3]}\",\"miktar\":50,\"birim_maliyet\":1},{\"urun_id\":\"${P[4]}\",\"miktar\":50,\"birim_maliyet\":1}]"); yon "select belge_onayla('$B', 1);" >/dev/null
for i in $(seq 1 20); do
  if [ $((i % 2)) = 0 ]; then S="[{\"urun_id\":\"${P[3]}\",\"miktar\":1},{\"urun_id\":\"${P[4]}\",\"miktar\":1}]"; else S="[{\"urun_id\":\"${P[4]}\",\"miktar\":1},{\"urun_id\":\"${P[3]}\",\"miktar\":1}]"; fi
  echo "$(kaydet CIK "$D1" "$S")" > "$TMP/c4_id_$i"; done
for i in $(seq 1 20); do onayla_arka "$(cat "$TMP/c4_id_$i")" "c4_$i"; done; wait
OK=$(grep -l '"no"' "$TMP"/c4_[0-9]* | wc -l); DL=$(grep -il 'deadlock' "$TMP"/c4_[0-9]* | wc -l)
k "Ters sırada iki ürünlü 20 çıkış aynı anda: kilitlenme yok, hepsi onaylanır, bakiyeler 30" "$([ "$OK" = 20 ] && [ "$DL" = 0 ] && [ "$(bakiye "${P[3]}" "$D1")" = "30.000" ] && [ "$(bakiye "${P[4]}" "$D1")" = "30.000" ] && echo 1)" "onaylanan $OK · kilitlenme $DL"

# C5: iki yönlü transferler aynı anda (D1→D2 ve D2→D1) → toplam değişmez, eksi yok
yon "select belge_onayla((belge_kaydet('{\"istek_anahtari\":\"$(cat /proc/sys/kernel/random/uuid)\",\"tur\":\"TRF\",\"depo_id\":\"$D1\",\"hedef_depo_id\":\"$D2\",\"satirlar\":[{\"urun_id\":\"${P[3]}\",\"miktar\":10}]}'::jsonb)->>'id')::uuid, 1)::text;" >/dev/null
for i in $(seq 1 10); do echo "$(kaydet TRF "$D1" "[{\"urun_id\":\"${P[3]}\",\"miktar\":1}]" "\"$D2\"")" > "$TMP/c5_id_a$i"; echo "$(kaydet TRF "$D2" "[{\"urun_id\":\"${P[3]}\",\"miktar\":1}]" "\"$D1\"")" > "$TMP/c5_id_b$i"; done
for i in $(seq 1 10); do onayla_arka "$(cat "$TMP/c5_id_a$i")" "c5_a$i"; onayla_arka "$(cat "$TMP/c5_id_b$i")" "c5_b$i"; done; wait
OK=$(grep -l '"no"' "$TMP"/c5_* | wc -l); T=$(Q -c "select sum(miktar)::numeric(14,3) from stok_bakiye where urun_id = '${P[3]}'")
k "İki yönlü 20 transfer aynı anda: hepsi onaylanır, iki depo toplamı 30 kalır, kilitlenme yok" "$([ "$OK" = 20 ] && [ "$T" = "30.000" ] && [ "$(grep -il deadlock "$TMP"/c5_* | wc -l)" = 0 ] && echo 1)" "onaylanan $OK · toplam $T"

# tutarlılık
R=$(Q <<'SQL'
select (select count(*) from stok_bakiye b full join (select urun_id, depo_id, sum(miktar) s from stok_defteri group by 1, 2) d using (urun_id, depo_id) where coalesce(b.miktar, 0) <> coalesce(d.s, 0))
  + (select count(*) from urun_maliyet m left join (select urun_id, sum(miktar) s from stok_bakiye group by 1) b using (urun_id) where m.toplam_miktar <> coalesce(b.s, 0))
  + (select count(*) from stok_bakiye where miktar < 0)
  + (select count(*) from (select tur, yil, count(*) n, max(sira_no) m, count(distinct no) d from belgeler where no is not null group by 1, 2) x where n <> m or d <> n);
SQL
)
k "Eşzamanlı işlemlerden sonra: bakiye = defter, toplam = depolar, eksi yok, numaralar boşluksuz" "$([ "$R" = 0 ] && echo 1)" "tutarsızlık $R"
echo "eşzamanlılık: $GECEN geçti, $KALAN kaldı"
rm -rf "$TMP"
[ "$KALAN" = 0 ]
