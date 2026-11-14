# V17 Satış / Kasa finansal sağlamlaştırma

## Yapılanlar
- Nakit ve Havale/EFT ödemelerinde aktif kasa/banka hesabı zorunlu.
- Kredi Kartı ödemesinde aktif POS ve POS'a bağlı aktif banka hesabı zorunlu.
- Kredi kartı satışında satış anında banka bakiyesi artırılmıyor; POS mutabakatında gerçek geçen tutar bankaya işleniyor.
- Açık hesap satışında kayıtlı ve aktif müşteri zorunlu.
- POS mutabakatında gerçek banka geçişi tekil `kaynakId` ile idempotent hale getirildi.
- POS mutabakatında net/gerçek tutar bankaya giriş olarak işleniyor; fark varsa ayrıca raporlanıyor.
- Satış iptalinde nakit/havale tahsilatı tersleniyor; kartta yalnızca daha önce bankaya geçmiş gerçek POS tutarı tersleniyor.
- Satış iptalinde kasa/banka bakiyesi yetersizse işlem atomik olarak geri bırakılıyor.
- Aynı satışın ikinci kez iptali engellendi.
- Set ürün satış iptalinde bileşen stokları geri ekleniyor.
- Satış tamamla butonunda çift tıklama/çift işlem koruması eklendi.
