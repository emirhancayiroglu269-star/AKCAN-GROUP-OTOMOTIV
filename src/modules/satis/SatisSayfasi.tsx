/* Extracted from Satis.tsx — public component kept self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function SatisSayfasi({ db, updateDb, sepet, setSepet, aktifKullanici, musteriSiparisiBaslat, yeniMusteriBaslat }) {
  const [arama, setArama] = R.useState("");
  const [aramaSonuclariAcik, setAramaSonuclariAcik] = R.useState(false);
  const [genelIskontoTuru, setGenelIskontoTuru] = R.useState("tutar"); // "tutar" | "yuzde"
  // Kargo / Teslimat Takibi (51. adım) — satış tamamlanırken opsiyonel
  // olarak teslimat bilgisi eklenebilir; STOK zaten satışla düşer, teslimat
  // kaydı SADECE kargo/kurye sürecini takip eder.
  const [teslimatEkle, setTeslimatEkle] = R.useState(false);
  const [teslimatForm, setTeslimatForm] = R.useState({
    teslimatTipi: "Kargo",
    aliciAdi: "",
    telefon: "",
    adres: "",
    il: "",
    ilce: "",
    kargoFirmasi: "",
    kargoUcreti: "",
    kargoUcretiKimOder: "Müşteri",
    teslimatNotu: "",
  });
  const [genelIskontoDeger, setGenelIskontoDeger] = R.useState("");
  const [musteriAdi, setMusteriAdi] = R.useState("");
  const [musteriId, setMusteriId] = R.useState(null);
  const [musteriAramaAcik, setMusteriAramaAcik] = R.useState(false);
  const [satisNotu, setSatisNotu] = R.useState("");
  const [odemeSatirlari, setOdemeSatirlari] = R.useState([{ id: "od1", yontem: "Nakit", hesapId: "", tutar: "" }]);
  const [satisIsleniyor, setSatisIsleniyor] = R.useState(false);
  const [oturumFiyatYetkisi, setOturumFiyatYetkisi] = R.useState(false);
  const [fiyatTaslaklari, setFiyatTaslaklari] = R.useState({});
  const [sonSatis, setSonSatis] = R.useState(null);
  const [gecmisAcik, setGecmisAcik] = R.useState(false);
  const [iadeSatis, setIadeSatis] = R.useState(null);
  const [satisiYapan, setSatisiYapan] = R.useIslemYapan(aktifKullanici);
  const [belgeTuru, setBelgeTuru] = R.useState("Satış Fişi");
  const [iptalModalSatis, setIptalModalSatis] = R.useState(null);
  const [iptalNedeniMetin, setIptalNedeniMetin] = R.useState("");
  const [detayBelge, setDetayBelge] = R.useState(null);
  const aramaRef = R.useRef(null);

  // Sepetteki her satırı ilgili ürün bilgisiyle zenginleştirir; ürün silinmişse
  // (olağan dışı bir durum) satırı sessizce atlar.
  const satirlar = sepet
    .map((s) => {
      const p = db.parcalar.find((x) => x.id === s.parcaId);
      if (!p) return null;
      return { ...s, parca: p };
    })
    .filter(Boolean);

  // Satır iskontosu hem ₺ hem % olarak girilebilir — ikisi de aynı TL
  // tutarına indirgenip her yerde tutarlı şekilde kullanılır.
  const satirIskontoTutari = (s) => {
    const taban = s.adet * s.birimFiyat;
    return s.iskontoTuru === "yuzde" ? (taban * (parseFloat(s.iskontoDeger) || 0)) / 100 : parseFloat(s.iskontoDeger) || 0;
  };

  // --- Toplam hesaplama -------------------------------------------------
  const hamToplam = satirlar.reduce((t, s) => t + s.adet * s.birimFiyat, 0); // KDV dahil, indirimsiz
  const satirIskontoToplam = satirlar.reduce((t, s) => t + satirIskontoTutari(s), 0);
  const netSatirIskontosuSonrasi = Math.max(0, hamToplam - satirIskontoToplam);
  const genelIskonto = Math.min(
    genelIskontoTuru === "yuzde"
      ? (netSatirIskontosuSonrasi * (parseFloat(genelIskontoDeger) || 0)) / 100
      : parseFloat(genelIskontoDeger) || 0,
    netSatirIskontosuSonrasi
  );
  const iskontoToplam = satirIskontoToplam + genelIskonto;
  const genelToplam = Math.max(0, hamToplam - iskontoToplam);
  const indirimOrani = netSatirIskontosuSonrasi > 0 ? genelToplam / netSatirIskontosuSonrasi : 1;

  // KDV bilgi amaçlı ayrıştırılır: her satırın (satır iskontosu düşülmüş,
  // genel iskonto oranı uygulanmış) KDV dahil tutarından matrah/KDV çıkarılır.
  const kdvToplam = satirlar.reduce((t, s) => {
    const satirNet = (s.adet * s.birimFiyat - satirIskontoTutari(s)) * indirimOrani;
    const oran = s.parca.kdvOrani || 0;
    const matrah = satirNet / (1 + oran / 100);
    return t + (satirNet - matrah);
  }, 0);

  const odemeToplami = odemeSatirlari.reduce((t, o) => t + (parseFloat(o.tutar) || 0), 0);
  const kalanTutar = Math.round((genelToplam - odemeToplami) * 100) / 100;
  const acikHesapVar = odemeSatirlari.some((o) => o.yontem === "Açık Hesap" && parseFloat(o.tutar) > 0);
  const acikHesapTutariHesap = odemeSatirlari.filter((o) => o.yontem === "Açık Hesap").reduce((t, o) => t + (parseFloat(o.tutar) || 0), 0);

  // --- Seçili müşteri (kayıtlıysa) ve cari limit kontrolü ----------------
  const seciliMusteri = musteriId ? db.cariler.find((c) => c.id === musteriId) : null;
  const musteriAramaSonuclari =
    !musteriId && musteriAdi.trim().length > 0
      ? db.cariler
          .filter((c) => c.aktif !== false && (c.ad.toLowerCase().includes(musteriAdi.trim().toLowerCase()) || (c.telefon || "").replace(/\D/g, "").includes(musteriAdi.replace(/\D/g, ""))))
          .slice(0, 6)
      : [];
  const limitAsimTutari =
    seciliMusteri && seciliMusteri.borcLimiti > 0 && acikHesapTutariHesap > 0
      ? Math.round(((seciliMusteri.bakiye || 0) + acikHesapTutariHesap - seciliMusteri.borcLimiti) * 100) / 100
      : 0;

  // --- Kâr/maliyet uyarısı (satır bazında) ------------------------------
  // birimFiyat KDV DAHİL girildiği için, maliyetle (KDV hariç) doğru
  // karşılaştırabilmek adına önce KDV'den arındırılmış net satış fiyatı
  // bulunur, ardından o net fiyattan maliyet düşülerek gerçek brüt kâr elde edilir.
  const satirKarBilgisi = (s) => {
    const efektifBirimKdvDahil = s.birimFiyat - satirIskontoTutari(s) / s.adet;
    const oran = s.parca.kdvOrani || 0;
    const efektifBirimNet = efektifBirimKdvDahil / (1 + oran / 100);
    const maliyet = s.parca.urunTipi === "Set" ? R.setMaliyetiHesapla(db, s.parca) : R.gecerliMaliyet(s.parca, db);
    const karBirim = efektifBirimNet - maliyet;
    const karYuzde = maliyet > 0 ? (karBirim / maliyet) * 100 : null;
    const altMinimum = s.parca.minimumSatisFiyati > 0 && efektifBirimKdvDahil < s.parca.minimumSatisFiyati - 0.005;
    return { karBirim, karYuzde, maliyetAlti: karBirim < -0.005, altMinimum };
  };
  const maliyetAltiSatirVar = satirlar.some((s) => satirKarBilgisi(s).maliyetAlti);
  const altMinimumSatirVar = satirlar.some((s) => satirKarBilgisi(s).altMinimum);

  // --- Arama / sepete ekleme ---------------------------------------------
  const aramaSonuclari = arama.trim() ? R.hizliAramaYap(db, arama).slice(0, 8) : [];

  const sepeteEkle = (p) => {
    if (p.urunTipi === "Set") {
      if (!R.setSatilabilirMi(db, p, 1)) {
        R.bildirimGoster(`"${p.ad}" seti için bileşenlerden birinde yeterli stok yok — yine de eklemek isterseniz adet elle güncellenebilir.`, "hata");
      }
    } else if ((p.stok || 0) <= 0) {
      R.bildirimGoster(`"${p.ad}" stokta yok — yine de eklemek isterseniz adet elle güncellenebilir.`, "hata");
    }
    const { fiyat, kaynak } = R.parcaFiyatiHesapla(db, p, seciliMusteri);
    if (kaynak !== "Normal Fiyat") {
      R.bildirimGoster(`${kaynak} uygulandı: ${R.tl(fiyat)}`, "basari");
    }
    setSepet((prev) => {
      const mevcut = prev.find((s) => s.parcaId === p.id);
      if (mevcut) return prev.map((s) => (s.parcaId === p.id ? { ...s, adet: s.adet + 1 } : s));
      return [...prev, { parcaId: p.id, adet: 1, birimFiyat: fiyat, iskontoTuru: "tutar", iskontoDeger: 0, fiyatKaynagi: kaynak }];
    });
    setArama("");
    setAramaSonuclariAcik(false);
    aramaRef.current?.focus();
  };

  // --- Favoriler -----------------------------------------------------------
  const [hizliSatisAcik, setHizliSatisAcik] = R.useState(true);
  const favoriToggle = (parcaId, ortakMi) => {
    const kullaniciId = ortakMi ? null : aktifKullanici?.id || null;
    const mevcut = db.favoriler.find((f) => f.parcaId === parcaId && (f.kullaniciId || null) === kullaniciId);
    if (mevcut) {
      updateDb((prev) => ({ ...prev, favoriler: prev.favoriler.filter((f) => f.id !== mevcut.id) }));
    } else {
      updateDb((prev) => ({
        ...prev,
        favoriler: [...prev.favoriler, { id: R.yeniId("fav"), parcaId, kullaniciId, eklenmeTarihi: R.zamanDamgasi() }],
      }));
    }
  };
  const favoriler = R.gorunurFavoriler(db, aktifKullanici)
    .map((f) => db.parcalar.find((p) => p.id === f.parcaId))
    .filter((p) => p && p.aktif !== false);
  const favorilerKategoriGruplari = (() => {
    const harita = {};
    favoriler.forEach((p) => {
      const kat = p.anaKategori || p.kategori || "Diğer";
      if (!harita[kat]) harita[kat] = [];
      harita[kat].push(p);
    });
    return Object.entries(harita).sort((a, b) => a[0].localeCompare(b[0], "tr"));
  })();

  // --- Klavye kısayolları ----------------------------------------------------
  // F2: ürün ara · F4: müşteri seç · F8: ödemeye git · F9: satışı tamamla · ESC: aramayı/sepeti kapat
  const satisiTamamlaRef = R.useRef(null);
  R.useEffect(() => {
    const dinleyici = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        aramaRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        document.getElementById("satis-musteri-input")?.focus();
      } else if (e.key === "F8") {
        e.preventDefault();
        document.getElementById("satis-odeme-alani")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (e.key === "F9") {
        e.preventDefault();
        satisiTamamlaRef.current?.();
      } else if (e.key === "Escape") {
        if (aramaSonuclariAcik) {
          setAramaSonuclariAcik(false);
          setArama("");
        }
      }
    };
    window.addEventListener("keydown", dinleyici);
    return () => window.removeEventListener("keydown", dinleyici);
  }, [aramaSonuclariAcik]);

  // Barkod okuyucular genelde metni yazıp sonunda Enter basar — tam barkod
  // eşleşmesi varsa aramaya gerek kalmadan doğrudan sepete eklenir.
  const aramaEnter = (e) => {
    if (e.key !== "Enter") return;
    const q = arama.trim();
    if (!q) return;
    const tamBarkodEslesen = R.barkodluParcaBul(db.parcalar, q);
    if (tamBarkodEslesen) {
      sepeteEkle(tamBarkodEslesen);
      return;
    }
    if (aramaSonuclari.length > 0) sepeteEkle(aramaSonuclari[0]);
  };

  const adetGuncelle = (parcaId, yeniAdet) => {
    const adet = parseFloat(yeniAdet);
    if (!adet || adet <= 0) {
      setSepet((prev) => prev.filter((s) => s.parcaId !== parcaId));
      return;
    }
    setSepet((prev) => prev.map((s) => (s.parcaId === parcaId ? { ...s, adet } : s)));
  };

  const satirSil = (parcaId) => setSepet((prev) => prev.filter((s) => s.parcaId !== parcaId));

  const satirIskontoGuncelle = (parcaId, alan, deger) => {
    setSepet((prev) => prev.map((s) => (s.parcaId === parcaId ? { ...s, [alan]: deger } : s)));
  };

  // Manuel satış fiyatı değişikliği — yetkiye bağlı. Kullanıcının kendi
  // yetkisi varsa doğrudan izin verilir; yoksa (oturumda henüz onay
  // alınmadıysa) yönetici kimlik doğrulaması istenir. Her değişiklik işlem
  // geçmişine kalıcı olarak işlenir.
  // Fiyat alanı yazılırken her tuş vuruşunda yönetici onayı istemiyoruz.
  // Önce taslak değeri tutuyoruz; onay ve kalıcı sepet değişikliği blur/Enter
  // anında tek kez yapılıyor. Böylece input odaklanırken prompt/modal yüzünden
  // React render akışının kesilmesi ve ara değerlerin 0'a düşmesi engelleniyor.
  const birimFiyatTaslagiGuncelle = (parcaId, yeniDeger) => {
    setFiyatTaslaklari((prev) => ({ ...prev, [parcaId]: yeniDeger }));
  };

  const birimFiyatDegisikliginiUygula = (parcaId) => {
    const taslak = fiyatTaslaklari[parcaId];
    if (taslak === undefined) return;

    const tutar = parseFloat(String(taslak).replace(",", "."));
    if (!Number.isFinite(tutar) || tutar < 0) {
      R.bildirimGoster("Geçerli bir satış fiyatı girin.", "hata");
      setFiyatTaslaklari((prev) => ({ ...prev, [parcaId]: undefined }));
      return;
    }

    const eskiSatir = sepet.find((s) => s.parcaId === parcaId);
    if (!eskiSatir || Math.abs(eskiSatir.birimFiyat - tutar) <= 0.005) {
      setFiyatTaslaklari((prev) => {
        const sonraki = { ...prev };
        delete sonraki[parcaId];
        return sonraki;
      });
      return;
    }

    const kendiYetkisiVar = R.yetkiVarMi(db, aktifKullanici, "satisFiyatiDegistirebilir");
    if (!kendiYetkisiVar && !oturumFiyatYetkisi) {
      const onay = R.yoneticiOnayiAl(db, "Satış fiyatını elle değiştirmek için yönetici onayı gerekiyor.");
      if (!onay) {
        R.bildirimGoster("Fiyat değişikliği onaylanmadı.", "hata");
        setFiyatTaslaklari((prev) => {
          const sonraki = { ...prev };
          delete sonraki[parcaId];
          return sonraki;
        });
        return;
      }
      setOturumFiyatYetkisi(true);
    }

    const parca = db.parcalar.find((p) => p.id === parcaId);
    setSepet((prev) =>
      prev.map((s) => (s.parcaId === parcaId ? { ...s, birimFiyat: Math.round(tutar * 100) / 100 } : s))
    );
    setFiyatTaslaklari((prev) => {
      const sonraki = { ...prev };
      delete sonraki[parcaId];
      return sonraki;
    });

    updateDb((prev) =>
      R.islemKaydet(prev, {
        kullaniciAdi: aktifKullanici?.adSoyad || satisiYapan.trim(),
        islemTuru: "Satış fiyatı elle değiştirildi",
        aciklama: `${parca?.ad || parcaId} (POS'ta, henüz kaydedilmemiş satış)`,
        eskiDeger: R.tl(eskiSatir.birimFiyat),
        yeniDeger: R.tl(tutar),
      })
    );
  };

  // --- Ödeme satırları ----------------------------------------------------
  const odemeEkle = () => {
    setOdemeSatirlari((prev) => [
      ...prev,
      { id: R.yeniId("od"), yontem: "Nakit", hesapId: "", tutar: kalanTutar > 0 ? String(Math.round(kalanTutar * 100) / 100) : "" },
    ]);
  };
  const odemeSil = (id) => setOdemeSatirlari((prev) => prev.filter((o) => o.id !== id));
  const odemeGuncelle = (id, alan, deger) =>
    setOdemeSatirlari((prev) => prev.map((o) => (o.id === id ? { ...o, [alan]: deger } : o)));

  // Tek ödeme satırı varsa, sepet toplamı değiştikçe otomatik senkronize olur
  // (kullanıcı elle değiştirmediği sürece) — çoğu satışta ekstra tıklama gerekmez.
  R.useEffect(() => {
    if (odemeSatirlari.length === 1) {
      setOdemeSatirlari([{ ...odemeSatirlari[0], tutar: genelToplam > 0 ? String(Math.round(genelToplam * 100) / 100) : "" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genelToplam]);

  // --- Satışı tamamlama ----------------------------------------------------
  const satisiTamamla = () => {
    if (!R.yetkiVarMi(db, aktifKullanici, "satisYapabilir")) {
      R.bildirimGoster("Satış yapma yetkiniz yok.", "hata");
      return;
    }
    if (satirlar.length === 0) {
      R.bildirimGoster("Sepet boş.", "hata");
      return;
    }
    if (R.gunKapaliMi(db, R.isoGun(new Date()))) {
      const onay = R.yoneticiOnayiAl(db, "Bugünün günü kapatılmış — yeni satış eklemek için yönetici onayı gerekiyor.");
      if (!onay) {
        R.bildirimGoster("Satış eklenmedi — gün kapalı.", "hata");
        return;
      }
    }
    if (Math.abs(kalanTutar) > 0.01) {
      R.bildirimGoster(
        kalanTutar > 0 ? `Ödeme eksik — ${R.tl(kalanTutar)} kaldı.` : `Ödeme fazla — ${R.tl(-kalanTutar)} fazla girildi.`,
        "hata"
      );
      return;
    }
    if (acikHesapVar && !musteriAdi.trim()) {
      R.bildirimGoster("Açık Hesap ile satış için müşteri adı girilmelidir.", "hata");
      return;
    }
    if (
      !db.ayarlar.eksiStokIzni &&
      satirlar.some((s) => (s.parca.urunTipi === "Set" ? !R.setSatilabilirMi(db, s.parca, s.adet) : s.adet > R.parcaSatilabilirStok(db, s.parca)))
    ) {
      R.bildirimGoster("Stok yetersiz — bazı ürünlerde rezerve edilmiş adet düşüldüğünde satılabilir stok yetersiz kalıyor (Ayarlar'da Eksi Stok İzni kapalı).", "hata");
      return;
    }
    if (limitAsimTutari > 0.01) {
      const onay = R.yoneticiOnayiAl(
        db,
        `⚠️ Müşteri cari limitini ${R.tl(limitAsimTutari)} aşıyor (mevcut borç ${R.tl(seciliMusteri.bakiye || 0)} + bu satış ${R.tl(
          acikHesapTutariHesap
        )} > limit ${R.tl(seciliMusteri.borcLimiti)}).\n\nYine de devam etmek için yönetici onayı gerekiyor.`
      );
      if (!onay) {
        R.bildirimGoster("Satış tamamlanmadı — yönetici onayı verilmedi.", "hata");
        return;
      }
    }
    if (maliyetAltiSatirVar || altMinimumSatirVar) {
      const kendiYetkisiVar = altMinimumSatirVar && !maliyetAltiSatirVar && R.yetkiVarMi(db, aktifKullanici, "minimumAltiSatisYapabilir");
      if (!kendiYetkisiVar) {
        const mesajlar = [];
        if (maliyetAltiSatirVar) mesajlar.push("⛔ Maliyet altı satış tespit edildi — en az bir kalem maliyetinin altında bir fiyata satılıyor.");
        if (altMinimumSatirVar) mesajlar.push("⚠️ En az bir kalem, o ürün için tanımlı minimum satış fiyatının altında.");
        const onay = R.yoneticiOnayiAl(db, `${mesajlar.join("\n")}\n\nYine de devam etmek için yönetici onayı gerekiyor.`);
        if (!onay) {
          R.bildirimGoster("Satış tamamlanmadı — yönetici onayı verilmedi.", "hata");
          return;
        }
      }
    }
    // İskonto yetkisi kontrolü — personelin rolüne tanımlı maksimum iskonto
    // oranı aşılıyorsa (sınırsız = null olan Yönetici hariç) onay istenir.
    const efektifIskontoYuzdesi = hamToplam > 0 ? (iskontoToplam / hamToplam) * 100 : 0;
    const aktifRolIskontoLimiti = aktifKullanici ? db.roller.find((r) => r.id === aktifKullanici.rolId)?.maksimumIskontoYuzdesi : null;
    if (aktifRolIskontoLimiti !== null && aktifRolIskontoLimiti !== undefined && efektifIskontoYuzdesi > aktifRolIskontoLimiti + 0.01) {
      const onay = R.yoneticiOnayiAl(
        db,
        `⚠️ Yetkiniz %${aktifRolIskontoLimiti} iskonto ile sınırlıdır. Bu satıştaki toplam iskonto oranı %${efektifIskontoYuzdesi.toFixed(1)}.\n\nYönetici onayı gerekli.`
      );
      if (!onay) {
        R.bildirimGoster("Satış tamamlanmadı — yönetici onayı verilmedi.", "hata");
        return;
      }
    }

    // Finansal satış doğrulaması: anında tahsil edilen ödemelerde kasa/banka,
    // kartta aktif POS + bağlı banka, açık hesapta kayıtlı müşteri zorunludur.
    const aktifHesaplar = db.hesaplar.filter((h) => h.aktif !== false);
    for (const o of odemeSatirlari.filter((x) => (parseFloat(x.tutar) || 0) > 0)) {
      if (o.yontem === "Açık Hesap") {
        if (!musteriId || !seciliMusteri || seciliMusteri.aktif === false) {
          R.bildirimGoster("Açık Hesap satışı için kayıtlı ve aktif bir müşteri seçmelisiniz.", "hata");
          return;
        }
        continue;
      }
      if (o.yontem === "Kredi Kartı") {
        const pos = db.posCihazlari.find((p) => p.id === o.posId && p.aktif !== false);
        if (!pos) {
          R.bildirimGoster("Kredi Kartı ödemesinde aktif bir POS seçmelisiniz. Banka hareketi POS mutabakatında oluşturulur.", "hata");
          return;
        }
        const posHesap = pos.hesapId ? aktifHesaplar.find((h) => h.id === pos.hesapId) : null;
        if (!posHesap) {
          R.bildirimGoster(`"${pos.ad}" POS cihazının bağlı aktif banka hesabı bulunmuyor. POS Yönetimi'nden hesabı bağlayın.`, "hata");
          return;
        }
        continue;
      }
      if (!o.hesapId) {
        R.bildirimGoster(`${o.yontem} ödemesinde kasa/banka hesabı seçmek zorunludur.`, "hata");
        return;
      }
      const seciliHesap = aktifHesaplar.find((h) => h.id === o.hesapId);
      if (!seciliHesap) {
        R.bildirimGoster("Seçilen kasa/banka hesabı aktif değil veya bulunamadı.", "hata");
        return;
      }
      // Satış tahsilatında para hesaba GİRER. Bu nedenle satış sırasında
      // hesabın mevcut bakiyesinin ödeme tutarından büyük olması aranmaz.
      // "Yeterli bakiye" kontrolü ödeme/çıkış işlemlerine aittir.
      continue;
    }

    if (satisIsleniyor) return;
    setSatisIsleniyor(true);

    const musteriAdiKaydedilecek =
      musteriAdi.trim() || (odemeSatirlari.length === 1 && odemeSatirlari[0].yontem === "Nakit" ? "Nakit Müşteri" : "Perakende Müşteri");

    // Genel iskonto paylarını kuruş seviyesinde dağıt. Son satıra kalan
    // kuruşu vererek payların toplamının satıştaki `genelIskonto` ile
    // matematiksel olarak birebir eşit olmasını sağlarız.
    const genelIskontoPaylari = satirlar.map((s) =>
      netSatirIskontosuSonrasi > 0
        ? (genelIskonto * (s.adet * s.birimFiyat - satirIskontoTutari(s))) / netSatirIskontosuSonrasi
        : 0
    );
    if (genelIskontoPaylari.length > 0) {
      let dagitilan = 0;
      genelIskontoPaylari.forEach((pay, index) => {
        if (index === genelIskontoPaylari.length - 1) {
          genelIskontoPaylari[index] = Math.round((genelIskonto - dagitilan) * 100) / 100;
        } else {
          genelIskontoPaylari[index] = Math.round(pay * 100) / 100;
          dagitilan += genelIskontoPaylari[index];
        }
      });
    }

    const satis = {
      id: R.yeniId("s"),
      tarih: R.zamanDamgasi(),
      musteriAdi: musteriAdiKaydedilecek,
      musteriId: seciliMusteri ? seciliMusteri.id : null,
      satisiYapan: satisiYapan.trim(),
      belgeTuru,
      kalemler: satirlar.map((s, index) => ({
        parcaId: s.parca.id,
        stokKodu: s.parca.stokKodu,
        ad: s.parca.ad,
        marka: s.parca.marka,
        birim: s.parca.birim,
        adet: s.adet,
        birimFiyat: s.birimFiyat,
        iskontoTutari: satirIskontoTutari(s),
        // Genel iskonto satırların satır-iskontosu sonrası tutarlarına
        // oransal dağıtılır; böylece kalem bazlı raporlar satış toplamıyla
        // birebir mutabık kalır.
        genelIskontoPayi: genelIskontoPaylari[index] || 0,
        kdvOrani: s.parca.kdvOrani || 0,
        maliyet: s.parca.urunTipi === "Set" ? R.setMaliyetiHesapla(db, s.parca) : R.gecerliMaliyet(s.parca, db),
        // Kampanya Satış Raporu (54. adım) bu alanı kullanır — hangi kalem
        // hangi kampanyadan/kaynaktan geldi, satış KALICI olarak kaydeder.
        fiyatKaynagi: s.fiyatKaynagi || "Normal Fiyat",
      })),
      genelIskontoTutari: genelIskonto,
      araToplam: hamToplam,
      iskontoToplam,
      kdvToplam: Math.round(kdvToplam * 100) / 100,
      genelToplam,
      odemeler: odemeSatirlari
        .map((o) => ({ yontem: o.yontem, hesapId: o.hesapId || null, tutar: parseFloat(o.tutar) || 0, posId: o.posId || null }))
        .filter((o) => o.tutar > 0),
      not: satisNotu.trim(),
      durum: "Tamamlandı",
      eFatura: { durum: "Gönderilmedi", eFaturaNo: null },
    };

    let stokEngellendi = false;
    let belgeNo = "";
    updateDb((prev) => {
      // Belge numarası ATOMİK olarak burada üretilir (aynı anda iki satış
      // tamamlanırsa bile sayaç çakışmaz) — "ST-2026-000001" gibi sıralı ve
      // tekrar kullanılmaz.
      const { belgeNo: uretilenNo, anahtar, siraSonraki } = R.yeniBelgeNumarasiUret(prev, belgeTuru);
      belgeNo = uretilenNo;
      satis.belgeNo = belgeNo;
      let sonuc = R.belgeSayaciGuncelle(prev, anahtar, siraSonraki);

      // 1) Stoktan düş — her kalem için stok hareket geçmişine "Perakende
      // Satış" olarak işlenir (belge no = satış no), tekil bir "stok - adet"
      // ataması değil, izlenebilir bir hareket zinciri oluşur.
      // ÖNEMLİ: "Set" tipi bir ürünün KENDİ stoğu yoktur — satıldığında,
      // Set'in kendisi değil, İÇİNDEKİ ürünlerin stoğu düşer.
      for (const s of satirlar) {
        if (s.parca.urunTipi === "Set") {
          for (const bilesen of R.setBilesenDetaylari(sonuc, s.parca)) {
            const yeni = R.stokHareketiUygula(sonuc, {
              parcaId: bilesen.parcaId,
              tur: "Perakende Satış",
              cikis: bilesen.adet * s.adet,
              belgeNo,
              kullanici: satisiYapan.trim(),
              aciklama: `${musteriAdiKaydedilecek} — Set: ${s.parca.ad}`,
            });
            if (!yeni) {
              stokEngellendi = true;
              return prev;
            }
            sonuc = yeni;
          }
        } else {
          const yeni = R.stokHareketiUygula(sonuc, {
            parcaId: s.parca.id,
            tur: "Perakende Satış",
            cikis: s.adet,
            belgeNo,
            kullanici: satisiYapan.trim(),
            aciklama: musteriAdiKaydedilecek,
          });
          if (!yeni) {
            stokEngellendi = true;
            return prev;
          }
          sonuc = yeni;
        }
      }

      // İskonto uygulanan satırlar işlem geçmişine kalıcı olarak işlenir —
      // "Emirhan → 14:32 → ST-4582 satışında %15 iskonto yaptı" tarzı denetim.
      satirlar.forEach((s) => {
        const tutar = satirIskontoTutari(s);
        if (tutar <= 0.005) return;
        const yuzde = Math.round((tutar / (s.adet * s.birimFiyat)) * 1000) / 10;
        sonuc = R.islemKaydet(sonuc, {
          kullaniciAdi: aktifKullanici?.adSoyad || satisiYapan.trim(),
          islemTuru: "İskonto uygulandı",
          aciklama: `Satış #${belgeNo} — ${s.parca.ad}`,
          eskiDeger: R.tl(s.adet * s.birimFiyat),
          yeniDeger: `${R.tl(tutar)} iskonto (%${yuzde})`,
        });
      });

      // 2) Açık Hesap kullanıldıysa müşterinin carisini işle — kayıtlı bir
      // müşteri seçiliyse doğrudan o karta (musteriId), değilse isimle işlenir.
      const finansSonucu = R.satisFinansHareketleriniUygula(sonuc, {
        satis,
        belgeNo,
        musteriAdi: musteriAdiKaydedilecek,
        satisiYapan: satisiYapan.trim(),
        odemeler: satis.odemeler,
        tarih: satis.tarih,
      });
      if (!finansSonucu) {
        stokEngellendi = true;
        return prev;
      }
      sonuc = finansSonucu.db;

      // Zincirin son halkası: belge oluşturma da işlem geçmişine kalıcı
      // olarak yazılır — "Belge oluştur → Stok düş → Kasa → Cari → Kâr →
      // Raporlar → İşlem Geçmişi" bağlantısı burada tamamlanır.
      sonuc = R.islemKaydet(sonuc, {
        kullaniciAdi: satis.satisiYapan,
        islemTuru: `${belgeTuru} oluşturuldu`,
        aciklama: `${belgeNo} — ${musteriAdiKaydedilecek}`,
        eskiDeger: "—",
        yeniDeger: R.tl(satis.genelToplam),
      });

      // Kargo / Teslimat Takibi (51. adım) — "Teslimat Bilgisi Ekle"
      // işaretliyse, satışa bağlı bir teslimat kaydı da oluşturulur. STOK
      // BURADA HİÇ ETKİLENMEZ — zaten yukarıda satışla düşürülmüştür.
      if (teslimatEkle && teslimatForm.aliciAdi.trim()) {
        const teslimat = {
          id: R.yeniId("tsl"),
          satisId: satis.id,
          teslimatTipi: teslimatForm.teslimatTipi,
          aliciAdi: teslimatForm.aliciAdi.trim(),
          telefon: teslimatForm.telefon.trim(),
          adres: teslimatForm.adres.trim(),
          il: teslimatForm.il.trim(),
          ilce: teslimatForm.ilce.trim(),
          kargoFirmasi: teslimatForm.kargoFirmasi,
          kargoUcretiKimOder: teslimatForm.kargoUcretiKimOder,
          kargoUcreti: parseFloat(teslimatForm.kargoUcreti) || 0,
          teslimatNotu: teslimatForm.teslimatNotu.trim(),
          durum: "Hazırlanıyor",
          paketler: [],
          olusturmaTarihi: R.zamanDamgasi(),
          giderKaydedildi: false,
        };
        sonuc = { ...sonuc, teslimatlar: [teslimat, ...sonuc.teslimatlar] };
        // Adres girildiyse, müşterinin kayıtlı adres geçmişine de eklenir
        // (6. madde) — bir sonraki satışta "Kayıtlı Adres → Seç → Kullan".
        if (teslimatForm.adres.trim() && seciliMusteri) {
          const zatenVarMi = seciliMusteri.kayitliAdresler?.some((a) => a.adres === teslimatForm.adres.trim());
          if (!zatenVarMi) {
            sonuc = {
              ...sonuc,
              cariler: sonuc.cariler.map((c) =>
                c.id === seciliMusteri.id
                  ? { ...c, kayitliAdresler: [...(c.kayitliAdresler || []), { id: R.yeniId("adr"), adres: teslimatForm.adres.trim(), il: teslimatForm.il.trim(), ilce: teslimatForm.ilce.trim() }] }
                  : c
              ),
            };
          }
        }
      }

      return { ...sonuc, satislar: [satis, ...sonuc.satislar] };
    });

    if (stokEngellendi) {
      setSatisIsleniyor(false);
      R.bildirimGoster("Satış tamamlanamadı — stok yetersiz.", "hata");
      return;
    }

    R.sonKullaniciAdiKaydet(satisiYapan);
    R.bildirimGoster("Satış tamamlandı.", "basari");
    setSonSatis(satis);
    setSepet([]);
    setGenelIskontoDeger("");
    setMusteriAdi("");
    setMusteriId(null);
    setSatisNotu("");
    setOdemeSatirlari([{ id: R.yeniId("od"), yontem: "Nakit", tutar: "" }]);
    setSatisIsleniyor(false);
    setTeslimatEkle(false);
    setTeslimatForm({ teslimatTipi: "Kargo", aliciAdi: "", telefon: "", adres: "", il: "", ilce: "", kargoFirmasi: "", kargoUcreti: "", kargoUcretiKimOder: "Müşteri", teslimatNotu: "" });
  };

  // F9 kısayolunun her zaman en güncel satisiTamamla'yı çağırabilmesi için.
  R.useEffect(() => {
    satisiTamamlaRef.current = satisiTamamla;
  });

  // --- Satış belgesi yazdırma ----------------------------------------------
  // Belge türü, mağaza bilgileri, OEM kodları, ürün/marka/kod detayları ve
  // (iptal edildiyse) iptal damgasıyla birlikte eksiksiz bir belge üretir.
  // Belge yazdırma modül-seviyesindeki belgeYazdir() fonksiyonuna devredildi
  // (Belgeler sayfasından da aynı fonksiyon kullanılabilsin diye).
  const fisYazdir = (satis) => R.belgeYazdir(db, satis);

  // --- İptal / iade ----------------------------------------------------
  // İptal iki adımlı: önce bu fonksiyon yetkiyi kontrol edip modalı açar,
  // asıl işlemi (nedeni zorunlu kılarak) iptalOnayla tamamlar.
  const satisiIptalEt = (satis) => {
    if (!R.yetkiVarMi(db, aktifKullanici, "satisIptalEdebilir")) {
      const onay = R.yoneticiOnayiAl(db, "Satış iptal etme yetkiniz yok. Yönetici onayı gerekiyor.");
      if (!onay) {
        R.bildirimGoster("Satış iptal edilmedi — yönetici onayı verilmedi.", "hata");
        return;
      }
    }
    setIptalModalSatis(satis);
    setIptalNedeniMetin("");
  };

  const iptalOnayla = () => {
    if (!iptalNedeniMetin.trim()) {
      R.bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    const satis = iptalModalSatis;
    const belgeNo = satis.belgeNo || satis.id.slice(-6).toUpperCase();
    const iptalEden = aktifKullanici?.adSoyad || satisiYapan.trim();
    const iptalTarihi = R.zamanDamgasi();
    let zatenIptal = false;
    let iptalFinansEngellendi = false;
    updateDb((prev) => {
      const mevcutSatis = prev.satislar.find((x) => x.id === satis.id);
      if (!mevcutSatis || mevcutSatis.durum === "İptal Edildi") {
        zatenIptal = true;
        return prev;
      }
      // Parçalar hâlâ mevcutsa stoğu geri ekle ve "Satış İadesi" hareketi
      // oluştur; ürün sonradan silinmişse (olağan dışı) o kalem sessizce atlanır.
      let sonuc = R.islemKaydet(prev, {
        kullaniciAdi: iptalEden,
        islemTuru: "Satış iptal edildi",
        aciklama: `${belgeNo} (${satis.musteriAdi}) — Sebep: ${iptalNedeniMetin.trim()}`,
        eskiDeger: "Tamamlandı",
        yeniDeger: "İptal Edildi",
      });
      satis.kalemler.forEach((k) => {
        const parca = sonuc.parcalar.find((p) => p.id === k.parcaId);
        if (!parca) return;
        if (parca.urunTipi === "Set") {
          for (const bilesen of R.setBilesenDetaylari(sonuc, parca)) {
            sonuc =
              R.stokHareketiUygula(sonuc, {
                parcaId: bilesen.parcaId,
                tur: "Satış İadesi",
                giris: bilesen.adet * k.adet,
                belgeNo,
                kullanici: satis.satisiYapan || "",
                aciklama: `İptal: ${belgeNo} — Set: ${parca.ad}`,
              }) || sonuc;
          }
        } else {
          sonuc =
            R.stokHareketiUygula(sonuc, {
              parcaId: k.parcaId,
              tur: "Satış İadesi",
              giris: k.adet,
              belgeNo,
              kullanici: satis.satisiYapan || "",
              aciklama: `İptal: ${belgeNo} (${iptalNedeniMetin.trim()})`,
            }) || sonuc;
        }
      });

      const acikHesapTutari = satis.odemeler.filter((o) => o.yontem === "Açık Hesap").reduce((t, o) => t + o.tutar, 0);
      if (acikHesapTutari > 0) {
        sonuc = R.cariHareketiUygula(sonuc, {
          musteriId: satis.musteriId,
          musteriAdi: satis.musteriAdi,
          tutar: acikHesapTutari,
          tur: "ödeme",
          aciklama: "İptal edilen satış",
          belgeNo,
          kaynakSatisId: satis.id,
        });
      }

      // Nakit/Havale gibi anında hesaba işlenmiş tahsilatlar ters çevrilir.
      // Kartlı satışlar burada terslenmez; yalnızca POS mutabakatında bankaya
      // gerçekten geçen tutar varsa o gerçek banka hareketi terslenir.
      satis.odemeler
        .filter((o) => o.yontem !== "Kredi Kartı" && o.yontem !== "Açık Hesap" && o.hesapId)
        .forEach((o) => {
          const hesap = sonuc.hesaplar.find((h) => h.id === o.hesapId);
          if (!hesap || (hesap.bakiye || 0) < o.tutar - 0.01) {
            iptalFinansEngellendi = true;
            return;
          }
          sonuc = R.hesapHareketiUygula(sonuc, {
            hesapId: o.hesapId,
            tur: "Satış İptali",
            cikis: o.tutar,
            belgeNo,
            aciklama: `İptal: ${belgeNo}`,
            kullanici: satis.satisiYapan || "",
            kaynakId: `${satis.id}:iptal:${o.yontem}:${o.hesapId}`,
          });
        });

      // Daha önce POS mutabakatıyla bankaya geçen kart tahsilatı varsa,
      // gerçek banka girişini tek seferde geri al ve POS kaydını iptal et.
      satis.odemeler
        .filter((o) => o.yontem === "Kredi Kartı" && o.posId)
        .forEach((o) => {
          const posTahsilat = sonuc.posTahsilatlari.find((t) => t.kaynakSatisId === satis.id && t.posId === o.posId && t.durum !== "İptal");
          if (!posTahsilat) return;
          if (posTahsilat.gercekTutar != null) {
            const pos = sonuc.posCihazlari.find((p) => p.id === o.posId);
            const hesapId = pos?.hesapId;
            const hesap = hesapId ? sonuc.hesaplar.find((h) => h.id === hesapId) : null;
            if (!hesap || (hesap.bakiye || 0) < posTahsilat.gercekTutar - 0.01) {
              iptalFinansEngellendi = true;
              return;
            }
            const kaynakId = `pos:${posTahsilat.id}:iptal`;
            const hareketVar = hesap.hareketler?.some((h) => h.kaynakId === kaynakId);
            if (!hareketVar) {
              sonuc = R.hesapHareketiUygula(sonuc, {
                hesapId,
                tur: "POS Satış İptali",
                cikis: posTahsilat.gercekTutar,
                belgeNo,
                aciklama: `POS iade/iptal: ${belgeNo}`,
                kullanici: satis.satisiYapan || "",
                kaynakId,
              });
            }
          }
          sonuc = {
            ...sonuc,
            posTahsilatlari: sonuc.posTahsilatlari.map((t) => (t.id === posTahsilat.id ? { ...t, durum: "İptal", iptalTarihi } : t)),
          };
        });

      if (iptalFinansEngellendi) return prev;

      return {
        ...sonuc,
        satislar: sonuc.satislar.map((s) =>
          s.id === satis.id ? { ...s, durum: "İptal Edildi", iptalNedeni: iptalNedeniMetin.trim(), iptalEden, iptalTarihi } : s
        ),
      };
    });
    if (zatenIptal) {
      R.bildirimGoster("Bu satış zaten iptal edilmiş.", "hata");
      setIadeSatis(null);
      setIptalModalSatis(null);
      setIptalNedeniMetin("");
      return;
    }
    if (iptalFinansEngellendi) {
      R.bildirimGoster("İptal için kasa/banka bakiyesi yetersiz. İşlem geri alınmadı.", "hata");
      setIadeSatis(null);
      setIptalModalSatis(null);
      setIptalNedeniMetin("");
      return;
    }
    R.bildirimGoster("Satış iptal edildi, stoklar geri eklendi.", "basari");
    setIadeSatis(null);
    setIptalModalSatis(null);
    setIptalNedeniMetin("");
  };

  const yakinSatislar = db.satislar.slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Sol: arama + sepet */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Hızlı Satış — favori ürünler, kategoriye göre gruplanmış */}
        {favoriler.length > 0 && (
          <R.Kart className="p-3.5">
            <button onClick={() => setHizliSatisAcik((v) => !v)} className="w-full flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase flex items-center gap-1.5" style={{ color: R.T.ink500 }}>
                <R.Star size={13} style={{ color: R.T.orange }} fill={R.T.orange} /> Hızlı Satış
              </span>
              <R.ChevronRight size={14} style={{ color: R.T.ink500, transform: hizliSatisAcik ? "rotate(90deg)" : "none" }} />
            </button>
            {hizliSatisAcik && (
              <div className="flex flex-col gap-2.5 mt-1.5">
                {favorilerKategoriGruplari.map(([kategori, urunler]) => (
                  <div key={kategori}>
                    <div className="text-xs font-semibold mb-1" style={{ color: R.T.ink500 }}>
                      {kategori}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {urunler.map((p) => {
                        const satilabilir = R.parcaSatilabilirStok(db, p);
                        const sepettekiAdet = sepet.find((s) => s.parcaId === p.id)?.adet || 0;
                        return (
                          <button
                            key={p.id}
                            onClick={() => sepeteEkle(p)}
                            className="text-left px-3 py-2 rounded-md relative"
                            style={{ background: R.T.steel100, border: sepettekiAdet > 0 ? `1.5px solid ${R.T.orange}` : "1.5px solid transparent", minWidth: 132 }}
                          >
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                const f = db.favoriler.find((x) => x.parcaId === p.id && (!x.kullaniciId || x.kullaniciId === aktifKullanici?.id));
                                if (f) updateDb((prev) => ({ ...prev, favoriler: prev.favoriler.filter((x) => x.id !== f.id) }));
                              }}
                              title="Hızlı satıştan kaldır"
                              className="absolute -top-1.5 -left-1.5 flex items-center justify-center rounded-full"
                              style={{ background: "#fff", border: `1px solid ${R.T.steel300}`, width: 16, height: 16, color: R.T.ink500 }}
                            >
                              <R.X size={10} />
                            </span>
                            {sepettekiAdet > 0 && (
                              <span
                                className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[10px] font-bold"
                                style={{ background: R.T.orange, color: "#fff", minWidth: 18, height: 18, padding: "0 4px" }}
                              >
                                {sepettekiAdet}
                              </span>
                            )}
                            <div className="text-xs font-semibold" style={{ color: R.T.ink900 }}>
                              {p.ad}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: satilabilir <= 0 ? R.T.red : R.T.ink500 }}>
                              {R.tl(p.satisFiyati)} · {satilabilir} {p.birim}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </R.Kart>
        )}

        <div className="relative">
          <R.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
          <input
            ref={aramaRef}
            value={arama}
            onChange={(e) => {
              setArama(e.target.value);
              setAramaSonuclariAcik(true);
            }}
            onFocus={() => setAramaSonuclariAcik(true)}
            onKeyDown={aramaEnter}
            placeholder="Barkod okutun veya OEM / ürün kodu / ürün adı yazıp Enter'a basın… (F2)"
            className="w-full pl-10 pr-3 py-3 rounded-lg border text-sm outline-none focus:ring-2"
            style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
            autoFocus
          />
          {aramaSonuclariAcik && aramaSonuclari.length > 0 && (
            <div
              className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-72 overflow-y-auto"
              style={{ borderColor: R.T.steel300 }}
            >
              {aramaSonuclari.map((p) => {
                const durum = R.stokDurumuHesapla(p);
                const favori = R.parcaFavoriMi(db, p.id, aktifKullanici);
                return (
                  <div
                    key={p.id}
                    className="w-full flex items-center gap-1 px-1.5 hover:bg-gray-50"
                    style={{ borderBottom: `1px solid ${R.T.steel200}` }}
                  >
                    <button
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        favoriToggle(p.id, false);
                      }}
                      title={favori ? "Kişisel favorilerden çıkar" : "⭐ Kişisel Favoriye Ekle"}
                      className="shrink-0 p-1.5"
                      style={{ color: favori ? R.T.orange : R.T.steel300 }}
                    >
                      <R.Star size={15} fill={favori ? R.T.orange : "none"} />
                    </button>
                    {R.yetkiVarMi(db, aktifKullanici, "kullaniciYonetebilir") && (
                      <button
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          favoriToggle(p.id, true);
                        }}
                        title={db.favoriler.some((f) => f.parcaId === p.id && !f.kullaniciId) ? "Mağaza ortak favorilerinden çıkar" : "🏬 Mağaza Ortak Favorisine Ekle"}
                        className="shrink-0 p-1.5"
                        style={{ color: db.favoriler.some((f) => f.parcaId === p.id && !f.kullaniciId) ? R.T.orange : R.T.steel300 }}
                      >
                        <R.Building2 size={14} />
                      </button>
                    )}
                    <button onMouseDown={() => sepeteEkle(p)} className="flex-1 min-w-0 text-left py-2.5 text-sm flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div style={{ color: R.T.ink900 }}>
                          {p.ad} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {p.marka}</span>
                        </div>
                        <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                          {p.stokKodu}
                          {R.parcaRafListesi(p).length === 1 && ` · 📍 ${R.parcaRafListesi(p)[0].kod}`}
                          {R.parcaRafListesi(p).length > 1 && ` · 📍 ${R.parcaRafListesi(p).length} konum`}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold" style={R.MONO}>
                          {R.tl(p.satisFiyati)}
                        </div>
                        <div className="text-xs" style={{ color: durum === "yok" ? R.T.red : durum === "kritik" ? "#8A6110" : R.T.green }}>
                          {durum === "yok" ? "🔴 Stokta Yok" : durum === "kritik" ? "🟡 Kritik" : `🟢 ${p.stok} ${p.birim}`}
                        </div>
                      </div>
                    </button>
                    {durum === "yok" && musteriSiparisiBaslat && (
                      <button
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          musteriSiparisiBaslat(p.id);
                        }}
                        title="Müşteri Siparişi Oluştur"
                        className="shrink-0 px-2 py-1.5 text-xs font-semibold rounded-md"
                        style={{ background: R.T.steel100, color: R.T.orangeDark }}
                      >
                        Müşteri Siparişi
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <R.Kart className="overflow-hidden">
          {satirlar.length === 0 ? (
            <R.Bos ikon={R.ShoppingCart} baslik="Sepet boş" aciklama="Ürün aramak için yukarıdaki kutuyu kullanın veya barkod okutun." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Ürün</th>
                    <th className="text-center font-semibold px-2 py-2">Stok</th>
                    <th className="text-center font-semibold px-2 py-2">Adet</th>
                    <th className="text-right font-semibold px-2 py-2">Birim Fiyat</th>
                    <th className="text-right font-semibold px-2 py-2">İskonto</th>
                    <th className="text-right font-semibold px-3 py-2">Satır Toplamı</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((s) => {
                    const kar = satirKarBilgisi(s);
                    const satirToplam = s.adet * s.birimFiyat - satirIskontoTutari(s);
                    const isSet = s.parca.urunTipi === "Set";
                    const satilabilirStok = isSet ? null : R.parcaSatilabilirStok(db, s.parca);
                    const stokYetersiz = isSet ? !R.setSatilabilirMi(db, s.parca, s.adet) : s.adet > satilabilirStok;
                    const rezerveVar = !isSet && R.parcaRezerveAdedi(db, s.parca.id) > 0;
                    return (
                      <R.React.Fragment key={s.parcaId}>
                        <tr style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                          <td className="px-3 py-2.5">
                            <div style={{ color: R.T.ink900 }}>
                              {s.parca.ad} {isSet && <R.Rozet tone="steel">📦 Set</R.Rozet>}
                            </div>
                            <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                              {s.parca.marka} · {s.parca.stokKodu}
                              {R.parcaRafListesi(s.parca).length === 1 && ` · 📍 ${R.parcaRafListesi(s.parca)[0].kod}`}
                              {R.parcaRafListesi(s.parca).length > 1 && ` · 📍 ${R.parcaRafListesi(s.parca).length} konum`} · KDV %{s.parca.kdvOrani}
                            </div>
                            {isSet && (
                              <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                                İçerik: {R.setBilesenDetaylari(db, s.parca).map((b) => `${b.adet}× ${b.parca.ad}`).join(", ")}
                              </div>
                            )}
                            {s.parca.etiketSonYazdirmaFiyati !== null && Math.abs(s.parca.etiketSonYazdirmaFiyati - s.parca.satisFiyati) > 0.005 && (
                              <div className="text-xs mt-0.5 font-semibold" style={{ color: "#8A6110" }}>
                                ⚠️ Raf etiketi güncel değil. Sistem fiyatı: {R.tl(s.parca.satisFiyati)}
                              </div>
                            )}
                            {s.fiyatKaynagi && s.fiyatKaynagi !== "Normal Fiyat" && (
                              <R.Rozet tone="orange">{s.fiyatKaynagi}</R.Rozet>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center text-xs" style={{ color: stokYetersiz ? R.T.red : R.T.ink500 }}>
                            {isSet ? (stokYetersiz ? "Yetersiz" : "Yeterli") : `${satilabilirStok} ${s.parca.birim}`}
                            {rezerveVar && <div style={{ color: "#8A6110" }}>({R.parcaRezerveAdedi(db, s.parca.id)} rezerve)</div>}
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => adetGuncelle(s.parcaId, String(Math.max(0, s.adet - 1)))}
                                className="w-6 h-7 flex items-center justify-center rounded font-bold text-sm shrink-0"
                                style={{ background: R.T.steel100, color: R.T.ink900 }}
                                title="Azalt"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={s.adet}
                                onChange={(e) => adetGuncelle(s.parcaId, e.target.value)}
                                onDoubleClick={(e) => e.target.select()}
                                className="w-14 px-1.5 py-1 rounded border text-sm text-center outline-none"
                                style={{ borderColor: R.T.steel300 }}
                                title="Miktarı doğrudan değiştirmek için çift tıklayıp yazın"
                              />
                              <button
                                onClick={() => adetGuncelle(s.parcaId, String(s.adet + 1))}
                                className="w-6 h-7 flex items-center justify-center rounded font-bold text-sm shrink-0"
                                style={{ background: R.T.steel100, color: R.T.ink900 }}
                                title="Artır"
                              >
                                +
                              </button>
                            </div>
                            {!isSet && s.parca.paketBirimleri && s.parca.paketBirimleri.length > 0 && s.parca.satisBirimSekli !== "sadeceTemel" && (
                              <select
                                onChange={(e) => {
                                  const pk = s.parca.paketBirimleri.find((x) => x.id === e.target.value);
                                  if (pk) adetGuncelle(s.parcaId, String(pk.iceriyorAdet));
                                  e.target.value = "";
                                }}
                                className="w-16 mt-1 px-1 py-0.5 rounded border text-xs outline-none bg-white block"
                                style={{ borderColor: R.T.steel300, color: R.T.ink500 }}
                              >
                                <option value="">1 paket…</option>
                                {s.parca.paketBirimleri.map((pk) => (
                                  <option key={pk.id} value={pk.id}>
                                    1 {pk.ad} ({pk.iceriyorAdet})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-2 py-2.5">
                            <input
                              type="number"
                              value={fiyatTaslaklari[s.parcaId] !== undefined ? fiyatTaslaklari[s.parcaId] : s.birimFiyat}
                              onChange={(e) => birimFiyatTaslagiGuncelle(s.parcaId, e.target.value)}
                              onBlur={() => birimFiyatDegisikliginiUygula(s.parcaId)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  birimFiyatDegisikliginiUygula(s.parcaId);
                                }
                              }}
                              className="w-24 px-1.5 py-1 rounded border text-sm text-right outline-none"
                              style={{
                                borderColor: s.birimFiyat !== s.parca.satisFiyati ? R.T.orange : R.T.steel300,
                                ...R.MONO,
                              }}
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={s.iskontoDeger || ""}
                                onChange={(e) => satirIskontoGuncelle(s.parcaId, "iskontoDeger", e.target.value)}
                                placeholder="0"
                                className="w-16 px-1.5 py-1 rounded border text-sm text-right outline-none"
                                style={{ borderColor: R.T.steel300, ...R.MONO }}
                              />
                              <select
                                value={s.iskontoTuru}
                                onChange={(e) => satirIskontoGuncelle(s.parcaId, "iskontoTuru", e.target.value)}
                                className="px-1 py-1 rounded border text-xs outline-none bg-white"
                                style={{ borderColor: R.T.steel300 }}
                              >
                                <option value="tutar">₺</option>
                                <option value="yuzde">%</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold" style={R.MONO}>
                            {R.tl(satirToplam)}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <button onClick={() => satirSil(s.parcaId)} style={{ color: R.T.red }}>
                              <R.Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                        {(kar.maliyetAlti || kar.altMinimum || (kar.karYuzde !== null && kar.karYuzde < R.DUSUK_KAR_ESIGI_YUZDE)) && (
                          <tr>
                            <td colSpan={7} className="px-3 pb-2">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {kar.maliyetAlti && (
                                  <div className="text-xs font-semibold px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5" style={{ background: "#F9DEDE", color: R.T.red }}>
                                    <R.AlertTriangle size={12} /> ⛔ Maliyet altı satış — bu satırdan {R.tl(kar.karBirim * s.adet)} zarar ediliyor, yönetici onayı gerekli.
                                  </div>
                                )}
                                {kar.altMinimum && (
                                  <div className="text-xs font-semibold px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5" style={{ background: "#F9DEDE", color: R.T.red }}>
                                    <R.AlertTriangle size={12} /> ⚠️ Minimum satış fiyatının altında ({R.tl(s.parca.minimumSatisFiyati)}) — yönetici onayı gerekli.
                                  </div>
                                )}
                                {!kar.maliyetAlti && !kar.altMinimum && kar.karYuzde !== null && kar.karYuzde < R.DUSUK_KAR_ESIGI_YUZDE && (
                                  <div className="text-xs font-semibold px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5" style={{ background: "#FDF1D6", color: "#8A6110" }}>
                                    <R.AlertTriangle size={12} /> ⚠️ Düşük kâr: Bu satırdan yalnızca {R.tl(kar.karBirim * s.adet)} brüt kâr elde ediliyor (%{kar.karYuzde.toFixed(0)}).
                                  </div>
                                )}
                                <span className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                                  (Maliyet: {R.tl(R.gecerliMaliyet(s.parca))} · Normal Fiyat: {R.tl(s.parca.satisFiyati)} · Uygulanan: {R.tl(s.birimFiyat)} · Birim Kâr:{" "}
                                  <span style={{ color: kar.karBirim >= 0 ? R.T.green : R.T.red }}>{R.tl(kar.karBirim)}</span>)
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </R.React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>

        {/* Geçmiş satışlar */}
        <R.Kart className="p-4">
          <button onClick={() => setGecmisAcik((v) => !v)} className="w-full flex items-center justify-between">
            <span className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
              <R.History size={15} /> Son 10 Satış
            </span>
            <span className="text-xs" style={{ color: R.T.ink500 }}>
              {db.satislar.length} kayıt
            </span>
          </button>
          {gecmisAcik && (
            <div className="flex flex-col gap-1.5 mt-3">
              {yakinSatislar.length === 0 ? (
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Henüz satış yok.
                </p>
              ) : (
                yakinSatislar.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm"
                    style={{ background: R.T.steel100, opacity: s.durum === "İptal Edildi" ? 0.5 : 1 }}
                  >
                    <div className="min-w-0">
                      <div style={{ color: R.T.ink900 }}>
                        <span style={R.MONO}>{s.belgeNo || s.id.slice(-6).toUpperCase()}</span> · {s.musteriAdi}{" "}
                        {s.durum === "İptal Edildi" && <R.Rozet tone="red">❌ İptal Edildi</R.Rozet>}
                      </div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        {R.tarihGoster(s.tarih)} · {s.kalemler.length} kalem · {s.belgeTuru || "Satış Fişi"}
                      </div>
                      {s.durum === "İptal Edildi" && (
                        <div className="text-xs mt-0.5" style={{ color: R.T.red }}>
                          İptal eden: {s.iptalEden || "—"} · {s.iptalTarihi ? R.tarihGoster(s.iptalTarihi) : "—"} · Sebep: {s.iptalNedeni || "—"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold" style={R.MONO}>
                        {R.tl(s.genelToplam)}
                      </span>
                      <button onClick={() => fisYazdir(s)} title="Yazdır / Tekrar Yazdır" style={{ color: R.T.ink500 }}>
                        <R.Printer size={14} />
                      </button>
                      {s.durum !== "İptal Edildi" && (
                        <button onClick={() => setIadeSatis(s)} title="İptal / İade" style={{ color: R.T.red }}>
                          <R.RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </R.Kart>
      </div>

      {/* Sağ: müşteri, ödeme, toplamlar */}
      <div className="flex flex-col gap-4">
        <R.Kart className="p-4 flex flex-col gap-3">
          <R.Girdi
            label="Satışı Yapan"
            value={satisiYapan}
            readOnly
            placeholder="ör. Emirhan"
          />
          <R.Secim label="Belge Türü" value={belgeTuru} onChange={(e) => setBelgeTuru(e.target.value)}>
            {R.BELGE_TURLERI.filter((t) => t !== "Tahsilat Makbuzu" && t !== "İade Belgesi").map((t) => (
              <option key={t}>{t}</option>
            ))}
          </R.Secim>
          <div className="relative">
            <R.Girdi
              id="satis-musteri-input"
              label="Müşteri — ad veya telefon (opsiyonel)"
              value={musteriAdi}
              onChange={(e) => {
                setMusteriAdi(e.target.value);
                setMusteriId(null);
                setMusteriAramaAcik(true);
              }}
              onFocus={() => setMusteriAramaAcik(true)}
              onBlur={() => setTimeout(() => setMusteriAramaAcik(false), 150)}
              placeholder="Boş bırakılırsa Perakende/Nakit Müşteri"
            />
            {musteriAramaAcik && musteriAdi.trim().length > 0 && (
              <div
                className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-56 overflow-y-auto"
                style={{ borderColor: R.T.steel300 }}
              >
                {musteriAramaSonuclari.map((c) => (
                  <button
                    key={c.id}
                    onMouseDown={() => {
                      setMusteriAdi(c.ad);
                      setMusteriId(c.id);
                      setMusteriAramaAcik(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-gray-50"
                    style={{ color: R.T.ink900 }}
                  >
                    <span>
                      {c.ad} {c.telefon && <span style={{ ...R.MONO, color: R.T.ink500 }}>· {c.telefon}</span>}
                    </span>
                    {c.bakiye > 0 && (
                      <span className="text-xs shrink-0" style={{ color: R.T.red }}>
                        {R.tl(c.bakiye)}
                      </span>
                    )}
                  </button>
                ))}
                {musteriAramaSonuclari.length === 0 && yeniMusteriBaslat && (
                  <button
                    onMouseDown={() => yeniMusteriBaslat(musteriAdi)}
                    className="w-full text-left px-3 py-2.5 text-sm font-semibold flex items-center gap-1.5"
                    style={{ color: R.T.orangeDark }}
                  >
                    <R.Plus size={14} /> Yeni Müşteri: "{musteriAdi}"
                  </button>
                )}
              </div>
            )}
          </div>
          {seciliMusteri && (
            <div className="text-xs px-2.5 py-2 rounded-md flex flex-col gap-0.5" style={{ background: R.T.steel100, color: R.T.ink500 }}>
              <span>
                Kayıtlı müşteri · Güncel borç: <strong style={{ color: seciliMusteri.bakiye > 0 ? R.T.red : R.T.green }}>{R.tl(seciliMusteri.bakiye || 0)}</strong>
                {seciliMusteri.borcLimiti > 0 && ` · Limit: ${R.tl(seciliMusteri.borcLimiti)}`}
                {db.musteriFiyatGruplari.find((g) => g.id === seciliMusteri.fiyatGrubuId) && (
                  <> · Fiyat Grubu: {db.musteriFiyatGruplari.find((g) => g.id === seciliMusteri.fiyatGrubuId).ad}</>
                )}
              </span>
              {seciliMusteri.iskontoOrani > 0 && genelIskontoDeger === "" && (
                <button
                  onClick={() => {
                    setGenelIskontoTuru("yuzde");
                    setGenelIskontoDeger(String(seciliMusteri.iskontoOrani));
                  }}
                  className="text-left font-semibold underline"
                  style={{ color: R.T.orangeDark }}
                >
                  Bu müşteri için %{seciliMusteri.iskontoOrani} özel indirim var — Uygula
                </button>
              )}
              {satirlar.length > 0 && (
                <button
                  onClick={() => {
                    setSepet((prev) =>
                      prev.map((s) => {
                        const p = db.parcalar.find((x) => x.id === s.parcaId);
                        if (!p) return s;
                        const { fiyat } = R.parcaFiyatiHesapla(db, p, seciliMusteri);
                        return { ...s, birimFiyat: fiyat };
                      })
                    );
                    R.bildirimGoster("Sepetteki fiyatlar bu müşteriye göre yeniden hesaplandı.", "basari");
                  }}
                  className="text-left font-semibold underline"
                  style={{ color: R.T.orangeDark }}
                >
                  Sepetteki fiyatları bu müşteriye göre yeniden hesapla
                </button>
              )}
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium" style={{ color: R.T.ink500 }}>
              Satış Notu
            </span>
            <textarea
              value={satisNotu}
              onChange={(e) => setSatisNotu(e.target.value)}
              rows={2}
              className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
            />
          </label>

          <label className="flex items-center gap-2 text-sm pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
            <input type="checkbox" checked={teslimatEkle} onChange={(e) => setTeslimatEkle(e.target.checked)} />
            <span className="font-medium" style={{ color: R.T.ink900 }}>
              <R.Truck size={13} className="inline mr-1" /> Teslimat Bilgisi Ekle (Kargo / Kurye)
            </span>
          </label>
          {teslimatEkle && (
            <div className="flex flex-col gap-2 p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={teslimatForm.teslimatTipi}
                  onChange={(e) => setTeslimatForm({ ...teslimatForm, teslimatTipi: e.target.value })}
                  className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {R.TESLIMAT_TIPLERI.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={teslimatForm.kargoUcretiKimOder}
                  onChange={(e) => setTeslimatForm({ ...teslimatForm, kargoUcretiKimOder: e.target.value })}
                  className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  <option value="Müşteri">Kargo: Müşteri Öder</option>
                  <option value="Mağaza">Kargo: Mağaza Öder</option>
                  <option value="Ücretsiz">Ücretsiz Kargo</option>
                </select>
              </div>
              <input
                value={teslimatForm.aliciAdi}
                onChange={(e) => setTeslimatForm({ ...teslimatForm, aliciAdi: e.target.value })}
                placeholder="Alıcı Adı *"
                className="px-2 py-1.5 rounded-md border text-xs outline-none"
                style={{ borderColor: R.T.steel300 }}
              />
              {seciliMusteri?.kayitliAdresler?.length > 0 && (
                <select
                  onChange={(e) => {
                    const adr = seciliMusteri.kayitliAdresler.find((a) => a.id === e.target.value);
                    if (adr) setTeslimatForm({ ...teslimatForm, adres: adr.adres, il: adr.il, ilce: adr.ilce });
                  }}
                  className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  defaultValue=""
                >
                  <option value="">📍 Kayıtlı adres seç…</option>
                  {seciliMusteri.kayitliAdresler.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.adres.slice(0, 40)}{a.adres.length > 40 ? "…" : ""}
                    </option>
                  ))}
                </select>
              )}
              <input value={teslimatForm.telefon} onChange={(e) => setTeslimatForm({ ...teslimatForm, telefon: e.target.value })} placeholder="Telefon" className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
              <textarea
                value={teslimatForm.adres}
                onChange={(e) => setTeslimatForm({ ...teslimatForm, adres: e.target.value })}
                placeholder="Adres"
                rows={2}
                className="px-2 py-1.5 rounded-md border text-xs outline-none resize-none"
                style={{ borderColor: R.T.steel300 }}
              />
              <div className="grid grid-cols-2 gap-2">
                <input value={teslimatForm.ilce} onChange={(e) => setTeslimatForm({ ...teslimatForm, ilce: e.target.value })} placeholder="İlçe" className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                <input value={teslimatForm.il} onChange={(e) => setTeslimatForm({ ...teslimatForm, il: e.target.value })} placeholder="İl" className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
              </div>
              {teslimatForm.teslimatTipi === "Kargo" && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={teslimatForm.kargoFirmasi}
                    onChange={(e) => setTeslimatForm({ ...teslimatForm, kargoFirmasi: e.target.value })}
                    className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                    style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  >
                    <option value="">Kargo Firması Seç…</option>
                    {db.kargoFirmalari.filter((f) => f.aktif !== false).map((f) => (
                      <option key={f.id} value={f.ad}>
                        {f.ad}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={teslimatForm.kargoUcreti}
                    onChange={(e) => setTeslimatForm({ ...teslimatForm, kargoUcreti: e.target.value })}
                    placeholder="Kargo Ücreti (₺)"
                    className="px-2 py-1.5 rounded-md border text-xs outline-none"
                    style={{ borderColor: R.T.steel300 }}
                  />
                </div>
              )}
              <input
                value={teslimatForm.teslimatNotu}
                onChange={(e) => setTeslimatForm({ ...teslimatForm, teslimatNotu: e.target.value })}
                placeholder="Teslimat Notu (opsiyonel)"
                className="px-2 py-1.5 rounded-md border text-xs outline-none"
                style={{ borderColor: R.T.steel300 }}
              />
            </div>
          )}
        </R.Kart>

        <R.Kart className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: R.T.ink500 }}>Ara Toplam</span>
            <span style={R.MONO}>{R.tl(hamToplam)}</span>
          </div>
          {iskontoToplam > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: R.T.ink500 }}>İskonto Toplamı</span>
              <span style={{ ...R.MONO, color: R.T.red }}>−{R.tl(iskontoToplam)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: R.T.ink500 }}>KDV (dahil)</span>
            <span style={R.MONO}>{R.tl(kdvToplam)}</span>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium" style={{ color: R.T.ink500 }}>
              Genel Sepet İskontosu
            </span>
            <div className="flex items-center gap-1.5">
              <input
                id="satis-iskonto-alani"
                type="number"
                value={genelIskontoDeger}
                onChange={(e) => setGenelIskontoDeger(e.target.value)}
                placeholder="0"
                className="flex-1 px-3 py-2 rounded-md border text-sm outline-none"
                style={{ borderColor: R.T.steel300, ...R.MONO }}
              />
              <select
                value={genelIskontoTuru}
                onChange={(e) => setGenelIskontoTuru(e.target.value)}
                className="px-2 py-2 rounded-md border text-sm outline-none bg-white"
                style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
              >
                <option value="tutar">₺</option>
                <option value="yuzde">%</option>
              </select>
            </div>
          </label>
          <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
            <span className="font-semibold" style={{ color: R.T.ink900 }}>
              Genel Toplam
            </span>
            <span className="text-lg font-semibold" style={R.MONO}>
              {R.tl(genelToplam)}
            </span>
          </div>
        </R.Kart>

        <div id="satis-odeme-alani">
        <R.Kart className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
              Ödeme
            </span>
            <button onClick={odemeEkle} className="text-xs font-semibold" style={{ color: R.T.orange }}>
              + Parçalı Ödeme Ekle
            </button>
          </div>
          {odemeSatirlari.map((o) => (
            <div key={o.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <select
                  value={o.yontem}
                  onChange={(e) => odemeGuncelle(o.id, "yontem", e.target.value)}
                  className="px-2 py-2 rounded-md border text-xs outline-none bg-white flex-1"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {R.ODEME_YONTEMLERI.filter((y) => db.ayarlar.odemeYontemleriDurumu?.[y] !== false).map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={o.tutar}
                  onChange={(e) => odemeGuncelle(o.id, "tutar", e.target.value)}
                  placeholder="0.00"
                  className="w-24 px-2 py-2 rounded-md border text-sm text-right outline-none"
                  style={{ borderColor: R.T.steel300, ...R.MONO }}
                />
                {odemeSatirlari.length > 1 && (
                  <button onClick={() => odemeSil(o.id)} style={{ color: R.T.red }}>
                    <R.X size={15} />
                  </button>
                )}
              </div>
              {o.yontem !== "Açık Hesap" && o.yontem !== "Kredi Kartı" && (
                <>
                  <select
                    value={o.hesapId}
                    onChange={(e) => odemeGuncelle(o.id, "hesapId", e.target.value)}
                    className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                    style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    aria-label={`${o.yontem} kasa/banka hesabı`}
                  >
                    <option value="">Kasa / Banka hesabı seçin *</option>
                    {db.hesaplar
                      .filter((h) => h.aktif !== false)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.ad} — {R.tl(h.bakiye || 0)}
                        </option>
                      ))}
                  </select>
                  {o.hesapId &&
                    (() => {
                      const acikVardiyaBenim = db.vardiyalar.find((v) => v.durum === "Açık" && v.kullaniciAdi === aktifKullanici?.adSoyad);
                      const acikVardiyaBuHesapta = R.hesabinAktifVardiyasi(db, o.hesapId);
                      if (acikVardiyaBenim && acikVardiyaBenim.hesapId && acikVardiyaBenim.hesapId !== o.hesapId) {
                        return <p className="text-xs px-1" style={{ color: R.T.red }}>⚠️ Bu kasa için yetkiniz bulunmuyor — vardiyanız "{acikVardiyaBenim.hesapAdi}" kasasında açık.</p>;
                      }
                      if (acikVardiyaBuHesapta && acikVardiyaBuHesapta.kullaniciAdi !== aktifKullanici?.adSoyad) {
                        return <p className="text-xs px-1" style={{ color: "#8A6110" }}>⚠️ Bu kasa şu an {acikVardiyaBuHesapta.kullaniciAdi}'nin vardiyasında.</p>;
                      }
                      return null;
                    })()}
                </>
              )}
              {o.yontem === "Kredi Kartı" && (
                <>
                  <select
                    value={o.posId || ""}
                    onChange={(e) => {
                      odemeGuncelle(o.id, "posId", e.target.value);
                      // POS'un bağlı banka hesabı yalnızca mutabakat sırasında kullanılır;
                      // satış anında bankaya para girişi yapılmaz.
                      odemeGuncelle(o.id, "hesapId", "");
                    }}
                    className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                    style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    aria-label="Kredi kartı POS cihazı"
                  >
                    <option value="">POS cihazı seçin *</option>
                    {db.posCihazlari
                      .filter((p) => p.aktif !== false)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ad} (%{p.komisyonYuzde}{p.komisyonSabit > 0 ? ` + ${R.tl(p.komisyonSabit)}` : ""})
                        </option>
                      ))}
                  </select>
                  {o.posId && (() => {
                    const pos = db.posCihazlari.find((p) => p.id === o.posId);
                    const banka = pos?.hesapId ? db.hesaplar.find((h) => h.id === pos.hesapId && h.aktif !== false) : null;
                    return banka ? (
                      <p className="text-xs px-1" style={{ color: R.T.ink500 }}>Bağlı banka: <strong>{banka.ad}</strong> · Net tutar mutabakatla hesaba geçer.</p>
                    ) : (
                      <p className="text-xs px-1" style={{ color: R.T.red }}>⚠️ POS için aktif banka hesabı bağlı değil.</p>
                    );
                  })()}
                </>
              )}
              {o.yontem === "Kredi Kartı" && o.posId && parseFloat(o.tutar) > 0 && (
                <p className="text-xs px-1" style={{ color: "#8A6110" }}>
                  {(() => {
                    const pos = db.posCihazlari.find((p) => p.id === o.posId);
                    if (!pos) return null;
                    const { komisyon, net } = R.posKomisyonuHesapla(pos, parseFloat(o.tutar));
                    return `Komisyon: ${R.tl(komisyon)} · Net banka geçişi: ${R.tl(net)} (${pos.odemeVadesiGun || 0} gün sonra)`;
                  })()}
                </p>
              )}
            </div>
          ))}
          {Math.abs(kalanTutar) > 0.01 && (
            <p className="text-xs font-semibold" style={{ color: R.T.red }}>
              {kalanTutar > 0 ? `Eksik: ${R.tl(kalanTutar)}` : `Fazla: ${R.tl(-kalanTutar)}`}
            </p>
          )}
          {limitAsimTutari > 0.01 && (
            <p className="text-xs font-semibold px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5" style={{ background: "#F9DEDE", color: R.T.red }}>
              <R.AlertTriangle size={12} /> ⚠️ Müşteri cari limitini {R.tl(limitAsimTutari)} aşıyor.
            </p>
          )}
          {/* Dokunmatik ekranlar için büyük, kolay dokunulur aksiyon butonları */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => document.getElementById("satis-odeme-alani")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
              style={{ background: R.T.steel100, color: R.T.ink900 }}
            >
              <R.CreditCard size={17} /> Ödeme
            </button>
            <button
              onClick={() => {
                setGenelIskontoTuru("yuzde");
                document.getElementById("satis-iskonto-alani")?.focus();
              }}
              className="py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
              style={{ background: R.T.steel100, color: R.T.ink900 }}
            >
              <R.Percent size={17} /> İskonto
            </button>
            <button
              onClick={() => {
                if (satirlar.length === 0 || window.confirm("Sepet temizlensin mi?")) setSepet([]);
              }}
              className="py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
              style={{ background: "#F9DEDE", color: R.T.red }}
            >
              <R.X size={17} /> İptal
            </button>
            <button onClick={satisiTamamla} disabled={satirlar.length === 0 || satisIsleniyor} className="py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5" style={{ background: R.T.orange, color: "#fff", opacity: satirlar.length === 0 || satisIsleniyor ? 0.5 : 1 }}>
              {satisIsleniyor ? "İşleniyor..." : <><R.Check size={17} /> Tamamla</>}
              <R.Check size={17} /> Tamamla
            </button>
          </div>
        </R.Kart>
        </div>
      </div>

      {/* Satış sonrası işlemler */}
      {sonSatis && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSonSatis(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5 text-center" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "#DEF0DF" }}
            >
              <R.Check size={22} style={{ color: R.T.green }} />
            </div>
            <h3 className="font-semibold text-base mb-1" style={{ color: R.T.ink900 }}>
              Satış Tamamlandı
            </h3>
            <p className="text-lg font-semibold mb-4" style={R.MONO}>
              {R.tl(sonSatis.genelToplam)}
            </p>
            <div className="flex flex-col gap-2">
              <R.Buton onClick={() => fisYazdir(sonSatis)}>
                <R.Printer size={15} /> Yazdır / PDF
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setSonSatis(null)}>
                Kapat
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* İptal/İade onayı */}
      {iadeSatis && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setIadeSatis(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Satış iptal edilsin mi?
            </h3>
            <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
              <strong>{iadeSatis.musteriAdi}</strong> — {R.tl(iadeSatis.genelToplam)} tutarındaki satış iptal edilecek, parçalar stoğa geri eklenecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={() => satisiIptalEt(iadeSatis)}>
                <R.RotateCcw size={14} /> İptal Et
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setIadeSatis(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* İptal nedeni — belge doğrudan silinmez, sadece nedeniyle birlikte iptal işaretlenir */}
      {iptalModalSatis && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setIptalModalSatis(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              İptal Nedeni
            </h3>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              {iptalModalSatis.belgeNo || iptalModalSatis.id.slice(-6).toUpperCase()} — {R.tl(iptalModalSatis.genelToplam)}
            </p>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: R.T.ink500 }}>
                Neden *
              </span>
              <textarea
                value={iptalNedeniMetin}
                onChange={(e) => setIptalNedeniMetin(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                placeholder="ör. Yanlış ürün"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={iptalOnayla}>
                <R.RotateCcw size={14} /> İptali Onayla
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setIptalModalSatis(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
