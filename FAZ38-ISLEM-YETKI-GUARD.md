# FAZ 38 — İşlem Seviyesi Yetki Guard

V37'deki menü görünürlüğünün üzerine gerçek işlem seviyesinde ikinci bir kapı eklendi.

Kontrol sırası:
1. Session var mı?
2. Kullanıcı aktif mi?
3. İstenen işlem yetkisi var mı?
4. Ancak sonra işlem devam edebilir.

Örnek:
- Satış oluşturma → `satis.olustur`
- Satış iptali → `satis.iptal`
- İade → `iade.olustur`
- Alış oluşturma → `alis.olustur`
- Stok düzenleme → `stok.duzenle`
- Kasa işlemi → `kasa.islem`
- Cari işlem → `cari.islem`
- Ayar değiştirme → `ayarlar.duzenle`

Bu guard UI/servis katmanında erken engeldir; gerçek güvenlik için server/RLS kontrolü yine zorunludur.
