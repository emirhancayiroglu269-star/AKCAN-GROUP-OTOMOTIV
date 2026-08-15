/* Alış/Tedarikçi ekranı — ayrıştırılmış bileşen.
 * Finans ve veri sözleşmeleri değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function OdemePlaniDuzenleyici({ db, updateDb, fatura }) {
  const [tarih, setTarih] = R.useState("");
  const [tutar, setTutar] = R.useState("");

  const taksitEkle = () => {
    if (!tarih || !parseFloat(tutar)) {
      R.bildirimGoster("Tarih ve tutar girin.", "hata");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      malAlimlari: prev.malAlimlari.map((m) => (m.id === fatura.id ? { ...m, odemePlani: [...(m.odemePlani || []), { id: R.yeniId("op"), tarih, tutar: parseFloat(tutar), odendi: false }] } : m)),
    }));
    setTarih("");
    setTutar("");
  };
  const taksitSil = (taksitId) => {
    updateDb((prev) => ({ ...prev, malAlimlari: prev.malAlimlari.map((m) => (m.id === fatura.id ? { ...m, odemePlani: m.odemePlani.filter((t) => t.id !== taksitId) } : m)) }));
  };
  const taksitOdendiToggle = (taksitId) => {
    updateDb((prev) => ({
      ...prev,
      malAlimlari: prev.malAlimlari.map((m) => (m.id === fatura.id ? { ...m, odemePlani: m.odemePlani.map((t) => (t.id === taksitId ? { ...t, odendi: !t.odendi } : t)) } : m)),
    }));
  };

  const plan = db.malAlimlari.find((m) => m.id === fatura.id)?.odemePlani || [];
  const planToplami = plan.reduce((t, x) => t + x.tutar, 0);

  return (
    <div className="px-2.5 pb-2.5">
      {plan.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {plan.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded" style={{ background: "#fff" }}>
              <label className="flex items-center gap-1.5" style={{ color: t.odendi ? R.T.green : R.T.ink900 }}>
                <input type="checkbox" checked={t.odendi} onChange={() => taksitOdendiToggle(t.id)} />
                {R.tarihGoster(t.tarih)} → {R.tl(t.tutar)} {t.odendi && "✅"}
              </label>
              <button onClick={() => taksitSil(t.id)} style={{ color: R.T.red }}>
                <R.Trash2 size={12} />
              </button>
            </div>
          ))}
          {planToplami !== (fatura.faturaGirilenToplam ?? fatura.hesaplananGenelToplam) && (
            <p className="text-xs" style={{ color: "#8A6110" }}>
              ⚠️ Taksit toplamı ({R.tl(planToplami)}) fatura tutarından farklı.
            </p>
          )}
        </div>
      )}
      <div className="flex gap-1.5">
        <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="px-2 py-1 rounded border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
        <input type="number" value={tutar} onChange={(e) => setTutar(e.target.value)} placeholder="Tutar" className="w-24 px-2 py-1 rounded border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
        <button onClick={taksitEkle} className="text-xs font-semibold px-2 py-1 rounded" style={{ background: R.T.orange, color: "#fff" }}>
          Taksit Ekle
        </button>
      </div>
    </div>
  );
}
