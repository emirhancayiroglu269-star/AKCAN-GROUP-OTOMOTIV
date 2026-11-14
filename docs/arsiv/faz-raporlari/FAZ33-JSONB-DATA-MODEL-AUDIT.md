# FAZ 33 — Gerçek JSONB ERP Veri Modeli

Canlı `public.app_state.data` yapısı okunarak gerçek anahtarlar ve örnek kayıt sayıları çıkarıldı.

## Ana modüller
- Satış: `satislar` — 6 kayıt
- Alış: `malAlimlari` — 3 kayıt
- Stok hareketleri: `stokHareketleri` — 23 kayıt
- Cari: `cariler` — 2 kayıt
- Hesap/kasa/banka: `hesaplar` — 3 kayıt
- Kullanıcılar: `kullanicilar` — 2 kayıt
- Roller: `roller` — 4 kayıt
- İadeler: `iadeler` — 1 kayıt
- POS tahsilatları: `posTahsilatlari`
- Kasa işlemleri: `kasaIslemleri`
- Gün sonları: `gunSonlari`
- Denetim: `auditGecmisi`, ayrıca ayrı `audit_logs` tablosu
- Entegrasyon: `entegrasyonlar`, `entegrasyonKuyrugu`, `entegrasyonLoglari`

## Gerçek veri ilişkileri

Satış kalemleri `parcaId` ve `stokKodu` taşıyor.
Satış ödemeleri yöntem, tutar ve gerekirse `hesapId`/`posId` taşıyor.
Cari hareketleri `kaynakSatisId` ile satışa bağlanabiliyor.
Stok hareketleri `parcaId` + `belgeNo` + kullanıcı + giriş/çıkış miktarlarıyla izleniyor.
Alış kalemleri `parcaId`, stok kodu, miktar, birim fiyat ve KDV taşıyor.

## Kritik bulgu: güvenlik

`kullanicilar` içindeki kullanıcı kayıtlarında parola alanı bulunuyor. Parola bilgisinin uygulama state JSONB içinde tutulması güvenlik açısından uygun değildir.

Parolalar canlı veriden bu rapora kopyalanmamıştır ve raporda maskelenmiştir.

Doğru yaklaşım:
- Supabase Auth kullanmak,
- parola değerlerini `app_state.data` içinden kaldırmak,
- rol bilgisini güvenilir server/RLS katmanında doğrulamak,
- `user_metadata` ile yetkilendirme yapmamak,
- mümkünse rol bilgisini `app_metadata` veya ayrı güvenli profil/rol tablosunda tutmak.

## İkinci kritik bulgu: stok tutarlılığı

Gerçek `stokHareketleri` içinde bazı test/iptal işlemlerinden sonra negatif `kalanStok` değerleri görülüyor. Bu, stok motorunun geçmişte negatif stok üretebildiğini gösteriyor.

Özellikle iptal/iade zincirinde:
`Satış → Stok Çıkışı → İptal/İade → Stok Girişi`
tek işlem bütünlüğünde kontrol edilmelidir.

## Üçüncü bulgu: yetki modelleri iki yerde

Hem `roller[].yetkiler` hem de ayrı `role_permissions.permissions` yapısı mevcut.

Bunların tek bir yetki kaynağına indirgenmesi önerilir; aksi halde UI ile server yetkileri ayrışabilir.

Bu fazda hiçbir veri değiştirilmedi.
