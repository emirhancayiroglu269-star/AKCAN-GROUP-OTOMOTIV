/* Stok module — extracted from the V16 monolith. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

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
        stokKodu: p.stokKodu || "",
        ad: p.ad || "",
        marka: p.marka || "",
        ureticiKodu: p.ureticiKodu || "",
        barkod: p.barkod || "",
        anaKategoriId: anaK?.id || "",
        altKategoriId: altK?.id || "",
        kategoriOzelDegerler: p.kategoriOzelDegerler || {},
        birim: p.birim || "Adet",
        kdvOrani: p.kdvOrani ?? 20,
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
    okuyucu.onload = (ev) => setForm((f) => ({ ...f, fotograf: ev.target.result }));
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
          }) || prev
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
    const dosyalar = Array.from(e.target.files || []);
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
    const dosyalar = Array.from(e.target.files || []);
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
          resolve({ id: R.yeniId("dk"), url: ev.target.result, ad: dosya.name, tur: yeniDokumanTuru, dosyaAdi: dosya.name, boyutKb: Math.round(dosya.size / 1024), tarih: R.zamanDamgasi() });
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
    const dosyalar = Array.from(e.target.files || []);
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
      const yeniOrtalama = R.agirlikliOrtalamaMaliyetHesapla(parca.stok, parca.ortalamaMaliyet, adet, fiyat);
      const guncellenmisParcalar = prev.parcalar.map((p) =>
        p.id === girisModalId
          ? {
              ...p,
              sonAlisFiyati: fiyat,
              ortalamaMaliyet: Math.round(yeniOrtalama * 100) / 100,
              alisGecmisi: [{ id: R.yeniId("g"), tarih: R.zamanDamgasi(), adet, birimFiyat: fiyat }, ...(p.alisGecmisi || [])],
            }
          : p
      );
      return R.stokHareketiUygula(
        { ...prev, parcalar: guncellenmisParcalar },
        {
          parcaId: girisModalId,
          tur: "Mal Alış",
          giris: adet,
          belgeNo: girisBelgeNo.trim(),
          kullanici: girisKullanici.trim(),
          aciklama: `Birim fiyat: ${R.tl(fiyat)}`,
        }
      ) || { ...prev, parcalar: guncellenmisParcalar };
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
      const sonuc = R.stokHareketiUygula(prev, {
        parcaId: duzeltmeModalId,
        tur: duzeltmeTur,
        giris: duzeltmeYon === "giris" ? adet : 0,
        cikis: duzeltmeYon === "cikis" ? adet : 0,
        belgeNo: duzeltmeBelgeNo.trim(),
        kullanici: duzeltmeKullanici.trim(),
        aciklama: duzeltmeAciklama.trim(),
      });
      if (!sonuc) {
        engellendi = true;
        return prev;
      }
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

      {filtreli.length === 0 ? (
        <R.Kart>
          <R.Bos
            ikon={R.Package}
            baslik={db.parcalar.length === 0 ? "Henüz ürün kartı yok" : "Sonuç bulunamadı"}
            aciklama={
              db.parcalar.length === 0
                ? "İlk ürün kartınızı oluşturarak başlayın."
                : "Arama veya filtre kriterlerinizi değiştirmeyi deneyin."
            }
          />
        </R.Kart>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtreli.map((p) => {
            const maliyet = R.gecerliMaliyet(p);
            const kar = R.karTutariHesapla(p);
            const marginYuzde = R.karOraniMargin(p);
            const kritik = p.stok <= p.kritikSeviye;
            return (
              <R.Kart key={p.id} className="p-4 flex flex-col gap-3" style={{ opacity: p.aktif === false ? 0.55 : 1 }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ background: R.T.steel100 }}
                  >
                    {p.fotograf ? (
                      <img src={p.fotograf} alt={p.ad} className="w-full h-full object-cover" />
                    ) : (
                      <R.ImageIcon size={18} style={{ color: R.T.ink500 }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate" style={{ color: R.T.ink900 }}>
                        {p.ad}
                      </span>
                      {p.aktif === false && <R.Rozet tone="steel">Pasif</R.Rozet>}
                      {kritik && p.aktif !== false && <R.Rozet tone="red">Kritik</R.Rozet>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ ...R.MONO, color: R.T.ink500 }}>
                      {p.stokKodu} {p.marka && `· ${p.marka}`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div style={{ color: R.T.ink500 }}>Stok</div>
                  <div className="text-right font-semibold" style={{ ...R.MONO, color: kritik ? R.T.red : R.T.ink900 }}>
                    {p.stok} {p.birim}
                  </div>
                  <div style={{ color: R.T.ink500 }}>Raf</div>
                  <div className="text-right font-semibold" style={{ ...R.MONO, color: R.T.ink900 }}>
                    {R.parcaRafListesi(p).length === 0
                      ? "—"
                      : R.parcaRafListesi(p).length === 1
                      ? `📍 ${R.parcaRafListesi(p)[0].kod}`
                      : `📍 ${R.parcaRafListesi(p).length} konum`}
                  </div>
                  {R.yetkiVarMi(db, aktifKullanici, "maliyetiGorebilir") && (
                    <>
                      <div style={{ color: R.T.ink500 }}>Ortalama Maliyet</div>
                      <div className="text-right" style={R.MONO}>
                        {R.tl(p.ortalamaMaliyet)}
                      </div>
                    </>
                  )}
                  <div style={{ color: R.T.ink500 }}>Satış Fiyatı</div>
                  <div className="text-right font-semibold" style={{ ...R.MONO, color: R.T.ink900 }}>
                    {R.tl(p.satisFiyati)}
                  </div>
                  {R.yetkiVarMi(db, aktifKullanici, "karOraniniGorebilir") && (
                    <>
                      <div style={{ color: R.T.ink500 }}>Kâr Marjı</div>
                      <div className="text-right font-semibold" style={{ ...R.MONO, color: kar >= 0 ? R.T.green : R.T.red }}>
                        {R.tl(kar)} {marginYuzde !== null && `(%${marginYuzde.toFixed(1)})`}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-2 mt-auto flex-wrap" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                  <button
                    onClick={() => girisModaliAc(p)}
                    title="Stok Girişi (Mal Alış — fiyat/maliyet güncelle)"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.green }}
                  >
                    <R.TrendingUp size={13} /> Stok Girişi
                  </button>
                  <button
                    onClick={() => rafModaliAc(p)}
                    title="Raf Değiştir / Konumları Yönet"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.orangeDark }}
                  >
                    <R.MapPin size={13} /> Raf
                  </button>
                  <button
                    onClick={() => duzeltmeModaliAc(p)}
                    title="Stok Düzeltme (sayım, fire, iade, manuel giriş/çıkış)"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.orangeDark }}
                  >
                    <R.ArrowUpDown size={13} /> Düzeltme
                  </button>
                  {db.stokHareketleri.some((h) => h.parcaId === p.id) && (
                    <button
                      onClick={() => setHareketlerAcikId(p.id)}
                      title="Tüm stok hareketleri"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ color: R.T.ink500 }}
                    >
                      <R.ListOrdered size={13} />
                    </button>
                  )}
                  {p.alisGecmisi?.some((g) => g.tedarikci) && (
                    <button
                      onClick={() => setTedarikciKarsilastirmaAcikId(p.id)}
                      title="Bu ürünü kimlerden aldım?"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ color: R.T.ink500 }}
                    >
                      <R.Building2 size={13} />
                    </button>
                  )}
                  {p.alisGecmisi?.length > 0 && (
                    <button
                      onClick={() => setGecmisAcikId(p.id)}
                      title="Alış / maliyet geçmişi"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ color: R.T.ink500 }}
                    >
                      <R.History size={13} />
                    </button>
                  )}
                  {p.fiyatGecmisi?.length > 0 && (
                    <button
                      onClick={() => setFiyatGecmisAcikId(p.id)}
                      title="Satış fiyatı geçmişi"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ color: R.T.ink500 }}
                    >
                      <R.Tag size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setKodModalId(p.id);
                      setYeniKodDegeri("");
                      setKodHata("");
                    }}
                    title="OEM / Muadil kodları yönet"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.ink500 }}
                  >
                    <R.GitCompare size={13} />
                    {db.kodlar.filter((k) => k.parcaId === p.id).length > 0 &&
                      `(${db.kodlar.filter((k) => k.parcaId === p.id).length})`}
                  </button>
                  <button
                    onClick={() => setBarkodModalId(p.id)}
                    title="Barkodları yönet"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.parcaTumBarkodlari(p).length === 0 ? R.T.red : R.T.ink500 }}
                  >
                    <R.ScanLine size={13} />
                    {R.parcaTumBarkodlari(p).length > 0 ? `(${R.parcaTumBarkodlari(p).length})` : "Yok"}
                  </button>
                  <button
                    onClick={() => setAracModalId(p.id)}
                    title="Uyumlu araçları yönet"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.ink500 }}
                  >
                    <R.Car size={13} />
                    {R.parcaUyumluAraclari(db, p.id).length > 0 && `(${R.parcaUyumluAraclari(db, p.id).length})`}
                  </button>
                  <button
                    onClick={() => {
                      setDetayModalId(p.id);
                      setDetaySekme("fotograf");
                    }}
                    title="Fotoğraf, doküman ve tüm detaylar"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.ink500 }}
                  >
                    <R.ImageIcon size={13} />
                    {(p.fotograflar?.length || 0) + (p.dokumanlar?.length || 0) > 0 && `(${(p.fotograflar?.length || 0) + (p.dokumanlar?.length || 0)})`}
                  </button>
                  {p.etiketSonYazdirmaFiyati !== null && Math.abs(p.etiketSonYazdirmaFiyati - p.satisFiyati) > 0.005 && (
                    <span title="Etiket fiyatı güncel değil" className="text-xs font-semibold" style={{ color: R.T.red }}>
                      ⚠️ Etiket eski
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => aktifPasifDegistir(p)} title={p.aktif === false ? "Aktif yap" : "Pasif yap"} style={{ color: R.T.ink500 }}>
                      {p.aktif === false ? <R.Eye size={15} /> : <R.EyeOff size={15} />}
                    </button>
                    <button onClick={() => formuAc(p)} title="Düzenle" style={{ color: R.T.ink500 }}>
                      <R.Pencil size={15} />
                    </button>
                    <button onClick={() => setSilinecek(p)} title="Sil" style={{ color: R.T.red }}>
                      <R.Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </R.Kart>
            );
          })}
        </div>
      )}

      {/* Ürün kartı ekle/düzenle formu */}
      {formAcik && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={formuKapat}
        >
          <div
            className="w-full max-w-2xl rounded-lg p-5"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {duzenlenenId === "yeni" ? "Yeni Ürün Kartı" : "Ürün Kartını Düzenle"}
              </h3>
              <button onClick={formuKapat} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: R.T.steel100 }}
                >
                  {form.fotograf ? (
                    <img src={form.fotograf} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <R.ImageIcon size={20} style={{ color: R.T.ink500 }} />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => dosyaInputRef.current?.click()}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ border: `1px solid ${R.T.steel300}`, color: R.T.ink900 }}
                  >
                    Fotoğraf Seç
                  </button>
                  {form.fotograf && (
                    <button
                      onClick={() => setForm((f) => ({ ...f, fotograf: "" }))}
                      className="text-xs"
                      style={{ color: R.T.red }}
                    >
                      Kaldır
                    </button>
                  )}
                  <input ref={dosyaInputRef} type="file" accept="image/*" onChange={fotografSec} className="hidden" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Stok Kodu *" value={form.stokKodu} onChange={(e) => setForm({ ...form, stokKodu: e.target.value })} placeholder="ör. FLT-2201" />
                <R.Girdi
                  label={duzenlenenId === "yeni" ? "Barkod" : "Birincil Barkod (salt okunur — 'Barkodlar' düğmesinden yönetin)"}
                  value={form.barkod}
                  onChange={(e) => duzenlenenId === "yeni" && setForm({ ...form, barkod: e.target.value })}
                  placeholder="ör. 8690000000001"
                  readOnly={duzenlenenId !== "yeni"}
                  style={duzenlenenId !== "yeni" ? { background: R.T.steel100 } : undefined}
                />
                <div className="col-span-2">
                  <R.Girdi label="Ürün Adı *" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="ör. Yağ Filtresi" />
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium" style={{ color: R.T.ink500 }}>
                    Ürün Markası
                  </span>
                  <input
                    list="marka-listesi"
                    value={form.marka}
                    onChange={(e) => setForm({ ...form, marka: e.target.value })}
                    placeholder="ör. Bosch"
                    className="px-3 py-2 rounded-md border text-sm outline-none"
                    style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  />
                  <datalist id="marka-listesi">
                    {db.markalar.filter((m) => m.aktif !== false).map((m) => (
                      <option key={m.id} value={m.ad} />
                    ))}
                  </datalist>
                </label>
                <R.Girdi label="Üretici Parça Kodu" value={form.ureticiKodu} onChange={(e) => setForm({ ...form, ureticiKodu: e.target.value })} placeholder="ör. 0451103316" />
                <R.Secim
                  label="Ana Kategori"
                  value={form.anaKategoriId}
                  onChange={(e) => setForm({ ...form, anaKategoriId: e.target.value, altKategoriId: "", kategoriOzelDegerler: {} })}
                >
                  <option value="">Seçin…</option>
                  {R.anaKategoriler(db).filter((k) => k.aktif !== false).map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ad}
                    </option>
                  ))}
                </R.Secim>
                <R.Secim
                  label="Alt Kategori"
                  value={form.altKategoriId}
                  onChange={(e) => setForm({ ...form, altKategoriId: e.target.value, kategoriOzelDegerler: {} })}
                  disabled={!form.anaKategoriId}
                >
                  <option value="">{form.anaKategoriId ? "(Yok / doğrudan ana kategori)" : "Önce ana kategori seçin"}</option>
                  {form.anaKategoriId &&
                    R.altKategoriler(db, form.anaKategoriId)
                      .filter((k) => k.aktif !== false)
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.ad}
                        </option>
                      ))}
                </R.Secim>
                <R.Secim label="Birim" value={form.birim} onChange={(e) => setForm({ ...form, birim: e.target.value })}>
                  {R.BIRIMLER.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </R.Secim>
                <R.Secim label="KDV Oranı" value={form.kdvOrani} onChange={(e) => setForm({ ...form, kdvOrani: e.target.value })}>
                  {R.KDV_ORANLARI.map((k) => (
                    <option key={k} value={k}>
                      %{k}
                    </option>
                  ))}
                </R.Secim>
                <R.Secim
                  label="Ürün Tipi"
                  value={form.urunTipi}
                  onChange={(e) => setForm({ ...form, urunTipi: e.target.value })}
                  hint="Set: birden fazla ürünün tek satış paketi — kendi stoğu yoktur, satılınca bileşenlerinin stoğu düşer. Bunu OEM/Muadil ile karıştırmayın; muadil aynı ihtiyacı karşılayan farklı bir markanın kendi ürünüdür."
                >
                  {R.URUN_TIPLERI.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </R.Secim>
                {(() => {
                  const seciliKategori = db.kategoriler.find((k) => k.id === (form.altKategoriId || form.anaKategoriId));
                  const ozelAlanlar = seciliKategori ? R.kategoriOzelAlanlari(db, seciliKategori) : [];
                  if (ozelAlanlar.length === 0) return null;
                  return (
                    <div className="col-span-2 grid grid-cols-2 gap-3 p-3 rounded-md" style={{ background: R.T.steel100 }}>
                      <span className="col-span-2 text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                        {seciliKategori.ad} — Özel Alanlar
                      </span>
                      {ozelAlanlar.map((oa) => (
                        <R.Girdi
                          key={oa.id}
                          label={oa.ad}
                          type={oa.tip === "sayi" ? "number" : "text"}
                          value={form.kategoriOzelDegerler[oa.ad] || ""}
                          onChange={(e) => setForm({ ...form, kategoriOzelDegerler: { ...form.kategoriOzelDegerler, [oa.ad]: e.target.value } })}
                        />
                      ))}
                    </div>
                  );
                })()}
                {form.urunTipi === "Set" && <R.SetBilesenYoneticisi db={db} form={form} setForm={setForm} />}
                {form.urunTipi === "Basit" && <R.PaketBirimYoneticisi form={form} setForm={setForm} />}
                <R.Girdi
                  label="Ana Raf (Bölüm-Raf-Göz)"
                  value={form.rafAdresi}
                  onChange={(e) => setForm({ ...form, rafAdresi: e.target.value.toUpperCase() })}
                  placeholder="ör. A-01-03"
                  hint="Ürün birden fazla rafta tutuluyorsa, kartındaki 'Raf' butonundan konum ekleyip taşıma yapabilirsiniz."
                />
                <R.Girdi
                  label={duzenlenenId === "yeni" ? "Alış Fiyatı (KDV Hariç) *" : "Alış Fiyatı (KDV Hariç, referans)"}
                  type="number"
                  value={form.alisFiyati}
                  onChange={(e) => setForm({ ...form, alisFiyati: e.target.value })}
                  placeholder="0.00"
                  hint={duzenlenenId !== "yeni" ? "Ortalama maliyet 'Stok Girişi' ile otomatik güncellenir." : undefined}
                />
                <R.Girdi
                  label="Perakende Satış Fiyatı (KDV Dahil) *"
                  type="number"
                  value={form.satisFiyati}
                  onChange={(e) => setForm({ ...form, satisFiyati: e.target.value })}
                  placeholder="0.00"
                />
                {duzenlenenId !== "yeni" && parseFloat(form.satisFiyati) !== db.parcalar.find((p) => p.id === duzenlenenId)?.satisFiyati && (
                  <R.Secim label="Fiyat Değişikliği Nedeni" value={form.fiyatDegisimNedeni} onChange={(e) => setForm({ ...form, fiyatDegisimNedeni: e.target.value })}>
                    <option value="">Belirtilmedi</option>
                    {R.FIYAT_DEGISIM_NEDENLERI.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </R.Secim>
                )}
                <R.Girdi
                  label="Minimum Satış Fiyatı (KDV Dahil)"
                  type="number"
                  value={form.minimumSatisFiyati}
                  onChange={(e) => setForm({ ...form, minimumSatisFiyati: e.target.value })}
                  placeholder="0.00"
                  hint="Satış ekranında bu fiyatın altına inilirse yönetici onayı istenir."
                />
                {duzenlenenId === "yeni" && (
                  <R.Girdi
                    label="Başlangıç Stoğu"
                    type="number"
                    value={form.stok}
                    onChange={(e) => setForm({ ...form, stok: e.target.value })}
                    placeholder="0"
                    hint="Girilen alış fiyatıyla ilk maliyet kaydı otomatik oluşur."
                  />
                )}
                <R.Girdi
                  label="Minimum Stok"
                  type="number"
                  value={form.kritikSeviye}
                  onChange={(e) => setForm({ ...form, kritikSeviye: e.target.value })}
                  placeholder="0"
                />
                <R.Girdi
                  label="Hedef Stok"
                  type="number"
                  value={form.hedefStok}
                  onChange={(e) => setForm({ ...form, hedefStok: e.target.value })}
                  placeholder="0"
                  hint="Sipariş önerisi bu seviyeye tamamlanacak şekilde hesaplanır."
                />
                <R.Girdi
                  label="Güvenlik Stoğu"
                  type="number"
                  value={form.guvenlikStogu}
                  onChange={(e) => setForm({ ...form, guvenlikStogu: e.target.value })}
                  placeholder="0"
                  hint="Satışlar artınca sipariş önerisi bu seviyenin altına düşürmeyecek şekilde hesaplanır."
                />
                <R.Girdi
                  label="Siparişteki Adet"
                  type="number"
                  value={form.siparisteAdet}
                  onChange={(e) => setForm({ ...form, siparisteAdet: e.target.value })}
                  placeholder="0"
                  hint="Yolda olan, henüz gelmemiş sipariş adedi."
                />
                <R.Girdi
                  label="Tedarikçi"
                  value={form.tedarikci}
                  onChange={(e) => setForm({ ...form, tedarikci: e.target.value })}
                  placeholder="ör. Eryaz Otomotiv"
                />
                <label className="flex items-center gap-2 text-sm mt-6">
                  <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                  <span style={{ color: R.T.ink900 }}>Aktif</span>
                </label>
              </div>

              {/* Fiyatlandırma ve Kâr özeti — canlı hesaplanır */}
              <div className="rounded-md p-3.5" style={{ background: R.T.steel100 }}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Fiyatlandırma ve Kâr
                  </span>
                  {sonFiyatTarihi && (
                    <span className="text-xs" style={{ color: R.T.ink500 }}>
                      Son fiyat değişikliği: {R.tarihGoster(sonFiyatTarihi)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <div style={{ color: R.T.ink500 }}>KDV Hariç Maliyet</div>
                    <div className="font-semibold" style={R.MONO}>
                      {R.tl(formMaliyet)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>KDV Dahil Maliyet</div>
                    <div className="font-semibold" style={R.MONO}>
                      {R.tl(formMaliyet * (1 + formKdvOrani / 100))}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>Kâr Tutarı (TL)</div>
                    <div className="font-semibold" style={{ ...R.MONO, color: formKarTutari >= 0 ? R.T.green : R.T.red }}>
                      {R.tl(formKarTutari)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>Maliyete Göre Kâr Oranı</div>
                    <div className="font-semibold" style={R.MONO}>
                      {formKarOraniMarkup !== null ? `%${formKarOraniMarkup.toFixed(1)}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>Satış Üzerinden Kâr Marjı</div>
                    <div className="font-semibold" style={R.MONO}>
                      {formKarOraniMargin !== null ? `%${formKarOraniMargin.toFixed(1)}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>İskonto Oranı (tavsiyeye göre)</div>
                    <div className="font-semibold" style={R.MONO}>
                      {formIskontoOrani !== null ? `%${formIskontoOrani.toFixed(1)}` : "—"}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5" style={{ borderTop: `1px solid ${R.T.steel300}` }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Hedef Kâr Oranı ile Fiyat Öner
                  </span>
                  <div className="flex flex-wrap items-end gap-2 mt-1.5">
                    <select
                      value={hedefTuru}
                      onChange={(e) => setHedefTuru(e.target.value)}
                      className="px-2 py-2 rounded-md border text-xs outline-none bg-white"
                      style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    >
                      <option value="markup">Maliyete Göre (Markup)</option>
                      <option value="margin">Satış Üzerinden (Margin)</option>
                    </select>
                    <input
                      type="number"
                      value={hedefDeger}
                      onChange={(e) => setHedefDeger(e.target.value)}
                      className="w-20 px-2 py-2 rounded-md border text-sm outline-none"
                      style={{ borderColor: R.T.steel300, ...R.MONO }}
                      placeholder="30"
                    />
                    <span className="text-sm" style={{ color: R.T.ink500 }}>
                      %
                    </span>
                    <div className="flex-1 min-w-[140px] text-sm">
                      <span style={{ color: R.T.ink500 }}>Tavsiye Fiyat: </span>
                      <span className="font-semibold" style={R.MONO}>
                        {R.tl(formTavsiyeFiyat)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, satisFiyati: String(Math.round(formTavsiyeFiyat * 100) / 100) }))}
                      disabled={!formTavsiyeFiyat}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-40"
                      style={{ background: R.T.orange, color: "#fff" }}
                    >
                      Bu Fiyatı Kullan
                    </button>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: R.T.ink500 }}>
                    Örn. 1.000₺ maliyetli üründe %30 markup → satış 1.300₺ (kâr 300₺, markup %30, margin %23,1).
                  </p>
                </div>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: R.T.ink500 }}>
                  Ürün Açıklaması
                </span>
                <textarea
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  rows={3}
                  className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  placeholder="Ürünle ilgili notlar…"
                />
              </label>

              <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                <R.Buton onClick={() => kaydet()}>
                  <R.Check size={15} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={formuKapat}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mükerrer / benzer ürün / fiyat uyarı modalı — "1. Mükerrer ürün
          kontrolü" ve "9. Benzer ürün önerisi" burada kullanıcıya sunulur. */}
      {uyariModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setUyariModal(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            {uyariModal.mukerrerParca ? (
              <>
                <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                  ⚠️ Bu ürün sistemde mevcut
                </h3>
                <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
                  <strong style={{ color: R.T.ink900 }}>
                    {uyariModal.mukerrerParca.marka} {uyariModal.mukerrerParca.ad}
                  </strong>{" "}
                  ({uyariModal.mukerrerParca.stokKodu}) zaten kayıtlı — aynı stok kodu, üretici kodu+marka ya da barkod eşleşiyor.
                </p>
                <div className="flex flex-col gap-2">
                  <R.Buton
                    onClick={() => {
                      setUyariModal(null);
                      formuAc(uyariModal.mukerrerParca);
                    }}
                  >
                    <R.Pencil size={14} /> Mevcut Ürünü Aç
                  </R.Buton>
                  <R.Buton variant="ghost" onClick={() => kaydet(true)}>
                    Yeni Ürün Olarak Devam Et
                  </R.Buton>
                  <R.Buton variant="ghost" onClick={() => setUyariModal(null)}>
                    Vazgeç
                  </R.Buton>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                  Devam etmeden önce kontrol edin
                </h3>
                {uyariModal.benzerler.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs mb-1.5" style={{ color: R.T.ink500 }}>
                      Benzer kayıt(lar) bulundu — yazım hatası olabilir mi?
                    </p>
                    {uyariModal.benzerler.map((b) => (
                      <div key={b.parca.id} className="text-sm px-2.5 py-1.5 rounded-md mb-1" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                        {b.parca.marka} {b.parca.ad} ({b.parca.stokKodu}) — <strong>%{b.yuzde} eşleşme</strong>
                      </div>
                    ))}
                  </div>
                )}
                {uyariModal.fiyatUyarilari.map((u, i) => (
                  <p key={i} className="text-sm mb-1.5" style={{ color: "#8A6110" }}>
                    {u}
                  </p>
                ))}
                <div className="flex flex-col gap-2 mt-3">
                  <R.Buton onClick={() => kaydet(true)}>
                    <R.Check size={14} /> Yine de Kaydet
                  </R.Buton>
                  <R.Buton variant="ghost" onClick={() => setUyariModal(null)}>
                    Vazgeç, Düzenlemeye Dön
                  </R.Buton>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stok girişi modalı */}
      {girisModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setGirisModalId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Girişi — {girisModalParca.ad}
              </h3>
              <button onClick={() => setGirisModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Mevcut stok: <strong>{girisModalParca.stok} {girisModalParca.birim}</strong> · Mevcut ortalama maliyet:{" "}
              <strong>{R.tl(girisModalParca.ortalamaMaliyet)}</strong>
            </p>
            <div className="flex flex-col gap-3">
              {girisModalParca.paketBirimleri && girisModalParca.paketBirimleri.length > 0 && (
                <div className="flex gap-2 items-end p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                  <div className="flex-1">
                    <span className="text-xs font-medium block mb-1" style={{ color: R.T.ink500 }}>
                      Paket ile Gir
                    </span>
                    <select
                      value={girisPaketId}
                      onChange={(e) => setGirisPaketId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border text-sm outline-none bg-white"
                      style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    >
                      <option value="">Paket seç…</option>
                      {girisModalParca.paketBirimleri.map((pk) => (
                        <option key={pk.id} value={pk.id}>
                          {pk.ad} (1 = {pk.iceriyorAdet} {girisModalParca.birim})
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    value={girisPaketAdedi}
                    onChange={(e) => setGirisPaketAdedi(e.target.value)}
                    placeholder="Kaç paket"
                    className="w-24 px-2 py-1.5 rounded-md border text-sm outline-none"
                    style={{ borderColor: R.T.steel300 }}
                  />
                  <button
                    onClick={() => {
                      const pk = girisModalParca.paketBirimleri.find((p) => p.id === girisPaketId);
                      if (!pk || !parseFloat(girisPaketAdedi)) {
                        R.bildirimGoster("Paket ve adet seçin.", "hata");
                        return;
                      }
                      setGirisAdet(String(pk.iceriyorAdet * parseFloat(girisPaketAdedi)));
                    }}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold shrink-0"
                    style={{ background: R.T.orange, color: "#fff" }}
                  >
                    Adete Çevir
                  </button>
                </div>
              )}
              <R.Girdi
                label={`Gelen Adet (${girisModalParca.birim})`}
                type="number"
                value={girisAdet}
                onChange={(e) => setGirisAdet(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <R.Girdi
                label="Birim Alış Fiyatı (KDV Hariç)"
                type="number"
                value={girisFiyat}
                onChange={(e) => setGirisFiyat(e.target.value)}
                placeholder="0.00"
              />
              {parseFloat(girisAdet) > 0 && parseFloat(girisFiyat) > 0 && (
                <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  Yeni ortalama maliyet:{" "}
                  <strong style={{ color: R.T.ink900 }}>
                    {R.tl(
                      R.agirlikliOrtalamaMaliyetHesapla(
                        girisModalParca.stok,
                        girisModalParca.ortalamaMaliyet,
                        parseFloat(girisAdet),
                        parseFloat(girisFiyat)
                      )
                    )}
                  </strong>{" "}
                  ({(girisModalParca.stok || 0)} {girisModalParca.birim} × {R.tl(girisModalParca.ortalamaMaliyet)} + {girisAdet} × {R.tl(parseFloat(girisFiyat))})
                </p>
              )}
              <R.Girdi
                label="Belge No (opsiyonel)"
                value={girisBelgeNo}
                onChange={(e) => setGirisBelgeNo(e.target.value)}
                placeholder="ör. AL-1254"
              />
              <R.Girdi
                label="İşlemi Yapan"
                value={girisKullanici}
                readOnly
                placeholder="ör. Emirhan"
              />
              <div className="flex gap-2">
                <R.Buton onClick={girisiKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setGirisModalId(null)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raf / Depo konumları + raf taşıma modalı */}
      {rafModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setRafModalId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Raf / Depo Konumları — {rafModalParca.ad}
              </h3>
              <button onClick={() => setRafModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 my-3">
              {R.parcaRafListesi(rafModalParca).length === 0 ? (
                <p className="text-xs" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz raf adresi girilmedi.
                </p>
              ) : (
                R.parcaRafListesi(rafModalParca).map((k) => (
                  <div key={k.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ ...R.MONO, color: R.T.ink900 }}>📍 {k.kod}</span>
                    <span className="font-semibold" style={R.MONO}>
                      {k.adet} {rafModalParca.birim}
                    </span>
                  </div>
                ))
              )}
              {R.parcaRafListesi(rafModalParca).length > 1 && (
                <div className="flex items-center justify-between text-xs font-semibold px-2.5 pt-1" style={{ color: R.T.ink500 }}>
                  <span>Toplam</span>
                  <span style={R.MONO}>
                    {R.parcaRafListesi(rafModalParca).reduce((t, k) => t + k.adet, 0)} {rafModalParca.birim}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2.5" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Raf Taşı
              </span>
              <R.Secim label="Kaynak Raf" value={rafTransferKaynak} onChange={(e) => setRafTransferKaynak(e.target.value)}>
                <option value="">Seçin…</option>
                {R.parcaRafListesi(rafModalParca).map((k) => (
                  <option key={k.id} value={k.kod}>
                    {k.kod} ({k.adet} {rafModalParca.birim})
                  </option>
                ))}
              </R.Secim>
              <R.Girdi
                label="Yeni Raf (Bölüm-Raf-Göz)"
                value={rafTransferHedef}
                onChange={(e) => setRafTransferHedef(e.target.value.toUpperCase())}
                placeholder="ör. B-02-05"
              />
              <R.Girdi label={`Adet (${rafModalParca.birim})`} type="number" value={rafTransferAdet} onChange={(e) => setRafTransferAdet(e.target.value)} placeholder="0" />
              <R.Girdi label="Kullanıcı" value={rafTransferKullanici} readOnly />
              <div className="flex gap-2">
                <R.Buton onClick={rafTransferiKaydet}>
                  <R.MapPin size={14} /> Taşımayı Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setRafModalId(null)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stok Düzeltme modalı — stoğu değiştirmenin tek "elle" yolu; her zaman
          bir sebep (tür) seçilir ve açıklama zorunludur, ham adet asla
          doğrudan yazılamaz. */}
      {duzeltmeModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDuzeltmeModalId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Düzeltme — {duzeltmeModalParca.ad}
              </h3>
              <button onClick={() => setDuzeltmeModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Mevcut stok: <strong>{duzeltmeModalParca.stok} {duzeltmeModalParca.birim}</strong>
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
                {[
                  { id: "giris", ad: "Giriş (+)" },
                  { id: "cikis", ad: "Çıkış (−)" },
                ].map((y) => (
                  <button
                    key={y.id}
                    onClick={() => {
                      setDuzeltmeYon(y.id);
                      setDuzeltmeTur(y.id === "giris" ? R.STOK_GIRIS_TURLERI[0] : R.STOK_CIKIS_TURLERI[0]);
                    }}
                    className="flex-1 py-2 text-sm font-semibold"
                    style={{
                      background: duzeltmeYon === y.id ? (y.id === "giris" ? R.T.green : R.T.red) : "#fff",
                      color: duzeltmeYon === y.id ? "#fff" : R.T.ink500,
                    }}
                  >
                    {y.ad}
                  </button>
                ))}
              </div>
              <R.Secim label="Tür / Sebep" value={duzeltmeTur} onChange={(e) => setDuzeltmeTur(e.target.value)}>
                {(duzeltmeYon === "giris" ? R.STOK_GIRIS_TURLERI : R.STOK_CIKIS_TURLERI).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </R.Secim>
              <R.Girdi
                label={`Adet (${duzeltmeModalParca.birim})`}
                type="number"
                value={duzeltmeAdet}
                onChange={(e) => setDuzeltmeAdet(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <R.Girdi
                label="Belge No (opsiyonel)"
                value={duzeltmeBelgeNo}
                onChange={(e) => setDuzeltmeBelgeNo(e.target.value)}
                placeholder="ör. SY-2026-08"
              />
              <R.Girdi
                label="İşlemi Yapan"
                value={duzeltmeKullanici}
                readOnly
                placeholder="ör. Emirhan"
              />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: R.T.ink500 }}>
                  Açıklama / Sebep *
                </span>
                <textarea
                  value={duzeltmeAciklama}
                  onChange={(e) => setDuzeltmeAciklama(e.target.value)}
                  rows={2}
                  className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  placeholder="ör. Fiziksel sayımda 3 adet fazla çıktı"
                />
              </label>
              {duzeltmeYon === "cikis" &&
                parseFloat(duzeltmeAdet) > duzeltmeModalParca.stok &&
                !db.ayarlar.eksiStokIzni && (
                  <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: "#F9DEDE", color: R.T.red }}>
                    Mevcut stoktan fazla çıkış giremezsiniz — Ayarlar'da "Eksi Stok İzni" kapalı.
                  </p>
                )}
              <div className="flex gap-2">
                <R.Buton onClick={duzeltmeKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setDuzeltmeModalId(null)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stok Hareketleri defteri — tüm giriş/çıkışların değiştirilemez kaydı */}
      {hareketlerParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setHareketlerAcikId(null)}
        >
          <div
            className="w-full max-w-3xl rounded-lg overflow-hidden"
            style={{ background: "#fff", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Hareketleri — {hareketlerParca.ad}
              </h3>
              <button onClick={() => setHareketlerAcikId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: "75vh" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Tarih/Saat</th>
                    <th className="text-left font-semibold px-3 py-2">İşlem Türü</th>
                    <th className="text-left font-semibold px-3 py-2">Belge No</th>
                    <th className="text-right font-semibold px-3 py-2">Giriş</th>
                    <th className="text-right font-semibold px-3 py-2">Çıkış</th>
                    <th className="text-right font-semibold px-3 py-2">Kalan Stok</th>
                    <th className="text-left font-semibold px-3 py-2">Kullanıcı</th>
                    <th className="text-left font-semibold px-3 py-2">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {db.stokHareketleri
                    .filter((h) => h.parcaId === hareketlerParca.id)
                    .map((h) => (
                      <tr key={h.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: R.T.ink500 }}>
                          {new Date(h.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                          {h.tur}
                        </td>
                        <td className="px-3 py-2" style={R.MONO}>
                          {h.belgeNo || "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                          {h.giris > 0 ? `+${h.giris}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                          {h.cikis > 0 ? `−${h.cikis}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold" style={R.MONO}>
                          {h.kalanStok}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                          {h.kullanici || "—"}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                          {h.aciklama || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bu ürünü kimlerden aldım — tedarikçi karşılaştırması */}
      {tedarikciKarsilastirmaParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setTedarikciKarsilastirmaAcikId(null)}
        >
          <div className="w-full max-w-md rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Bu Ürünü Kimlerden Aldım? — {tedarikciKarsilastirmaParca.ad}
              </h3>
              <button onClick={() => setTedarikciKarsilastirmaAcikId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Tekrar sipariş verirken tedarikçileri hızlıca karşılaştırın — her tedarikçi için en son alış fiyatı gösterilir.
            </p>
            {(() => {
              const tedarikciBazinda = {};
              (tedarikciKarsilastirmaParca.alisGecmisi || [])
                .filter((g) => g.tedarikci)
                .forEach((g) => {
                  if (!tedarikciBazinda[g.tedarikci]) tedarikciBazinda[g.tedarikci] = [];
                  tedarikciBazinda[g.tedarikci].push(g);
                });
              const gruplar = Object.entries(tedarikciBazinda)
                .map(([tedarikci, gecmis]) => ({ tedarikci, gecmis: gecmis.sort((a, b) => new Date(b.tarih) - new Date(a.tarih)) }))
                .sort((a, b) => a.gecmis[0].birimFiyat - b.gecmis[0].birimFiyat);
              const enUcuz = gruplar[0]?.gecmis[0]?.birimFiyat;
              return (
                <div className="flex flex-col gap-2">
                  {gruplar.map((g) => (
                    <div key={g.tedarikci} className="rounded-md overflow-hidden" style={{ border: `1px solid ${R.T.steel200}` }}>
                      <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: R.T.steel100 }}>
                        <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: R.T.ink900 }}>
                          {g.tedarikci}
                          {g.gecmis[0].birimFiyat === enUcuz && <R.Rozet tone="green">En Ucuz</R.Rozet>}
                        </span>
                        <span className="text-sm font-semibold" style={R.MONO}>
                          {R.tl(g.gecmis[0].birimFiyat)}
                        </span>
                      </div>
                      {g.gecmis.length > 1 && (
                        <div className="px-3 py-2 flex flex-col gap-1">
                          {g.gecmis.map((h) => (
                            <div key={h.id} className="flex items-center justify-between text-xs">
                              <span style={{ color: R.T.ink500 }}>{R.tarihGoster(h.tarih)}</span>
                              <span style={R.MONO}>{R.tl(h.birimFiyat)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Alış geçmişi modalı */}
      {gecmisParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setGecmisAcikId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Alış / Maliyet Geçmişi — {gecmisParca.ad}
              </h3>
              <button onClick={() => setGecmisAcikId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {(gecmisParca.alisGecmisi || []).map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink500 }}>{R.tarihGoster(g.tarih)}</span>
                  <span style={R.MONO}>
                    {g.adet} {gecmisParca.birim} × {R.tl(g.birimFiyat)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Satış fiyatı geçmişi modalı */}
      {fiyatGecmisParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setFiyatGecmisAcikId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Satış Fiyatı Geçmişi — {fiyatGecmisParca.ad}
              </h3>
              <button onClick={() => setFiyatGecmisAcikId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {(fiyatGecmisParca.fiyatGecmisi || []).map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink500 }}>{R.tarihGoster(f.tarih)}</span>
                  <span style={R.MONO}>
                    {f.eskiFiyat !== null ? `${R.tl(f.eskiFiyat)} → ${R.tl(f.yeniFiyat)}` : `İlk fiyat: ${R.tl(f.yeniFiyat)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OEM / Muadil kod yönetimi */}
      {kodModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setKodModalId(null)}
        >
          <div
            className="w-full max-w-md rounded-lg p-5 overflow-y-auto"
            style={{ background: "#fff", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                <R.GitCompare size={16} style={{ color: R.T.orange }} />
                OEM / Muadil Kodlar
              </h3>
              <button onClick={() => setKodModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {kodModalParca.marka} — {kodModalParca.ad} ({kodModalParca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {kodModalKodlari.length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz kod bağlanmadı.
                </p>
              ) : (
                kodModalKodlari.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm"
                    style={{ background: R.T.steel100 }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <R.Rozet tone={k.tip === "OEM" ? "graphite" : "orange"}>{k.tip}</R.Rozet>
                      <span style={R.MONO} className="truncate">
                        {k.kod}
                      </span>
                    </span>
                    <button onClick={() => kodSil(k.id)} style={{ color: R.T.red }} className="shrink-0">
                      <R.Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Yeni Kod Ekle
              </span>
              <div className="flex gap-2">
                <select
                  value={yeniKodTipi}
                  onChange={(e) => setYeniKodTipi(e.target.value)}
                  className="px-2 py-2 rounded-md border text-sm outline-none bg-white shrink-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {R.KOD_TIPLERI.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input
                  value={yeniKodDegeri}
                  onChange={(e) => {
                    setYeniKodDegeri(e.target.value);
                    setKodHata("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && kodEkle()}
                  placeholder="ör. 03L 115 562"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none min-w-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                />
                <button
                  onClick={kodEkle}
                  className="px-3 py-2 rounded-md shrink-0"
                  style={{ background: R.T.orange, color: "#fff" }}
                >
                  <R.Plus size={15} />
                </button>
              </div>
              {kodHata && (
                <p className="text-xs" style={{ color: R.T.red }}>
                  {kodHata}
                </p>
              )}
              <p className="text-xs" style={{ color: R.T.ink500 }}>
                <strong>OEM</strong>: aracın orijinal parça numarası (ör. VW/Audi 03L115562).{" "}
                <strong>Muadil</strong>: başka bir markanın kendi kod sistemindeki karşılığı. Boşluk/tire farkı önemli
                değil — arama otomatik normalize eder.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Barkod yönetimi */}
      {barkodModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setBarkodModalId(null)}
        >
          <div
            className="w-full max-w-md rounded-lg p-5 overflow-y-auto"
            style={{ background: "#fff", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                <R.ScanLine size={16} style={{ color: R.T.orange }} />
                Barkodlar
              </h3>
              <button onClick={() => setBarkodModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {barkodModalParca.marka} — {barkodModalParca.ad} ({barkodModalParca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {R.parcaTumBarkodlari(barkodModalParca).length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz barkod bağlanmadı.
                </p>
              ) : (
                R.parcaTumBarkodlari(barkodModalParca).map((b, i) => (
                  <div key={b} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm" style={{ background: R.T.steel100 }}>
                    <span className="flex items-center gap-2 min-w-0">
                      {i === 0 && <R.Rozet tone="graphite">Birincil</R.Rozet>}
                      <span style={R.MONO} className="truncate">
                        {b}
                      </span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {i !== 0 && (
                        <button onClick={() => barkodBirincilYap(barkodModalParca.id, b)} className="text-xs font-semibold" style={{ color: R.T.orangeDark }}>
                          Birincil Yap
                        </button>
                      )}
                      <button onClick={() => barkodSil(barkodModalParca.id, b)} style={{ color: R.T.red }}>
                        <R.Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Yeni Barkod Ekle
              </span>
              <div className="flex gap-2">
                <input
                  value={yeniBarkodDegeri}
                  onChange={(e) => {
                    setYeniBarkodDegeri(e.target.value);
                    setBarkodHata("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && barkodEkle()}
                  placeholder="Barkod okutun veya yazın (EAN-13/EAN-8)"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none min-w-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  autoFocus
                />
                <button onClick={barkodEkle} className="px-3 py-2 rounded-md shrink-0" style={{ background: R.T.orange, color: "#fff" }}>
                  <R.Plus size={15} />
                </button>
              </div>
              {barkodHata && (
                <p className="text-xs" style={{ color: R.T.red }}>
                  {barkodHata}
                </p>
              )}
              <R.Buton variant="ghost" onClick={barkodOtomatikUret}>
                <R.ScanLine size={14} /> Otomatik Dahili Barkod Üret
              </R.Buton>
              {R.parcaTumBarkodlari(barkodModalParca)[0] && (
                <div className="flex justify-center pt-2">
                  <R.EanBarkod kod={R.parcaTumBarkodlari(barkodModalParca)[0]} genislik={160} yukseklik={50} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uyumlu araçlar yönetimi */}
      {aracModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setAracModalId(null)}
        >
          <div className="w-full max-w-lg rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                <R.Car size={16} style={{ color: R.T.orange }} />
                Uyumlu Araçlar
              </h3>
              <button onClick={() => setAracModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {aracModalParca.marka} — {aracModalParca.ad} ({aracModalParca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {R.parcaUyumluAraclari(db, aracModalParca.id).length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz araç bağlanmadı.
                </p>
              ) : (
                R.parcaUyumluAraclari(db, aracModalParca.id).map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm" style={{ background: R.T.steel100 }}>
                    <span className="min-w-0 truncate" style={{ color: R.T.ink900 }}>
                      {R.aracEtiketi(u.arac)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={u.durum}
                        onChange={(e) => uyumlulukDurumGuncelle(u.id, e.target.value)}
                        className="text-xs px-1.5 py-1 rounded border outline-none bg-white"
                        style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                      >
                        {R.UYUMLULUK_DURUMLARI.map((d) => (
                          <option key={d} value={d}>
                            {R.uyumlulukGorseli[d].emoji} {d}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => uyumlulukSil(u.id)} style={{ color: R.T.red }}>
                        <R.Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Araç Ekle
              </span>
              <div className="flex gap-2">
                <select
                  value={yeniUyumDurumu}
                  onChange={(e) => setYeniUyumDurumu(e.target.value)}
                  className="px-2 py-2 rounded-md border text-xs outline-none bg-white shrink-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {R.UYUMLULUK_DURUMLARI.map((d) => (
                    <option key={d} value={d}>
                      {R.uyumlulukGorseli[d].emoji} {d}
                    </option>
                  ))}
                </select>
                <input
                  value={aracAramaMetni}
                  onChange={(e) => setAracAramaMetni(e.target.value)}
                  placeholder="ör. Golf 1.6 TDI"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none min-w-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                />
              </div>
              {aracAramaSonuclari.length > 0 && (
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {aracAramaSonuclari.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => uyumlulukEkle(a.id)}
                      className="text-left text-sm px-2.5 py-1.5 rounded-md hover:bg-gray-50"
                      style={{ background: R.T.steel100, color: R.T.ink900 }}
                    >
                      {R.aracEtiketi(a)}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs" style={{ color: R.T.ink500 }}>
                Aracı burada bulamıyorsanız önce "Araçlar" sayfasından araç veritabanına ekleyin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ürün Detayı — Fotoğraflar | Teknik Bilgiler | OEM | Muadiller | Araç Uyumluluğu | Dokümanlar */}
      {detayModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDetayModalId(null)}
        >
          <div className="w-full max-w-3xl rounded-lg overflow-hidden" style={{ background: "#fff", maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <div>
                <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                  {detayModalParca.ad}
                </div>
                <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                  {detayModalParca.marka} · {detayModalParca.stokKodu}
                </div>
              </div>
              <button onClick={() => setDetayModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="flex overflow-x-auto" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              {[
                { id: "fotograf", ad: "Fotoğraflar" },
                { id: "teknik", ad: "Teknik Bilgiler" },
                { id: "oem", ad: "OEM" },
                { id: "muadil", ad: "Muadiller" },
                { id: "arac", ad: "Araç Uyumluluğu" },
                { id: "dokuman", ad: "Dokümanlar" },
                { id: "gecmis", ad: "Geçmiş" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setDetaySekme(s.id)}
                  className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                  style={{ color: detaySekme === s.id ? R.T.orangeDark : R.T.ink500, borderBottom: detaySekme === s.id ? `2px solid ${R.T.orange}` : "2px solid transparent" }}
                >
                  {s.ad}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto" style={{ maxHeight: "65vh" }}>
              {/* Fotoğraflar */}
              {detaySekme === "fotograf" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <R.Secim label="Yeni fotoğrafın türü" value={yeniFotoTuru} onChange={(e) => setYeniFotoTuru(e.target.value)}>
                      {R.FOTOGRAF_TURLERI.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </R.Secim>
                    <R.Buton onClick={() => fotoInputRef.current?.click()} disabled={fotoYukleniyor}>
                      <R.ImageIcon size={15} /> {fotoYukleniyor ? "Yükleniyor…" : "Fotoğraf Ekle"}
                    </R.Buton>
                    <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={fotografEkle} className="hidden" />
                  </div>
                  <p className="text-xs" style={{ color: R.T.ink500 }}>
                    JPG/PNG/WEBP desteklenir, otomatik olarak sıkıştırılır. Listedeki ilk fotoğraf "Ana Fotoğraf" sayılır.
                  </p>
                  {(detayModalParca.fotograflar || []).length === 0 ? (
                    <R.Bos ikon={R.ImageIcon} baslik="Fotoğraf yok" aciklama="Yukarıdan ilk fotoğrafı ekleyin." />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {detayModalParca.fotograflar.map((f, i) => (
                        <div key={f.id} className="rounded-md overflow-hidden" style={{ border: `1px solid ${R.T.steel200}` }}>
                          <button onClick={() => setBuyukFotoUrl(f.url)} className="block w-full" style={{ aspectRatio: "1", background: R.T.steel100 }}>
                            <img src={f.url} alt={f.tur} className="w-full h-full object-cover" />
                          </button>
                          <div className="p-2 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: R.T.ink500 }}>
                                {f.tur}
                              </span>
                              {i === 0 && <R.Rozet tone="orange">Ana</R.Rozet>}
                            </div>
                            <div className="flex items-center gap-1">
                              {i !== 0 && (
                                <button onClick={() => fotografAnaYap(detayModalParca.id, f.id)} title="Ana Yap" className="text-xs" style={{ color: R.T.orangeDark }}>
                                  Ana Yap
                                </button>
                              )}
                              <div className="ml-auto flex items-center gap-1">
                                <button onClick={() => fotografSiraDegistir(detayModalParca.id, i, -1)} disabled={i === 0} style={{ color: R.T.ink500, opacity: i === 0 ? 0.3 : 1 }}>
                                  <R.ChevronRight size={13} style={{ transform: "rotate(-90deg)" }} />
                                </button>
                                <button
                                  onClick={() => fotografSiraDegistir(detayModalParca.id, i, 1)}
                                  disabled={i === detayModalParca.fotograflar.length - 1}
                                  style={{ color: R.T.ink500, opacity: i === detayModalParca.fotograflar.length - 1 ? 0.3 : 1 }}
                                >
                                  <R.ChevronRight size={13} style={{ transform: "rotate(90deg)" }} />
                                </button>
                                <button onClick={() => fotografSil(detayModalParca.id, f.id)} style={{ color: R.T.red }}>
                                  <R.Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Teknik Bilgiler */}
              {detaySekme === "teknik" && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Marka", detayModalParca.marka],
                      ["Ana Kategori", detayModalParca.anaKategori || "—"],
                      ["Alt Kategori", detayModalParca.kategori || "—"],
                      ["Birim", detayModalParca.birim],
                      ["KDV Oranı", `%${detayModalParca.kdvOrani}`],
                      ["Üretici Kodu", detayModalParca.ureticiKodu || "—"],
                      ["Raf", R.parcaRafListesi(detayModalParca)[0]?.kod || "—"],
                      ["Stok", `${detayModalParca.stok} ${detayModalParca.birim}`],
                    ].map(([etiket, deger]) => (
                      <div key={etiket} className="flex flex-col rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                        <span className="text-xs" style={{ color: R.T.ink500 }}>
                          {etiket}
                        </span>
                        <span style={{ color: R.T.ink900 }}>{deger}</span>
                      </div>
                    ))}
                  </div>
                  {db.depolar.length > 1 && (
                    <div>
                      <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                        Depo Bazında Stok Dağılımı
                      </div>
                      <div className="flex flex-col gap-1">
                        {db.depolar
                          .filter((d) => d.aktif !== false)
                          .map((d) => (
                            <div key={d.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                              <span style={{ color: R.T.ink900 }}>
                                {d.kod} — {d.ad}
                              </span>
                              <span className="font-semibold" style={R.MONO}>
                                {R.depoStogu(detayModalParca, d.id)} {detayModalParca.birim}
                              </span>
                            </div>
                          ))}
                        {R.parcaAcikTransferAdedi(db, detayModalParca.id) > 0 && (
                          <div className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: "#FDF1D6" }}>
                            <span style={{ color: "#8A6110" }}>🚚 Yolda (transferde)</span>
                            <span className="font-semibold" style={{ ...R.MONO, color: "#8A6110" }}>
                              {R.parcaAcikTransferAdedi(db, detayModalParca.id)} {detayModalParca.birim}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const kategoriObj = db.kategoriler.find((k) => k.ad === detayModalParca.kategori) || db.kategoriler.find((k) => k.ad === detayModalParca.anaKategori);
                    const ozelAlanlar = kategoriObj ? R.kategoriOzelAlanlari(db, kategoriObj) : [];
                    if (ozelAlanlar.length === 0) return null;
                    return (
                      <div>
                        <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                          Kategoriye Özel Alanlar
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {ozelAlanlar.map((oa) => (
                            <div key={oa.id} className="flex flex-col rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                              <span className="text-xs" style={{ color: R.T.ink500 }}>
                                {oa.ad}
                              </span>
                              <span style={{ color: R.T.ink900 }}>{detayModalParca.kategoriOzelDegerler?.[oa.ad] || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {detayModalParca.aciklama && (
                    <div>
                      <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                        Açıklama
                      </div>
                      <p className="text-sm" style={{ color: R.T.ink900 }}>
                        {detayModalParca.aciklama}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* OEM */}
              {detaySekme === "oem" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {db.kodlar.filter((k) => k.parcaId === detayModalParca.id && k.tip === "OEM").length === 0 ? (
                      <span className="text-sm" style={{ color: R.T.ink500 }}>
                        Kayıtlı OEM kodu yok.
                      </span>
                    ) : (
                      db.kodlar
                        .filter((k) => k.parcaId === detayModalParca.id && k.tip === "OEM")
                        .map((k) => (
                          <R.Rozet key={k.id} tone="graphite">
                            {k.kod}
                          </R.Rozet>
                        ))
                    )}
                  </div>
                  <R.Buton
                    variant="ghost"
                    onClick={() => {
                      setDetayModalId(null);
                      setKodModalId(detayModalParca.id);
                      setYeniKodDegeri("");
                      setKodHata("");
                    }}
                  >
                    <R.GitCompare size={14} /> OEM / Muadil Kodlarını Düzenle
                  </R.Buton>
                </div>
              )}

              {/* Muadiller */}
              {detaySekme === "muadil" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {db.kodlar.filter((k) => k.parcaId === detayModalParca.id && k.tip === "Muadil").length === 0 ? (
                      <span className="text-sm" style={{ color: R.T.ink500 }}>
                        Kayıtlı muadil kod yok.
                      </span>
                    ) : (
                      db.kodlar
                        .filter((k) => k.parcaId === detayModalParca.id && k.tip === "Muadil")
                        .map((k) => (
                          <R.Rozet key={k.id} tone="orange">
                            {k.kod}
                          </R.Rozet>
                        ))
                    )}
                  </div>
                  <R.Buton
                    variant="ghost"
                    onClick={() => {
                      setDetayModalId(null);
                      setKodModalId(detayModalParca.id);
                      setYeniKodDegeri("");
                      setKodHata("");
                    }}
                  >
                    <R.GitCompare size={14} /> OEM / Muadil Kodlarını Düzenle
                  </R.Buton>
                </div>
              )}

              {/* Araç Uyumluluğu */}
              {detaySekme === "arac" && (
                <div className="flex flex-col gap-2">
                  {R.parcaUyumluAraclari(db, detayModalParca.id).length === 0 ? (
                    <p className="text-sm" style={{ color: R.T.ink500 }}>
                      Henüz araç eşleştirilmedi.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {R.parcaUyumluAraclari(db, detayModalParca.id).map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                          <span style={{ color: R.T.ink900 }}>{R.aracEtiketi(u.arac)}</span>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: R.uyumlulukGorseli[u.durum].ton === "green" ? R.T.green : R.uyumlulukGorseli[u.durum].ton === "red" ? R.T.red : "#8A6110" }}
                          >
                            {R.uyumlulukGorseli[u.durum].emoji} {u.durum}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <R.Buton
                    variant="ghost"
                    onClick={() => {
                      setDetayModalId(null);
                      setAracModalId(detayModalParca.id);
                    }}
                  >
                    <R.Car size={14} /> Uyumlu Araçları Düzenle
                  </R.Buton>
                </div>
              )}

              {/* Dokümanlar */}
              {detaySekme === "dokuman" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <R.Secim label="Doküman türü" value={yeniDokumanTuru} onChange={(e) => setYeniDokumanTuru(e.target.value)}>
                      {R.DOKUMAN_TURLERI.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </R.Secim>
                    <R.Buton onClick={() => dokumanInputRef.current?.click()}>
                      <R.FileDown size={15} className="rotate-180" /> Doküman Ekle
                    </R.Buton>
                    <input ref={dokumanInputRef} type="file" accept=".pdf,.doc,.docx" multiple onChange={dokumanEkle} className="hidden" />
                  </div>
                  <p className="text-xs" style={{ color: R.T.ink500 }}>
                    PDF veya Word belgesi ekleyin (dosya başına en fazla 8MB).
                  </p>
                  {(detayModalParca.dokumanlar || []).length === 0 ? (
                    <R.Bos ikon={R.FileDown} baslik="Doküman yok" aciklama="Teknik katalog, montaj talimatı, garanti belgesi gibi dosyalar ekleyin." />
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {detayModalParca.dokumanlar.map((d) => (
                        <div key={d.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                          <div className="min-w-0">
                            <div style={{ color: R.T.ink900 }}>{d.ad}</div>
                            <div className="text-xs" style={{ color: R.T.ink500 }}>
                              {d.tur} · {d.boyutKb} KB · {R.tarihGoster(d.tarih)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a href={d.url} download={d.dosyaAdi} className="text-xs font-semibold" style={{ color: R.T.orangeDark }}>
                              İndir
                            </a>
                            <button onClick={() => dokumanSil(detayModalParca.id, d.id)} style={{ color: R.T.red }}>
                              <R.Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Geçmiş — Stok Özeti + Zaman Çizelgesi + Alış/Satış/Stok/Fiyat Geçmişi */}
              {detaySekme === "gecmis" && (
                <R.UrunGecmisiIcerik db={db} parca={detayModalParca} altGorunum={gecmisAltGorunum} setAltGorunum={setGecmisAltGorunum} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Büyük fotoğraf görüntüleme */}
      {buyukFotoUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setBuyukFotoUrl(null)}
        >
          <img src={buyukFotoUrl} alt="" className="max-w-full max-h-full object-contain rounded-md" />
          <button onClick={() => setBuyukFotoUrl(null)} className="absolute top-5 right-5" style={{ color: "#fff" }}>
            <R.X size={28} />
          </button>
        </div>
      )}

      {/* Silme onayı */}
      {silinecek && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSilinecek(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Bu ürün kartı silinsin mi?
            </h3>
            <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
              <strong>{silinecek.ad}</strong> ({silinecek.stokKodu}) kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={() => sil(silinecek.id)}>
                <R.Trash2 size={14} /> Sil
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setSilinecek(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
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

  const markalar = [...new Set(db.parcalar.map((p) => p.marka).filter(Boolean))].sort();
  const kategoriler = [...new Set(db.parcalar.flatMap((p) => [p.kategori, p.anaKategori]).filter(Boolean))].sort();

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

      {/* Ürün detay paneli */}
      {detayParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 pb-8 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDetayId(null)}
        >
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: R.T.steel100 }}
                >
                  {detayParca.fotograf ? (
                    <img src={detayParca.fotograf} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <R.ImageIcon size={18} style={{ color: R.T.ink500 }} />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                    {detayParca.ad}
                  </div>
                  <div className="text-xs mt-0.5" style={{ ...R.MONO, color: R.T.ink500 }}>
                    {detayParca.marka} · {detayParca.stokKodu}
                  </div>
                </div>
              </div>
              <button onClick={() => setDetayId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Alış / Maliyet
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={R.MONO}>
                    {R.tl(R.gecerliMaliyet(detayParca))}
                  </div>
                </div>
                <div className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Satış Fiyatı
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={R.MONO}>
                    {R.tl(detayParca.satisFiyati)}
                  </div>
                </div>
                <div className="rounded-md p-2.5" style={{ background: "#DEF0DF" }}>
                  <div className="text-xs" style={{ color: R.T.green }}>
                    Kâr Marjı
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.green }}>
                    {R.tl(detayParca.satisFiyati - R.gecerliMaliyet(detayParca))}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  OEM Kodları
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {db.kodlar.filter((k) => k.parcaId === detayParca.id && k.tip === "OEM").length === 0 ? (
                    <span className="text-sm" style={{ color: R.T.ink500 }}>
                      Kayıtlı OEM kodu yok.
                    </span>
                  ) : (
                    db.kodlar
                      .filter((k) => k.parcaId === detayParca.id && k.tip === "OEM")
                      .map((k) => (
                        <R.Rozet key={k.id} tone="graphite">
                          {k.kod}
                        </R.Rozet>
                      ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  Muadiller
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {db.kodlar.filter((k) => k.parcaId === detayParca.id && k.tip === "Muadil").length === 0 ? (
                    <span className="text-sm" style={{ color: R.T.ink500 }}>
                      Kayıtlı muadil kod yok.
                    </span>
                  ) : (
                    db.kodlar
                      .filter((k) => k.parcaId === detayParca.id && k.tip === "Muadil")
                      .map((k) => (
                        <R.Rozet key={k.id} tone="orange">
                          {k.kod}
                        </R.Rozet>
                      ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  Uyumlu Araçlar
                </div>
                {R.parcaUyumluAraclari(db, detayParca.id).length === 0 ? (
                  <p className="text-sm" style={{ color: R.T.ink500 }}>
                    Henüz araç eşleştirilmedi.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {R.parcaUyumluAraclari(db, detayParca.id).map((u) => (
                      <div key={u.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                        <span style={{ color: R.T.ink900 }}>{R.aracEtiketi(u.arac)}</span>
                        <span className="text-xs font-semibold" style={{ color: R.uyumlulukGorseli[u.durum].ton === "green" ? R.T.green : R.uyumlulukGorseli[u.durum].ton === "red" ? R.T.red : "#8A6110" }}>
                          {R.uyumlulukGorseli[u.durum].emoji} {u.durum}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  Stok Hareketleri (Alış Geçmişi)
                </div>
                {(detayParca.alisGecmisi || []).length === 0 ? (
                  <p className="text-sm" style={{ color: R.T.ink500 }}>
                    Henüz stok girişi yapılmadı.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {detayParca.alisGecmisi.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                        <span style={{ color: R.T.ink500 }}>{R.tarihGoster(g.tarih)}</span>
                        <span style={R.MONO}>
                          {g.adet} {detayParca.birim} × {R.tl(g.birimFiyat)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Son Alış
                  </div>
                  <div style={{ color: R.T.ink900 }}>
                    {detayParca.alisGecmisi?.length > 0
                      ? `${R.tarihGoster(detayParca.alisGecmisi[0].tarih)} · ${R.tl(detayParca.alisGecmisi[0].birimFiyat)}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Son Satış
                  </div>
                  <div style={{ color: R.T.ink500 }}>Satış modülü henüz eklenmedi</div>
                </div>
              </div>

              <R.Buton
                onClick={() => {
                  sepeteEkle(detayParca);
                  setDetayId(null);
                }}
              >
                <R.ShoppingCart size={15} /> Satışa Ekle
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SiparisOnerisiSayfasi({ db, updateDb, setSekme, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("siparis"); // "siparis" | "olu"
  const [sadeceKritik, setSadeceKritik] = R.useState(true);
  const [secililer, setSecililer] = R.useState({}); // { parcaId: true }
  const [oluFiltre, setOluFiltre] = R.useState(30); // 30 | 90 | 180 | 365 | "hic"
  const [listeGoster, setListeGoster] = R.useState(false);
  // Manuel müdahale (59. adım, 9. madde) — kullanıcı önerilen miktarı
  // değiştirebilir, isterse nedenini not düşer.
  const [manuelAdetler, setManuelAdetler] = R.useState({}); // { parcaId: adet }
  const [manuelNedenler, setManuelNedenler] = R.useState({}); // { parcaId: neden }

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set");

  const oneriListesiTam = aktifParcalar.map((p) => R.akilliSiparisOnerisiHesapla(db, p));

  const oneriListesi = oneriListesiTam
    .map((x) => ({
      p: x.parca,
      kritik: (x.parca.stok || 0) <= (x.parca.kritikSeviye || 0),
      onerilen: manuelAdetler[x.parca.id] ?? x.onerilenAdet,
      onerilenOrijinal: x.onerilenAdet,
      son30: x.son30,
      ortalamaGunluk: x.ortalamaGunluk,
      tahminiGun: x.tahminiGun,
      sonAlis: x.parca.alisGecmisi?.[0]?.tarih || null,
      analiz: x,
    }))
    .filter((x) => (sadeceKritik ? x.kritik || x.onerilen > 0 : true))
    .sort((a, b) => (b.kritik - a.kritik) || b.onerilen - a.onerilen);

  // Akıllı Uyarılar (10. madde)
  const akilliUyarilar = (() => {
    const stokBitmedenSiparisEdilmeli = oneriListesiTam.filter((x) => x.acilMi).length;
    const yediGunlukStoguKalan = oneriListesiTam.filter((x) => x.tahminiGun !== null && x.tahminiGun <= 7 && x.tahminiGun > 0).length;
    const satisHiziArtan = oneriListesiTam.filter((x) => x.son30 > 0 && x.son90 > 0 && x.son30 / 30 > (x.son90 / 90) * 1.3).length;
    const yeniSiparisGerekmeyen = oneriListesiTam.filter((x) => x.onerilenAdet === 0).length;
    return [
      { emoji: "🔴", metin: `${stokBitmedenSiparisEdilmeli} ürün stok bitmeden sipariş edilmeli.`, gizli: stokBitmedenSiparisEdilmeli === 0 },
      { emoji: "🟠", metin: `${yediGunlukStoguKalan} ürünün 7 günlük stoğu kaldı.`, gizli: yediGunlukStoguKalan === 0 },
      { emoji: "🟡", metin: `${satisHiziArtan} üründe satış hızında artış var.`, gizli: satisHiziArtan === 0 },
      { emoji: "🔵", metin: `${yeniSiparisGerekmeyen} ürün için yeni sipariş gerekmiyor.`, gizli: yeniSiparisGerekmeyen === 0 },
    ].filter((u) => !u.gizli);
  })();

  const oluListesi = (() => {
    const bugun = Date.now();
    return aktifParcalar
      .map((p) => {
        const sonTarih = R.sonSatisTarihiBul(db, p.id);
        const gun = sonTarih ? Math.floor((bugun - new Date(sonTarih).getTime()) / 86400000) : null;
        return { p, sonTarih, gun };
      })
      .filter((x) => {
        if (oluFiltre === "hic") return x.sonTarih === null;
        return x.gun !== null && x.gun >= oluFiltre;
      })
      .sort((a, b) => (b.gun || 99999) - (a.gun || 99999));
  })();

  const secimToggle = (parcaId) => setSecililer((prev) => ({ ...prev, [parcaId]: !prev[parcaId] }));
  const seciliSayisi = Object.values(secililer).filter(Boolean).length;

  // Seçili önerileri, tedarikçiye göre gruplayıp otomatik olarak birer
  // "Taslak" Satın Alma Siparişi'ne dönüştürür — 14. adımdaki öneri motorunu
  // 33. adımdaki gerçek sipariş takibine bağlayan köprü burasıdır.
  const siparisineEkle = () => {
    const secilenler = oneriListesi.filter((x) => secililer[x.p.id]);
    if (secilenler.length === 0) {
      R.bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const gruplar = {};
    secilenler.forEach((x) => {
      // Tedarikçi seçimi (5. madde) — 53. adımdaki fiyat karşılaştırmasından
      // en uygun tedarikçi varsa o kullanılır, yoksa ürünün kayıtlı tedarikçisi.
      const ted = x.analiz.enUygunTedarikci?.tedarikciAdi || x.p.tedarikci?.trim() || "Tedarikçi Belirtilmemiş";
      if (!gruplar[ted]) gruplar[ted] = [];
      gruplar[ted].push(x);
    });
    updateDb((prev) => {
      let sonuc = prev;
      Object.entries(gruplar).forEach(([ted, urunler]) => {
        const yeniKalemler = urunler.map((x) => ({
          id: R.yeniId("sk"),
          parcaId: x.p.id,
          stokKodu: x.p.stokKodu,
          ad: x.p.ad,
          marka: x.p.marka,
          adet: x.onerilen,
          alinanAdet: 0,
          birimFiyat: x.analiz.enUygunTedarikci?.netMaliyet ?? (x.p.sonAlisFiyati || x.p.alisFiyati || 0),
          iskontoYuzde: 0,
          kdvOrani: x.p.kdvOrani || 0,
        }));
        // Aynı tedarikçi için zaten açık bir Taslak varsa ona ekler, yoksa yeni oluşturur.
        const mevcutTaslak = sonuc.satinAlmaSiparisleri.find((s) => s.tedarikci === ted && s.durum === "Taslak");
        if (mevcutTaslak) {
          sonuc = {
            ...sonuc,
            satinAlmaSiparisleri: sonuc.satinAlmaSiparisleri.map((s) => (s.id === mevcutTaslak.id ? { ...s, kalemler: [...s.kalemler, ...yeniKalemler] } : s)),
          };
        } else {
          sonuc = {
            ...sonuc,
            satinAlmaSiparisleri: [
              {
                id: R.yeniId("sas"),
                tedarikci: ted,
                siparisTarihi: R.isoGun(new Date()),
                beklenenTeslimTarihi: "",
                aciklama: "Sipariş Önerisi'nden otomatik oluşturuldu",
                olusturanKullanici: aktifKullanici?.adSoyad || "",
                durum: "Taslak",
                kalemler: yeniKalemler,
                malKabulGecmisi: [],
                tamamlanmaTarihi: null,
                iptalNedeni: "",
              },
              ...sonuc.satinAlmaSiparisleri,
            ],
          };
        }
      });
      return sonuc;
    });
    R.bildirimGoster(`${Object.keys(gruplar).length} tedarikçi için satın alma siparişi (Taslak) oluşturuldu/güncellendi.`, "basari");
    setSekme("satinalma");
  };

  const siparisListesiOlustur = () => {
    const secilenler = oneriListesi.filter((x) => secililer[x.p.id]);
    if (secilenler.length === 0) {
      R.bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const gruplar = {};
    secilenler.forEach((x) => {
      const ted = x.p.tedarikci?.trim() || "Tedarikçi Belirtilmemiş";
      if (!gruplar[ted]) gruplar[ted] = [];
      gruplar[ted].push(x);
    });

    const pencere = window.open("", "_blank", "width=480,height=700");
    if (!pencere) {
      R.bildirimGoster("Yazdırma penceresi açılamadı — pop-up engelleyiciyi kontrol edin.", "hata");
      return;
    }
    const gruplarHtml = Object.entries(gruplar)
      .map(
        ([ted, urunler]) => `
        <h3>${ted}</h3>
        <table>
          <tr><th>Ürün</th><th>Kod</th><th>Mevcut</th><th>Sipariş</th></tr>
          ${urunler
            .map((x) => `<tr><td>${x.p.ad}</td><td>${x.p.stokKodu}</td><td>${x.p.stok}</td><td><strong>${x.onerilen}</strong></td></tr>`)
            .join("")}
        </table>`
      )
      .join("");
    pencere.document.write(`
      <html>
        <head>
          <title>Sipariş Listesi — ${bugun()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; font-size: 13px; color: #14171A; }
            h2 { margin: 0 0 4px 0; }
            h3 { margin: 18px 0 6px 0; background: #EEF0F3; padding: 6px 10px; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
            th { color: #5B6470; }
          </style>
        </head>
        <body>
          <h2>AKCAN GROUP OTOMOTİV — Sipariş Listesi</h2>
          <div style="color:#5B6470; margin-bottom:10px;">${bugun()} · ${secilenler.length} ürün, tedarikçiye göre gruplandı</div>
          ${gruplarHtml}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    pencere.document.close();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "siparis", ad: "Sipariş Önerileri" },
          { id: "olu", ad: "Ölü Stok" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "siparis" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sadeceKritik} onChange={(e) => setSadeceKritik(e.target.checked)} />
              <span style={{ color: R.T.ink900 }}>Sadece kritik / önerisi olanları göster</span>
            </label>
            <R.Buton onClick={siparisListesiOlustur} disabled={seciliSayisi === 0}>
              <R.FileDown size={15} /> Sipariş Listesi Oluştur {seciliSayisi > 0 && `(${seciliSayisi})`}
            </R.Buton>
            <R.Buton onClick={siparisineEkle} disabled={seciliSayisi === 0}>
              <R.ClipboardList size={15} /> Satın Alma Siparişine Ekle {seciliSayisi > 0 && `(${seciliSayisi})`}
            </R.Buton>
          </div>

          {oneriListesi.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Package} baslik="Kritik ürün yok" aciklama="Şu an minimum stoğun altına düşen veya sipariş önerisi olan ürün bulunmuyor." />
            </R.Kart>
          ) : (
            <>
              {/* Akıllı Uyarılar (10. madde) */}
              {akilliUyarilar.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {akilliUyarilar.map((u, i) => (
                    <div key={i} className="text-sm px-3 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      {u.emoji} {u.metin}
                    </div>
                  ))}
                </div>
              )}

            <R.Kart className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="px-3 py-2"></th>
                      <th className="text-left font-semibold px-2 py-2">Ürün / Marka</th>
                      <th className="text-right font-semibold px-2 py-2">Mevcut</th>
                      <th className="text-right font-semibold px-2 py-2">Min.</th>
                      <th className="text-right font-semibold px-2 py-2">Hedef</th>
                      <th className="text-right font-semibold px-2 py-2">Önerilen Sipariş</th>
                      <th className="text-right font-semibold px-2 py-2">Tahmini Maliyet</th>
                      <th className="text-left font-semibold px-2 py-2">Satış Hızı</th>
                      <th className="text-left font-semibold px-2 py-2">Son Alış</th>
                      <th className="text-left font-semibold px-2 py-2">En Uygun Tedarikçi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oneriListesi.map((x) => {
                      const enUygun = R.enUygunTedarikciBul(db, x.p.id);
                      const satisHizSinifi = R.satisHiziSiniflandir(db, x.p);
                      const birimMaliyet = enUygun ? enUygun.netMaliyet : R.gecerliMaliyet(x.p, db);
                      const tahminiMaliyet = x.onerilen * birimMaliyet;
                      return (
                      <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={!!secililer[x.p.id]} onChange={() => secimToggle(x.p.id)} />
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {x.kritik && <R.Rozet tone="red">🔴 Kritik</R.Rozet>}
                            <span style={{ color: R.T.ink900 }}>{x.p.ad}</span>
                          </div>
                          <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                            {x.p.marka} · {x.p.stokKodu}
                          </div>
                          {x.tahminiGun !== null && x.tahminiGun <= 14 && (
                            <div className="text-xs font-semibold mt-0.5" style={{ color: "#8A6110" }}>
                              ⚠️ Son 30 günde {x.son30} satıldı (günlük ~{x.ortalamaGunluk.toFixed(1)}) — yaklaşık {x.tahminiGun} günlük stok kaldı.
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold" style={{ ...R.MONO, color: x.kritik ? R.T.red : R.T.ink900 }}>
                          {x.p.stok}
                        </td>
                        <td className="px-2 py-2.5 text-right" style={R.MONO}>
                          {x.p.kritikSeviye}
                        </td>
                        <td className="px-2 py-2.5 text-right" style={R.MONO}>
                          {R.gecerliHedefStok(x.p)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <input
                            type="number"
                            value={x.onerilen}
                            onChange={(e) => {
                              const yeni = parseFloat(e.target.value) || 0;
                              setManuelAdetler((prev) => ({ ...prev, [x.p.id]: yeni }));
                              if (yeni !== x.onerilenOrijinal) {
                                const neden = window.prompt(`Öneri ${x.onerilenOrijinal} idi, ${yeni} yapıyorsunuz. Değişiklik nedeni (opsiyonel):`, manuelNedenler[x.p.id] || "");
                                if (neden !== null) setManuelNedenler((prev) => ({ ...prev, [x.p.id]: neden }));
                              }
                            }}
                            className="w-16 px-1.5 py-1 rounded border text-right font-semibold text-sm outline-none"
                            style={{ borderColor: x.onerilen !== x.onerilenOrijinal ? R.T.orange : R.T.steel300, ...R.MONO, color: R.T.orangeDark }}
                          />
                          {x.onerilen !== x.onerilenOrijinal && (
                            <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                              (önerilen: {x.onerilenOrijinal})
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                          {R.tl(tahminiMaliyet)}
                        </td>
                        <td className="px-2 py-2.5">
                          <R.Rozet tone={R.SATIS_HIZI_SINIF_GORSELI[satisHizSinifi].ton}>
                            {R.SATIS_HIZI_SINIF_GORSELI[satisHizSinifi].emoji} {satisHizSinifi}
                          </R.Rozet>
                          <div className="text-xs mt-0.5 font-semibold" style={{ color: satisHizSinifi === "Ölü Stok" || satisHizSinifi === "Yavaş" ? R.T.red : R.T.green }}>
                            {satisHizSinifi === "Ölü Stok" || satisHizSinifi === "Yavaş" ? "❌ Yeni sipariş önerme" : "🟢 Sipariş öner"}
                          </div>
                        </td>
                        <td className="px-2 py-2.5" style={{ color: R.T.ink500 }}>
                          {x.sonAlis ? R.tarihGoster(x.sonAlis) : "—"}
                        </td>
                        <td className="px-2 py-2.5" style={{ color: R.T.ink900 }}>
                          {enUygun ? (
                            <span>
                              ✅ {enUygun.tedarikciAdi} <span style={{ color: R.T.ink500 }}>({R.tl(enUygun.netMaliyet)})</span>
                            </span>
                          ) : (
                            <span style={{ color: R.T.ink500 }}>{x.p.tedarikci || "—"}</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </R.Kart>

            {/* Toplam önerilen alış (8. madde) */}
            {(() => {
              const toplamMaliyet = oneriListesi.reduce((t, x) => {
                const enUygun = R.enUygunTedarikciBul(db, x.p.id);
                const birimMaliyet = enUygun ? enUygun.netMaliyet : R.gecerliMaliyet(x.p, db);
                return t + x.onerilen * birimMaliyet;
              }, 0);
              return (
                <R.Kart className="p-4 flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                    Toplam önerilen alış
                  </span>
                  <span className="text-lg font-semibold" style={{ ...R.DISPLAY, color: R.T.orangeDark }}>
                    {R.tl(toplamMaliyet)}
                  </span>
                </R.Kart>
              );
            })()}
            </>
          )}
        </>
      )}

      {altSekme === "olu" && (
        <>
          <div className="flex rounded-md overflow-hidden border w-fit" style={{ borderColor: R.T.steel300 }}>
            {[
              { id: 30, ad: "30+ gün" },
              { id: 90, ad: "90+ gün" },
              { id: 180, ad: "180+ gün" },
              { id: 365, ad: "365+ gün" },
              { id: "hic", ad: "Hiç Satılmamış" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setOluFiltre(f.id)}
                className="px-3 py-2 text-xs font-semibold"
                style={{ background: oluFiltre === f.id ? R.T.graphite900 : "#fff", color: oluFiltre === f.id ? "#fff" : R.T.ink500 }}
              >
                {f.ad}
              </button>
            ))}
          </div>

          {oluListesi.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Package} baslik="Bu kritere uyan ürün yok" aciklama="Seçtiğiniz süreye göre ölü stok bulunmuyor." />
            </R.Kart>
          ) : (
            <R.Kart className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-3 py-2">Ürün / Marka</th>
                      <th className="text-right font-semibold px-2 py-2">Stok</th>
                      <th className="text-right font-semibold px-2 py-2">Stok Değeri</th>
                      <th className="text-left font-semibold px-2 py-2">Son Satış</th>
                      <th className="text-right font-semibold px-2 py-2">Gün</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oluListesi.map((x) => (
                      <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2.5">
                          <div style={{ color: R.T.ink900 }}>{x.p.ad}</div>
                          <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                            {x.p.marka} · {x.p.stokKodu}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold" style={R.MONO}>
                          {x.p.stok}
                        </td>
                        <td className="px-2 py-2.5 text-right" style={R.MONO}>
                          {R.tl(R.gecerliMaliyet(x.p) * x.p.stok)}
                        </td>
                        <td className="px-2 py-2.5" style={{ color: R.T.ink500 }}>
                          {x.sonTarih ? R.tarihGoster(x.sonTarih) : "Hiç satılmadı"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                          {x.gun !== null ? x.gun : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </R.Kart>
          )}
        </>
      )}
    </div>
  );
}

export function SayimSayfasi({ db, updateDb, aktifKullanici, baslangicKategori, baslangicMarka }) {
  const [aktifSayimId, setAktifSayimId] = R.useState(() => db.sayimlar.find((s) => s.durum === "Devam Ediyor")?.id || null);
  const [yeniSayimAcik, setYeniSayimAcik] = R.useState(!!baslangicKategori || !!baslangicMarka);
  const [kapsamTuru, setKapsamTuru] = R.useState(baslangicMarka ? "marka" : baslangicKategori ? "kategori" : "tumu");
  const [kapsamDeger, setKapsamDeger] = R.useState(baslangicMarka?.marka || baslangicKategori?.kategori || "");
  const [kapsamUrunIdleri, setKapsamUrunIdleri] = R.useState([]);
  const [urunGrubuArama, setUrunGrubuArama] = R.useState("");
  const [baslatan, setBaslatan] = R.useIslemYapan(aktifKullanici);
  const [barkodGiris, setBarkodGiris] = R.useState("");
  const [aramaMetni, setAramaMetni] = R.useState("");
  const [onayEkraniAcik, setOnayEkraniAcik] = R.useState(false);
  const [gecmisDetayId, setGecmisDetayId] = R.useState(null);
  const [sonOkutulan, setSonOkutulan] = R.useState(null); // { parca, sayilan } — yanlış ürün kontrolü (5. madde)
  const [barkodBulunamadiModal, setBarkodBulunamadiModal] = R.useState(null); // { kod }
  const [kameraAcik, setKameraAcik] = R.useState(false);
  const barkodRef = R.useRef(null);
  const videoRef = R.useRef(null);
  const kameraStreamRef = R.useRef(null);

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);
  const markalar = [...new Set(aktifParcalar.map((p) => p.marka).filter(Boolean))].sort();
  const kategoriler = [...new Set(aktifParcalar.map((p) => p.kategori).filter(Boolean))].sort();
  const raflar = [...new Set(aktifParcalar.flatMap((p) => R.parcaRafListesi(p).map((k) => k.kod)))].sort();

  const aktifSayim = aktifSayimId ? db.sayimlar.find((s) => s.id === aktifSayimId) : null;

  const sayimBaslat = () => {
    if ((kapsamTuru === "marka" || kapsamTuru === "kategori" || kapsamTuru === "raf") && !kapsamDeger) {
      R.bildirimGoster("Kapsam için bir değer seçin.", "hata");
      return;
    }
    if (kapsamTuru === "urunGrubu" && kapsamUrunIdleri.length === 0) {
      R.bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const id = R.yeniId("say");
    updateDb((prev) => ({
      ...prev,
      sayimlar: [
        { id, sayimNo: prev.sayimlar.length + 1, tarih: R.zamanDamgasi(), kapsamTuru, kapsamDeger, kapsamUrunIdleri, baslatan: baslatan.trim(), durum: "Devam Ediyor", kalemler: [] },
        ...prev.sayimlar,
      ],
    }));
    R.sonKullaniciAdiKaydet(baslatan);
    setAktifSayimId(id);
    setYeniSayimAcik(false);
  };

  const sayimIptalEt = () => {
    if (!window.confirm("Devam eden sayım silinsin mi? Sayılan veriler kaybolacak.")) return;
    updateDb((prev) => ({ ...prev, sayimlar: prev.sayimlar.filter((s) => s.id !== aktifSayimId) }));
    setAktifSayimId(null);
  };

  const sayilanAdetGuncelle = (parcaId, adet) => {
    updateDb((prev) => ({
      ...prev,
      sayimlar: prev.sayimlar.map((s) => {
        if (s.id !== aktifSayimId) return s;
        const mevcut = s.kalemler.some((k) => k.parcaId === parcaId);
        return {
          ...s,
          kalemler: mevcut ? s.kalemler.map((k) => (k.parcaId === parcaId ? { ...k, sayilanAdet: adet } : k)) : [...s.kalemler, { parcaId, sayilanAdet: adet }],
        };
      }),
    }));
  };

  // Barkod okutuldukça +1 artırır; tam barkod eşleşmesi bulunamazsa "Yeni
  // Ürün Oluştur / Barkodu Mevcut Ürüne Bağla" seçenekli modal açar (4. madde).
  // Hem elle Enter'a basmadan hem de kamera taramasından çağrılabilir olması
  // için ayrı bir fonksiyona çıkarılmıştır.
  const kodIsle = (kodHam) => {
    const kod = (kodHam || "").trim();
    if (!kod) return;
    const kapsam = R.sayimKapsamindakiParcalar(db, aktifSayim);
    const p = R.barkodluParcaBul(kapsam, kod);
    if (!p) {
      const herhangiUrun = R.barkodluParcaBul(db.parcalar, kod);
      if (herhangiUrun) {
        R.bildirimGoster("Bu ürün sayım kapsamının dışında.", "hata");
      } else {
        setBarkodBulunamadiModal({ kod });
      }
      setBarkodGiris("");
      return;
    }
    const mevcutKayit = aktifSayim.kalemler.find((k) => k.parcaId === p.id);
    const yeniAdet = (mevcutKayit?.sayilanAdet || 0) + 1;
    sayilanAdetGuncelle(p.id, yeniAdet);
    setSonOkutulan({ parca: p, sayilan: yeniAdet }); // Yanlış ürün kontrolü (5. madde) — foto/marka/raf/sistem stoğu gösterilir.
    setBarkodGiris("");
  };

  const barkodEnter = (e) => {
    if (e.key !== "Enter") return;
    kodIsle(barkodGiris);
  };

  // --- Mobil kullanım: telefon/tablet kamerasıyla barkod okutma (9. madde) -----
  // Tarayıcının yerleşik BarcodeDetector API'sini kullanır — bu API şu an
  // Chrome/Edge/Android'de desteklenir; iOS Safari'de HENÜZ desteklenmez,
  // bu durumda kullanıcıya açıkça bildirilir ve elle/harici okuyucu ile
  // devam edilebilir.
  const sonTaranan = R.useRef("");
  const kameraBaslat = async () => {
    if (!("BarcodeDetector" in window)) {
      R.bildirimGoster("Bu tarayıcı kamera ile barkod okumayı desteklemiyor (Chrome/Android önerilir). Harici barkod okuyucu veya elle giriş kullanabilirsiniz.", "hata");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      kameraStreamRef.current = stream;
      setKameraAcik(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "upc_a"] });
      const tara = async () => {
        if (!kameraStreamRef.current || !videoRef.current) return;
        try {
          const barkodlar = await detector.detect(videoRef.current);
          if (barkodlar.length > 0 && barkodlar[0].rawValue !== sonTaranan.current) {
            sonTaranan.current = barkodlar[0].rawValue;
            kodIsle(barkodlar[0].rawValue);
            setTimeout(() => (sonTaranan.current = ""), 1200); // aynı barkodu art arda tekrar saymayı önler
          }
        } catch (err) {
          /* tarama hatası — bir sonraki karede tekrar denenir */
        }
        if (kameraStreamRef.current) requestAnimationFrame(tara);
      };
      requestAnimationFrame(tara);
    } catch (err) {
      R.bildirimGoster("Kameraya erişilemedi — tarayıcı izni kontrol edin.", "hata");
    }
  };
  const kameraDurdur = () => {
    kameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    kameraStreamRef.current = null;
    setKameraAcik(false);
  };
  R.useEffect(() => () => kameraStreamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const canliOzet = aktifSayim ? R.sayimOzetiHesapla(db, aktifSayim) : null;
  const gorunenSatirlar = canliOzet
    ? aramaMetni.trim()
      ? canliOzet.satirlar.filter(
          (x) => x.p.ad.toLowerCase().includes(aramaMetni.toLowerCase()) || R.kodNormalize(x.p.stokKodu).includes(R.kodNormalize(aramaMetni))
        )
      : canliOzet.satirlar
    : [];

  const sayimiOnayla = () => {
    const ozet = R.sayimOzetiHesapla(db, aktifSayim);
    // Onay sistemi (8. madde): Sayım Sonuçları → Farkları İncele → Yönetici
    // Onayı → Stokları Güncelle. Fark yoksa onay istemeye gerek yok.
    if ((ozet.eksik > 0 || ozet.fazla > 0) && !R.yetkiVarMi(db, aktifKullanici, "stokDuzeltebilir")) {
      const onay = R.yoneticiOnayiAl(db, `Bu sayımda ${ozet.eksik + ozet.fazla} üründe fark var — stokları güncellemek için yönetici onayı gerekiyor.`);
      if (!onay) {
        R.bildirimGoster("Sayım onaylanmadı — stoklar değişmedi.", "hata");
        return;
      }
    }
    let stokEngellendi = false;
    updateDb((prev) => {
      let sonuc = prev;
      for (const satir of ozet.satirlar) {
        if (satir.fark === null || satir.fark === 0) continue;
        const yeni = R.stokHareketiUygula(sonuc, {
          parcaId: satir.p.id,
          tur: satir.fark < 0 ? "Sayım Eksiği" : "Sayım Fazlası",
          giris: satir.fark > 0 ? satir.fark : 0,
          cikis: satir.fark < 0 ? -satir.fark : 0,
          belgeNo: aktifSayim.id.slice(-6).toUpperCase(),
          kullanici: baslatan.trim(),
          aciklama: `Stok sayımı (${aktifSayim.kapsamTuru === "tumu" ? "Tüm Stok" : aktifSayim.kapsamDeger})`,
        });
        if (!yeni) {
          stokEngellendi = true;
          return prev;
        }
        sonuc = yeni;
      }
      return {
        ...sonuc,
        sayimlar: sonuc.sayimlar.map((s) =>
          s.id === aktifSayim.id
            ? {
                ...s,
                // Fark değerleri, o anki sistem stoğuyla birlikte kalıcı olarak
                // saklanır — geçmiş sayım detayında yeniden hesaplamaya gerek kalmaz.
                kalemler: s.kalemler.map((k) => {
                  const satir = ozet.satirlar.find((x) => x.p.id === k.parcaId);
                  return satir ? { ...k, sistemStoguOSirada: satir.sistemStogu, fark: satir.fark } : k;
                }),
                durum: "Onaylandı",
                onaylayanKullanici: aktifKullanici?.adSoyad || baslatan.trim(),
                onayTarihi: R.zamanDamgasi(),
                ozet: { toplam: ozet.toplam, eksik: ozet.eksik, fazla: ozet.fazla, dogru: ozet.dogru, sayilmayan: ozet.sayilmayan },
                maliFark: { eksikMaliyet: ozet.eksikMaliyet, fazlaMaliyet: ozet.fazlaMaliyet, net: ozet.net },
              }
            : s
        ),
      };
    });
    if (stokEngellendi) {
      R.bildirimGoster("Sayım onaylanamadı — bir üründe beklenmeyen bir stok sorunu oluştu.", "hata");
      return;
    }
    R.bildirimGoster("Sayım onaylandı, stok farkları hareket olarak işlendi.", "basari");
    setOnayEkraniAcik(false);
    setAktifSayimId(null);
  };

  const gecmisSayimlar = db.sayimlar.filter((s) => s.durum === "Onaylandı");
  const gecmisDetay = gecmisDetayId ? db.sayimlar.find((s) => s.id === gecmisDetayId) : null;

  const kapsamEtiketi = (s) =>
    s.kapsamTuru === "tumu" ? "Tüm Stok" : `${s.kapsamTuru === "marka" ? "Marka" : s.kapsamTuru === "kategori" ? "Kategori" : "Raf"}: ${s.kapsamDeger}`;

  // --- Onay ekranı (Sayım Farkları) --------------------------------------
  if (aktifSayim && onayEkraniAcik) {
    const ozet = canliOzet;
    return (
      <div className="flex flex-col gap-5">
        <div className="px-3.5 py-2.5 rounded-md text-sm flex items-center justify-between" style={{ background: "#FDF1D6", color: "#8A6110" }}>
          <span>Sayım #{aktifSayim.sayimNo} Farkları — henüz stoklar değişmedi</span>
          <button onClick={() => setOnayEkraniAcik(false)} className="font-semibold underline">
            Sayıma Geri Dön
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { etiket: "Toplam Sayılan", deger: ozet.toplam - ozet.sayilmayan, ton: "graphite" },
            { etiket: "Eksik", deger: ozet.eksik, ton: "red" },
            { etiket: "Fazla", deger: ozet.fazla, ton: "green" },
            { etiket: "Doğru", deger: ozet.dogru, ton: "graphite" },
            { etiket: "Sayılmayan", deger: ozet.sayilmayan, ton: "yellow" },
          ].map((k) => (
            <R.Kart key={k.etiket} className="p-3.5">
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {k.etiket}
              </div>
              <div
                className="text-xl font-semibold mt-0.5"
                style={{ ...R.DISPLAY, color: k.ton === "red" ? R.T.red : k.ton === "green" ? R.T.green : k.ton === "yellow" ? "#8A6110" : R.T.ink900 }}
              >
                {k.deger}
              </div>
            </R.Kart>
          ))}
        </div>

        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Mali Fark
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Eksik Stok Maliyeti
              </div>
              <div className="text-lg font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                −{R.tl(ozet.eksikMaliyet)}
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Fazla Stok Maliyeti
              </div>
              <div className="text-lg font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                +{R.tl(ozet.fazlaMaliyet)}
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Net Stok Farkı
              </div>
              <div className="text-lg font-semibold" style={{ ...R.MONO, color: ozet.net >= 0 ? R.T.green : R.T.red }}>
                {R.tl(ozet.net)}
              </div>
            </div>
          </div>
        </R.Kart>

        {ozet.sayilmayan > 0 && (
          <p className="text-xs px-3 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
            {ozet.sayilmayan} ürün henüz sayılmadı — bunlar için stok değişikliği yapılmayacak, mevcut sistem stoğu korunacak.
          </p>
        )}

        <R.Kart className="overflow-hidden">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  <th className="text-left font-semibold px-3 py-2">Ürün</th>
                  <th className="text-right font-semibold px-2 py-2">Sistem</th>
                  <th className="text-right font-semibold px-2 py-2">Sayılan</th>
                  <th className="text-right font-semibold px-2 py-2">Fark</th>
                </tr>
              </thead>
              <tbody>
                {ozet.satirlar
                  .filter((x) => x.fark !== null && x.fark !== 0)
                  .map((x) => (
                    <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2">{x.p.ad}</td>
                      <td className="px-2 py-2 text-right" style={R.MONO}>
                        {x.sistemStogu}
                      </td>
                      <td className="px-2 py-2 text-right" style={R.MONO}>
                        {x.sayilan}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ ...R.MONO, color: x.fark < 0 ? R.T.red : R.T.green }}>
                        {x.fark < 0 ? `🔴 ${x.fark}` : `🟢 +${x.fark}`}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </R.Kart>

        <R.Buton onClick={sayimiOnayla}>
          <R.Check size={16} /> Sayımı Onayla ve Stokları Güncelle
        </R.Buton>
      </div>
    );
  }

  // --- Sayım ekranı (devam eden sayım) ------------------------------------
  if (aktifSayim) {
    const tamamlanmaYuzdesi = canliOzet.toplam > 0 ? Math.round(((canliOzet.toplam - canliOzet.sayilmayan) / canliOzet.toplam) * 100) : 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="px-3.5 py-2.5 rounded-md text-sm flex items-center justify-between flex-wrap gap-2" style={{ background: "#FDF1D6", color: "#8A6110" }}>
          <span>
            <strong>Sayım #{aktifSayim.sayimNo}</strong> — {kapsamEtiketi(aktifSayim)} · Başlatan: {aktifSayim.baslatan || "—"} · <strong>%{tamamlanmaYuzdesi} tamamlandı</strong>
          </span>
          <button onClick={sayimIptalEt} className="font-semibold underline shrink-0">
            Sayımı İptal Et
          </button>
        </div>

        {/* Yanlış ürün kontrolü (5. madde) — son okutulan ürünün foto/marka/raf/stok bilgisi */}
        {sonOkutulan && (
          <R.Kart className="p-3 flex items-center gap-3" style={{ borderColor: R.T.green, borderWidth: 2 }}>
            {sonOkutulan.parca.fotograflar?.[0]?.url ? (
              <img src={sonOkutulan.parca.fotograflar[0].url} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-md flex items-center justify-center shrink-0" style={{ background: R.T.steel100 }}>
                <R.ImageIcon size={20} style={{ color: R.T.ink500 }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: R.T.ink900 }}>
                ✅ {sonOkutulan.parca.marka} — {sonOkutulan.parca.ad}
              </div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Raf: {R.parcaRafListesi(sonOkutulan.parca)[0]?.kod || "—"} · Sistem Stoğu: {sonOkutulan.parca.stok} · Sayılan: <strong>{sonOkutulan.sayilan}</strong>
              </div>
            </div>
          </R.Kart>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { etiket: "Toplam Ürün", deger: canliOzet.toplam },
            { etiket: "Sayılan", deger: canliOzet.toplam - canliOzet.sayilmayan },
            { etiket: "Farklı", deger: canliOzet.eksik + canliOzet.fazla },
            { etiket: "Doğru", deger: canliOzet.dogru },
          ].map((k) => (
            <R.Kart key={k.etiket} className="p-3">
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {k.etiket}
              </div>
              <div style={{ ...R.DISPLAY, fontSize: 20, color: R.T.ink900 }}>{k.deger}</div>
            </R.Kart>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <R.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
            <input
              ref={barkodRef}
              value={barkodGiris}
              onChange={(e) => setBarkodGiris(e.target.value)}
              onKeyDown={barkodEnter}
              placeholder="Barkod okutun (her okutmada +1 sayılır) veya ürün adı/kod ile arayıp aşağıdan elle girin…"
              className="w-full pl-10 pr-3 py-3 rounded-lg border text-sm outline-none focus:ring-2"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
              autoFocus
            />
          </div>
          <button onClick={kameraBaslat} title="Telefon/tablet kamerasıyla barkod okut" className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: R.T.graphite900, color: "#fff" }}>
            <R.ScanLine size={20} />
          </button>
        </div>
        <R.Girdi value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} placeholder="Listeyi ürün adı/koduna göre filtrele…" />

        <R.Kart className="overflow-hidden">
          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  <th className="text-left font-semibold px-3 py-2">Ürün Kodu / Marka / Ürün</th>
                  <th className="text-left font-semibold px-2 py-2">Raf</th>
                  <th className="text-right font-semibold px-2 py-2">Sistem</th>
                  <th className="text-center font-semibold px-2 py-2">Sayılan</th>
                  <th className="text-right font-semibold px-2 py-2">Fark</th>
                </tr>
              </thead>
              <tbody>
                {gorunenSatirlar.map((x) => (
                  <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                    <td className="px-3 py-2">
                      <div style={{ color: R.T.ink900 }}>{x.p.ad}</div>
                      <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                        {x.p.stokKodu} · {x.p.marka}
                      </div>
                    </td>
                    <td className="px-2 py-2" style={{ color: R.T.ink500 }}>
                      {R.parcaRafListesi(x.p)[0]?.kod || "—"}
                    </td>
                    <td className="px-2 py-2 text-right" style={R.MONO}>
                      {x.sistemStogu}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={x.sayilan ?? ""}
                        onChange={(e) => sayilanAdetGuncelle(x.p.id, e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
                        placeholder="—"
                        className="w-20 mx-auto block px-1.5 py-1 rounded border text-sm text-center outline-none"
                        style={{ borderColor: R.T.steel300 }}
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-semibold" style={{ ...R.MONO, color: x.fark === null ? R.T.ink500 : x.fark < 0 ? R.T.red : x.fark > 0 ? R.T.green : R.T.ink500 }}>
                      {x.fark === null ? "—" : x.fark === 0 ? "0" : x.fark < 0 ? `🔴 ${x.fark}` : `🟢 +${x.fark}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </R.Kart>

        <R.Buton onClick={() => setOnayEkraniAcik(true)}>
          <R.ClipboardList size={16} /> Sayımı Bitir — Farkları Gör
        </R.Buton>

        {/* Barkod bulunamadı — Yeni Ürün Oluştur / Barkodu Mevcut Ürüne Bağla (4. madde) */}
        {barkodBulunamadiModal && (
          <BarkodBulunamadiModal db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} kod={barkodBulunamadiModal.kod} onKapat={() => setBarkodBulunamadiModal(null)} />
        )}

        {/* Mobil kamera ile barkod okutma (9. madde) */}
        {kameraAcik && (
          <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
            <video ref={videoRef} playsInline muted className="w-full max-w-sm rounded-lg" style={{ background: "#000" }} />
            <p className="text-white text-sm mt-4 text-center max-w-sm">Barkodu kamera görüş alanına getirin — otomatik algılanacaktır.</p>
            <button onClick={kameraDurdur} className="mt-4 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: "#fff", color: R.T.ink900 }}>
              Kamerayı Kapat
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Ana ekran: geçmiş sayımlar + yeni sayım başlatma --------------------
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: R.T.ink500 }}>
          Şu anda devam eden bir sayım yok.
        </span>
        <R.Buton onClick={() => setYeniSayimAcik(true)}>
          <R.Plus size={15} /> Yeni Sayım Başlat
        </R.Buton>
      </div>

      {gecmisSayimlar.length === 0 ? (
        <R.Kart>
          <R.Bos ikon={R.ClipboardList} baslik="Henüz sayım yapılmadı" aciklama="İlk stok sayımınızı başlatarak sistem stoğu ile fiziksel stoğu karşılaştırın." />
        </R.Kart>
      ) : (
        <R.Kart className="overflow-hidden">
          <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
            <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
              Geçmiş Sayımlar
            </span>
          </div>
          {gecmisSayimlar.map((s) => (
            <button
              key={s.id}
              onClick={() => setGecmisDetayId(s.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50"
              style={{ borderTop: `1px solid ${R.T.steel200}` }}
            >
              <div>
                <div style={{ color: R.T.ink900 }}>
                  <strong>Sayım #{s.sayimNo}</strong> — {kapsamEtiketi(s)} <span style={{ color: R.T.ink500 }}>· {R.tarihGoster(s.onayTarihi || s.tarih)}</span>
                </div>
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  {s.ozet?.toplam || 0} ürün · {s.ozet?.eksik || 0} eksik · {s.ozet?.fazla || 0} fazla · {s.ozet?.dogru || 0} doğru · Başlatan: {s.baslatan || "—"} · Onaylayan: {s.onaylayanKullanici || "—"}
                </div>
              </div>
              <span className="font-semibold shrink-0" style={{ ...R.MONO, color: (s.maliFark?.net || 0) >= 0 ? R.T.green : R.T.red }}>
                {R.tl(s.maliFark?.net || 0)}
              </span>
            </button>
          ))}
        </R.Kart>
      )}

      {/* Yeni sayım başlatma modalı */}
      {yeniSayimAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setYeniSayimAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Yeni Sayım Başlat
              </h3>
              <button onClick={() => setYeniSayimAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <R.Secim
                label="Kapsam"
                value={kapsamTuru}
                onChange={(e) => {
                  setKapsamTuru(e.target.value);
                  setKapsamDeger("");
                }}
              >
                <option value="tumu">Tüm Stok</option>
                <option value="marka">Marka</option>
                <option value="kategori">Kategori</option>
                <option value="raf">Raf</option>
                <option value="urunGrubu">Belirli Ürün Grubu</option>
              </R.Secim>
              {kapsamTuru === "marka" && (
                <R.Secim value={kapsamDeger} onChange={(e) => setKapsamDeger(e.target.value)}>
                  <option value="">Marka seçin…</option>
                  {markalar.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </R.Secim>
              )}
              {kapsamTuru === "kategori" && (
                <R.Secim value={kapsamDeger} onChange={(e) => setKapsamDeger(e.target.value)}>
                  <option value="">Kategori seçin…</option>
                  {kategoriler.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </R.Secim>
              )}
              {kapsamTuru === "raf" && (
                <R.Secim value={kapsamDeger} onChange={(e) => setKapsamDeger(e.target.value)}>
                  <option value="">Raf seçin…</option>
                  {raflar.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </R.Secim>
              )}
              {kapsamTuru === "urunGrubu" && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      value={urunGrubuArama}
                      onChange={(e) => setUrunGrubuArama(e.target.value)}
                      placeholder="Ürün ara ve ekle…"
                      className="w-full px-3 py-2 rounded-md border text-sm outline-none"
                      style={{ borderColor: R.T.steel300 }}
                    />
                    {urunGrubuArama.trim() && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-40 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                        {R.hizliAramaYap(db, urunGrubuArama)
                          .filter((p) => !kapsamUrunIdleri.includes(p.id))
                          .slice(0, 6)
                          .map((p) => (
                            <button
                              key={p.id}
                              onMouseDown={() => {
                                setKapsamUrunIdleri((prev) => [...prev, p.id]);
                                setUrunGrubuArama("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              style={{ color: R.T.ink900 }}
                            >
                              {p.ad}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  {kapsamUrunIdleri.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {kapsamUrunIdleri.map((id) => {
                        const p = db.parcalar.find((x) => x.id === id);
                        return (
                          <span key={id} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                            {p?.ad || "—"}
                            <button onClick={() => setKapsamUrunIdleri((prev) => prev.filter((x) => x !== id))} style={{ color: R.T.red }}>
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <R.Girdi label="Sayımı Başlatan" value={baslatan} readOnly />
              <R.Buton onClick={sayimBaslat}>
                <R.Check size={15} /> Sayımı Başlat
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Geçmiş sayım detayı */}
      {gecmisDetay && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setGecmisDetayId(null)}>
          <div className="w-full max-w-2xl rounded-lg overflow-hidden" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {kapsamEtiketi(gecmisDetay)} — {R.tarihGoster(gecmisDetay.onayTarihi)}
              </h3>
              <button onClick={() => setGecmisDetayId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-4" style={{ maxHeight: "75vh" }}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Eksik Maliyeti
                  </div>
                  <div className="font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                    −{R.tl(gecmisDetay.maliFark?.eksikMaliyet || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Fazla Maliyeti
                  </div>
                  <div className="font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                    +{R.tl(gecmisDetay.maliFark?.fazlaMaliyet || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Net Fark
                  </div>
                  <div className="font-semibold" style={{ ...R.MONO, color: (gecmisDetay.maliFark?.net || 0) >= 0 ? R.T.green : R.T.red }}>
                    {R.tl(gecmisDetay.maliFark?.net || 0)}
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-2 py-1.5">Ürün</th>
                    <th className="text-right font-semibold px-2 py-1.5">Sayılan</th>
                    <th className="text-right font-semibold px-2 py-1.5">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {gecmisDetay.kalemler
                    .filter((k) => k.fark !== 0 && k.fark !== undefined)
                    .map((k) => {
                      const p = db.parcalar.find((x) => x.id === k.parcaId);
                      if (!p) return null;
                      return (
                        <tr key={k.parcaId} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                          <td className="px-2 py-1.5">{p.ad}</td>
                          <td className="px-2 py-1.5 text-right" style={R.MONO}>
                            {k.sayilanAdet}
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold" style={{ ...R.MONO, color: k.fark < 0 ? R.T.red : R.T.green }}>
                            {k.fark < 0 ? `🔴 ${k.fark}` : `🟢 +${k.fark}`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BarkodBulunamadiModal({ db, updateDb, aktifKullanici, kod, onKapat }) {
  const [mod, setMod] = R.useState(null); // null | "yeni" | "bagla"
  const [yeniUrunForm, setYeniUrunForm] = R.useState({ stokKodu: "", ad: "", marka: "", satisFiyati: "" });
  const [baglaArama, setBaglaArama] = R.useState("");

  const yeniUrunOlustur = () => {
    if (!yeniUrunForm.stokKodu.trim() || !yeniUrunForm.ad.trim()) {
      R.bildirimGoster("Stok kodu ve ürün adı zorunludur.", "hata");
      return;
    }
    const yeniParca = {
      id: R.yeniId("p"),
      stokKodu: yeniUrunForm.stokKodu.trim(),
      ad: yeniUrunForm.ad.trim(),
      marka: yeniUrunForm.marka.trim(),
      barkod: kod,
      barkodlar: [{ id: R.yeniId("bk"), kod, birincil: true }],
      birim: "Adet",
      kdvOrani: 20,
      satisFiyati: parseFloat(yeniUrunForm.satisFiyati) || 0,
      stok: 0,
      kritikSeviye: 0,
      aktif: true,
    };
    updateDb((prev) => R.veriyiOnar({ ...prev, parcalar: [...prev.parcalar, yeniParca] }));
    R.bildirimGoster("Yeni ürün oluşturuldu — sayıma dahil etmek için sayımı yeniden başlatmanız gerekebilir.", "basari");
    onKapat();
  };

  const aramaSonuclari = baglaArama.trim() ? R.hizliAramaYap(db, baglaArama).slice(0, 6) : [];
  const baglaVeKapat = (p) => {
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((x) => (x.id === p.id ? { ...x, barkodlar: [...(x.barkodlar || []), { id: R.yeniId("bk"), kod, birincil: false }] } : x)),
    }));
    R.bildirimGoster(`Barkod, "${p.ad}" ürününe bağlandı.`, "basari");
    onKapat();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onKapat}>
      <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
          ⚠️ Bu barkod kayıtlı değil
        </h3>
        <p className="text-xs mb-3" style={{ ...R.MONO, color: R.T.ink500 }}>
          {kod}
        </p>

        {!mod && (
          <div className="flex flex-col gap-2">
            <R.Buton onClick={() => setMod("yeni")}>
              <R.Plus size={14} /> Yeni Ürün Oluştur
            </R.Buton>
            <R.Buton variant="ghost" onClick={() => setMod("bagla")}>
              Barkodu Mevcut Ürüne Bağla
            </R.Buton>
            <R.Buton variant="ghost" onClick={onKapat}>
              Vazgeç
            </R.Buton>
          </div>
        )}

        {mod === "yeni" && (
          <div className="flex flex-col gap-2">
            <R.Girdi label="Stok Kodu *" value={yeniUrunForm.stokKodu} onChange={(e) => setYeniUrunForm({ ...yeniUrunForm, stokKodu: e.target.value })} />
            <R.Girdi label="Ürün Adı *" value={yeniUrunForm.ad} onChange={(e) => setYeniUrunForm({ ...yeniUrunForm, ad: e.target.value })} />
            <R.Girdi label="Marka" value={yeniUrunForm.marka} onChange={(e) => setYeniUrunForm({ ...yeniUrunForm, marka: e.target.value })} />
            <R.Girdi label="Satış Fiyatı" type="number" value={yeniUrunForm.satisFiyati} onChange={(e) => setYeniUrunForm({ ...yeniUrunForm, satisFiyati: e.target.value })} />
            <R.Buton onClick={yeniUrunOlustur}>
              <R.Check size={14} /> Ürünü Oluştur
            </R.Buton>
            <R.Buton variant="ghost" onClick={() => setMod(null)}>
              Geri
            </R.Buton>
          </div>
        )}

        {mod === "bagla" && (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                value={baglaArama}
                onChange={(e) => setBaglaArama(e.target.value)}
                placeholder="Ürün ara…"
                className="w-full px-3 py-2 rounded-md border text-sm outline-none"
                style={{ borderColor: R.T.steel300 }}
                autoFocus
              />
              {aramaSonuclari.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-44 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                  {aramaSonuclari.map((p) => (
                    <button key={p.id} onMouseDown={() => baglaVeKapat(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: R.T.ink900 }}>
                      {p.ad} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {p.stokKodu}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <R.Buton variant="ghost" onClick={() => setMod(null)}>
              Geri
            </R.Buton>
          </div>
        )}
      </div>
    </div>
  );
}

export function TopluFiyatSayfasi({ db, updateDb, aktifKullanici, baslangicKategori, baslangicMarka }) {
  const [kriterTuru, setKriterTuru] = R.useState(baslangicMarka ? "marka" : baslangicKategori ? "kategori" : "tumu");
  const [kriterDeger, setKriterDeger] = R.useState(baslangicMarka?.marka || baslangicKategori?.kategori || "");
  const [belirliArama, setBelirliArama] = R.useState("");
  const [belirliSecili, setBelirliSecili] = R.useState({});
  const [tabanTuru, setTabanTuru] = R.useState(baslangicMarka?.taban || "satisFiyati");
  const [oranDeger, setOranDeger] = R.useState(baslangicMarka?.oran || "10");
  const [yuvarlamaBirim, setYuvarlamaBirim] = R.useState(db.ayarlar.fiyatYuvarlama || 0);
  const [degisiklikNedeni, setDegisiklikNedeni] = R.useState("");
  const [kullanici, setKullanici] = R.useIslemYapan(aktifKullanici);
  const [uygulandi, setUygulandi] = R.useState(null);

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);
  const markalar = [...new Set(aktifParcalar.map((p) => p.marka).filter(Boolean))].sort();
  const kategoriler = [...new Set(aktifParcalar.map((p) => p.kategori).filter(Boolean))].sort();
  const tedarikciler = [...new Set(aktifParcalar.map((p) => p.tedarikci).filter(Boolean))].sort();

  const hedefAltiSayisi = aktifParcalar.filter((p) => R.hedefKarAltindaMi(p, db.hedefKarAyari)).length;

  const belirliAramaSonuclari = belirliArama.trim() ? R.hizliAramaYap(db, belirliArama).slice(0, 8) : [];

  const filtreliUrunler = (() => {
    switch (kriterTuru) {
      case "marka":
        return kriterDeger ? aktifParcalar.filter((p) => p.marka === kriterDeger) : [];
      case "kategori":
        return kriterDeger ? aktifParcalar.filter((p) => p.kategori === kriterDeger) : [];
      case "tedarikci":
        return kriterDeger ? aktifParcalar.filter((p) => p.tedarikci === kriterDeger) : [];
      case "belirli":
        return aktifParcalar.filter((p) => belirliSecili[p.id]);
      case "maliyetiDegisen":
        return aktifParcalar.filter((p) => R.hedefKarAltindaMi(p, db.hedefKarAyari));
      default:
        return aktifParcalar;
    }
  })();

  // --- Önizleme (canlı, ONAYLANMADAN hiçbir şey değişmez) ------------------
  const onizleme = filtreliUrunler.map((p) => {
    const maliyet = R.gecerliMaliyet(p);
    const oran = parseFloat(oranDeger) || 0;
    const taban = tabanTuru === "satisFiyati" ? p.satisFiyati || 0 : tabanTuru === "sonAlisFiyati" ? p.sonAlisFiyati || p.alisFiyati || 0 : maliyet;

    let hesaplananKdvDahil;
    if (tabanTuru === "satisFiyati") {
      hesaplananKdvDahil = taban * (1 + oran / 100);
    } else {
      const net = taban * (1 + oran / 100);
      hesaplananKdvDahil = net * (1 + (p.kdvOrani || 0) / 100);
    }
    const yeniFiyat = R.fiyatYuvarla(hesaplananKdvDahil, yuvarlamaBirim);
    const yeniFiyatNet = yeniFiyat / (1 + (p.kdvOrani || 0) / 100);
    const karTutari = yeniFiyatNet - maliyet;
    const karYuzde = maliyet > 0 ? (karTutari / maliyet) * 100 : null;
    return { p, maliyet, eskiFiyat: p.satisFiyati || 0, yeniFiyat, karTutari, karYuzde };
  });

  const filtreOzetiMetni = () => {
    if (kriterTuru === "tumu") return "Tüm ürünler";
    if (kriterTuru === "belirli") return `${filtreliUrunler.length} seçili ürün`;
    if (kriterTuru === "maliyetiDegisen") return "Hedef kârın altındaki ürünler";
    return `${kriterTuru === "marka" ? "Marka" : kriterTuru === "kategori" ? "Kategori" : "Tedarikçi"}: ${kriterDeger}`;
  };
  const yontemOzetiMetni = () =>
    `${tabanTuru === "satisFiyati" ? "Satış Fiyatı" : tabanTuru === "sonAlisFiyati" ? "Son Alış Fiyatı" : "Ortalama Maliyet"} + %${oranDeger}`;

  const fiyatlariOnayla = () => {
    if (!degisiklikNedeni.trim()) {
      R.bildirimGoster("Değişiklik nedeni zorunludur.", "hata");
      return;
    }
    const degisenler = onizleme.filter((x) => Math.abs(x.yeniFiyat - x.eskiFiyat) > 0.001);
    if (degisenler.length === 0) {
      R.bildirimGoster("Fiyatı değişecek ürün yok.", "hata");
      return;
    }
    const batchId = R.yeniId("tf");
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => {
        const satir = degisenler.find((x) => x.p.id === p.id);
        if (!satir) return p;
        return {
          ...p,
          satisFiyati: satir.yeniFiyat,
          fiyatGecmisi: [
            {
              id: R.yeniId("f"),
              tarih: R.zamanDamgasi(),
              eskiFiyat: satir.eskiFiyat,
              yeniFiyat: satir.yeniFiyat,
              kullanici: kullanici.trim(),
              degisiklikNedeni: degisiklikNedeni.trim(),
              topluIslemId: batchId,
            },
            ...(p.fiyatGecmisi || []),
          ],
        };
      }),
      ayarlar: { ...prev.ayarlar, fiyatYuvarlama: yuvarlamaBirim },
      topluFiyatIslemleri: [
        {
          id: batchId,
          tarih: R.zamanDamgasi(),
          kullanici: kullanici.trim(),
          degisiklikNedeni: degisiklikNedeni.trim(),
          filtreOzeti: filtreOzetiMetni(),
          yontemOzeti: yontemOzetiMetni(),
          etkilenenUrunSayisi: degisenler.length,
          geriAlindiMi: false,
        },
        ...prev.topluFiyatIslemleri,
      ],
    }));
    R.sonKullaniciAdiKaydet(kullanici);
    setUygulandi({ sayi: degisenler.length });
    R.bildirimGoster(`${degisenler.length} ürünün fiyatı güncellendi.`, "basari");
    setDegisiklikNedeni("");
  };

  const sonGeriAlinabilirIslem = db.topluFiyatIslemleri.find((i) => !i.geriAlindiMi);

  const sonIslemiGeriAl = () => {
    if (!sonGeriAlinabilirIslem) return;
    if (!window.confirm(`"${sonGeriAlinabilirIslem.degisiklikNedeni}" (${sonGeriAlinabilirIslem.etkilenenUrunSayisi} ürün) geri alınsın mı?`)) return;
    const islem = sonGeriAlinabilirIslem;
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => {
        const kayit = (p.fiyatGecmisi || []).find((f) => f.topluIslemId === islem.id);
        if (!kayit) return p;
        return {
          ...p,
          satisFiyati: kayit.eskiFiyat,
          fiyatGecmisi: [
            {
              id: R.yeniId("f"),
              tarih: R.zamanDamgasi(),
              eskiFiyat: p.satisFiyati,
              yeniFiyat: kayit.eskiFiyat,
              kullanici: kullanici.trim(),
              degisiklikNedeni: `Geri alma: ${islem.degisiklikNedeni}`,
              topluIslemId: null,
            },
            ...(p.fiyatGecmisi || []),
          ],
        };
      }),
      topluFiyatIslemleri: prev.topluFiyatIslemleri.map((i) => (i.id === islem.id ? { ...i, geriAlindiMi: true } : i)),
    }));
    R.bildirimGoster("Son toplu fiyat güncellemesi geri alındı.", "basari");
  };

  return (
    <div className="flex flex-col gap-5">
      {hedefAltiSayisi > 0 && (
        <button
          onClick={() => {
            setKriterTuru("maliyetiDegisen");
            setKriterDeger("");
          }}
          className="text-left px-4 py-2.5 rounded-md text-sm font-semibold"
          style={{ background: "#F9DEDE", color: R.T.red }}
        >
          🔴 {hedefAltiSayisi} ürün hedef kâr oranının altında — düzeltmek için tıklayın.
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <R.Kart className="p-4 flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
              1. Hangi Ürünler?
            </span>
            <R.Secim
              value={kriterTuru}
              onChange={(e) => {
                setKriterTuru(e.target.value);
                setKriterDeger("");
              }}
            >
              <option value="tumu">Tüm Ürünler</option>
              <option value="marka">Marka</option>
              <option value="kategori">Ürün Grubu / Kategori</option>
              <option value="tedarikci">Tedarikçi</option>
              <option value="belirli">Belirli Ürünler</option>
              <option value="maliyetiDegisen">Hedef Kârın Altındakiler</option>
            </R.Secim>
            {kriterTuru === "marka" && (
              <R.Secim value={kriterDeger} onChange={(e) => setKriterDeger(e.target.value)}>
                <option value="">Marka seçin…</option>
                {markalar.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </R.Secim>
            )}
            {kriterTuru === "kategori" && (
              <R.Secim value={kriterDeger} onChange={(e) => setKriterDeger(e.target.value)}>
                <option value="">Kategori seçin…</option>
                {kategoriler.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </R.Secim>
            )}
            {kriterTuru === "tedarikci" && (
              <R.Secim value={kriterDeger} onChange={(e) => setKriterDeger(e.target.value)}>
                <option value="">Tedarikçi seçin…</option>
                {tedarikciler.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </R.Secim>
            )}
            {kriterTuru === "belirli" && (
              <div className="relative">
                <input
                  value={belirliArama}
                  onChange={(e) => setBelirliArama(e.target.value)}
                  placeholder="Ürün ara ve ekle…"
                  className="w-full px-3 py-2 rounded-md border text-sm outline-none"
                  style={{ borderColor: R.T.steel300 }}
                />
                {belirliAramaSonuclari.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {belirliAramaSonuclari.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setBelirliSecili((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                        className="flex items-center justify-between text-left text-xs px-2 py-1.5 rounded"
                        style={{ background: belirliSecili[p.id] ? "#FBE1D5" : R.T.steel100, color: R.T.ink900 }}
                      >
                        <span>{p.ad}</span>
                        {belirliSecili[p.id] && <R.Check size={12} style={{ color: R.T.orangeDark }} />}
                      </button>
                    ))}
                  </div>
                )}
                {Object.values(belirliSecili).filter(Boolean).length > 0 && (
                  <p className="text-xs mt-1.5" style={{ color: R.T.ink500 }}>
                    {Object.values(belirliSecili).filter(Boolean).length} ürün seçili
                  </p>
                )}
              </div>
            )}
            <p className="text-xs" style={{ color: R.T.ink500 }}>
              {filtreliUrunler.length} ürün eşleşti.
            </p>
          </R.Kart>

          <R.Kart className="p-4 flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
              2. Güncelleme Yöntemi
            </span>
            <R.Secim label="Taban" value={tabanTuru} onChange={(e) => setTabanTuru(e.target.value)}>
              <option value="satisFiyati">Mevcut Satış Fiyatı</option>
              <option value="sonAlisFiyati">Son Alış Fiyatı</option>
              <option value="ortalamaMaliyet">Ortalama Maliyet</option>
            </R.Secim>
            <R.Girdi label="Değişim Oranı (%)" type="number" value={oranDeger} onChange={(e) => setOranDeger(e.target.value)} placeholder="10" />
            <R.Secim label="Yuvarlama" value={yuvarlamaBirim} onChange={(e) => setYuvarlamaBirim(parseFloat(e.target.value))}>
              {R.YUVARLAMA_SECENEKLERI.map((y) => (
                <option key={y.deger} value={y.deger}>
                  {y.etiket}
                </option>
              ))}
            </R.Secim>
          </R.Kart>

          <R.Kart className="p-4 flex flex-col gap-3">
            <R.Girdi label="Değişiklik Nedeni *" value={degisiklikNedeni} onChange={(e) => setDegisiklikNedeni(e.target.value)} placeholder="ör. Ağustos zam dönemi" />
            <R.Girdi label="Kullanıcı" value={kullanici} readOnly />
            <R.Buton onClick={fiyatlariOnayla} disabled={filtreliUrunler.length === 0}>
              <R.Check size={16} /> Fiyatları Onayla
            </R.Buton>
            {sonGeriAlinabilirIslem && (
              <button onClick={sonIslemiGeriAl} className="text-xs font-semibold text-left underline" style={{ color: R.T.red }}>
                <R.RotateCcw size={12} className="inline mr-1" />
                Son güncellemeyi geri al ({sonGeriAlinabilirIslem.etkilenenUrunSayisi} ürün — {sonGeriAlinabilirIslem.degisiklikNedeni})
              </button>
            )}
          </R.Kart>
        </div>

        {/* Önizleme */}
        <div className="lg:col-span-2">
          <R.Kart className="overflow-hidden">
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Ön İzleme — henüz hiçbir fiyat değişmedi
              </span>
            </div>
            {onizleme.length === 0 ? (
              <R.Bos ikon={R.Percent} baslik="Önizlenecek ürün yok" aciklama="Soldan bir kriter seçin." />
            ) : (
              <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-3 py-2">Ürün</th>
                      <th className="text-right font-semibold px-2 py-2">Maliyet</th>
                      <th className="text-right font-semibold px-2 py-2">Eski Fiyat</th>
                      <th className="text-right font-semibold px-2 py-2">Yeni Fiyat</th>
                      <th className="text-right font-semibold px-2 py-2">Kâr ₺</th>
                      <th className="text-right font-semibold px-2 py-2">Kâr %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onizleme.map((x) => {
                      const degisti = Math.abs(x.yeniFiyat - x.eskiFiyat) > 0.001;
                      return (
                        <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                          <td className="px-3 py-2">
                            <div style={{ color: R.T.ink900 }}>{x.p.ad}</div>
                            <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                              {x.p.marka} · {x.p.stokKodu}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right" style={R.MONO}>
                            {R.tl(x.maliyet)}
                          </td>
                          <td className="px-2 py-2 text-right" style={R.MONO}>
                            {R.tl(x.eskiFiyat)}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold" style={{ ...R.MONO, color: degisti ? R.T.orangeDark : R.T.ink500 }}>
                            {R.tl(x.yeniFiyat)}
                          </td>
                          <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: x.karTutari >= 0 ? R.T.green : R.T.red }}>
                            {R.tl(x.karTutari)}
                          </td>
                          <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: x.karTutari >= 0 ? R.T.green : R.T.red }}>
                            {x.karYuzde !== null ? `%${x.karYuzde.toFixed(1)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </R.Kart>
        </div>
      </div>

      {uygulandi && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setUygulandi(null)}>
          <div className="w-full max-w-sm rounded-lg p-5 text-center" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#DEF0DF" }}>
              <R.Check size={22} style={{ color: R.T.green }} />
            </div>
            <h3 className="font-semibold text-base mb-1" style={{ color: R.T.ink900 }}>
              Fiyatlar Güncellendi
            </h3>
            <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
              {uygulandi.sayi} ürünün satış fiyatı değişti. Gerekirse aşağıdaki "Son güncellemeyi geri al" ile geri alabilirsiniz.
            </p>
            <R.Buton variant="ghost" onClick={() => setUygulandi(null)}>
              Kapat
            </R.Buton>
          </div>
        </div>
      )}
    </div>
  );
}
