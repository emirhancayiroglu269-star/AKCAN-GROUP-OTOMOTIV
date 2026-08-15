# FAZ 79 — ABC / XYZ + Hızlı-Yavaş-Ölü Stok Analizi

Stokların önem, talep düzenliliği ve hareket hızına göre sınıflandırılması
oluşturuldu.

## ABC
- A: cironun ilk %80'lik kümülatif bölümü
- B: %80-%95
- C: %95-%100

## XYZ
- X: düzenli talep
- Y: orta değişkenlik
- Z: düzensiz talep

## Hız
- HIZLI
- NORMAL
- YAVAS
- OLU_STOK

Ölü stok varsayılan olarak son 180 gün satış yok + günlük satış 0 mantığıyla
işaretlenir. Bu eşik şirket ayarı yapılabilir.

## Aksiyon
A/B/C + X/Y/Z + hız birlikte değerlendirilerek:
- stokta tut,
- güvenlik stoğunu koru,
- düşük stokla çalış,
- siparişe göre al,
- satın almayı durdur,
- kampanya/iade değerlendir

önerileri üretilebilir.

Production verisi değiştirilmedi.
