# FAZ 4 — Satış → Finans Zinciri

## Uygulanan düzeltmeler

1. Finans motoru artık UI'dan bağımsız olarak satış toplamı ile ödeme toplamını karşılaştırıyor.
2. Ödeme satırlarında `NaN`, sonsuz ve negatif değerler finans motoruna alınmıyor.
3. Ödeme toplamı `satis.genelToplam` ile 0,01 TL tolerans içinde eşleşmiyorsa işlem `null` dönüyor ve çağıran transaction'ın tamamı rollback oluyor.
4. POS tahsilatı yalnızca `Kredi Kartı` ödeme satırlarından oluşturuluyor. Böylece yanlışlıkla nakit/açık hesap satırına `posId` eklenmesi POS hareketi üretmiyor.
5. Mevcut idempotency ve ters işlem mantığı korunmuştur.

## Önemli

Bu düzeltme frontend/state transaction sınırını güçlendirir. Gerçek çok kullanıcılı üretim ortamında aynı atomikliğin Supabase/PostgreSQL tarafında da transaction/RLS/unique constraint ile garanti edilmesi ayrıca gereklidir.
