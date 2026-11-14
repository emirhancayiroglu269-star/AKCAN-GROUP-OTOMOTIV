/* Stok — okutulan barkod bulunamadığında açılan modal (Stok.tsx'ten bölündü).
   Kullanıcı buradan yeni ürün kartı açabilir veya mevcut ürüne barkod ekleyebilir. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

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
