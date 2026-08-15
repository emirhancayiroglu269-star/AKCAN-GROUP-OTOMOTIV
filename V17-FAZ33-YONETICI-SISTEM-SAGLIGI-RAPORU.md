# V17 Faz 33 — Yönetici Sistem Sağlığı Paneli

## Amaç
Faz 31 mutabakat çekirdeği ve mevcut finans tutarlılık kontrolünü tek yönetici ekranında birleştirmek.

## Yapılanlar

`Yonetim > Sistem Sağlığı` sekmesi eklendi.

Altı kontrol alanı bulunuyor:

1. **Stok**
   - Ürün kartındaki stok
   - Son stok hareketindeki kalan stok

2. **Satış / Ödeme**
   - Satış genel toplamı
   - Ödeme satırları toplamı

3. **İade**
   - İade tutarı
   - İade kalemleri toplamı

4. **POS**
   - Aynı satış + POS için aktif tahsilat tekilliği

5. **Kasa / Banka**
   - Hesap bakiyesi
   - Son hesap hareketi bakiyesi
   - Tekrarlı finans işlem ID'leri ve mevcut finans bütünlüğü

6. **Cari**
   - Müşteri cari bakiyesi
   - Tedarikçi cari bakiyesi
   - Son cari hareket bakiyesi

## Durum göstergesi

Üstte:
- `✓ SİSTEM TEMİZ`
veya
- `⚠ X BULGU · Y KRİTİK`

gösteriliyor.

Her kategori ayrıca:
- Temiz
- Hata sayısı
- İlk 4 hata
- Kayıt ID'si
- Hata açıklaması
- Varsa fark tutarı

gösteriyor.

## Mimari
Panel doğrudan veri değiştirmiyor. Mevcut:
- `ucUcaMutabakatOzeti`
- `finansTutarlilikOzeti`

fonksiyonlarını kullanıyor.

Böylece yönetici ekranı kendi ayrı finans/stok hesabını üretmiyor ve ileride rakamların ekranlar arasında ayrışması önleniyor.

## Test
- 90 TS/TSX dosyası → 0 diagnostic
- Sistem Sağlığı sekmesi → PASS
- Sistem temiz göstergesi → PASS
- Kasa/Banka kategorisi → PASS
- Cari kategorisi → PASS
- ZIP bütünlük testi → PASS
