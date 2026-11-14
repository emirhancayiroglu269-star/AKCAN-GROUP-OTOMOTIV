# FAZ 121 — Yedekleme & Kurtarma Merkezi

ERP verilerinin korunması için merkezi yedekleme/kurtarma domain yapısı oluşturuldu.

## Yedekleme
- Otomatik yedek
- Manuel yedek
- Yedek tarihi
- Boyut
- Checksum
- Durum
- Yedek konumu
- Yedek geçmişi

## Kurtarma
Başarılı ve checksum bilgisi bulunan yedekler geri yüklenebilir.
Kurtarma işlemi ayrıca kayıt altına alınır.

## Veri bütünlüğü
Yedek geçerliliği; boyut + checksum + konum üzerinden kontrol edilir.
Checksum değişmiş veya eksik yedek geri yüklemeye alınmamalıdır.

Gerçek production verisi değiştirilmedi; bu faz yedekleme/kurtarma domain
temelini hazırlar.
