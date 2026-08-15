/* Extracted from Satis.tsx — public component kept self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function MusteriSiparisiSayfasi({ db, updateDb, aktifKullanici, baslangicUrun }) {
  const [formAcik, setFormAcik] = R.useState(!!baslangicUrun);
  const [form, setForm] = R.useState(R.bosMusteriSiparisForm);
  const [parcaArama, setParcaArama] = R.useState("");
  const [parcaAramaAcik, setParcaAramaAcik] = R.useState(false);
  const [seciliParca, setSeciliParca] = R.useState(null);
  const [alanPersonel, setAlanPersonel] = R.useIslemYapan(aktifKullanici);
  const [durumFiltre, setDurumFiltre] = R.useState("tumu");

  const [durumDegistirHedef, setDurumDegistirHedef] = R.useState(null);
  const [gelenAdetMetin, setGelenAdetMetin] = R.useState("");

  const [teslimHedef, setTeslimHedef] = R.useState(null);
  const [teslimOdemeYontemi, setTeslimOdemeYontemi] = R.useState("Nakit");
  const [teslimHesapId, setTeslimHesapId] = R.useState("");

  const [iptalHedef, setIptalHedef] = R.useState(null);
  const [iptalNedeniMetin, setIptalNedeniMetin] = R.useState("");

  R.useEffect(() => {
    if (baslangicUrun) {
      const p = db.parcalar.find((x) => x.id === baslangicUrun);
      if (p) {
        setSeciliParca(p);
        setForm((f) => ({ ...f, parcaId: p.id, siparisFiyati: String(p.satisFiyati || 0) }));
        setFormAcik(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baslangicUrun]);

  const parcaAramaSonuclari = parcaArama.trim() ? R.hizliAramaYap(db, parcaArama).slice(0, 8) : [];

  const formuAc = () => {
    setForm(R.bosMusteriSiparisForm);
    setSeciliParca(null);
    setParcaArama("");
    setFormAcik(true);
  };
  const parcaSec = (p) => {
    setSeciliParca(p);
    setForm((f) => ({ ...f, parcaId: p.id, siparisFiyati: String(p.satisFiyati || 0) }));
    setParcaArama("");
    setParcaAramaAcik(false);
  };

  const kaydet = () => {
    if (!form.musteriAdi.trim()) {
      R.bildirimGoster("Müşteri adı zorunludur.", "hata");
      return;
    }
    if (!seciliParca) {
      R.bildirimGoster("Ürün seçin.", "hata");
      return;
    }
    const adet = parseFloat(form.adet);
    if (!adet || adet <= 0) {
      R.bildirimGoster("Geçerli bir adet girin.", "hata");
      return;
    }
    const siparis = {
      id: R.yeniId("ms"),
      musteriAdi: form.musteriAdi.trim(),
      musteriTelefon: form.musteriTelefon.trim(),
      parcaId: seciliParca.id,
      adet,
      siparisFiyati: parseFloat(form.siparisFiyati) || seciliParca.satisFiyati,
      siparisTarihi: form.siparisTarihi,
      tahminiGelisTarihi: form.tahminiGelisTarihi,
      tedarikci: form.tedarikci.trim(),
      not: form.not.trim(),
      siparisiAlanPersonel: aktifKullanici?.adSoyad || alanPersonel.trim(),
      durum: "Bekliyor",
      teslimTarihi: null,
      iptalNedeni: "",
      donusturulenSatisId: null,
    };
    updateDb((prev) =>
      R.islemKaydet(
        { ...prev, musteriSiparisleri: [siparis, ...prev.musteriSiparisleri] },
        {
          kullaniciAdi: siparis.siparisiAlanPersonel,
          islemTuru: "Müşteri siparişi oluşturuldu",
          aciklama: `${seciliParca.ad} — ${form.musteriAdi.trim()}`,
          eskiDeger: "—",
          yeniDeger: `${adet} ${seciliParca.birim} @ ${R.tl(siparis.siparisFiyati)}`,
        }
      )
    );
    R.sonKullaniciAdiKaydet(alanPersonel);
    R.bildirimGoster("Müşteri siparişi oluşturuldu.", "basari");
    setFormAcik(false);
  };

  const durumIlerlet = (siparis, yeniDurum) => {
    if (yeniDurum === "Ürün Geldi") {
      setDurumDegistirHedef(siparis);
      setGelenAdetMetin(String(siparis.adet));
      return;
    }
    updateDb((prev) => ({ ...prev, musteriSiparisleri: prev.musteriSiparisleri.map((s) => (s.id === siparis.id ? { ...s, durum: yeniDurum } : s)) }));
    R.bildirimGoster(`Durum "${yeniDurum}" olarak güncellendi.`, "basari");
  };

  const urunGeldiOnayla = () => {
    const s = durumDegistirHedef;
    const parca = db.parcalar.find((p) => p.id === s.parcaId);
    const gelenAdet = parseFloat(gelenAdetMetin) || s.adet;
    if (parca && parca.stok < gelenAdet) {
      R.bildirimGoster(`⚠️ Uyarı: Fiziksel stok (${parca.stok}) bu siparişin adedinden (${gelenAdet}) az görünüyor — önce Mal Kabul/Stok Girişi yapıldığından emin olun. Yine de "Ürün Geldi" olarak işaretlenecek.`, "hata");
    }
    updateDb((prev) => ({ ...prev, musteriSiparisleri: prev.musteriSiparisleri.map((x) => (x.id === s.id ? { ...x, durum: "Ürün Geldi" } : x)) }));
    R.bildirimGoster("Sipariş 'Ürün Geldi' olarak işaretlendi — bu adet artık satılabilir stoktan otomatik düşük görünecek.", "basari");
    setDurumDegistirHedef(null);
  };

  // --- Müşteriye Teslim Et (satışa dönüştür) -----------------------------------
  const teslimEdiliyorParca = teslimHedef ? db.parcalar.find((p) => p.id === teslimHedef.parcaId) : null;
  const teslimToplam = teslimHedef ? teslimHedef.siparisFiyati * teslimHedef.adet : 0;

  const teslimEt = () => {
    const s = teslimHedef;
    const parca = teslimEdiliyorParca;
    if (!parca) return;
    const belgeNoOnek = s.id.slice(-6).toUpperCase();
    const kdvHaric = teslimToplam / (1 + (parca.kdvOrani || 0) / 100);
    const kdvToplam = teslimToplam - kdvHaric;
    const satisId = R.yeniId("s");
    const satis = {
      id: satisId,
      tarih: R.zamanDamgasi(),
      musteriAdi: s.musteriAdi,
      musteriId: null,
      satisiYapan: aktifKullanici?.adSoyad || alanPersonel.trim(),
      belgeTuru: "Satış Fişi",
      kalemler: [
        {
          parcaId: parca.id,
          stokKodu: parca.stokKodu,
          ad: parca.ad,
          marka: parca.marka,
          birim: parca.birim,
          adet: s.adet,
          birimFiyat: s.siparisFiyati,
          iskontoTutari: 0,
          kdvOrani: parca.kdvOrani || 0,
          maliyet: R.gecerliMaliyet(parca, db),
          iadeEdilenAdet: 0,
        },
      ],
      genelIskontoTutari: 0,
      araToplam: teslimToplam,
      iskontoToplam: 0,
      kdvToplam: Math.round(kdvToplam * 100) / 100,
      genelToplam: Math.round(teslimToplam * 100) / 100,
      odemeler: [{ yontem: teslimOdemeYontemi, hesapId: teslimHesapId || null, tutar: Math.round(teslimToplam * 100) / 100 }],
      not: `Müşteri siparişinden teslim edildi (Sipariş #${belgeNoOnek})`,
      durum: "Tamamlandı",
      acikHesapOdenen: 0,
      eFatura: { durum: "Gönderilmedi", eFaturaNo: null },
    };

    let engellendi = false;
    updateDb((prev) => {
      const { belgeNo: uretilenNo, anahtar, siraSonraki } = R.yeniBelgeNumarasiUret(prev, "Satış Fişi");
      satis.belgeNo = uretilenNo;
      let sonuc = R.belgeSayaciGuncelle(prev, anahtar, siraSonraki);
      sonuc = R.stokHareketiUygula(sonuc, {
        parcaId: parca.id,
        tur: "Perakende Satış",
        cikis: s.adet,
        belgeNo: satis.belgeNo,
        kullanici: satis.satisiYapan,
        aciklama: `Müşteri siparişi teslimi — ${s.musteriAdi}`,
      });
      if (!sonuc) {
        engellendi = true;
        return prev;
      }
      if (teslimOdemeYontemi === "Açık Hesap") {
        sonuc = R.cariHareketiUygula(sonuc, { musteriId: null, musteriAdi: s.musteriAdi, tutar: satis.genelToplam, tur: "borç", aciklama: "Müşteri siparişi teslimi", belgeNo: satis.belgeNo, kaynakSatisId: satisId });
      } else if (teslimHesapId) {
        sonuc = R.hesapHareketiUygula(sonuc, {
          hesapId: teslimHesapId,
          tur: `Satış — ${teslimOdemeYontemi}`,
          giris: satis.genelToplam,
          belgeNo: satis.belgeNo,
          aciklama: `Müşteri siparişi teslimi (${s.musteriAdi})`,
          kullanici: satis.satisiYapan,
          kaynakId: satisId,
        });
      }
      sonuc = {
        ...sonuc,
        satislar: [satis, ...sonuc.satislar],
        musteriSiparisleri: sonuc.musteriSiparisleri.map((x) => (x.id === s.id ? { ...x, durum: "Müşteriye Teslim Edildi", teslimTarihi: R.zamanDamgasi(), donusturulenSatisId: satisId } : x)),
      };
      return R.islemKaydet(sonuc, {
        kullaniciAdi: satis.satisiYapan,
        islemTuru: "Müşteri siparişi teslim edildi",
        aciklama: `${parca.ad} — ${s.musteriAdi}`,
        eskiDeger: "Ürün Geldi",
        yeniDeger: `Satış #${satis.belgeNo} — ${R.tl(satis.genelToplam)}`,
      });
    });
    if (engellendi) {
      R.bildirimGoster("Teslim işlenemedi — stok işlenirken bir sorun oluştu.", "hata");
      return;
    }
    R.bildirimGoster("Müşteriye teslim edildi.", "basari");
    setTeslimHedef(null);
  };

  const iptalOnayla = () => {
    if (!iptalNedeniMetin.trim()) {
      R.bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    updateDb((prev) =>
      R.islemKaydet(
        { ...prev, musteriSiparisleri: prev.musteriSiparisleri.map((s) => (s.id === iptalHedef.id ? { ...s, durum: "İptal", iptalNedeni: iptalNedeniMetin.trim() } : s)) },
        { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: "Müşteri siparişi iptal edildi", aciklama: `${iptalHedef.musteriAdi} — ${iptalNedeniMetin.trim()}`, eskiDeger: iptalHedef.durum, yeniDeger: "İptal" }
      )
    );
    R.bildirimGoster("Sipariş iptal edildi.", "basari");
    setIptalHedef(null);
    setIptalNedeniMetin("");
  };

  const filtreliSiparisler = db.musteriSiparisleri
    .filter((s) => durumFiltre === "tumu" || s.durum === durumFiltre)
    .sort((a, b) => new Date(b.siparisTarihi) - new Date(a.siparisTarihi));

  return (
    <div className="flex flex-col gap-5">
      <div className="p-3 rounded-md text-xs" style={{ background: "#FDF1D6", color: "#8A6110" }}>
        <strong>Rezerv ≠ Müşteri Siparişi:</strong> Rezerv, ürün elinizde VARKEN müşteri için ayırmaktır (bkz. Rezervler
        sekmesi). Müşteri siparişi ise ürün elinizde YOKKEN veya yetersizken müşteri için tedarik etme sürecidir —
        bu iki yapı veritabanında bilinçli olarak ayrı tutulur.
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
          {["tumu", ...R.MUSTERI_SIPARIS_DURUMLARI].map((d) => (
            <button
              key={d}
              onClick={() => setDurumFiltre(d)}
              className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              style={{ background: durumFiltre === d ? R.T.graphite900 : "#fff", color: durumFiltre === d ? "#fff" : R.T.ink500 }}
            >
              {d === "tumu" ? "Tümü" : `${R.musteriSiparisDurumGorseli[d].emoji} ${d}`}
            </button>
          ))}
        </div>
        <R.Buton onClick={formuAc}>
          <R.Plus size={15} /> Yeni Müşteri Siparişi
        </R.Buton>
      </div>

      {filtreliSiparisler.length === 0 ? (
        <R.Kart>
          <R.Bos ikon={R.ClipboardList} baslik="Müşteri siparişi yok" aciklama="Stokta olmayan bir ürünü müşteri için tedarik etmek üzere kaydedin." />
        </R.Kart>
      ) : (
        <div className="flex flex-col gap-2">
          {filtreliSiparisler.map((s) => {
            const parca = db.parcalar.find((p) => p.id === s.parcaId);
            const durum = R.musteriSiparisDurumGorseli[s.durum];
            return (
              <R.Kart key={s.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                      {parca?.ad || "(Ürün silinmiş)"}
                    </span>
                    <R.Rozet tone={durum.ton}>
                      {durum.emoji} {s.durum}
                    </R.Rozet>
                  </div>
                  <div className="text-xs mt-0.5" style={{ ...R.MONO, color: R.T.ink500 }}>
                    {parca?.marka} · {parca?.stokKodu}
                    {parca && db.kodlar.some((k) => k.parcaId === parca.id && k.tip === "OEM") && (
                      <> · OEM: {db.kodlar.filter((k) => k.parcaId === parca.id && k.tip === "OEM").map((k) => k.kod).join(", ")}</>
                    )}
                  </div>
                  <div className="text-sm mt-1" style={{ color: R.T.ink900 }}>
                    {s.musteriAdi} {s.musteriTelefon && <span style={{ ...R.MONO, color: R.T.ink500 }}>· {s.musteriTelefon}</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                    {s.adet} {parca?.birim} @ {R.tl(s.siparisFiyati)} · Sipariş: {R.tarihGoster(s.siparisTarihi)}
                    {s.tahminiGelisTarihi && ` · Tahmini Geliş: ${R.tarihGoster(s.tahminiGelisTarihi)}`}
                    {s.tedarikci && ` · Tedarikçi: ${s.tedarikci}`}
                  </div>
                  {s.not && (
                    <div className="text-xs mt-1 italic" style={{ color: R.T.ink500 }}>
                      "{s.not}"
                    </div>
                  )}
                  <div className="text-xs mt-1" style={{ color: R.T.ink500 }}>
                    Siparişi alan: {s.siparisiAlanPersonel || "—"}
                    {s.iptalNedeni && ` · İptal nedeni: ${s.iptalNedeni}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.durum === "Bekliyor" && (
                    <button onClick={() => durumIlerlet(s, "Tedarikçiye Sipariş Verildi")} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      Sipariş Verildi
                    </button>
                  )}
                  {(s.durum === "Bekliyor" || s.durum === "Tedarikçiye Sipariş Verildi") && (
                    <R.Buton onClick={() => durumIlerlet(s, "Ürün Geldi")}>
                      <R.Package size={13} /> Ürün Geldi
                    </R.Buton>
                  )}
                  {s.durum === "Ürün Geldi" && (
                    <R.Buton
                      onClick={() => {
                        setTeslimHedef(s);
                        setTeslimOdemeYontemi("Nakit");
                        setTeslimHesapId("");
                      }}
                    >
                      <R.ShoppingCart size={13} /> Müşteriye Teslim Et
                    </R.Buton>
                  )}
                  {s.durum !== "İptal" && s.durum !== "Müşteriye Teslim Edildi" && (
                    <button onClick={() => setIptalHedef(s)} title="İptal Et" style={{ color: R.T.red }}>
                      <R.X size={15} />
                    </button>
                  )}
                </div>
              </R.Kart>
            );
          })}
        </div>
      )}

      {/* Yeni sipariş formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Yeni Müşteri Siparişi
            </h3>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Müşteri Adı *" value={form.musteriAdi} onChange={(e) => setForm({ ...form, musteriAdi: e.target.value })} />
                <R.Girdi label="Telefon" value={form.musteriTelefon} onChange={(e) => setForm({ ...form, musteriTelefon: e.target.value })} />
              </div>
              <div className="relative">
                <R.Girdi
                  label="Ürün *"
                  value={seciliParca ? `${seciliParca.ad} (${seciliParca.stokKodu})` : parcaArama}
                  onChange={(e) => {
                    setSeciliParca(null);
                    setParcaArama(e.target.value);
                    setParcaAramaAcik(true);
                  }}
                  onFocus={() => setParcaAramaAcik(true)}
                  placeholder="Ürün ara…"
                />
                {parcaAramaAcik && !seciliParca && parcaAramaSonuclari.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-52 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                    {parcaAramaSonuclari.map((p) => (
                      <button key={p.id} onMouseDown={() => parcaSec(p)} className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50" style={{ color: R.T.ink900 }}>
                        <span>
                          {p.ad} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {p.stokKodu}</span>
                        </span>
                        <span className="text-xs" style={{ color: p.stok > 0 ? R.T.green : R.T.red }}>
                          Stok: {p.stok}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {seciliParca && (
                <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  Mevcut stok: <strong>{seciliParca.stok}</strong> {seciliParca.birim} · Marka: {seciliParca.marka}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Adet *" type="number" value={form.adet} onChange={(e) => setForm({ ...form, adet: e.target.value })} />
                <R.Girdi label="Sipariş Fiyatı" type="number" value={form.siparisFiyati} onChange={(e) => setForm({ ...form, siparisFiyati: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Sipariş Tarihi" type="date" value={form.siparisTarihi} onChange={(e) => setForm({ ...form, siparisTarihi: e.target.value })} />
                <R.Girdi label="Tahmini Geliş Tarihi" type="date" value={form.tahminiGelisTarihi} onChange={(e) => setForm({ ...form, tahminiGelisTarihi: e.target.value })} />
              </div>
              <R.Girdi label="Tedarikçi" value={form.tedarikci} onChange={(e) => setForm({ ...form, tedarikci: e.target.value })} list="ms-tedarikci-listesi" />
              <datalist id="ms-tedarikci-listesi">
                {db.tedarikciler.filter((t) => t.aktif !== false).map((t) => (
                  <option key={t.id} value={t.ad} />
                ))}
              </datalist>
              <R.Girdi label="Siparişi Alan Personel" value={alanPersonel} readOnly />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: R.T.ink500 }}>
                  Not
                </span>
                <textarea value={form.not} onChange={(e) => setForm({ ...form, not: e.target.value })} rows={2} className="px-3 py-2 rounded-md border text-sm outline-none resize-none" style={{ borderColor: R.T.steel300, color: R.T.ink900 }} />
              </label>
              <R.Buton onClick={kaydet}>
                <R.Check size={15} /> Siparişi Oluştur
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Ürün Geldi onayı */}
      {durumDegistirHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDurumDegistirHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Ürün Geldi Olarak İşaretle
            </h3>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Bu, sadece bu müşteri siparişinin durumunu günceller. Gerçek stok artışını (mal kabul / stok girişi) ayrıca yapmış olmalısınız.
            </p>
            <R.Girdi label="Gelen Adet" type="number" value={gelenAdetMetin} onChange={(e) => setGelenAdetMetin(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <R.Buton onClick={urunGeldiOnayla}>
                <R.Check size={14} /> Onayla
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setDurumDegistirHedef(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Müşteriye Teslim Et */}
      {teslimHedef && teslimEdiliyorParca && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setTeslimHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Müşteriye Teslim Et
            </h3>
            <p className="text-sm mb-3" style={{ color: R.T.ink500 }}>
              {teslimEdiliyorParca.ad} — {teslimHedef.adet} {teslimEdiliyorParca.birim} — {teslimHedef.musteriAdi}
            </p>
            <div className="flex flex-col gap-3">
              <R.Secim label="Ödeme Yöntemi" value={teslimOdemeYontemi} onChange={(e) => setTeslimOdemeYontemi(e.target.value)}>
                {R.ODEME_YONTEMLERI.filter((y) => db.ayarlar.odemeYontemleriDurumu?.[y] !== false).map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </R.Secim>
              {teslimOdemeYontemi !== "Açık Hesap" && db.hesaplar.length > 0 && (
                <R.Secim label="Hangi Hesaba" value={teslimHesapId} onChange={(e) => setTeslimHesapId(e.target.value)}>
                  <option value="">Seçin… (opsiyonel)</option>
                  {db.hesaplar.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.ad}
                    </option>
                  ))}
                </R.Secim>
              )}
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                <span className="font-semibold" style={{ color: R.T.ink900 }}>
                  Toplam
                </span>
                <span className="text-lg font-semibold" style={R.MONO}>
                  {R.tl(teslimToplam)}
                </span>
              </div>
              <R.Buton onClick={teslimEt}>
                <R.Check size={15} /> Satışı Tamamla
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* İptal modalı */}
      {iptalHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setIptalHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Müşteri Siparişini İptal Et
            </h3>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: R.T.ink500 }}>
                İptal Nedeni *
              </span>
              <textarea value={iptalNedeniMetin} onChange={(e) => setIptalNedeniMetin(e.target.value)} rows={2} className="px-3 py-2 rounded-md border text-sm outline-none resize-none" style={{ borderColor: R.T.steel300, color: R.T.ink900 }} autoFocus />
            </label>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={iptalOnayla}>
                <R.X size={14} /> İptal Et
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setIptalHedef(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
