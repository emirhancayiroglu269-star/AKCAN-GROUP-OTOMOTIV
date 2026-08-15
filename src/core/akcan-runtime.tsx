export { ucUcaMutabakatKontrolu, ucUcaMutabakatOzeti } from "../lib/uc-uca-mutabakat";
export { gunSonuKapanisKontrolu, gunSonuKapanisKaydiOlustur } from "../lib/gun-sonu-kapanis";
export { donemKapanisKontrolu, donemKapanisKaydiOlustur, donemKarsilastirmaRaporu } from "../lib/donem-kapanis";
/* AUTO-GENERATED MODULAR RUNTIME. Keep business helpers/components here; page modules live in src/modules. */

import React, { useState, useEffect, useRef } from "react";

import loginBrandImage from "../assets/akcan-login-brand.png";

import {
  Package,
  Plus,
  Search,
  X,
  Check,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  Car,
  Image as ImageIcon,
  History,
  TrendingUp,
  EyeOff,
  Eye,
  GitCompare,
  ShoppingCart,
  Zap,
  Printer,
  RotateCcw,
  Tag,
  ArrowUpDown,
  ListOrdered,
  Settings,
  Truck,
  Building2,
  Users,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  MapPin,
  ClipboardList,
  FileDown,
  Percent,
  BarChart3,
  ShieldCheck,
  LogOut,
  ScanLine,
  Download,
  Upload,
  LayoutDashboard,
  ChevronRight,
  Star,
  CreditCard,
  PackageSearch,
  Bell,
  Calendar,
  Lock,
  FileText,
  LineChart,
  LogIn,
  Gauge,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Bölünmüş modüller — refactor: theme, format, sabitler, veri modeli  */
/* ------------------------------------------------------------------ */
import { T, fontImport, DISPLAY, MONO } from "../lib/theme";

import {
  MERKEZI_API,
  OTURUM_KEY,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  supabaseRealtime,
  merkeziIstek,
} from "../lib/supabase";

import { veriSkoru, tl, bugun, tarihGoster, isoGun, guvenliZamanDamgasi, zamanDamgasi, yeniId } from "../lib/format";

import { bildirimGoster, bildirimAboneAyarla } from "../lib/bildirim";

import { sonKullaniciAdi, useIslemYapan, sonKullaniciAdiKaydet } from "../lib/kullanici-hooks";
import { girisKilidiDurumu, girisBasarisiz, girisBasarili, sifreGucluMu, kalanKilitSuresiMetni } from "../lib/guvenlik";

import {
  STORAGE_KEY,
  BIRIMLER,
  URUN_TIPLERI,
  KDV_ORANLARI,
  KOD_TIPLERI,
  ODEME_YONTEMLERI,
  ALIS_ODEME_DURUMLARI,
  DUSUK_KAR_ESIGI_YUZDE,
  STOK_GIRIS_TURLERI,
  STOK_CIKIS_TURLERI,
  YETKI_TANIMLARI,
  hepsi,
  VARSAYILAN_ROLLER,
  VARSAYILAN_FIYAT_GRUPLARI,
  VARSAYILAN_KATEGORILER,
  VARSAYILAN_MARKALAR,
  VARSAYILAN_GIDER_KATEGORILERI,
  VARSAYILAN_DEPOLAR,
  VARSAYILAN_ARACLAR,
  yetkiVarMi,
  islemKaydet,
  VARSAYILAN_KISAYOLLAR,
  BELGE_TUR_ONEKLERI,
  BELGE_TURLERI,
} from "../lib/constants";

import { auditKaydiEkle, auditZincirKontrolu, kritikYetkiVarMi, AUDIT_KATEGORILERI } from "../lib/audit-log";

import { bosVeritabani, veriyiOnar, stokHareketiUygula } from "../lib/database";

import { ean13KontrolHanesi, ean13Modulleri, kodNormalize, parcaTumBarkodlari, parcaBarkodEslesiyorMu, barkodluParcaBul } from "../lib/barkod";

import { parcaRafListesi } from "../lib/raf";

import {
  agirlikliOrtalamaMaliyetHesapla,
  gecerliMaliyet,
  kdvHaricSatisFiyati,
  kdvDahilMaliyet,
  karTutariHesapla,
  karOraniMarkup,
  karOraniMargin,
  satisKalemiKarBilgisi,
  satisKalemiListeKari,
} from "../lib/maliyet";

import { anaKategoriler, altKategoriler, kategoriOzelAlanlari, kategoriUrunleriBul, kategoriOzetHesapla } from "../lib/kategori";

import { MARKA_GRUPLARI, markaUrunleriBul, markaOzetHesapla } from "../lib/marka";

import { UYUMLULUK_DURUMLARI, uyumlulukGorseli, aracEtiketi, parcaUyumluAraclari, aracUyumluParcalari } from "../lib/arac";

import {
  sonSatisTarihiBul,
  sonNGunSatisAdedi,
  SATIS_HIZI_SINIF_GORSELI,
  parcaSonSatisTarihi,
  satisHiziSiniflandir,
  stokYasiGunu,
  STOK_YASI_GRUPLARI,
  stokYasiGrubu,
  oluStokAksiyonOnerileri,
} from "../lib/olu-stok";

import { DEVIR_HIZI_SINIF_GORSELI, devirHiziSinifBul, urunDevirHiziHesapla, grupDevirHiziHesapla } from "../lib/stok-performans";

import { REZERV_DURUMLARI, rezervDurumGorseli, parcaRezerveAdedi, parcaKarsilanmisMusteriSiparisiAdedi, parcaBekleyenMusteriTalebi, parcaSatilabilirStok, suresiGecenRezervleriGuncelle } from "../lib/rezerv";

import { yeniBelgeNumarasiUret, belgeSayaciGuncelle, satisBelgeNoGoster } from "../lib/belge";

import { metinBenzerligiYuzde, mukerrerUrunBul, benzerUrunleriBul } from "../lib/veri-dogrulama";

import { hizliAramaYap, yakinEslesmeOner, stokDurumuHesapla, satisAramaYap } from "../lib/arama";

import { belgeYazdir } from "../lib/belge-yazdirma";

import {
  tedarikciHareketiUygula,
  cariHareketiUygula,
  hesapHareketiUygula,
  posKomisyonuHesapla,
  hesapTransferiUygula,
  tedarikciHareketleriniGeriAl,
} from "../lib/cari-kasa";

import { yoneticiOnayiAl } from "../lib/yonetici-onay";

import { ciftKayitDenetimKontrolu, ciftKayitDenetimOzeti } from "../lib/cift-kayit-denetim";
import { tersIslemDenetimKontrolu, tersIslemDenetimOzeti } from "../lib/ters-islem-denetim";
import { yetkiDenetimKontrolu, yetkiDenetimOzeti } from "../lib/yetki-denetim";
import { finansIslemiUygula, finansIslemDogrula, finansIslemiIptalEt, finansTutarlilikKontrolu, finansTutarlilikOzeti } from "../lib/finans-islem";
import { satisFinansHareketleriniUygula, satisFinansHareketleriniTersineCevir } from "../lib/satis-finans-motoru";
import { posMutabakatUygula } from "../lib/pos-mutabakat-motoru";
import { alisFinansHareketleriniUygula } from "../lib/alis-finans-motoru";


import {
  iskontoUygula,
  enSpesifikKural,
  kampanyaHedefUrunleri,
  kampanyaOnizlemesiHesapla,
  kampanyaSatisRaporu,
  parcaFiyatiHesapla,
} from "../lib/fiyatlandirma";

// Kullanıcı sistemi kurulduktan sonra yönetici onayı artık gerçek bir
// kullanıcı adı + şifre doğrulamasıdır: "kullaniciYonetebilir" yetkisine
// sahip aktif bir kullanıcının kimliği doğrulanmadan onay verilmez. Henüz
// hiç kullanıcı tanımlanmadıysa (geçiş dönemi / ilk kurulum), eski basit PIN
// mekanizmasına geri döner — böylece kullanıcı sistemi kurulmadan önce de
// uygulama kilitlenmez.
// yoneticiOnayiAl artık ./lib/yonetici-onay içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* Small shared UI atoms                                               */
/* ------------------------------------------------------------------ */
import { Rozet, Kart, Buton, Girdi, Secim, Bos, TehlikeSeridi, EanBarkod } from "../components/ui";

/* ------------------------------------------------------------------ */
/* RAF EKRANI — bir rafı seçince oradaki tüm ürünleri listeler          */
/* ------------------------------------------------------------------ */
import { RafSayfasi } from "../pages/RafSayfasi";

/* ------------------------------------------------------------------ */
/* KATEGORİ YÖNETİMİ SAYFASI                                           */
/* ------------------------------------------------------------------ */
import { KategoriSayfasi } from "../pages/KategoriSayfasi";

/* ------------------------------------------------------------------ */
/* MARKA YÖNETİMİ SAYFASI                                              */
/* ------------------------------------------------------------------ */
import { MarkaSayfasi } from "../pages/MarkaSayfasi";

/* ------------------------------------------------------------------ */
/* ARAÇ UYUMLULUK SAYFASI                                              */
/* ------------------------------------------------------------------ */
import { AracSayfasi } from "../pages/AracSayfasi";

/* ------------------------------------------------------------------ */
/* REZERV / ÜRÜN AYIRMA SAYFASI                                        */
/* ------------------------------------------------------------------ */
import { RezervSayfasi } from "../pages/RezervSayfasi";

/* ------------------------------------------------------------------ */
/* İSKONTO / MÜŞTERİ ÖZEL FİYAT — YÖNETİM SAYFASI                     */
/* ------------------------------------------------------------------ */
import { FiyatKurallariSayfasi } from "../pages/FiyatKurallariSayfasi";

/* ------------------------------------------------------------------ */
/* BELGELER — Satış Fişi / Fatura / İrsaliye / Tahsilat Makbuzu arama  */
/* ve yönetimi                                                         */
/* ------------------------------------------------------------------ */
import { BelgelerSayfasi } from "../pages/BelgelerSayfasi";

/* ------------------------------------------------------------------ */
/* ÖLÜ STOK / YAVAŞ HAREKET EDEN ÜRÜN SAYFASI                          */
/* ------------------------------------------------------------------ */
import { OluStokSayfasi } from "../pages/OluStokSayfasi";

/* ------------------------------------------------------------------ */
/* STOK DEVİR HIZI VE ÜRÜN PERFORMANS SAYFASI                          */
/* ------------------------------------------------------------------ */
import { StokDevirHiziSayfasi } from "../pages/StokDevirHiziSayfasi";


/* ------------------------------------------------------------------ */
/* Ayrıştırılmış runtime çekirdekleri                                 */
/* ------------------------------------------------------------------ */
import { ICE_AKTARMA_ALANLARI, ICE_AKTARMA_OTOMATIK_ESLESME, otomatikSutunOner, FOTOGRAF_TURLERI, DOKUMAN_TURLERI } from "./aktarim";
import { SIPARIS_DURUMLARI, siparisDurumGorseli, siparisKalemNetToplam, siparisGenelToplam, siparisToplamAdet, siparisAlinanAdet } from "./satin-alma";
import { satirNetMaliyetHesapla, satirToplamiHesapla, bosAlisForm, bosTedarikciForm, tedarikciCariBakiyesiHesapla, tedarikciAcikFaturalari, EKSTRE_TARIH_ARALIGI_HESAPLA, vadeDurumuHesapla } from "./tedarikci-cari";
import { MUSTERI_SIPARIS_DURUMLARI, musteriSiparisDurumGorseli, gorunurFavoriler, parcaFavoriMi } from "./musteri-siparis";
import { bosForm } from "./urun-form";
import { satisKalemiEfektifBirim, YUVARLAMA_SECENEKLERI, hedefKarAltindaMi, sayimKapsamindakiParcalar, sayimOzetiHesapla, stokDegerlemeOzetiHesapla, bosKullaniciForm, bosRolForm } from "./stok-analiz";
import { teklifDurumGorseli, teklifKalemNetTutar, teklifGenelToplam, teklifSureleriGuncelle, bosTeklifForm, TESLIMAT_TIPLERI, TESLIMAT_DURUMLARI, teslimatDurumGorseli, bosPaket } from "./teklif-teslimat";
import { entegrasyonDurumGorseli, anahtarMaskele, BILDIRIM_OLAY_TURLERI, BILDIRIM_KANALLARI, bosSablonForm } from "./bildirim-config";

import { karKademeleriHesapla, parcaSatisGecmisi, parcaZamanCizelgesi } from "../services/satis-service";
import {
  gecerliHedefStok, onerilenSiparisAdedi, parcaAcikSatinAlmaAdedi, akilliSiparisOnerisiHesapla, depoStogu, parcaAcikTransferAdedi,
  tedarikciTeslimatPerformansi, TEDARIKCI_STOK_DURUMLARI, tedarikciStokDurumGorseli, teklifNetMaliyetHesapla, tedarikciTeklifSureleriGuncelle,
  urunAlisIstatistikleri, urunSatisIstatistikleri, FIYAT_DEGISIM_NEDENLERI, fiyatDegisimYuzdesi, urunTedarikciKarsilastirmasi, enUygunTedarikciBul,
  otomatikBarkodUret, setBilesenDetaylari, setMaliyetiHesapla, setSatilabilirMi, tavsiyeFiyatHesapla, fiyatYuvarla, parcaTumZamanlarSatisAdedi, stokAnalizSatiriHesapla, markaKategoriAnaliziYap,
} from "../services/stok-service";
import {
  musteriAcikFaturalariFifo, vadeRenkGorseli, musteriAlacakOzeti, tedarikciBorcOzeti, nakitAkisiHesapla, gunSonuOzetiHesapla, gunKapaliMi,
  bekleyenNotHatirlatmalari, satisAcikHesapKalan, TARIH_ARALIGI_HESAPLA, hesabinAktifVardiyasi, vardiyaOzetiHesapla, yoneticiPaneliDonemAraligi, donemKarsilastir,
} from "../services/rapor-service";

export {
  karKademeleriHesapla, parcaSatisGecmisi, parcaZamanCizelgesi,
} from "../services/satis-service";
export {
  gecerliHedefStok, onerilenSiparisAdedi, parcaAcikSatinAlmaAdedi, akilliSiparisOnerisiHesapla, depoStogu, parcaAcikTransferAdedi,
  tedarikciTeslimatPerformansi, TEDARIKCI_STOK_DURUMLARI, tedarikciStokDurumGorseli, teklifNetMaliyetHesapla, tedarikciTeklifSureleriGuncelle,
  urunAlisIstatistikleri, urunSatisIstatistikleri, FIYAT_DEGISIM_NEDENLERI, fiyatDegisimYuzdesi, urunTedarikciKarsilastirmasi, enUygunTedarikciBul,
  otomatikBarkodUret, setBilesenDetaylari, setMaliyetiHesapla, setSatilabilirMi, tavsiyeFiyatHesapla, fiyatYuvarla, parcaTumZamanlarSatisAdedi, stokAnalizSatiriHesapla, markaKategoriAnaliziYap,
} from "../services/stok-service";
export {
  musteriAcikFaturalariFifo, vadeRenkGorseli, musteriAlacakOzeti, tedarikciBorcOzeti, nakitAkisiHesapla, gunSonuOzetiHesapla, gunKapaliMi,
  bekleyenNotHatirlatmalari, satisAcikHesapKalan, TARIH_ARALIGI_HESAPLA, hesabinAktifVardiyasi, vardiyaOzetiHesapla, yoneticiPaneliDonemAraligi, donemKarsilastir,
} from "../services/rapor-service";

export { ICE_AKTARMA_ALANLARI, ICE_AKTARMA_OTOMATIK_ESLESME, otomatikSutunOner, FOTOGRAF_TURLERI, DOKUMAN_TURLERI } from "./aktarim";
import { csvIndir, csvAyristir, fotografSikistir, vadeGrubuBul, ean13SvgHtml } from "./runtime-utils";
export { csvIndir, csvAyristir, fotografSikistir, vadeGrubuBul, ean13SvgHtml };

export { SIPARIS_DURUMLARI, siparisDurumGorseli, siparisKalemNetToplam, siparisGenelToplam, siparisToplamAdet, siparisAlinanAdet } from "./satin-alma";
export { satirNetMaliyetHesapla, satirToplamiHesapla, bosAlisForm, bosTedarikciForm, tedarikciCariBakiyesiHesapla, tedarikciAcikFaturalari, EKSTRE_TARIH_ARALIGI_HESAPLA, vadeDurumuHesapla } from "./tedarikci-cari";
export { MUSTERI_SIPARIS_DURUMLARI, musteriSiparisDurumGorseli, gorunurFavoriler, parcaFavoriMi } from "./musteri-siparis";
export { bosForm } from "./urun-form";
export { satisKalemiEfektifBirim, YUVARLAMA_SECENEKLERI, hedefKarAltindaMi, sayimKapsamindakiParcalar, sayimOzetiHesapla, stokDegerlemeOzetiHesapla, bosKullaniciForm, bosRolForm } from "./stok-analiz";
export { teklifDurumGorseli, teklifKalemNetTutar, teklifGenelToplam, teklifSureleriGuncelle, bosTeklifForm, TESLIMAT_TIPLERI, TESLIMAT_DURUMLARI, teslimatDurumGorseli, bosPaket } from "./teklif-teslimat";
export { entegrasyonDurumGorseli, anahtarMaskele, BILDIRIM_OLAY_TURLERI, BILDIRIM_KANALLARI, bosSablonForm } from "./bildirim-config";

export { React, useState, useEffect, useRef, loginBrandImage, Package, Plus, Search, X, Check, Pencil, Trash2, AlertTriangle, Loader2, Car, ImageIcon, History, TrendingUp, EyeOff, Eye, GitCompare, ShoppingCart, Zap, Printer, RotateCcw, Tag, ArrowUpDown, ListOrdered, Settings, Truck, Building2, Users, Wallet, ArrowDownCircle, ArrowUpCircle, Landmark, MapPin, ClipboardList, FileDown, Percent, BarChart3, ShieldCheck, LogOut, ScanLine, Download, Upload, LayoutDashboard, ChevronRight, Star, CreditCard, PackageSearch, Bell, Calendar, Lock, FileText, LineChart, LogIn, Gauge, T, fontImport, DISPLAY, MONO, MERKEZI_API, OTURUM_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, supabaseRealtime, merkeziIstek, veriSkoru, girisKilidiDurumu, girisBasarisiz, girisBasarili, sifreGucluMu, kalanKilitSuresiMetni, tl, bugun, tarihGoster, isoGun, guvenliZamanDamgasi, zamanDamgasi, yeniId, bildirimGoster, bildirimAboneAyarla, sonKullaniciAdi, useIslemYapan, sonKullaniciAdiKaydet, STORAGE_KEY, BIRIMLER, URUN_TIPLERI, KDV_ORANLARI, KOD_TIPLERI, ODEME_YONTEMLERI, ALIS_ODEME_DURUMLARI, DUSUK_KAR_ESIGI_YUZDE, STOK_GIRIS_TURLERI, STOK_CIKIS_TURLERI, YETKI_TANIMLARI, hepsi, VARSAYILAN_ROLLER, VARSAYILAN_FIYAT_GRUPLARI, VARSAYILAN_KATEGORILER, VARSAYILAN_MARKALAR, VARSAYILAN_GIDER_KATEGORILERI, VARSAYILAN_DEPOLAR, VARSAYILAN_ARACLAR, yetkiVarMi, islemKaydet, VARSAYILAN_KISAYOLLAR, BELGE_TUR_ONEKLERI, BELGE_TURLERI, bosVeritabani, veriyiOnar, stokHareketiUygula, ean13KontrolHanesi, ean13Modulleri, kodNormalize, parcaTumBarkodlari, parcaBarkodEslesiyorMu, barkodluParcaBul, parcaRafListesi, agirlikliOrtalamaMaliyetHesapla, gecerliMaliyet, kdvHaricSatisFiyati, kdvDahilMaliyet, karTutariHesapla, karOraniMarkup, karOraniMargin, satisKalemiKarBilgisi, satisKalemiListeKari, anaKategoriler, altKategoriler, kategoriOzelAlanlari, kategoriUrunleriBul, kategoriOzetHesapla, MARKA_GRUPLARI, markaUrunleriBul, markaOzetHesapla, UYUMLULUK_DURUMLARI, uyumlulukGorseli, aracEtiketi, parcaUyumluAraclari, aracUyumluParcalari, sonSatisTarihiBul, sonNGunSatisAdedi, SATIS_HIZI_SINIF_GORSELI, parcaSonSatisTarihi, satisHiziSiniflandir, stokYasiGunu, STOK_YASI_GRUPLARI, stokYasiGrubu, oluStokAksiyonOnerileri, DEVIR_HIZI_SINIF_GORSELI, devirHiziSinifBul, urunDevirHiziHesapla, grupDevirHiziHesapla, REZERV_DURUMLARI, rezervDurumGorseli, parcaRezerveAdedi, parcaKarsilanmisMusteriSiparisiAdedi, parcaBekleyenMusteriTalebi, parcaSatilabilirStok, suresiGecenRezervleriGuncelle, yeniBelgeNumarasiUret, belgeSayaciGuncelle, satisBelgeNoGoster, metinBenzerligiYuzde, mukerrerUrunBul, benzerUrunleriBul, hizliAramaYap, yakinEslesmeOner, stokDurumuHesapla, satisAramaYap, belgeYazdir, tedarikciHareketiUygula, cariHareketiUygula, hesapHareketiUygula, posKomisyonuHesapla, posMutabakatUygula, hesapTransferiUygula, tedarikciHareketleriniGeriAl, yoneticiOnayiAl, finansIslemiUygula, finansIslemDogrula, finansIslemiIptalEt, finansTutarlilikKontrolu, finansTutarlilikOzeti, ciftKayitDenetimKontrolu, ciftKayitDenetimOzeti, tersIslemDenetimKontrolu, tersIslemDenetimOzeti, yetkiDenetimKontrolu, yetkiDenetimOzeti, satisFinansHareketleriniUygula, satisFinansHareketleriniTersineCevir, alisFinansHareketleriniUygula, iskontoUygula, enSpesifikKural, kampanyaHedefUrunleri, kampanyaOnizlemesiHesapla, kampanyaSatisRaporu, parcaFiyatiHesapla, Rozet, Kart, Buton, Girdi, Secim, Bos, TehlikeSeridi, EanBarkod, RafSayfasi, KategoriSayfasi, MarkaSayfasi, AracSayfasi, RezervSayfasi, FiyatKurallariSayfasi, BelgelerSayfasi, OluStokSayfasi, StokDevirHiziSayfasi };

/* ------------------------------------------------------------------ */
/* RAF / DEPO ADRES SİSTEMİ                                            */
/* ------------------------------------------------------------------ */
// parcaRafListesi artık ./lib/raf içinden import ediliyor.

// Raf taşıma — stoğun kendisini DEĞİL, o stoğun hangi rafta olduğunu
// değiştirir. Eski raf → yeni raf → adet → kullanıcı → tarih/saat olarak
// kalıcı bir hareket bırakır; hiçbir raf adresi doğrudan üzerine yazılmaz.
export const rafTransferiUygula = (prev, { parcaId, eskiRaf, yeniRaf, adet, kullanici }) => {
  const parca = prev.parcalar.find((p) => p.id === parcaId);
  if (!parca || !yeniRaf?.trim() || adet <= 0) return null;
  // Mevcut konum listesini (tekil rafAdresi ise ondan türeterek) baz al.
  let konumlar = parca.rafKonumlari && parca.rafKonumlari.length > 0 ? [...parca.rafKonumlari] : parcaRafListesi(parca);
  const kaynakIndex = konumlar.findIndex((k) => k.kod === eskiRaf);
  if (kaynakIndex === -1 || konumlar[kaynakIndex].adet < adet - 0.0001) return null;

  konumlar[kaynakIndex] = { ...konumlar[kaynakIndex], adet: Math.round((konumlar[kaynakIndex].adet - adet) * 1000) / 1000 };
  konumlar = konumlar.filter((k) => k.adet > 0.0001);

  const hedefIndex = konumlar.findIndex((k) => k.kod === yeniRaf.trim());
  if (hedefIndex >= 0) {
    konumlar[hedefIndex] = { ...konumlar[hedefIndex], adet: Math.round((konumlar[hedefIndex].adet + adet) * 1000) / 1000 };
  } else {
    konumlar.push({ id: yeniId("rk"), kod: yeniRaf.trim(), adet });
  }

  const hareket = { id: yeniId("rh"), parcaId, tarih: zamanDamgasi(), eskiRaf, yeniRaf: yeniRaf.trim(), adet, kullanici: kullanici || "" };
  // Tek konum kaldıysa ve stoğun tamamını kapsıyorsa, tekrar sade "Ana Raf"
  // gösterimine geri dönülür — gereksiz yere çoklu-konum karmaşıklığı taşınmaz.
  const tekKonumaIndirgendi = konumlar.length === 1 && Math.abs(konumlar[0].adet - (parca.stok || 0)) < 0.001;
  return {
    ...prev,
    parcalar: prev.parcalar.map((p) =>
      p.id === parcaId
        ? tekKonumaIndirgendi
          ? { ...p, rafAdresi: konumlar[0].kod, rafKonumlari: [] }
          : { ...p, rafKonumlari: konumlar }
        : p
    ),
    rafHareketleri: [hareket, ...prev.rafHareketleri],
  };
};







// "Geçmiş" sekmesinin içeriği — Stok Özeti + (Zaman Çizelgesi | Alış | Satış
// | Stok Hareketleri | Fiyat) alt görünümleri arasında geçiş yapılabilir.
// Basit, bağımlılıksız bir SVG çizgi grafiği — alış/satış fiyat trendini
// gösterir (6. madde). Gerçek bir chart kütüphanesi yerine, sadece iki seriyi
// (tarih, fiyat) normalize edip polyline çizer.
export function FiyatTrendGrafigi({ seriler }) {
  const genislik = 560;
  const yukseklik = 160;
  const kenar = 28;
  const tumNoktalar = seriler.flatMap((s) => s.noktalar);
  if (tumNoktalar.length < 2) return null;
  const tarihler = tumNoktalar.map((n) => new Date(n.tarih).getTime());
  const fiyatlar = tumNoktalar.map((n) => n.fiyat);
  const minT = Math.min(...tarihler);
  const maxT = Math.max(...tarihler);
  const minF = Math.min(...fiyatlar) * 0.95;
  const maxF = Math.max(...fiyatlar) * 1.05;
  const xOlcek = (t) => kenar + ((t - minT) / (maxT - minT || 1)) * (genislik - kenar * 2);
  const yOlcek = (f) => yukseklik - kenar - ((f - minF) / (maxF - minF || 1)) * (yukseklik - kenar * 2);

  return (
    <svg width="100%" viewBox={`0 0 ${genislik} ${yukseklik}`} style={{ maxWidth: genislik }}>
      {seriler.map((s) => {
        if (s.noktalar.length < 2) return null;
        const puanlar = s.noktalar
          .slice()
          .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime())
          .map((n) => `${xOlcek(new Date(n.tarih).getTime())},${yOlcek(n.fiyat)}`)
          .join(" ");
        return (
          <g key={s.ad}>
            <polyline points={puanlar} fill="none" stroke={s.renk} strokeWidth="2" />
            {s.noktalar.map((n, i) => (
              <circle key={i} cx={xOlcek(new Date(n.tarih).getTime())} cy={yOlcek(n.fiyat)} r="2.5" fill={s.renk} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}



const NOT_TURLERI = ["Genel", "Satış", "Ödeme", "Ürün", "Sipariş", "Teslimat"];
const HASSAS_NOT_TURLERI = ["Ödeme"];

/* --------------------------------------------------------------- */
/* MODÜL UYUMLULUK BİLEŞENLERİ — refactor sonrası ortak exportlar */
/* --------------------------------------------------------------- */
export function NotYoneticisi({ db, updateDb, hedefId, notlar, koleksiyonAdi, aktifKullanici }) {
  const [tur, setTur] = useState("Genel");
  const [metin, setMetin] = useState("");
  const [hatirlatmaTarihi, setHatirlatmaTarihi] = useState("");
  const [kullanici, setKullanici] = useIslemYapan(aktifKullanici);

  // Eski/bozuk kayıtlarda notlar alanı undefined/null veya dizi dışı
  // değerler içerebilir. Render sırasında React ağacını kırmamak için
  // burada normalize ediyoruz.
  const guvenliNotlar = Array.isArray(notlar) ? notlar.filter(Boolean) : [];
  const gorunurNotlar = [...guvenliNotlar]
    .filter((n) => typeof n === "object" && (!HASSAS_NOT_TURLERI.includes(n.tur) || yetkiVarMi(db, aktifKullanici, "cariHesapGorebilir")))
    .sort((a, b) => new Date(b.tarih || 0).getTime() - new Date(a.tarih || 0).getTime());

  const notEkle = () => {
    if (!metin.trim()) {
      bildirimGoster("Not metni boş olamaz.", "hata");
      return;
    }
    const yeniNot = {
      id: yeniId("not"),
      hedefId,
      tur,
      metin: metin.trim(),
      tarih: zamanDamgasi(),
      kullanici: aktifKullanici?.adSoyad || kullanici.trim(),
      hatirlatmaTarihi: hatirlatmaTarihi || null,
      hatirlatmaTamamlandi: false,
    };
    updateDb((prev) => {
      const mevcutNotlar = Array.isArray(prev?.[koleksiyonAdi]) ? prev[koleksiyonAdi] : [];
      return { ...prev, [koleksiyonAdi]: [yeniNot, ...mevcutNotlar] };
    });
    sonKullaniciAdiKaydet(kullanici);
    setMetin("");
    setHatirlatmaTarihi("");
    bildirimGoster("Not eklendi.", "basari");
  };

  const hatirlatmaTamamlandiYap = (notId) => {
    updateDb((prev) => {
      const mevcutNotlar = Array.isArray(prev?.[koleksiyonAdi]) ? prev[koleksiyonAdi] : [];
      return {
        ...prev,
        [koleksiyonAdi]: mevcutNotlar.map((n) =>
          n?.id === notId ? { ...n, hatirlatmaTamamlandi: true } : n
        ),
      };
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 rounded-md flex flex-col gap-2" style={{ background: T.steel100 }}>
        <div className="flex gap-2">
          <select value={tur} onChange={(e) => setTur(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: T.steel300, color: T.ink900 }}>
            {NOT_TURLERI.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input value={kullanici} readOnly placeholder="Notu ekleyen" className="w-32 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
        </div>
        <textarea
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          rows={2}
          placeholder='ör. "MANN ürünlerini tercih ediyor." / "Ödemelerini ay sonunda yapıyor."'
          className="w-full px-3 py-2 rounded-md border text-sm outline-none resize-none"
          style={{ borderColor: T.steel300, color: T.ink900, background: "#fff" }}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs" style={{ color: T.ink500 }}>
            <input type="checkbox" checked={!!hatirlatmaTarihi} onChange={(e) => setHatirlatmaTarihi(e.target.checked ? isoGun(new Date()) : "")} />
            Hatırlatmaya çevir
          </label>
          {hatirlatmaTarihi && (
            <input type="date" value={hatirlatmaTarihi} onChange={(e) => setHatirlatmaTarihi(e.target.value)} className="px-2 py-1 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
          )}
          <Buton onClick={notEkle} className="ml-auto">
            <Plus size={13} /> Not Ekle
          </Buton>
        </div>
      </div>

      {gorunurNotlar.length === 0 ? (
        <p className="text-sm text-center py-3" style={{ color: T.ink500 }}>
          Henüz not yok.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
          {gorunurNotlar.map((n) => (
            <div key={n.id} className="p-2.5 rounded-md" style={{ background: "#fff", border: `1px solid ${T.steel200}` }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <Rozet tone={n.tur === "Ödeme" ? "red" : "steel"}>{n.tur}</Rozet>
                  {n.hatirlatmaTarihi && (
                    <Rozet tone={n.hatirlatmaTamamlandi ? "green" : "yellow"}>
                      {n.hatirlatmaTamamlandi ? "✅" : "⏰"} {tarihGoster(n.hatirlatmaTarihi)}
                    </Rozet>
                  )}
                </div>
                <span className="text-xs" style={{ color: T.ink500 }}>
                  {new Date(n.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm" style={{ color: T.ink900 }}>
                {n.metin}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs" style={{ color: T.ink500 }}>
                  — {n.kullanici || "—"}
                </span>
                {n.hatirlatmaTarihi && !n.hatirlatmaTamamlandi && (
                  <button onClick={() => hatirlatmaTamamlandiYap(n.id)} className="text-xs font-semibold underline" style={{ color: T.green }}>
                    Tamamlandı İşaretle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Müşteri/Tedarikçi Hesap Ekstresi — "Bu müşterinin/tedarikçinin hesabında
// ne olmuş?" sorusunun cevabını TEK ekranda verir. Hem müşteri hem tedarikçi
// için aynı bileşen çalışır (hedefTuru ile ayrışır).


export function EkstreModal({ db, hedefTuru, hedef, onKapat, belgeyeGit }) {
  const [tarihSecimi, setTarihSecimi] = useState("ay");
  const [ozelBaslangic, setOzelBaslangic] = useState("");
  const [ozelBitis, setOzelBitis] = useState("");

  const [baslangic, bitis] = EKSTRE_TARIH_ARALIGI_HESAPLA(tarihSecimi, ozelBaslangic, ozelBitis);
  const tumHareketler = [...hedef.hareketler].sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
  const aralikOncesi = tumHareketler.filter((h) => h.tarih.slice(0, 10) < baslangic);
  const aralikIcindeki = tumHareketler.filter((h) => h.tarih.slice(0, 10) >= baslangic && h.tarih.slice(0, 10) <= bitis);
  const acilisBakiyesi = aralikOncesi.length > 0 ? aralikOncesi[aralikOncesi.length - 1].bakiyeSonrasi : 0;
  const kapanisBakiyesi = aralikIcindeki.length > 0 ? aralikIcindeki[aralikIcindeki.length - 1].bakiyeSonrasi : acilisBakiyesi;
  const toplamBorc = aralikIcindeki.filter((h) => h.tur === "borç").reduce((t, h) => t + h.tutar, 0);
  const toplamAlacak = aralikIcindeki.filter((h) => h.tur === "ödeme").reduce((t, h) => t + h.tutar, 0);

  const acikFaturalar = hedefTuru === "tedarikci" ? tedarikciAcikFaturalari(db, hedef.ad) : [];
  const musteriFaturalari = hedefTuru === "musteri" ? musteriAcikFaturalariFifo(db, hedef).filter((f) => f.kalan > 0.01) : [];

  const magaza = db.magazaBilgileri || {};

  const yazdir = () => {
    const pencere = window.open("", "_blank");
    if (!pencere) return;
    const satirlarHtml = aralikIcindeki
      .map(
        (h) => `<tr>
          <td>${tarihGoster(h.tarih)}</td>
          <td>${h.aciklama || ""}</td>
          <td>${h.belgeNo || h.faturaNo || "—"}</td>
          <td style="text-align:right">${h.tur === "borç" ? tl(h.tutar) : "—"}</td>
          <td style="text-align:right">${h.tur === "ödeme" ? tl(h.tutar) : "—"}</td>
          <td style="text-align:right;font-weight:600">${tl(h.bakiyeSonrasi)}</td>
        </tr>`
      )
      .join("");
    pencere.document.write(`
      <html><head><title>Hesap Ekstresi — ${hedef.ad}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        .ozet { display: flex; gap: 24px; margin: 16px 0; font-size: 13px; }
        .ozet div { background: #f5f5f5; padding: 8px 14px; border-radius: 6px; }
      </style></head>
      <body>
        <h1>${magaza.ad || "Mağaza"}</h1>
        <div class="sub">${[magaza.adres, magaza.telefon, magaza.vergiDairesi && `${magaza.vergiDairesi} V.D.`, magaza.vergiNo && `VN: ${magaza.vergiNo}`].filter(Boolean).join(" · ")}</div>
        <h2 style="font-size:15px">Hesap Ekstresi — ${hedef.ad}</h2>
        <div class="sub">${tarihGoster(baslangic)} — ${tarihGoster(bitis)}</div>
        <div class="ozet">
          <div>Açılış Bakiyesi: <strong>${tl(acilisBakiyesi)}</strong></div>
          <div>Toplam Borç: <strong>${tl(toplamBorc)}</strong></div>
          <div>Toplam Alacak: <strong>${tl(toplamAlacak)}</strong></div>
          <div>Kapanış Bakiyesi: <strong>${tl(kapanisBakiyesi)}</strong></div>
        </div>
        <table>
          <thead><tr><th>Tarih</th><th>İşlem</th><th>Belge No</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th></tr></thead>
          <tbody>${satirlarHtml || '<tr><td colspan="6" style="text-align:center;color:#999">Bu tarih aralığında hareket yok</td></tr>'}</tbody>
        </table>
      </body></html>
    `);
    pencere.document.close();
    pencere.print();
  };

  const excelIndir = () => {
    csvIndir(
      `ekstre-${hedef.ad}-${baslangic}-${bitis}.csv`,
      ["Tarih", "İşlem", "Belge No", "Borç", "Alacak", "Bakiye"],
      [
        ["", "Açılış Bakiyesi", "", "", "", acilisBakiyesi],
        ...aralikIcindeki.map((h) => [tarihGoster(h.tarih), h.aciklama, h.belgeNo || h.faturaNo || "", h.tur === "borç" ? h.tutar : "", h.tur === "ödeme" ? h.tutar : "", h.bakiyeSonrasi]),
        ["", "Kapanış Bakiyesi", "", toplamBorc, toplamAlacak, kapanisBakiyesi],
      ]
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-6 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onKapat}>
      <div className="w-full max-w-2xl rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-base" style={{ color: T.ink900 }}>
            Hesap Ekstresi — {hedef.ad}
          </h3>
          <button onClick={onKapat} style={{ color: T.ink500 }}>
            <X size={18} />
          </button>
        </div>
        <p className="text-xs mb-3" style={{ color: T.ink500 }}>
          Bu {hedefTuru === "musteri" ? "müşterinin" : "tedarikçinin"} hesabında ne olmuş, tek yerde.
        </p>

        <div className="flex flex-wrap items-end gap-2 mb-3">
          {[
            { id: "bugun", ad: "Bugün" },
            { id: "hafta", ad: "Bu Hafta" },
            { id: "ay", ad: "Bu Ay" },
            { id: "uc_ay", ad: "Son 3 Ay" },
            { id: "yil", ad: "Bu Yıl" },
            { id: "ozel", ad: "Özel Aralık" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setTarihSecimi(s.id)}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold"
              style={{ background: tarihSecimi === s.id ? T.graphite900 : T.steel100, color: tarihSecimi === s.id ? "#fff" : T.ink900 }}
            >
              {s.ad}
            </button>
          ))}
          {tarihSecimi === "ozel" && (
            <>
              <input type="date" value={ozelBaslangic} onChange={(e) => setOzelBaslangic(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
              <input type="date" value={ozelBitis} onChange={(e) => setOzelBitis(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
            </>
          )}
          <div className="ml-auto flex gap-1.5">
            <button onClick={yazdir} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ background: T.steel100, color: T.ink900 }}>
              <Printer size={13} /> Yazdır / PDF
            </button>
            <button onClick={excelIndir} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ background: T.steel100, color: T.ink900 }}>
              <FileDown size={13} /> Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { etiket: "Açılış Bakiyesi", deger: tl(acilisBakiyesi) },
            { etiket: "Toplam Borç", deger: tl(toplamBorc), ton: "red" },
            { etiket: "Toplam Alacak/Ödeme", deger: tl(toplamAlacak), ton: "green" },
            { etiket: "Kapanış Bakiyesi", deger: tl(kapanisBakiyesi) },
          ].map((k) => (
            <div key={k.etiket} className="rounded-md p-2.5" style={{ background: T.steel100 }}>
              <div className="text-xs" style={{ color: T.ink500 }}>
                {k.etiket}
              </div>
              <div className="text-sm font-semibold mt-0.5" style={{ ...MONO, color: k.ton === "red" ? T.red : k.ton === "green" ? T.green : T.ink900 }}>
                {k.deger}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-md" style={{ border: `1px solid ${T.steel200}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: T.steel100, color: T.ink500 }}>
                <th className="text-left font-semibold px-2 py-1.5">Tarih</th>
                <th className="text-left font-semibold px-2 py-1.5">İşlem</th>
                <th className="text-left font-semibold px-2 py-1.5">Belge No</th>
                <th className="text-right font-semibold px-2 py-1.5">Borç</th>
                <th className="text-right font-semibold px-2 py-1.5">Alacak</th>
                <th className="text-right font-semibold px-2 py-1.5">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {aralikIcindeki.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-sm" style={{ color: T.ink500 }}>
                    Bu tarih aralığında hareket yok.
                  </td>
                </tr>
              ) : (
                aralikIcindeki.map((h) => {
                  const tiklanabilir = hedefTuru === "musteri" && h.kaynakSatisId && belgeyeGit;
                  return (
                    <tr
                      key={h.id}
                      style={{ borderTop: `1px solid ${T.steel200}`, cursor: tiklanabilir ? "pointer" : "default" }}
                      onClick={() => tiklanabilir && belgeyeGit(h.kaynakSatisId)}
                      className={tiklanabilir ? "hover:bg-gray-50" : ""}
                    >
                      <td className="px-2 py-1.5" style={{ color: T.ink500 }}>
                        {tarihGoster(h.tarih)}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: T.ink900 }}>
                        {h.aciklama}
                      </td>
                      <td className="px-2 py-1.5" style={{ ...MONO, color: tiklanabilir ? T.orangeDark : T.ink900, textDecoration: tiklanabilir ? "underline" : "none" }}>
                        {h.belgeNo || h.faturaNo || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right" style={{ ...MONO, color: T.red }}>
                        {h.tur === "borç" ? tl(h.tutar) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right" style={{ ...MONO, color: T.green }}>
                        {h.tur === "ödeme" ? tl(h.tutar) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold" style={MONO}>
                        {tl(h.bakiyeSonrasi ?? "")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Fatura bazlı bakiye + vade takibi */}
        {(acikFaturalar.length > 0 || musteriFaturalari.length > 0) && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
              Fatura Bazlı Bakiye
            </h4>
            <div className="flex flex-col gap-1.5">
              {hedefTuru === "tedarikci"
                ? acikFaturalar.map((m) => {
                    const vade = vadeDurumuHesapla(m.vadeTarihi);
                    return (
                      <div key={m.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: T.steel100 }}>
                        <div>
                          <div style={{ color: T.ink900 }}>{m.faturaNo}</div>
                          <div className="text-xs" style={{ color: T.ink500 }}>
                            Fatura: {tl(m.faturaGirilenToplam ?? m.hesaplananGenelToplam)} · Ödenen: {tl(m.odenenTutar || 0)} · Kalan: <strong>{tl(m.kalanBorc)}</strong>
                          </div>
                        </div>
                        {vade && (
                          <Rozet tone={vade.emoji === "🔴" ? "red" : vade.emoji === "🟡" ? "yellow" : "green"}>
                            {vade.emoji} {tarihGoster(m.vadeTarihi)}
                          </Rozet>
                        )}
                      </div>
                    );
                  })
                : musteriFaturalari.map((f) => (
                    <div key={f.satis.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: T.steel100 }}>
                      <div>
                        <div style={{ color: T.ink900 }}>{f.satis.belgeNo || f.satis.id.slice(-6).toUpperCase()}</div>
                        <div className="text-xs" style={{ color: T.ink500 }}>
                          Fatura: {tl(f.tutar)} · Ödenen: {tl(f.odenen)} (yaklaşık) · Kalan: <strong>{tl(f.kalan)}</strong>
                        </div>
                      </div>
                      {belgeyeGit && (
                        <button onClick={() => belgeyeGit(f.satis.id)} className="text-xs font-semibold underline shrink-0" style={{ color: T.orangeDark }}>
                          Belgeye Git
                        </button>
                      )}
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// REZERV_DURUMLARI / rezervDurumGorseli artık ./lib/rezerv içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* MÜŞTERİ SİPARİŞİ / BEKLEYEN SİPARİŞ SİSTEMİ                         */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* İSKONTO / MÜŞTERİ ÖZEL FİYAT SİSTEMİ                                 */
/* ------------------------------------------------------------------ */
// iskontoUygula / enSpesifikKural / kampanyaHedefUrunleri / kampanyaOnizlemesiHesapla /
// kampanyaSatisRaporu / parcaFiyatiHesapla artık ./lib/fiyatlandirma içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* SATIŞ BELGESİ / FİŞ / FATURA YÖNETİMİ                               */
/* ------------------------------------------------------------------ */
// Belge türü → numara öneki. İleride gerçek bir e-fatura/e-belge
// entegrasyonu eklenirse, bu önek/numara şeması resmi seri numaralarıyla
// birebir eşleşecek şekilde tasarlandı (ör. "FT-2026-000001").
// BELGE_TUR_ONEKLERI / BELGE_TURLERI artık ./lib/constants içinden import ediliyor.

// yeniBelgeNumarasiUret / belgeSayaciGuncelle / satisBelgeNoGoster artık ./lib/belge içinden import ediliyor.

// satisAramaYap artık ./lib/arama içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* STOK / PARÇA — Ürün Kartı modülü                                    */
/* ------------------------------------------------------------------ */
// Set ürün bileşenlerini yönetir — Set'in KENDİ stoğu yoktur; toplam parça
// maliyeti burada anlık olarak bileşenlerden hesaplanıp "Set Kârı" olarak
// satış fiyatıyla karşılaştırılır.


export function SetBilesenYoneticisi({ db, form, setForm }) {
  const [arama, setArama] = useState("");
  const sonuclar = arama.trim() ? hizliAramaYap(db, arama).filter((p) => p.urunTipi !== "Set").slice(0, 6) : [];

  const bilesenEkle = (p) => {
    if (form.setBilesenleri.some((b) => b.parcaId === p.id)) return;
    setForm({ ...form, setBilesenleri: [...form.setBilesenleri, { id: yeniId("sb"), parcaId: p.id, adet: 1 }] });
    setArama("");
  };
  const bilesenAdetGuncelle = (id, adet) => setForm({ ...form, setBilesenleri: form.setBilesenleri.map((b) => (b.id === id ? { ...b, adet } : b)) });
  const bilesenSil = (id) => setForm({ ...form, setBilesenleri: form.setBilesenleri.filter((b) => b.id !== id) });

  const toplamMaliyet = form.setBilesenleri.reduce((t, b) => {
    const parca = db.parcalar.find((p) => p.id === b.parcaId);
    return t + (parca ? gecerliMaliyet(parca) * b.adet : 0);
  }, 0);
  const satisFiyati = parseFloat(form.satisFiyati) || 0;
  const setKari = satisFiyati - toplamMaliyet;

  return (
    <div className="col-span-2 flex flex-col gap-2 p-3 rounded-md" style={{ background: T.steel100 }}>
      <span className="text-xs font-semibold uppercase" style={{ color: T.ink500 }}>
        Set Bileşenleri
      </span>
      {form.setBilesenleri.length === 0 ? (
        <p className="text-sm" style={{ color: T.ink500 }}>
          Henüz bileşen eklenmedi.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {form.setBilesenleri.map((b) => {
            const parca = db.parcalar.find((p) => p.id === b.parcaId);
            return (
              <div key={b.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate" style={{ color: T.ink900 }}>
                  {parca?.ad || "(silinmiş ürün)"}
                </span>
                <input
                  type="number"
                  value={b.adet}
                  onChange={(e) => bilesenAdetGuncelle(b.id, parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 rounded border text-sm text-right outline-none"
                  style={{ borderColor: T.steel300, ...MONO }}
                />
                <button onClick={() => bilesenSil(b.id)} style={{ color: T.red }}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="relative">
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Bileşen eklemek için ürün ara…"
          className="w-full px-3 py-2 rounded-md border text-sm outline-none"
          style={{ borderColor: T.steel300 }}
        />
        {sonuclar.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-40 overflow-y-auto" style={{ borderColor: T.steel300 }}>
            {sonuclar.map((p) => (
              <button key={p.id} onMouseDown={() => bilesenEkle(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: T.ink900 }}>
                {p.ad}
              </button>
            ))}
          </div>
        )}
      </div>
      {form.setBilesenleri.length > 0 && (
        <div className="flex justify-between text-xs pt-1.5" style={{ borderTop: `1px solid ${T.steel300}` }}>
          <span style={{ color: T.ink500 }}>
            Toplam Parça Maliyeti: <strong style={{ color: T.ink900 }}>{tl(toplamMaliyet)}</strong>
          </span>
          <span style={{ color: T.ink500 }}>
            Set Kârı: <strong style={{ color: setKari >= 0 ? T.green : T.red }}>{tl(setKari)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

// Paket/koli birimlerini ("1 kutu = 10 adet", "1 koli = 200 adet" gibi
// temel birime çoklu dönüşüm) ve satış şeklini yönetir.


export function PaketBirimYoneticisi({ form, setForm }) {
  const [yeniAd, setYeniAd] = useState("");
  const [yeniIcerik, setYeniIcerik] = useState("");

  const paketEkle = () => {
    if (!yeniAd.trim() || !parseFloat(yeniIcerik)) return;
    setForm({ ...form, paketBirimleri: [...form.paketBirimleri, { id: yeniId("pk"), ad: yeniAd.trim(), iceriyorAdet: parseFloat(yeniIcerik) }] });
    setYeniAd("");
    setYeniIcerik("");
  };
  const paketSil = (id) => setForm({ ...form, paketBirimleri: form.paketBirimleri.filter((p) => p.id !== id) });

  return (
    <div className="col-span-2 flex flex-col gap-2 p-3 rounded-md" style={{ background: T.steel100 }}>
      <span className="text-xs font-semibold uppercase" style={{ color: T.ink500 }}>
        Paket / Koli Birimleri (opsiyonel)
      </span>
      {form.paketBirimleri.length > 0 && (
        <div className="flex flex-col gap-1">
          {form.paketBirimleri.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span style={{ color: T.ink900 }}>
                1 {p.ad} = {p.iceriyorAdet} {form.birim}
              </span>
              <button onClick={() => paketSil(p.id)} style={{ color: T.red }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} placeholder="ör. Kutu" className="flex-1 px-2 py-1.5 rounded border text-sm outline-none" style={{ borderColor: T.steel300 }} />
        <input
          type="number"
          value={yeniIcerik}
          onChange={(e) => setYeniIcerik(e.target.value)}
          placeholder={`Kaç ${form.birim}`}
          className="w-28 px-2 py-1.5 rounded border text-sm outline-none"
          style={{ borderColor: T.steel300 }}
        />
        <button onClick={paketEkle} className="px-2.5 py-1.5 rounded-md text-xs font-semibold" style={{ background: T.orange, color: "#fff" }}>
          Ekle
        </button>
      </div>
      {form.paketBirimleri.length > 0 && (
        <Secim label="Satış Şekli" value={form.satisBirimSekli} onChange={(e) => setForm({ ...form, satisBirimSekli: e.target.value })}>
          <option value="sadeceTemel">Sadece {form.birim} sat</option>
          <option value="sadecePaket">Sadece paket birimiyle sat</option>
          <option value="ikisiDe">{form.birim} + paket, ikisiyle de sat</option>
        </Secim>
      )}
    </div>
  );
}





export function UrunGecmisiIcerik({ db, parca, altGorunum, setAltGorunum }) {
  const satisGecmisi = parcaSatisGecmisi(db, parca.id);
  const zamanCizelgesi = parcaZamanCizelgesi(db, parca.id);
  const rafKodu = parcaRafListesi(parca)[0]?.kod || "—";

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Stok Özeti */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { etiket: "Mevcut Stok", deger: `${parca.stok} ${parca.birim}` },
          { etiket: "Rezerve Stok", deger: `0 ${parca.birim}` },
          { etiket: "Satılabilir Stok", deger: `${parca.stok} ${parca.birim}` },
          { etiket: "Minimum Stok", deger: `${parca.kritikSeviye} ${parca.birim}` },
          { etiket: "Siparişteki Miktar", deger: `${parca.siparisteAdet || 0} ${parca.birim}` },
          { etiket: "Raf Adresi", deger: rafKodu },
        ].map((k) => (
          <div key={k.etiket} className="rounded-md p-2.5" style={{ background: T.steel100 }}>
            <div className="text-xs" style={{ color: T.ink500 }}>
              {k.etiket}
            </div>
            <div className="text-sm font-semibold mt-0.5" style={MONO}>
              {k.deger}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs -mt-2" style={{ color: T.ink500 }}>
        Not: Henüz ayrı bir stok rezervasyon sistemi kurulmadığından "Rezerve Stok" şu an her zaman 0 gösterilir; Satılabilir Stok = Mevcut Stok.
      </p>

      {/* Alt görünüm seçimi */}
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: T.steel300 }}>
        {[
          { id: "zaman", ad: "Zaman Çizelgesi" },
          { id: "alis", ad: "Alış Geçmişi" },
          { id: "satis", ad: "Satış / Kârlılık Geçmişi" },
          { id: "stok", ad: "Stok Hareketleri" },
          { id: "fiyat", ad: "Fiyat Geçmişi" },
          { id: "fiyatAnaliz", ad: "Fiyat Analizi" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltGorunum(s.id)}
            className="px-3 py-2 text-xs font-semibold whitespace-nowrap"
            style={{ background: altGorunum === s.id ? T.graphite900 : "#fff", color: altGorunum === s.id ? "#fff" : T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {/* 7. Tek ekranda zaman çizelgesi */}
      {altGorunum === "zaman" && (
        <div className="flex flex-col gap-1.5">
          {zamanCizelgesi.length === 0 ? (
            <p className="text-sm" style={{ color: T.ink500 }}>
              Bu ürün için henüz kayıtlı bir hareket yok.
            </p>
          ) : (
            zamanCizelgesi.map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-sm px-2.5 py-2 rounded-md" style={{ background: T.steel100 }}>
                <span className="shrink-0" style={{ ...MONO, color: T.ink500 }}>
                  {new Date(o.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ color: o.renk === "green" ? T.green : o.renk === "red" ? T.red : T.ink900 }}>→ {o.aciklama}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. Alış Geçmişi */}
      {altGorunum === "alis" && (
        <div className="overflow-x-auto">
          {(parca.alisGecmisi || []).length === 0 ? (
            <p className="text-sm" style={{ color: T.ink500 }}>
              Henüz alış kaydı yok.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: T.steel100, color: T.ink500 }}>
                  <th className="text-left font-semibold px-2 py-1.5">Tarih</th>
                  <th className="text-left font-semibold px-2 py-1.5">Tedarikçi</th>
                  <th className="text-right font-semibold px-2 py-1.5">Adet</th>
                  <th className="text-right font-semibold px-2 py-1.5">Birim Maliyet</th>
                </tr>
              </thead>
              <tbody>
                {parca.alisGecmisi.map((g) => (
                  <tr key={g.id} style={{ borderTop: `1px solid ${T.steel200}` }}>
                    <td className="px-2 py-1.5" style={{ color: T.ink500 }}>
                      {tarihGoster(g.tarih)}
                    </td>
                    <td className="px-2 py-1.5" style={{ color: T.ink900 }}>
                      {g.tedarikci || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right" style={MONO}>
                      {g.adet}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold" style={MONO}>
                      {tl(g.birimFiyat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs mt-2" style={{ color: T.ink500 }}>
            Böylece ürünü geçmişte kaça aldığınızı görebilirsiniz.
          </p>
        </div>
      )}

      {/* 3 + 6. Satış / Kârlılık Geçmişi — o günkü GERÇEK maliyet üzerinden */}
      {altGorunum === "satis" && (
        <div className="overflow-x-auto">
          {satisGecmisi.length === 0 ? (
            <p className="text-sm" style={{ color: T.ink500 }}>
              Henüz satış kaydı yok.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: T.steel100, color: T.ink500 }}>
                  <th className="text-left font-semibold px-2 py-1.5">Tarih</th>
                  <th className="text-left font-semibold px-2 py-1.5">Belge No</th>
                  <th className="text-left font-semibold px-2 py-1.5">Müşteri</th>
                  <th className="text-right font-semibold px-2 py-1.5">Adet</th>
                  <th className="text-right font-semibold px-2 py-1.5">Satış Fiyatı</th>
                  <th className="text-right font-semibold px-2 py-1.5">İskonto</th>
                  <th className="text-right font-semibold px-2 py-1.5">Maliyet</th>
                  <th className="text-right font-semibold px-2 py-1.5">Kâr</th>
                  <th className="text-left font-semibold px-2 py-1.5">Personel</th>
                </tr>
              </thead>
              <tbody>
                {satisGecmisi.map((k, i) => {
                  const kb = satisKalemiKarBilgisi(k);
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${T.steel200}` }}>
                      <td className="px-2 py-1.5" style={{ color: T.ink500 }}>
                        {tarihGoster(k.tarih)}
                      </td>
                      <td className="px-2 py-1.5" style={MONO}>
                        {k.belgeNo}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: T.ink900 }}>
                        {k.musteri}
                      </td>
                      <td className="px-2 py-1.5 text-right" style={MONO}>
                        {k.adet}
                      </td>
                      <td className="px-2 py-1.5 text-right" style={MONO}>
                        {tl(k.birimFiyat)}
                      </td>
                      <td className="px-2 py-1.5 text-right" style={MONO}>
                        {tl(k.iskontoTutari || 0)}
                      </td>
                      <td className="px-2 py-1.5 text-right" style={MONO}>
                        {tl(k.maliyet)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold" style={{ ...MONO, color: kb.karToplam >= 0 ? T.green : T.red }}>
                        {tl(kb.karToplam)} {kb.karYuzde !== null && `(%${kb.karYuzde.toFixed(1)})`}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: T.ink500 }}>
                        {k.satisiYapan || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="text-xs mt-2" style={{ color: T.ink500 }}>
            Kâr, o satışın yapıldığı andaki gerçek maliyet üzerinden hesaplanır — ürünün maliyeti daha sonra değişse
            bile eski satışların kâr rakamı bozulmaz.
          </p>
        </div>
      )}

      {/* 4. Stok Hareketleri */}
      {altGorunum === "stok" && (
        <div className="flex flex-col gap-1.5">
          {(db.stokHareketleri.filter((h) => h.parcaId === parca.id).length === 0) ? (
            <p className="text-sm" style={{ color: T.ink500 }}>
              Henüz stok hareketi yok.
            </p>
          ) : (
            db.stokHareketleri
              .filter((h) => h.parcaId === parca.id)
              .map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: T.steel100 }}>
                  <div>
                    <span className="font-semibold" style={{ ...MONO, color: h.giris > 0 ? T.green : T.red }}>
                      {h.giris > 0 ? `+${h.giris}` : `-${h.cikis}`}
                    </span>{" "}
                    <span style={{ color: T.ink900 }}>{h.tur}</span>
                  </div>
                  <span className="text-xs" style={{ color: T.ink500 }}>
                    {tarihGoster(h.tarih)} {h.kullanici && `· ${h.kullanici}`}
                  </span>
                </div>
              ))
          )}
        </div>
      )}

      {/* 5. Fiyat Geçmişi */}
      {altGorunum === "fiyat" && (
        <div className="flex flex-col gap-1.5">
          {(parca.fiyatGecmisi || []).length === 0 ? (
            <p className="text-sm" style={{ color: T.ink500 }}>
              Henüz fiyat değişikliği yok.
            </p>
          ) : (
            parca.fiyatGecmisi.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: T.steel100 }}>
                <span style={{ color: T.ink900 }}>
                  {tarihGoster(f.tarih)} → {tl(f.eskiFiyat)} → <strong>{tl(f.yeniFiyat)}</strong>{" "}
                  <span style={{ color: fiyatDegisimYuzdesi(f.eskiFiyat, f.yeniFiyat) >= 0 ? T.red : T.green, fontSize: 11 }}>
                    ({fiyatDegisimYuzdesi(f.eskiFiyat, f.yeniFiyat) >= 0 ? "+" : ""}
                    {fiyatDegisimYuzdesi(f.eskiFiyat, f.yeniFiyat)}%)
                  </span>
                </span>
                <span className="text-xs text-right" style={{ color: T.ink500 }}>
                  {f.kullanici || "—"}
                  {f.degisiklikNedeni && ` · ${f.degisiklikNedeni}`}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Fiyat Analizi — 55. adım: birleşik tarihçe + alış/satış istatistikleri
          + değişim yüzdesi + trend grafiği + fiyat karşılaştırma. */}
      {altGorunum === "fiyatAnaliz" &&
        (() => {
          const alisIstatistik = urunAlisIstatistikleri(db, parca.id);
          const satisIstatistik = urunSatisIstatistikleri(db, parca.id);
          const maliyet = gecerliMaliyet(parca, db);
          const karMarji = parca.satisFiyati > 0 ? ((parca.satisFiyati - maliyet) / parca.satisFiyati) * 100 : null;

          // 1. madde: Tarih | Alış | Satış | Değiştiren birleşik tarihçe.
          const birlesikTarihce = [
            ...(parca.alisGecmisi || []).map((g) => ({ tarih: g.tarih, alis: g.birimFiyat, satis: null, degistiren: g.tedarikci || "—" })),
            ...(parca.fiyatGecmisi || []).map((f) => ({ tarih: f.tarih, alis: null, satis: f.yeniFiyat, degistiren: f.kullanici || "—" })),
          ].sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

          const grafikSerileri = [
            { ad: "Alış", renk: T.red, noktalar: (parca.alisGecmisi || []).map((g) => ({ tarih: g.tarih, fiyat: g.birimFiyat })) },
            { ad: "Satış", renk: T.green, noktalar: (parca.fiyatGecmisi || []).map((f) => ({ tarih: f.tarih, fiyat: f.yeniFiyat })) },
          ];

          return (
            <div className="flex flex-col gap-4">
              {/* 10. Fiyat karşılaştırma */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { etiket: "Mevcut Satış Fiyatı", deger: tl(parca.satisFiyati) },
                  { etiket: "Maliyet", deger: tl(maliyet) },
                  { etiket: "Kâr Marjı", deger: karMarji !== null ? `%${karMarji.toFixed(1)}` : "—", ton: karMarji !== null && karMarji < DUSUK_KAR_ESIGI_YUZDE ? "red" : "green" },
                  { etiket: "Piyasa Fiyatı", deger: "— (entegrasyon yok)" },
                ].map((k) => (
                  <div key={k.etiket} className="rounded-md p-2.5" style={{ background: T.steel100 }}>
                    <div className="text-xs" style={{ color: T.ink500 }}>
                      {k.etiket}
                    </div>
                    <div className="text-sm font-semibold mt-0.5" style={{ ...MONO, color: k.ton === "red" ? T.red : k.ton === "green" ? T.green : T.ink900 }}>
                      {k.deger}
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Alış fiyat analizi */}
              {alisIstatistik && (
                <div>
                  <h5 className="text-xs font-semibold uppercase mb-1.5" style={{ color: T.ink500 }}>
                    Alış Fiyat Analizi
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1.5">
                    {[
                      { etiket: "Son Alış", deger: alisIstatistik.sonAlis.birimFiyat },
                      { etiket: "En Düşük", deger: alisIstatistik.enDusuk.birimFiyat, ton: "green" },
                      { etiket: "En Yüksek", deger: alisIstatistik.enYuksek.birimFiyat, ton: "red" },
                      { etiket: "Ortalama", deger: alisIstatistik.ortalama },
                      { etiket: "Son 3 Ort.", deger: alisIstatistik.son3Ortalama },
                      { etiket: "Son 5 Ort.", deger: alisIstatistik.son5Ortalama },
                      { etiket: "Son 10 Ort.", deger: alisIstatistik.son10Ortalama },
                    ].map((k) => (
                      <div key={k.etiket} className="rounded-md p-2 text-center" style={{ background: T.steel100 }}>
                        <div className="text-xs" style={{ color: T.ink500 }}>
                          {k.etiket}
                        </div>
                        <div className="text-sm font-semibold" style={{ ...MONO, color: k.ton === "green" ? T.green : k.ton === "red" ? T.red : T.ink900 }}>
                          {tl(k.deger)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {alisIstatistik.tedarikciBazinda.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: T.ink500 }}>
                        Tedarikçiye Göre Alış:
                      </span>
                      {alisIstatistik.tedarikciBazinda.map((t) => (
                        <div key={t.tedarikci} className="flex items-center justify-between text-xs px-2 py-1 rounded" style={{ background: T.steel100 }}>
                          <span style={{ color: T.ink900 }}>{t.tedarikci}</span>
                          <span style={MONO}>
                            Son: {tl(t.sonFiyat)} · Ort: {tl(t.ortalama)} ({t.adet} alış)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {alisIstatistik.tumGecmis.length >= 2 && (
                    <p className="text-xs mt-1.5" style={{ color: T.ink500 }}>
                      Değişim ({tarihGoster(alisIstatistik.tumGecmis[alisIstatistik.tumGecmis.length - 1].tarih)} → {tarihGoster(alisIstatistik.sonAlis.tarih)}):{" "}
                      <strong style={{ color: fiyatDegisimYuzdesi(alisIstatistik.tumGecmis[alisIstatistik.tumGecmis.length - 1].birimFiyat, alisIstatistik.sonAlis.birimFiyat) >= 0 ? T.red : T.green }}>
                        {fiyatDegisimYuzdesi(alisIstatistik.tumGecmis[alisIstatistik.tumGecmis.length - 1].birimFiyat, alisIstatistik.sonAlis.birimFiyat) >= 0 ? "+" : ""}
                        %{fiyatDegisimYuzdesi(alisIstatistik.tumGecmis[alisIstatistik.tumGecmis.length - 1].birimFiyat, alisIstatistik.sonAlis.birimFiyat)}
                      </strong>
                    </p>
                  )}
                </div>
              )}

              {/* 3. Satış fiyat analizi */}
              {satisIstatistik && (
                <div>
                  <h5 className="text-xs font-semibold uppercase mb-1.5" style={{ color: T.ink500 }}>
                    Satış Fiyat Analizi
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { etiket: "Son Satış", deger: satisIstatistik.sonSatis.birimFiyat },
                      { etiket: "En Düşük", deger: satisIstatistik.enDusuk.birimFiyat, ton: "red" },
                      { etiket: "En Yüksek", deger: satisIstatistik.enYuksek.birimFiyat, ton: "green" },
                      { etiket: "Ortalama", deger: satisIstatistik.ortalama },
                      { etiket: "Son 3 Ort.", deger: satisIstatistik.son3Ortalama },
                      { etiket: "Son 5 Ort.", deger: satisIstatistik.son5Ortalama },
                      { etiket: "Son 10 Ort.", deger: satisIstatistik.son10Ortalama },
                    ].map((k) => (
                      <div key={k.etiket} className="rounded-md p-2 text-center" style={{ background: T.steel100 }}>
                        <div className="text-xs" style={{ color: T.ink500 }}>
                          {k.etiket}
                        </div>
                        <div className="text-sm font-semibold" style={{ ...MONO, color: k.ton === "green" ? T.green : k.ton === "red" ? T.red : T.ink900 }}>
                          {tl(k.deger)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Fiyat grafiği */}
              {(grafikSerileri[0].noktalar.length >= 2 || grafikSerileri[1].noktalar.length >= 2) && (
                <div>
                  <h5 className="text-xs font-semibold uppercase mb-1.5" style={{ color: T.ink500 }}>
                    Fiyat Trendi — 🔴 Alış · 🟢 Satış
                  </h5>
                  <div className="rounded-md p-2" style={{ background: T.steel100 }}>
                    <FiyatTrendGrafigi seriler={grafikSerileri} />
                  </div>
                </div>
              )}

              {/* 1. Birleşik fiyat tarihçesi */}
              <div>
                <h5 className="text-xs font-semibold uppercase mb-1.5" style={{ color: T.ink500 }}>
                  Fiyat Geçmişi (Alış / Satış Birlikte)
                </h5>
                {birlesikTarihce.length === 0 ? (
                  <p className="text-sm" style={{ color: T.ink500 }}>
                    Henüz fiyat kaydı yok.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: T.steel100, color: T.ink500 }}>
                          <th className="text-left font-semibold px-2 py-1.5">Tarih</th>
                          <th className="text-right font-semibold px-2 py-1.5">Alış</th>
                          <th className="text-right font-semibold px-2 py-1.5">Satış</th>
                          <th className="text-left font-semibold px-2 py-1.5">Değiştiren</th>
                        </tr>
                      </thead>
                      <tbody>
                        {birlesikTarihce.map((r, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${T.steel200}` }}>
                            <td className="px-2 py-1.5" style={{ color: T.ink500 }}>
                              {tarihGoster(r.tarih)}
                            </td>
                            <td className="px-2 py-1.5 text-right" style={{ ...MONO, color: r.alis !== null ? T.ink900 : T.steel300 }}>
                              {r.alis !== null ? tl(r.alis) : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right" style={{ ...MONO, color: r.satis !== null ? T.ink900 : T.steel300 }}>
                              {r.satis !== null ? tl(r.satis) : "—"}
                            </td>
                            <td className="px-2 py-1.5" style={{ color: T.ink500 }}>
                              {r.degistiren}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VADE VE ALACAK/BORÇ TAKİP SİSTEMİ                                   */
/* ------------------------------------------------------------------ */
export const VADE_GRUP_SIRASI = ["Vadesi Geçmiş", "Bugün", "1–7 gün", "8–30 gün", "31–60 gün", "60+ gün"];

/* ------------------------------------------------------------------ */
/* MÜŞTERİ / CARİ HESAP SİSTEMİ                                        */
/* ------------------------------------------------------------------ */
export const bosMusteriForm = {
  ad: "",
  musteriTipi: "Bireysel",
  telefon: "",
  vergiTcNo: "",
  adres: "",
  borcLimiti: "",
  vadeGunu: "",
  iskontoOrani: "",
  fiyatGrubuId: "",
  notlar: "",
  aktif: true,
};

/* ------------------------------------------------------------------ */
/* TAHSİLAT VE ÖDEME SİSTEMİ                                           */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* KASA YÖNETİMİ                                                       */
/* ------------------------------------------------------------------ */
export const HESAP_TIPLERI = ["Nakit Kasa", "Kredi Kartı / POS", "Banka Hesabı", "Havale / EFT", "Diğer"];

export const KASA_ODEME_YONTEMLERI = ["Nakit", "Kredi Kartı", "Havale / EFT", "FAST", "Çek", "Diğer"];

export const GIDER_KATEGORILERI = ["Kargo", "Yemek", "Kırtasiye", "Akaryakıt", "Temizlik", "Diğer"];

export const bosHesapForm = { ad: "", tip: "Nakit Kasa", aciklama: "", iban: "" };

export const bosGiderForm = { kategori: "Kargo", tutar: "", aciklama: "", hesapId: "", belgeNo: "" };

/* ------------------------------------------------------------------ */
/* SATIŞ İADESİ / ALIŞ İADESİ SİSTEMİ                                  */
/* ------------------------------------------------------------------ */
export const IADE_NEDENLERI = ["Yanlış Ürün", "Beğenmedi / Vazgeçti", "Arızalı / Bozuk Geldi", "Uyumsuz Parça", "Fazla Alım", "Diğer"];

export const IADE_KAPATMA_YONTEMLERI = ["Nakit", "Kredi Kartı", "Havale", "Cari Hesaba Alacak", "Değişim"];

/* ------------------------------------------------------------------ */
/* RAF ETİKETİ / FİYAT ETİKETİ ŞABLONLARI                              */
/* ------------------------------------------------------------------ */
// "Etiket Boyutu" ayarını (Ayarlar → Barkod) gerçek fiziksel CSS ölçüsüne
// ve yazı tipi kademesine çevirir — Küçük/Standart/Büyük/Kampanya şablonları.
export const ETIKET_SABLONLARI = {
  "40x30mm": { genislikMm: 40, yukseklikMm: 30, adFont: 11, fiyatFont: 15, etiket: "Küçük Raf Etiketi" },
  "50x30mm": { genislikMm: 50, yukseklikMm: 30, adFont: 12, fiyatFont: 16, etiket: "Standart Etiket" },
  "58x40mm": { genislikMm: 58, yukseklikMm: 40, adFont: 13, fiyatFont: 19, etiket: "Büyük Ürün Etiketi" },
  "100x50mm": { genislikMm: 100, yukseklikMm: 50, adFont: 15, fiyatFont: 24, etiket: "Kampanya Etiketi" },
};

/* ------------------------------------------------------------------ */
/* GİDER YÖNETİMİ                                                      */
/* ------------------------------------------------------------------ */
export const GIDER_ODEME_DURUMLARI = ["Bekliyor", "Kısmi Ödendi", "Ödendi", "İptal"];

export const giderDurumGorseli = {
  Bekliyor: { emoji: "🟡", ton: "yellow" },
  "Kısmi Ödendi": { emoji: "🟠", ton: "yellow" },
  Ödendi: { emoji: "🟢", ton: "green" },
  İptal: { emoji: "⚫", ton: "steel" },
};

export const bosGiderKayitForm = {
  tarih: isoGun(new Date()),
  kategori: "",
  aciklama: "",
  tutar: "",
  kdvOrani: 20,
  odemeDurumu: "Bekliyor",
  odenenTutar: "",
  odemeYontemi: "Nakit",
  hesapId: "",
  tedarikciFirma: "",
  belgeNo: "",
  belgeDosyasi: "",
  vadeTarihi: "",
};

/* ------------------------------------------------------------------ */
/* BANKA / POS YÖNETİMİ                                                */
/* ------------------------------------------------------------------ */
export const bosPosForm = { ad: "", banka: "", cihaz: "", komisyonYuzde: "2.5", komisyonSabit: "0", odemeVadesiGun: "1", hesapId: "" };

/* ------------------------------------------------------------------ */
/* DEPOLAR / STOK TRANSFERİ                                            */
/* ------------------------------------------------------------------ */
export const TRANSFER_DURUMLARI = ["Taslak", "Gönderildi", "Yolda", "Teslim Alındı", "İptal"];

export const transferDurumGorseli = {
  Taslak: { emoji: "🟡", ton: "yellow" },
  Gönderildi: { emoji: "🔵", ton: "steel" },
  Yolda: { emoji: "🟠", ton: "yellow" },
  "Teslim Alındı": { emoji: "🟢", ton: "green" },
  İptal: { emoji: "🔴", ton: "red" },
};

export const bosDepoForm = { ad: "", kod: "", adres: "", sorumluKisi: "" };

export const bosTransferForm = { kaynakDepoId: "", hedefDepoId: "", adet: "1", kaynakRaf: "", hedefRaf: "", tarih: isoGun(new Date()), aciklama: "" };

/* ------------------------------------------------------------------ */
/* MÜŞTERİ SİPARİŞİ SAYFASI                                             */
/* ------------------------------------------------------------------ */
export const bosMusteriSiparisForm = {
  musteriAdi: "",
  musteriTelefon: "",
  parcaId: "",
  adet: "1",
  siparisFiyati: "",
  siparisTarihi: isoGun(new Date()),
  tahminiGelisTarihi: "",
  tedarikci: "",
  not: "",
};

/* ------------------------------------------------------------------ */
/* BİLDİRİM VE UYARI MERKEZİ                                           */
/* ------------------------------------------------------------------ */
export const BILDIRIM_ONCELIK_GORSEL = {
  kritik: { emoji: "🔴", ton: "red", etiket: "Kritik" },
  onemli: { emoji: "🟠", ton: "yellow", etiket: "Önemli" },
  uyari: { emoji: "🟡", ton: "yellow", etiket: "Uyarı" },
  bilgi: { emoji: "🔵", ton: "steel", etiket: "Bilgi" },
};

// Bildirim ayarları için varsayılan kategori listesi — her kategori kullanıcı
// bazında açılıp kapatılabilir (Bildirim Ayarları ekranı).
export const BILDIRIM_KATEGORILERI = [
  "Kritik Stok", "Stokta Olmayan", "Negatif Stok", "Maliyet Altı Satış", "Minimum Kâr Altı Satış",
  "Kasa Farkı", "POS/Banka Farkı", "Vadesi Geçmiş Müşteri Borcu", "Vadesi Geçmiş Tedarikçi Borcu",
  "Yaklaşan Tedarikçi Ödemesi", "Yaklaşan Müşteri Tahsilatı", "Bekleyen Satın Alma Siparişi",
  "Geciken Tedarikçi Siparişi", "Bekleyen Müşteri Siparişi", "Süresi Yaklaşan Rezerv",
  "Teslim Bekleyen Transfer", "Genel Bilgilendirmeler",
];

// TÜM programdaki uyarı sinyallerini tek bir merkezi listede toplar — her
// bildirim zaten var olan bir hesaplamayı yeniden kullanır, yeni bir iş
// kuralı İCAT ETMEZ. Her bildirim: { id, oncelik, kategori, mesaj, sayi,
// hedefSekme, yetki (görebilmek için gereken yetki, boşsa herkese açık) }.
export const bildirimleriTopla = (db) => {
  const bugunIso = isoGun(new Date());
  const liste = [];
  const ekle = (oncelik, kategori, mesaj, sayi, hedefSekme, yetki = null) => {
    if (sayi <= 0) return;
    liste.push({ id: `${kategori}`, oncelik, kategori, mesaj, sayi, hedefSekme, yetki });
  };

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);

  // 🔴 Kritik uyarılar -----------------------------------------------------------
  const kritikStokSayisi = aktifParcalar.filter((p) => (p.stok || 0) > 0 && p.stok <= p.kritikSeviye).length;
  ekle("kritik", "Kritik Stok", `${kritikStokSayisi} ürün kritik stokta`, kritikStokSayisi, "siparis");

  const stoktaOlmayanSayisi = aktifParcalar.filter((p) => (p.stok || 0) === 0).length;
  ekle("kritik", "Stokta Olmayan", `${stoktaOlmayanSayisi} ürün stokta yok`, stoktaOlmayanSayisi, "siparis");

  const negatifStokSayisi = aktifParcalar.filter((p) => (p.stok || 0) < 0).length;
  ekle("kritik", "Negatif Stok", `${negatifStokSayisi} üründe negatif stok var — kontrol edin`, negatifStokSayisi, "stok", "stokDuzeltebilir");

  const bugunkuSatislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) === bugunIso);
  const bugunkuKalemler = bugunkuSatislar.flatMap((s) => s.kalemler);
  const maliyetAltiSayisi = bugunkuKalemler.filter((k) => satisKalemiKarBilgisi(k).karToplam < -0.005).length;
  ekle("kritik", "Maliyet Altı Satış", `Bugün ${maliyetAltiSayisi} satış kalemi maliyetin altında satıldı`, maliyetAltiSayisi, "raporlar", "karOraniniGorebilir");

  const minKarAltiSayisi = bugunkuKalemler.filter((k) => {
    const kb = satisKalemiKarBilgisi(k);
    return kb.karToplam >= -0.005 && kb.karYuzde !== null && kb.karYuzde < DUSUK_KAR_ESIGI_YUZDE;
  }).length;
  ekle("kritik", "Minimum Kâr Altı Satış", `Bugün ${minKarAltiSayisi} satış kalemi düşük kârla satıldı`, minKarAltiSayisi, "raporlar", "karOraniniGorebilir");

  const kasaFarkiSayisi = db.kasaGunleri.filter((g) => g.durum === "Kapalı" && Math.abs((g.sayilanTutar || 0) - (g.beklenenTutar || 0)) > 0.5).length;
  ekle("kritik", "Kasa Farkı", `${kasaFarkiSayisi} kapatılmış kasa gününde fark var`, kasaFarkiSayisi, "kasayonetimi", "kasaGorebilir");

  const posFarkiSayisi = db.posTahsilatlari.filter((t) => t.durum === "Fark Var").length;
  ekle("kritik", "POS/Banka Farkı", `${posFarkiSayisi} POS tahsilatında banka farkı var`, posFarkiSayisi, "bankapos", "kasaGorebilir");

  const musteriVadesiGecenSayisi = db.cariler.filter((c) => {
    if (!(c.bakiye > 0 && c.vadeGunu > 0)) return false;
    const sonBorc = c.hareketler.find((h) => h.tur === "borç");
    return sonBorc && Math.floor((new Date(bugunIso).getTime() - new Date(sonBorc.tarih).getTime()) / 86400000) > c.vadeGunu;
  }).length;
  ekle("kritik", "Vadesi Geçmiş Müşteri Borcu", `${musteriVadesiGecenSayisi} müşterinin vadesi geçmiş borcu var`, musteriVadesiGecenSayisi, "musteri", "cariHesapGorebilir");

  const tedarikciVadesiGecenSayisi = db.malAlimlari.filter((m) => m.vadeTarihi && m.vadeTarihi < bugunIso && (m.faturaGirilenToplam ?? m.hesaplananGenelToplam) - (m.odenenTutar || 0) > 0.01).length;
  ekle("kritik", "Vadesi Geçmiş Tedarikçi Borcu", `${tedarikciVadesiGecenSayisi} tedarikçi faturasının vadesi geçti`, tedarikciVadesiGecenSayisi, "tedarikci", "cariHesapGorebilir");

  // 🟡 Hatırlatmalar --------------------------------------------------------------
  const yediGunSonraIso = isoGun(new Date(Date.now() + 7 * 86400000));
  const yaklasanTedarikciOdemesiSayisi = db.malAlimlari.filter(
    (m) => m.vadeTarihi && m.vadeTarihi >= bugunIso && m.vadeTarihi <= yediGunSonraIso && (m.faturaGirilenToplam ?? m.hesaplananGenelToplam) - (m.odenenTutar || 0) > 0.01
  ).length;
  ekle("uyari", "Yaklaşan Tedarikçi Ödemesi", `${yaklasanTedarikciOdemesiSayisi} tedarikçi ödemesi 7 gün içinde`, yaklasanTedarikciOdemesiSayisi, "kasa", "cariHesapGorebilir");

  const yaklasanMusteriTahsilatiSayisi = db.cariler.filter((c) => {
    if (!(c.bakiye > 0 && c.vadeGunu > 0)) return false;
    const sonBorc = c.hareketler.find((h) => h.tur === "borç");
    if (!sonBorc) return false;
    const gecenGun = Math.floor((new Date(bugunIso).getTime() - new Date(sonBorc.tarih).getTime()) / 86400000);
    return gecenGun <= c.vadeGunu && gecenGun >= c.vadeGunu - 7;
  }).length;
  ekle("uyari", "Yaklaşan Müşteri Tahsilatı", `${yaklasanMusteriTahsilatiSayisi} müşteri tahsilatının vadesi yaklaşıyor`, yaklasanMusteriTahsilatiSayisi, "musteri", "cariHesapGorebilir");

  const bekleyenSatinAlmaSayisi = db.satinAlmaSiparisleri.filter((s) => s.durum === "Sipariş Verildi" || s.durum === "Kısmi Geldi").length;
  ekle("uyari", "Bekleyen Satın Alma Siparişi", `${bekleyenSatinAlmaSayisi} satın alma siparişi mal kabul bekliyor`, bekleyenSatinAlmaSayisi, "satinalma", "malAlisGirebilir");

  const gecikenTedarikciSiparisSayisi = db.satinAlmaSiparisleri.filter(
    (s) => s.beklenenTeslimTarihi && s.beklenenTeslimTarihi < bugunIso && (s.durum === "Sipariş Verildi" || s.durum === "Kısmi Geldi")
  ).length;
  ekle("onemli", "Geciken Tedarikçi Siparişi", `${gecikenTedarikciSiparisSayisi} sipariş beklenen teslim tarihini geçti`, gecikenTedarikciSiparisSayisi, "satinalma", "malAlisGirebilir");

  const bekleyenMusteriSiparisSayisi = db.musteriSiparisleri.filter((s) => s.durum === "Bekliyor").length;
  ekle("uyari", "Bekleyen Müşteri Siparişi", `${bekleyenMusteriSiparisSayisi} müşteri siparişi tedarik bekliyor`, bekleyenMusteriSiparisSayisi, "musterisiparisi", "satisYapabilir");

  const ikiGunSonraIso = new Date(Date.now() + 2 * 86400000).toLocaleDateString("en-CA");
  const suresiYaklasanRezervSayisi = db.rezervler.filter((r) => r.durum === "Bekliyor" && r.sonGecerlilikTarihi <= ikiGunSonraIso && r.sonGecerlilikTarihi >= bugunIso).length;
  ekle("uyari", "Süresi Yaklaşan Rezerv", `${suresiYaklasanRezervSayisi} rezervin süresi 2 gün içinde doluyor`, suresiYaklasanRezervSayisi, "rezervler", "satisYapabilir");

  const teslimBekleyenTransferSayisi = db.transferler.filter((t) => t.durum === "Gönderildi" || t.durum === "Yolda").length;
  ekle("uyari", "Teslim Bekleyen Transfer", `${teslimBekleyenTransferSayisi} transfer teslim alınmayı bekliyor`, teslimBekleyenTransferSayisi, "transferler", "stokDuzeltebilir");

  const notHatirlatmaSayisi = bekleyenNotHatirlatmalari(db).length;
  ekle("uyari", "Not Hatırlatması", `${notHatirlatmaSayisi} müşteri/tedarikçi hatırlatması zamanı geldi`, notHatirlatmaSayisi, "musteri");

  const kargoTeslimBekleyenSayisi = db.teslimatlar.filter((t) => t.durum === "Kargoya Verildi" || t.durum === "Dağıtımda").length;
  ekle("uyari", "Kargo Teslim Bekliyor", `${kargoTeslimBekleyenSayisi} kargo teslim bekliyor`, kargoTeslimBekleyenSayisi, "kargo");
  const kargoTeslimEdilemeyenSayisi = db.teslimatlar.filter((t) => t.durum === "İade Edildi").length;
  ekle("kritik", "Kargo Teslim Edilemedi", `${kargoTeslimEdilemeyenSayisi} kargo teslim edilemedi`, kargoTeslimEdilemeyenSayisi, "kargo");

  // 🔵 Bilgilendirmeler (bugünkü olaylar) ------------------------------------------
  ekle("bilgi", "Genel Bilgilendirmeler", `Bugün ${bugunkuSatislar.length} satış yapıldı`, bugunkuSatislar.length, "raporlar", "raporlariGorebilir");

  const bugunkuAlislar = db.malAlimlari.filter((m) => (m.olusturmaTarihi || "").slice(0, 10) === bugunIso).length;
  ekle("bilgi", "Genel Bilgilendirmeler", `Bugün ${bugunkuAlislar} yeni alış kaydı girildi`, bugunkuAlislar, "alis", "malAlisGirebilir");

  const bugunkuFiyatDegisikligi = db.islemGecmisi.filter((i) => i.islemTuru.includes("fiyat") && (i.tarih || "").slice(0, 10) === bugunIso).length;
  ekle("bilgi", "Genel Bilgilendirmeler", `Bugün ${bugunkuFiyatDegisikligi} fiyat değişikliği yapıldı`, bugunkuFiyatDegisikligi, "kullanicilar", "fiyatDegistirebilir");

  const bugunTamamlananSayim = db.sayimlar.filter((s) => (s.onayTarihi || "").slice(0, 10) === bugunIso).length;
  ekle("bilgi", "Genel Bilgilendirmeler", `Bugün ${bugunTamamlananSayim} sayım tamamlandı`, bugunTamamlananSayim, "sayim", "stokDuzeltebilir");

  const bugunYedekAlindi = db.yedekGecmisi.filter((y) => (y.tarih || "").slice(0, 10) === bugunIso).length;
  ekle("bilgi", "Genel Bilgilendirmeler", `Bugün ${bugunYedekAlindi} yedekleme başarıyla alındı`, bugunYedekAlindi, "yedekguvenlik", "kullaniciYonetebilir");

  return liste;
};

// Bir bildirim listesini, aktif kullanıcının rolüne göre süzer — "Herkes her
// bildirimi görmemeli" gereksinimi burada karşılanır (yetki=null olanlar
// herkese açıktır, ör. Kritik Stok, Bekleyen Müşteri Siparişi, Rezerv).
export const bildirimleriYetkiyeGoreSuz = (db, aktifKullanici, bildirimler, ayarlar) =>
  bildirimler.filter((b) => {
    if (b.yetki && !yetkiVarMi(db, aktifKullanici, b.yetki)) return false;
    if (ayarlar && ayarlar.kapaliKategoriler && ayarlar.kapaliKategoriler.includes(b.kategori)) return false;
    return true;
  });





/* ------------------------------------------------------------------ */
/* FİYAT LİSTESİ / TEKLİF SİSTEMİ                                      */
/* ------------------------------------------------------------------ */
export const TEKLIF_DURUMLARI = ["Taslak", "Gönderildi", "Onaylandı", "Reddedildi", "Süresi Doldu", "Satışa Dönüştü"];

/* ------------------------------------------------------------------ */
export const bosTedarikciTeklifForm = {
  teklifTarihi: isoGun(new Date()),
  tedarikciAdi: "",
  adet: "1",
  birimFiyat: "",
  iskontoYuzde: "0",
  kdvOrani: "20",
  kargoUcreti: "0",
  nakliyeUcreti: "0",
  digerMaliyet: "0",
  gecerlilikTarihi: "",
  stokDurumu: "",
  notlar: "",
};











/* ------------------------------------------------------------------ */
/* API / ENTEGRASYON ALTYAPISI (61. adım)                              */
/* ------------------------------------------------------------------ */
// ÖNEMLİ: Bu, GERÇEK dış sistem bağlantıları YAPMAZ (bu program sunucusuz,
// tarayıcı-içi tek dosyalık bir uygulamadır). Aşağıdaki her şey, ileride
// gerçek bir backend kurulduğunda kullanılacak AYAR/LOG/KUYRUK iskeletidir.
export const ENTEGRASYON_TURLERI = [
  { id: "eTicaret", ad: "E-Ticaret (Trendyol, kendi siten, pazaryeri)" },
  { id: "eFatura", ad: "E-Fatura / E-Arşiv" },
  { id: "kargo", ad: "Kargo Firması API" },
  { id: "tedarikciB2B", ad: "Tedarikçi B2B" },
  { id: "webhook", ad: "Webhook (Gelen Bildirim)" },
];


// Şablon gövdesindeki {değişken} yer tutucularını gerçek değerlerle
// doldurur (4. madde) — "Program değişkenleri otomatik doldursun."
export const sablonDoldur = (metin, degerler) => (metin || "").replace(/\{(\w+)\}/g, (_, ad) => (degerler[ad] !== undefined ? degerler[ad] : `{${ad}}`));

export { donemKarOzetiHesapla } from "../services/rapor-service";


export { auditKaydiEkle, auditZincirKontrolu, kritikYetkiVarMi, AUDIT_KATEGORILERI };
