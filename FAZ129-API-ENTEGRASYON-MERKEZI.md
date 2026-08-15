# FAZ 129 — API & Entegrasyon Merkezi

ERP'nin dış sistemlerle güvenli ve izlenebilir iletişim kurması için merkezi
entegrasyon domain'i oluşturuldu.

## Entegrasyonlar
- Trendyol / e-ticaret
- E-Fatura
- Kargo
- Ödeme / POS
- Muhasebe
- Genel API

## API işlemleri
Gelen/giden istekler; entegrasyon, endpoint, HTTP metodu, durum kodu, zaman ve
referans bilgileriyle izlenebilir.

## Webhook
Webhook olayları payload özeti ile kaydedilir ve aynı olayın ikinci kez
işlenmesini önlemek için tekillik/idempotency kontrolü uygulanır.

## Güvenlik
Gerçek API anahtarları veya şifreler kod içine yazılmaz. Bağlantı bilgileri
güvenli ortam değişkenleri/secret yönetimi üzerinden sağlanmalıdır.

Production verisi değiştirilmedi.
