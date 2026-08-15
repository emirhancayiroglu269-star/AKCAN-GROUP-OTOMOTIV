# FAZ 123 — İçeri Aktarma & Dışarı Aktarma Merkezi

ERP'ye toplu veri alma ve ERP verilerini standart dosyalara çıkarma domain temeli
oluşturuldu.

## İçeri aktarma
- Excel / CSV
- Ürün
- Müşteri
- Tedarikçi
- Stok
- Fiyat
- Cari

## Dışarı aktarma
- Satış
- Alış
- Stok
- Cari
- Finans
- Raporlar

## Aktarım güvenliği
- Kolon eşleştirme
- Zorunlu alan kontrolü
- Satır bazlı başarı/hata sayımı
- Aktarım yüzdesi
- Aktarım geçmişi
- Idempotency anahtarı

Gerçek veriye otomatik yazma yapılmıyor; bu faz aktarım motorunun güvenli
domain temelini hazırlar.

Production verisi değiştirilmedi.
