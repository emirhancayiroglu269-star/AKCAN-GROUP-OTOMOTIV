# FAZ 37 — ERP Menü / Rol Yetki Entegrasyonu

Merkezi ERP menüsü rol/yetki modeline bağlandı.

## Menü grupları
- Ana Sayfa
- Satış
- Mal Alış
- Stok
- Kasa
- Banka
- Cari
- Raporlar
- Ayarlar

Her menü bir `Yetki` gerektirir.

## Güvenlik
Menünün gizlenmesi yalnızca UX katmanıdır. Yetkisiz işlemin gerçek engellenmesi server/RLS katmanında da devam etmelidir.

Production kullanıcı/menü verisi değiştirilmedi.
