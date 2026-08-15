# V17 Faz 18 — Finans İptal / Ters İşlem Motoru

## Sonuç
Tahsilat/ödeme iptali UI içindeki dağınık finans mantığından çıkarılıp merkezî `finansIslemiIptalEt` fonksiyonuna taşındı.

### Garanti edilen davranış
- Orijinal finans kaydı silinmez.
- Orijinal kayıt `İptal Edildi` durumuna alınır.
- Cari hareket ters yönde oluşturulur.
- Kasa/banka hareketi ters yönde oluşturulur.
- Fatura tahsisi geri alınır.
- Yeni ters işlem `iptalEdilenIslemId` ile orijinal işleme bağlanır.
- Aynı orijinal işlem ikinci kez iptal edilemez.

### İzole gerçek fonksiyon testi
Müşteri tahsilatı 100 TL örneği:
- müşteri bakiye: -100 → 0 PASS
- kasa: 500 → 400 PASS
- fatura tahsisi: 100 → 0 PASS
- kayıt sayısı: 1 → 2 (orijinal + ters işlem) PASS
- orijinal durum: İptal Edildi PASS
- ters kayıt oluştu PASS
- ikinci iptal engellendi PASS

TypeScript transpile: PASS.
