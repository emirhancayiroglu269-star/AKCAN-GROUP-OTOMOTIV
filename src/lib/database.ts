import { yeniId, zamanDamgasi } from "./format";
import {
  VARSAYILAN_GIDER_KATEGORILERI,
  VARSAYILAN_KISAYOLLAR,
  BELGE_TUR_ONEKLERI,
  VARSAYILAN_DEPOLAR,
  VARSAYILAN_ROLLER,
  VARSAYILAN_KATEGORILER,
  VARSAYILAN_MARKALAR,
  VARSAYILAN_ARACLAR,
  VARSAYILAN_FIYAT_GRUPLARI,
} from "./constants";

export const bosVeritabani = () => ({
  parcalar: [],
  // OEM/Muadil kodları bilinçli olarak ürün kartından AYRI bir tabloda
  // tutuluyor: { id, parcaId, tip: "OEM"|"Muadil", kod }. Bir ürüne
  // sınırsız kod bağlanabilir, bir kod çok sayıda ürüne referans olabilir —
  // bu ayrım, kod sayısı binlere çıktığında sorgu ve bakımı sade tutar.
  kodlar: [],
  satislar: [],
  // Açık Hesap (veresiye) ile satış yapılan müşterilerin borç takibi. Ayrı,
  // sade bir Müşteri modülü kuruluncaya kadar bu asgari yapı yeterli.
  cariler: [],
  // Yeni ürün formundaki "Hedef Kâr Oranı ile Fiyat Öner" hesaplayıcısının
  // varsayılan değeri — kullanıcı her üründe değiştirebilir.
  hedefKarAyari: { tur: "markup", deger: 30 },
  // TÜM stok artış/azalışları (mal alış, satış, iade, sayım, fire, manuel
  // düzeltme, devir) buraya kalıcı ve değiştirilemez bir kayıt olarak
  // düşer — { id, parcaId, tarih, tur, belgeNo, giris, cikis, kalanStok,
  // kullanici, aciklama }. Stok adedi HİÇBİR yerde doğrudan elle
  // değiştirilmez; her değişiklik bu hareketlerden biri üzerinden olur.
  stokHareketleri: [],
  ayarlar: {
    // Kapalıyken (varsayılan), stok yetersizken satış/çıkış işlemi engellenir.
    eksiStokIzni: false,
    // Toplu fiyat güncellemesinde önerilen yuvarlama birimi (₺) — 0 = yuvarlama yok.
    fiyatYuvarlama: 0,
    // Rezervden satışa dönüştürürken hangi fiyat varsayılan olarak kullanılsın:
    // "rezerv" (rezerv sırasında verilen fiyat, önerilen) veya "guncel".
    rezervSatisFiyatiTercihi: "rezerv",
    // --- 46. adım: Kâr/Maliyet Hesaplama Motoru — "agirlikliOrtalama"
    // (önerilen, perakende yedek parça için) veya "sonAlis". Gerçek FIFO
    // (parti bazlı maliyet katmanı) desteklenmez — bkz. gecerliMaliyet yorumu.
    maliyetYontemi: "agirlikliOrtalama",
    // --- 57. adım: Ölü Stok / Yavaş Hareket Eden Ürün eşikleri — dükkâna
    // göre ayarlanabilir (10. madde). Son 30 gündeki satış adedine göre:
    // >= hizliEsigi → Hızlı, normalEsigiMin–hizliEsigi arası → Normal,
    // yavasEsigiMin–normalEsigiMin arası → Yavaş, 0 ve oluStokGunEsigi+ gün
    // satılmadıysa → Ölü.
    satisHiziEsikleri: { hizliEsigi: 10, normalEsigiMin: 3, yavasEsigiMin: 1, oluStokGunEsigi: 90 },
    // --- 41. adım: Ayarlar ve Mağaza Tanımları — merkezi ayar alanları -----------
    paraBirimi: "TL",
    varsayilanKdvOrani: 20,
    kdvGosterimTercihi: "dahil", // "dahil" | "haric"
    varsayilanMusteriAdi: "",
    varsayilanFiyatGrubuId: "",
    varsayilanOdemeYontemi: "Nakit",
    maksimumIskontoYuzdesi: null, // rol bazlı limitler zaten var; bu GENEL üst sınırdır (null = sınırsız)
    varsayilanMinimumStok: 5,
    varsayilanDepoId: "depo-ana",
    varsayilanRaf: "",
    otomatikSiparisOnerisi: true,
    belgeOnekleri: { ...BELGE_TUR_ONEKLERI },
    yaziciAdi: "",
    kagitBoyutu: "80mm (Termal Fiş)",
    belgeAltYazisi: "",
    odemeYontemleriDurumu: { Nakit: true, "Kredi Kartı": true, "Havale/EFT": true, FAST: true, Çek: true, "Açık Hesap": true },
    barkodTipi: "EAN-13",
    etiketBoyutu: "40x30mm",
    etiketYazici: "",
    etiketAlanlari: { fiyatGoster: true, oemGoster: false, muadilGoster: false, rafGoster: false },
    dil: "Türkçe",
    tarihFormati: "GG.AA.YYYY",
    saatFormati: "24 Saat",
    oturumSuresiDakika: 15,
    veriSaklamaSuresiGun: 0, // 0 = süresiz
    logSaklamaSuresiGun: 0, // 0 = süresiz
    klavyeKisayollari: { ...VARSAYILAN_KISAYOLLAR },
  },
  // Mal Alış / Mal Kabul faturaları — { id, tedarikci, faturaNo, faturaTarihi,
  // vadeTarihi, odemeDurumu, odenenTutar, aciklama, kalemler, malToplami,
  // kdvToplami, hesaplananGenelToplam, faturaGirilenToplam,
  // olusturmaTarihi, olusturan, degisiklikGecmisi }.
  malAlimlari: [],
  // Tedarikçi borç/ödeme takibi — Müşteriler/cariler ile birebir aynı asgari
  // yapı. Ayrı, kapsamlı bir Tedarikçi modülü kuruluncaya kadar bu yeterli.
  tedarikciler: [],
  // Tahsilat/Ödeme makbuzları — cari hareketlerinin ÜSTÜNDE, silinemeyen,
  // sadece "İptal Et" ile geçersiz kılınabilen kalıcı işlem kayıtları.
  kasaIslemleri: [],
  // Kasa/Hesap tanımları (Nakit Kasa, POS, Banka hesapları vb.) — { id, ad,
  // tip, bakiye, aktif, hareketler }. Satış tahsilatları, cari tahsilat/ödeme
  // ve giderler HEP bir hesaba işlenir; hesap seçilmezse hareket oluşmaz.
  hesaplar: [],
  // Kasa giderleri — { id, tarih, kategori, tutar, aciklama, kullanici,
  // hesapId, belgeNo, durum, iptalNedeni, iptalEden, iptalTarihi,
  // kdvOrani, kdvTutari, kdvHaricTutar, odemeYontemi, tedarikciFirma,
  // belgeDosyasi, vadeTarihi, odemeDurumu: "Bekliyor"|"Kısmi Ödendi"|
  // "Ödendi"|"İptal", odenenTutar, tekrarlayanId }.
  giderler: [],
  // Tekrarlayan gider tanımları — { id, kategori, aciklama, tutar, periyot:
  // "aylik", tedarikciFirma, aktif, sonOlusturulanDonem: "2026-08" }.
  tekrarlayanGiderler: [],
  // Gider kategorileri — kullanıcı serbestçe ekleyebilir. { id, ad }.
  giderKategorileri: VARSAYILAN_GIDER_KATEGORILERI(),
  // POS cihazları — hesaplardan AYRI bir tanım: her POS'un kendi komisyon
  // oranı/sabiti, ödeme vadesi ve bağlı olduğu banka hesabı vardır.
  // { id, ad, banka, cihaz, komisyonYuzde, komisyonSabit, odemeVadesiGun, hesapId, aktif }.
  posCihazlari: [],
  // POS tahsilat takibi/mutabakatı — her kartlı satış işlendiğinde (satış
  // tutarı, komisyon, net) ayrı ayrı kaydedilir; banka hesabına gerçekten
  // geçen tutar girildiğinde "Eşleşti" / "Fark Var" olarak karşılaştırılır.
  // { id, tarih, posId, kaynakSatisId, satisTutari, komisyonTutari,
  // netTutar, beklenenTarih, durum: "Bekliyor"|"Eşleşti"|"Fark Var"|"İptal",
  // gercekTutar, eslesmeTarihi, not }.
  posTahsilatlari: [],
  // Satın alma siparişleri — mal FİİLEN gelmeden önceki takip ("Mal Alış"
  // ürün geldikten SONRASINI kayıt eder; bu ürün gelmeden ÖNCESİni kayıt eder).
  // { id, tedarikci, siparisTarihi, beklenenTeslimTarihi, aciklama,
  // olusturanKullanici, durum: "Taslak"|"Sipariş Verildi"|"Kısmi Geldi"|
  // "Tamamlandı"|"İptal", kalemler: [{id, parcaId, stokKodu, ad, marka,
  // adet, alinanAdet, birimFiyat, iskontoYuzde, kdvOrani}],
  // malKabulGecmisi: [{id, tarih, kullanici, kalemler:[{parcaId, adet}]}],
  // tamamlanmaTarihi, iptalNedeni }.
  satinAlmaSiparisleri: [],
  // Depolar/şubeler — tek dükkân kullanımında sadece "Ana Mağaza" (D1)
  // yeterlidir; ileride ikinci depo/şube açılırsa altyapı hazırdır.
  // { id, ad, kod, adres, sorumluKisi, aktif }.
  depolar: VARSAYILAN_DEPOLAR(),
  // Depolar arası stok transferleri — p.stok (TOPLAM şirket stoğu) transfer
  // sırasında HİÇ değişmez, sadece p.depoStoklari üzerindeki dağılım kayar.
  // { id, kaynakDepoId, hedefDepoId, parcaId, adet, kaynakRaf, hedefRaf,
  // tarih, aciklama, transferiYapan, onaylayan, durum: "Taslak"|
  // "Gönderildi"|"Yolda"|"Teslim Alındı"|"İptal", gonderilmeTarihi,
  // teslimTarihi, iptalNedeni }.
  transferler: [],
  // Müşteri siparişi / bekleyen sipariş — Rezerv'den (27. adım) TAMAMEN
  // AYRI bir yapı: Rezerv, ürün fiziksel olarak ELDE VARKEN müşteri için
  // ayırmaktır; müşteri siparişi ise ürün ELDE YOKKEN (veya yetersizken)
  // müşteri için tedarik etme sürecidir. { id, musteriAdi, musteriTelefon,
  // parcaId, adet, siparisFiyati, siparisTarihi, tahminiGelisTarihi,
  // tedarikci, not, siparisiAlanPersonel, durum: "Bekliyor"|"Tedarikçiye
  // Sipariş Verildi"|"Ürün Geldi"|"Müşteriye Teslim Edildi"|"İptal",
  // teslimTarihi, iptalNedeni, donusturulenSatisId }.
  musteriSiparisleri: [],
  // Excel/CSV içe aktarma sütun eşleştirme şablonları — { id, ad,
  // alanEslesmeleri: { [programAlaniAnahtari]: csvSutunAdi } }.
  iceAktarmaSablonlari: [],
  // Müşteri/Tedarikçi not sistemi — her not KALICI bir kayıt olarak eklenir,
  // ÜZERİNE YAZILMAZ (tarihli günlük gibi) — eski bilgiler asla kaybolmaz.
  // { id, hedefId, tur: "Genel"|"Satış"|"Ödeme"|"Ürün"|"Sipariş"|"Teslimat",
  // metin, tarih, kullanici, hatirlatmaTarihi (null=hatırlatma değil),
  // hatirlatmaTamamlandi }.
  musteriNotlari: [],
  tedarikciNotlari: [],
  // Gün Sonu / Kasa Kapanış — HESAP bazlı kasaGunleri'nden farklı olarak,
  // TÜM dükkânın günlük özetini (satış+tahsilat+gider+ödeme+kasa+POS) tek
  // kayıtta sabitler. Kapatıldıktan sonra o güne ait rakamlar DEĞİŞMEZ.
  // { id, tarih, kapatanKullanici, kapanisZamani, durum: "Kapalı",
  // ozet: {...}, kasaSayimlari: [{hesapId, hesapAdi, acilis, beklenen,
  // sayilan, fark}], posKontrolleri: [{posId, posAdi, programToplami,
  // gercekToplam, fark}] }.
  gunSonlari: [],
  // Vardiya sistemi — personel bazlı açılış/kapanış takibi, artık kasa
  // (hesap) ataması ve devir geçmişiyle birlikte (48. adım). { id,
  // kullaniciId, kullaniciAdi, hesapId, hesapAdi, acilisZamani,
  // kapanisZamani, acilisKasaTutari, kapanisKasaTutari, durum:
  // "Açık"|"Kapalı"|"Devredildi", not, devredenVardiyaId (devirle
  // başladıysa önceki vardiyanın id'si) }.
  vardiyalar: [],
  // Fiyat Teklifi — satışa dönüştürülmeden önce müşteriye verilen fiyat
  // teklifidir; STOĞU HİÇ ETKİLEMEZ. { id, teklifNo, tarih, gecerlilikTarihi,
  // musteriAdi, musteriId, kalemler: [{parcaId, stokKodu, ad, marka, adet,
  // birimFiyat, iskontoTuru, iskontoDeger, kdvOrani, maliyet}], aciklama,
  // hazirlayanPersonel, durum: "Taslak"|"Gönderildi"|"Onaylandı"|
  // "Reddedildi"|"Süresi Doldu"|"Satışa Dönüştü", donusturulenSatisId,
  // rezervIdleri: [] (opsiyonel — ürünler ayrıca rezerve edildiyse) }.
  teklifler: [],
  // Etiket yazdırma geçmişi — hangi ürünün etiketi ne zaman, kim tarafından,
  // kaç adet basıldı (50. adım, 9. madde). { id, parcaId, tarih, kullanici,
  // adet, sablon, fiyatBasildigiAn }.
  etiketYazdirmaGecmisi: [],
  // Kargo firmaları — İleride API entegrasyonuna hazır, sade bir tanım
  // listesi. { id, ad, kod, telefon, aktif }.
  kargoFirmalari: [],
  // Kargo / Teslimat Takibi — bir satışa bağlı teslimat kaydı; STOK
  // BURADA HİÇ ETKİLENMEZ (stok zaten satış anında düşmüştür). { id,
  // satisId, teslimatTipi: "Mağazadan Teslim"|"Kurye"|"Kargo", aliciAdi,
  // telefon, adres, il, ilce, kargoFirmasi, kargoUcretiKimOder:
  // "Müşteri"|"Mağaza"|"Ücretsiz", kargoUcreti, teslimatNotu, durum:
  // "Hazırlanıyor"|"Paketlendi"|"Kargoya Verildi"|"Dağıtımda"|
  // "Teslim Edildi"|"İptal"|"İade Edildi", paketler: [{id, paketNo,
  // kargoTakipNo, agirlikKg, desi, kargoUcreti}], olusturmaTarihi,
  // giderKaydedildi }.
  teslimatlar: [],
  // Tedarikçi Fiyat Karşılaştırma — WhatsApp/e-posta/telefonla manuel
  // alınan tedarikçi teklifleri. { id, teklifTarihi, tedarikciAdi, parcaId,
  // adet, birimFiyat, iskontoYuzde, kdvOrani, kargoUcreti, nakliyeUcreti,
  // digerMaliyet, gecerlilikTarihi, stokDurumu: "Stokta"|"Az Stok"|
  // "Stok Yok"|null, notlar, durum: "Geçerli"|"Süresi Doldu"|"Kullanıldı" }.
  tedarikciTeklifleri: [],
  // API / Entegrasyon Altyapısı (61. adım) — ÖNEMLİ: bu program tarayıcıda
  // çalışan tek dosyalık bir uygulamadır, gerçek bir sunucu/backend'i
  // YOKTUR. Aşağıdaki koleksiyonlar GERÇEK dış sistemlere (Trendyol,
  // e-fatura sağlayıcısı, SMS servisi vb.) bağlanmaz — ileride gerçek bir
  // backend kurulduğunda kullanılacak AYAR/LOG/KUYRUK iskeletidir. Hiçbir
  // entegrasyonun durumu, mağaza satış/stok/kasa/cari akışını ETKİLEMEZ
  // (10. madde — entegrasyonlar birbirinden ve ana sistemden bağımsızdır).
  // { id, tur: "eTicaret"|"eFatura"|"kargo"|"tedarikciB2B"|"webhook", ad,
  // aktif, apiKey, apiSecret, ayarlar: {}, sonSenkronizasyon, durum:
  // "Bağlı"|"Sorun Var"|"Pasif" }.
  entegrasyonlar: [],
  // { id, tarih, entegrasyonId, sistem, islem, basarili, hata }. Hassas
  // veri (şifre, API secret, kart bilgisi) ASLA burada tutulmaz.
  entegrasyonLoglari: [],
  // { id, tarih, entegrasyonId, sistem, islem, durum: "Bekliyor"|
  // "Çalışıyor"|"Başarılı"|"Hatalı"|"Tekrar Deneniyor", deneme }.
  entegrasyonKuyrugu: [],
  // Dış Bildirim Sistemi (62. adım) — ÖNEMLİ: GERÇEK e-posta/SMS/WhatsApp
  // GÖNDERMEZ (backend olmadan mümkün değil); şablon+tercih+geçmiş+izin
  // altyapısıdır, ileride gerçek bir gönderim servisine bağlanmaya hazırdır.
  // { id, olayTuru, kategori: "Stok"|"Satış"|"Cari"|"Sipariş"|"Sistem",
  // kanal: "Uygulama İçi"|"E-posta"|"SMS"|"WhatsApp"|"Push", baslik, govde
  // (değişkenler {ürün_adi} gibi), tur: "operasyonel"|"pazarlama", aktif }.
  bildirimSablonlari: [],
  // Gönderim geçmişi (7. madde). { id, tarih, aliciTuru: "musteri"|
  // "tedarikci"|"kullanici", aliciAdi, kanal, mesajTuru, durum:
  // "Gönderildi"|"Gönderilemedi"|"Beklemede", hata, denemeSayisi }.
  disBildirimGecmisi: [],
  // Günlük kasa açılış/kapanış oturumları — { id, hesapId, tarih,
  // acilisTutari, acanKullanici, acilisTarihi, durum: "Açık"|"Kapalı",
  // sayilanTutar, kapatanKullanici, kapanisTarihi }. Kapanmış gün salt okunur.
  kasaGunleri: [],
  // Satış iadeleri — { id, tarih, satisId, kalemler: [{parcaId, ad, adet,
  // birimFiyat, durum: "Satılabilir"|"Hasarlı", tutar}], iadeNedeni,
  // kapatmaYontemi, hesapId, tutar, degisimKalemleri, fark, iadeyiAlan }.
  iadeler: [],
  // Alış (tedarikçiye) iadeleri — { id, tarih, alisId, tedarikci, kalemler,
  // iadeNedeni, tutar, iadeyiAlan }.
  alisIadeleri: [],
  // Raf/depo taşıma hareketleri — { id, parcaId, tarih, eskiRaf, yeniRaf,
  // adet, kullanici }. Raf adresi asla doğrudan üzerine yazılmaz; her taşıma
  // burada iz bırakır.
  rafHareketleri: [],
  // Toplu fiyat güncelleme işlemleri — { id, tarih, kullanici, degisiklikNedeni,
  // filtreOzeti, yontemOzeti, etkilenenUrunSayisi, geriAlindiMi }. Her ürünün
  // fiyatGecmisi kaydı da bu işlemin id'sini taşır — "Son güncellemeyi geri
  // al" bu eşleşmeyle çalışır.
  topluFiyatIslemleri: [],
  // Stok sayımları — { id, tarih, kapsamTuru, kapsamDeger, baslatan, durum:
  // "Devam Ediyor"|"Onaylandı", kalemler: [{parcaId, sayilanAdet}],
  // onaylayanKullanici, onayTarihi, ozet: {toplam, eksik, fazla, dogru,
  // sayilmayan}, maliFark: {eksikMaliyet, fazlaMaliyet, net} }. Onaylanan bir
  // sayım asla değiştirilmez, sadece geçmişte saklanır.
  sayimlar: [],
  // Roller — { id, ad, sabit (silinemez varsayılan rol mü), yetkiler: { <YETKI_TANIMLARI anahtarları>: bool } }
  roller: VARSAYILAN_ROLLER(),
  // Kullanıcı/Personel hesapları — { id, adSoyad, kullaniciAdi, sifre, rolId,
  // aktif, sonGiris }. Yetkiler doğrudan kullanıcıda değil, bağlı olduğu
  // rolde tutulur (rol değişince kullanıcının yetkisi de otomatik değişir).
  kullanicilar: [],
  // İşlem geçmişi — kritik işlemlerde otomatik oluşan, silinemez denetim
  // kaydı: { id, tarih, kullaniciAdi, islemTuru, aciklama, eskiDeger, yeniDeger }.
  islemGecmisi: [],
  // Giriş denemeleri (başarılı + başarısız) — { id, tarih, kullaniciAdi,
  // basarili: bool }. "Kim giriş yaptı" ve "başarısız giriş denemeleri"
  // güvenlik gereksinimleri buradan karşılanır.
  girisGecmisi: [],
  // Zincirlenmiş denetim kayıtları — islemGecmisi'nin güvenlik katmanı.
  // { id, tarih, kullaniciAdi, kategori, islemTuru, aciklama, eskiDeger,
  // yeniDeger, hedefId, islemId, sonuc, oncekiHash, hash }.
  auditGecmisi: [],
  // Yedekleme ayarları ve geçmişi. Gerçek bir arka uç/bulut sunucu
  // olmadığından "otomatik yedekleme" burada, uygulama açıkken günü geldiğinde
  // hatırlatan ve tek tıkla indirilebilen bir sistemdir — sessiz arka plan
  // yedeklemesi (uygulama kapalıyken) tarayıcıda teknik olarak mümkün değildir.
  yedekAyarlari: { sıklik: "gunluk", saat: "23:00", aktif: false },
  yedekGecmisi: [], // { id, tarih, tur: "manuel"|"gunluk"|"haftalik"|"aylik", durum: "Başarılı", dosyaAdi }
  // Ürün kategorileri — ana + alt kategori TEK bir düz listede tutulur;
  // ustKategoriId boşsa bu bir ana kategoridir. { id, ad, ustKategoriId,
  // aktif, ozelAlanlar: [{id, ad, tip: "metin"|"sayi"}] }.
  kategoriler: VARSAYILAN_KATEGORILER(),
  // Markalar — ürünlerden bağımsız bir tablo. { id, ad, kod, logo, aciklama,
  // mensei, aktif, grup: "OEM"|"Premium"|"Orta"|"Ekonomik"|"", not,
  // fiyatKurali: {taban, oran} | null }.
  markalar: VARSAYILAN_MARKALAR(),
  // Araç tanımları (ürün markalarından TAMAMEN AYRI bir taksonomi — burada
  // "marka" Volkswagen/Audi gibi ARAÇ üreticisidir). Her kayıt tek bir motor
  // varyantını temsil eder: { id, marka, model, kasa, yilBaslangic, yilBitis,
  // motor, motorKodu, yakit, guc, aktif }.
  araclar: VARSAYILAN_ARACLAR(),
  // Ürün ↔ Araç eşleştirmeleri (çoktan-çoğa) — { id, parcaId, aracId,
  // durum: "Kesin Uyumlu"|"Kontrol Gerekli"|"Uyumsuz", not }.
  uyumluluklar: [],
  // Rezerv / ürün ayırma kayıtları — { id, musteriAdi, musteriTelefon,
  // parcaId, adet, rezervFiyati, rezervTarihi, sonGecerlilikTarihi, not,
  // olusturanKullanici, durum: "Bekliyor"|"Teslim Edildi"|"Süresi Doldu"|
  // "İptal Edildi", donusturulenSatisId, iptalNedeni }.
  rezervler: [],
  // Favori / hızlı satış ürünleri — { id, parcaId, kullaniciId, eklenmeTarihi }.
  // kullaniciId boşsa (null) bu bir MAĞAZA ORTAK favorisidir, herkese
  // görünür; doluysa sadece o kullanıcının kişisel favorisidir.
  favoriler: [],
  // Müşteri fiyat grupları — { id, ad, aciklama }.
  musteriFiyatGruplari: VARSAYILAN_FIYAT_GRUPLARI(),
  // Fiyat grubu kuralları — bir fiyat grubunun ürün/kategori/marka/tümü
  // bazında ne kadar iskonto uygulayacağını tanımlar. { id, grupId,
  // hedefTuru: "urun"|"kategori"|"marka"|"tumu", hedefDeger, iskontoTuru:
  // "yuzde"|"tutar", iskontoDeger }.
  fiyatGrubuKurallari: [],
  // Müşteriye özel fiyat — en yüksek öncelikli kural. { id, musteriId,
  // parcaId, fiyat, tarih, kullanici }.
  musteriOzelFiyatlar: [],
  // Kampanya fiyatları — tarih aralıklı ürün/kategori/marka indirimleri.
  // { id, ad, baslangicTarihi, bitisTarihi, hedefTuru: "urun"|"kategori"|
  // "marka", hedefDeger, iskontoTuru: "yuzde"|"tutar", iskontoDeger, aktif }.
  kampanyalar: [],
  // Belge numarası sayaçları — { "ST-2026": 47, "FT-2026": 3, ... }.
  belgeSayaclari: {},
  // Mağaza bilgileri — belge/fiş üstünde ve yazdırmada kullanılır.
  magazaBilgileri: {
    ad: "AKCAN GROUP OTOMOTİV",
    logo: "",
    adres: "",
    telefon: "",
    eposta: "",
    vergiDairesi: "",
    vergiNo: "",
    web: "",
  },
});

