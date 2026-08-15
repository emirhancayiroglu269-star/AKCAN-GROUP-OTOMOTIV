# FAZ 104 — Cihaz + Oturum Yönetimi

Merkezi kurulumdan sonra farklı cihazlarda güvenli giriş ve oturum takibi
sağlamak için altyapı güçlendirildi.

## Yapılanlar
- Her giriş cihaz kimliği ile ilişkilendirilebilir.
- Cihaz adı/tipi ve son görülme zamanı tutulabilir.
- Oturumlar süreli ve iptal edilebilir.
- Çıkışta oturum revoke edilir.
- Kullanıcı kendi cihaz listesini görebilir.
- İstenmeyen cihazın oturumları topluca iptal edilebilir.
- Login sırasında mevcut eski düz metin parola başarılı girişten sonra
  PBKDF2 hash'e yükseltilir.
- Yeni kullanıcı/parola akışı PBKDF2 ile saklanır.
- Merkezi ilk kurulum hâlâ şirket bazlıdır; cihaz bazlı değildir.

## Supabase
`app_sessions` tablosuna device_id, user_agent, last_seen_at ve revoked_at
alanları eklendi. `app_devices` tablosu oluşturuldu.

`app-state` Edge Function V5 aktif olarak yayınlandı.

Production verisi silinmedi; mevcut merkezi kurulum korunmuştur.
