# BizimHesap Analiz

BizimHesap'taki verileri okuyup BizimHesap'ta göremediğiniz analizleri gösteren canlı panel. React + Supabase.
Program BizimHesap'a **hiçbir şey yazmaz**; yalnızca okur.

## Başlatma

Windows'ta **BASLAT.bat** dosyasına çift tıklayın (ilk açılışta kurulumu kendisi yapar). Ya da `npm install` ve `npm run dev`.

## Sayfalar (menü: 19 sayfa)

**Genel**
- **Genel Bakış:** Stok maliyeti, stoğun satış değeri, potansiyel kâr, biten/kritik stok; seçilen dönemde satış, brüt kâr, alış, müşteri alacakları; günlük satış grafiği, en çok kâr bırakanlar, son hareketler.
- **Öneriler:** Son 90 günün verisinden otomatik iyileştirme önerileri; her öneride tahmini aylık etki, yapılacaklar ve ilgili liste.

**Satış**
- **Satışlar & Alışlar:** BizimHesap'taki stok değişimlerinden çıkarılan hareketler. Sayım/düzeltme/iade satırları "Hesap dışı" işaretlenerek raporlardan çıkarılır.
- **Satış Analizi:** Önceki döneme göre değişim, aylık trend (satış/kâr/gider/net), haftanın günleri, saatler, artan/düşen kategori ve ürünler.
- **Müşteri Analizi:** Müşteri başına satış, kâr, fiş, ortalama sepet, alış sıklığı; Sadık / Düzenli / Yeni / Riskte / Kaybedilen segmentleri; WhatsApp hatırlatma.
- **Birlikte Satılanlar:** Aynı fişte birlikte satılan ürün ve kategoriler; "A alan B de alıyor" kuralları ve son 30 günde kaçırılan ek satış tahmini; ürün arayıp "bunu alanlar başka ne aldı"; paket fiyat önerisi; tamamlayıcısı stokta olmayan ürünler.

