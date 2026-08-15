# FAZ 110 — Satış Sonrası Otomatik Hareket Zinciri

Satış tamamlandığında ERP'nin bağlı modüllerinin tek zincir halinde işlenmesi için
domain kontrolü eklendi.

## Zincir
Satış
→ Stok düşümü
→ Cari hareket
→ Kasa/Banka
→ Fatura/Belge
→ Audit Log
→ Bildirim

## Veri bütünlüğü
Stok, cari, belge ve audit temel hareketleri tamamlanmadan satış işlemi başarılı
kabul edilmemelidir.

Her alt hareket için satış ID + hareket tipi idempotency anahtarı kullanılmalıdır;
aynı hareketin ikinci kez oluşturulması engellenmelidir.

Kasa/Banka hareketi ödeme tipine göre seçilir. Açık hesapta cari hareket zorunludur.

Production verisi değiştirilmedi.
