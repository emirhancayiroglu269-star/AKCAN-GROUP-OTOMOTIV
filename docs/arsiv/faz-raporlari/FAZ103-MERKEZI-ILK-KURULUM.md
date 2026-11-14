# FAZ 103 — Merkezi İlk Kurulum / Çoklu Cihaz

## Sorun
İlk kurulum daha önce yalnızca cihazın localStorage'ına göre belirleniyordu.
Bu nedenle telefon veya ikinci PC'de kullanıcı listesi boş görünerek İlk Kurulum
ekranı açılabiliyordu.

## Yeni mimari
İlk kurulum durumu Supabase `app-state` Edge Function içindeki merkezi
`status` endpointinden okunur.

- `initialized=true` → cihazda local veri olmasa bile Giriş ekranı açılır.
- `initialized=false` → İlk Kurulum açılır.
- Durum alınamıyorsa sistem güvenli biçimde bekler; yanlışlıkla ikinci kurulum açmaz.

## İlk kurulum
İlk yönetici oluşturulduğunda artık `initialize` endpointine merkezi olarak yazılır.
Böylece şirket kurulumu tekilleşir ve ilk yönetici için merkezi oturum tokenı
oluşturulur.

## Çoklu cihaz
Aynı şirket:
- ilk PC
- ikinci PC
- telefon
- tablet

üzerinden aynı merkezi kurulumla kullanılabilir.

Her cihaz yalnızca kendi oturum/token bilgisini lokalinde tutar; şirketin kurulum
durumu ve ERP verisi merkezi Supabase'dedir.

## Eşzamanlı ilk kurulum
İki cihaz aynı anda kuruluma kalkarsa ikinci `initialize` çağrısı `409
already_initialized` ile reddedilir ve uygulama login akışına geçer.

Production verisi değiştirilmedi; mevcut `app_state` verisi korunur.
