# FAZ 83 — Çek / Senet Portföy Motoru

Alınan çek ve senetlerin yaşam döngüsü oluşturuldu.

## Durumlar
- PORTFÖYDE
- BANKAYA VERİLDİ
- TAHSİL EDİLDİ
- KARŞILIKSIZ
- İADE EDİLDİ
- İPTAL

## Takip
Her evrak:
- Cari
- Tür
- Numara
- Banka/şube
- Hesap bilgisi
- Tutar
- Vade
- Kaynak belge
- Tarih
- Durum
- Idempotency key

taşıyabilir.

## Portföy özeti
- Çek adedi
- Senet adedi
- Portföy toplamı
- Bankadaki toplam
- Tahsil edilen
- Karşılıksız toplam

## Güvenlik
Durum geçişleri kontrollüdür.
Aynı çek/senet numarası + cari için mükerrer kayıt veritabanı benzersizliği ile
engellenmelidir.
Karşılıksız evrak yeniden portföye alındığında kaynak olay korunmalıdır.

Production verisi değiştirilmedi.
