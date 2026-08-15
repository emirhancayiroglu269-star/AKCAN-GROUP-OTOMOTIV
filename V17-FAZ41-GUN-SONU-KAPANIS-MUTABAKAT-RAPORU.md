# V17 Faz 41 — Gün Sonu / Kapanış Mutabakat Motoru

## Yapılan
Mevcut Gün Sonu ekranı, yalnızca özet kaydı oluşturan yapıdan çıkarılıp kapanış öncesi mutabakat kapısına bağlandı.

Yeni motor:
`src/lib/gun-sonu-kapanis.ts`

### Kapanış öncesi kontroller
- Aynı tarihin ikinci kez kapatılması engellenir.
- Aktif nakit kasalar için gerçek sayım zorunludur.
- Kasa sayımı program bakiyesiyle uyuşmuyorsa kapanış engellenir.
- Gün içinde POS hareketi olan POS cihazında gerçek POS toplamı zorunludur.
- POS gerçek toplamı program toplamıyla uyuşmuyorsa kapanış engellenir.
- Uçtan uca stok/satış/iade/POS mutabakatı kontrol edilir.
- Finans tutarlılık kontrolü yapılır.
- Çift kayıt denetimi yapılır.
- Ters işlem denetimi yapılır.
- Yetki matrisi denetlenir.

## Kapanış kaydı
Mutabık kapanışta:
- `kapanisDurumu: "MUTABIK"`
- kasa sayımları
- POS kontrolleri
- gün sonu finansal özet
- stok değerleme anlık görüntüsü
- kapanış zamanı
kalıcı olarak saklanır.

Kapalı gün detayında kapanış durumu ayrıca gösterilir.

## Testler

1. Eksik kasa sayımı → PASS / kapanış engellendi
2. Doğru kasa sayımı → PASS
3. POS farkı → PASS / kapanış engellendi
4. Kasa farkı → PASS / kapanış engellendi
5. Mutabık kapanış kaydı → PASS
6. Kapanış durumu MUTABIK → PASS
7. Aynı günün ikinci kapanışı → PASS / engellendi

## Kod doğrulama
- 94 TS/TSX dosyası → 0 diagnostic
- Kapanış motoru testleri → tümü PASS
- ZIP bütünlüğü → PASS
