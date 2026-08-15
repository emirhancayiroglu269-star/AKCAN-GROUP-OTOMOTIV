/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporFiyatAnalizi({ db }) {
  const [hedefTuru, setHedefTuru] = R.useState("marka");
  const [hedefDeger, setHedefDeger] = R.useState("");
  const markalar = [...new Set(db.parcalar.map((p) => p.marka).filter(Boolean))].sort();
  const kategoriler = [...new Set(db.parcalar.map((p) => p.kategori).filter(Boolean))].sort();

  const urunler = hedefDeger
    ? db.parcalar.filter((p) => (hedefTuru === "marka" ? p.marka === hedefDeger : p.kategori === hedefDeger || p.anaKategori === hedefDeger))
    : [];

  // Son 6 ayı aylık dilimlere böler, her ay için gruptaki ürünlerin o ay
  // yapılan alışlarının ortalama birim fiyatını hesaplar.
  const aylikTrend = (() => {
    if (urunler.length === 0) return [];
    const tumAlislar = urunler.flatMap((p) => (p.alisGecmisi || []).map((g) => ({ ...g, parcaId: p.id })));
    const aylar = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      aylar.push({ yil: d.getFullYear(), ay: d.getMonth(), etiket: d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }) });
    }
    return aylar.map((a) => {
      const buAyAlislar = tumAlislar.filter((g) => {
        const gd = new Date(g.tarih);
        return gd.getFullYear() === a.yil && gd.getMonth() === a.ay;
      });
      const ortalama = buAyAlislar.length > 0 ? buAyAlislar.reduce((t, g) => t + g.birimFiyat, 0) / buAyAlislar.length : null;
      return { ...a, ortalama, adet: buAyAlislar.length };
    });
  })();

  const doluAylar = aylikTrend.filter((a) => a.ortalama !== null);
  const ilkOrtalama = doluAylar[0]?.ortalama ?? null;
  const sonOrtalama = doluAylar[doluAylar.length - 1]?.ortalama ?? null;
  const genelDegisim = ilkOrtalama !== null && sonOrtalama !== null ? R.fiyatDegisimYuzdesi(ilkOrtalama, sonOrtalama) : null;

  const urunBazindaOzet = urunler
    .map((p) => {
      const ist = R.urunAlisIstatistikleri(db, p.id);
      return ist ? { parca: p, ...ist, degisim: R.fiyatDegisimYuzdesi(ist.tumGecmis[ist.tumGecmis.length - 1].birimFiyat, ist.sonAlis.birimFiyat) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.degisim ?? 0) - Math.abs(a.degisim ?? 0));

  return (
    <div className="flex flex-col gap-4">
      <R.Kart className="p-3.5 flex flex-wrap items-end gap-2">
        <select value={hedefTuru} onChange={(e) => { setHedefTuru(e.target.value); setHedefDeger(""); }} className="px-2 py-2 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
          <option value="marka">Marka</option>
          <option value="kategori">Kategori</option>
        </select>
        <select value={hedefDeger} onChange={(e) => setHedefDeger(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
          <option value="">Seçin…</option>
          {(hedefTuru === "marka" ? markalar : kategoriler).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        {hedefDeger && (
          <span className="text-xs" style={{ color: R.T.ink500 }}>
            {urunler.length} ürün
          </span>
        )}
      </R.Kart>

      {hedefDeger && (
        <>
          {genelDegisim !== null && (
            <R.Kart className="p-4">
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {hedefDeger} — Ortalama Alış Değişimi (Son 6 Ay)
              </div>
              <div className="text-2xl font-semibold mt-1" style={{ ...R.DISPLAY, color: genelDegisim >= 0 ? R.T.red : R.T.green }}>
                {genelDegisim >= 0 ? "+" : ""}
                %{genelDegisim}
              </div>
              <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                {R.tl(ilkOrtalama)} → {R.tl(sonOrtalama)}
              </div>
            </R.Kart>
          )}

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Aylık Ortalama Alış Fiyatı Trendi
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {aylikTrend.map((a) => (
                <div key={`${a.yil}-${a.ay}`} className="rounded-md p-2 text-center" style={{ background: R.T.steel100 }}>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    {a.etiket}
                  </div>
                  <div className="text-sm font-semibold" style={{ ...R.MONO, color: a.ortalama !== null ? R.T.ink900 : R.T.steel300 }}>
                    {a.ortalama !== null ? R.tl(a.ortalama) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </R.Kart>

          <R.Kart className="overflow-hidden">
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Ürün Bazında Fiyat Değişimi
              </span>
            </div>
            {urunBazindaOzet.length === 0 ? (
              <R.Bos ikon={R.LineChart} baslik="Alış geçmişi yok" aciklama="Bu gruptaki ürünler için henüz alış kaydı bulunmuyor." />
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-3 py-2">Ürün</th>
                      <th className="text-right font-semibold px-2 py-2">Son Alış</th>
                      <th className="text-right font-semibold px-2 py-2">Ortalama</th>
                      <th className="text-right font-semibold px-3 py-2">Değişim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urunBazindaOzet.map((x) => (
                      <tr key={x.parca.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                          {x.parca.ad}
                        </td>
                        <td className="px-2 py-2 text-right" style={R.MONO}>
                          {R.tl(x.sonAlis.birimFiyat)}
                        </td>
                        <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                          {R.tl(x.ortalama)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ ...R.MONO, color: x.degisim === null ? R.T.ink500 : x.degisim >= 0 ? R.T.red : R.T.green }}>
                          {x.degisim === null ? "—" : `${x.degisim >= 0 ? "+" : ""}%${x.degisim}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </R.Kart>
        </>
      )}
    </div>
  );
}
