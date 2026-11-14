# FAZ 29 — Yetki Kapısı / RLS Denetimi

Kaynak kod statik olarak tekrar tarandı.

SQL/RLS sinyali bulunan dosya sayısı: 0
Politika/RLS/Auth satırı: 0

## Yapılan
- UI/servis katmanı için merkezi yetki kapısı eklendi.
- Oturum yoksa işlem reddediliyor.
- Rolün ilgili yetkisi yoksa işlem reddediliyor.
- Yetki kontrolünün gerçek güvenlik katmanının RLS/server tarafı olması gerektiği açıkça ayrıştırıldı.

## Kritik bulgu
Kaynak pakette gerçek Supabase RLS politikalarının mevcut olup olmadığı statik tarama ile sınırlı biçimde denetlendi. Production Supabase projesine bağlanılmadı; bu nedenle RLS'nin gerçekten aktif olduğunu iddia etmiyoruz.

## Sonraki adım
İzole test Supabase projesi/şema erişimi varsa:
1. RLS açık mı?
2. Her kritik tablo için policy var mı?
3. Kullanıcı rolü policy içinde nasıl okunuyor?
4. Satış, alış, stok, kasa, cari ve rapor tabloları rol bazında doğru sınırlandırılmış mı?
5. Anon kullanıcı yazma yapabiliyor mu?

Production'a herhangi bir yazma işlemi yapılmadı.
