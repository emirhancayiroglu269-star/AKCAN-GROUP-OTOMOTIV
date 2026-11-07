# Kurumsal ERP V18 FINAL ↔ mevcut AKCAN (BizimHesap Analiz) karşılaştırması

07.11.2026 · Salt okunur inceleme: V18, deponun `main` dalında; tek commit (15.08.2026, "V153 - İlk proje aktarımı"). `main`'e hiçbir değişiklik yapılmadı.

## Özet

V18 ekran ve iş kuralı bakımından kapsamlı (satış/kasa, cari, alış, iade/iptal, gün sonu, POS mutabakatı, belge numaralandırma) ama **tüm ERP verisini tek bir JSON belgesinde** (`app_state`, id = `main`) tutuyor; iş mantığı tarayıcıda. Bu yapı birden çok kasa, denetim, raporlama ve veri bütünlüğü için ERP çekirdeği olarak uygun değil. V18'in kendi planı da (docs/V48-ERP-SAGLAMLASTIRMA-PLANI.md) bunu düzeltilecek madde olarak sayıyor. Önerim: V18'i **çekirdek olarak değil, ekran akışları, iş kuralları ve test senaryoları için kaynak** olarak kullanmak; veri ve kurallar AKCAN'ın ilişkisel veritabanında, sunucu tarafında kurulmalı.

| Konu | Kurumsal ERP V18 | Mevcut AKCAN |
| --- | --- | --- |
| Veri modeli | Tek JSONB belgesi (`app_state`), sürüm numarası + idempotency anahtarıyla yazma | İlişkisel tablolar (ürün, depo stoğu, fatura satırı, cari, kasa, masraf…) |
| İş mantığı | Tarayıcıda (src/modules: Stok.tsx 241 KB, Yonetim 122 KB, SatisSayfasi 88 KB…; toplam ~42.700 satır) | Okuma ve analiz tarayıcıda; eşitleme ve servisler sunucuda (Edge Functions) |
| Kayıt yapma | Var: satış, alış, iade/iptal, tahsilat/ödeme, gün sonu, dönem kapanışı (state içinde) | Yok: tüm işlemler BizimHesap'ta |
| Veri tabanı tarafı | 4 migrasyon, 257 satır (kullanıcı profili, rol, atomik state yazma); `app-state` sunucu fonksiyonunun kodu depoda yok | 60 migrasyon, RLS, tetikleyiciler, zamanlanmış görevler |
| Kimlik / yetki | Supabase Auth'a geçiş yarım; kendi planında "parola state'ten çıkarılmalı" yazıyor | Supabase Auth + kullanıcı listesi; sunucu tarafı yetki 059 ile uygulandı (07.11.2026) |
| Eşzamanlı kullanım | Tek belge: iki kasa aynı anda yazınca sürüm çakışması, biri yeniden denemek zorunda | Satır bazlı; çakışma yalnız aynı kayıtta |
| Raporlama | State'in tamamı yüklenip tarayıcıda hesaplanır | Veritabanı + tarayıcı; 8 aylık gerçek fatura verisi |
| Testler | 127 dosya: duman testleri ve sözleşme testleri (finans, stok, satış/alış zinciri, iade, mutabakat, belge numarası) | Elle ve SQL ile test |
| Supabase projesi | `oungmlyniuwpoyfghvrz` (Tokyo bölgesi), **kapalı (INACTIVE)** | `qmafuyuocmcobrstnmbx` (Frankfurt), aktif |
| BizimHesap / tedarikçi / Trendyol / Ödeal | Yok | Var |

## V18'den alınabilecekler

- Ekran akışları: hızlı satış, gün sonu, iade/iptal, POS mutabakatı, kasa-banka mutabakatı.
- İş kuralları ve belgeleri: `V17-FAZ*` raporlarındaki finans bütünlüğü, ters işlem (iptal), tahsilat-ödeme güvenliği, belge numaralandırma kuralları.
- Test senaryoları: `tests/*-smoke.mjs` içindeki senaryolar, AKCAN'ın sunucu tarafı işlemleri için kabul testine çevrilebilir.

## Alınmaması gerekenler

- `app_state` tek belge veri modeli ve tarayıcıdaki finans hesapları.
- Kapalı Supabase projesindeki veri (gerekirse ayrıca, salt okunur incelenebilir; proje açılmadan veri görülemez).
