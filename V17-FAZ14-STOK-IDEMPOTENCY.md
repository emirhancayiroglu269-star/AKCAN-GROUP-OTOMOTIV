# V17 Faz 14 — Stok Hareket Idempotency

Stok hareket motoruna belge bazlı çift işlem koruması eklendi.
Anahtar: parcaId + tur + belgeNo + giris + cikis.
Belge numarası boş manuel hareketler eski davranışı korur.
