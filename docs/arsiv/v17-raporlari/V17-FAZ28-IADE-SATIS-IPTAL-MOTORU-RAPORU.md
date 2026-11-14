# V17 Faz 28 — İade / Satış İptali Motoru Güçlendirme

## Kritik bulgu
Satış ekranındaki iptal akışı gelişmişti ancak `BelgelerSayfasi` içinde ayrı bir iptal implementasyonu vardı. Bu ikinci implementasyon:
- Set satışında bileşen stoklarını değil set satırını geri alabiliyordu,
- Kasa/banka bakiyesi yetersizliğini kontrol etmiyordu,
- Mutabakatlı POS satışının gerçek banka girişini terslemiyordu,
- İptal edilmiş belgeye tekrar işlem uygulanmasını açıkça engellemiyordu.

Bu iki ekran arasında aynı işlemin farklı sonuç üretmesi riskiydi.

## Yapılan düzeltme
`BelgelerSayfasi` iptal akışı satış ekranındaki güvenli davranışla hizalandı:

1. İptal edilmiş satış ikinci kez iptal edilemiyor.
2. Normal ürünler stoğa geri giriyor.
3. Set satışında setin kendisi değil bileşenleri, doğru adetle stoğa geri giriyor.
4. Açık hesap satışında müşteri cari borcu tersleniyor.
5. Nakit/havale gibi anında hesaba giren tahsilatlar tersleniyor.
6. Kasa/banka bakiyesi ters işlem için yetersizse bütün işlem `prev` state'e geri dönüyor; yani stok/cari tarafında yarım iptal kalmıyor.
7. Mutabakatlı POS satışında gerçek banka girişinin ters kaydı oluşturuluyor.
8. POS tahsilatı `İptal` durumuna alınıyor.
9. POS banka ters hareketinde `pos:<tahsilatId>:iptal` kaynak anahtarıyla çift kayıt engelleniyor.
10. İptal nedeni zorunluluğu korunuyor.

## Veri tutarlılığı
İşlem `updateDb` içinde tek transaction-benzeri state dönüşüyle yürütülüyor. Finans tarafında başarısızlık olduğunda `prev` döndürülerek stok/cari/kasa/POS değişikliklerinin tamamı birlikte geri bırakılıyor.

## Teknik doğrulama
- 90 TS/TSX dosyası transpile edildi.
- **0 diagnostic**
- `BelgelerSayfasi` artık Set satışlarında bileşen iadesini kullanıyor.
- İptal akışı kasa/banka yetersizliğinde yarım işlem bırakmıyor.
