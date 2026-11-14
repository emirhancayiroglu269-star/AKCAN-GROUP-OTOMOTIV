# V17 Faz 1 — Finans Bütünlüğü

## Yapılanlar

1. Finans tutarlılık kontrolü artık yalnızca `kasaIslemleri` kayıtlarını değil,
   satış, alış, gider, POS, iade ve transfer kaynaklarını da tanıyor.
   Böylece geçerli satış/kasa hareketleri yanlışlıkla "yetim finans hareketi"
   olarak raporlanmıyor.

2. Tedarikçi kartından yapılan ödeme `finansIslemiUygula()` merkezi motoruna
   bağlandı. Böylece Tahsilat/Ödeme ekranı ile aynı doğrulama, cari güncelleme,
   kasa/banka güncelleme ve idempotency kuralları kullanılıyor.

3. Aynı tedarikçi ödeme `islemId` ile ikinci kez çalıştırılırsa ikinci finans
   hareketi oluşturulmuyor.

## Testler

- `finans-islem.ts + cari-kasa.ts + format.ts` TypeScript derlemesi: PASS
- Finans tutarlılık testi (satış kaynaklı kasa hareketi): PASS
- Tedarikçi ödeme: cari + kasa birlikte güncellendi: PASS
- Aynı ödeme ikinci kez: ENGELLENDİ / PASS

## Not

Tam Vite production build'i bağımlılıkların kurulu olmadığı ortamda
doğrulanamadı. Bu paket kaynak kod ve hedef modül testleriyle kontrol edilmiştir.
