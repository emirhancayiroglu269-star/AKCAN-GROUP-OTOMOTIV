# Ödeal entegrasyonu: teknik gereksinimler (araştırma, 07.11.2026)

Canlı fatura gönderilmedi; yalnız Ödeal'in herkese açık geliştirici dokümanları okundu.

## Ödeal'in sunduğu yol

Ödeal'in entegrasyon API'si **POS merkezli**: sepet AKCAN'dan Ödeal POS cihazına gönderilir, ödeme cihazda alınır, e-Arşiv / e-Fatura **ödeme başarılı olunca Ödeal tarafından otomatik** oluşturulur. Portaldaki gibi (fatura.odeal.com) ödemeden bağımsız fatura kesen ayrı bir "fatura API'si" dokümanlarda yok.

| Konu | Doküman ne diyor |
| --- | --- |
| Profil | E-FaturaPos (VUK 507, e-belge), SadePos (yalnız tahsilat), **Device2Device** (bilgisayar/tablet sepeti cihaza gönderir), App2App, Internal Basket, Direct Charge |
| AKCAN'a uygun profil | **Device2Device**: tezgâhtaki bilgisayardan sepet → Ödeal POS → ödeme → e-belge |
| Ortam adresleri | Test: `https://api.sandbox.odeal.com/integration/api/v1` · Canlı: `https://api.odeal.com/api/v1` |
| Kimlik | İstek başlıkları `X-ODEAL-MERCHANT-KEY` ve `X-ODEAL-SECRET-KEY`. Canlı anahtarlar: portal.odeal.com > Ayarlar > Entegrasyon bilgileri. Test anahtarları ve test cihazı Ödeal entegrasyon destek ekibinden istenir |
| Servisler | `GET /units` (birimler), `POST /basket` (sepet; müşteri `INDIVIDUAL`/`CORPORATE`, `taxNumber`, `taxOffice`, `identityNumber`, `title`, `city`, `town` alanları var), `POST /configuration` (geri bildirim adresi, webhook sırrı, `"eInvoiceIntegrator": "ODEAL"` zorunlu), `GET /report/transactions` (işlem raporu, belge durumu), geri bildirim (webhook): satış, iptal, başarısız ödeme, e-fatura bildirimi |
| İptal | Yalnız gün sonu alınmadan; gün sonundan sonra iptal yok |
| İade | "İade işlemi şu an mevcut değildir" (API ile iade yok) |
| Test | Gerçek kart test ortamında geçmez; test kartları destekten |

## AKCAN için gereken altyapı

1. **Ödeal'den istenecekler:** Device2Device profili, test (sandbox) anahtarları ve test cihazı bilgisi; canlıda tezgâhtaki POS cihazlarının cihaz anahtarları.
2. **Geri bildirim adresi:** Ödeal'in sonucu bildireceği herkese açık HTTPS adresi → yeni bir Supabase Edge Function (`odeal-bildirim`), webhook sırrıyla imza doğrulaması, gelen her bildirim değiştirilemez kayıt olarak saklanır.
3. **Anahtarların saklanması:** `ODEAL_MERCHANT_KEY`, `ODEAL_SECRET_KEY` yalnız Supabase sırlarında; tarayıcıya hiç gitmez. Sepet gönderimi sunucudaki fonksiyondan yapılır.
4. **Eşleştirme:** AKCAN satış belgesi ↔ Ödeal `referenceCode` (benzersiz, tekrar gönderimde aynı belge iki kez kesilmesin), ödeme sonucu ve e-belge numarası/ETTN AKCAN belgesine yazılır.
5. **Mevcut okuma köprüsü korunur:** Ödeal portalından (eklenti) okunan faturalar, AKCAN'ın kestiği belgelerle her gün karşılaştırılmaya devam eder.

## Ödeal'e sorulması gerekenler (dokümanda yok)

- Ödemesi POS'tan alınmayan **açık hesap (veresiye) satışlar** ve **e-Fatura mükellefi firmalara** fatura API ile kesilebiliyor mu, yoksa bunlar portaldan mı kesilmeli?
- Nakit satışta e-Arşiv: "nakit sepet" uç noktası cihazsız (yalnız API) e-Arşiv üretir mi?
- İade faturası API ile ne zaman mümkün olacak; şu an iade nasıl belgelendirilmeli?
- Portalda (fatura.odeal.com) elle kesilen faturalar API raporuna (`/report/transactions`) düşüyor mu?
- Webhook imzalama yöntemi ve tekrar deneme kuralları.

Kaynaklar: [Ödeal Developer Portal – Fiziki POS](https://docs.odeal.com/entegrasyon/tr/guide/welcome) · [Servis anahtarı](https://docs.odeal.com/entegrasyon/tr/guide/servis-anahtari) · [SSS](https://docs.odeal.com/entegrasyon/tr/guide/faq) · [Sepet gönderimi](https://docs.odeal.com/entegrasyon/tr/api/d2d/nakit-sepet-aktar) · [Özel entegratör](https://docs.odeal.com/entegrasyon/tr/guide/ozel-entegrator)
