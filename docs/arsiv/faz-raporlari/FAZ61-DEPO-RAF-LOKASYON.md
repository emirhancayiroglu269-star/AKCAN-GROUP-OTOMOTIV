# FAZ 61 — Depo / Raf / Lokasyon Motoru

Ürünlerin fiziksel konumları merkezi hale getirildi.

## Hiyerarşi

`Depo → Koridor → Bölüm → Raf → Göz`

Örnek:
`MERKEZ-A-02-R05-G03`

## Lokasyon stoğu

Her ürün:
- hangi depoda,
- hangi lokasyonda,
- kaç adet

tutulabilir.

## Kurallar

- Lokasyon stoğu negatif olamaz.
- Aynı ürün birden fazla lokasyonda bulunabilir.
- Toplam ürün stoğu lokasyon stoklarının toplamından doğrulanabilir.
- Depo transferleri kaynak lokasyondan çıkış + hedef lokasyona giriş olarak çalışmalıdır.
- Raf adresi ürün kartında özet olarak gösterilebilir; gerçek kaynak lokasyon stoğudur.

Production verisi değiştirilmedi.
