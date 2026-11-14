# FAZ 139 — Depo Sevkiyat & Paketleme Merkezi

Siparişlerin depodan toplanıp kontrol edilmesi, paketlenmesi ve kargoya hazır
hale getirilmesi için merkezi operasyon domain'i oluşturuldu.

## Operasyon akışı
Sipariş → Toplama Listesi → Raf Konumu → Ürün Toplama → Kontrol → Paketleme → Etiket → Sevkiyata Hazır

## Toplama
Her kalemde:
- Ürün
- Stok kodu
- Raf kodu
- İstenen miktar
- Toplanan miktar
- Toplayan personel
- Durum

## Paketleme
Paket numarası, barkod, ağırlık, paketleyen personel ve etiket basım zamanı
takip edilebilir.

## Sevkiyat kilidi
Toplama, kontrol, paketleme ve etiketleme tamamlanmadan sipariş
`SEVKIYATA_HAZIR` kabul edilmez.

Production verisi değiştirilmedi.
