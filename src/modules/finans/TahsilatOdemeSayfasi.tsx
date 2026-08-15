/* Extracted from Finans.tsx — kept intentionally self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function TahsilatOdemeSayfasi({ db, updateDb, aktifKullanici }) {
  const [yon, setYon] = R.useState("tahsilat"); // "tahsilat" | "odeme"
  const [tarafArama, setTarafArama] = R.useState("");
  const [tarafAramaAcik, setTarafAramaAcik] = R.useState(false);
  const [seciliTarafId, setSeciliTarafId] = R.useState(null);
  const [odemeSatirlari, setOdemeSatirlari] = R.useState([{ id: "od1", yontem: "Nakit", hesapId: "", tutar: "" }]);
  const [aciklama, setAciklama] = R.useState("");
  const [belgeNo, setBelgeNo] = R.useState("");
  const [islemiYapan, setIslemiYapan] = R.useIslemYapan(aktifKullanici);
  const [faturaTahsisleri, setFaturaTahsisleri] = R.useState({}); // { faturaId: tutar }
  const [gecmisAcik, setGecmisAcik] = R.useState(true);
  const [iptalIslem, setIptalIslem] = R.useState(null);
  const [iptalNedeni, setIptalNedeni] = R.useState("");
  const [sonMakbuz, setSonMakbuz] = R.useState(null);
  const kayitKilidi = R.useRef(false);

  const aktifHesaplar = db.hesaplar.filter((h) => h.aktif !== false);
  const varsayilanHesapId = aktifHesaplar.length === 1 ? aktifHesaplar[0].id : "";

  const kaynakListesi = yon === "tahsilat" ? db.cariler : db.tedarikciler;
  const tarafAramaSonuclari =
    !seciliTarafId && tarafArama.trim()
      ? kaynakListesi
          .filter((t) => t.aktif !== false && (t.ad.toLowerCase().includes(tarafArama.toLowerCase()) || (t.telefon || "").replace(/\D/g, "").includes(tarafArama.replace(/\D/g, ""))))
          .filter((t) => yon === "tahsilat" || R.tedarikciCariBakiyesiHesapla(t) > 0.01)
          .slice(0, 8)
      : [];
  R.useEffect(() => {
    if (aktifHesaplar.length !== 1) return;
    const onlyId = aktifHesaplar[0].id;
    setOdemeSatirlari((prev) => prev.map((o) => (o.hesapId ? o : { ...o, hesapId: onlyId })));
  }, [aktifHesaplar.length, aktifHesaplar[0]?.id]);

  const seciliTaraf = seciliTarafId ? kaynakListesi.find((t) => t.id === seciliTarafId) : null;
  const seciliTarafCariBakiyesi = yon === "odeme" ? R.tedarikciCariBakiyesiHesapla(seciliTaraf) : (seciliTaraf?.bakiye || 0);

  const acikFaturalar =
    yon === "tahsilat"
      ? seciliTaraf
        ? db.satislar
            .filter((s) => s.durum !== "İptal Edildi" && (s.musteriId ? s.musteriId === seciliTaraf.id : s.musteriAdi.toLowerCase() === seciliTaraf.ad.toLowerCase()))
            .map((s) => ({ id: s.id, belgeNo: s.id.slice(-6).toUpperCase(), tarih: s.tarih, tutar: s.genelToplam, kalan: R.satisAcikHesapKalan(s) }))
            .filter((f) => f.kalan > 0.01)
            .sort((a, b) => new Date(a.tarih) - new Date(b.tarih))
        : []
      : seciliTaraf
      ? R.tedarikciAcikFaturalari(db, seciliTaraf.ad)
          .map((m) => ({ id: m.id, belgeNo: m.faturaNo, tarih: m.faturaTarihi, tutar: m.faturaGirilenToplam ?? m.hesaplananGenelToplam, kalan: m.kalanBorc }))
          .sort((a, b) => new Date(a.tarih) - new Date(b.tarih))
      : [];

  const tutarToplami = odemeSatirlari.reduce((t, o) => t + (parseFloat(o.tutar) || 0), 0);
  const tahsisToplami = Object.values(faturaTahsisleri).reduce((t, v) => t + (parseFloat(v) || 0), 0);
  const dagitilmamisTutar = Math.round((tutarToplami - tahsisToplami) * 100) / 100;

  const odemeSatiriEkle = () => setOdemeSatirlari((prev) => [...prev, { id: R.yeniId("od"), yontem: "Nakit", hesapId: varsayilanHesapId, tutar: "" }]);
  const odemeSatiriSil = (id) => setOdemeSatirlari((prev) => prev.filter((o) => o.id !== id));
  const odemeSatiriGuncelle = (id, alan, deger) => setOdemeSatirlari((prev) => prev.map((o) => (o.id === id ? { ...o, [alan]: deger } : o)));

  const otomatikDagit = () => {
    let kalan = tutarToplami;
    const yeni = {};
    for (const f of acikFaturalar) {
      if (kalan <= 0.01) break;
      const pay = Math.min(f.kalan, kalan);
      yeni[f.id] = Math.round(pay * 100) / 100;
      kalan -= pay;
    }
    setFaturaTahsisleri(yeni);
  };

  const formuTemizle = () => {
    setTarafArama("");
    setSeciliTarafId(null);
    setOdemeSatirlari([{ id: R.yeniId("od"), yontem: "Nakit", hesapId: varsayilanHesapId, tutar: "" }]);
    setAciklama("");
    setBelgeNo("");
    setFaturaTahsisleri({});
  };

  const kaydet = () => {
    const gerekliYetki = yon === "tahsilat" ? "tahsilatGirebilir" : "kasaCikisiYapabilir";
    if (!R.yetkiVarMi(db, aktifKullanici, gerekliYetki)) {
      R.bildirimGoster("Bu işlem için yetkiniz yok.", "hata");
      return;
    }
    if (kayitKilidi.current) return;
    kayitKilidi.current = true;

    if (!seciliTaraf) {
      kayitKilidi.current = false;
      R.bildirimGoster(`${yon === "tahsilat" ? "Müşteri" : "Tedarikçi"} seçmelisiniz.`, "hata");
      return;
    }

    const aktifOdemeSatirlari = odemeSatirlari
      .filter((o) => parseFloat(o.tutar) > 0)
      .map((o) => ({ yontem: o.yontem, hesapId: o.hesapId, tutar: parseFloat(o.tutar) || 0 }));
    const tutar = Math.round(aktifOdemeSatirlari.reduce((t, o) => t + o.tutar, 0) * 100) / 100;
    const tahsisler = Object.entries(faturaTahsisleri)
      .map(([faturaId, tutar]) => ({ faturaId, tutar: parseFloat(tutar) || 0 }))
      .filter((t) => t.tutar > 0);

    if (aktifOdemeSatirlari.some((o) => !o.hesapId)) {
      R.bildirimGoster("Her ödeme/tahsilat satırı için kasa veya banka hesabı seçmelisiniz.", "hata");
      kayitKilidi.current = false;
      return;
    }

    const finansGirdisi = {
      yon,
      tarafId: seciliTaraf.id,
      tarafAdi: seciliTaraf.ad,
      tutar,
      hesapSatirlari: aktifOdemeSatirlari,
      aciklama: aciklama.trim(),
      belgeNo: belgeNo.trim(),
      kullanici: islemiYapan.trim(),
      faturaTahsisleri: tahsisler,
    };

    const kontrol = R.finansIslemDogrula(db, finansGirdisi);
    if (!kontrol.gecerli) {
      R.bildirimGoster(kontrol.hatalar[0] || "Finans işlemi doğrulanamadı.", "hata");
      kayitKilidi.current = false;
      return;
    }

    const islemId = R.yeniId("ki");
    let kaydedilenIslem = null;

    updateDb((prev) => {
      const sonuc = R.finansIslemiUygula(prev, finansGirdisi, islemId);
      if (!sonuc) return prev;
      kaydedilenIslem = sonuc.islem;
      return sonuc.db;
    });

    // updateDb senkron hesaplayıcı olduğu için işlem nesnesi burada hazırdır.
    if (!kaydedilenIslem) {
      R.bildirimGoster("Finans işlemi kaydedilemedi. Kayıt değişmeden bırakıldı.", "hata");
      kayitKilidi.current = false;
      return;
    }

    R.sonKullaniciAdiKaydet(islemiYapan);
    R.bildirimGoster(`${yon === "tahsilat" ? "Tahsilat" : "Ödeme"} kaydedildi.`, "basari");
    setSonMakbuz(kaydedilenIslem);
    formuTemizle();
    kayitKilidi.current = false;
  };

  // --- İptal ---------------------------------------------------------------
  // Kayıt SİLİNMEZ — durum "İptal Edildi" olarak işaretlenir, ters yönlü bir
  // hareket ile bakiye eski haline getirilir (denetim izi kaybolmaz), ve
  // varsa fatura tahsisleri geri alınır.
  const iptalOnayla = () => {
    if (!iptalNedeni.trim()) {
      R.bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    const islem = iptalIslem;
    if (!islem || islem.durum === "İptal Edildi") {
      R.bildirimGoster("Bu işlem zaten iptal edilmiş veya bulunamıyor.", "hata");
      return;
    }

    updateDb((prev) => {
      const sonuc = R.finansIslemiIptalEt(
        prev,
        islem.id,
        iptalNedeni.trim(),
        islemiYapan.trim()
      );
      if (!sonuc) return prev;
      return sonuc.db;
    });

    R.bildirimGoster("İşlem iptal edildi; ters hareket oluşturuldu.", "basari");
    setIptalIslem(null);
    setIptalNedeni("");
  };

  // --- Makbuz yazdırma ------------------------------------------------------
  const makbuzYazdir = (k) => {
    const pencere = window.open("", "_blank", "width=380,height=600");
    if (!pencere) {
      R.bildirimGoster("Yazdırma penceresi açılamadı — pop-up engelleyiciyi kontrol edin.", "hata");
      return;
    }
    const odemelerHtml = k.odemeSatirlari
      .map((o) => {
        const hesap = db.hesaplar.find((h) => h.id === o.hesapId);
        return `<div style="display:flex;justify-content:space-between;"><span>${o.yontem}${hesap ? ` (${hesap.ad})` : ""}</span><span>${R.tl(o.tutar)}</span></div>`;
      })
      .join("");
    pencere.document.write(`
      <html>
        <head>
          <title>${k.yon === "tahsilat" ? "Tahsilat" : "Ödeme"} Makbuzu — ${k.tarafAdi}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 16px; font-size: 13px; color: #14171A; }
            h2 { margin: 0 0 2px 0; font-size: 16px; }
            .alt { color: #5B6470; font-size: 11px; margin-bottom: 10px; }
            .cizgi { border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
            .satir { display:flex; justify-content:space-between; }
            .toplam { font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <h2>AKCAN GROUP OTOMOTİV</h2>
          <div class="alt">${k.yon === "tahsilat" ? "TAHSİLAT MAKBUZU" : "ÖDEME MAKBUZU"} — ${R.tarihGoster(k.tarih)}</div>
          <div class="satir"><span>${k.yon === "tahsilat" ? "Müşteri" : "Tedarikçi"}</span><span>${k.tarafAdi}</span></div>
          ${k.belgeNo ? `<div class="satir"><span>Belge No</span><span>${k.belgeNo}</span></div>` : ""}
          <div class="cizgi">${odemelerHtml}</div>
          <div class="cizgi satir toplam"><span>TOPLAM</span><span>${R.tl(k.tutar)}</span></div>
          ${k.aciklama ? `<div class="cizgi alt">Açıklama: ${k.aciklama}</div>` : ""}
          <div class="alt" style="margin-top:14px;">İşlemi Yapan: ${k.islemiYapan || "—"}</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    pencere.document.close();
  };

  const sonIslemler = db.kasaIslemleri.slice(0, 15);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Yön seçimi */}
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
          {[
            { id: "tahsilat", ad: "Müşteri Tahsilatı", ikon: R.ArrowDownCircle },
            { id: "odeme", ad: "Tedarikçi Ödemesi", ikon: R.ArrowUpCircle },
          ].map((y) => {
            const Ikon = y.ikon;
            return (
              <button
                key={y.id}
                onClick={() => {
                  setYon(y.id);
                  formuTemizle();
                }}
                className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                style={{ background: yon === y.id ? R.T.graphite900 : "#fff", color: yon === y.id ? "#fff" : R.T.ink500 }}
              >
                <Ikon size={15} /> {y.ad}
              </button>
            );
          })}
        </div>

        {/* Taraf seçimi */}
        <R.Kart className="p-4 flex flex-col gap-3">
          <div className="relative">
            <R.Girdi
              label={yon === "tahsilat" ? "Müşteri — ad veya telefon" : "Tedarikçi"}
              value={seciliTaraf ? seciliTaraf.ad : tarafArama}
              onChange={(e) => {
                setTarafArama(e.target.value);
                setSeciliTarafId(null);
                setTarafAramaAcik(true);
              }}
              onFocus={() => setTarafAramaAcik(true)}
              onBlur={() => setTimeout(() => setTarafAramaAcik(false), 150)}
              placeholder={yon === "tahsilat" ? "Ara…" : "Tedarikçi ara…"}
            />
            {tarafAramaAcik && tarafAramaSonuclari.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-56 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                {tarafAramaSonuclari.map((t) => (
                  <button
                    key={t.id}
                    onMouseDown={() => {
                      setSeciliTarafId(t.id);
                      setTarafArama("");
                      setTarafAramaAcik(false);
                      setFaturaTahsisleri({});
                    }}
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-gray-50"
                    style={{ color: R.T.ink900 }}
                  >
                    <span>
                      {t.ad} {t.telefon && <span style={{ ...R.MONO, color: R.T.ink500 }}>· {t.telefon}</span>}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: (yon === "odeme" ? R.tedarikciCariBakiyesiHesapla(t) : (t.bakiye || 0)) > 0 ? R.T.red : R.T.green }}>
                      {R.tl(yon === "odeme" ? R.tedarikciCariBakiyesiHesapla(t) : (t.bakiye || 0))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {seciliTaraf && (
            <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
              Güncel bakiye: <strong style={{ color: seciliTarafCariBakiyesi > 0 ? R.T.red : R.T.green }}>{R.tl(seciliTarafCariBakiyesi)}</strong>
            </p>
          )}
        </R.Kart>

        {/* Açık faturalar / tahsis */}
        {seciliTaraf && acikFaturalar.length > 0 && (
          <R.Kart className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Açık {yon === "tahsilat" ? "Satışlar" : "Faturalar"} — Tahsis
              </h4>
              <button onClick={otomatikDagit} className="text-xs font-semibold underline" style={{ color: R.T.orangeDark }}>
                Otomatik Dağıt
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {acikFaturalar.map((f) => {
                const tahsis = parseFloat(faturaTahsisleri[f.id]) || 0;
                const kapaniyor = tahsis >= f.kalan - 0.01 && tahsis > 0;
                return (
                  <div key={f.id} className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm" style={{ background: R.T.steel100 }}>
                    <div className="min-w-0 flex-1">
                      <div style={{ color: R.T.ink900 }}>
                        {f.belgeNo} <span style={{ color: R.T.ink500 }}>· {R.tarihGoster(f.tarih)}</span>
                      </div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        Toplam {R.tl(f.tutar)} · Kalan {R.tl(f.kalan)}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={faturaTahsisleri[f.id] || ""}
                      onChange={(e) => setFaturaTahsisleri((prev) => ({ ...prev, [f.id]: e.target.value }))}
                      placeholder="0.00"
                      className="w-24 px-2 py-1.5 rounded border text-sm text-right outline-none shrink-0"
                      style={{ borderColor: R.T.steel300, ...R.MONO }}
                    />
                    {kapaniyor ? <R.Rozet tone="green">Kapandı ✓</R.Rozet> : tahsis > 0 && <R.Rozet tone="yellow">Kısmi</R.Rozet>}
                  </div>
                );
              })}
            </div>
            {dagitilmamisTutar > 0.01 && (
              <p className="text-xs mt-2" style={{ color: R.T.ink500 }}>
                {R.tl(dagitilmamisTutar)} tutarı faturaya bağlanmadı — genel bakiyeye tahsilat/ödeme olarak işlenecek.
              </p>
            )}
          </R.Kart>
        )}

        {/* Geçmiş işlemler */}
        <R.Kart className="p-4">
          <button onClick={() => setGecmisAcik((v) => !v)} className="w-full flex items-center justify-between">
            <span className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
              <R.History size={15} /> Son İşlemler
            </span>
            <span className="text-xs" style={{ color: R.T.ink500 }}>
              {db.kasaIslemleri.length} kayıt
            </span>
          </button>
          {gecmisAcik && (
            <div className="flex flex-col gap-1.5 mt-3">
              {sonIslemler.length === 0 ? (
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Henüz tahsilat/ödeme yok.
                </p>
              ) : (
                sonIslemler.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm" style={{ background: R.T.steel100, opacity: k.durum === "İptal Edildi" ? 0.5 : 1 }}>
                    <div className="min-w-0">
                      <div style={{ color: R.T.ink900 }}>
                        {k.yon === "tahsilat" ? "Tahsilat" : "Ödeme"} — {k.tarafAdi} {k.durum === "İptal Edildi" && <R.Rozet tone="red">İptal</R.Rozet>}
                      </div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        {R.tarihGoster(k.tarih)} · {k.odemeSatirlari.map((o) => o.yontem).join(" + ")}
                        {k.iptalNedeni && ` · İptal nedeni: ${k.iptalNedeni}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold" style={{ ...R.MONO, color: k.yon === "tahsilat" ? R.T.green : R.T.red }}>
                        {R.tl(k.tutar)}
                      </span>
                      <button onClick={() => makbuzYazdir(k)} title="Makbuz Yazdır" style={{ color: R.T.ink500 }}>
                        <R.Printer size={14} />
                      </button>
                      {k.durum !== "İptal Edildi" && (
                        <button onClick={() => setIptalIslem(k)} title="İptal Et" style={{ color: R.T.red }}>
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

      {/* Sağ: tutar/ödeme yöntemi + kaydet */}
      <div className="flex flex-col gap-4">
        <R.Kart className="p-4 flex flex-col gap-3">
          <R.Girdi label="İşlemi Yapan" value={islemiYapan} readOnly placeholder="ör. Emirhan" />
          <R.Girdi label="Belge / Makbuz No (opsiyonel)" value={belgeNo} onChange={(e) => setBelgeNo(e.target.value)} placeholder="ör. MK-0231" />
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
              Tutar / Ödeme Yöntemi
            </span>
            <button onClick={odemeSatiriEkle} className="text-xs font-semibold" style={{ color: R.T.orange }}>
              + Bölünmüş Ekle
            </button>
          </div>
          {odemeSatirlari.map((o) => (
            <div key={o.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <select
                  value={o.yontem}
                  onChange={(e) => odemeSatiriGuncelle(o.id, "yontem", e.target.value)}
                  className="px-2 py-2 rounded-md border text-xs outline-none bg-white flex-1"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {R.KASA_ODEME_YONTEMLERI.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={o.tutar}
                  onChange={(e) => odemeSatiriGuncelle(o.id, "tutar", e.target.value)}
                  placeholder="0.00"
                  className="w-24 px-2 py-2 rounded-md border text-sm text-right outline-none"
                  style={{ borderColor: R.T.steel300, ...R.MONO }}
                />
                {odemeSatirlari.length > 1 && (
                  <button onClick={() => odemeSatiriSil(o.id)} style={{ color: R.T.red }}>
                    <R.X size={15} />
                  </button>
                )}
              </div>
              <select
                value={o.hesapId}
                onChange={(e) => odemeSatiriGuncelle(o.id, "hesapId", e.target.value)}
                className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
              >
                <option value="">{yon === "odeme" ? "Ödeme çıkışı — kasa / banka seçin *" : "Tahsilat girişi — kasa / banka seçin"}</option>
                {db.hesaplar.filter((h) => h.aktif !== false).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.ad} — {R.tl(h.bakiye || 0)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
            <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
              Toplam
            </span>
            <span className="text-lg font-semibold" style={R.MONO}>
              {R.tl(tutarToplami)}
            </span>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium" style={{ color: R.T.ink500 }}>
              Açıklama
            </span>
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={2}
              className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
            />
          </label>
          <R.Buton onClick={kaydet} disabled={!seciliTaraf || tutarToplami <= 0}>
            <R.Check size={16} /> {yon === "tahsilat" ? "Tahsilatı Kaydet" : "Ödemeyi Kaydet"}
          </R.Buton>
        </R.Kart>
      </div>

      {/* Kaydedilen makbuz sonrası */}
      {sonMakbuz && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSonMakbuz(null)}>
          <div className="w-full max-w-sm rounded-lg p-5 text-center" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#DEF0DF" }}>
              <R.Check size={22} style={{ color: R.T.green }} />
            </div>
            <h3 className="font-semibold text-base mb-1" style={{ color: R.T.ink900 }}>
              {sonMakbuz.yon === "tahsilat" ? "Tahsilat" : "Ödeme"} Kaydedildi
            </h3>
            <p className="text-lg font-semibold mb-4" style={R.MONO}>
              {R.tl(sonMakbuz.tutar)}
            </p>
            <div className="flex flex-col gap-2">
              <R.Buton onClick={() => makbuzYazdir(sonMakbuz)}>
                <R.Printer size={15} /> Makbuz Yazdır / PDF
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setSonMakbuz(null)}>
                Kapat
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* İptal modalı */}
      {iptalIslem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setIptalIslem(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              İşlemi İptal Et
            </h3>
            <p className="text-sm mb-3" style={{ color: R.T.ink500 }}>
              <strong>{R.tl(iptalIslem.tutar)}</strong> tutarındaki {iptalIslem.yon === "tahsilat" ? "tahsilat" : "ödeme"} ({iptalIslem.tarafAdi}) iptal edilecek. Kayıt
              silinmez, ters yönlü bir hareketle bakiye düzeltilir ve iptal nedeni saklanır.
            </p>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: R.T.ink500 }}>
                İptal Nedeni *
              </span>
              <textarea
                value={iptalNedeni}
                onChange={(e) => setIptalNedeni(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                placeholder="ör. Yanlış müşteriye işlendi"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={iptalOnayla}>
                <R.RotateCcw size={14} /> İptal Et
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setIptalIslem(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
