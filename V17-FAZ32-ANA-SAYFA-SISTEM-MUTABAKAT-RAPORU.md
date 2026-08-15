# V17 Faz 32 — Ana Sayfa Sistem Mutabakatı Göstergesi

## Amaç
Faz 31'de oluşturulan salt-okuma uçtan uca mutabakat çekirdeğini kullanıcıya görünür hale getirmek.

## Yapılanlar

Ana Sayfa'ya **Sistem Mutabakatı** kartı eklendi.

Temiz durumda:
- `TEMİZ`
- Stok, satış/ödeme ve POS zincirinin mutabakat sağladığı bilgisi
- Son kontrol zamanı

gösterilir.

Bulgu olduğunda:
- toplam bulgu sayısı,
- kritik bulgu sayısı,
- Stok / Satış-Ödeme / POS / İade sınıfı,
- ilgili kayıt ID'si,
- hata açıklaması

gösterilir.

## Güvenlik
Kart sadece `ucUcaMutabakatOzeti(db)` çağrısını okur. Veri değiştirmez, stok/finans hareketi üretmez ve mevcut Kasa/Ödeme çekirdeğine dokunmaz.

## Mimari
Mutabakat çekirdeği `app-runtime.tsx` üzerinden dışarı açıldı. Böylece ileride Yönetici ekranı veya ana rapor merkezi aynı merkezi fonksiyonu kullanabilir; ayrı ayrı hata hesaplayan ekranlar oluşmaz.

## Test
- 90 TS/TSX dosyası → 0 diagnostic
- Runtime export → PASS
- Ana Sayfa mutabakat kartı → PASS
- TEMİZ durum göstergesi → PASS
- Önceki Faz 31 mutabakat regresyonları korunuyor
- ZIP bütünlük testi → PASS
