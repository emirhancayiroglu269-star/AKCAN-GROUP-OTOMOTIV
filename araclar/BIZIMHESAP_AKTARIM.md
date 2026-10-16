# BizimHesap verilerini güncelleme ("faturaları güncelle")

BizimHesap'ın dış bağlantısı fatura/masraf/kasa geçmişini vermediği için bu veriler, kullanıcı BizimHesap'a
**kendisi giriş yapmışken** tarayıcıda okunur ve Supabase'e yazılır. BizimHesap'ta hiçbir şey değiştirilmez.

1. Supabase'de kısa ömürlü anahtar üret:
   `insert into aktarim_anahtari values (encode(gen_random_bytes(18),'hex'), now() + interval '2 hours') returning anahtar;`
2. Tarayıcıda uygulama.bizimhesap.com açık ve giriş yapılmış olmalı (herhangi bir rapor sayfası).
3. Kaynaklar (hepsi yalnızca okuma):
   - Satış satırları: `POST /api/report/getsalesreport` (docStatuses=3 Faturalaşmış, docTypes="2, 3", outputType=1, tüm sütunlar)
   - Alış satırları: `POST /api/report/GetPurchaseReport` (docStatuses=3, docTypes="5,10")
   - Masraflar: `/web/ngn/rep/ngncostreport` sayfası postback (tblReport)
   - Kasa-banka: `/web/ngn/rep/ngncashierreport` postback, tüm hesaplar (m$cp$ddlCashier$ddlMultiSelect)
   - Vadesi geçen alacaklar: `/web/ngn/rep/ngnoverduebasic` postback (ddlDebitType=1, ddlIdentityType=3)
4. Yazma: Supabase RPC `bh_fatura_yukle(anahtar, tur, bas, bit, satirlar)`, `bh_masraf_yukle`, `bh_kasa_yukle`, `bh_vadesi_gecen_yukle`.
   Aynı tarih aralığı tekrar yüklenirse eski satırlar `gecersiz` işaretlenir; çift sayılmaz.