**Para**
- **Kâr / Zarar** — sekmeler: *Özet* (gelir tablosu, brüt kâr ve marj, kategori/marka kârlılığı, zararına satılanlar, başabaş) · *Ay sonu tahmini* (bu ayın hızıyla ay sonu satış, kâr, gider ve net; hedef için günde gereken satış).
- **Tahsilat Takip:** Vadesi geçen alacaklar için öncelik sıralı arama listesi, ödeme sözü takibi, hazır WhatsApp mesajları, haftalık tahsilat hedefi (tahsilat_notlari).
- **Nakit Akışı:** Hesap bakiyeleri, günlük giriş-çıkış, yaklaşan ödemeler, 30 günlük nakit tahmini.
- **Cariler:** BizimHesap müşteri ve tedarikçi bakiyeleri ve bakiye değişimleri. (Vadesi geçen alacaklar Tahsilat Takip'te.)

**Stok**
- **Ürün Analizi (ABC):** Ürün başına adet, satış, kâr, marj, satış hızı, stok kaç gün yeter; ABC sınıflaması; hiç satılmayan stok.
- **Fiyat & Marj** — sekmeler: *Ürün bazında* (hedef marjın altındakiler, alışı artmış ürünler, önerilen satış fiyatı) · *Kategori bazında* (kategori hedef marjı, önerilen fiyatlar, CSV fiyat listesi).
- **Usta Fiyat Listesi:** Seçilen kategorilerde indirimli usta/servis fiyatı; maliyet + alt sınırın altına inmez. Yazdırma, CSV, WhatsApp.
- **Ölü Stok Eritme** — sekmeler: *Eritme planı* (iade / kampanya / toplu satış önerisi, mesajlar, paraya dönen tutar takibi) · *Yaşlanma & devir hızı* (son satıştan bu yana yaşlanma, kategori devir hızı).
- **Kayıp-Kaçak Kontrolü:** Stok değişimleri ile faturaların karşılaştırılması (faturasız stok çıkışı/girişi, faturası kesilip stoktan düşmeyen), maliyetin altında satış satırları ve kime yapıldığı, %20+ indirimli satışlar, eksi stok ve depo toplamı farkı.
- **Depolar & Sipariş** — sekmeler: *Siparişler (depo bazında)* (Sultanbeyli ve Velibaba için ayrı sipariş listesi; diğer depoda fazlası varsa önce transfer önerilir) · *Kritik stok & alınacaklar* (tüm depolar toplamı, kritik seviye tanımlama, mevsimlik ayar, tedarikçiye göre WhatsApp siparişi) · *Depo karşılaştırması* (satış, kâr, stok değeri, satılmayan stok, en çok satanlar; yalnız yönetici).
- **Tedarikçiler:** Tedarikçi başına alış, satılan oran ve kâr, aynı ürünün tedarikçiye göre fiyat farkı.
- **Ürünler & Stok:** Ürün kataloğu, depo bazında stok, fiyat ve hareket geçmişi, OEM/muadil kod arama, barkod etiketi.

**Diğer**
- **Ayarlar:** Alış fiyatlarının KDV dahil/hariç olduğu, kaç günlük stok tutulacağı, kullanıcılar.
- **Ürün ve müşteri kartı:** Ürün veya müşteri adına tıklayınca açılan detay.
- **Haftalık rapor:** Her pazartesi 08:49'da geçen haftanın özeti bildirim olarak gelir.

Sekmelerin adresi `#sayfa/sekme` biçimindedir (ör. `#depolar/toplam`). Eski adresler (`#alinacaklar`, `#aysonu`, `#katfiyat`, `#stoksagligi`, `#deposiparis`) yeni sekmelere yönlenir. Personel (kasiyer/teknisyen) yalnız Ürünler ve Depolar & Sipariş'i görür, alış fiyatı görmez.

Her sabah 08:52'de günlük özet bildirimi gelir (zamanlanmış görev). BizimHesap fatura/masraf/kasa verilerinin güncellenmesi için `araclar/BIZIMHESAP_AKTARIM.md`.

## Nasıl çalışır?

Supabase'deki `bizimhesap-esitle` servisi her 3 dakikada BizimHesap'tan ürünleri (fiyat + toplam stok), depo stoklarını,
müşteri ve tedarikçi bakiyelerini çeker. Bir ürünün stoğu azaldıysa **satış**, arttıysa **alış** hareketi kaydedilir
(o anki liste fiyatlarıyla). BizimHesap'ın dış bağlantısı fatura geçmişi vermediği için analizler takip başladığı günden itibaren dolar.

Bilinen sınırlar: fatura iskontosu görünmez (liste fiyatı kullanılır); masraflar API'de olmadığı için net değil brüt kâr gösterilir;
BizimHesap'ta taslak bırakılan faturalar stoğu düşürmediği için faturalaştırılana kadar satış olarak görünmez.

## Supabase kurulumu (sırayla)

`supabase/schema.sql`, `002_bizimhesap.sql`, `003_zamanlayici.sql`, `004_gelistirme.sql`, `005_raporlar_yetki.sql`, `006_analiz.sql`, `007_rapor_aktarim.sql`, `008_masraf.sql`, `009_detayli_aktarim.sql`, `010_hedef.sql`, `011_kategori_marj.sql`, `012_tahsilat_stok.sql`, `013_kampanya_usta.sql`.
Gizli değer: Edge Functions → Secrets → `BH_TOKEN`.

## İnternet sitesi

Program https://emirhancayiroglu269-star.github.io/AKCAN-GROUP-OTOMOTIV/ adresinde yayında (GitHub Pages, `gh-pages` dalı). Kaynak kod aynı deponun `analiz-kaynak` dalında.

Güncelleme: `npx vite build --base=./ --outDir site`, `site/` içine boş `.nojekyll` ekleyin ve içeriği `gh-pages` dalına gönderin. Veri erişimi yalnız `kullanicilar` listesindeki aktif hesaplara açıktır (supabase/014_site_guvenlik.sql).
