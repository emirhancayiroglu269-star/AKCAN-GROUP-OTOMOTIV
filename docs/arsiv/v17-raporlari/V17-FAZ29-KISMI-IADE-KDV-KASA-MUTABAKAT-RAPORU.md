# V17 Faz 29 — Kısmi İade / KDV / Kasa-Banka Mutabakatı

## Bu fazın amacı
Satış iptali ile kısmi iadenin birbirinden ayrılması ve kısmi iadenin:
- satış kalemi adetini,
- stok girişini,
- kasa/banka çıkışını,
- müşteri carisini,
- KDV'yi,
- SMM'yi,
- brüt kârı,
- net ciroyu

doğru miktarda düzeltmesi.

## Bulunan kritik noktalar

### 1. İade KDV oranı kaybolabiliyordu
İade kaleminde `kdvOrani` saklanmıyordu. Bu nedenle merkezi rapor iade KDV'sini bazı durumlarda %0 kabul edebilirdi.

**Düzeltme:** İade kalemine `kdvOrani` ve `maliyet` metadata'sı ekleniyor.

### 2. Genel iskonto iade tutarına doğru yansıtılmalı
Satış kaleminin efektif birim fiyatı zaten:
`(adet × birim fiyat − satır iskontosu − genel iskonto payı) / adet`

olarak merkezi stok analizinde hesaplanıyor.

İade ekranı bu efektif birim fiyatı kullandığı için kısmi iade, satıştaki gerçek indirimli tutarı iade ediyor.

### 3. İade sırasında ikinci kez fazla iade riski
UI'daki eski satış state'ine güvenmek yerine `updateDb` içindeki güncel satış kaydı tekrar okunuyor ve:
`kalan = adet − iadeEdilenAdet`

hesaplanıyor.

Böylece hızlı çift tıklama / iki sekme gibi durumlarda satılan adetten fazla iade oluşturulması engelleniyor.

### 4. Kasa/banka bakiyesi
Para iadesinde hesap bakiyesi kontrolü yoksa hesap eksiye düşebiliyordu.

**Düzeltme:** Para çıkışı gerektiren iadede hesap bakiyesi yeterli değilse bütün işlem `prev` state'e dönüyor.

Yani:
- stok geri girişi,
- satıştaki iade adedi,
- cari,
- kasa/banka,
- iade kaydı

yarım şekilde kalmıyor.

### 5. Merkezi rapor KDV
Satış KDV hesabına `genelIskontoPayi` dahil edildi.

Böylece satış toplamı ve genel iskonto sonrası gerçek KDV matrahı aynı temelden hesaplanıyor.

## Regresyon testleri

- 2 adetlik satışın 1 adedini iade etme → **PASS**
- Efektif indirimli birim fiyat → **109 TL** örneği → **PASS**
- İade KDV oranının korunması → **PASS**
- 2 adet tam iadenin satış toplamına eşit olması → **PASS**
- 89 TS/TSX dosyası → **0 diagnostic**
- KDV metadata → **PASS**
- Güncel kalan-iade kontrolü → **PASS**
- Kasa/banka bakiye koruması → **PASS**

## Sonuç

Kısmi iade artık satışın tamamını iptal eden bir işlem gibi davranmıyor. Seçilen adet kadar stok, ciro, KDV ve maliyet etkisi oluşturuyor; hesap bakiyesi yetersizse işlem atomik olarak geri alınıyor.
