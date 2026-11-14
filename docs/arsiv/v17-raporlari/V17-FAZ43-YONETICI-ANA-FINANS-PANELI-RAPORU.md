# V17 FAZ 43 — Yönetici Ana Finans Paneli

## Yapılan
Yönetici Kontrol Paneli, finansal KPI'lar için merkezi dönem kâr standardına bağlandı.

Artık yönetici ekranındaki ana finansal KPI'lar:
- Net Ciro
- SMM
- Brüt Kâr
- Net Faaliyet Kârı
- POS Komisyonu
- Faaliyet Gideri
- Müşteri Alacağı
- Tedarikçi Borcu

üzerinden izleniyor.

## Sistem Durumu
Yönetici paneline finans + sistem mutabakat durumu eklendi.
Kritik finans/mutabakat problemi varsa panelde açıkça uyarı gösteriliyor.

## Mevcut yönetici özellikleri korunuyor
- Bugün / hafta / ay / yıl dönem seçimi
- Ciro grafiği
- Kasa/banka özeti
- Alacak/borç dağılımı
- En çok satan ürünler
- En çok kâr bırakan ürünler
- Kritik stok
- Ölü stok
- Son satışlar
- Son alışlar
- Personel ve alarm bölümleri
- Yazdır/PDF

## Doğrulama
- 95 TS/TSX dosyası → 0 diagnostic
- Merkezi dönem finans motoru runtime smoke test → tüm kontroller PASS
- ZIP bütünlüğü → PASS

Not: Ortamda npm bağımlılıkları eksik olduğu için Vite production build çalıştırılamadı (`vite: not found`). Bu nedenle build sonucu uydurulmadı; kaynak/transpile ve runtime motor testleri ayrı doğrulandı.
