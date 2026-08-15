/* Extracted from Finans.tsx — kept intentionally self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function IadeSayfasi({ db, updateDb, aktifKullanici }) {
  const [iadeTipi, setIadeTipi] = R.useState("satis"); // "satis" | "alis"

  // --- Satış iadesi state ---------------------------------------------------
  const [arama, setArama] = R.useState("");
  const [aramaAcik, setAramaAcik] = R.useState(false);
  const [seciliSatisId, setSeciliSatisId] = R.useState(null);
  const [iadeSecimleri, setIadeSecimleri] = R.useState({}); // { parcaId: { adet, durum } }
  const [iadeNedeni, setIadeNedeni] = R.useState(R.IADE_NEDENLERI[0]);
  const [kapatmaYontemi, setKapatmaYontemi] = R.useState("Nakit");
  const [hesapId, setHesapId] = R.useState("");
  const [degisimArama, setDegisimArama] = R.useState("");
  const [degisimAramaAcik, setDegisimAramaAcik] = R.useState(false);
  const [degisimSepeti, setDegisimSepeti] = R.useState([]);
  const [iadeyiAlan, setIadeyiAlan] = R.useIslemYapan(aktifKullanici);
  const [sonIade, setSonIade] = R.useState(null);
  const [gecmisIadeAcik, setGecmisIadeAcik] = R.useState(false);

  const seciliSatis = seciliSatisId ? db.satislar.find((s) => s.id === seciliSatisId) : null;
  const aramaSonuclari = arama.trim() ? R.satisAramaYap(db, arama) : [];
  const degisimAramaSonuclari = degisimArama.trim() ? R.hizliAramaYap(db, degisimArama).slice(0, 6) : [];

  const kalanIadeEdilebilir = (k) => Math.max(0, k.adet - (k.iadeEdilenAdet || 0));

  const secimGuncelle = (parcaId, alan, deger) =>
    setIadeSecimleri((prev) => ({ ...prev, [parcaId]: { adet: 0, durum: "Satılabilir", ...prev[parcaId], [alan]: deger } }));

  const iadeToplamTutar = seciliSatis
    ? seciliSatis.kalemler.reduce((t, k) => {
        const secim = iadeSecimleri[k.parcaId];
        const adet = secim ? parseFloat(secim.adet) || 0 : 0;
        return t + R.satisKalemiEfektifBirim(k) * adet;
      }, 0)
    : 0;

  const degisimSepeteEkle = (p) => {
    setDegisimSepeti((prev) => {
      if (prev.some((s) => s.parcaId === p.id)) return prev;
      return [...prev, { parcaId: p.id, ad: p.ad, stokKodu: p.stokKodu, adet: 1, birimFiyat: p.satisFiyati || 0, kdvOrani: p.kdvOrani || 0 }];
    });
    setDegisimArama("");
    setDegisimAramaAcik(false);
  };
  const degisimSepetiGuncelle = (parcaId, alan, deger) =>
    setDegisimSepeti((prev) => prev.map((s) => (s.parcaId === parcaId ? { ...s, [alan]: deger } : s)));
  const degisimSepetindenSil = (parcaId) => setDegisimSepeti((prev) => prev.filter((s) => s.parcaId !== parcaId));

  const degisimToplam = degisimSepeti.reduce((t, s) => t + (parseFloat(s.adet) || 0) * (parseFloat(s.birimFiyat) || 0), 0);
  const farkTutari = kapatmaYontemi === "Değişim" ? Math.round((degisimToplam - iadeToplamTutar) * 100) / 100 : 0;

  const satisFormuTemizle = () => {
    setArama("");
    setSeciliSatisId(null);
    setIadeSecimleri({});
    setIadeNedeni(R.IADE_NEDENLERI[0]);
    setKapatmaYontemi("Nakit");
    setHesapId("");
    setDegisimSepeti([]);
  };

  const satisIadesiKaydet = () => {
    if (!R.yetkiVarMi(db, aktifKullanici, "iadeAlabilir")) {
      R.bildirimGoster("Satış iadesi alma yetkiniz yok.", "hata");
      return;
    }
    if (!seciliSatis) {
      R.bildirimGoster("Önce bir satış seçin.", "hata");
      return;
    }
    const iadeKalemleri = seciliSatis.kalemler
      .map((k) => {
        const secim = iadeSecimleri[k.parcaId];
        const adet = secim ? parseFloat(secim.adet) || 0 : 0;
        return adet > 0
          ? {
              parcaId: k.parcaId,
              ad: k.ad,
              marka: k.marka,
              adet,
              durum: secim.durum || "Satılabilir",
              birimFiyat: R.satisKalemiEfektifBirim(k),
              kdvOrani: k.kdvOrani || 0,
              maliyet: k.maliyet || 0,
            }
          : null;
      })
      .filter(Boolean);

    if (iadeKalemleri.length === 0) {
      R.bildirimGoster("En az bir kalem için iade adedi girin.", "hata");
      return;
    }
    // Kritik kontrol: satılandan fazla iade edilemez.
    for (const ik of iadeKalemleri) {
      const kalem = seciliSatis.kalemler.find((k) => k.parcaId === ik.parcaId);
      if (ik.adet > kalanIadeEdilebilir(kalem) + 0.0001) {
        R.bildirimGoster(`"${kalem.ad}" için en fazla ${kalanIadeEdilebilir(kalem)} adet iade edilebilir.`, "hata");
        return;
      }
    }
    if (kapatmaYontemi === "Değişim" && degisimSepeti.length === 0) {
      R.bildirimGoster("Değişim için en az bir yeni ürün ekleyin.", "hata");
      return;
    }
    if ((kapatmaYontemi === "Nakit" || kapatmaYontemi === "Kredi Kartı" || kapatmaYontemi === "Havale") && !hesapId && db.hesaplar.length > 0) {
      R.bildirimGoster("Para iadesinin yapılacağı hesabı seçin.", "hata");
      return;
    }

    const iadeId = R.yeniId("iad");
    const belgeNo = seciliSatis.id.slice(-6).toUpperCase();
    const iadeKaydi = {
      id: iadeId,
      tarih: R.zamanDamgasi(),
      satisId: seciliSatis.id,
      musteriAdi: seciliSatis.musteriAdi,
      kalemler: iadeKalemleri,
      iadeNedeni,
      kapatmaYontemi,
      hesapId: hesapId || null,
      tutar: Math.round(iadeToplamTutar * 100) / 100,
      degisimKalemleri: kapatmaYontemi === "Değişim" ? degisimSepeti : [],
      fark: kapatmaYontemi === "Değişim" ? farkTutari : 0,
      iadeyiAlan: iadeyiAlan.trim(),
    };

    let engellendi = false;
    updateDb((prev) => {
      const mevcutSatis = prev.satislar.find((s) => s.id === seciliSatis.id);
      if (!mevcutSatis || mevcutSatis.durum === "İptal Edildi") {
        engellendi = true;
        return prev;
      }

      // UI'da seçilmiş eski state'e güvenme; işlem anında kalan iadeyi tekrar
      // hesapla. Böylece hızlı çift tıklama / iki sekme aynı stoğu iki kez iade edemez.
      for (const ik of iadeKalemleri) {
        const kalem = mevcutSatis.kalemler.find((k) => k.parcaId === ik.parcaId);
        const kalan = kalem ? Math.max(0, kalem.adet - (kalem.iadeEdilenAdet || 0)) : 0;
        if (!kalem || ik.adet > kalan + 0.0001) {
          engellendi = true;
          return prev;
        }
      }

      let sonuc = prev;

      // 1) Satış kalemlerindeki iadeEdilenAdet güncellenir.
      sonuc = {
        ...sonuc,
        satislar: sonuc.satislar.map((s) =>
          s.id === mevcutSatis.id
            ? {
                ...s,
                kalemler: s.kalemler.map((k) => {
                  const ik = iadeKalemleri.find((x) => x.parcaId === k.parcaId);
                  return ik ? { ...k, iadeEdilenAdet: (k.iadeEdilenAdet || 0) + ik.adet } : k;
                }),
              }
            : s
        ),
      };

      // 2) Ürün durumuna göre: Satılabilir → normal stoğa geri; Hasarlı →
      // AYRI hasarlı stok sayacına (satılabilir stoğu asla etkilemez).
      for (const ik of iadeKalemleri) {
        if (ik.durum === "Hasarlı") {
          sonuc = {
            ...sonuc,
            parcalar: sonuc.parcalar.map((p) =>
              p.id === ik.parcaId
                ? {
                    ...p,
                    hasarliStok: (p.hasarliStok || 0) + ik.adet,
                    hasarliGecmisi: [{ id: R.yeniId("hs"), tarih: R.zamanDamgasi(), adet: ik.adet, aciklama: `İade: Satış #${belgeNo} (${iadeNedeni})` }, ...(p.hasarliGecmisi || [])],
                  }
                : p
            ),
          };
        } else {
          const yeni = R.stokHareketiUygula(sonuc, {
            parcaId: ik.parcaId,
            tur: "Satış İadesi",
            giris: ik.adet,
            belgeNo,
            kullanici: iadeyiAlan.trim(),
            aciklama: `İade nedeni: ${iadeNedeni}`,
          });
          if (!yeni) {
            engellendi = true;
            return prev;
          }
          sonuc = yeni;
        }
      }

      // 3) Değişimde yeni ürünler stoktan çıkar.
      if (kapatmaYontemi === "Değişim") {
        for (const s of degisimSepeti) {
          const adet = parseFloat(s.adet) || 0;
          if (adet <= 0) continue;
          const yeni = R.stokHareketiUygula(sonuc, {
            parcaId: s.parcaId,
            tur: "Değişim — Yeni Ürün",
            cikis: adet,
            belgeNo,
            kullanici: iadeyiAlan.trim(),
            aciklama: `Değişim: Satış #${belgeNo}`,
          });
          if (!yeni) {
            engellendi = true;
            return prev;
          }
          sonuc = yeni;
        }
      }

      // 4) Para hareketi: normal iadede tam tutar, değişimde sadece FARK
      // işlenir (fark>0 → müşteri öder/GİRİŞ, fark<0 → müşteriye ödenir/ÇIKIŞ).
      const paraTutari = kapatmaYontemi === "Değişim" ? farkTutari : -iadeToplamTutar; // iade her zaman mağazadan çıkar (negatif)
      if (Math.abs(paraTutari) > 0.005) {
        if (kapatmaYontemi === "Cari Hesaba Alacak") {
          sonuc = R.cariHareketiUygula(sonuc, {
            musteriId: seciliSatis.musteriId,
            musteriAdi: seciliSatis.musteriAdi,
            tutar: Math.abs(paraTutari),
            tur: paraTutari < 0 ? "ödeme" : "borç", // iade → alacaklandırma (borcu azaltır/alacak oluşturur), fark pozitifse ek borç
            aciklama: `İade: Satış #${belgeNo}${kapatmaYontemi === "Değişim" ? " (değişim farkı)" : ""}`,
            belgeNo,
            kaynakSatisId: seciliSatis.id,
          });
        } else if (hesapId) {
          const hesap = sonuc.hesaplar.find((h) => h.id === hesapId);
          const cikisTutari = paraTutari < 0 ? -paraTutari : 0;
          if (!hesap || (cikisTutari > 0 && (Number(hesap.bakiye) || 0) < cikisTutari - 0.01)) {
            engellendi = true;
            return prev;
          }
          sonuc = R.hesapHareketiUygula(sonuc, {
            hesapId,
            tur: kapatmaYontemi === "Değişim" ? "Değişim Farkı" : `Satış İadesi — ${kapatmaYontemi}`,
            giris: paraTutari > 0 ? paraTutari : 0,
            cikis: cikisTutari,
            belgeNo,
            aciklama: `${mevcutSatis.musteriAdi} — ${iadeNedeni}`,
            kullanici: iadeyiAlan.trim(),
            kaynakId: iadeId,
          });
        }
      }

      sonuc = R.islemKaydet(sonuc, {
        kullaniciAdi: aktifKullanici?.adSoyad || iadeyiAlan.trim(),
        islemTuru: "Satış iadesi alındı",
        aciklama: `Satış #${belgeNo} — ${iadeKalemleri.map((k) => k.ad).join(", ")} (${iadeNedeni})`,
        eskiDeger: "—",
        yeniDeger: `−${R.tl(iadeToplamTutar)}`,
      });

      return { ...sonuc, iadeler: [iadeKaydi, ...sonuc.iadeler] };
    });

    if (engellendi) {
      R.bildirimGoster("İade kaydedilemedi — satışın kalan iade hakkı veya kasa/banka bakiyesi uygun değil. İşlem geri alındı.", "hata");
      return;
    }

    R.sonKullaniciAdiKaydet(iadeyiAlan);
    R.bildirimGoster("İade kaydedildi.", "basari");
    setSonIade(iadeKaydi);
    satisFormuTemizle();
  };

  // --- Alış iadesi state -----------------------------------------------------
  const [tedarikciArama, setTedarikciArama] = R.useState("");
  const [tedarikciAramaAcik, setTedarikciAramaAcik] = R.useState(false);
  const [seciliTedarikciAdi, setSeciliTedarikciAdi] = R.useState("");
  const [seciliAlisId, setSeciliAlisId] = R.useState(null);
  const [alisIadeSecimleri, setAlisIadeSecimleri] = R.useState({}); // { parcaId: adet }
  const [alisIadeNedeni, setAlisIadeNedeni] = R.useState(R.IADE_NEDENLERI[0]);
  const [alisIadeyiAlan, setAlisIadeyiAlan] = R.useIslemYapan(aktifKullanici);

  const tedarikciAramaSonuclari =
    !seciliTedarikciAdi && tedarikciArama.trim() ? db.tedarikciler.filter((t) => t.ad.toLowerCase().includes(tedarikciArama.toLowerCase())).slice(0, 8) : [];
  const tedarikciFaturalari = seciliTedarikciAdi ? db.malAlimlari.filter((m) => m.tedarikci.toLowerCase() === seciliTedarikciAdi.toLowerCase()) : [];
  const seciliAlis = seciliAlisId ? db.malAlimlari.find((m) => m.id === seciliAlisId) : null;

  const alisKalanIadeEdilebilir = (k) => Math.max(0, k.adet - (k.iadeEdilenAdet || 0));
  const alisIadeToplamTutar = seciliAlis
    ? seciliAlis.kalemler.reduce((t, k) => {
        const adet = parseFloat(alisIadeSecimleri[k.parcaId]) || 0;
        return t + R.satirNetMaliyetHesapla(k) * adet;
      }, 0)
    : 0;

  const alisFormuTemizle = () => {
    setTedarikciArama("");
    setSeciliTedarikciAdi("");
    setSeciliAlisId(null);
    setAlisIadeSecimleri({});
    setAlisIadeNedeni(R.IADE_NEDENLERI[0]);
  };

  const alisIadesiKaydet = () => {
    if (!R.yetkiVarMi(db, aktifKullanici, "malAlisGirebilir")) {
      R.bildirimGoster("Alış iadesi işlemi için yetkiniz yok.", "hata");
      return;
    }
    if (!seciliAlis) {
      R.bildirimGoster("Önce bir alış faturası seçin.", "hata");
      return;
    }
    const iadeKalemleri = seciliAlis.kalemler
      .map((k) => {
        const adet = parseFloat(alisIadeSecimleri[k.parcaId]) || 0;
        return adet > 0 ? { parcaId: k.parcaId, ad: k.ad, marka: k.marka, adet, birimFiyat: R.satirNetMaliyetHesapla(k) } : null;
      })
      .filter(Boolean);
    if (iadeKalemleri.length === 0) {
      R.bildirimGoster("En az bir kalem için iade adedi girin.", "hata");
      return;
    }
    for (const ik of iadeKalemleri) {
      const kalem = seciliAlis.kalemler.find((k) => k.parcaId === ik.parcaId);
      if (ik.adet > alisKalanIadeEdilebilir(kalem) + 0.0001) {
        R.bildirimGoster(`"${kalem.ad}" için en fazla ${alisKalanIadeEdilebilir(kalem)} adet iade edilebilir.`, "hata");
        return;
      }
    }

    const iadeId = R.yeniId("aiad");
    const belgeNo = seciliAlis.faturaNo;
    const iadeKaydi = {
      id: iadeId,
      tarih: R.zamanDamgasi(),
      alisId: seciliAlis.id,
      tedarikci: seciliAlis.tedarikci,
      kalemler: iadeKalemleri,
      iadeNedeni: alisIadeNedeni,
      tutar: Math.round(alisIadeToplamTutar * 100) / 100,
      iadeyiAlan: alisIadeyiAlan.trim(),
    };

    let engellendi = false;
    updateDb((prev) => {
      let sonuc = {
        ...prev,
        malAlimlari: prev.malAlimlari.map((m) =>
          m.id === seciliAlis.id
            ? {
                ...m,
                kalemler: m.kalemler.map((k) => {
                  const ik = iadeKalemleri.find((x) => x.parcaId === k.parcaId);
                  return ik ? { ...k, iadeEdilenAdet: (k.iadeEdilenAdet || 0) + ik.adet } : k;
                }),
              }
            : m
        ),
      };

      for (const ik of iadeKalemleri) {
        const yeni = R.stokHareketiUygula(sonuc, {
          parcaId: ik.parcaId,
          tur: "Alış İadesi",
          cikis: ik.adet,
          belgeNo,
          kullanici: alisIadeyiAlan.trim(),
          aciklama: `Tedarikçiye iade: ${alisIadeNedeni}`,
        });
        if (!yeni) {
          engellendi = true;
          return prev;
        }
        sonuc = yeni;
      }

      sonuc = R.tedarikciHareketiUygula(sonuc, {
        tedarikciAdi: seciliAlis.tedarikci,
        tutar: Math.round(alisIadeToplamTutar * 100) / 100,
        tur: "ödeme",
        aciklama: `Alış iadesi (${alisIadeNedeni})`,
        faturaNo: belgeNo,
        kaynakKasaIslemiId: iadeId,
      });

      sonuc = R.islemKaydet(sonuc, {
        kullaniciAdi: aktifKullanici?.adSoyad || alisIadeyiAlan.trim(),
        islemTuru: "Alış iadesi yapıldı",
        aciklama: `${seciliAlis.tedarikci} — Fatura #${belgeNo} (${alisIadeNedeni})`,
        eskiDeger: "—",
        yeniDeger: R.tl(alisIadeToplamTutar),
      });

      return { ...sonuc, alisIadeleri: [iadeKaydi, ...sonuc.alisIadeleri] };
    });

    if (engellendi) {
      R.bildirimGoster("İade kaydedilemedi — stok işlenirken beklenmeyen bir sorun oluştu.", "hata");
      return;
    }

    R.sonKullaniciAdiKaydet(alisIadeyiAlan);
    R.bildirimGoster("Alış iadesi kaydedildi, stok düştü ve tedarikçi borcundan düşüldü.", "basari");
    alisFormuTemizle();
  };

  const sonSatisIadeleri = db.iadeler.slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "satis", ad: "Satış İadesi" },
          { id: "alis", ad: "Alış İadesi (Tedarikçiye)" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setIadeTipi(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{ background: iadeTipi === s.id ? R.T.graphite900 : "#fff", color: iadeTipi === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {iadeTipi === "satis" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {!seciliSatis ? (
              <>
                <div className="relative">
                  <R.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
                  <input
                    value={arama}
                    onChange={(e) => {
                      setArama(e.target.value);
                      setAramaAcik(true);
                    }}
                    onFocus={() => setAramaAcik(true)}
                    placeholder="Fiş/Belge No, telefon, müşteri adı veya ürün kodu/OEM ile eski satışı bulun…"
                    className="w-full pl-10 pr-3 py-3 rounded-lg border text-sm outline-none focus:ring-2"
                    style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    autoFocus
                  />
                </div>
                {aramaAcik && aramaSonuclari.length > 0 && (
                  <R.Kart className="overflow-hidden">
                    {aramaSonuclari.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSeciliSatisId(s.id);
                          setAramaAcik(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-gray-50"
                        style={{ borderTop: `1px solid ${R.T.steel200}` }}
                      >
                        <div className="min-w-0">
                          <div style={{ color: R.T.ink900 }}>
                            {s.id.slice(-6).toUpperCase()} <span style={{ color: R.T.ink500 }}>· {s.musteriAdi}</span>
                          </div>
                          <div className="text-xs" style={{ color: R.T.ink500 }}>
                            {R.tarihGoster(s.tarih)} · {s.kalemler.length} kalem
                          </div>
                        </div>
                        <span className="font-semibold shrink-0" style={R.MONO}>
                          {R.tl(s.genelToplam)}
                        </span>
                      </button>
                    ))}
                  </R.Kart>
                )}
                {arama.trim() && aramaSonuclari.length === 0 && (
                  <R.Kart>
                    <R.Bos ikon={R.RotateCcw} baslik="Satış bulunamadı" aciklama="Farklı bir belge no, telefon, müşteri adı veya ürün kodu deneyin." />
                  </R.Kart>
                )}
              </>
            ) : (
              <>
                <div className="px-3.5 py-2.5 rounded-md text-sm flex items-center justify-between" style={{ background: "#FDF1D6", color: "#8A6110" }}>
                  <span>
                    <strong>{seciliSatis.id.slice(-6).toUpperCase()}</strong> — {seciliSatis.musteriAdi} · {R.tarihGoster(seciliSatis.tarih)}
                  </span>
                  <button onClick={satisFormuTemizle} className="font-semibold underline shrink-0 ml-3">
                    Başka Satış Seç
                  </button>
                </div>
                <R.Kart className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                          <th className="text-left font-semibold px-3 py-2">Ürün / Marka / Kod</th>
                          <th className="text-center font-semibold px-2 py-2">Satılan</th>
                          <th className="text-right font-semibold px-2 py-2">Satış Fiyatı</th>
                          <th className="text-center font-semibold px-2 py-2">İade Adet</th>
                          <th className="text-left font-semibold px-2 py-2">Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seciliSatis.kalemler.map((k) => {
                          const kalan = kalanIadeEdilebilir(k);
                          const secim = iadeSecimleri[k.parcaId] || { adet: 0, durum: "Satılabilir" };
                          return (
                            <tr key={k.parcaId} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                              <td className="px-3 py-2.5">
                                <div style={{ color: R.T.ink900 }}>{k.ad}</div>
                                <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                                  {k.marka} · {k.stokKodu} {kalan < k.adet && `· ${k.adet - kalan} zaten iade edildi`}
                                </div>
                              </td>
                              <td className="px-2 py-2.5 text-center" style={R.MONO}>
                                {k.adet} {k.birim}
                              </td>
                              <td className="px-2 py-2.5 text-right font-semibold" style={R.MONO}>
                                {R.tl(R.satisKalemiEfektifBirim(k))}
                              </td>
                              <td className="px-2 py-2.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={kalan}
                                  value={secim.adet || ""}
                                  disabled={kalan === 0}
                                  onChange={(e) => secimGuncelle(k.parcaId, "adet", Math.min(parseFloat(e.target.value) || 0, kalan))}
                                  placeholder="0"
                                  className="w-16 px-1.5 py-1 rounded border text-sm text-center outline-none disabled:opacity-40"
                                  style={{ borderColor: R.T.steel300 }}
                                />
                              </td>
                              <td className="px-2 py-2.5">
                                <select
                                  value={secim.durum}
                                  onChange={(e) => secimGuncelle(k.parcaId, "durum", e.target.value)}
                                  disabled={!secim.adet}
                                  className="px-2 py-1 rounded border text-xs outline-none bg-white disabled:opacity-40"
                                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                                >
                                  <option value="Satılabilir">✓ Satılabilir</option>
                                  <option value="Hasarlı">⚠ Hasarlı/Ayıplı</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </R.Kart>

                {kapatmaYontemi === "Değişim" && (
                  <R.Kart className="p-4">
                    <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                      Değişim — Yeni Ürün
                    </h4>
                    <div className="relative mb-2">
                      <input
                        value={degisimArama}
                        onChange={(e) => {
                          setDegisimArama(e.target.value);
                          setDegisimAramaAcik(true);
                        }}
                        onFocus={() => setDegisimAramaAcik(true)}
                        placeholder="Yeni ürün ara…"
                        className="w-full px-3 py-2 rounded-md border text-sm outline-none"
                        style={{ borderColor: R.T.steel300 }}
                      />
                      {degisimAramaAcik && degisimAramaSonuclari.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-56 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                          {degisimAramaSonuclari.map((p) => (
                            <button
                              key={p.id}
                              onMouseDown={() => degisimSepeteEkle(p)}
                              className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-gray-50"
                              style={{ color: R.T.ink900 }}
                            >
                              <span>
                                {p.ad} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {p.stokKodu}</span>
                              </span>
                              <span style={R.MONO}>{R.tl(p.satisFiyati)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {degisimSepeti.map((s) => (
                      <div key={s.parcaId} className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm mb-1.5" style={{ background: R.T.steel100 }}>
                        <div className="min-w-0 flex-1">
                          <div style={{ color: R.T.ink900 }}>{s.ad}</div>
                          <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                            {s.stokKodu}
                          </div>
                        </div>
                        <input
                          type="number"
                          value={s.adet}
                          onChange={(e) => degisimSepetiGuncelle(s.parcaId, "adet", parseFloat(e.target.value) || 0)}
                          className="w-14 px-1.5 py-1 rounded border text-sm text-center outline-none"
                          style={{ borderColor: R.T.steel300 }}
                        />
                        <input
                          type="number"
                          value={s.birimFiyat}
                          onChange={(e) => degisimSepetiGuncelle(s.parcaId, "birimFiyat", parseFloat(e.target.value) || 0)}
                          className="w-24 px-1.5 py-1 rounded border text-sm text-right outline-none"
                          style={{ borderColor: R.T.steel300, ...R.MONO }}
                        />
                        <button onClick={() => degisimSepetindenSil(s.parcaId)} style={{ color: R.T.red }}>
                          <R.X size={14} />
                        </button>
                      </div>
                    ))}
                  </R.Kart>
                )}

                {gecmisIadeAcik !== undefined && sonSatisIadeleri.length > 0 && (
                  <R.Kart className="p-4">
                    <button onClick={() => setGecmisIadeAcik((v) => !v)} className="w-full flex items-center justify-between">
                      <span className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                        <R.History size={15} /> Son İadeler
                      </span>
                      <span className="text-xs" style={{ color: R.T.ink500 }}>
                        {db.iadeler.length} kayıt
                      </span>
                    </button>
                    {gecmisIadeAcik && (
                      <div className="flex flex-col gap-1.5 mt-3">
                        {sonSatisIadeleri.map((i) => (
                          <div key={i.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                            <span style={{ color: R.T.ink900 }}>
                              {i.musteriAdi} <span style={{ color: R.T.ink500 }}>· {R.tarihGoster(i.tarih)} · {i.kapatmaYontemi}</span>
                            </span>
                            <span className="font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                              −{R.tl(i.tutar)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </R.Kart>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <R.Kart className="p-4 flex flex-col gap-3">
              <R.Girdi label="İadeyi Alan Kullanıcı" value={iadeyiAlan} readOnly placeholder="ör. Emirhan" />
              <R.Secim label="İade Nedeni" value={iadeNedeni} onChange={(e) => setIadeNedeni(e.target.value)}>
                {R.IADE_NEDENLERI.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </R.Secim>
              <R.Secim label="Kapatma Yöntemi" value={kapatmaYontemi} onChange={(e) => setKapatmaYontemi(e.target.value)}>
                {R.IADE_KAPATMA_YONTEMLERI.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </R.Secim>
              {(kapatmaYontemi === "Nakit" || kapatmaYontemi === "Kredi Kartı" || kapatmaYontemi === "Havale") && db.hesaplar.length > 0 && (
                <R.Secim label="Hangi Hesaptan Ödenecek" value={hesapId} onChange={(e) => setHesapId(e.target.value)}>
                  <option value="">Seçin…</option>
                  {db.hesaplar.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.ad}
                    </option>
                  ))}
                </R.Secim>
              )}
            </R.Kart>

            <R.Kart className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: R.T.ink500 }}>İade Tutarı</span>
                <span className="font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                  −{R.tl(iadeToplamTutar)}
                </span>
              </div>
              {kapatmaYontemi === "Değişim" && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: R.T.ink500 }}>Yeni Ürün Toplamı</span>
                    <span className="font-semibold" style={R.MONO}>
                      +{R.tl(degisimToplam)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                    <span className="font-semibold" style={{ color: R.T.ink900 }}>
                      {farkTutari >= 0 ? "Müşterinin Ödeyeceği Fark" : "Müşteriye İade Edilecek Fark"}
                    </span>
                    <span className="text-lg font-semibold" style={{ ...R.MONO, color: farkTutari >= 0 ? R.T.ink900 : R.T.green }}>
                      {R.tl(Math.abs(farkTutari))}
                    </span>
                  </div>
                </>
              )}
              <R.Buton onClick={satisIadesiKaydet} disabled={!seciliSatis} className="mt-2">
                <R.Check size={16} /> İadeyi Kaydet
              </R.Buton>
            </R.Kart>
          </div>
        </div>
      )}

      {iadeTipi === "alis" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {!seciliTedarikciAdi ? (
              <div className="relative">
                <R.Girdi
                  label="Tedarikçi"
                  value={tedarikciArama}
                  onChange={(e) => {
                    setTedarikciArama(e.target.value);
                    setTedarikciAramaAcik(true);
                  }}
                  onFocus={() => setTedarikciAramaAcik(true)}
                  placeholder="Tedarikçi ara…"
                  autoFocus
                />
                {tedarikciAramaAcik && tedarikciAramaSonuclari.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-56 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                    {tedarikciAramaSonuclari.map((t) => (
                      <button
                        key={t.id}
                        onMouseDown={() => {
                          setSeciliTedarikciAdi(t.ad);
                          setTedarikciArama("");
                          setTedarikciAramaAcik(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        style={{ color: R.T.ink900 }}
                      >
                        {t.ad}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : !seciliAlis ? (
              <>
                <div className="px-3.5 py-2.5 rounded-md text-sm flex items-center justify-between" style={{ background: "#FDF1D6", color: "#8A6110" }}>
                  <span>
                    <strong>{seciliTedarikciAdi}</strong> — bir fatura seçin
                  </span>
                  <button onClick={alisFormuTemizle} className="font-semibold underline shrink-0 ml-3">
                    Başka Tedarikçi Seç
                  </button>
                </div>
                <R.Kart>
                  {tedarikciFaturalari.length === 0 ? (
                    <R.Bos ikon={R.Truck} baslik="Fatura bulunamadı" aciklama="Bu tedarikçiye ait mal alış faturası yok." />
                  ) : (
                    tedarikciFaturalari.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSeciliAlisId(m.id)}
                        className="w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-gray-50"
                        style={{ borderTop: `1px solid ${R.T.steel200}` }}
                      >
                        <div>
                          <div style={{ color: R.T.ink900 }}>{m.faturaNo}</div>
                          <div className="text-xs" style={{ color: R.T.ink500 }}>
                            {R.tarihGoster(m.faturaTarihi)} · {m.kalemler.length} kalem
                          </div>
                        </div>
                        <span className="font-semibold" style={R.MONO}>
                          {R.tl(m.hesaplananGenelToplam)}
                        </span>
                      </button>
                    ))
                  )}
                </R.Kart>
              </>
            ) : (
              <>
                <div className="px-3.5 py-2.5 rounded-md text-sm flex items-center justify-between" style={{ background: "#FDF1D6", color: "#8A6110" }}>
                  <span>
                    <strong>{seciliAlis.faturaNo}</strong> — {seciliTedarikciAdi}
                  </span>
                  <button onClick={() => setSeciliAlisId(null)} className="font-semibold underline shrink-0 ml-3">
                    Başka Fatura Seç
                  </button>
                </div>
                <R.Kart className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                          <th className="text-left font-semibold px-3 py-2">Ürün</th>
                          <th className="text-center font-semibold px-2 py-2">Alınan</th>
                          <th className="text-right font-semibold px-2 py-2">Birim Fiyat</th>
                          <th className="text-center font-semibold px-2 py-2">İade Adet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seciliAlis.kalemler.map((k) => {
                          const kalan = alisKalanIadeEdilebilir(k);
                          return (
                            <tr key={k.parcaId} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                              <td className="px-3 py-2.5">
                                <div style={{ color: R.T.ink900 }}>{k.ad}</div>
                                <div className="text-xs" style={{ color: R.T.ink500 }}>
                                  {kalan < k.adet && `${k.adet - kalan} zaten iade edildi`}
                                </div>
                              </td>
                              <td className="px-2 py-2.5 text-center" style={R.MONO}>
                                {k.adet}
                              </td>
                              <td className="px-2 py-2.5 text-right font-semibold" style={R.MONO}>
                                {R.tl(R.satirNetMaliyetHesapla(k))}
                              </td>
                              <td className="px-2 py-2.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={kalan}
                                  disabled={kalan === 0}
                                  value={alisIadeSecimleri[k.parcaId] || ""}
                                  onChange={(e) => setAlisIadeSecimleri((prev) => ({ ...prev, [k.parcaId]: Math.min(parseFloat(e.target.value) || 0, kalan) }))}
                                  className="w-16 px-1.5 py-1 rounded border text-sm text-center outline-none disabled:opacity-40"
                                  style={{ borderColor: R.T.steel300 }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </R.Kart>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <R.Kart className="p-4 flex flex-col gap-3">
              <R.Girdi label="İadeyi Alan Kullanıcı" value={alisIadeyiAlan} readOnly placeholder="ör. Emirhan" />
              <R.Secim label="İade Nedeni" value={alisIadeNedeni} onChange={(e) => setAlisIadeNedeni(e.target.value)}>
                {R.IADE_NEDENLERI.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </R.Secim>
            </R.Kart>
            <R.Kart className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold" style={{ color: R.T.ink900 }}>
                  İade Tutarı (Borçtan Düşecek)
                </span>
                <span className="text-lg font-semibold" style={R.MONO}>
                  {R.tl(alisIadeToplamTutar)}
                </span>
              </div>
              <R.Buton onClick={alisIadesiKaydet} disabled={!seciliAlis}>
                <R.Check size={16} /> Alış İadesini Kaydet
              </R.Buton>
            </R.Kart>
          </div>
        </div>
      )}

      {/* Kaydedilen iade sonrası */}
      {sonIade && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSonIade(null)}>
          <div className="w-full max-w-sm rounded-lg p-5 text-center" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#DEF0DF" }}>
              <R.Check size={22} style={{ color: R.T.green }} />
            </div>
            <h3 className="font-semibold text-base mb-1" style={{ color: R.T.ink900 }}>
              İade Kaydedildi
            </h3>
            <p className="text-lg font-semibold mb-4" style={{ ...R.MONO, color: R.T.red }}>
              −{R.tl(sonIade.tutar)}
            </p>
            <R.Buton variant="ghost" onClick={() => setSonIade(null)}>
              Kapat
            </R.Buton>
          </div>
        </div>
      )}
    </div>
  );
}
