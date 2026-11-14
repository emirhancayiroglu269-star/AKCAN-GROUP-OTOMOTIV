# FAZ 34 — Supabase Auth Geçiş Planı

## Amaç
`app_state.data.kullanicilar` içindeki eski kullanıcı kayıtlarını kaybetmeden
kimlik doğrulamayı Supabase Auth'a taşımak.

## Kesin güvenlik kuralları
1. Mevcut plaintext parolalar okunup başka yere kopyalanmayacak.
2. Parolalar ZIP'e, log'a veya yeni tabloya yazılmayacak.
3. Her kullanıcı için yeni Auth hesabı oluşturulduğunda parola sıfırlama akışı kullanılacak.
4. `legacy_user_id` korunacak.
5. Mevcut `rolId` korunarak yeni profile bağlanacak.
6. Kullanıcı pasifse Auth hesabı da erişime kapatılacak.
7. Geçiş tamamlanana kadar mevcut kullanıcı kayıtları silinmeyecek.

## Önerilen akış
Eski kullanıcı → yönetici tarafından doğrulanmış hesap → Supabase Auth → user_profiles → rol/yetki

## Not
Bu fazda canlı kullanıcı hesabı oluşturulmadı, parola değiştirilmedi ve production
verisi değiştirilmedi.
