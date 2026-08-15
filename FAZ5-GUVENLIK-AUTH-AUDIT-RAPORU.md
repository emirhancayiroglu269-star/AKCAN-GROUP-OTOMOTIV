# V17 Faz 5 — Kimlik Doğrulama ve Güvenlik Sertleştirmesi

## Yapılanlar
- Kullanıcı adı bazlı istemci tarafı başarısız giriş koruması eklendi: 5 başarısız denemeden sonra 15 dakika kilit.
- Başarılı girişte sayaç sıfırlanıyor.
- Başarılı/başarısız girişler `girisGecmisi` içine son 200 kayıt sınırıyla yazılıyor.
- Yeni yönetici ve yeni kullanıcı şifrelerinde minimum 8 karakter + en az 1 harf + 1 rakam şartı getirildi.
- Kullanıcı düzenleme ekranında mevcut şifre artık form alanına doldurulmuyor; şifre yalnızca açıkça değiştirilirse güncelleniyor.
- Kullanıcı yönetimindeki şifre alanı `password` tipine çevrildi; düz metin olarak ekranda gösterilmiyor.
- Mevcut kullanıcıların eski şifreleri otomatik olarak değiştirilmedi; böylece mevcut hesaplar kırılmadı.

## Bilinçli olarak yapılmayan işlem
Merkezi Supabase login endpoint'i bu ZIP'in içinde backend koduyla birlikte gelmediği için, sunucu tarafında parola hash/Argon2/bcrypt migration'ı bu fazda uygulanmadı. `kullanicilar.sifre` alanının plaintext olarak saklanması hâlâ teknik borçtur ve bir sonraki backend/Auth migration işidir.

## Test
- `guvenlik.ts` bağımsız TypeScript derlemesi: PASS
- 5 başarısız deneme → 15 dk kilit: PASS
- Başarılı giriş → kilit sıfırlama: PASS
- Parola güç kontrolü: PASS
- Değiştirilen TS/TSX dosyalarında parantez yapısal kontrolü: PASS
- Tam proje `tsc`: bağımlılık/type declaration eksikleri nedeniyle temiz değil; yeni güvenlik dosyasından kaynaklanan hata yok.
