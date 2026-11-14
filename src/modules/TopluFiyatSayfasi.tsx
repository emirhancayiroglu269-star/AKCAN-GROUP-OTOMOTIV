/* Stok — toplu fiyat güncelleme ekranı (Stok.tsx'ten bölündü). */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

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
  const markalar = [...new Set<string>(aktifParcalar.map((p) => p.marka).filter(Boolean) as string[])].sort();
  const kategoriler = [...new Set<string>(aktifParcalar.map((p) => p.kategori).filter(Boolean) as string[])].sort();
  const tedarikciler = [...new Set<string>(aktifParcalar.map((p) => p.tedarikci).filter(Boolean) as string[])].sort();

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
