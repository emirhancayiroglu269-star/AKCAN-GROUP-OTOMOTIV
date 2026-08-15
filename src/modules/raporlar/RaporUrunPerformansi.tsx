/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporUrunPerformansi({ db, filtrePaneli, tumKalemler }) {
  const [siralama, setSiralama] = R.useState("cok-satan");

  const urunHaritasi = {};
  tumKalemler.forEach((k) => {
    if (!urunHaritasi[k.parcaId]) urunHaritasi[k.parcaId] = { parcaId: k.parcaId, ad: k.ad, marka: k.marka, adet: 0, ciro: 0, kar: 0 };
    urunHaritasi[k.parcaId].adet += k.adet;
    urunHaritasi[k.parcaId].ciro += k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0);
    urunHaritasi[k.parcaId].kar += R.satisKalemiKarBilgisi(k).karToplam;
  });
  const satilanlar = Object.values(urunHaritasi);

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);
  const hicSatilmayanlar = aktifParcalar.filter((p) => !satilanlar.some((x) => x.parcaId === p.id));

  const hizDagilim = aktifParcalar
    .map((p) => ({ p, hiz: R.sonNGunSatisAdedi(db, p.id, 30) }))
    .filter((x) => x.hiz > 0);

  let liste = [];
  if (siralama === "cok-satan") liste = [...satilanlar].sort((a, b) => b.adet - a.adet).slice(0, 100);
  else if (siralama === "cok-ciro") liste = [...satilanlar].sort((a, b) => b.ciro - a.ciro).slice(0, 100);
  else if (siralama === "cok-kar") liste = [...satilanlar].sort((a, b) => b.kar - a.kar).slice(0, 100);
  else if (siralama === "hizli") liste = [...hizDagilim].sort((a, b) => b.hiz - a.hiz).slice(0, 50).map((x) => ({ parcaId: x.p.id, ad: x.p.ad, marka: x.p.marka, adet: x.hiz, ciro: null, kar: null }));
  else if (siralama === "yavas")
    liste = aktifParcalar
      .filter((p) => (p.stok || 0) > 0)
      .map((p) => ({ p, hiz: R.sonNGunSatisAdedi(db, p.id, 30) }))
      .sort((a, b) => a.hiz - b.hiz)
      .slice(0, 50)
      .map((x) => ({ parcaId: x.p.id, ad: x.p.ad, marka: x.p.marka, adet: x.hiz, ciro: null, kar: null }));

  return (
    <div className="flex flex-col gap-4">
      {filtrePaneli}
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "cok-satan", ad: "En Çok Satan" },
          { id: "cok-ciro", ad: "En Çok Ciro" },
          { id: "cok-kar", ad: "En Çok Kâr" },
          { id: "hizli", ad: "En Hızlı Dönen" },
          { id: "yavas", ad: "En Yavaş Dönen" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSiralama(s.id)}
            className="flex-1 py-2 text-xs font-semibold whitespace-nowrap px-2"
            style={{ background: siralama === s.id ? R.T.graphite900 : "#fff", color: siralama === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      <R.Kart className="overflow-hidden">
        <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                <th className="text-left font-semibold px-3 py-2">#</th>
                <th className="text-left font-semibold px-2 py-2">Ürün / Marka</th>
                <th className="text-right font-semibold px-2 py-2">Adet</th>
                {liste.some((x) => x.ciro !== null) && <th className="text-right font-semibold px-2 py-2">Ciro</th>}
                {liste.some((x) => x.kar !== null) && <th className="text-right font-semibold px-2 py-2">Kâr</th>}
              </tr>
            </thead>
            <tbody>
              {liste.map((x, i) => (
                <tr key={x.parcaId} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                  <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                    {i + 1}
                  </td>
                  <td className="px-2 py-2">
                    <div style={{ color: R.T.ink900 }}>{x.ad}</div>
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      {x.marka}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold" style={R.MONO}>
                    {x.adet}
                  </td>
                  {liste.some((y) => y.ciro !== null) && (
                    <td className="px-2 py-2 text-right" style={R.MONO}>
                      {x.ciro !== null ? R.tl(x.ciro) : "—"}
                    </td>
                  )}
                  {liste.some((y) => y.kar !== null) && (
                    <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: x.kar >= 0 ? R.T.green : R.T.red }}>
                      {x.kar !== null ? R.tl(x.kar) : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </R.Kart>

      <R.Kart className="p-4">
        <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Hiç Satılmayan Ürünler ({hicSatilmayanlar.length})
        </h4>
        {hicSatilmayanlar.length === 0 ? (
          <p className="text-sm" style={{ color: R.T.ink500 }}>
            Bu aralıkta filtrelere uyan her ürün en az bir kez satılmış.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {hicSatilmayanlar.slice(0, 40).map((p) => (
              <R.Rozet key={p.id} tone="steel">
                {p.ad}
              </R.Rozet>
            ))}
            {hicSatilmayanlar.length > 40 && <span className="text-xs" style={{ color: R.T.ink500 }}>+{hicSatilmayanlar.length - 40} daha</span>}
          </div>
        )}
      </R.Kart>
    </div>
  );
}