export const veriyiOnar = (db) => ({
  ...db,
  parcalar: (db.parcalar || []).map((p) => ({
    ...p,
    alisGecmisi: p.alisGecmisi || [],
    fiyatGecmisi: p.fiyatGecmisi || [],
    // Hasarlı/ayıplı iade edilen ürünler NORMAL satılabilir stoğa asla
    // karışmaz — ayrı bir sayaçta ve ayrı bir geçmişte tutulur.
    hasarliStok: p.hasarliStok || 0,
    hasarliGecmisi: p.hasarliGecmisi || [],
    // Ürün birden fazla rafa/gözde bölünmüş tutuluyorsa buradan izlenir —
    // [{ id, kod, adet }]. Boşsa ürün tek başına "rafAdresi" (Ana Raf)
    // konumundadır; bu, parcaRafListesi() ile birleştirilerek okunur.
    rafKonumlari: p.rafKonumlari || [],
    hedefStok: p.hedefStok || 0,
    siparisteAdet: p.siparisteAdet || 0,
    // Güvenlik stoğu (59. adım, 4. madde) — minimum stoğun üzerinde,
    // beklenmedik satış artışlarına karşı korunacak ek tampon miktar.
    guvenlikStogu: p.guvenlikStogu || 0,
    // Bir ürüne bağlı TÜM barkodlar — Stok Kodu/OEM/Üretici Kodu/Muadil
    // Kod'dan bilinçli olarak ayrı tutulur. p.barkod (tekil, eski alan)
    // hâlâ birincil barkod olarak senkron kalır.
    barkodlar: p.barkodlar && p.barkodlar.length > 0 ? p.barkodlar : p.barkod ? [p.barkod] : [],
    // Etiket son yazdırıldığındaki satış fiyatı — bugünkü fiyattan farklıysa
    // "Etiket fiyatı güncel değil" uyarısı bunun üzerinden hesaplanır.
    etiketSonYazdirmaFiyati: p.etiketSonYazdirmaFiyati ?? null,
    // p.kategori (mevcut, geriye dönük uyumlu alan) ALT kategori adını taşır
    // (alt kategori seçilmediyse ana kategori adını). p.anaKategori ayrıca
    // üst kategoriyi tutar — Toplu Fiyat/Sayım/Raporlar gibi modüller hâlâ
    // sadece p.kategori'ye bakarak çalışmaya devam eder, hiçbiri bozulmaz.
    anaKategori: p.anaKategori || "",
    kategoriOzelDegerler: p.kategoriOzelDegerler || {},
    // Marka değişiklik geçmişi — "Eski marka → Yeni marka → Kullanıcı → Tarih".
    markaGecmisi: p.markaGecmisi || [],
    // Fotoğraflar/dokümanlar STOK KODUNA değil, bu benzersiz p.id'ye bağlıdır
    // — stok kodu sonradan değişse bile görseller/belgeler kaybolmaz.
    // Dizinin ilk elemanı her zaman "Ana Fotoğraf"tır (sıralama = öncelik).
    // { id, url, tur, dosyaAdi, boyutKb, tarih }
    fotograflar: p.fotograflar || (p.fotograf ? [{ id: yeniId("fo"), url: p.fotograf, tur: "Ana Ürün", dosyaAdi: "", boyutKb: 0, tarih: zamanDamgasi() }] : []),
    dokumanlar: p.dokumanlar || [],
    // Depo bazında stok dağılımı — TOPLAM her zaman p.stok'a eşit olmalıdır
    // (transfer sırasında "yolda" olan miktar hariç). Tek depo kullanımında
    // otomatik olarak tüm stok "depo-ana"ya atanmış görünür; bu, mevcut
    // (depo kavramı olmayan) tüm davranışı hiç bozmadan çalışmaya devam eder.
    depoStoklari: p.depoStoklari && p.depoStoklari.length > 0 ? p.depoStoklari : [{ depoId: "depo-ana", adet: p.stok || 0 }],
    // Ürün tipi — "Basit" (normal, kendi stoğu olan), "Set" (birden fazla
    // ürünün paketi; KENDİ stoğu yoktur, satıldığında bileşenlerinin stoğu
    // düşer), "Stoksuz" (hizmet vb.). Set ile Muadil TAMAMEN farklı yapılar:
    // Muadil aynı ihtiyacı karşılayan başka bir markanın ürünüdür (db.kodlar,
    // tip="Muadil"); Set ise birden fazla farklı ürünün TEK satış paketidir.
    urunTipi: p.urunTipi || "Basit",
    // Set bileşenleri — SADECE urunTipi==="Set" olan ürünlerde anlamlıdır.
    // { id, parcaId, adet }.
    setBilesenleri: p.setBilesenleri || [],
    // Paket/koli birimleri — "1 kutu = 10 adet", "1 koli = 200 adet" gibi
    // temel birime (p.birim) çoklu dönüşüm katmanları. { id, ad, iceriyorAdet }.
    paketBirimleri: p.paketBirimleri || [],
    // Satış şekli: sadeceTemel (yalnızca adet/temel birim satılır),
    // sadecePaket (yalnızca tanımlı paket birimiyle satılır), ikisiDe.
    satisBirimSekli: p.satisBirimSekli || "sadeceTemel",
  })),
  kodlar: db.kodlar || [],
  satislar: (db.satislar || []).map((s) => ({
    ...s,
    kalemler: (s.kalemler || []).map((k) => ({ iadeEdilenAdet: k.iadeEdilenAdet || 0, fiyatKaynagi: "Normal Fiyat", ...k })),
    odemeler: s.odemeler || [],
    acikHesapOdenen: s.acikHesapOdenen || 0,
    belgeTuru: s.belgeTuru || "Satış Fişi",
    belgeNo: s.belgeNo || null,
    iptalNedeni: s.iptalNedeni || "",
    iptalEden: s.iptalEden || "",
    iptalTarihi: s.iptalTarihi || null,
    // İleride resmi bir e-belge/e-fatura entegrasyonu eklendiğinde bu alan
    // gerçek durumu taşıyacak — şimdilik altyapı hazır, entegrasyon yok.
    eFatura: s.eFatura || { durum: "Gönderilmedi", eFaturaNo: null },
  })),
  cariler: (db.cariler || []).map((c) => ({
    musteriTipi: "Bireysel",
    telefon: "",
    vergiTcNo: "",
    adres: "",
    borcLimiti: "",
    vadeGunu: "",
    iskontoOrani: "",
    fiyatGrubu: "",
    notlar: "",
    aktif: true,
    ...c,
    hareketler: c.hareketler || [],
    // Teslimat adresi geçmişi — müşterinin daha önce kullandığı teslimat
    // adresleri; satış sırasında "Kayıtlı Adres → Seç → Kullan" için (51.
    // adım, 6. madde). { id, adres, il, ilce }.
    kayitliAdresler: c.kayitliAdresler || [],
    // Ticari İleti İzni (62. adım, 9. madde) — SADECE pazarlama amaçlı
    // bildirimler için kontrol edilir; operasyonel bildirimler (sipariş
    // hazır, kargo takip no gibi) bu izinden bağımsız gönderilir (10. madde).
    ticariIletiIzni: c.ticariIletiIzni || { izinVar: false, izinKanallari: [], izinTarihi: null, izinKaynagi: "" },
    // Not: müşteri notları artık db.musteriNotlari (üst seviye, kalıcı
    // günlük) koleksiyonunda tutulur — bu objenin içinde AYRICA bir not
    // alanı YOKTUR, karışıklığı önlemek için.
  })),
  hedefKarAyari: db.hedefKarAyari || { tur: "markup", deger: 30 },
  stokHareketleri: db.stokHareketleri || [],
  ayarlar: {
    eksiStokIzni: false,
    fiyatYuvarlama: 0,
    rezervSatisFiyatiTercihi: "rezerv",
    maliyetYontemi: "agirlikliOrtalama",
    satisHiziEsikleri: { hizliEsigi: 10, normalEsigiMin: 3, yavasEsigiMin: 1, oluStokGunEsigi: 90 },
    paraBirimi: "TL",
    varsayilanKdvOrani: 20,
    kdvGosterimTercihi: "dahil",
    varsayilanMusteriAdi: "",
    varsayilanFiyatGrubuId: "",
    varsayilanOdemeYontemi: "Nakit",
    maksimumIskontoYuzdesi: null,
    varsayilanMinimumStok: 5,
    varsayilanDepoId: "depo-ana",
    varsayilanRaf: "",
    otomatikSiparisOnerisi: true,
    yaziciAdi: "",
    kagitBoyutu: "80mm (Termal Fiş)",
    belgeAltYazisi: "",
    barkodTipi: "EAN-13",
    etiketBoyutu: "40x30mm",
    etiketYazici: "",
    dil: "Türkçe",
    tarihFormati: "GG.AA.YYYY",
    saatFormati: "24 Saat",
    oturumSuresiDakika: 15,
    veriSaklamaSuresiGun: 0,
    logSaklamaSuresiGun: 0,
    ...(db.ayarlar || {}),
    klavyeKisayollari: { ...VARSAYILAN_KISAYOLLAR, ...(db.ayarlar?.klavyeKisayollari || {}) },
    belgeOnekleri: { ...BELGE_TUR_ONEKLERI, ...(db.ayarlar?.belgeOnekleri || {}) },
    odemeYontemleriDurumu: { Nakit: true, "Kredi Kartı": true, "Havale/EFT": true, FAST: true, Çek: true, "Açık Hesap": true, ...(db.ayarlar?.odemeYontemleriDurumu || {}) },
    etiketAlanlari: { fiyatGoster: true, oemGoster: false, muadilGoster: false, rafGoster: false, ...(db.ayarlar?.etiketAlanlari || {}) },
  },
  malAlimlari: (db.malAlimlari || []).map((m) => ({
    ...m,
    kalemler: (m.kalemler || []).map((k) => ({ ...k, iadeEdilenAdet: k.iadeEdilenAdet || 0 })),
    degisiklikGecmisi: m.degisiklikGecmisi || [],
    // Taksitli ödeme planı — { id, tarih, tutar, odendi }. Bilgilendirme/
    // planlama amaçlıdır; gerçek ödeme kaydı hâlâ Tedarikçi Ödemesi akışından
    // yapılır, buradaki "Ödendi" işareti sadece plana göre takip sağlar.
    odemePlani: m.odemePlani || [],
  })),
  kasaIslemleri: (db.kasaIslemleri || []).map((k) => ({ ...k, odemeSatirlari: k.odemeSatirlari || [], faturaTahsisleri: k.faturaTahsisleri || [] })),
  tedarikciler: (db.tedarikciler || []).map((t) => ({
    yetkiliKisi: "",
    telefon: "",
    eposta: "",
    vergiDairesi: "",
    vergiNo: "",
    adres: "",
    odemeVadesiGun: "",
    iskontoOrani: "",
    odemeYontemi: "",
    borcLimiti: "",
    notlar: "",
    aktif: true,
    ...t,
    hareketler: t.hareketler || [],
    // Minimum sipariş adedi (59. adım, 1. madde) — tedarikçinin kabul
    // ettiği en az sipariş miktarı; öneri hesaplamasında yuvarlanır.
    minimumSiparisAdedi: t.minimumSiparisAdedi || 0,
    // Not: tedarikçi notları artık db.tedarikciNotlari (üst seviye, kalıcı
    // günlük) koleksiyonunda tutulur.
  })),
  hesaplar: (db.hesaplar || []).map((h) => ({ iban: "", ...h, hareketler: h.hareketler || [] })),
  giderler: (db.giderler || []).map((g) => ({
    kdvOrani: 0,
    kdvTutari: 0,
    kdvHaricTutar: g.tutar || 0,
    odemeYontemi: g.hesapId ? "Nakit" : "",
    tedarikciFirma: "",
    belgeDosyasi: "",
    vadeTarihi: "",
    odemeDurumu: g.durum === "İptal Edildi" ? "İptal" : g.hesapId ? "Ödendi" : "Bekliyor",
    odenenTutar: g.durum === "İptal Edildi" ? 0 : g.hesapId ? g.tutar || 0 : 0,
    tekrarlayanId: null,
    ...g,
  })),
  tekrarlayanGiderler: db.tekrarlayanGiderler || [],
  giderKategorileri: db.giderKategorileri && db.giderKategorileri.length > 0 ? db.giderKategorileri : VARSAYILAN_GIDER_KATEGORILERI(),
  posCihazlari: db.posCihazlari || [],
  posTahsilatlari: db.posTahsilatlari || [],
  satinAlmaSiparisleri: (db.satinAlmaSiparisleri || []).map((s) => ({ malKabulGecmisi: [], iptalNedeni: "", tamamlanmaTarihi: null, ...s })),
  depolar: db.depolar && db.depolar.length > 0 ? db.depolar.map((d) => ({ aktif: true, ...d })) : VARSAYILAN_DEPOLAR(),
  transferler: (db.transferler || []).map((t) => ({ kaynakRaf: "", hedefRaf: "", gonderilmeTarihi: null, teslimTarihi: null, iptalNedeni: "", ...t })),
  musteriSiparisleri: (db.musteriSiparisleri || []).map((s) => ({ teslimTarihi: null, iptalNedeni: "", donusturulenSatisId: null, ...s })),
  iceAktarmaSablonlari: db.iceAktarmaSablonlari || [],
  musteriNotlari: db.musteriNotlari || [],
  tedarikciNotlari: db.tedarikciNotlari || [],
  gunSonlari: (db.gunSonlari || []).map((g) => ({ stokDegeriAnlikGoruntu: null, ...g })),
  vardiyalar: (db.vardiyalar || []).map((v) => ({ hesapId: null, hesapAdi: "", devredenVardiyaId: null, kapananKullanici: "", beklenenKasaTutari: null, kasaFarki: null, ...v })),
  teklifler: (db.teklifler || []).map((t) => ({ donusturulenSatisId: null, rezervIdleri: [], ...t })),
  etiketYazdirmaGecmisi: db.etiketYazdirmaGecmisi || [],
  kargoFirmalari: db.kargoFirmalari || [],
  teslimatlar: (db.teslimatlar || []).map((t) => ({ paketler: [], giderKaydedildi: false, ...t })),
  tedarikciTeklifleri: db.tedarikciTeklifleri || [],
  entegrasyonlar: db.entegrasyonlar || [],
  entegrasyonLoglari: db.entegrasyonLoglari || [],
  entegrasyonKuyrugu: db.entegrasyonKuyrugu || [],
  bildirimSablonlari: db.bildirimSablonlari || [],
  disBildirimGecmisi: db.disBildirimGecmisi || [],
  kasaGunleri: db.kasaGunleri || [],
  iadeler: db.iadeler || [],
  alisIadeleri: db.alisIadeleri || [],
  rafHareketleri: db.rafHareketleri || [],
  topluFiyatIslemleri: db.topluFiyatIslemleri || [],
  sayimlar: (db.sayimlar || []).map((s, i) => ({ sayimNo: s.sayimNo || i + 1, kapsamUrunIdleri: s.kapsamUrunIdleri || [], ...s, kalemler: s.kalemler || [] })),
  roller: (db.roller && db.roller.length > 0 ? db.roller : VARSAYILAN_ROLLER()).map((r) => ({ maksimumIskontoYuzdesi: null, ...r })),
  kullanicilar: (db.kullanicilar || []).map((k) => ({
    bildirimAyarlari: { kapaliKategoriler: [], sesliUyari: false, masaustuBildirimi: false },
    sonAramalar: [],
    // Dış kanal tercihleri (62. adım, 3. madde) — hangi olay kategorileri
    // bildirimAyarlari.kapaliKategoriler ile zaten kontrol ediliyor; bu alan
    // AÇIK olan kategorilerin hangi DIŞ kanaldan iletileceğini belirler.
    disKanalTercihleri: { epostaAktif: false, smsAktif: false, whatsappAktif: false, pushAktif: false },
    ...k,
  })),
  islemGecmisi: db.islemGecmisi || [],
  auditGecmisi: db.auditGecmisi || [],
  girisGecmisi: db.girisGecmisi || [],
  yedekAyarlari: { sıklik: "gunluk", saat: "23:00", aktif: false, ...(db.yedekAyarlari || {}) },
  yedekGecmisi: db.yedekGecmisi || [],
  kategoriler: db.kategoriler && db.kategoriler.length > 0 ? db.kategoriler.map((k) => ({ ozelAlanlar: [], aktif: true, ...k })) : VARSAYILAN_KATEGORILER(),
  markalar: db.markalar && db.markalar.length > 0 ? db.markalar.map((m) => ({ kod: "", logo: "", aciklama: "", mensei: "", aktif: true, grup: "", not: "", fiyatKurali: null, ...m })) : VARSAYILAN_MARKALAR(),
  araclar: db.araclar && db.araclar.length > 0 ? db.araclar.map((a) => ({ aktif: true, ...a })) : VARSAYILAN_ARACLAR(),
  uyumluluklar: (db.uyumluluklar || []).map((u) => ({ not: "", ...u })),
  rezervler: (db.rezervler || []).map((r) => ({ not: "", ...r })),
  favoriler: db.favoriler || [],
  musteriFiyatGruplari: db.musteriFiyatGruplari && db.musteriFiyatGruplari.length > 0 ? db.musteriFiyatGruplari : VARSAYILAN_FIYAT_GRUPLARI(),
  fiyatGrubuKurallari: db.fiyatGrubuKurallari || [],
  musteriOzelFiyatlar: db.musteriOzelFiyatlar || [],
  kampanyalar: (db.kampanyalar || []).map((k) => ({ hedefUrunIdleri: [], hedefMusteriGrubuId: "", minimumAdet: null, maksimumAdet: null, maliyetAltiOnaylandi: false, ...k })),
  belgeSayaclari: db.belgeSayaclari || {},
  magazaBilgileri: {
    ad: "AKCAN GROUP OTOMOTİV",
    logo: "",
    adres: "",
    telefon: "",
    eposta: "",
    vergiDairesi: "",
    vergiNo: "",
    web: "",
    ...(db.magazaBilgileri || {}),
  },
});

