/* Alış/Tedarikçi ekranı — ayrıştırılmış bileşen.
 * Finans ve veri sözleşmeleri değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function AlisSayfasi({ db, updateDb, aktifKullanici }) {
  const [form, setForm] = R.useState(R.bosAlisForm);
  const [kalemler, setKalemler] = R.useState([]);
  const [arama, setArama] = R.useState("");
  const [aramaAcik, setAramaAcik] = R.useState(false);
  const [islemiYapan, setIslemiYapan] = R.useIslemYapan(aktifKullanici);
  const [duzenlenenId, setDuzenlenenId] = R.useState(null);
  const [gecmisAcik, setGecmisAcik] = R.useState(false);
  const [degisiklikGecmisAcikId, setDegisiklikGecmisAcikId] = R.useState(null);
  // Maliyet Değiştiğinde Uyarı (55. adım, 5. madde) — alış kaydedildikten
  // sonra, yeni maliyetle mevcut satış fiyatının kâr marjı düşen ürünler.
  const [maliyetUyarilari, setMaliyetUyarilari] = R.useState([]);
  const aramaRef = R.useRef(null);

  const aramaSonuclari = arama.trim() ? R.hizliAramaYap(db, arama).slice(0, 8) : [];

  const kalemEkle = (p) => {
    if (kalemler.some((k) => k.parcaId === p.id)) {
      R.bildirimGoster("Bu ürün zaten faturada var — adedi satırdan güncelleyin.", "hata");
      return;
    }
    setKalemler((prev) => [
      ...prev,
      {
        parcaId: p.id,
        stokKodu: p.stokKodu,
        ad: p.ad,
        marka: p.marka,
        birim: p.birim,
        adet: 1,
        birimFiyat: p.sonAlisFiyati || p.alisFiyati || 0,
        iskontoYuzde: 0,
        kdvOrani: p.kdvOrani || 0,
      },
    ]);
    setArama("");
    setAramaAcik(false);
    aramaRef.current?.focus();
  };

  const kalemGuncelle = (parcaId, alan, deger) =>
    setKalemler((prev) => prev.map((k) => (k.parcaId === parcaId ? { ...k, [alan]: deger } : k)));
  const kalemSil = (parcaId) => setKalemler((prev) => prev.filter((k) => k.parcaId !== parcaId));

  // --- Fiyat değişikliği uyarısı --------------------------------------
  const fiyatUyarisi = (k) => {
    const p = db.parcalar.find((x) => x.id === k.parcaId);
    if (!p) return null;
    const eskiFiyat = p.sonAlisFiyati || p.alisFiyati || 0;
    const yeniFiyat = R.satirNetMaliyetHesapla(k);
    if (!eskiFiyat || Math.abs(yeniFiyat - eskiFiyat) < 0.01) return null;
    const degisimYuzde = ((yeniFiyat - eskiFiyat) / eskiFiyat) * 100;
    const satisFiyatiNet = (p.satisFiyati || 0) / (1 + (p.kdvOrani || 0) / 100);
    const yeniKarOrani = yeniFiyat > 0 ? ((satisFiyatiNet - yeniFiyat) / yeniFiyat) * 100 : null;
    return { degisimYuzde, satisFiyati: p.satisFiyati, yeniKarOrani };
  };

  // --- Toplamlar --------------------------------------------------------
  const malToplami = kalemler.reduce((t, k) => t + R.satirToplamiHesapla(k), 0);
  const kdvToplami = kalemler.reduce((t, k) => t + R.satirToplamiHesapla(k) * ((parseFloat(k.kdvOrani) || 0) / 100), 0);
  const hesaplananGenelToplam = malToplami + kdvToplami;
  const faturaGirilenToplam = parseFloat(form.faturaGirilenToplam) || null;
  const fark = faturaGirilenToplam !== null ? Math.round((hesaplananGenelToplam - faturaGirilenToplam) * 100) / 100 : null;

  const formuTemizle = () => {
    setForm(R.bosAlisForm);
    setKalemler([]);
    setDuzenlenenId(null);
  };

  const duzenlemeyeAc = (m) => {
    setForm({
      tedarikci: m.tedarikci,
      faturaNo: m.faturaNo,
      faturaTarihi: m.faturaTarihi,
      vadeTarihi: m.vadeTarihi || "",
      odemeDurumu: m.odemeDurumu,
      odenenTutar: m.odenenTutar ? String(m.odenenTutar) : "",
      odemeYontemi: m.odemeYontemi || "Nakit",
      odemeHesapId: m.odemeHesapId || "",
      faturaGirilenToplam: m.faturaGirilenToplam ? String(m.faturaGirilenToplam) : "",
      aciklama: m.aciklama || "",
    });
    setKalemler(m.kalemler);
    setDuzenlenenId(m.id);
    setGecmisAcik(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Kaydet -------------------------------------------------------------
  const kaydet = () => {
    if (!R.yetkiVarMi(db, aktifKullanici, "malAlisGirebilir")) {
      R.bildirimGoster("Mal alış kaydetme yetkiniz yok.", "hata");
      return;
    }
    if (!form.tedarikci.trim()) {
      R.bildirimGoster("Tedarikçi adı zorunludur.", "hata");
      return;
    }
    if (!form.faturaNo.trim()) {
      R.bildirimGoster("Fatura / irsaliye numarası zorunludur.", "hata");
      return;
    }
    if (kalemler.length === 0) {
      R.bildirimGoster("En az bir ürün eklemelisiniz.", "hata");
      return;
    }

    // Aynı tedarikçi + fatura no daha önce kayıtlıysa (bu kayıt hariç) uyar.
    const cakisan = db.malAlimlari.find(
      (m) =>
        m.id !== duzenlenenId &&
        m.tedarikci.trim().toLowerCase() === form.tedarikci.trim().toLowerCase() &&
        m.faturaNo.trim().toLowerCase() === form.faturaNo.trim().toLowerCase()
    );
    if (cakisan) {
      const devamEt = window.confirm(
        `"${form.tedarikci}" tedarikçisi için "${form.faturaNo}" numaralı fatura zaten kayıtlı (${R.tarihGoster(cakisan.faturaTarihi)}, ${R.tl(
          cakisan.hesaplananGenelToplam
        )}).\n\nBu faturayı yine de (muhtemel mükerrer girişe rağmen) kaydetmek istiyor musunuz?`
      );
      if (!devamEt) return;
    }

    const odenenTutar = form.odemeDurumu === "Ödendi" ? hesaplananGenelToplam : form.odemeDurumu === "Kısmi" ? parseFloat(form.odenenTutar) || 0 : 0;
    const faturaTutari = faturaGirilenToplam !== null ? faturaGirilenToplam : Math.round(hesaplananGenelToplam * 100) / 100;

    if (duzenlenenId) {
      // --- Düzenleme: SADECE başlık/ödeme bilgileri değişebilir, kalemler
      // (ve dolayısıyla zaten işlenmiş stok hareketleri) sabittir. Değişen
      // alanların özeti "kim, ne zaman, neyi değiştirdi" olarak saklanır.
      const eski = db.malAlimlari.find((m) => m.id === duzenlenenId);
      const degisenler = [];
      if (eski.tedarikci !== form.tedarikci.trim()) degisenler.push(`Tedarikçi: "${eski.tedarikci}" → "${form.tedarikci.trim()}"`);
      if (eski.faturaNo !== form.faturaNo.trim()) degisenler.push(`Fatura No: "${eski.faturaNo}" → "${form.faturaNo.trim()}"`);
      if (eski.faturaTarihi !== form.faturaTarihi) degisenler.push(`Fatura Tarihi: ${R.tarihGoster(eski.faturaTarihi)} → ${R.tarihGoster(form.faturaTarihi)}`);
      if ((eski.vadeTarihi || "") !== form.vadeTarihi) degisenler.push(`Vade Tarihi: ${eski.vadeTarihi ? R.tarihGoster(eski.vadeTarihi) : "—"} → ${form.vadeTarihi ? R.tarihGoster(form.vadeTarihi) : "—"}`);
      if (eski.odemeDurumu !== form.odemeDurumu) degisenler.push(`Ödeme Durumu: ${eski.odemeDurumu} → ${form.odemeDurumu}`);
      if ((eski.odenenTutar || 0) !== odenenTutar) degisenler.push(`Ödenen Tutar: ${R.tl(eski.odenenTutar || 0)} → ${R.tl(odenenTutar)}`);
      if ((eski.odemeYontemi || "Nakit") !== (form.odemeYontemi || "Nakit")) degisenler.push(`Ödeme Yöntemi: ${eski.odemeYontemi || "Nakit"} → ${form.odemeYontemi || "Nakit"}`);
      if ((eski.odemeHesapId || "") !== (form.odemeHesapId || "")) degisenler.push("Ödeme hesabı değiştirildi");
      if (
        (eski.odemeDurumu !== form.odemeDurumu ||
          (eski.odenenTutar || 0) !== odenenTutar ||
          (eski.odemeYontemi || "Nakit") !== (form.odemeYontemi || "Nakit") ||
          (eski.odemeHesapId || "") !== (form.odemeHesapId || "")) &&
        duzenlenenId
      ) {
        R.bildirimGoster("Kayıtlı alış faturalarının ödeme bilgileri buradan değiştirilemez. Tahsilat / Ödeme modülünü kullanın.", "hata");
        return;
      }
      if ((eski.aciklama || "") !== form.aciklama.trim()) degisenler.push("Açıklama güncellendi");

      if (degisenler.length === 0) {
        R.bildirimGoster("Herhangi bir değişiklik yapılmadı.", "bilgi");
        formuTemizle();
        return;
      }

      updateDb((prev) => {
        // Eski tedarikçi borç/ödeme etkisini tamamen geri al, yeni değerlere göre yeniden uygula.
        let sonuc = R.tedarikciHareketleriniGeriAl(prev, duzenlenenId);
        const kalanBorc = faturaTutari - odenenTutar;
        if (kalanBorc > 0) {
          sonuc = R.tedarikciHareketiUygula(sonuc, {
            tedarikciAdi: form.tedarikci,
            tutar: faturaTutari,
            tur: "borç",
            aciklama: `Alış faturası`,
            faturaNo: form.faturaNo.trim(),
            kaynakAlisId: duzenlenenId,
          });
          if (odenenTutar > 0) {
            sonuc = R.tedarikciHareketiUygula(sonuc, {
              tedarikciAdi: form.tedarikci,
              tutar: odenenTutar,
              tur: "ödeme",
              aciklama: `Kısmi ödeme`,
              faturaNo: form.faturaNo.trim(),
              kaynakAlisId: duzenlenenId,
            });
          }
        }
        return {
          ...sonuc,
          malAlimlari: sonuc.malAlimlari.map((m) =>
            m.id === duzenlenenId
              ? {
                  ...m,
                  tedarikci: form.tedarikci.trim(),
                  faturaNo: form.faturaNo.trim(),
                  faturaTarihi: form.faturaTarihi,
                  vadeTarihi: form.vadeTarihi,
                  odemeDurumu: form.odemeDurumu,
                  odenenTutar,
                  faturaGirilenToplam,
                  aciklama: form.aciklama.trim(),
                  degisiklikGecmisi: [
                    { id: R.yeniId("d"), tarih: R.zamanDamgasi(), kullanici: islemiYapan.trim(), ozet: degisenler.join("; ") },
                    ...(m.degisiklikGecmisi || []),
                  ],
                }
              : m
          ),
        };
      });
      R.sonKullaniciAdiKaydet(islemiYapan);
      R.bildirimGoster("Fatura güncellendi.", "basari");
      formuTemizle();
      return;
    }

    // --- Yeni fatura -------------------------------------------------------
    const alisId = R.yeniId("al");
    const belgeNo = form.faturaNo.trim();
    const malAlim = {
      id: alisId,
      tedarikci: form.tedarikci.trim(),
      faturaNo: belgeNo,
      faturaTarihi: form.faturaTarihi,
      vadeTarihi: form.vadeTarihi,
      odemeDurumu: form.odemeDurumu,
      odemeYontemi: form.odemeYontemi || "Nakit",
      odemeHesapId: form.odemeHesapId || null,
      odenenTutar,
      aciklama: form.aciklama.trim(),
      kalemler,
      malToplami: Math.round(malToplami * 100) / 100,
      kdvToplami: Math.round(kdvToplami * 100) / 100,
      hesaplananGenelToplam: Math.round(hesaplananGenelToplam * 100) / 100,
      faturaGirilenToplam,
      olusturmaTarihi: R.zamanDamgasi(),
      olusturan: islemiYapan.trim(),
      degisiklikGecmisi: [],
    };

    let stokEngellendi = false;
    // Maliyet Değiştiğinde Uyarı (55. adım, 5. madde) — yeni maliyetle
    // mevcut satış fiyatının kâr marjı düşük kâr eşiğinin altına düşen
    // kalemleri toplar; kayıttan sonra ekranda uyarı olarak gösterilir.
    const dusukKarUyarilari = [];
    kalemler.forEach((k) => {
      const parca = db.parcalar.find((p) => p.id === k.parcaId);
      if (!parca) return;
      const adet = parseFloat(k.adet) || 0;
      const yeniMaliyet = Math.round(R.agirlikliOrtalamaMaliyetHesapla(parca.stok, parca.ortalamaMaliyet, adet, R.satirNetMaliyetHesapla(k)) * 100) / 100;
      const eskiMaliyet = parca.ortalamaMaliyet || parca.sonAlisFiyati || 0;
      if (parca.satisFiyati > 0 && yeniMaliyet !== eskiMaliyet) {
        const yeniKarMarji = ((parca.satisFiyati - yeniMaliyet) / parca.satisFiyati) * 100;
        if (yeniKarMarji < R.DUSUK_KAR_ESIGI_YUZDE) {
          dusukKarUyarilari.push({ parca, eskiMaliyet, yeniMaliyet, satisFiyati: parca.satisFiyati, karMarji: Math.round(yeniKarMarji * 10) / 10 });
        }
      }
    });

    updateDb((prev) => {
      let sonuc = prev;
      for (const k of kalemler) {
        const parca = sonuc.parcalar.find((p) => p.id === k.parcaId);
        if (!parca) continue;
        const adet = parseFloat(k.adet) || 0;
        const netFiyat = R.satirNetMaliyetHesapla(k);
        const yeniOrtalama = R.agirlikliOrtalamaMaliyetHesapla(parca.stok, parca.ortalamaMaliyet, adet, netFiyat);
        const guncellenmisParcalar = sonuc.parcalar.map((p) =>
          p.id === k.parcaId
            ? {
                ...p,
                sonAlisFiyati: netFiyat,
                ortalamaMaliyet: Math.round(yeniOrtalama * 100) / 100,
                alisGecmisi: [
                  { id: R.yeniId("g"), tarih: R.zamanDamgasi(), adet, birimFiyat: netFiyat, tedarikci: form.tedarikci.trim() },
                  ...(p.alisGecmisi || []),
                ],
              }
            : p
        );
        const yeni = R.stokHareketiUygula(
          { ...sonuc, parcalar: guncellenmisParcalar },
          { parcaId: k.parcaId, tur: "Mal Alış", giris: adet, belgeNo, kullanici: islemiYapan.trim(), aciklama: form.tedarikci.trim() }
        );
        if (!yeni) {
          stokEngellendi = true;
          return prev;
        }
        sonuc = yeni;
      }

      const finansSonucu = R.alisFinansHareketleriniUygula(sonuc, {
        alisId,
        tedarikci: form.tedarikci.trim(),
        faturaNo: belgeNo,
        faturaTutari,
        odenenTutar,
        hesapId: form.odemeHesapId || form.hesapId || null,
        odemeYontemi: form.odemeYontemi || "Nakit",
        kullanici: islemiYapan.trim(),
        tarih: malAlim.olusturmaTarihi,
      });
      if (!finansSonucu) {
        stokEngellendi = true;
        return prev;
      }
      sonuc = finansSonucu;

      return { ...sonuc, malAlimlari: [malAlim, ...sonuc.malAlimlari] };
    });

    if (dusukKarUyarilari.length > 0) setMaliyetUyarilari(dusukKarUyarilari);

    if (stokEngellendi) {
      R.bildirimGoster("Fatura kaydedilemedi — bir kalemde beklenmeyen bir stok hatası oluştu.", "hata");
      return;
    }

    R.sonKullaniciAdiKaydet(islemiYapan);
    R.bildirimGoster("Mal alış faturası kaydedildi, stoklar ve maliyetler güncellendi.", "basari");
    formuTemizle();
  };

  const degisiklikGecmisiParca = degisiklikGecmisAcikId ? db.malAlimlari.find((m) => m.id === degisiklikGecmisAcikId) : null;
  const sonFaturalar = db.malAlimlari.slice(0, 10);

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Sol: ürün ekleme + kalemler + geçmiş faturalar */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {duzenlenenId && (
          <div className="px-3.5 py-2.5 rounded-md text-sm flex items-center justify-between" style={{ background: "#FDF1D6", color: "#8A6110" }}>
            <span>
              <strong>{form.faturaNo}</strong> faturasını düzenliyorsunuz — kalemler sabittir, sadece başlık/ödeme bilgileri değişebilir.
            </span>
            <button onClick={formuTemizle} className="font-semibold underline shrink-0 ml-3">
              Vazgeç
            </button>
          </div>
        )}

        {!duzenlenenId && (
          <div className="relative">
            <R.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
            <input
              ref={aramaRef}
              value={arama}
              onChange={(e) => {
                setArama(e.target.value);
                setAramaAcik(true);
              }}
              onFocus={() => setAramaAcik(true)}
              placeholder="Ürün kodu, OEM veya ürün adıyla arayıp faturaya ekleyin…"
              className="w-full pl-10 pr-3 py-3 rounded-lg border text-sm outline-none focus:ring-2"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
            />
            {aramaAcik && aramaSonuclari.length > 0 && (
              <div
                className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-72 overflow-y-auto"
                style={{ borderColor: R.T.steel300 }}
              >
                {aramaSonuclari.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => kalemEkle(p)}
                    className="w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-gray-50"
                    style={{ borderBottom: `1px solid ${R.T.steel200}` }}
                  >
                    <div className="min-w-0">
                      <div style={{ color: R.T.ink900 }}>
                        {p.ad} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {p.marka}</span>
                      </div>
                      <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                        {p.stokKodu} · Mevcut stok: {p.stok} {p.birim} · Son alış: {R.tl(p.sonAlisFiyati || p.alisFiyati)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <R.Kart className="overflow-hidden">
          {kalemler.length === 0 ? (
            <R.Bos ikon={R.Package} baslik="Fatura kalemi yok" aciklama="Yukarıdaki kutudan ürün arayıp faturaya ekleyin." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Ürün</th>
                    <th className="text-center font-semibold px-2 py-2">Adet</th>
                    <th className="text-right font-semibold px-2 py-2">Birim Fiyat</th>
                    <th className="text-right font-semibold px-2 py-2">İsk. %</th>
                    <th className="text-right font-semibold px-2 py-2">KDV %</th>
                    <th className="text-right font-semibold px-3 py-2">Satır Toplamı</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {kalemler.map((k) => {
                    const uyari = fiyatUyarisi(k);
                    return (
                      <R.React.Fragment key={k.parcaId}>
                        <tr style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                          <td className="px-3 py-2.5">
                            <div style={{ color: R.T.ink900 }}>{k.ad}</div>
                            <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                              {k.marka} · {k.stokKodu}
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <input
                              type="number"
                              value={k.adet}
                              disabled={!!duzenlenenId}
                              onChange={(e) => kalemGuncelle(k.parcaId, "adet", parseFloat(e.target.value) || 0)}
                              className="w-16 px-1.5 py-1 rounded border text-sm text-center outline-none disabled:opacity-50"
                              style={{ borderColor: R.T.steel300 }}
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            <input
                              type="number"
                              value={k.birimFiyat}
                              disabled={!!duzenlenenId}
                              onChange={(e) => kalemGuncelle(k.parcaId, "birimFiyat", parseFloat(e.target.value) || 0)}
                              className="w-24 px-1.5 py-1 rounded border text-sm text-right outline-none disabled:opacity-50"
                              style={{ borderColor: R.T.steel300, ...R.MONO }}
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            <input
                              type="number"
                              value={k.iskontoYuzde}
                              disabled={!!duzenlenenId}
                              onChange={(e) => kalemGuncelle(k.parcaId, "iskontoYuzde", parseFloat(e.target.value) || 0)}
                              className="w-16 px-1.5 py-1 rounded border text-sm text-right outline-none disabled:opacity-50"
                              style={{ borderColor: R.T.steel300, ...R.MONO }}
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            <input
                              type="number"
                              value={k.kdvOrani}
                              disabled={!!duzenlenenId}
                              onChange={(e) => kalemGuncelle(k.parcaId, "kdvOrani", parseFloat(e.target.value) || 0)}
                              className="w-16 px-1.5 py-1 rounded border text-sm text-right outline-none disabled:opacity-50"
                              style={{ borderColor: R.T.steel300, ...R.MONO }}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold" style={R.MONO}>
                            {R.tl(R.satirToplamiHesapla(k))}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            {!duzenlenenId && (
                              <button onClick={() => kalemSil(k.parcaId)} style={{ color: R.T.red }}>
                                <R.Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                        {uyari && (
                          <tr>
                            <td colSpan={7} className="px-3 pb-2">
                              <div
                                className="text-xs font-semibold px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5"
                                style={{ background: uyari.degisimYuzde > 0 ? "#FDF1D6" : "#DEF0DF", color: uyari.degisimYuzde > 0 ? "#8A6110" : R.T.green }}
                              >
                                <R.AlertTriangle size={12} /> ⚠️ Alış fiyatı %{Math.abs(uyari.degisimYuzde).toFixed(1)}{" "}
                                {uyari.degisimYuzde > 0 ? "arttı" : "azaldı"}. Satış fiyatını kontrol edin. Mevcut satış: {R.tl(uyari.satisFiyati)}
                                {uyari.yeniKarOrani !== null && ` · Yeni maliyete göre kâr oranı: %${uyari.yeniKarOrani.toFixed(1)}`}
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

        {/* Geçmiş faturalar */}
        <R.Kart className="p-4">
          <button onClick={() => setGecmisAcik((v) => !v)} className="w-full flex items-center justify-between">
            <span className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
              <R.History size={15} /> Geçmiş Faturalar
            </span>
            <span className="text-xs" style={{ color: R.T.ink500 }}>
              {db.malAlimlari.length} kayıt
            </span>
          </button>
          {gecmisAcik && (
            <div className="flex flex-col gap-1.5 mt-3">
              {sonFaturalar.length === 0 ? (
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Henüz mal alış faturası yok.
                </p>
              ) : (
                sonFaturalar.map((m) => {
                  const kalanBorc = (m.faturaGirilenToplam ?? m.hesaplananGenelToplam) - (m.odenenTutar || 0);
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm" style={{ background: R.T.steel100 }}>
                      <div className="min-w-0">
                        <div style={{ color: R.T.ink900 }}>
                          {m.tedarikci} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {m.faturaNo}</span>
                        </div>
                        <div className="text-xs" style={{ color: R.T.ink500 }}>
                          {R.tarihGoster(m.faturaTarihi)} · {m.kalemler.length} kalem ·{" "}
                          <R.Rozet tone={m.odemeDurumu === "Ödendi" ? "green" : m.odemeDurumu === "Kısmi" ? "yellow" : "red"}>{m.odemeDurumu}</R.Rozet>
                          {kalanBorc > 0 && ` · Kalan borç: ${R.tl(kalanBorc)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold" style={R.MONO}>
                          {R.tl(m.faturaGirilenToplam ?? m.hesaplananGenelToplam)}
                        </span>
                        {m.degisiklikGecmisi?.length > 0 && (
                          <button onClick={() => setDegisiklikGecmisAcikId(m.id)} title="Değişiklik geçmişi" style={{ color: R.T.ink500 }}>
                            <R.ListOrdered size={14} />
                          </button>
                        )}
                        <button onClick={() => duzenlemeyeAc(m)} title="Başlık/ödeme bilgilerini düzenle" style={{ color: R.T.ink500 }}>
                          <R.Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </R.Kart>
      </div>

      {/* Sağ: fatura başlığı, ödeme, toplamlar */}
      <div className="flex flex-col gap-4">
        <R.Kart className="p-4 flex flex-col gap-3">
          <R.Girdi label="İşlemi Yapan" value={islemiYapan} readOnly placeholder="ör. Emirhan" />
          <R.Girdi
            label="Tedarikçi *"
            value={form.tedarikci}
            onChange={(e) => setForm({ ...form, tedarikci: e.target.value })}
            placeholder="ör. Eryaz Otomotiv"
          />
          <R.Girdi
            label="Fatura / İrsaliye No *"
            value={form.faturaNo}
            onChange={(e) => setForm({ ...form, faturaNo: e.target.value })}
            placeholder="ör. AL-1254"
          />
          <div className="grid grid-cols-2 gap-2">
            <R.Girdi
              label="Fatura Tarihi"
              type="date"
              value={form.faturaTarihi}
              onChange={(e) => setForm({ ...form, faturaTarihi: e.target.value })}
            />
            <R.Girdi label="Vade Tarihi" type="date" value={form.vadeTarihi} onChange={(e) => setForm({ ...form, vadeTarihi: e.target.value })} />
          </div>
          <R.Secim label="Ödeme Durumu" value={form.odemeDurumu} onChange={(e) => setForm({ ...form, odemeDurumu: e.target.value })}>
            {R.ALIS_ODEME_DURUMLARI.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </R.Secim>
          {form.odemeDurumu !== "Ödenmedi" && (
            <>
              <R.Secim label="Ödeme Yöntemi" value={form.odemeYontemi || "Nakit"} onChange={(e) => setForm({ ...form, odemeYontemi: e.target.value })}>
                {R.ODEME_YONTEMLERI.filter((x) => x !== "Açık Hesap").map((y) => <option key={y}>{y}</option>)}
              </R.Secim>
              <R.Secim label="Ödeme Çıkışı — Kasa / Banka *" value={form.odemeHesapId || ""} onChange={(e) => setForm({ ...form, odemeHesapId: e.target.value })}>
                <option value="">Kasa / banka seçin…</option>
                {db.hesaplar.filter((h) => h.aktif !== false).map((h) => (
                  <option key={h.id} value={h.id}>{h.ad} — {R.tl(h.bakiye || 0)}</option>
                ))}
              </R.Secim>
            </>
          )}
          {form.odemeDurumu === "Kısmi" && (
            <R.Girdi
              label="Ödenen Tutar"
              type="number"
              value={form.odenenTutar}
              onChange={(e) => setForm({ ...form, odenenTutar: e.target.value })}
              placeholder="0.00"
            />
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium" style={{ color: R.T.ink500 }}>
              Açıklama
            </span>
            <textarea
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              rows={2}
              className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
            />
          </label>
        </R.Kart>

        <R.Kart className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: R.T.ink500 }}>Mal Toplamı (KDV Hariç)</span>
            <span style={R.MONO}>{R.tl(malToplami)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: R.T.ink500 }}>KDV</span>
            <span style={R.MONO}>{R.tl(kdvToplami)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
            <span className="font-semibold" style={{ color: R.T.ink900 }}>
              Hesaplanan Fatura Toplamı
            </span>
            <span className="text-lg font-semibold" style={R.MONO}>
              {R.tl(hesaplananGenelToplam)}
            </span>
          </div>
          <R.Girdi
            label="Faturadaki Genel Toplam (kontrol için)"
            type="number"
            value={form.faturaGirilenToplam}
            onChange={(e) => setForm({ ...form, faturaGirilenToplam: e.target.value })}
            placeholder="Faturada yazan tutarı girin"
          />
          {fark !== null && Math.abs(fark) > 0.01 && (
            <p className="text-xs font-semibold px-2.5 py-2 rounded-md inline-flex items-center gap-1.5" style={{ background: "#F9DEDE", color: R.T.red }}>
              <R.AlertTriangle size={12} className="inline mr-1" />⚠️ Fatura ile {R.tl(Math.abs(fark))} fark var.
            </p>
          )}
          <R.Buton onClick={kaydet} disabled={kalemler.length === 0}>
            <R.Check size={16} /> {duzenlenenId ? "Değişiklikleri Kaydet" : "Faturayı Kaydet"}
          </R.Buton>
        </R.Kart>
      </div>

      {/* Değişiklik geçmişi modalı */}
      {degisiklikGecmisiParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDegisiklikGecmisAcikId(null)}
        >
          <div className="w-full max-w-md rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Değişiklik Geçmişi — {degisiklikGecmisiParca.faturaNo}
              </h3>
              <button onClick={() => setDegisiklikGecmisAcikId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {(degisiklikGecmisiParca.degisiklikGecmisi || []).map((d) => (
                <div key={d.id} className="px-2.5 py-2 rounded-md text-sm" style={{ background: R.T.steel100 }}>
                  <div className="text-xs mb-0.5" style={{ color: R.T.ink500 }}>
                    {new Date(d.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {d.kullanici || "—"}
                  </div>
                  <div style={{ color: R.T.ink900 }}>{d.ozet}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Maliyet Değiştiğinde Uyarı (55. adım, 5. madde) */}
    {maliyetUyarilari.length > 0 && (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setMaliyetUyarilari([])}>
        <div className="w-full max-w-md rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5" style={{ color: R.T.red }}>
            <R.AlertTriangle size={16} /> Kâr Marjı Düşük — Fiyat Güncellemeyi Değerlendirin
          </h3>
          <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
            Bu faturadaki maliyet artışı, aşağıdaki ürünlerin mevcut satış fiyatıyla kâr marjını %{R.DUSUK_KAR_ESIGI_YUZDE} eşiğinin altına düşürdü.
          </p>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {maliyetUyarilari.map((u) => (
              <div key={u.parca.id} className="p-2.5 rounded-md" style={{ background: "#F9DEDE" }}>
                <div className="text-sm font-semibold" style={{ color: R.T.ink900 }}>
                  🔴 {u.parca.ad}
                </div>
                <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                  Eski maliyet: {R.tl(u.eskiMaliyet)} → Yeni maliyet: <strong>{R.tl(u.yeniMaliyet)}</strong>
                </div>
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  Mevcut satış: {R.tl(u.satisFiyati)} — Kâr marjı: <strong style={{ color: R.T.red }}>%{u.karMarji}</strong>
                </div>
              </div>
            ))}
          </div>
          <R.Buton onClick={() => setMaliyetUyarilari([])} className="mt-3">
            Anladım
          </R.Buton>
        </div>
      </div>
    )}
    </>
  );
}
