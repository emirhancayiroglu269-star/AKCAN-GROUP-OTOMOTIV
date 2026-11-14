# FAZ 147 — Stok Transfer Merkezi

Depolar ve raflar arasında stok transferinin kontrollü şekilde yapılması için
merkezi transfer domain'i oluşturuldu.

## Akış
Transfer Talebi → Onay → Hazırlama → Çıkış → Yolda → Teslim Alma → Tamamlandı

## Transfer kalemi
- Ürün
- Miktar
- Kaynak depo / raf
- Hedef depo / raf
- Çıkış miktarı
- Teslim alınan miktar

## Kontroller
Kaynak ve hedef deponun aynı olması engellenir. Eksik teslim miktarı
hesaplanabilir. Transfer numarası + ürün ile çift kayıt önlenir.

Production verisi değiştirilmedi.
