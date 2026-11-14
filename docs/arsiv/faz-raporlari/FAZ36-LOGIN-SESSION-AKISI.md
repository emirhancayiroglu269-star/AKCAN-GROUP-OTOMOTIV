# FAZ 36 — Login / Session / Logout Akışı

## Akış
`Login ekranı → Auth → Session → Profil/Rol → ERP`

## Kurallar
- Geçerli session yoksa ERP ekranı açılmaz.
- Pasif kullanıcı ERP'ye giremez.
- Rol bilgisi session sonrası profile bağlanır.
- Çıkışta local session state temizlenir.
- Yetki kontrolü UI ile sınırlı değildir; server/RLS katmanı ayrıca korunmalıdır.

Bu fazda gerçek production login/logout çağrısı yapılmadı.
