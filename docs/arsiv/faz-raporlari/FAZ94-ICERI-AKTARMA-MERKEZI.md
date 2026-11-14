# FAZ 94 — İçeri Aktarma Merkezi
Ürün, müşteri ve tedarikçi Excel/CSV aktarımı için:
1. Dosya seçimi
2. Sütun eşleştirme
3. Önizleme
4. Zorunlu alan kontrolü
5. Mükerrer kontrolü
6. Hatalı satır raporu
7. Kullanıcı onayı
8. Başarılı satırların aktarımı

Ürün zorunlu: stok kodu + ürün adı.
Müşteri/tedarikçi zorunlu: cari kodu + unvan.
Aktarım idempotent tasarlanmalı ve üretim verisine doğrudan kontrolsüz yazmamalıdır.
Production verisi değiştirilmedi.
