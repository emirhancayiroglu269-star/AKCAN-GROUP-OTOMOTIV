/* Stok module — extracted from the V16 monolith.
   Sayfanın kendisi: state, iş kuralları ve modal yönetimi burada.
   Ürün kartı ızgarası → UrunListesi.tsx, ürün formu → UrunFormu.tsx */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";
import { UrunListesi } from "./UrunListesi";
import { UrunFormu } from "./UrunFormu";
import { StokModallari } from "./StokModallari";
import { UrunDetayPaneli } from "./UrunDetayPaneli";
import { UrunDetayKarti } from "./UrunDetayKarti";
// Bölünen sayfalar — App.tsx tek yerden import etmeye devam eder.
export { SiparisOnerisiSayfasi } from "./SiparisOnerisiSayfasi";
export { SayimSayfasi } from "./SayimSayfasi";
export { TopluFiyatSayfasi } from "./TopluFiyatSayfasi";
export { BarkodBulunamadiModal } from "./BarkodBulunamadiModal";

export function StokSayfasi({ db, updateDb, aktifKullanici, yeniFormSinyali }) {
  const [ara, setAra] = R.useState("");
  const [durumFiltre, setDurumFiltre] = R.useState("aktif"); // aktif | pasif | tumu
  const [markaFiltre, setMarkaFiltre] = R.useState("");
  const [kategoriFiltre, setKategoriFiltre] = R.useState("");
  const [formAcik, setFormAcik] = R.useState(false);
  const [duzenlenenId, setDuzenlenenId] = R.useState(null);
  const [form, setForm] = R.useState(R.bosForm);
  const [girisModalId, setGirisModalId] = R.useState(null); // stok girişi yapılan parça id
  const [girisAdet, setGirisAdet] = R.useState("");
  const [girisPaketId, setGirisPaketId] = R.useState("");
  const [girisPaketAdedi, setGirisPaketAdedi] = R.useState("");
  const [girisFiyat, setGirisFiyat] = R.useState("");
  const [girisBelgeNo, setGirisBelgeNo] = R.useState("");
  const [girisKullanici, setGirisKullanici] = R.useIslemYapan(aktifKullanici);
  const [duzeltmeModalId, setDuzeltmeModalId] = R.useState(null); // Stok Düzeltme yapılan parça id
  const [duzeltmeYon, setDuzeltmeYon] = R.useState("giris"); // "giris" | "cikis"
  const [duzeltmeTur, setDuzeltmeTur] = R.useState(R.STOK_GIRIS_TURLERI[0]);
  const [duzeltmeAdet, setDuzeltmeAdet] = R.useState("");
  const [duzeltmeBelgeNo, setDuzeltmeBelgeNo] = R.useState("");
  const [duzeltmeKullanici, setDuzeltmeKullanici] = R.useIslemYapan(aktifKullanici);
  const [duzeltmeAciklama, setDuzeltmeAciklama] = R.useState("");
  const [hareketlerAcikId, setHareketlerAcikId] = R.useState(null);
  const [tedarikciKarsilastirmaAcikId, setTedarikciKarsilastirmaAcikId] = R.useState(null);
  const [ayarlarAcik, setAyarlarAcik] = R.useState(false);
  const [rafModalId, setRafModalId] = R.useState(null);
  const [rafTransferKaynak, setRafTransferKaynak] = R.useState("");
  const [rafTransferHedef, setRafTransferHedef] = R.useState("");
  const [rafTransferAdet, setRafTransferAdet] = R.useState("");
  const [rafTransferKullanici, setRafTransferKullanici] = R.useIslemYapan(aktifKullanici);
  const [gecmisAcikId, setGecmisAcikId] = R.useState(null);
  const [fiyatGecmisAcikId, setFiyatGecmisAcikId] = R.useState(null);
  const [silinecek, setSilinecek] = R.useState(null);
  const [kodModalId, setKodModalId] = R.useState(null); // OEM/Muadil kod yönetimi açık olan parça id
  const [uyariModal, setUyariModal] = R.useState(null); // { basliklar: [], mukerrerParca, benzerler: [] }
  const [barkodModalId, setBarkodModalId] = R.useState(null);
  const [aracModalId, setAracModalId] = R.useState(null);
  const [detayModalId, setDetayModalId] = R.useState(null);
  const [detaySekme, setDetaySekme] = R.useState("fotograf");
  const [gecmisAltGorunum, setGecmisAltGorunum] = R.useState("zaman");
  const [buyukFotoUrl, setBuyukFotoUrl] = R.useState(null);
  const [fotoYukleniyor, setFotoYukleniyor] = R.useState(false);
  const [yeniFotoTuru, setYeniFotoTuru] = R.useState("Ana Ürün");
  const [yeniDokumanTuru, setYeniDokumanTuru] = R.useState("Teknik Katalog");
  const [topluFotoAcik, setTopluFotoAcik] = R.useState(false);
  const [topluFotoSonuc, setTopluFotoSonuc] = R.useState(null);
  const fotoInputRef = R.useRef(null);
  const dokumanInputRef = R.useRef(null);
  const topluFotoInputRef = R.useRef(null);
  const [aracAramaMetni, setAracAramaMetni] = R.useState("");
  const [yeniUyumDurumu, setYeniUyumDurumu] = R.useState("Kesin Uyumlu");
  const [yeniBarkodDegeri, setYeniBarkodDegeri] = R.useState("");
  const [barkodHata, setBarkodHata] = R.useState("");
  const [yeniKodTipi, setYeniKodTipi] = R.useState("OEM");
  const [yeniKodDegeri, setYeniKodDegeri] = R.useState("");
  const [kodHata, setKodHata] = R.useState("");
  const [hedefTuru, setHedefTuru] = R.useState(db.hedefKarAyari?.tur || "markup");
  const [hedefDeger, setHedefDeger] = R.useState(String(db.hedefKarAyari?.deger ?? 30));
  const dosyaInputRef = R.useRef(null);

  const formuAc = (p) => {
    if (p) {
      const anaKAdi = p.anaKategori || p.kategori || "";
      const anaK = db.kategoriler.find((k) => !k.ustKategoriId && k.ad === anaKAdi);
      const altK = anaK && p.kategori && p.kategori !== anaK.ad ? db.kategoriler.find((k) => k.ustKategoriId === anaK.id && k.ad === p.kategori) : null;
      setForm({
        ...R.bosForm,
        stokKodu: p.stokKodu || "",
        ad: p.ad || "",
        marka: p.marka || "",
        ureticiKodu: p.ureticiKodu || "",
        barkod: p.barkod || "",
        anaKategoriId: anaK?.id || "",
        altKategoriId: altK?.id || "",
        kategoriOzelDegerler: p.kategoriOzelDegerler || {},
        birim: p.birim || "Adet",
        kdvOrani: p.kdvOrani != null ? String(p.kdvOrani) : "20",
        alisFiyati: p.alisFiyati ?? "",
        satisFiyati: p.satisFiyati ?? "",
        minimumSatisFiyati: p.minimumSatisFiyati ?? "",
        stok: p.stok ?? "",
        kritikSeviye: p.kritikSeviye ?? "",
        hedefStok: p.hedefStok ?? "",
        guvenlikStogu: p.guvenlikStogu ?? "",
        siparisteAdet: p.siparisteAdet ?? "",
        rafAdresi: p.rafAdresi || "",
        tedarikci: p.tedarikci || "",
        aciklama: p.aciklama || "",
        fotograf: p.fotograf || "",
        aktif: p.aktif !== false,
        urunTipi: p.urunTipi || "Basit",
        setBilesenleri: p.setBilesenleri || [],
        paketBirimleri: p.paketBirimleri || [],
        satisBirimSekli: p.satisBirimSekli || "sadeceTemel",
      });
      setDuzenlenenId(p.id);
    } else {
      setForm(R.bosForm);
      setDuzenlenenId("yeni");
    }
    setFormAcik(true);
  };

  // Hızlı İşlem Merkezi'nden (F5 → Yeni Ürün) gelen sinyal — her farklı
  // sinyal değerinde (App() bir sayaç artırarak tetikler) formu otomatik açar.
  R.useEffect(() => {
    if (yeniFormSinyali) formuAc(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yeniFormSinyali]);

  const formuKapat = () => {
    setFormAcik(false);
    setDuzenlenenId(null);
    setForm(R.bosForm);
  };

  const fotografSec = (e) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (dosya.size > 3 * 1024 * 1024) {
      R.bildirimGoster("Fotoğraf 3MB'tan küçük olmalı.", "hata");
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => setForm((f) => ({ ...f, fotograf: String(ev.target.result ?? "") }));
    okuyucu.readAsDataURL(dosya);
    e.target.value = "";
  };

  const kaydet = (zorla = false) => {
    if (!form.ad.trim()) {
      R.bildirimGoster("Ürün adı zorunludur.", "hata");
      return;
    }
    if (!form.stokKodu.trim()) {
      R.bildirimGoster("Stok kodu zorunludur.", "hata");
      return;
    }
    if (!form.marka.trim()) {
      R.bildirimGoster("Marka zorunludur.", "hata");
      return;
    }
    if (!form.birim) {
      R.bildirimGoster("Birim zorunludur.", "hata");
      return;
    }
    if (form.kdvOrani === "" || form.kdvOrani === null || isNaN(parseFloat(form.kdvOrani))) {
      R.bildirimGoster("KDV oranı zorunludur.", "hata");
      return;
    }
    // --- Sayısal veri kontrolü — mantıksız değerler engellenir -----------------
    const kdvSayi = parseFloat(form.kdvOrani);
    if (kdvSayi < 0 || kdvSayi > 100) {
      R.bildirimGoster("KDV oranı %0 ile %100 arasında olmalıdır.", "hata");
      return;
    }
    if (form.alisFiyati !== "" && parseFloat(form.alisFiyati) < 0) {
      R.bildirimGoster("Alış fiyatı negatif olamaz.", "hata");
      return;
    }
    if (form.satisFiyati !== "" && parseFloat(form.satisFiyati) < 0) {
      R.bildirimGoster("Satış fiyatı negatif olamaz.", "hata");
      return;
    }
    if (duzenlenenId === "yeni" && form.stok !== "" && parseFloat(form.stok) < 0) {
      R.bildirimGoster("Başlangıç stoğu negatif olamaz.", "hata");
      return;
    }

    // --- 1) Mükerrer ürün kontrolü — Stok Kodu / Üretici Kodu+Marka / Barkod --
    // ve 6) Fiyat kontrolü uyarıları — hepsi "zorla" onaylanmadıysa burada durur.
    if (!zorla) {
      const mukerrer = R.mukerrerUrunBul(db, { stokKodu: form.stokKodu, ureticiKodu: form.ureticiKodu, marka: form.marka, barkod: form.barkod }, duzenlenenId === "yeni" ? null : duzenlenenId);
      const benzerler = duzenlenenId === "yeni" ? R.benzerUrunleriBul(db, form.ad, null) : [];
      const fiyatUyarilari = [];
      const satisF = parseFloat(form.satisFiyati) || 0;
      const alisF = parseFloat(form.alisFiyati) || 0;
      if (satisF === 0) fiyatUyarilari.push("⚠️ Satış fiyatı 0₺.");
      else if (alisF > 0 && satisF < alisF) fiyatUyarilari.push("⚠️ Satış fiyatı maliyetin altında.");

      if (mukerrer || benzerler.length > 0 || fiyatUyarilari.length > 0) {
        setUyariModal({ mukerrerParca: mukerrer, benzerler, fiyatUyarilari });
        return;
      }
    }
    setUyariModal(null);

    if (duzenlenenId !== "yeni") {
      const mevcutParca = db.parcalar.find((p) => p.id === duzenlenenId);
      const fiyatDegisiyor = mevcutParca && parseFloat(form.satisFiyati) !== mevcutParca.satisFiyati;
      if (fiyatDegisiyor && !R.yetkiVarMi(db, aktifKullanici, "fiyatDegistirebilir")) {
        R.bildirimGoster("Satış fiyatını değiştirme yetkiniz yok.", "hata");
        return;
      }
    }
    const anaKSecili = form.anaKategoriId ? db.kategoriler.find((k) => k.id === form.anaKategoriId) : null;
    const altKSecili = form.altKategoriId ? db.kategoriler.find((k) => k.id === form.altKategoriId) : null;
    const kayit = {
      stokKodu: form.stokKodu.trim(),
      ad: form.ad.trim(),
      marka: form.marka.trim(),
      ureticiKodu: form.ureticiKodu.trim(),
      barkod: form.barkod.trim(),
      // p.kategori (geriye dönük uyumlu) alt kategori seçiliyse onun adını,
      // yoksa ana kategori adını taşır — Toplu Fiyat/Sayım/Raporlar gibi
      // modüller bu alana bakarak çalışmaya aynen devam eder.
      anaKategori: anaKSecili?.ad || "",
      kategori: altKSecili?.ad || anaKSecili?.ad || "",
      kategoriOzelDegerler: form.kategoriOzelDegerler,
      birim: form.birim,
      kdvOrani: parseFloat(form.kdvOrani) || 0,
      alisFiyati: parseFloat(form.alisFiyati) || 0,
      satisFiyati: parseFloat(form.satisFiyati) || 0,
      minimumSatisFiyati: parseFloat(form.minimumSatisFiyati) || 0,
      kritikSeviye: parseFloat(form.kritikSeviye) || 0,
      hedefStok: parseFloat(form.hedefStok) || 0,
      guvenlikStogu: parseFloat(form.guvenlikStogu) || 0,
      siparisteAdet: parseFloat(form.siparisteAdet) || 0,
      rafAdresi: form.rafAdresi.trim(),
      tedarikci: form.tedarikci.trim(),
      aciklama: form.aciklama.trim(),
      fotograf: form.fotograf,
      aktif: form.aktif,
      urunTipi: form.urunTipi,
      setBilesenleri: form.urunTipi === "Set" ? form.setBilesenleri : [],
      paketBirimleri: form.urunTipi === "Basit" ? form.paketBirimleri : [],
      satisBirimSekli: form.urunTipi === "Basit" ? form.satisBirimSekli : "sadeceTemel",
    };
    if (duzenlenenId === "yeni") {
      const baslangicStok = parseFloat(form.stok) || 0;
      const yeniParca = {
        id: R.yeniId("p"),
        ...kayit,
        stok: baslangicStok,
        // Kart ilk oluşturulurken girilen "Alış Fiyatı" ve mevcut stok, aynı
        // zamanda ilk maliyet girişi olarak kaydedilir — böylece ortalama
        // maliyet en baştan doğru başlar.
        sonAlisFiyati: kayit.alisFiyati,
        ortalamaMaliyet: kayit.alisFiyati,
        alisGecmisi:
          baslangicStok > 0 && kayit.alisFiyati > 0
            ? [{ id: R.yeniId("g"), tarih: R.zamanDamgasi(), adet: baslangicStok, birimFiyat: kayit.alisFiyati }]
            : [],
        // Satış fiyatı geçmişi de ilk kayıtla başlar — "ne zaman değişti"
        // sorusuna baştan itibaren cevap verebilmek için.
        fiyatGecmisi:
          kayit.satisFiyati > 0 ? [{ id: R.yeniId("f"), tarih: R.zamanDamgasi(), eskiFiyat: null, yeniFiyat: kayit.satisFiyati }] : [],
      };
      updateDb((prev) => ({ ...prev, parcalar: [yeniParca, ...prev.parcalar] }));
      // Başlangıç stoğu, "Devir / Açılış Stoğu" olarak stok hareket
      // geçmişine de işlenir — hareketler tablosu ürünün ilk gününden
      // itibaren eksiksiz olsun diye.
      if (baslangicStok > 0) {
        updateDb((prev) =>
          R.stokHareketiUygula(prev, {
            parcaId: yeniParca.id,
            tur: "Devir / Açılış Stoğu",
            giris: baslangicStok,
            kullanici: R.sonKullaniciAdi(),
            aciklama: "Ürün kartı oluşturulurken girilen başlangıç stoğu",
          }).db
        );
      }
      R.bildirimGoster("Ürün kartı oluşturuldu.", "basari");
    } else {
      updateDb((prev) => {
        const sonuc = {
          ...prev,
          parcalar: prev.parcalar.map((p) => {
            if (p.id !== duzenlenenId) return p;
            // Satış fiyatı değiştiyse, fiyat geçmişine (kim/ne zaman/neden) yeni bir satır eklenir.
            const fiyatDegisti = kayit.satisFiyati !== p.satisFiyati;
            const fiyatGecmisi = fiyatDegisti
              ? [
                  { id: R.yeniId("f"), tarih: R.zamanDamgasi(), eskiFiyat: p.satisFiyati, yeniFiyat: kayit.satisFiyati, kullanici: aktifKullanici?.adSoyad || "", degisiklikNedeni: form.fiyatDegisimNedeni || "" },
                  ...(p.fiyatGecmisi || []),
                ]
              : p.fiyatGecmisi || [];
            // Marka değiştiyse: "Eski marka → Yeni marka → Kullanıcı → Tarih" kalıcı olarak saklanır.
            const markaDegisti = kayit.marka && kayit.marka !== p.marka;
            const markaGecmisi = markaDegisti
              ? [
                  { id: R.yeniId("mg"), tarih: R.zamanDamgasi(), eskiMarka: p.marka, yeniMarka: kayit.marka, kullanici: aktifKullanici?.adSoyad || "" },
                  ...(p.markaGecmisi || []),
                ]
              : p.markaGecmisi || [];
            return { ...p, ...kayit, fiyatGecmisi, markaGecmisi };
          }),
        };
        const eskiParca = prev.parcalar.find((p) => p.id === duzenlenenId);
        let gecmisli = sonuc;
        if (eskiParca && kayit.satisFiyati !== eskiParca.satisFiyati) {
          gecmisli = R.islemKaydet(gecmisli, {
            kullaniciAdi: aktifKullanici?.adSoyad || "",
            islemTuru: "Satış fiyatı değiştirildi",
            aciklama: eskiParca.ad,
            eskiDeger: R.tl(eskiParca.satisFiyati),
            yeniDeger: R.tl(kayit.satisFiyati),
          });
        }
        if (eskiParca && kayit.marka && kayit.marka !== eskiParca.marka) {
          gecmisli = R.islemKaydet(gecmisli, {
            kullaniciAdi: aktifKullanici?.adSoyad || "",
            islemTuru: "Ürün markası değiştirildi",
            aciklama: eskiParca.ad,
            eskiDeger: eskiParca.marka || "(boş)",
            yeniDeger: kayit.marka,
          });
        }
        return gecmisli;
      });
      R.bildirimGoster("Ürün kartı güncellendi.", "basari");
    }
    updateDb((prev) => ({ ...prev, hedefKarAyari: { tur: hedefTuru, deger: parseFloat(hedefDeger) || 0 } }));
    formuKapat();
  };

  const sil = (id) => {
    if (!R.yetkiVarMi(db, aktifKullanici, "urunSilebilir")) {
      R.bildirimGoster("Ürün silme yetkiniz yok.", "hata");
      setSilinecek(null);
      return;
    }
    const parca = db.parcalar.find((p) => p.id === id);
    // Önemli veriler gerçekten silinmez: bu ürüne bağlı herhangi bir geçmiş
    // (stok hareketi, satış veya alış kaydı) varsa, silme yerine otomatik
    // olarak Pasif'e alınır — geçmiş raporlar ve kayıtlar bozulmasın diye.
    const gecmisiVar =
      db.stokHareketleri.some((h) => h.parcaId === id) ||
      db.satislar.some((s) => s.kalemler.some((k) => k.parcaId === id)) ||
      db.malAlimlari.some((m) => m.kalemler.some((k) => k.parcaId === id));
    if (gecmisiVar) {
      updateDb((prev) => {
        const sonuc = R.islemKaydet(prev, {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Ürün pasifleştirildi (silme yerine)",
          aciklama: `${parca?.ad || id} — geçmiş kaydı olduğu için gerçekten silinmedi`,
          eskiDeger: "Aktif",
          yeniDeger: "Pasif",
        });
        return { ...sonuc, parcalar: sonuc.parcalar.map((p) => (p.id === id ? { ...p, aktif: false } : p)) };
      });
      setSilinecek(null);
      R.bildirimGoster("Bu ürünün geçmiş kaydı olduğu için silinmedi, bunun yerine Pasif yapıldı.", "basari");
      return;
    }
    updateDb((prev) => {
      const sonuc = R.islemKaydet(prev, {
        kullaniciAdi: aktifKullanici?.adSoyad || "",
        islemTuru: "Ürün kartı silindi",
        aciklama: parca ? `${parca.ad} (${parca.stokKodu})` : id,
        eskiDeger: parca?.ad || "",
        yeniDeger: "Silindi",
      });
      return {
        ...sonuc,
        parcalar: sonuc.parcalar.filter((p) => p.id !== id),
        // Ürün silinince ona bağlı OEM/Muadil kod kayıtları da (yetim kalmasın diye) silinir.
        kodlar: sonuc.kodlar.filter((k) => k.parcaId !== id),
        stokHareketleri: sonuc.stokHareketleri.filter((h) => h.parcaId !== id),
      };
    });
    setSilinecek(null);
    R.bildirimGoster("Ürün kartı silindi.", "basari");
  };

  const kodModalParca = kodModalId ? db.parcalar.find((p) => p.id === kodModalId) : null;
  const barkodModalParca = barkodModalId ? db.parcalar.find((p) => p.id === barkodModalId) : null;
  const aracModalParca = aracModalId ? db.parcalar.find((p) => p.id === aracModalId) : null;
  const detayModalParca = detayModalId ? db.parcalar.find((p) => p.id === detayModalId) : null;
  const aracAramaSonuclari = aracAramaMetni.trim()
    ? db.araclar
        .filter((a) => a.aktif !== false)
        .filter((a) => R.aracEtiketi(a).toLowerCase().includes(aracAramaMetni.trim().toLowerCase()))
        .slice(0, 8)
    : [];
  const kodModalKodlari = kodModalId ? db.kodlar.filter((k) => k.parcaId === kodModalId) : [];

  const kodEkle = () => {
    const deger = yeniKodDegeri.trim();
    if (!deger) {
      setKodHata("Kod boş olamaz.");
      return;
    }
    const normalize = R.kodNormalize(deger);
    // Aynı OEM/Muadil kodun aynı ürüne yanlışlıkla iki kez eklenmesini engeller
    // (farklı ürünlere aynı kodun bağlanması normaldir — bu, çapraz referansın kendisidir).
    const zatenVar = kodModalKodlari.some((k) => R.kodNormalize(k.kod) === normalize);
    if (zatenVar) {
      setKodHata("Bu kod bu üründe zaten kayıtlı.");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      kodlar: [...prev.kodlar, { id: R.yeniId("k"), parcaId: kodModalId, tip: yeniKodTipi, kod: deger }],
    }));
    setYeniKodDegeri("");
    setKodHata("");
  };

  const kodSil = (kodId) => {
    updateDb((prev) => ({ ...prev, kodlar: prev.kodlar.filter((k) => k.id !== kodId) }));
  };

  // --- Barkod yönetimi ------------------------------------------------------
  // Bir ürünün barkod listesini güncellerken p.barkod (birincil/eski alan)
  // her zaman listenin ilk elemanıyla senkron tutulur.
  const barkodlariGuncelle = (parcaId, yeniListe) => {
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => (p.id === parcaId ? { ...p, barkodlar: yeniListe, barkod: yeniListe[0] || "" } : p)),
    }));
  };

  const barkodEkle = () => {
    const deger = yeniBarkodDegeri.trim();
    if (!deger) {
      setBarkodHata("Barkod boş olamaz.");
      return;
    }
    const parca = db.parcalar.find((p) => p.id === barkodModalId);
    const mevcutListe = R.parcaTumBarkodlari(parca);
    if (mevcutListe.some((b) => b.trim() === deger)) {
      setBarkodHata("Bu barkod bu üründe zaten kayıtlı.");
      return;
    }
    const baskaUrunde = R.barkodluParcaBul(db.parcalar, deger);
    if (baskaUrunde && baskaUrunde.id !== barkodModalId) {
      setBarkodHata(`Bu barkod zaten "${baskaUrunde.ad}" ürününde kayıtlı — bir barkod yalnızca bir ürüne bağlı olabilir.`);
      return;
    }
    barkodlariGuncelle(barkodModalId, [...mevcutListe, deger]);
    setYeniBarkodDegeri("");
    setBarkodHata("");
  };

  const barkodSil = (parcaId, barkod) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    barkodlariGuncelle(parcaId, R.parcaTumBarkodlari(parca).filter((b) => b !== barkod));
  };

  const barkodBirincilYap = (parcaId, barkod) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    const diger = R.parcaTumBarkodlari(parca).filter((b) => b !== barkod);
    barkodlariGuncelle(parcaId, [barkod, ...diger]);
  };

  const barkodOtomatikUret = () => {
    const parca = db.parcalar.find((p) => p.id === barkodModalId);
    const yeni = R.otomatikBarkodUret(db);
    barkodlariGuncelle(barkodModalId, [...R.parcaTumBarkodlari(parca), yeni]);
  };

  // --- Uyumlu araç yönetimi --------------------------------------------------
  const uyumlulukEkle = (aracId) => {
    if (db.uyumluluklar.some((u) => u.parcaId === aracModalId && u.aracId === aracId)) {
      R.bildirimGoster("⚠️ Bu araç uyumluluğu zaten mevcut.", "hata");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      uyumluluklar: [...prev.uyumluluklar, { id: R.yeniId("uy"), parcaId: aracModalId, aracId, durum: yeniUyumDurumu, not: "" }],
    }));
    setAracAramaMetni("");
  };
  const uyumlulukDurumGuncelle = (uyumlulukId, durum) => {
    updateDb((prev) => ({ ...prev, uyumluluklar: prev.uyumluluklar.map((u) => (u.id === uyumlulukId ? { ...u, durum } : u)) }));
  };
  const uyumlulukSil = (uyumlulukId) => {
    updateDb((prev) => ({ ...prev, uyumluluklar: prev.uyumluluklar.filter((u) => u.id !== uyumlulukId) }));
  };

  // --- Fotoğraf yönetimi ------------------------------------------------------
  const fotograflarGuncelle = (parcaId, yeniListe) => {
    updateDb((prev) => ({ ...prev, parcalar: prev.parcalar.map((p) => (p.id === parcaId ? { ...p, fotograflar: yeniListe } : p)) }));
  };

  const fotografEkle = async (e) => {
    const dosyalar = Array.from<File>(e.target.files || []);
    if (dosyalar.length === 0) return;
    setFotoYukleniyor(true);
    try {
      const parca = db.parcalar.find((p) => p.id === detayModalId);
      let mevcutListe = [...(parca.fotograflar || [])];
      for (const dosya of dosyalar) {
        if (!dosya.type.startsWith("image/")) {
          R.bildirimGoster(`${dosya.name} bir görsel değil, atlandı.`, "hata");
          continue;
        }
        const sikistirilmis = await R.fotografSikistir(dosya);
        mevcutListe.push({
          id: R.yeniId("fo"),
          url: sikistirilmis,
          tur: yeniFotoTuru,
          dosyaAdi: dosya.name,
          boyutKb: Math.round((sikistirilmis.length * 0.75) / 1024),
          tarih: R.zamanDamgasi(),
        });
      }
      fotograflarGuncelle(detayModalId, mevcutListe);
      R.bildirimGoster(`${dosyalar.length} fotoğraf eklendi (otomatik sıkıştırıldı).`, "basari");
    } catch {
      R.bildirimGoster("Fotoğraf yüklenirken bir sorun oluştu.", "hata");
    }
    setFotoYukleniyor(false);
    e.target.value = "";
  };

  const fotografSil = (parcaId, fotoId) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    fotograflarGuncelle(parcaId, parca.fotograflar.filter((f) => f.id !== fotoId));
  };
  const fotografAnaYap = (parcaId, fotoId) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    const secilen = parca.fotograflar.find((f) => f.id === fotoId);
    fotograflarGuncelle(parcaId, [secilen, ...parca.fotograflar.filter((f) => f.id !== fotoId)]);
  };
  const fotografSiraDegistir = (parcaId, index, yon) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    const liste = [...parca.fotograflar];
    const hedef = index + yon;
    if (hedef < 0 || hedef >= liste.length) return;
    [liste[index], liste[hedef]] = [liste[hedef], liste[index]];
    fotograflarGuncelle(parcaId, liste);
  };

  // --- Doküman yönetimi --------------------------------------------------------
  const dokumanEkle = (e) => {
    const dosyalar = Array.from<File>(e.target.files || []);
    if (dosyalar.length === 0) return;
    const parca = db.parcalar.find((p) => p.id === detayModalId);
    let mevcutListe = [...(parca.dokumanlar || [])];
    let atlandi = 0;
    let islemler = dosyalar.map((dosya) => {
      if (dosya.size > 8 * 1024 * 1024) {
        atlandi++;
        return null;
      }
      return new Promise((resolve) => {
        const okuyucu = new FileReader();
        okuyucu.onload = (ev) =>
          resolve({ id: R.yeniId("dk"), url: String(ev.target.result ?? ""), ad: dosya.name, tur: yeniDokumanTuru, dosyaAdi: dosya.name, boyutKb: Math.round(dosya.size / 1024), tarih: R.zamanDamgasi() });
        okuyucu.readAsDataURL(dosya);
      });
    });
    Promise.all(islemler).then((sonuclar) => {
      const gecerliler = sonuclar.filter(Boolean);
      updateDb((prev) => ({ ...prev, parcalar: prev.parcalar.map((p) => (p.id === detayModalId ? { ...p, dokumanlar: [...mevcutListe, ...gecerliler] } : p)) }));
      if (atlandi > 0) R.bildirimGoster(`${atlandi} dosya 8MB sınırını aştığı için eklenmedi.`, "hata");
      else R.bildirimGoster("Doküman(lar) eklendi.", "basari");
    });
    e.target.value = "";
  };
  const dokumanSil = (parcaId, dokumanId) => {
    updateDb((prev) => ({ ...prev, parcalar: prev.parcalar.map((p) => (p.id === parcaId ? { ...p, dokumanlar: p.dokumanlar.filter((d) => d.id !== dokumanId) } : p)) }));
  };

  // --- Toplu fotoğraf yükleme (dosya adından ürün kodu eşleştirme) -----------
  const topluFotoYukle = async (e) => {
    const dosyalar = Array.from<File>(e.target.files || []);
    if (dosyalar.length === 0) return;
    const eslesenler = [];
    const eslesmeyenler = [];
    for (const dosya of dosyalar) {
      const adKodu = R.kodNormalize(dosya.name.replace(/\.[^.]+$/, ""));
      const bulunan = db.parcalar.find((p) => adKodu.includes(R.kodNormalize(p.stokKodu)) && p.stokKodu.trim());
      if (bulunan && dosya.type.startsWith("image/")) {
        const sikistirilmis = await R.fotografSikistir(dosya);
        eslesenler.push({ parcaId: bulunan.id, ad: bulunan.ad, dosya: sikistirilmis, dosyaAdi: dosya.name });
      } else {
        eslesmeyenler.push(dosya.name);
      }
    }
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => {
        const e2 = eslesenler.find((x) => x.parcaId === p.id);
        if (!e2) return p;
        return {
          ...p,
          fotograflar: [
            { id: R.yeniId("fo"), url: e2.dosya, tur: "Ana Ürün", dosyaAdi: e2.dosyaAdi, boyutKb: Math.round((e2.dosya.length * 0.75) / 1024), tarih: R.zamanDamgasi() },
            ...(p.fotograflar || []),
          ],
        };
      }),
    }));
    setTopluFotoSonuc({ eslesen: eslesenler.map((x) => ({ ad: x.ad, dosyaAdi: x.dosyaAdi })), eslesmeyen: eslesmeyenler });
    e.target.value = "";
  };

  const aktifPasifDegistir = (p) => {
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((x) => (x.id === p.id ? { ...x, aktif: !x.aktif } : x)),
    }));
  };

  const girisModaliAc = (p) => {
    setGirisModalId(p.id);
    setGirisAdet("");
    setGirisPaketId("");
    setGirisPaketAdedi("");
    setGirisFiyat(String(p.sonAlisFiyati || p.alisFiyati || ""));
    setGirisBelgeNo("");
    setGirisKullanici(R.sonKullaniciAdi());
  };

  // Stok girişi: gelen adet + fiyatı, ağırlıklı ortalama maliyet formülüyle
  // mevcut ortalama maliyetle birleştirir; stoğu artırır; hem maliyet/alış
  // geçmişine hem de genel stok hareket geçmişine ("Mal Alış") işler.
  const girisiKaydet = () => {
    const adet = parseFloat(girisAdet);
    const fiyat = parseFloat(girisFiyat);
    if (!adet || adet <= 0) {
      R.bildirimGoster("Geçerli bir adet girin.", "hata");
      return;
    }
    if (!fiyat || fiyat <= 0) {
      R.bildirimGoster("Geçerli bir birim fiyat girin.", "hata");
      return;
    }
    updateDb((prev) => {
      const parca = prev.parcalar.find((p) => p.id === girisModalId);
      if (!parca) return prev;
      // ÖNEMLİ SIRA: stok hareketi KABUL EDİLMEDEN ortalama maliyet ve alış
      // geçmişi yazılmaz. Aksi halde hareket engellendiğinde (veya aynı belge
      // no ile zaten uygulanmışsa) stok artmadan maliyet artıyordu.
      const hareket = R.stokHareketiUygula(prev, {
        parcaId: girisModalId,
        tur: "Mal Alış",
        giris: adet,
        belgeNo: girisBelgeNo.trim(),
        kullanici: girisKullanici.trim(),
        aciklama: `Birim fiyat: ${R.tl(fiyat)}`,
      });
      if (hareket.durum === "zaten-uygulandi") {
        R.bildirimGoster("Bu belge numarasıyla bu ürün için stok girişi zaten yapılmış.", "uyari");
        return prev;
      }
      if (hareket.durum !== "uygulandi") {
        R.bildirimGoster("Stok girişi uygulanamadı.", "hata");
        return prev;
      }
      const yeni = hareket.db;
      const yeniOrtalama = R.agirlikliOrtalamaMaliyetHesapla(parca.stok, parca.ortalamaMaliyet, adet, fiyat);
      return {
        ...yeni,
        parcalar: yeni.parcalar.map((p) =>
          p.id === girisModalId
            ? {
                ...p,
                sonAlisFiyati: fiyat,
                ortalamaMaliyet: Math.round(yeniOrtalama * 100) / 100,
                alisGecmisi: [{ id: R.yeniId("g"), tarih: R.zamanDamgasi(), adet, birimFiyat: fiyat }, ...(p.alisGecmisi || [])],
              }
            : p
        ),
      };
    });
    R.sonKullaniciAdiKaydet(girisKullanici);
    R.bildirimGoster("Stok girişi işlendi, ortalama maliyet güncellendi.", "basari");
    setGirisModalId(null);
  };

  // --- Stok Düzeltme (sayım, fire, manuel giriş/çıkış, alış iadesi) -------
  // Stok adedi HİÇBİR yerde doğrudan yazılamaz; her düzeltme burada bir
  // sebep seçilerek ve zorunlu bir açıklama girilerek hareket olarak kaydedilir.
  const duzeltmeModaliAc = (p) => {
    setDuzeltmeModalId(p.id);
    setDuzeltmeYon("giris");
    setDuzeltmeTur(R.STOK_GIRIS_TURLERI[0]);
    setDuzeltmeAdet("");
    setDuzeltmeBelgeNo("");
    setDuzeltmeKullanici(R.sonKullaniciAdi());
    setDuzeltmeAciklama("");
  };

  const duzeltmeKaydet = () => {
    if (!R.yetkiVarMi(db, aktifKullanici, "stokDuzeltebilir")) {
      R.bildirimGoster("Stok düzeltme yetkiniz yok.", "hata");
      return;
    }
    const adet = parseFloat(duzeltmeAdet);
    if (!adet || adet <= 0) {
      R.bildirimGoster("Geçerli bir adet girin.", "hata");
      return;
    }
    if (!duzeltmeAciklama.trim()) {
      R.bildirimGoster("Sebep / açıklama zorunludur.", "hata");
      return;
    }
    const parca = db.parcalar.find((p) => p.id === duzeltmeModalId);
    let engellendi = false;
    updateDb((prev) => {
      const hareket = R.stokHareketiUygula(prev, {
        parcaId: duzeltmeModalId,
        tur: duzeltmeTur,
        giris: duzeltmeYon === "giris" ? adet : 0,
        cikis: duzeltmeYon === "cikis" ? adet : 0,
        belgeNo: duzeltmeBelgeNo.trim(),
        kullanici: duzeltmeKullanici.trim(),
        aciklama: duzeltmeAciklama.trim(),
      });
      if (hareket.durum === "engellendi" || hareket.durum === "parca-yok") {
        engellendi = true;
        return prev;
      }
      const sonuc = hareket.db;
      return R.islemKaydet(sonuc, {
        kullaniciAdi: aktifKullanici?.adSoyad || duzeltmeKullanici.trim(),
        islemTuru: `Stok düzeltildi (${duzeltmeTur})`,
        aciklama: `${parca?.ad || duzeltmeModalId} — ${duzeltmeAciklama.trim()}`,
        eskiDeger: `${parca?.stok ?? "—"} ${parca?.birim || ""}`,
        yeniDeger: `${duzeltmeYon === "giris" ? "+" : "-"}${adet} ${parca?.birim || ""}`,
      });
    });
    if (engellendi) {
      R.bildirimGoster("Bu işlem stoğu eksiye düşürür — ayarlardan eksi stok izni açık değil.", "hata");
      return;
    }
    R.sonKullaniciAdiKaydet(duzeltmeKullanici);
    R.bildirimGoster("Stok düzeltmesi kaydedildi.", "basari");
    setDuzeltmeModalId(null);
  };

  const rafModaliAc = (p) => {
    setRafModalId(p.id);
    const konumlar = R.parcaRafListesi(p);
    setRafTransferKaynak(konumlar[0]?.kod || "");
    setRafTransferHedef("");
    setRafTransferAdet("");
    setRafTransferKullanici(R.sonKullaniciAdi());
  };

  const rafTransferiKaydet = () => {
    const adet = parseFloat(rafTransferAdet);
    if (!rafTransferKaynak) {
      R.bildirimGoster("Kaynak raf seçin.", "hata");
      return;
    }
    if (!rafTransferHedef.trim()) {
      R.bildirimGoster("Yeni raf adresini girin.", "hata");
      return;
    }
    if (rafTransferHedef.trim() === rafTransferKaynak) {
      R.bildirimGoster("Yeni raf, kaynak rafla aynı olamaz.", "hata");
      return;
    }
    if (!adet || adet <= 0) {
      R.bildirimGoster("Geçerli bir adet girin.", "hata");
      return;
    }
    let basarisiz = false;
    updateDb((prev) => {
      const sonuc = R.rafTransferiUygula(prev, {
        parcaId: rafModalId,
        eskiRaf: rafTransferKaynak,
        yeniRaf: rafTransferHedef,
        adet,
        kullanici: rafTransferKullanici.trim(),
      });
      if (!sonuc) {
        basarisiz = true;
        return prev;
      }
      return sonuc;
    });
    if (basarisiz) {
      R.bildirimGoster("Bu raftan bu kadar adet taşınamaz — kaynak raftaki adedi kontrol edin.", "hata");
      return;
    }
    R.sonKullaniciAdiKaydet(rafTransferKullanici);
    R.bildirimGoster("Raf taşıma kaydedildi.", "basari");
    setRafModalId(null);
  };

  const girisModalParca = girisModalId ? db.parcalar.find((p) => p.id === girisModalId) : null;
  const duzeltmeModalParca = duzeltmeModalId ? db.parcalar.find((p) => p.id === duzeltmeModalId) : null;
  const hareketlerParca = hareketlerAcikId ? db.parcalar.find((p) => p.id === hareketlerAcikId) : null;
  const gecmisParca = gecmisAcikId ? db.parcalar.find((p) => p.id === gecmisAcikId) : null;
  const tedarikciKarsilastirmaParca = tedarikciKarsilastirmaAcikId ? db.parcalar.find((p) => p.id === tedarikciKarsilastirmaAcikId) : null;
  const fiyatGecmisParca = fiyatGecmisAcikId ? db.parcalar.find((p) => p.id === fiyatGecmisAcikId) : null;
  const rafModalParca = rafModalId ? db.parcalar.find((p) => p.id === rafModalId) : null;

  const filtreli = db.parcalar
    .filter((p) => {
      if (durumFiltre === "aktif") return p.aktif !== false;
      if (durumFiltre === "pasif") return p.aktif === false;
      return true;
    })
    .filter((p) => (markaFiltre ? p.marka === markaFiltre : true))
    .filter((p) => (kategoriFiltre ? p.kategori === kategoriFiltre || p.anaKategori === kategoriFiltre : true))
    .filter((p) => {
      const q = ara.trim().toLowerCase();
      if (!q) return true;
      const qNorm = R.kodNormalize(ara);
      return (
        p.ad.toLowerCase().includes(q) ||
        (p.stokKodu || "").toLowerCase().includes(q) ||
        R.parcaTumBarkodlari(p).some((b) => b.toLowerCase().includes(q)) ||
        (p.ureticiKodu || "").toLowerCase().includes(q) ||
        (p.marka || "").toLowerCase().includes(q) ||
        (p.kategori || "").toLowerCase().includes(q) ||
        (qNorm.length > 0 && db.kodlar.some((k) => k.parcaId === p.id && R.kodNormalize(k.kod).includes(qNorm)))
      );
    });

  const kritikSayisi = db.parcalar.filter((p) => p.aktif !== false && p.stok <= p.kritikSeviye).length;

  // --- Form içindeki canlı fiyatlandırma/kâr hesapları --------------------
  // Düzenlenen ürün varsa gerçek (izlenen) ortalama maliyeti, yeni ürün
  // oluşturuluyorsa henüz kaydedilmemiş "Alış Fiyatı" girişini taban alır.
  const duzenlenenParca = duzenlenenId && duzenlenenId !== "yeni" ? db.parcalar.find((p) => p.id === duzenlenenId) : null;
  const formMaliyet = duzenlenenParca ? R.gecerliMaliyet(duzenlenenParca) : parseFloat(form.alisFiyati) || 0;
  const formKdvOrani = parseFloat(form.kdvOrani) || 0;
  const formSatisFiyati = parseFloat(form.satisFiyati) || 0;
  const formSatisFiyatiNet = formSatisFiyati / (1 + formKdvOrani / 100);
  const formKarTutari = formSatisFiyatiNet - formMaliyet;
  const formKarOraniMarkup = formMaliyet > 0 ? (formKarTutari / formMaliyet) * 100 : null;
  const formKarOraniMargin = formSatisFiyatiNet > 0 ? (formKarTutari / formSatisFiyatiNet) * 100 : null;
  const formTavsiyeFiyat = R.tavsiyeFiyatHesapla(formMaliyet, formKdvOrani, hedefTuru, hedefDeger);
  const formIskontoOrani = formTavsiyeFiyat > 0 ? ((formTavsiyeFiyat - formSatisFiyati) / formTavsiyeFiyat) * 100 : null;
  const sonFiyatTarihi = duzenlenenParca?.fiyatGecmisi?.[0]?.tarih;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <R.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
          <input
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Ürün adı, stok kodu, barkod, marka, OEM/muadil kod ara…"
            className="w-full pl-9 pr-3 py-2 rounded-md border text-sm outline-none"
            style={{ borderColor: R.T.steel300 }}
          />
        </div>
        <select
          value={markaFiltre}
          onChange={(e) => setMarkaFiltre(e.target.value)}
          className="px-2 py-2 rounded-md border text-sm outline-none bg-white"
          style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
        >
          <option value="">Tüm Markalar</option>
          {db.markalar
            .filter((m) => m.aktif !== false)
            .map((m) => (
              <option key={m.id} value={m.ad}>
                {m.ad}
              </option>
            ))}
        </select>
        <select
          value={kategoriFiltre}
          onChange={(e) => setKategoriFiltre(e.target.value)}
          className="px-2 py-2 rounded-md border text-sm outline-none bg-white"
          style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
        >
          <option value="">Tüm Kategoriler</option>
          {db.kategoriler
            .filter((k) => k.aktif !== false)
            .map((k) => (
              <option key={k.id} value={k.ad}>
                {k.ustKategoriId ? `— ${k.ad}` : k.ad}
              </option>
            ))}
        </select>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
            {[
              { id: "aktif", ad: "Aktif" },
              { id: "pasif", ad: "Pasif" },
              { id: "tumu", ad: "Tümü" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDurumFiltre(d.id)}
                className="px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: durumFiltre === d.id ? R.T.graphite900 : "#fff",
                  color: durumFiltre === d.id ? "#fff" : R.T.ink500,
                }}
              >
                {d.ad}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAyarlarAcik(true)}
            title="Stok Ayarları"
            className="flex items-center justify-center w-9 h-9 rounded-md shrink-0"
            style={{ border: `1px solid ${R.T.steel300}`, color: R.T.ink500 }}
          >
            <R.Settings size={15} />
          </button>
          <R.Buton
            variant="ghost"
            onClick={() => {
              setTopluFotoSonuc(null);
              setTopluFotoAcik(true);
            }}
          >
            <R.ImageIcon size={15} /> Toplu Fotoğraf Yükle
          </R.Buton>
          <R.Buton onClick={() => formuAc(null)}>
            <R.Plus size={15} /> Yeni Ürün Kartı
          </R.Buton>
        </div>
      </div>

      {topluFotoAcik && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setTopluFotoAcik(false)}
        >
          <div className="w-full max-w-lg rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Toplu Fotoğraf Yükle
              </h3>
              <button onClick={() => setTopluFotoAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Dosya adlarında geçen stok kodları otomatik okunur ve ilgili ürüne "Ana Ürün" fotoğrafı olarak eklenir. ör.{" "}
              <span style={R.MONO}>MANN-HU7197X.jpg</span> → stok kodu "HU7197X" (veya benzeri) içeren ürüne bağlanır.
            </p>
            <R.Buton onClick={() => topluFotoInputRef.current?.click()}>
              <R.ImageIcon size={15} /> Dosyaları Seç
            </R.Buton>
            <input ref={topluFotoInputRef} type="file" accept="image/*" multiple onChange={topluFotoYukle} className="hidden" />
            {topluFotoSonuc && (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: R.T.green }}>
                    Eşleşen ve eklenen ({topluFotoSonuc.eslesen.length})
                  </p>
                  {topluFotoSonuc.eslesen.map((x, i) => (
                    <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      {x.dosyaAdi} → {x.ad}
                    </div>
                  ))}
                </div>
                {topluFotoSonuc.eslesmeyen.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: R.T.red }}>
                      Eşleşmeyen ({topluFotoSonuc.eslesmeyen.length})
                    </p>
                    {topluFotoSonuc.eslesmeyen.map((ad, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: "#F9DEDE", color: R.T.red }}>
                        {ad}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {ayarlarAcik && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setAyarlarAcik(false)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Ayarları
              </h3>
              <button onClick={() => setAyarlarAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={db.ayarlar.eksiStokIzni}
                onChange={(e) =>
                  updateDb((prev) => ({ ...prev, ayarlar: { ...prev.ayarlar, eksiStokIzni: e.target.checked } }))
                }
                className="mt-0.5"
              />
              <span>
                <span className="font-medium" style={{ color: R.T.ink900 }}>
                  Eksi Stok İzni
                </span>
                <p className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                  Kapalıyken (önerilen), mevcut stoktan fazla satış veya stok çıkışı engellenir. Açarsanız stok
                  eksiye düşebilir — sadece özel durumlarda önerilir.
                </p>
              </span>
            </label>
          </div>
        </div>
      )}

      {kritikSayisi > 0 && (
        <div
          className="px-4 py-2.5 rounded-md flex items-center gap-2 text-sm"
          style={{ background: "#F9DEDE", color: R.T.red }}
        >
          <R.AlertTriangle size={15} />
          {kritikSayisi} ürün minimum stok seviyesinin altında veya tükenmiş.
        </div>
      )}

      <UrunListesi
        db={db}
        aktifKullanici={aktifKullanici}
        filtreli={filtreli}
        onDuzenle={formuAc}
        onSil={setSilinecek}
        onAktifPasif={aktifPasifDegistir}
        onKod={setKodModalId}
        onBarkod={setBarkodModalId}
        onArac={setAracModalId}
        onDetay={setDetayModalId}
        onDetaySekme={setDetaySekme}
        onTedarikciKarsilastirma={setTedarikciKarsilastirmaAcikId}
        onAlisGecmisi={setGecmisAcikId}
        onFiyatGecmisi={setFiyatGecmisAcikId}
        onStokGirisi={girisModaliAc}
        onDuzeltme={duzeltmeModaliAc}
        onRaf={rafModaliAc}
        onHareketler={setHareketlerAcikId}
      />

      {formAcik && (
        <UrunFormu
          db={db}
          form={form}
          setForm={setForm}
          duzenlenenId={duzenlenenId}
          duzenlenenParca={duzenlenenParca}
          formuKapat={formuKapat}
          kaydet={kaydet}
          dosyaInputRef={dosyaInputRef}
          fotografSec={fotografSec}
          hedefTuru={hedefTuru}
          setHedefTuru={setHedefTuru}
          hedefDeger={hedefDeger}
          setHedefDeger={setHedefDeger}
          formMaliyet={formMaliyet}
          formKdvOrani={formKdvOrani}
          formSatisFiyati={formSatisFiyati}
          formSatisFiyatiNet={formSatisFiyatiNet}
          formKarTutari={formKarTutari}
          formKarOraniMarkup={formKarOraniMarkup}
          formKarOraniMargin={formKarOraniMargin}
          formTavsiyeFiyat={formTavsiyeFiyat}
          formIskontoOrani={formIskontoOrani}
          sonFiyatTarihi={sonFiyatTarihi}
        />
      )}

      <StokModallari
        db={db}
        updateDb={updateDb}
        aracAramaMetni={aracAramaMetni}
        aracAramaSonuclari={aracAramaSonuclari}
        aracModalParca={aracModalParca}
        barkodBirincilYap={barkodBirincilYap}
        barkodEkle={barkodEkle}
        barkodHata={barkodHata}
        barkodModalParca={barkodModalParca}
        barkodOtomatikUret={barkodOtomatikUret}
        barkodSil={barkodSil}
        duzeltmeAciklama={duzeltmeAciklama}
        duzeltmeAdet={duzeltmeAdet}
        duzeltmeBelgeNo={duzeltmeBelgeNo}
        duzeltmeKaydet={duzeltmeKaydet}
        duzeltmeKullanici={duzeltmeKullanici}
        duzeltmeModalParca={duzeltmeModalParca}
        duzeltmeTur={duzeltmeTur}
        duzeltmeYon={duzeltmeYon}
        fiyatGecmisParca={fiyatGecmisParca}
        formuAc={formuAc}
        gecmisParca={gecmisParca}
        girisAdet={girisAdet}
        girisBelgeNo={girisBelgeNo}
        girisFiyat={girisFiyat}
        girisKullanici={girisKullanici}
        girisModalParca={girisModalParca}
        girisPaketAdedi={girisPaketAdedi}
        girisPaketId={girisPaketId}
        girisiKaydet={girisiKaydet}
        hareketlerParca={hareketlerParca}
        kaydet={kaydet}
        kodEkle={kodEkle}
        kodHata={kodHata}
        kodModalKodlari={kodModalKodlari}
        kodModalParca={kodModalParca}
        kodSil={kodSil}
        rafModalParca={rafModalParca}
        rafTransferAdet={rafTransferAdet}
        rafTransferHedef={rafTransferHedef}
        rafTransferKaynak={rafTransferKaynak}
        rafTransferKullanici={rafTransferKullanici}
        rafTransferiKaydet={rafTransferiKaydet}
        setAracAramaMetni={setAracAramaMetni}
        setAracModalId={setAracModalId}
        setBarkodHata={setBarkodHata}
        setBarkodModalId={setBarkodModalId}
        setDuzeltmeAciklama={setDuzeltmeAciklama}
        setDuzeltmeAdet={setDuzeltmeAdet}
        setDuzeltmeBelgeNo={setDuzeltmeBelgeNo}
        setDuzeltmeModalId={setDuzeltmeModalId}
        setDuzeltmeTur={setDuzeltmeTur}
        setDuzeltmeYon={setDuzeltmeYon}
        setFiyatGecmisAcikId={setFiyatGecmisAcikId}
        setGecmisAcikId={setGecmisAcikId}
        setGirisAdet={setGirisAdet}
        setGirisBelgeNo={setGirisBelgeNo}
        setGirisFiyat={setGirisFiyat}
        setGirisModalId={setGirisModalId}
        setGirisPaketAdedi={setGirisPaketAdedi}
        setGirisPaketId={setGirisPaketId}
        setHareketlerAcikId={setHareketlerAcikId}
        setHedefDeger={setHedefDeger}
        setHedefTuru={setHedefTuru}
        setKodHata={setKodHata}
        setKodModalId={setKodModalId}
        setRafModalId={setRafModalId}
        setRafTransferAdet={setRafTransferAdet}
        setRafTransferHedef={setRafTransferHedef}
        setRafTransferKaynak={setRafTransferKaynak}
        setTedarikciKarsilastirmaAcikId={setTedarikciKarsilastirmaAcikId}
        setUyariModal={setUyariModal}
        setYeniBarkodDegeri={setYeniBarkodDegeri}
        setYeniKodDegeri={setYeniKodDegeri}
        setYeniKodTipi={setYeniKodTipi}
        setYeniUyumDurumu={setYeniUyumDurumu}
        tedarikciKarsilastirmaParca={tedarikciKarsilastirmaParca}
        uyariModal={uyariModal}
        uyumlulukDurumGuncelle={uyumlulukDurumGuncelle}
        uyumlulukEkle={uyumlulukEkle}
        uyumlulukSil={uyumlulukSil}
        yeniBarkodDegeri={yeniBarkodDegeri}
        yeniKodDegeri={yeniKodDegeri}
        yeniKodTipi={yeniKodTipi}
        yeniUyumDurumu={yeniUyumDurumu}
      />

      <UrunDetayPaneli
        db={db}
        updateDb={updateDb}
        buyukFotoUrl={buyukFotoUrl}
        detayModalParca={detayModalParca}
        dokumanEkle={dokumanEkle}
        dokumanInputRef={dokumanInputRef}
        dokumanSil={dokumanSil}
        fotoInputRef={fotoInputRef}
        fotoYukleniyor={fotoYukleniyor}
        fotografAnaYap={fotografAnaYap}
        fotografEkle={fotografEkle}
        fotografSil={fotografSil}
        fotografSiraDegistir={fotografSiraDegistir}
        gecmisAltGorunum={gecmisAltGorunum}
        setBuyukFotoUrl={setBuyukFotoUrl}
        setDetayModalId={setDetayModalId}
        setDetaySekme={setDetaySekme}
        setFotoYukleniyor={setFotoYukleniyor}
        setGecmisAltGorunum={setGecmisAltGorunum}
        setSilinecek={setSilinecek}
        setYeniDokumanTuru={setYeniDokumanTuru}
        setYeniFotoTuru={setYeniFotoTuru}
        sil={sil}
        silinecek={silinecek}
        yeniDokumanTuru={yeniDokumanTuru}
        yeniFotoTuru={yeniFotoTuru}
        detaySekme={detaySekme}
        setAracModalId={setAracModalId}
        setKodHata={setKodHata}
        setKodModalId={setKodModalId}
        setYeniKodDegeri={setYeniKodDegeri}
      />
    </div>
  );
}

