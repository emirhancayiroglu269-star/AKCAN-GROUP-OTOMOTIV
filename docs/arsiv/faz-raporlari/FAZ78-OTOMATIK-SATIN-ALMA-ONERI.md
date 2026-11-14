# FAZ 78 — Otomatik Satın Alma Öneri Motoru

ERP, stok verilerinden satın alma önerisi üretebilir.

## Kullanılan veriler
- Mevcut stok
- Rezerve stok
- Minimum stok
- Maksimum stok
- Günlük ortalama satış
- Tedarik süresi
- Güvenlik stoğu
- Tedarikçi performans puanı

## Temel mantık

`Kullanılabilir Stok = Mevcut - Rezerve`

`Tedarik Süresi Talebi = Günlük Satış × Tedarik Süresi`

Hedef stok, maksimum stok sınırını aşmadan tedarik süresi ihtiyacı + güvenlik
stoğuna göre belirlenir.

## Öncelik
- ACİL
- ÖNCELİKLİ
- NORMAL
- ALMA

## Güvenlik
Motor sadece öneri üretir; otomatik sipariş kesmez.
Kullanıcı onayı olmadan tedarikçiye sipariş gönderilmez.

Tedarikçi performans puanı önerinin sıralanmasında kullanılmak üzere sisteme
bağlanabilir. Siparişe dönüşüm V69 satın alma sürecinden geçmelidir.

Production verisi değiştirilmedi.
