# AKCAN GROUP V17 — Faz 4 Veri Güvenliği / Çoklu Bilgisayar

## Yapılanlar

- `App.tsx` içindeki merkezi `save` çağrısında HTTP 409 sürüm çakışması artık özel olarak ele alınıyor.
- Çakışma anında yerel değişiklikler `localStorage` üzerinde `akcan-veri-cakisma-yedegi` anahtarına acil yedek olarak alınır.
- Merkezi sürüm tekrar okunur ve kullanıcıya iki seçenek sunulur:
  - **Merkezi sürümü kullan:** diğer bilgisayarın güncel verisini yükler; yerel yedek korunur.
  - **Benim değişikliklerimi kullan:** yerel değişiklikleri güncel merkezi `expectedVersion` üzerine kontrollü biçimde kaydetmeyi dener.
- İkinci kaydetme sırasında tekrar 409 oluşursa kullanıcıya yeniden seçim yaptırılır; otomatik ezme yapılmaz.
- Çakışma çözülmeden uygulama sessizce bir tarafın verisini diğerinin üzerine yazmaz.
- Mevcut Realtime + 2 saniyelik fallback senkronizasyon mantığı korunmuştur.

## Güvenlik notu

Kullanıcı parolaları bu sürümde hâlâ mevcut veri modelindeki `kullanicilar.sifre` alanıyla tutulmaktadır. Bu alanı merkezi Supabase Auth/hash mimarisine geçirmek ayrı bir backend migration gerektirir; bu fazda login akışını kırmamak için plaintext parola modeli değiştirilmemiştir.

## Test

- App.tsx parantez/sözdizimi kontrolü: PASS
- 409 conflict akışı statik kontrol: PASS
- `akcan-veri-cakisma-yedegi` üretimi: PASS
- Çakışma çözüm seçenekleri: PASS
- ZIP bütünlük kontrolü: PASS
