/* StokOperasyon module — extracted from the V16 monolith. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

export function StokTransferSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("transferler"); // depolar | transferler

  // --- Depo yönetimi -----------------------------------------------------------
  const [depoFormAcik, setDepoFormAcik] = R.useState(false);
  const [depoForm, setDepoForm] = R.useState(R.bosDepoForm);
  const [duzenlenenDepoId, setDuzenlenenDepoId] = R.useState(null);

  const depoFormuAc = (d) => {
    if (d) {
      setDepoForm({ ad: d.ad, kod: d.kod, adres: d.adres || "", sorumluKisi: d.sorumluKisi || "" });
      setDuzenlenenDepoId(d.id);
    } else {
      setDepoForm(R.bosDepoForm);
      setDuzenlenenDepoId("yeni");
    }
    setDepoFormAcik(true);
  };

  const depoKaydet = () => {
    if (!depoForm.ad.trim() || !depoForm.kod.trim()) {
      R.bildirimGoster("Depo adı ve kodu zorunludur.", "hata");
      return;
    }
    if (duzenlenenDepoId === "yeni") {
      const yeniDepoId = R.yeniId("depo");
      updateDb((prev) => ({
        ...prev,
        depolar: [...prev.depolar, { id: yeniDepoId, ad: depoForm.ad.trim(), kod: depoForm.kod.trim(), adres: depoForm.adres.trim(), sorumluKisi: depoForm.sorumluKisi.trim(), aktif: true }],
      }));
      R.bildirimGoster("Depo oluşturuldu.", "basari");
    } else {
      updateDb((prev) => ({
        ...prev,
        depolar: prev.depolar.map((d) => (d.id === duzenlenenDepoId ? { ...d, ad: depoForm.ad.trim(), kod: depoForm.kod.trim(), adres: depoForm.adres.trim(), sorumluKisi: depoForm.sorumluKisi.trim() } : d)),
      }));
      R.bildirimGoster("Depo güncellendi.", "basari");
    }
    setDepoFormAcik(false);
  };

  const depoPasifYap = (d) => updateDb((prev) => ({ ...prev, depolar: prev.depolar.map((x) => (x.id === d.id ? { ...x, aktif: false } : x)) }));
  const depoSil = (d) => {
    if (d.id === "depo-ana") {
      R.bildirimGoster("Ana depo silinemez.", "hata");
      return;
    }
    const stoguVar = db.parcalar.some((p) => R.depoStogu(p, d.id) > 0);
    if (stoguVar) {
      R.bildirimGoster("Bu depoda hâlâ stok var — önce transfer edin ya da Pasif yapın.", "hata");
      return;
    }
    updateDb((prev) => ({ ...prev, depolar: prev.depolar.filter((x) => x.id !== d.id) }));
  };

  // --- Transferler ---------------------------------------------------------------
  const [durumFiltre, setDurumFiltre] = R.useState("tumu");
  const [formAcik, setFormAcik] = R.useState(false);
  const [form, setForm] = R.useState(R.bosTransferForm);
  const [urunArama, setUrunArama] = R.useState("");
  const [seciliParca, setSeciliParca] = R.useState(null);
  const [transferiYapan, setTransferiYapan] = R.useIslemYapan(aktifKullanici);
  const [onaylayanModal, setOnaylayanModal] = R.useState(null); // { transfer, onaylayanMetin }
  const [iptalHedef, setIptalHedef] = R.useState(null);
  const [iptalNedeniMetin, setIptalNedeniMetin] = R.useState("");

  const filtreliTransferler = db.transferler.filter((t) => durumFiltre === "tumu" || t.durum === durumFiltre).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
  const urunAramaSonuclari = urunArama.trim() ? R.hizliAramaYap(db, urunArama).slice(0, 6) : [];

  const formuAc = () => {
    setForm({ ...R.bosTransferForm, kaynakDepoId: db.depolar[0]?.id || "", hedefDepoId: db.depolar[1]?.id || "" });
    setSeciliParca(null);
    setUrunArama("");
    setFormAcik(true);
  };

  const transferKaydet = () => {
    if (!form.kaynakDepoId || !form.hedefDepoId) {
      R.bildirimGoster("Kaynak ve hedef depo seçin.", "hata");
      return;
    }
    if (form.kaynakDepoId === form.hedefDepoId) {
      R.bildirimGoster("Kaynak ve hedef depo aynı olamaz.", "hata");
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
    const transfer = {
      id: R.yeniId("tr"),
      kaynakDepoId: form.kaynakDepoId,
      hedefDepoId: form.hedefDepoId,
      parcaId: seciliParca.id,
      adet,
      kaynakRaf: form.kaynakRaf.trim(),
      hedefRaf: form.hedefRaf.trim(),
      tarih: form.tarih,
      aciklama: form.aciklama.trim(),
      transferiYapan: aktifKullanici?.adSoyad || transferiYapan.trim(),
      onaylayan: "",
      durum: "Taslak",
      gonderilmeTarihi: null,
      teslimTarihi: null,
      iptalNedeni: "",
    };
    updateDb((prev) => ({ ...prev, transferler: [transfer, ...prev.transferler] }));
    R.sonKullaniciAdiKaydet(transferiYapan);
    R.bildirimGoster("Transfer taslağı oluşturuldu.", "basari");
    setFormAcik(false);
  };

  // Gönder: kaynak depodan düşer — ürün "yolda" sayılır, p.stok TOPLAMI değişmez.
  const transferGonder = (t) => {
    const parca = db.parcalar.find((p) => p.id === t.parcaId);
    if (!parca || R.depoStogu(parca, t.kaynakDepoId) < t.adet) {
      R.bildirimGoster("Kaynak depoda yeterli stok yok.", "hata");
      return;
    }
    updateDb((prev) => {
      const p = prev.parcalar.find((x) => x.id === t.parcaId);
      const yeniDagilim = (p.depoStoklari || []).map((d) => (d.depoId === t.kaynakDepoId ? { ...d, adet: d.adet - t.adet } : d));
      return R.islemKaydet(
        {
          ...prev,
          parcalar: prev.parcalar.map((x) => (x.id === t.parcaId ? { ...x, depoStoklari: yeniDagilim } : x)),
          transferler: prev.transferler.map((x) => (x.id === t.id ? { ...x, durum: "Gönderildi", gonderilmeTarihi: R.zamanDamgasi() } : x)),
        },
        { kullaniciAdi: t.transferiYapan, islemTuru: "Transfer gönderildi", aciklama: `${p.ad} — ${t.adet} adet`, eskiDeger: "Taslak", yeniDeger: "Gönderildi" }
      );
    });
    R.bildirimGoster("Transfer gönderildi — ürün kaynaktan düştü, yolda görünüyor.", "basari");
  };

  const transferYoldaIsaretle = (t) => {
    updateDb((prev) => ({ ...prev, transferler: prev.transferler.map((x) => (x.id === t.id ? { ...x, durum: "Yolda" } : x)) }));
  };

  const teslimAlAc = (t) => setOnaylayanModal({ transfer: t, onaylayanMetin: "" });
  const teslimAlOnayla = () => {
    if (!onaylayanModal.onaylayanMetin.trim()) {
      R.bildirimGoster("Onaylayan kişi zorunludur.", "hata");
      return;
    }
    const t = onaylayanModal.transfer;
    updateDb((prev) => {
      const p = prev.parcalar.find((x) => x.id === t.parcaId);
      const mevcutHedef = (p.depoStoklari || []).find((d) => d.depoId === t.hedefDepoId);
      const yeniDagilim = mevcutHedef ? p.depoStoklari.map((d) => (d.depoId === t.hedefDepoId ? { ...d, adet: d.adet + t.adet } : d)) : [...(p.depoStoklari || []), { depoId: t.hedefDepoId, adet: t.adet }];
      return R.islemKaydet(
        {
          ...prev,
          parcalar: prev.parcalar.map((x) => (x.id === t.parcaId ? { ...x, depoStoklari: yeniDagilim } : x)),
          transferler: prev.transferler.map((x) => (x.id === t.id ? { ...x, durum: "Teslim Alındı", teslimTarihi: R.zamanDamgasi(), onaylayan: onaylayanModal.onaylayanMetin.trim() } : x)),
        },
        { kullaniciAdi: onaylayanModal.onaylayanMetin.trim(), islemTuru: "Transfer teslim alındı", aciklama: `${p.ad} — ${t.adet} adet`, eskiDeger: "Yolda", yeniDeger: "Teslim Alındı" }
      );
    });
    R.bildirimGoster("Transfer teslim alındı — hedef depo stoğu güncellendi.", "basari");
    setOnaylayanModal(null);
  };

  const iptalOnayla = () => {
    if (!iptalNedeniMetin.trim()) {
      R.bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    const t = iptalHedef;
    updateDb((prev) => {
      let sonuc = prev;
      // Kaynaktan zaten düşülmüşse (Gönderildi/Yolda), iptalde geri eklenir.
      if (t.durum === "Gönderildi" || t.durum === "Yolda") {
        const p = prev.parcalar.find((x) => x.id === t.parcaId);
        const yeniDagilim = (p.depoStoklari || []).map((d) => (d.depoId === t.kaynakDepoId ? { ...d, adet: d.adet + t.adet } : d));
        sonuc = { ...sonuc, parcalar: sonuc.parcalar.map((x) => (x.id === t.parcaId ? { ...x, depoStoklari: yeniDagilim } : x)) };
      }
      return { ...sonuc, transferler: sonuc.transferler.map((x) => (x.id === t.id ? { ...x, durum: "İptal", iptalNedeni: iptalNedeniMetin.trim() } : x)) };
    });
    R.bildirimGoster("Transfer iptal edildi.", "basari");
    setIptalHedef(null);
    setIptalNedeniMetin("");
  };

  const depoAdi = (id) => {
    const d = db.depolar.find((x) => x.id === id);
    return d ? `${d.kod} — ${d.ad}` : "—";
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "transferler", ad: "Transferler" },
          { id: "depolar", ad: "Depolar" },
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

      {altSekme === "depolar" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <R.Buton onClick={() => depoFormuAc(null)}>
              <R.Plus size={15} /> Yeni Depo
            </R.Buton>
          </div>
          {db.depolar.map((d) => {
            const toplamStok = db.parcalar.reduce((t, p) => t + R.depoStogu(p, d.id), 0);
            return (
              <R.Kart key={d.id} className="p-4 flex items-center justify-between flex-wrap gap-2" style={{ opacity: d.aktif === false ? 0.5 : 1 }}>
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                    {d.kod} — {d.ad} {d.aktif === false && <R.Rozet tone="steel">Pasif</R.Rozet>}
                  </div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    {[d.adres, d.sorumluKisi && `Sorumlu: ${d.sorumluKisi}`].filter(Boolean).join(" · ") || "Ek bilgi girilmemiş"} · Toplam stok: {toplamStok}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => depoFormuAc(d)} style={{ color: R.T.ink500 }}>
                    <R.Pencil size={14} />
                  </button>
                  {d.id !== "depo-ana" && d.aktif !== false && (
                    <button onClick={() => depoPasifYap(d)} className="text-xs font-semibold" style={{ color: R.T.ink500 }}>
                      Pasif Yap
                    </button>
                  )}
                  {d.id !== "depo-ana" && (
                    <button onClick={() => depoSil(d)} style={{ color: R.T.red }}>
                      <R.Trash2 size={14} />
                    </button>
                  )}
                </div>
              </R.Kart>
            );
          })}
        </div>
      )}

      {altSekme === "transferler" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
              {["tumu", ...R.TRANSFER_DURUMLARI].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurumFiltre(d)}
                  className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                  style={{ background: durumFiltre === d ? R.T.graphite900 : "#fff", color: durumFiltre === d ? "#fff" : R.T.ink500 }}
                >
                  {d === "tumu" ? "Tümü" : `${R.transferDurumGorseli[d].emoji} ${d}`}
                </button>
              ))}
            </div>
            <R.Buton onClick={formuAc} disabled={db.depolar.length < 2}>
              <R.Plus size={15} /> Yeni Transfer
            </R.Buton>
          </div>
          {db.depolar.length < 2 && (
            <p className="text-xs" style={{ color: R.T.ink500 }}>
              Transfer yapabilmek için en az 2 depo tanımlı olmalı — "Depolar" sekmesinden ikinci bir depo (ör. Arka Depo) ekleyin.
            </p>
          )}

          {filtreliTransferler.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Truck} baslik="Transfer yok" aciklama="ör. D1 → D2 şeklinde depolar arası ürün gönderin." />
            </R.Kart>
          ) : (
            filtreliTransferler.map((t) => {
              const parca = db.parcalar.find((p) => p.id === t.parcaId);
              const durum = R.transferDurumGorseli[t.durum];
              return (
                <R.Kart key={t.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                        {depoAdi(t.kaynakDepoId)} → {depoAdi(t.hedefDepoId)}
                      </span>
                      <R.Rozet tone={durum.ton}>
                        {durum.emoji} {t.durum}
                      </R.Rozet>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      {parca?.ad || "(Ürün silinmiş)"} · {t.adet} adet · {R.tarihGoster(t.tarih)}
                      {(t.kaynakRaf || t.hedefRaf) && ` · ${t.kaynakRaf || "—"} → ${t.hedefRaf || "—"}`}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      Transferi yapan: {t.transferiYapan || "—"}
                      {t.onaylayan && ` · Onaylayan: ${t.onaylayan}`}
                      {t.aciklama && ` · ${t.aciklama}`}
                    </div>
                    {t.durum === "İptal" && t.iptalNedeni && (
                      <div className="text-xs mt-0.5" style={{ color: R.T.red }}>
                        İptal nedeni: {t.iptalNedeni}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.durum === "Taslak" && (
                      <R.Buton onClick={() => transferGonder(t)}>
                        <R.Truck size={13} /> Gönder
                      </R.Buton>
                    )}
                    {t.durum === "Gönderildi" && (
                      <button onClick={() => transferYoldaIsaretle(t)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                        Yolda İşaretle
                      </button>
                    )}
                    {(t.durum === "Gönderildi" || t.durum === "Yolda") && (
                      <R.Buton onClick={() => teslimAlAc(t)}>
                        <R.Check size={13} /> Teslim Alındı
                      </R.Buton>
                    )}
                    {(t.durum === "Taslak" || t.durum === "Gönderildi" || t.durum === "Yolda") && (
                      <button onClick={() => setIptalHedef(t)} style={{ color: R.T.red }}>
                        <R.X size={15} />
                      </button>
                    )}
                  </div>
                </R.Kart>
              );
            })
          )}
        </div>
      )}

      {/* Depo ekle/düzenle formu */}
      {depoFormAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDepoFormAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              {duzenlenenDepoId === "yeni" ? "Yeni Depo" : "Depoyu Düzenle"}
            </h3>
            <div className="flex flex-col gap-3">
              <R.Girdi label="Depo Adı *" value={depoForm.ad} onChange={(e) => setDepoForm({ ...depoForm, ad: e.target.value })} placeholder="ör. Arka Depo" />
              <R.Girdi label="Depo Kodu *" value={depoForm.kod} onChange={(e) => setDepoForm({ ...depoForm, kod: e.target.value.toUpperCase() })} placeholder="ör. D2" />
              <R.Girdi label="Adres" value={depoForm.adres} onChange={(e) => setDepoForm({ ...depoForm, adres: e.target.value })} />
              <R.Girdi label="Sorumlu Kişi" value={depoForm.sorumluKisi} onChange={(e) => setDepoForm({ ...depoForm, sorumluKisi: e.target.value })} />
              <div className="flex gap-2">
                <R.Buton onClick={depoKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setDepoFormAcik(false)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni transfer formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Yeni Stok Transferi
            </h3>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <R.Secim label="Kaynak Depo" value={form.kaynakDepoId} onChange={(e) => setForm({ ...form, kaynakDepoId: e.target.value })}>
                  {db.depolar.filter((d) => d.aktif !== false).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.kod} — {d.ad}
                    </option>
                  ))}
                </R.Secim>
                <R.Secim label="Hedef Depo" value={form.hedefDepoId} onChange={(e) => setForm({ ...form, hedefDepoId: e.target.value })}>
                  {db.depolar.filter((d) => d.aktif !== false).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.kod} — {d.ad}
                    </option>
                  ))}
                </R.Secim>
              </div>
              <div className="relative">
                <R.Girdi
                  label="Ürün"
                  value={seciliParca ? seciliParca.ad : urunArama}
                  onChange={(e) => {
                    setSeciliParca(null);
                    setUrunArama(e.target.value);
                  }}
                  placeholder="Ürün ara…"
                />
                {!seciliParca && urunAramaSonuclari.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-44 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                    {urunAramaSonuclari.map((p) => (
                      <button key={p.id} onMouseDown={() => setSeciliParca(p)} className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50" style={{ color: R.T.ink900 }}>
                        <span>{p.ad}</span>
                        <span className="text-xs" style={{ color: R.T.ink500 }}>
                          {form.kaynakDepoId && `${R.depoStogu(p, form.kaynakDepoId)} adet mevcut`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {seciliParca && form.kaynakDepoId && (
                <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  Kaynak depoda mevcut: <strong>{R.depoStogu(seciliParca, form.kaynakDepoId)}</strong> {seciliParca.birim}
                </p>
              )}
              <R.Girdi label="Adet" type="number" value={form.adet} onChange={(e) => setForm({ ...form, adet: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Kaynak Raf (opsiyonel)" value={form.kaynakRaf} onChange={(e) => setForm({ ...form, kaynakRaf: e.target.value.toUpperCase() })} placeholder="ör. A-02-03" />
                <R.Girdi label="Hedef Raf (opsiyonel)" value={form.hedefRaf} onChange={(e) => setForm({ ...form, hedefRaf: e.target.value.toUpperCase() })} placeholder="ör. B-01-05" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Tarih" type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
                <R.Girdi label="Transferi Yapan" value={transferiYapan} readOnly />
              </div>
              <R.Girdi label="Açıklama" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
              <div className="flex gap-2">
                <R.Buton onClick={transferKaydet}>
                  <R.Check size={14} /> Taslak Olarak Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setFormAcik(false)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teslim alma onayı */}
      {onaylayanModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setOnaylayanModal(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Teslim Alındı Olarak Onayla
            </h3>
            <R.Girdi label="Onaylayan Kişi *" value={onaylayanModal.onaylayanMetin} onChange={(e) => setOnaylayanModal({ ...onaylayanModal, onaylayanMetin: e.target.value })} autoFocus />
            <div className="flex gap-2 mt-3">
              <R.Buton onClick={teslimAlOnayla}>
                <R.Check size={14} /> Onayla
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setOnaylayanModal(null)}>
                Vazgeç
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
              Transferi İptal Et
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

export function KargoSayfasi({ db, updateDb, aktifKullanici, belgeyeGit }) {
  const [altSekme, setAltSekme] = R.useState("teslimatlar");
  const [durumFiltre, setDurumFiltre] = R.useState("aktif");
  const [detayId, setDetayId] = R.useState(null);

  const detay = detayId ? db.teslimatlar.find((t) => t.id === detayId) : null;

  const filtreliTeslimatlar = db.teslimatlar
    .filter((t) => {
      if (durumFiltre === "tumu") return true;
      if (durumFiltre === "aktif") return t.durum !== "Teslim Edildi" && t.durum !== "İptal" && t.durum !== "İade Edildi";
      return t.durum === durumFiltre;
    })
    .sort((a, b) => new Date(b.olusturmaTarihi) - new Date(a.olusturmaTarihi));

  const durumDegistir = (teslimat, yeniDurum) => {
    updateDb((prev) => {
      let sonuc = {
        ...prev,
        teslimatlar: prev.teslimatlar.map((t) => (t.id === teslimat.id ? { ...t, durum: yeniDurum } : t)),
      };
      // Kargo ücretini mağaza ödüyorsa, "Kargoya Verildi" işaretlendiğinde
      // bir kereye mahsus otomatik gider kaydı oluşturulur (5. adım).
      if (yeniDurum === "Kargoya Verildi" && teslimat.kargoUcretiKimOder === "Mağaza" && teslimat.kargoUcreti > 0 && !teslimat.giderKaydedildi) {
        const gider = {
          id: R.yeniId("gd"),
          tarih: R.isoGun(new Date()),
          kategori: "Kargo",
          aciklama: `Kargo ücreti — ${teslimat.aliciAdi} (${teslimat.kargoFirmasi || "belirtilmemiş"})`,
          tutar: teslimat.kargoUcreti,
          kdvOrani: 0,
          kdvTutari: 0,
          kdvHaricTutar: teslimat.kargoUcreti,
          odemeYontemi: "",
          hesapId: null,
          belgeNo: "",
          tedarikciFirma: teslimat.kargoFirmasi || "",
          belgeDosyasi: "",
          vadeTarihi: "",
          odemeDurumu: "Bekliyor",
          odenenTutar: 0,
          kullanici: aktifKullanici?.adSoyad || "",
          durum: "Tamamlandı",
          tekrarlayanId: null,
        };
        const kategoriVarMi = prev.giderKategorileri.some((k) => k.ad === "Kargo");
        sonuc = {
          ...sonuc,
          giderler: [gider, ...prev.giderler],
          giderKategorileri: kategoriVarMi ? prev.giderKategorileri : [...prev.giderKategorileri, { id: R.yeniId("gk"), ad: "Kargo" }],
          teslimatlar: sonuc.teslimatlar.map((t) => (t.id === teslimat.id ? { ...t, giderKaydedildi: true } : t)),
        };
      }
      return R.islemKaydet(sonuc, { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: "Teslimat durumu değişti", aciklama: `${teslimat.aliciAdi} — ${yeniDurum}`, eskiDeger: teslimat.durum, yeniDeger: yeniDurum });
    });
    R.bildirimGoster(`Teslimat durumu "${yeniDurum}" olarak güncellendi.`, "basari");
  };

  // --- Paketleme (4. madde) -----------------------------------------------------
  const paketEkle = (teslimat) => {
    updateDb((prev) => ({
      ...prev,
      teslimatlar: prev.teslimatlar.map((t) => (t.id === teslimat.id ? { ...t, paketler: [...t.paketler, { ...R.bosPaket(), paketNo: t.paketler.length + 1 }] } : t)),
    }));
  };
  const paketGuncelle = (teslimat, paketId, alan, deger) => {
    updateDb((prev) => ({
      ...prev,
      teslimatlar: prev.teslimatlar.map((t) => (t.id === teslimat.id ? { ...t, paketler: t.paketler.map((p) => (p.id === paketId ? { ...p, [alan]: deger } : p)) } : t)),
    }));
  };
  const paketSil = (teslimat, paketId) => {
    updateDb((prev) => ({ ...prev, teslimatlar: prev.teslimatlar.map((t) => (t.id === teslimat.id ? { ...t, paketler: t.paketler.filter((p) => p.id !== paketId) } : t)) }));
  };

  // --- Kargo firmaları -----------------------------------------------------------
  const [firmaFormAcik, setFirmaFormAcik] = R.useState(false);
  const [firmaForm, setFirmaForm] = R.useState({ ad: "", kod: "", telefon: "" });
  const firmaEkle = () => {
    if (!firmaForm.ad.trim()) {
      R.bildirimGoster("Firma adı zorunludur.", "hata");
      return;
    }
    updateDb((prev) => ({ ...prev, kargoFirmalari: [{ id: R.yeniId("kf"), ad: firmaForm.ad.trim(), kod: firmaForm.kod.trim(), telefon: firmaForm.telefon.trim(), aktif: true }, ...prev.kargoFirmalari] }));
    setFirmaForm({ ad: "", kod: "", telefon: "" });
    setFirmaFormAcik(false);
    R.bildirimGoster("Kargo firması eklendi.", "basari");
  };
  const firmaPasifYap = (f) => updateDb((prev) => ({ ...prev, kargoFirmalari: prev.kargoFirmalari.map((x) => (x.id === f.id ? { ...x, aktif: !x.aktif } : x)) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "teslimatlar", ad: "Teslimatlar" },
          { id: "firmalar", ad: "Kargo Firmaları" },
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

      {altSekme === "teslimatlar" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
            {["aktif", "tumu", ...R.TESLIMAT_DURUMLARI].map((d) => (
              <button
                key={d}
                onClick={() => setDurumFiltre(d)}
                className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                style={{ background: durumFiltre === d ? R.T.graphite900 : "#fff", color: durumFiltre === d ? "#fff" : R.T.ink500 }}
              >
                {d === "aktif" ? "Aktif" : d === "tumu" ? "Tümü" : `${R.teslimatDurumGorseli[d].emoji} ${d}`}
              </button>
            ))}
          </div>

          {filtreliTeslimatlar.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Truck} baslik="Teslimat yok" aciklama="Satış tamamlanırken 'Teslimat Bilgisi Ekle' seçilirse burada listelenir." />
            </R.Kart>
          ) : (
            filtreliTeslimatlar.map((t) => {
              const durum = R.teslimatDurumGorseli[t.durum];
              const satis = db.satislar.find((s) => s.id === t.satisId);
              return (
                <R.Kart key={t.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="cursor-pointer" onClick={() => setDetayId(t.id)}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                        {t.aliciAdi}
                      </span>
                      <R.Rozet tone={durum.ton}>
                        {durum.emoji} {t.durum}
                      </R.Rozet>
                      <R.Rozet tone="steel">{t.teslimatTipi}</R.Rozet>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      Satış: {satis?.belgeNo || "—"} · {satis?.kalemler.length || 0} ürün
                      {t.kargoFirmasi && ` · ${t.kargoFirmasi}`}
                      {t.paketler.length > 0 && ` · ${t.paketler.length} paket`}
                    </div>
                    {t.paketler.some((p) => p.kargoTakipNo) && (
                      <div className="text-xs mt-0.5" style={{ ...R.MONO, color: R.T.ink500 }}>
                        Takip No: {t.paketler.map((p) => p.kargoTakipNo).filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setDetayId(t.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      Detay
                    </button>
                  </div>
                </R.Kart>
              );
            })
          )}
        </div>
      )}

      {altSekme === "firmalar" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <R.Buton onClick={() => setFirmaFormAcik(true)}>
              <R.Plus size={15} /> Kargo Firması Ekle
            </R.Buton>
          </div>
          {firmaFormAcik && (
            <R.Kart className="p-4 flex flex-wrap items-end gap-2">
              <R.Girdi label="Firma Adı" value={firmaForm.ad} onChange={(e) => setFirmaForm({ ...firmaForm, ad: e.target.value })} placeholder="ör. Yurtiçi Kargo" />
              <R.Girdi label="Kargo Kodu" value={firmaForm.kod} onChange={(e) => setFirmaForm({ ...firmaForm, kod: e.target.value.toUpperCase() })} placeholder="ör. YK" />
              <R.Girdi label="Telefon" value={firmaForm.telefon} onChange={(e) => setFirmaForm({ ...firmaForm, telefon: e.target.value })} />
              <R.Buton onClick={firmaEkle}>
                <R.Check size={14} /> Kaydet
              </R.Buton>
            </R.Kart>
          )}
          {db.kargoFirmalari.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Truck} baslik="Kargo firması tanımlı değil" aciklama="İleride API entegrasyonuna hazır, sade bir tanım listesidir." />
            </R.Kart>
          ) : (
            db.kargoFirmalari.map((f) => (
              <R.Kart key={f.id} className="p-4 flex items-center justify-between flex-wrap gap-2" style={{ opacity: f.aktif === false ? 0.5 : 1 }}>
                <div>
                  <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                    {f.ad} {f.kod && <span style={{ ...R.MONO, color: R.T.ink500, fontWeight: 400 }}>({f.kod})</span>}
                  </div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    {f.telefon || "Telefon girilmemiş"}
                  </div>
                </div>
                <button onClick={() => firmaPasifYap(f)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                  {f.aktif === false ? "Aktif Yap" : "Pasif Yap"}
                </button>
              </R.Kart>
            ))
          )}
        </div>
      )}

      {/* Teslimat detayı */}
      {detay && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDetayId(null)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Teslimat — {detay.aliciAdi}
              </h3>
              <button onClick={() => setDetayId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="rounded-md p-2" style={{ background: R.T.steel100 }}>
                Tip: <strong style={{ color: R.T.ink900 }}>{detay.teslimatTipi}</strong>
              </div>
              <div className="rounded-md p-2" style={{ background: R.T.steel100 }}>
                Telefon: <strong style={{ color: R.T.ink900 }}>{detay.telefon || "—"}</strong>
              </div>
              <div className="col-span-2 rounded-md p-2" style={{ background: R.T.steel100 }}>
                Adres: <strong style={{ color: R.T.ink900 }}>{detay.adres || "—"}</strong> {detay.il && `· ${detay.ilce}/${detay.il}`}
              </div>
              {detay.teslimatNotu && (
                <div className="col-span-2 rounded-md p-2" style={{ background: R.T.steel100 }}>
                  Not: {detay.teslimatNotu}
                </div>
              )}
            </div>

            {belgeyeGit && detay.satisId && (
              <button onClick={() => belgeyeGit(detay.satisId)} className="text-xs font-semibold underline mb-3" style={{ color: R.T.orangeDark }}>
                Satış Belgesine Git →
              </button>
            )}

            <div className="flex flex-wrap gap-1.5 mb-4">
              {R.TESLIMAT_DURUMLARI.map((d) => (
                <button
                  key={d}
                  onClick={() => durumDegistir(detay, d)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-md"
                  style={{ background: detay.durum === d ? R.T.graphite900 : R.T.steel100, color: detay.durum === d ? "#fff" : R.T.ink900 }}
                >
                  {R.teslimatDurumGorseli[d].emoji} {d}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Paketler
              </h4>
              <button onClick={() => paketEkle(detay)} className="text-xs font-semibold underline" style={{ color: R.T.orangeDark }}>
                + Paket Ekle
              </button>
            </div>
            {detay.paketler.length === 0 ? (
              <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
                Henüz paket eklenmedi.
              </p>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {detay.paketler.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: R.T.ink900 }}>
                        Paket {p.paketNo}
                      </span>
                      <button onClick={() => paketSil(detay, p.id)} style={{ color: R.T.red }}>
                        <R.Trash2 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input value={p.kargoTakipNo} onChange={(e) => paketGuncelle(detay, p.id, "kargoTakipNo", e.target.value)} placeholder="Kargo Takip No" className="px-2 py-1 rounded border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                      <select value={detay.kargoFirmasi} onChange={() => {}} disabled className="px-2 py-1 rounded border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink500 }}>
                        <option>{detay.kargoFirmasi || "Kargo firması yok"}</option>
                      </select>
                      <input type="number" value={p.agirlikKg} onChange={(e) => paketGuncelle(detay, p.id, "agirlikKg", e.target.value)} placeholder="Ağırlık (kg)" className="px-2 py-1 rounded border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                      <input type="number" value={p.desi} onChange={(e) => paketGuncelle(detay, p.id, "desi", e.target.value)} placeholder="Desi" className="px-2 py-1 rounded border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                      <input type="number" value={p.kargoUcreti} onChange={(e) => paketGuncelle(detay, p.id, "kargoUcreti", e.target.value)} placeholder="Kargo Ücreti" className="px-2 py-1 rounded border text-xs outline-none col-span-2" style={{ borderColor: R.T.steel300 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
              Kargo Ücreti: <strong style={{ color: R.T.ink900 }}>{R.tl(detay.kargoUcreti)}</strong> — {detay.kargoUcretiKimOder === "Mağaza" ? "Mağaza ödüyor (gider olarak işlenir)" : detay.kargoUcretiKimOder === "Ücretsiz" ? "Ücretsiz kargo" : "Müşteri ödüyor"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EtiketSayfasi({ db, updateDb, aktifKullanici }) {
  // ÇOK ÖNEMLİ (50. adım, 10. madde): Etiketler HER ZAMAN p.satisFiyati'ni
  // okur — bu, sistemdeki TEK ana fiyat kaynağıdır. p.etiketSonYazdirmaFiyati
  // ayrı bir "etiket fiyatı" DEĞİLDİR; sadece "en son hangi fiyatla
  // basıldığı" bilgisini tutan bir TAKİP alanıdır, asla fiyat hesaplamasında
  // KULLANILMAZ. Böylece satış ekranı ile raf etiketi arasında iki farklı
  // fiyat kaynağı oluşması imkânsız hale gelir.
  const [altSekme, setAltSekme] = R.useState("etiket"); // "etiket" | "fiyatKontrol" | "kampanya" | "gecmis" | "sorgu"

  // --- Etiket Yazdır ---------------------------------------------------------
  const [ara, setAra] = R.useState("");
  const [markaFiltre, setMarkaFiltre] = R.useState("");
  const [secililer, setSecililer] = R.useState({});
  const [sablonKodu, setSablonKodu] = R.useState(() => db.ayarlar.etiketBoyutu || "50x30mm");
  const [oemEkle, setOemEkle] = R.useState(db.ayarlar.etiketAlanlari?.oemGoster ?? false);
  const [muadilEkle, setMuadilEkle] = R.useState(db.ayarlar.etiketAlanlari?.muadilGoster ?? false);
  const [rafEkle, setRafEkle] = R.useState(db.ayarlar.etiketAlanlari?.rafGoster ?? true);
  const [fiyatGoster, setFiyatGoster] = R.useState(db.ayarlar.etiketAlanlari?.fiyatGoster ?? true);
  const [birimGoster, setBirimGoster] = R.useState(false);

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);
  const markalar = [...new Set(aktifParcalar.map((p) => p.marka).filter(Boolean))].sort();

  const filtreliParcalar = aktifParcalar.filter((p) => {
    const q = ara.trim().toLowerCase();
    const eslesir = !q || p.ad.toLowerCase().includes(q) || R.kodNormalize(p.stokKodu).includes(R.kodNormalize(ara));
    return eslesir && (!markaFiltre || p.marka === markaFiltre);
  });

  const secimToggle = (id) => setSecililer((prev) => ({ ...prev, [id]: !prev[id] }));
  const tumunuSec = () => {
    const yeni = {};
    filtreliParcalar.forEach((p) => (yeni[p.id] = true));
    setSecililer(yeni);
  };
  const secimiTemizle = () => setSecililer({});
  const seciliParcalar = aktifParcalar.filter((p) => secililer[p.id]);

  const etiketleriYazdir = () => {
    if (seciliParcalar.length === 0) {
      R.bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const pencere = window.open("", "_blank", "width=800,height=700");
    if (!pencere) {
      R.bildirimGoster("Yazdırma penceresi açılamadı — pop-up engelleyiciyi kontrol edin.", "hata");
      return;
    }
    const sablon = R.ETIKET_SABLONLARI[sablonKodu] || R.ETIKET_SABLONLARI["50x30mm"];
    const etiketlerHtml = seciliParcalar
      .map((p) => {
        const oemKodlari = oemEkle ? db.kodlar.filter((k) => k.parcaId === p.id && k.tip === "OEM").map((k) => k.kod) : [];
        const muadilKodlari = muadilEkle ? db.kodlar.filter((k) => k.parcaId === p.id && k.tip === "Muadil").map((k) => k.kod) : [];
        const raf = rafEkle ? R.parcaRafListesi(p)[0]?.kod : null;
        const birincilBarkod = R.parcaTumBarkodlari(p)[0] || R.otomatikBarkodUret(db);
        return `
          <div class="etiket" style="width:${sablon.genislikMm}mm;min-height:${sablon.yukseklikMm}mm;">
            <div class="marka">${p.marka || ""}</div>
            <div class="ad" style="font-size:${sablon.adFont}px;">${p.ad}</div>
            <div class="kod">${p.stokKodu}</div>
            ${raf ? `<div class="ek">📍 ${raf}</div>` : ""}
            ${oemKodlari.length > 0 ? `<div class="ek">OEM: ${oemKodlari.join(", ")}</div>` : ""}
            ${muadilKodlari.length > 0 ? `<div class="ek">Muadil: ${muadilKodlari.join(", ")}</div>` : ""}
            <div class="barkod">${R.ean13SvgHtml(birincilBarkod, 140, 42)}</div>
            ${fiyatGoster ? `<div class="fiyat" style="font-size:${sablon.fiyatFont}px;">${R.tl(p.satisFiyati)}${birimGoster ? ` / ${p.birim}` : ""}</div>` : ""}
          </div>`;
      })
      .join("");
    pencere.document.write(`
      <html>
        <head>
          <title>Ürün Etiketleri — ${sablon.etiket}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
            .sayfa { display: flex; flex-wrap: wrap; gap: 8px; }
            .etiket { border: 1px dashed #999; padding: 8px; text-align: center; page-break-inside: avoid; box-sizing: border-box; }
            .marka { font-size: 10px; font-weight: bold; color: #5B6470; text-transform: uppercase; }
            .ad { font-weight: bold; margin: 2px 0; }
            .kod { font-size: 10px; color: #5B6470; font-family: monospace; }
            .ek { font-size: 9px; color: #5B6470; }
            .barkod { margin: 6px 0; display: flex; flex-direction: column; align-items: center; }
            .fiyat { font-weight: bold; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="sayfa">${etiketlerHtml}</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    pencere.document.close();

    // Yazdırılan etiketlerdeki fiyat, "güncel" olarak işaretlenir — sistemde
    // fiyat sonradan değişirse "Etiket fiyatı güncel değil" uyarısı buradan tetiklenir.
    // Ayrıca her yazdırma, kalıcı bir geçmiş kaydına düşer (9. adım).
    const kullaniciAdi = aktifKullanici?.adSoyad || "";
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => (secililer[p.id] ? { ...p, etiketSonYazdirmaFiyati: p.satisFiyati } : p)),
      etiketYazdirmaGecmisi: [
        ...seciliParcalar.map((p) => ({ id: R.yeniId("ey"), parcaId: p.id, tarih: R.zamanDamgasi(), kullanici: kullaniciAdi, adet: 1, sablon: sablon.etiket, fiyatBasildigiAn: p.satisFiyati })),
        ...prev.etiketYazdirmaGecmisi,
      ],
    }));
  };

  // --- Fiyat Değişikliği Kontrolü (4. adım) -------------------------------------
  const guncelOlmayanEtiketler = aktifParcalar
    .filter((p) => p.etiketSonYazdirmaFiyati !== null && Math.abs(p.etiketSonYazdirmaFiyati - p.satisFiyati) > 0.005)
    .map((p) => ({ parca: p, fark: p.satisFiyati - p.etiketSonYazdirmaFiyati }))
    .sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark));

  const guncelOlmayanlariSecVeGit = () => {
    const yeni = {};
    guncelOlmayanEtiketler.forEach((x) => (yeni[x.parca.id] = true));
    setSecililer(yeni);
    setAltSekme("etiket");
    R.bildirimGoster(`${guncelOlmayanEtiketler.length} ürün seçildi — "Etiket Yazdır" sekmesinden basabilirsiniz.`, "basari");
  };

  // --- Kampanya Etiketi (5. adım) ------------------------------------------------
  const bugunIso = R.isoGun(new Date());
  const aktifKampanyalar = db.kampanyalar.filter((k) => k.aktif !== false && k.baslangicTarihi <= bugunIso && k.bitisTarihi >= bugunIso);
  const [seciliKampanyaId, setSeciliKampanyaId] = R.useState("");
  const seciliKampanya = db.kampanyalar.find((k) => k.id === seciliKampanyaId);
  const kampanyaliUrunler = seciliKampanya ? R.kampanyaHedefUrunleri(db, seciliKampanya).filter((p) => p.aktif !== false) : [];

  const kampanyaEtiketleriYazdir = () => {
    if (!seciliKampanya || kampanyaliUrunler.length === 0) {
      R.bildirimGoster("Kampanya ve ürün bulunamadı.", "hata");
      return;
    }
    const pencere = window.open("", "_blank", "width=800,height=700");
    if (!pencere) return;
    const sablon = R.ETIKET_SABLONLARI["100x50mm"];
    const etiketlerHtml = kampanyaliUrunler
      .map((p) => {
        const kampanyaliFiyat = R.iskontoUygula(p.satisFiyati, seciliKampanya.iskontoTuru, seciliKampanya.iskontoDeger);
        return `
          <div class="etiket" style="width:${sablon.genislikMm}mm;min-height:${sablon.yukseklikMm}mm;">
            <div class="marka">${p.marka || ""}</div>
            <div class="ad" style="font-size:${sablon.adFont}px;">${p.ad}</div>
            <div class="kod">${p.stokKodu}</div>
            <div class="normal-fiyat">Normal: <s>${R.tl(p.satisFiyati)}</s></div>
            <div class="kampanya-fiyat">${R.tl(kampanyaliFiyat)}</div>
            <div class="tarih-araligi">${R.tarihGoster(seciliKampanya.baslangicTarihi)} – ${R.tarihGoster(seciliKampanya.bitisTarihi)}</div>
          </div>`;
      })
      .join("");
    pencere.document.write(`
      <html><head><title>Kampanya Etiketleri — ${seciliKampanya.ad}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
        .sayfa { display: flex; flex-wrap: wrap; gap: 8px; }
        .etiket { border: 2px solid #C0431A; border-radius: 6px; padding: 8px; text-align: center; page-break-inside: avoid; box-sizing: border-box; background: #FBE1D5; }
        .marka { font-size: 10px; font-weight: bold; color: #5B6470; text-transform: uppercase; }
        .ad { font-weight: bold; margin: 2px 0; }
        .kod { font-size: 10px; color: #5B6470; font-family: monospace; }
        .normal-fiyat { font-size: 12px; color: #5B6470; margin-top: 4px; }
        .kampanya-fiyat { font-size: 26px; font-weight: 800; color: #C0431A; }
        .tarih-araligi { font-size: 10px; color: #5B6470; margin-top: 2px; }
      </style></head>
      <body>
        <div class="sayfa">${etiketlerHtml}</div>
        <script>window.onload = function() { window.print(); };</script>
      </body></html>
    `);
    pencere.document.close();
    updateDb((prev) => ({
      ...prev,
      etiketYazdirmaGecmisi: [
        ...kampanyaliUrunler.map((p) => ({ id: R.yeniId("ey"), parcaId: p.id, tarih: R.zamanDamgasi(), kullanici: aktifKullanici?.adSoyad || "", adet: 1, sablon: `Kampanya — ${seciliKampanya.ad}`, fiyatBasildigiAn: p.satisFiyati })),
        ...prev.etiketYazdirmaGecmisi,
      ],
    }));
    R.bildirimGoster(`${kampanyaliUrunler.length} kampanya etiketi yazdırıldı.`, "basari");
  };

  // --- Barkod Sorgula ---------------------------------------------------------
  const [sorgu, setSorgu] = R.useState("");
  const [sorguSonucu, setSorguSonucu] = R.useState(null);
  const [sorguHata, setSorguHata] = R.useState("");
  const sorguRef = R.useRef(null);

  const sorgula = (e) => {
    if (e.key !== "Enter") return;
    const bulunan = R.barkodluParcaBul(db.parcalar, sorgu.trim());
    if (!bulunan) {
      setSorguSonucu(null);
      setSorguHata("Bu barkoda bağlı ürün bulunamadı.");
      return;
    }
    setSorguSonucu(bulunan);
    setSorguHata("");
    setSorgu("");
  };

  const durumBilgisi = { var: { emoji: "🟢", etiket: "Stokta", renk: R.T.green }, kritik: { emoji: "🟡", etiket: "Kritik Stok", renk: "#8A6110" }, yok: { emoji: "🔴", etiket: "Stokta Yok", renk: R.T.red } };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "etiket", ad: "Etiket Yazdır" },
          { id: "fiyatKontrol", ad: `Fiyat Kontrolü${guncelOlmayanEtiketler.length > 0 ? ` (${guncelOlmayanEtiketler.length})` : ""}` },
          { id: "kampanya", ad: "Kampanya Etiketi" },
          { id: "gecmis", ad: "Yazdırma Geçmişi" },
          { id: "sorgu", ad: "Barkod Sorgula" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold whitespace-nowrap px-2"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "etiket" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <input
                value={ara}
                onChange={(e) => setAra(e.target.value)}
                placeholder="Ürün adı veya stok kodu ara…"
                className="flex-1 min-w-[180px] px-3 py-2 rounded-md border text-sm outline-none"
                style={{ borderColor: R.T.steel300 }}
              />
              <select value={markaFiltre} onChange={(e) => setMarkaFiltre(e.target.value)} className="px-2 py-2 rounded-md border text-sm outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
                <option value="">Tüm Markalar</option>
                {markalar.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <button onClick={tumunuSec} className="text-xs font-semibold px-2.5" style={{ color: R.T.orangeDark }}>
                Listelenenleri Seç
              </button>
              <button onClick={secimiTemizle} className="text-xs font-semibold px-2.5" style={{ color: R.T.ink500 }}>
                Seçimi Temizle
              </button>
            </div>
            <R.Kart className="overflow-hidden">
              <div className="overflow-y-auto max-h-[30rem]">
                {filtreliParcalar.length === 0 ? (
                  <R.Bos ikon={R.ScanLine} baslik="Ürün bulunamadı" aciklama="Arama veya marka filtresini değiştirin." />
                ) : (
                  filtreliParcalar.map((p) => {
                    const etiketEski = p.etiketSonYazdirmaFiyati !== null && Math.abs(p.etiketSonYazdirmaFiyati - p.satisFiyati) > 0.005;
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer"
                        style={{ borderTop: `1px solid ${R.T.steel200}`, background: secililer[p.id] ? "#FBE1D5" : "#fff" }}
                      >
                        <input type="checkbox" checked={!!secililer[p.id]} onChange={() => secimToggle(p.id)} />
                        <div className="min-w-0 flex-1">
                          <div style={{ color: R.T.ink900 }}>
                            {p.ad} {etiketEski && <span title="Etiket fiyatı güncel değil">⚠️</span>}
                          </div>
                          <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                            {p.marka} · {p.stokKodu} · {R.tl(p.satisFiyati)}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </R.Kart>
          </div>

          <div className="flex flex-col gap-4">
            <R.Kart className="p-4 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Etiket Şablonu
              </span>
              <select value={sablonKodu} onChange={(e) => setSablonKodu(e.target.value)} className="px-2 py-2 rounded-md border text-sm outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
                {Object.entries(R.ETIKET_SABLONLARI).map(([kod, s]) => (
                  <option key={kod} value={kod}>
                    {s.etiket} ({s.genislikMm}x{s.yukseklikMm}mm)
                  </option>
                ))}
              </select>
            </R.Kart>
            <R.Kart className="p-4 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Etikette Görünsün
              </span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fiyatGoster} onChange={(e) => setFiyatGoster(e.target.checked)} />
                <span style={{ color: R.T.ink900 }}>Satış Fiyatı (KDV Dahil)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={birimGoster} onChange={(e) => setBirimGoster(e.target.checked)} />
                <span style={{ color: R.T.ink900 }}>Birim</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rafEkle} onChange={(e) => setRafEkle(e.target.checked)} />
                <span style={{ color: R.T.ink900 }}>Raf Adresi</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={oemEkle} onChange={(e) => setOemEkle(e.target.checked)} />
                <span style={{ color: R.T.ink900 }}>OEM Numarası</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={muadilEkle} onChange={(e) => setMuadilEkle(e.target.checked)} />
                <span style={{ color: R.T.ink900 }}>Muadil Kod</span>
              </label>
            </R.Kart>
            <R.Kart className="p-4">
              <p className="text-sm mb-3" style={{ color: R.T.ink500 }}>
                <strong style={{ color: R.T.ink900 }}>{seciliParcalar.length}</strong> ürün seçili.
              </p>
              <R.Buton onClick={etiketleriYazdir} disabled={seciliParcalar.length === 0}>
                <R.Printer size={15} /> Etiketleri Oluştur ve Yazdır
              </R.Buton>
            </R.Kart>
          </div>
        </div>
      )}

      {altSekme === "fiyatKontrol" && (
        <R.Kart className="overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: "#FDF1D6" }}>
            <span className="text-sm font-semibold" style={{ color: "#8A6110" }}>
              ⚠️ {guncelOlmayanEtiketler.length} ürünün raf etiketi güncel değil.
            </span>
            {guncelOlmayanEtiketler.length > 0 && (
              <R.Buton onClick={guncelOlmayanlariSecVeGit}>
                <R.Printer size={14} /> Tümünü Seç ve Etiket Bas
              </R.Buton>
            )}
          </div>
          {guncelOlmayanEtiketler.length === 0 ? (
            <R.Bos ikon={R.Check} baslik="Tüm etiketler güncel" aciklama="Fiyatı değişip etiketi henüz yenilenmemiş ürün yok." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Ürün</th>
                    <th className="text-right font-semibold px-3 py-2">Eski Etiket</th>
                    <th className="text-right font-semibold px-3 py-2">Güncel Fiyat</th>
                    <th className="text-right font-semibold px-3 py-2">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {guncelOlmayanEtiketler.map((x) => (
                    <tr key={x.parca.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                        {x.parca.marka} {x.parca.ad}
                      </td>
                      <td className="px-3 py-2 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                        {R.tl(x.parca.etiketSonYazdirmaFiyati)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold" style={R.MONO}>
                        {R.tl(x.parca.satisFiyati)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold" style={{ ...R.MONO, color: x.fark > 0 ? R.T.red : R.T.green }}>
                        {x.fark >= 0 ? "+" : ""}
                        {R.tl(x.fark)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "kampanya" && (
        <div className="flex flex-col gap-4">
          {aktifKampanyalar.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Percent} baslik="Aktif kampanya yok" aciklama="Fiyat Kuralları → Kampanyalar ekranından bir kampanya oluşturun." />
            </R.Kart>
          ) : (
            <>
              <R.Kart className="p-4">
                <R.Secim label="Kampanya" value={seciliKampanyaId} onChange={(e) => setSeciliKampanyaId(e.target.value)}>
                  <option value="">Seçin…</option>
                  {aktifKampanyalar.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ad} ({R.tarihGoster(k.baslangicTarihi)}–{R.tarihGoster(k.bitisTarihi)})
                    </option>
                  ))}
                </R.Secim>
              </R.Kart>
              {seciliKampanya && (
                <R.Kart className="p-4">
                  <p className="text-sm mb-3" style={{ color: R.T.ink500 }}>
                    Bu kampanyaya <strong style={{ color: R.T.ink900 }}>{kampanyaliUrunler.length} ürün</strong> uyuyor.
                  </p>
                  <R.Buton onClick={kampanyaEtiketleriYazdir} disabled={kampanyaliUrunler.length === 0}>
                    <R.Printer size={15} /> Kampanya Etiketlerini Yazdır
                  </R.Buton>
                </R.Kart>
              )}
            </>
          )}
        </div>
      )}

      {altSekme === "gecmis" && (
        <R.Kart className="overflow-hidden">
          {db.etiketYazdirmaGecmisi.length === 0 ? (
            <R.Bos ikon={R.Printer} baslik="Henüz etiket basılmadı" aciklama="Etiket bastığınızda burada kayıt tutulur." />
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Ürün</th>
                    <th className="text-left font-semibold px-3 py-2">Şablon</th>
                    <th className="text-right font-semibold px-3 py-2">Fiyat</th>
                    <th className="text-left font-semibold px-3 py-2">Kullanıcı</th>
                    <th className="text-left font-semibold px-3 py-2">Tarih/Saat</th>
                  </tr>
                </thead>
                <tbody>
                  {db.etiketYazdirmaGecmisi.slice(0, 200).map((e) => {
                    const p = db.parcalar.find((x) => x.id === e.parcaId);
                    return (
                      <tr key={e.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                          {p ? `${p.marka} ${p.ad}` : "(silinmiş ürün)"}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                          {e.sablon}
                        </td>
                        <td className="px-3 py-2 text-right" style={R.MONO}>
                          {R.tl(e.fiyatBasildigiAn)}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                          {e.kullanici || "—"}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                          {new Date(e.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "sorgu" && (
        <div className="flex flex-col gap-4 max-w-lg">
          <div className="relative">
            <R.ScanLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
            <input
              ref={sorguRef}
              value={sorgu}
              onChange={(e) => setSorgu(e.target.value)}
              onKeyDown={sorgula}
              placeholder="Barkod okutun veya yazıp Enter'a basın…"
              className="w-full pl-11 pr-4 py-3.5 rounded-lg border text-base outline-none focus:ring-2"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
              autoFocus
            />
          </div>
          {sorguHata && (
            <p className="text-sm px-3 py-2 rounded-md" style={{ background: "#F9DEDE", color: R.T.red }}>
              {sorguHata}
            </p>
          )}
          {sorguSonucu && (
            <R.Kart className="p-5">
              {(() => {
                const durum = durumBilgisi[R.stokDurumuHesapla(sorguSonucu)];
                return (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{durum.emoji}</span>
                      <div>
                        <div className="font-semibold text-base" style={{ color: R.T.ink900 }}>
                          {sorguSonucu.ad}
                        </div>
                        <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                          {sorguSonucu.marka} · {sorguSonucu.stokKodu}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                        <div className="text-xs" style={{ color: R.T.ink500 }}>
                          Stok
                        </div>
                        <div className="font-semibold" style={{ ...R.MONO, color: durum.renk }}>
                          {sorguSonucu.stok} {sorguSonucu.birim}
                        </div>
                      </div>
                      <div className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                        <div className="text-xs" style={{ color: R.T.ink500 }}>
                          Raf
                        </div>
                        <div className="font-semibold" style={R.MONO}>
                          {R.parcaRafListesi(sorguSonucu)[0]?.kod || "—"}
                        </div>
                      </div>
                      <div className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                        <div className="text-xs" style={{ color: R.T.ink500 }}>
                          Fiyat
                        </div>
                        <div className="font-semibold" style={R.MONO}>
                          {R.tl(sorguSonucu.satisFiyati)}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </R.Kart>
          )}
        </div>
      )}
    </div>
  );
}

export function YedekGuvenlikSayfasi({ db, updateDb, aktifKullanici, yedekIndirVeKaydet, yedekYukleRef }) {
  const [altSekme, setAltSekme] = R.useState("yedekleme"); // yedekleme | guvenlik | magaza
  const [sifreForm, setSifreForm] = R.useState({ eski: "", yeni: "", tekrar: "" });
  const [sifreHata, setSifreHata] = R.useState("");
  const [sifreBasarili, setSifreBasarili] = R.useState(false);
  const [magazaForm, setMagazaForm] = R.useState({ ...db.magazaBilgileri });
  const magazaLogoInputRef = R.useRef(null);

  const sonYedek = db.yedekGecmisi[0];
  const sonGirisler = db.girisGecmisi.slice(0, 30);
  const basarisizSonGirisler = db.girisGecmisi.filter((g) => !g.basarili).slice(0, 10);

  const ayarKaydet = (alan, deger) => {
    updateDb((prev) => ({ ...prev, yedekAyarlari: { ...prev.yedekAyarlari, [alan]: deger } }));
  };

  const magazaKaydet = () => {
    updateDb((prev) => ({ ...prev, magazaBilgileri: magazaForm }));
    R.bildirimGoster("Mağaza bilgileri kaydedildi.", "basari");
  };
  const magazaLogoSec = (e) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (dosya.size > 1024 * 1024) {
      R.bildirimGoster("Logo 1MB'tan küçük olmalı.", "hata");
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => setMagazaForm((f) => ({ ...f, logo: ev.target.result }));
    okuyucu.readAsDataURL(dosya);
    e.target.value = "";
  };

  const sifreDegistir = () => {
    setSifreBasarili(false);
    if (sifreForm.eski !== aktifKullanici.sifre) {
      setSifreHata("Mevcut şifre hatalı.");
      return;
    }
    if (sifreForm.yeni.length < 4) {
      setSifreHata("Yeni şifre en az 4 karakter olmalı.");
      return;
    }
    if (sifreForm.yeni !== sifreForm.tekrar) {
      setSifreHata("Yeni şifreler eşleşmiyor.");
      return;
    }
    updateDb((prev) => {
      const sonuc = R.islemKaydet(prev, {
        kullaniciAdi: aktifKullanici.adSoyad,
        islemTuru: "Şifre değiştirildi",
        aciklama: `${aktifKullanici.adSoyad} kendi şifresini değiştirdi`,
        eskiDeger: "—",
        yeniDeger: "—",
      });
      return { ...sonuc, kullanicilar: sonuc.kullanicilar.map((k) => (k.id === aktifKullanici.id ? { ...k, sifre: sifreForm.yeni } : k)) };
    });
    setSifreForm({ eski: "", yeni: "", tekrar: "" });
    setSifreHata("");
    setSifreBasarili(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "yedekleme", ad: "Yedekleme" },
          { id: "guvenlik", ad: "Güvenlik" },
          { id: "magaza", ad: "Mağaza Bilgileri" },
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

      {altSekme === "yedekleme" && (
        <div className="flex flex-col gap-4">
          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
              Son Yedek
            </h4>
            {sonYedek ? (
              <p className="text-sm" style={{ color: R.T.ink500 }}>
                {new Date(sonYedek.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} —{" "}
                <span style={{ color: R.T.green }}>Başarılı ✓</span> ({sonYedek.tur})
              </p>
            ) : (
              <p className="text-sm" style={{ color: R.T.red }}>
                Henüz hiç yedek alınmadı.
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <R.Buton onClick={() => yedekIndirVeKaydet("manuel")}>
                <R.Download size={15} /> Şimdi Yedek Al (Bilgisayara)
              </R.Buton>
              <R.Buton
                variant="ghost"
                onClick={() => {
                  if (
                    window.confirm(
                      "⚠️ Mevcut veriler seçilen yedekle değiştirilecek. Bu işlem geri alınamaz. Devam etmeden önce güncel verinizin bir yedeğini almanız önerilir. Dosya seçme ekranını açmak istiyor musunuz?"
                    )
                  ) {
                    yedekYukleRef.current?.click();
                  }
                }}
              >
                <R.Upload size={15} /> Yedekten Geri Yükle
              </R.Buton>
            </div>
            <p className="text-xs mt-2" style={{ color: R.T.ink500 }}>
              "Harici Diske" yedeklemek için indirilen dosyayı tarayıcının "Farklı Kaydet" penceresinden USB/harici
              diskteki bir klasöre kaydedebilirsiniz. <strong>Bulut sunucuya otomatik yedekleme, bu program bir sunucu
              bileşeni içermediği için desteklenmiyor</strong> — dilerseniz indirdiğiniz dosyayı kendi bulut
              hesabınıza (Google Drive, Dropbox vb.) elle yükleyebilirsiniz.
            </p>
          </R.Kart>

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Otomatik Yedekleme Hatırlatıcısı
            </h4>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Program bu saatte açıksa, o gün henüz yedek alınmadıysa köşede bir hatırlatma gösterir ve tek tıkla
              indirmenizi sağlar. Tarayıcı kapalıyken sessiz/arka planda yedekleme yapılamaz — bu, tarayıcı
              güvenlik kısıtlarından kaynaklanır.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={db.yedekAyarlari.aktif} onChange={(e) => ayarKaydet("aktif", e.target.checked)} />
                <span style={{ color: R.T.ink900 }}>Etkin</span>
              </label>
              <R.Secim label="Sıklık" value={db.yedekAyarlari.sıklik} onChange={(e) => ayarKaydet("sıklik", e.target.value)}>
                <option value="gunluk">Günlük</option>
                <option value="haftalik">Haftalık</option>
                <option value="aylik">Aylık</option>
              </R.Secim>
              <R.Girdi label="Saat" type="time" value={db.yedekAyarlari.saat} onChange={(e) => ayarKaydet("saat", e.target.value)} />
            </div>
            <p className="text-xs mt-2" style={{ color: R.T.ink500 }}>
              ör. Her gün 23:00 → Otomatik yedekle
            </p>
          </R.Kart>

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Yedek Geçmişi
            </h4>
            {db.yedekGecmisi.length === 0 ? (
              <p className="text-sm" style={{ color: R.T.ink500 }}>
                Henüz yedek alınmadı.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {db.yedekGecmisi.slice(0, 20).map((y) => (
                  <div key={y.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ color: R.T.ink900 }}>
                      {new Date(y.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-2">
                      <R.Rozet tone="steel">{y.tur}</R.Rozet>
                      <span style={{ color: R.T.green }}>✓</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </R.Kart>
        </div>
      )}

      {altSekme === "guvenlik" && (
        <div className="flex flex-col gap-4">
          <R.Kart className="p-4 max-w-sm">
            <h4 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Şifremi Değiştir
            </h4>
            <div className="flex flex-col gap-2.5">
              <R.Girdi label="Mevcut Şifre" type="password" value={sifreForm.eski} onChange={(e) => setSifreForm({ ...sifreForm, eski: e.target.value })} />
              <R.Girdi label="Yeni Şifre" type="password" value={sifreForm.yeni} onChange={(e) => setSifreForm({ ...sifreForm, yeni: e.target.value })} />
              <R.Girdi label="Yeni Şifre (Tekrar)" type="password" value={sifreForm.tekrar} onChange={(e) => setSifreForm({ ...sifreForm, tekrar: e.target.value })} />
              {sifreHata && (
                <p className="text-xs" style={{ color: R.T.red }}>
                  {sifreHata}
                </p>
              )}
              {sifreBasarili && (
                <p className="text-xs" style={{ color: R.T.green }}>
                  Şifreniz güncellendi.
                </p>
              )}
              <R.Buton onClick={sifreDegistir}>
                <R.Check size={14} /> Şifreyi Güncelle
              </R.Buton>
            </div>
          </R.Kart>

          {basarisizSonGirisler.length > 0 && (
            <R.Kart className="p-4" style={{ background: "#F9DEDE" }}>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5" style={{ color: R.T.red }}>
                <R.AlertTriangle size={14} /> Son Başarısız Giriş Denemeleri
              </h4>
              <div className="flex flex-col gap-1">
                {basarisizSonGirisler.map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-xs">
                    <span style={{ color: R.T.ink900 }}>{g.kullaniciAdi}</span>
                    <span style={{ color: R.T.ink500 }}>
                      {new Date(g.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </R.Kart>
          )}

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Kullanıcı Oturum Geçmişi
            </h4>
            {sonGirisler.length === 0 ? (
              <p className="text-sm" style={{ color: R.T.ink500 }}>
                Henüz giriş kaydı yok.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-2 py-1.5">Kullanıcı</th>
                      <th className="text-left font-semibold px-2 py-1.5">Tarih/Saat</th>
                      <th className="text-center font-semibold px-2 py-1.5">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sonGirisler.map((g) => (
                      <tr key={g.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-2 py-1.5" style={{ color: R.T.ink900 }}>
                          {g.kullaniciAdi}
                        </td>
                        <td className="px-2 py-1.5" style={{ color: R.T.ink500 }}>
                          {new Date(g.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <R.Rozet tone={g.basarili ? "green" : "red"}>{g.basarili ? "Başarılı" : "Başarısız"}</R.Rozet>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </R.Kart>

          <R.Kart className="p-4">
            <p className="text-xs" style={{ color: R.T.ink500 }}>
              Otomatik ekran kilidi <strong>15 dakika</strong> hareketsizlik sonrasında etkinleşir — oturum kapanır,
              tekrar kullanıcı adı/şifre ile giriş gerekir; hiçbir veri kaybolmaz. Kritik işlemlerde (maliyet altı
              satış, minimum fiyat altı satış, POS'ta manuel fiyat değişikliği, satış iptali gibi) ayrıca yönetici
              kimlik doğrulaması istenir.
            </p>
          </R.Kart>
        </div>
      )}

      {altSekme === "magaza" && (
        <div className="max-w-md flex flex-col gap-4">
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Bu bilgiler basılan satış fişi/fatura/irsaliye gibi tüm belgelerin üst kısmında görünür.
          </p>
          <R.Kart className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded flex items-center justify-center shrink-0 overflow-hidden" style={{ background: R.T.steel100 }}>
                {magazaForm.logo ? <img src={magazaForm.logo} alt="" className="w-full h-full object-contain" /> : <R.Building2 size={20} style={{ color: R.T.ink500 }} />}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => magazaLogoInputRef.current?.click()} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ border: `1px solid ${R.T.steel300}`, color: R.T.ink900 }}>
                  Logo Seç
                </button>
                {magazaForm.logo && (
                  <button onClick={() => setMagazaForm((f) => ({ ...f, logo: "" }))} className="text-xs" style={{ color: R.T.red }}>
                    Kaldır
                  </button>
                )}
                <input ref={magazaLogoInputRef} type="file" accept="image/*" onChange={magazaLogoSec} className="hidden" />
              </div>
            </div>
            <R.Girdi label="Mağaza Adı" value={magazaForm.ad} onChange={(e) => setMagazaForm({ ...magazaForm, ad: e.target.value })} />
            <R.Girdi label="Adres" value={magazaForm.adres} onChange={(e) => setMagazaForm({ ...magazaForm, adres: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <R.Girdi label="Telefon" value={magazaForm.telefon} onChange={(e) => setMagazaForm({ ...magazaForm, telefon: e.target.value })} />
              <R.Girdi label="E-posta" value={magazaForm.eposta} onChange={(e) => setMagazaForm({ ...magazaForm, eposta: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <R.Girdi label="Vergi Dairesi" value={magazaForm.vergiDairesi} onChange={(e) => setMagazaForm({ ...magazaForm, vergiDairesi: e.target.value })} />
              <R.Girdi label="Vergi No" value={magazaForm.vergiNo} onChange={(e) => setMagazaForm({ ...magazaForm, vergiNo: e.target.value })} />
            </div>
            <R.Buton onClick={magazaKaydet}>
              <R.Check size={15} /> Kaydet
            </R.Buton>
          </R.Kart>
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            E-fatura/e-belge entegrasyonu (GİB entegratörü, dijital imza vb.) gerçek bir sunucu bileşeni ve resmi
            entegratör anlaşması gerektirdiğinden bu tarayıcı-içi uygulamada yer almıyor. Ancak veri modeli buna hazır
            tutuldu: her satışta bir <code>eFatura</code> alanı (durum + e-fatura no) zaten saklanıyor — ileride gerçek
            bir entegrasyon eklendiğinde sadece bu alanın doldurulması yeterli olacak.
          </p>
        </div>
      )}
    </div>
  );
}
