# FAZ 35 — Login → Supabase Auth

Yeni giriş akışı:

`Login Ekranı → Merkezi Auth Servisi → Supabase Auth → Session → user_profiles → Rol/Yekti → ERP`

## Güvenlik
- Parola yalnızca Supabase Auth'a gönderilir.
- `app_state.data.kullanicilar` içindeki eski parola alanı login için kullanılmaz.
- Client tarafında rol tek başına güvenlik kaynağı değildir.
- Pasif kullanıcı oturumu reddedilir.
- Session yoksa ERP ekranları korunur.
- Login sonucu merkezi `AuthSessionUser` modeline dönüştürülür.

## Uygulama notu
Bu fazda gerçek login çağrısı yapılmadı. Production kullanıcı hesabı oluşturulmadı,
parola değiştirilmedi ve database verisi değiştirilmedi.