// Stoğu değiştirmenin TEK yolu — parçanın stoğunu günceller ve aynı anda
// kalıcı bir hareket kaydı oluşturur. "prev" (updateDb içindeki güncel db)
// üzerinde çalışır, güncellenmiş db'yi döndürür; bu sayede tek bir satışta
// birden fazla kalem için art arda çağrılabilir. Negatif stoğa izin
// verilmiyorsa ve işlem stoğu eksiye düşürecekse null döner — çağıran taraf
// bunu kontrol edip işlemi engellemelidir.
export const stokHareketiUygula = (prev, { parcaId, tur, giris = 0, cikis = 0, belgeNo = "", kullanici = "", aciklama = "" }) => {
  const parca = prev.parcalar.find((p) => p.id === parcaId);
  if (!parca) return prev;

  // Aynı belge aynı ürün için aynı stok hareketini ikinci kez uygulama.
  // belgeNo dolu olan satış/alış/iade/sayım hareketlerinde idempotency anahtarı:
  // parcaId + tur + belgeNo + giris + cikis.
  // Belge numarası boş olan manuel hareketlerde mevcut davranış korunur.
  if (belgeNo && Array.isArray(prev.stokHareketleri)) {
    const ayniHareket = prev.stokHareketleri.some(
      (h) =>
        h.parcaId === parcaId &&
        h.tur === tur &&
        h.belgeNo === belgeNo &&
        Number(h.giris || 0) === Number(giris || 0) &&
        Number(h.cikis || 0) === Number(cikis || 0)
    );
    if (ayniHareket) return prev;
  }
  const kalan = Math.round(((parca.stok || 0) + giris - cikis) * 1000) / 1000;
  if (kalan < 0 && !prev.ayarlar?.eksiStokIzni) return null;
  const hareket = {
    id: yeniId("sh"),
    parcaId,
    tarih: zamanDamgasi(),
    tur,
    belgeNo: belgeNo || "",
    giris,
    cikis,
    kalanStok: kalan,
    kullanici: kullanici || "",
    aciklama: aciklama || "",
  };
  // Bu fonksiyon depo bilgisi almadığı için (satış/alış/sayım gibi çoğu
  // çağrı noktası hâlâ depo kavramından habersizdir), fark HER ZAMAN
  // varsayılan depoya ("depo-ana", db.depolar'daki ilk depo) işlenir. Tek
  // depo kullanan mağazalarda bu, p.stok ile depoStoklari'nin her zaman
  // birebir eşit kalmasını garanti eder — depo transferi YAPILMADIĞI sürece
  // hiçbir tutarsızlık oluşmaz.
  const varsayilanDepoId = prev.depolar?.[0]?.id || "depo-ana";
  return {
    ...prev,
    parcalar: prev.parcalar.map((p) => {
      if (p.id !== parcaId) return p;
      const mevcutDagilim = p.depoStoklari && p.depoStoklari.length > 0 ? p.depoStoklari : [{ depoId: varsayilanDepoId, adet: p.stok || 0 }];
      const varsayilanVarMi = mevcutDagilim.some((d) => d.depoId === varsayilanDepoId);
      const yeniDagilim = varsayilanVarMi
        ? mevcutDagilim.map((d) => (d.depoId === varsayilanDepoId ? { ...d, adet: Math.round((d.adet + giris - cikis) * 1000) / 1000 } : d))
        : [...mevcutDagilim, { depoId: varsayilanDepoId, adet: Math.round((giris - cikis) * 1000) / 1000 }];
      return { ...p, stok: kalan, depoStoklari: yeniDagilim };
    }),
    stokHareketleri: [hareket, ...prev.stokHareketleri],
  };
};
