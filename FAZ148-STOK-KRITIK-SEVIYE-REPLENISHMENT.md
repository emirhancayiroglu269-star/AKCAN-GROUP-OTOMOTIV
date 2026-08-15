# FAZ 148 — Stok Kritik Seviye & Replenishment Merkezi

Stokların kritik seviyeye düşmesini önlemek ve yeniden sipariş miktarını
hesaplamak için merkezi stok politikası domain'i oluşturuldu.

## Politikalar
- Minimum stok
- Hedef stok
- Yeniden sipariş noktası
- Aktif/pasif

## Hesap
Satılabilir stok = Mevcut stok - Rezerve stok

Beklenen giriş de dikkate alınarak hedef stoğa ulaşmak için önerilen yenileme
miktarı hesaplanır.

## Seviyeler
Normal → Düşük → Kritik → Tükendi

## Otomatik satın alma
Politika aktifse ve stok normal seviyenin altındaysa, gerekli miktar
otomatik satın alma önerisine dönüştürülebilir.

Production verisi değiştirilmedi.