export function HizliAramaSayfasi({ db, updateDb, sepet, setSepet, aktifKullanici }) {
  const [q, setQ] = R.useState("");
  const [detayId, setDetayId] = R.useState(null);
  const [gelismisAcik, setGelismisAcik] = R.useState(false);
  const [sayfa, setSayfa] = R.useState(1);
  const SAYFA_BASI = 50;
  const aramaRef = R.useRef(null);

  // --- Filtreler ---------------------------------------------------------------
  const [markaFiltre, setMarkaFiltre] = R.useState("");
  const [kategoriFiltre, setKategoriFiltre] = R.useState("");
  const [rafBolumuFiltre, setRafBolumuFiltre] = R.useState("");
  const [stokDurumFiltre, setStokDurumFiltre] = R.useState(""); // stokta|yok|kritik|fazla|negatif|rezerve|siparişte
  const [fiyatMin, setFiyatMin] = R.useState("");
  const [fiyatMax, setFiyatMax] = R.useState("");
  const [karFiltre, setKarFiltre] = R.useState(""); // maliyetAlti|minKarAlti|karMarjiAlti|fiyatGuncellenmemis
  const [karMarjiEsigi, setKarMarjiEsigi] = R.useState("10");
  const [satisPerfFiltre, setSatisPerfFiltre] = R.useState(""); // hicSatilmayan|cokSatan
  const [satisPerfGun, setSatisPerfGun] = R.useState("90");
  const [satisPerfAdet, setSatisPerfAdet] = R.useState("10");

  R.useEffect(() => {
    aramaRef.current?.focus();
  }, []);

  R.useEffect(() => {
    setSayfa(1);
  }, [q, markaFiltre, kategoriFiltre, rafBolumuFiltre, stokDurumFiltre, fiyatMin, fiyatMax, karFiltre, satisPerfFiltre]);

  // Metin araması VEYA herhangi bir filtre aktifse sonuç hesaplanır — böylece
  // sadece filtrelerle de ("Marka: MANN, Stok: >0" gibi) arama yapılabilir.
  const filtreAktifMi = markaFiltre || kategoriFiltre || rafBolumuFiltre || stokDurumFiltre || fiyatMin || fiyatMax || karFiltre || satisPerfFiltre;
  const temelSonuclar = q.trim() ? R.hizliAramaYap(db, q) : filtreAktifMi ? db.parcalar.filter((p) => p.aktif !== false) : [];

  const bugunIso = R.isoGun(new Date());
  const gunOnceIso = (gun) => new Date(Date.now() - gun * 86400000).toLocaleDateString("en-CA");

  const sonuclar = temelSonuclar.filter((p) => {
    if (markaFiltre && p.marka !== markaFiltre) return false;
    if (kategoriFiltre && p.kategori !== kategoriFiltre && p.anaKategori !== kategoriFiltre) return false;
    if (rafBolumuFiltre && !R.parcaRafListesi(p).some((r) => r.kod.toUpperCase().startsWith(rafBolumuFiltre.toUpperCase()))) return false;
    if (fiyatMin && p.satisFiyati < parseFloat(fiyatMin)) return false;
    if (fiyatMax && p.satisFiyati > parseFloat(fiyatMax)) return false;

    if (stokDurumFiltre === "stokta" && !(p.stok > 0)) return false;
    if (stokDurumFiltre === "yok" && !(p.stok <= 0)) return false;
    if (stokDurumFiltre === "kritik" && !(p.stok > 0 && p.stok <= p.kritikSeviye)) return false;
    if (stokDurumFiltre === "fazla" && !(R.gecerliHedefStok(p) > 0 && p.stok > R.gecerliHedefStok(p) * 1.5)) return false;
    if (stokDurumFiltre === "negatif" && !(p.stok < 0)) return false;
    if (stokDurumFiltre === "rezerve" && !(R.parcaRezerveAdedi(db, p.id) > 0)) return false;
    if (stokDurumFiltre === "sipariste" && !((p.siparisteAdet || 0) > 0)) return false;

    if (karFiltre === "maliyetAlti" && !(R.gecerliMaliyet(p) > 0 && p.satisFiyati < R.gecerliMaliyet(p))) return false;
    if (karFiltre === "minKarAlti" && !(p.minimumSatisFiyati > 0 && p.satisFiyati < p.minimumSatisFiyati)) return false;
    if (karFiltre === "karMarjiAlti") {
      const maliyet = R.gecerliMaliyet(p);
      if (!(maliyet > 0)) return false;
      const marj = ((p.satisFiyati - maliyet) / p.satisFiyati) * 100;
      if (!(marj < parseFloat(karMarjiEsigi))) return false;
    }
    if (karFiltre === "fiyatGuncellenmemis" && !(p.etiketSonYazdirmaFiyati !== null && Math.abs(p.etiketSonYazdirmaFiyati - p.satisFiyati) > 0.005)) return false;

    if (satisPerfFiltre === "hicSatilmayan") {
      const sonTarih = R.sonSatisTarihiBul(db, p.id);
      const gun = parseInt(satisPerfGun) || 90;
      if (sonTarih && Math.floor((Date.now() - new Date(sonTarih).getTime()) / 86400000) < gun) return false;
      if (!sonTarih) {
        // Hiç satılmamışsa da bu filtreye uyar — devam.
      }
    }
    if (satisPerfFiltre === "cokSatan") {
      const gun = parseInt(satisPerfGun) || 30;
      const esikAdet = parseInt(satisPerfAdet) || 10;
      if (R.sonNGunSatisAdedi(db, p.id, gun) < esikAdet) return false;
    }
    return true;
  });

  const sonuclarSayfali = sonuclar.slice((sayfa - 1) * SAYFA_BASI, sayfa * SAYFA_BASI);
  const toplamSayfa = Math.max(1, Math.ceil(sonuclar.length / SAYFA_BASI));

  const yakinOneriler = q.trim() && sonuclar.length === 0 ? R.yakinEslesmeOner(db, q) : [];

  const detayParca = detayId ? db.parcalar.find((p) => p.id === detayId) : null;

  const markalar = [...new Set<string>(db.parcalar.map((p) => p.marka).filter(Boolean) as string[])].sort();
  const kategoriler = [...new Set<string>(db.parcalar.flatMap((p) => [p.kategori, p.anaKategori]).filter(Boolean) as string[])].sort();

  const filtreleriTemizle = () => {
    setMarkaFiltre("");
    setKategoriFiltre("");
    setRafBolumuFiltre("");
    setStokDurumFiltre("");
    setFiyatMin("");
    setFiyatMax("");
    setKarFiltre("");
    setSatisPerfFiltre("");
  };

  // --- Arama geçmişi (personel bazlı) --------------------------------------------
  const aramaGecmisineEkle = (sorgu) => {
    if (!aktifKullanici || !sorgu.trim() || sorgu.trim().length < 2) return;
    updateDb((prev) => ({
      ...prev,
      kullanicilar: prev.kullanicilar.map((k) =>
        k.id === aktifKullanici.id ? { ...k, sonAramalar: [sorgu.trim(), ...(k.sonAramalar || []).filter((s) => s.toLowerCase() !== sorgu.trim().toLowerCase())].slice(0, 10) } : k
      ),
    }));
  };
  const aramaYap = (e) => {
    if (e.key === "Enter") aramaGecmisineEkle(q);
  };
  const gecmistenAra = (sorgu) => {
    setQ(sorgu);
    aramaRef.current?.focus();
  };

  const sepeteEkle = (p) => {
    setSepet((prev) => {
      const mevcut = prev.find((s) => s.parcaId === p.id);
      if (mevcut) return prev.map((s) => (s.parcaId === p.id ? { ...s, adet: s.adet + 1 } : s));
      return [...prev, { parcaId: p.id, adet: 1, birimFiyat: p.satisFiyati || 0, iskontoTuru: "tutar", iskontoDeger: 0 }];
    });
    R.bildirimGoster(`"${p.ad}" sepete eklendi.`, "basari");
  };

  const durumRozet = {
    var: { emoji: "🟢", etiket: "Stokta", renk: R.T.green },
    kritik: { emoji: "🟡", etiket: "Kritik Stok", renk: "#8A6110" },
    yok: { emoji: "🔴", etiket: "Stokta Yok", renk: R.T.red },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <R.Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
        <input
          ref={aramaRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={aramaYap}
          placeholder="Stok kodu, OEM, üretici kodu, muadil, barkod, ürün adı, marka, araç, kategori veya raf adresi yazın…"
          className="w-full pl-11 pr-4 py-3.5 rounded-lg border text-base outline-none focus:ring-2"
          style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
        />
      </div>

      {/* Arama geçmişi */}
      {!q.trim() && aktifKullanici?.sonAramalar?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
            Son Aramalar:
          </span>
          {aktifKullanici.sonAramalar.map((s, i) => (
            <button key={i} onClick={() => gecmistenAra(s)} className="text-xs px-2.5 py-1 rounded-full" style={{ background: R.T.steel100, color: R.T.ink900 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Filtreler */}
      <R.Kart className="p-3.5">
        <div className="flex flex-wrap items-end gap-2">
          <select value={markaFiltre} onChange={(e) => setMarkaFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
            <option value="">Tüm Markalar</option>
            {markalar.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select value={kategoriFiltre} onChange={(e) => setKategoriFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
            <option value="">Tüm Kategoriler</option>
            {kategoriler.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select value={stokDurumFiltre} onChange={(e) => setStokDurumFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
            <option value="">Tüm Stok Durumları</option>
            <option value="stokta">Stokta</option>
            <option value="yok">Stokta Yok</option>
            <option value="kritik">Kritik Stok</option>
            <option value="fazla">Fazla Stok</option>
            <option value="negatif">Negatif Stok</option>
            <option value="rezerve">Rezerve</option>
            <option value="sipariste">Siparişte</option>
          </select>
          <input value={rafBolumuFiltre} onChange={(e) => setRafBolumuFiltre(e.target.value)} placeholder="Raf bölümü (ör. A)" className="w-28 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
          <input type="number" value={fiyatMin} onChange={(e) => setFiyatMin(e.target.value)} placeholder="Min ₺" className="w-20 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
          <input type="number" value={fiyatMax} onChange={(e) => setFiyatMax(e.target.value)} placeholder="Maks ₺" className="w-20 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
          <button onClick={() => setGelismisAcik((v) => !v)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.orangeDark }}>
            Gelişmiş Filtreler {gelismisAcik ? "▲" : "▼"}
          </button>
          {filtreAktifMi && (
            <button onClick={filtreleriTemizle} className="text-xs font-semibold underline" style={{ color: R.T.ink500 }}>
              Temizle
            </button>
          )}
        </div>
        {gelismisAcik && (
          <div className="flex flex-wrap items-end gap-2 mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
            <select value={karFiltre} onChange={(e) => setKarFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
              <option value="">Fiyat/Kâr Filtresi Yok</option>
              <option value="maliyetAlti">Maliyetin Altında</option>
              <option value="minKarAlti">Minimum Kâr Altında</option>
              <option value="karMarjiAlti">Kâr Marjı %'in Altında</option>
              <option value="fiyatGuncellenmemis">Etiket Fiyatı Güncellenmemiş</option>
            </select>
            {karFiltre === "karMarjiAlti" && (
              <input type="number" value={karMarjiEsigi} onChange={(e) => setKarMarjiEsigi(e.target.value)} className="w-16 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
            )}
            <select value={satisPerfFiltre} onChange={(e) => setSatisPerfFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
              <option value="">Satış Performansı Filtresi Yok</option>
              <option value="hicSatilmayan">Son N Günde Hiç Satılmayan</option>
              <option value="cokSatan">Son N Günde X'ten Fazla Satan</option>
            </select>
            {satisPerfFiltre && (
              <>
                <input type="number" value={satisPerfGun} onChange={(e) => setSatisPerfGun(e.target.value)} placeholder="Gün" className="w-16 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                {satisPerfFiltre === "cokSatan" && (
                  <input type="number" value={satisPerfAdet} onChange={(e) => setSatisPerfAdet(e.target.value)} placeholder="Adet" className="w-16 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                )}
              </>
            )}
          </div>
        )}
      </R.Kart>

      {!q.trim() && !filtreAktifMi ? (
        <R.Kart>
          <R.Bos
            ikon={R.Zap}
            baslik="Aramaya başlayın"
            aciklama="Örn. 03L115562, 03L 115 562, 03L-115-562 — hepsi aynı sonucu getirir. Ürün adı, marka, araç veya raf adresiyle de arayabilir, ya da yukarıdan sadece filtre uygulayabilirsiniz."
          />
        </R.Kart>
      ) : sonuclar.length === 0 ? (
        <R.Kart>
          <R.Bos ikon={R.Search} baslik="Sonuç bulunamadı" aciklama="Farklı bir kod veya kelime deneyin." />
          {yakinOneriler.length > 0 && (
            <div className="px-5 pb-5 -mt-3">
              <p className="text-xs font-semibold mb-1.5" style={{ color: R.T.ink500 }}>
                Bunu mu demek istediniz?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {yakinOneriler.map((o) => (
                  <button key={o.parca.id} onClick={() => setQ(o.parca.stokKodu)} className="text-xs px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.orangeDark }}>
                    {o.parca.marka} {o.parca.ad} <strong>(%{o.yuzde})</strong>
                  </button>
                ))}
              </div>
            </div>
          )}
        </R.Kart>
      ) : (
        <>
          <p className="text-sm font-semibold" style={{ color: R.T.ink900 }}>
            {sonuclar.length} ürün bulundu.
          </p>
          <R.Kart className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2.5">Ürün</th>
                    <th className="text-left font-semibold px-3 py-2.5">Marka</th>
                    <th className="text-left font-semibold px-3 py-2.5">Kod</th>
                    <th className="text-left font-semibold px-3 py-2.5">OEM</th>
                    <th className="text-center font-semibold px-3 py-2.5">Stok</th>
                    <th className="text-center font-semibold px-3 py-2.5">Rezerve</th>
                    <th className="text-left font-semibold px-3 py-2.5">Raf</th>
                    <th className="text-right font-semibold px-3 py-2.5">Maliyet</th>
                    <th className="text-right font-semibold px-3 py-2.5">Satış</th>
                    <th className="text-right font-semibold px-3 py-2.5">Kâr</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                {sonuclarSayfali.map((p) => {
                  const durum = durumRozet[R.stokDurumuHesapla(p)];
                  const maliyet = R.gecerliMaliyet(p);
                  const kar = p.satisFiyati - maliyet;
                  const rezerve = R.parcaRezerveAdedi(db, p.id);
                  const oemler = db.kodlar.filter((k) => k.parcaId === p.id && k.tip === "OEM");
                  return (
                    <tr
                      key={p.id}
                      style={{ borderTop: `1px solid ${R.T.steel200}`, cursor: "pointer" }}
                      onClick={() => setDetayId(p.id)}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-3 py-3 font-medium" style={{ color: R.T.ink900 }}>
                        {p.ad}
                      </td>
                      <td className="px-3 py-3" style={{ color: R.T.ink900 }}>
                        {p.marka || "—"}
                      </td>
                      <td className="px-3 py-3" style={R.MONO}>
                        {p.stokKodu}
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                        {oemler.length === 0 ? "—" : oemler.length === 1 ? oemler[0].kod : `${oemler[0].kod} +${oemler.length - 1}`}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: durum.renk }}>
                          {durum.emoji} {p.stok} {p.birim}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs" style={{ color: rezerve > 0 ? "#8A6110" : R.T.ink500 }}>
                        {rezerve > 0 ? rezerve : "—"}
                      </td>
                      <td className="px-3 py-3 font-semibold text-xs" style={{ color: R.T.ink900 }}>
                        {R.parcaRafListesi(p).length === 0
                          ? "—"
                          : R.parcaRafListesi(p).length === 1
                          ? `📍 ${R.parcaRafListesi(p)[0].kod}`
                          : `📍 ${R.parcaRafListesi(p).length} konum`}
                      </td>
                      <td className="px-3 py-3 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                        {R.tl(maliyet)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ ...R.MONO, color: R.T.ink900 }}>
                        {R.tl(p.satisFiyati)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ ...R.MONO, color: kar >= 0 ? R.T.green : R.T.red }}>
                        {R.tl(kar)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sepeteEkle(p);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap"
                          style={{ background: R.T.orange, color: "#fff" }}
                        >
                          <R.ShoppingCart size={13} /> Satışa Ekle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {toplamSayfa > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs" style={{ color: R.T.ink500 }}>
                Sayfa {sayfa} / {toplamSayfa} — {SAYFA_BASI} sonuç/sayfa gösteriliyor (performans için tüm sonuçlar tek seferde işlenmez)
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setSayfa((s) => Math.max(1, s - 1))} disabled={sayfa === 1} className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: R.T.steel100, color: R.T.ink900, opacity: sayfa === 1 ? 0.4 : 1 }}>
                  Önceki
                </button>
                <button
                  onClick={() => setSayfa((s) => Math.min(toplamSayfa, s + 1))}
                  disabled={sayfa === toplamSayfa}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold"
                  style={{ background: R.T.steel100, color: R.T.ink900, opacity: sayfa === toplamSayfa ? 0.4 : 1 }}
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </R.Kart>
        </>
      )}

      <UrunDetayKarti
        db={db}
        detayParca={detayParca}
        setDetayId={setDetayId}
        sepeteEkle={sepeteEkle}
      />
    </div>
  );
}

