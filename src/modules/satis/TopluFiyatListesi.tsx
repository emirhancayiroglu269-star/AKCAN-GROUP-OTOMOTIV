/* Extracted from Satis.tsx — public component kept self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function TopluFiyatListesi({ db }) {
  const [markaFiltre, setMarkaFiltre] = R.useState("");
  const [kategoriFiltre, setKategoriFiltre] = R.useState("");
  const [secililer, setSecililer] = R.useState({});

  const markalar = [...new Set(db.parcalar.map((p) => p.marka).filter(Boolean))].sort();
  const kategoriler = [...new Set(db.parcalar.map((p) => p.kategori).filter(Boolean))].sort();

  const sonuclar = db.parcalar.filter((p) => p.aktif !== false && (!markaFiltre || p.marka === markaFiltre) && (!kategoriFiltre || p.kategori === kategoriFiltre));

  const tumunuSec = () => {
    const yeni = {};
    sonuclar.forEach((p) => (yeni[p.id] = true));
    setSecililer(yeni);
  };
  const secimiTemizle = () => setSecililer({});
  const seciliSayisi = Object.values(secililer).filter(Boolean).length;

  const yazdir = () => {
    const secilenler = sonuclar.filter((p) => secililer[p.id]);
    if (secilenler.length === 0) {
      R.bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const pencere = window.open("", "_blank");
    if (!pencere) return;
    const magaza = db.magazaBilgileri || {};
    const satirlarHtml = secilenler
      .map((p) => {
        const oem = db.kodlar.find((k) => k.parcaId === p.id && k.tip === "OEM");
        return `<tr><td>${p.marka}</td><td>${p.ad}</td><td>${oem?.kod || "—"}</td><td style="text-align:right;font-weight:600">${R.tl(p.satisFiyati)}</td></tr>`;
      })
      .join("");
    pencere.document.write(`
      <html><head><title>Fiyat Listesi</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 4px; } .sub { color: #666; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; } th { background: #f5f5f5; }
      </style></head>
      <body>
        <h1>${magaza.ad || "Mağaza"}</h1>
        <div class="sub">Fiyat Listesi — ${new Date().toLocaleDateString("tr-TR")}${markaFiltre ? ` · ${markaFiltre}` : ""}${kategoriFiltre ? ` · ${kategoriFiltre}` : ""}</div>
        <table><thead><tr><th>Marka</th><th>Ürün</th><th>OEM</th><th>Fiyat</th></tr></thead><tbody>${satirlarHtml}</tbody></table>
      </body></html>
    `);
    pencere.document.close();
    pencere.print();
  };

  return (
    <div className="flex flex-col gap-4">
      <R.Kart className="p-3.5 flex flex-wrap items-end gap-2">
        <select value={markaFiltre} onChange={(e) => setMarkaFiltre(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
          <option value="">Tüm Markalar</option>
          {markalar.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select value={kategoriFiltre} onChange={(e) => setKategoriFiltre(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
          <option value="">Tüm Kategoriler</option>
          {kategoriler.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <span className="text-xs" style={{ color: R.T.ink500 }}>
          {sonuclar.length} ürün bulundu
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={tumunuSec} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
            Tümünü Seç
          </button>
          <button onClick={secimiTemizle} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
            Temizle
          </button>
          <R.Buton onClick={yazdir} disabled={seciliSayisi === 0}>
            <R.Printer size={14} /> Yazdır ({seciliSayisi})
          </R.Buton>
        </div>
      </R.Kart>
      <R.Kart className="overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                <th className="px-3 py-2"></th>
                <th className="text-left font-semibold px-3 py-2">Marka</th>
                <th className="text-left font-semibold px-3 py-2">Ürün</th>
                <th className="text-right font-semibold px-3 py-2">Fiyat</th>
              </tr>
            </thead>
            <tbody>
              {sonuclar.map((p) => (
                <tr key={p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={!!secililer[p.id]} onChange={(e) => setSecililer({ ...secililer, [p.id]: e.target.checked })} />
                  </td>
                  <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                    {p.marka}
                  </td>
                  <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                    {p.ad}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold" style={R.MONO}>
                    {R.tl(p.satisFiyati)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </R.Kart>
    </div>
  );
}
