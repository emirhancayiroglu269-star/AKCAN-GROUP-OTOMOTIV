# Kod Yapısı Düzenleme — İlerleme Durumu

## Genel durum
`App.tsx`: **31.891 → 26.441 satır** (~5.450 satır / %17,1 azaldı).
Toplam 33 modüler dosya oluşturuldu (25 lib, 1 components, 9 pages).

## Bu turda eklenenler
- `lib/belge-yazdirma.ts` — Satış belgesi/fiş yazdırma (belgeYazdir) —
  hem Satış Ekranından hem Belgeler sayfasından kullanılan ortak fonksiyon
- `lib/arama.ts` — satisAramaYap eklendi (fiş no/telefon/müşteri/ürün kodu
  ile geçmiş satış arama — İade ve Belgeler sayfalarının temeli)
- `pages/BelgelerSayfasi.tsx` — dokuzuncu sayfa bileşeni

## pages/ (tam sayfa bileşenleri — toplam 9)
RafSayfasi, KategoriSayfasi, MarkaSayfasi, AracSayfasi, OluStokSayfasi,
StokDevirHiziSayfasi, RezervSayfasi, FiyatKurallariSayfasi, BelgelerSayfasi

## lib/ (25 dosya) — kısa özet
theme, supabase, format, bildirim, kullanici-hooks, constants, database,
barkod, raf, maliyet, kategori, marka, arac, olu-stok, stok-performans,
rezerv, belge, arama, veri-dogrulama, cari-kasa, fiyatlandirma,
yonetici-onay, belge-yazdirma

## Doğrulama (HER adımdan sonra yapıldı)
- `npm run build`: Her adımda başarıyla derlendi.
- `npx tsc --noEmit`: Hata sayısı referans (852) altında kaldı (şu an 829).
- Bu turda 1 eksik import (BELGE_TURLERI) tip kontrolüyle hemen yakalandı
  ve düzeltildi.
- Fonksiyonel davranışta hiçbir değişiklik yapılmadı, sadece kod taşındı.

## Sırada ne var? (henüz yapılmadı)
Kalan ~26.400 satırın büyük kısmı hâlâ App.tsx'te: Satış Ekranı, Stok/Ürün
Kartı, Mal Alış, Tedarikçi, Müşteri, Tahsilat/Ödeme, Raporlar, Ayarlar,
Gider Yönetimi, Kargo, Entegrasyonlar, Dış Bildirim, Vade Takip gibi
sayfalar. Ortak iş mantığı (cari/kasa/belge/arama/fiyatlandırma/yazdırma)
artık büyük ölçüde hazır olduğundan, kalan sayfaların taşınması daha
öngörülebilir ilerliyor. Öncelik sırası:

1. Orta boy sayfalar (KargoSayfasi, EntegrasyonlarSayfasi,
   DisBildirimSayfasi, VadeTakipSayfasi, GiderYonetimSayfasi)
2. Orta-büyük sayfalar (TedarikciSayfasi, MusteriSayfasi, AlisSayfasi,
   TahsilatOdemeSayfasi, HesapSayfasi, IadeSayfasi, GunSonuSayfasi)
3. En büyük ve en kritik ekranlar (StokSayfasi/Ürün Kartı, SatisSayfasi,
   RaporlarSayfasi, AyarlarSayfasi) — en son, çünkü riski en yüksek
   olanlar bunlar

Bu iş parça parça, her adımda test edilerek ilerletilmeli.
