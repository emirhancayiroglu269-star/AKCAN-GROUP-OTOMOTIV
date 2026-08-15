import React, { useState } from "react";
import { Car, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { bildirimGoster } from "../lib/bildirim";
import { yeniId, tl } from "../lib/format";
import { UYUMLULUK_DURUMLARI, uyumlulukGorseli, aracEtiketi, aracUyumluParcalari } from "../lib/arac";
import { Kart, Buton, Girdi, Secim, Bos } from "../components/ui";

const bosAracForm = { marka: "", model: "", kasa: "", yilBaslangic: "", yilBitis: "", motor: "", motorKodu: "", yakit: "Dizel", guc: "" };
const YAKIT_TIPLERI = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"];

export function AracSayfasi({ db, updateDb, sepet, setSepet }) {
  const [altSekme, setAltSekme] = useState("ara"); // "ara" | "veritabani"

  // --- Araç Veritabanı ---------------------------------------------------------
  const [aracAra, setAracAra] = useState("");
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [form, setForm] = useState(bosAracForm);
  const [silinecek, setSilinecek] = useState(null);

  const filtreliAraclar = db.araclar
    .filter((a) => !aracAra.trim() || aracEtiketi(a).toLowerCase().includes(aracAra.trim().toLowerCase()))
    .sort((a, b) => aracEtiketi(a).localeCompare(aracEtiketi(b), "tr"));

  const formuAc = (a) => {
    if (a) {
      setForm({
        marka: a.marka,
        model: a.model,
        kasa: a.kasa || "",
        yilBaslangic: String(a.yilBaslangic),
        yilBitis: String(a.yilBitis),
        motor: a.motor,
        motorKodu: a.motorKodu || "",
        yakit: a.yakit || "Dizel",
        guc: a.guc || "",
      });
      setDuzenlenenId(a.id);
    } else {
      setForm(bosAracForm);
      setDuzenlenenId("yeni");
    }
    setFormAcik(true);
  };

  const kaydet = () => {
    if (!form.marka.trim() || !form.model.trim() || !form.motor.trim()) {
      bildirimGoster("Marka, Model ve Motor zorunludur.", "hata");
      return;
    }
    const kayit = {
      marka: form.marka.trim(),
      model: form.model.trim(),
      kasa: form.kasa.trim(),
      yilBaslangic: parseInt(form.yilBaslangic) || new Date().getFullYear(),
      yilBitis: parseInt(form.yilBitis) || new Date().getFullYear(),
      motor: form.motor.trim(),
      motorKodu: form.motorKodu.trim(),
      yakit: form.yakit,
      guc: form.guc.trim(),
    };
    if (duzenlenenId === "yeni") {
      updateDb((prev) => ({ ...prev, araclar: [{ id: yeniId("arac"), ...kayit, aktif: true }, ...prev.araclar] }));
      bildirimGoster("Araç eklendi.", "basari");
    } else {
      updateDb((prev) => ({ ...prev, araclar: prev.araclar.map((a) => (a.id === duzenlenenId ? { ...a, ...kayit } : a)) }));
      bildirimGoster("Araç güncellendi.", "basari");
    }
    setFormAcik(false);
  };

  const aracSil = (arac) => {
    updateDb((prev) => ({
      ...prev,
      araclar: prev.araclar.filter((a) => a.id !== arac.id),
      // Araç silinince ona bağlı ürün-araç eşleştirmeleri de (yetim kalmasın diye) silinir.
      uyumluluklar: prev.uyumluluklar.filter((u) => u.aracId !== arac.id),
    }));
    setSilinecek(null);
    bildirimGoster("Araç silindi.", "basari");
  };

  // --- Araca Göre Ara ---------------------------------------------------------
  const [secilenMarka, setSecilenMarka] = useState("");
  const [secilenModel, setSecilenModel] = useState("");
  const [secilenYil, setSecilenYil] = useState("");
  const [secilenAracId, setSecilenAracId] = useState("");

  const aktifAraclar = db.araclar.filter((a) => a.aktif !== false);
  const markaSecenekleri = [...new Set(aktifAraclar.map((a) => a.marka))].sort();
  const modelSecenekleri = secilenMarka ? [...new Set(aktifAraclar.filter((a) => a.marka === secilenMarka).map((a) => a.model))].sort() : [];
  const yilAdayAraclari = secilenModel
    ? aktifAraclar.filter((a) => a.marka === secilenMarka && a.model === secilenModel && (!secilenYil || (parseInt(secilenYil) >= a.yilBaslangic && parseInt(secilenYil) <= a.yilBitis)))
    : [];
  const secilenArac = secilenAracId ? db.araclar.find((a) => a.id === secilenAracId) : null;

  const secimiSifirla = () => {
    setSecilenMarka("");
    setSecilenModel("");
    setSecilenYil("");
    setSecilenAracId("");
  };

  const eslesenler = secilenArac ? aracUyumluParcalari(db, secilenArac.id, true) : [];
  const kategoriGruplari = (() => {
    const harita = {};
    eslesenler.forEach((e) => {
      const kat = e.parca.kategori || e.parca.anaKategori || "Diğer";
      if (!harita[kat]) harita[kat] = [];
      harita[kat].push(e);
    });
    return Object.entries(harita).sort((a, b) => a[0].localeCompare(b[0], "tr"));
  })();

  const sepeteEkle = (p) => {
    if (!setSepet) return;
    setSepet((prev) => {
      const mevcut = prev.find((s) => s.parcaId === p.id);
      if (mevcut) return prev.map((s) => (s.parcaId === p.id ? { ...s, adet: s.adet + 1 } : s));
      return [...prev, { parcaId: p.id, adet: 1 }];
    });
    bildirimGoster(`${p.ad} sepete eklendi.`, "basari");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: T.steel300 }}>
        {[
          { id: "ara", ad: "Araca Göre Ara" },
          { id: "veritabani", ad: "Araç Veritabanı" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{ background: altSekme === s.id ? T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "ara" && (
        <div className="flex flex-col gap-4">
          <Kart className="p-4">
            <div className="flex flex-wrap items-end gap-2">
              <Secim
                label="Marka"
                value={secilenMarka}
                onChange={(e) => {
                  setSecilenMarka(e.target.value);
                  setSecilenModel("");
                  setSecilenYil("");
                  setSecilenAracId("");
                }}
              >
                <option value="">Seçin…</option>
                {markaSecenekleri.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Secim>
              <Secim
                label="Model"
                value={secilenModel}
                onChange={(e) => {
                  setSecilenModel(e.target.value);
                  setSecilenYil("");
                  setSecilenAracId("");
                }}
                disabled={!secilenMarka}
              >
                <option value="">{secilenMarka ? "Seçin…" : "Önce marka seçin"}</option>
                {modelSecenekleri.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Secim>
              <Girdi
                label="Yıl"
                type="number"
                value={secilenYil}
                onChange={(e) => {
                  setSecilenYil(e.target.value);
                  setSecilenAracId("");
                }}
                placeholder="ör. 2016"
                disabled={!secilenModel}
              />
              <Secim label="Motor" value={secilenAracId} onChange={(e) => setSecilenAracId(e.target.value)} disabled={yilAdayAraclari.length === 0}>
                <option value="">{yilAdayAraclari.length > 0 ? "Seçin…" : "Önce yıl girin"}</option>
                {yilAdayAraclari.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.motor} {a.motorKodu && `(${a.motorKodu})`} — {a.guc}
                  </option>
                ))}
              </Secim>
              {(secilenMarka || secilenModel) && (
                <button onClick={secimiSifirla} className="text-xs font-semibold underline" style={{ color: T.ink500 }}>
                  Sıfırla
                </button>
              )}
            </div>
          </Kart>

          {secilenArac && (
            <>
              <div className="px-3.5 py-2.5 rounded-md text-sm font-semibold" style={{ background: "#FDF1D6", color: "#8A6110" }}>
                {secilenYil || `${secilenArac.yilBaslangic}–${secilenArac.yilBitis}`} {aracEtiketi(secilenArac)}
              </div>
              {kategoriGruplari.length === 0 ? (
                <Kart>
                  <Bos ikon={Car} baslik="Uyumlu ürün bulunamadı" aciklama="Bu araca henüz stokta ürün eşleştirilmedi veya stokta yok." />
                </Kart>
              ) : (
                kategoriGruplari.map(([kategori, urunler]) => (
                  <Kart key={kategori} className="overflow-hidden">
                    <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${T.steel200}`, background: T.steel100 }}>
                      <span className="text-sm font-semibold" style={{ color: T.ink900 }}>
                        {kategori}
                      </span>
                    </div>
                    {urunler.map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-4 py-2.5 text-sm" style={{ borderTop: `1px solid ${T.steel200}` }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold shrink-0" style={{ color: uyumlulukGorseli[u.durum].ton === "green" ? T.green : "#8A6110" }}>
                            {uyumlulukGorseli[u.durum].emoji}
                          </span>
                          <span style={{ color: T.ink900 }}>
                            {u.parca.marka} — {u.parca.ad}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span style={MONO}>
                            {u.parca.stok} {u.parca.birim}
                          </span>
                          <span className="font-semibold" style={MONO}>
                            {tl(u.parca.satisFiyati)}
                          </span>
                          {setSepet && (
                            <button onClick={() => sepeteEkle(u.parca)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: T.orange, color: "#fff" }}>
                              Sepete Ekle
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </Kart>
                ))
              )}
            </>
          )}
        </div>
      )}

      {altSekme === "veritabani" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <input
              value={aracAra}
              onChange={(e) => setAracAra(e.target.value)}
              placeholder="Araç ara…"
              className="flex-1 max-w-sm px-3 py-2 rounded-md border text-sm outline-none"
              style={{ borderColor: T.steel300 }}
            />
            <Buton onClick={() => formuAc(null)}>
              <Plus size={15} /> Yeni Araç
            </Buton>
          </div>
          <Kart className="overflow-hidden">
            {filtreliAraclar.length === 0 ? (
              <Bos ikon={Car} baslik="Araç yok" aciklama="Yeni araç ekleyin." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: T.steel100, color: T.ink500 }}>
                      <th className="text-left font-semibold px-3 py-2">Marka / Model</th>
                      <th className="text-left font-semibold px-2 py-2">Kasa</th>
                      <th className="text-left font-semibold px-2 py-2">Yıl</th>
                      <th className="text-left font-semibold px-2 py-2">Motor</th>
                      <th className="text-left font-semibold px-2 py-2">Motor Kodu</th>
                      <th className="text-left font-semibold px-2 py-2">Yakıt</th>
                      <th className="text-left font-semibold px-2 py-2">Güç</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtreliAraclar.map((a) => (
                      <tr key={a.id} style={{ borderTop: `1px solid ${T.steel200}`, opacity: a.aktif === false ? 0.5 : 1 }}>
                        <td className="px-3 py-2" style={{ color: T.ink900 }}>
                          {a.marka} {a.model}
                        </td>
                        <td className="px-2 py-2" style={{ color: T.ink500 }}>
                          {a.kasa || "—"}
                        </td>
                        <td className="px-2 py-2" style={MONO}>
                          {a.yilBaslangic}–{a.yilBitis}
                        </td>
                        <td className="px-2 py-2" style={{ color: T.ink900 }}>
                          {a.motor}
                        </td>
                        <td className="px-2 py-2" style={MONO}>
                          {a.motorKodu || "—"}
                        </td>
                        <td className="px-2 py-2" style={{ color: T.ink500 }}>
                          {a.yakit}
                        </td>
                        <td className="px-2 py-2" style={{ color: T.ink500 }}>
                          {a.guc || "—"}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => formuAc(a)} style={{ color: T.ink500 }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setSilinecek(a)} style={{ color: T.red }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Kart>
        </div>
      )}

      {/* Araç ekle/düzenle formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: T.ink900 }}>
              {duzenlenenId === "yeni" ? "Yeni Araç" : "Aracı Düzenle"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Girdi label="Marka *" value={form.marka} onChange={(e) => setForm({ ...form, marka: e.target.value })} placeholder="ör. Volkswagen" />
              <Girdi label="Model *" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="ör. Golf" />
              <Girdi label="Kasa" value={form.kasa} onChange={(e) => setForm({ ...form, kasa: e.target.value })} placeholder="ör. 7" />
              <div className="grid grid-cols-2 gap-2">
                <Girdi label="Yıl Başlangıç" type="number" value={form.yilBaslangic} onChange={(e) => setForm({ ...form, yilBaslangic: e.target.value })} placeholder="2013" />
                <Girdi label="Yıl Bitiş" type="number" value={form.yilBitis} onChange={(e) => setForm({ ...form, yilBitis: e.target.value })} placeholder="2017" />
              </div>
              <Girdi label="Motor *" value={form.motor} onChange={(e) => setForm({ ...form, motor: e.target.value })} placeholder="ör. 1.6 TDI" />
              <Girdi label="Motor Kodu" value={form.motorKodu} onChange={(e) => setForm({ ...form, motorKodu: e.target.value })} placeholder="ör. CXXB" />
              <Secim label="Yakıt" value={form.yakit} onChange={(e) => setForm({ ...form, yakit: e.target.value })}>
                {YAKIT_TIPLERI.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Secim>
              <Girdi label="Güç" value={form.guc} onChange={(e) => setForm({ ...form, guc: e.target.value })} placeholder="ör. 110 HP" />
            </div>
            <div className="flex gap-2 pt-4 mt-4" style={{ borderTop: `1px solid ${T.steel200}` }}>
              <Buton onClick={kaydet}>
                <Check size={15} /> Kaydet
              </Buton>
              <Buton variant="ghost" onClick={() => setFormAcik(false)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {silinecek && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSilinecek(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
              "{aracEtiketi(silinecek)}" silinsin mi?
            </h3>
            <p className="text-sm mb-4" style={{ color: T.ink500 }}>
              Bu araca bağlı tüm ürün eşleştirmeleri de birlikte silinecek.
            </p>
            <div className="flex gap-2">
              <Buton variant="danger" onClick={() => aracSil(silinecek)}>
                <Trash2 size={14} /> Sil
              </Buton>
              <Buton variant="ghost" onClick={() => setSilinecek(null)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
