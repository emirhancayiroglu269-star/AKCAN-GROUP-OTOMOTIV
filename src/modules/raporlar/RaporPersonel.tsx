/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporPersonel({ db, filtrePaneli, tumKalemler, tarihliSatislar, baslangic, bitis }) {
  const iadeler = db.iadeler.filter((i) => i.tarih.slice(0, 10) >= baslangic && i.tarih.slice(0, 10) <= bitis);
  const kapanmisVardiyalar = db.vardiyalar.filter((v) => v.durum !== "Açık" && v.kapanisZamani && v.kapanisZamani.slice(0, 10) >= baslangic && v.kapanisZamani.slice(0, 10) <= bitis && v.kasaFarki !== null);

  const personeller = [...new Set(tarihliSatislar.map((s) => s.satisiYapan).filter(Boolean))];
  const satirlar = personeller
    .map((ad) => {
      const buPersonelinSatislari = tarihliSatislar.filter((s) => s.satisiYapan === ad);
      const buPersonelinKalemleri = tumKalemler.filter((k) => k.satisiYapan === ad);
      const ciro = buPersonelinSatislari.reduce((t, s) => t + s.genelToplam, 0);
      const satisAdedi = buPersonelinSatislari.length;
      const iskonto = buPersonelinSatislari.reduce((t, s) => t + s.iskontoToplam, 0);
      const brutKar = buPersonelinKalemleri.reduce((t, k) => t + R.satisKalemiKarBilgisi(k).karToplam, 0);
      const iade = iadeler.filter((i) => i.iadeyiAlan === ad).reduce((t, i) => t + i.tutar, 0);
      const kasaFarki = kapanmisVardiyalar.filter((v) => v.kullaniciAdi === ad).reduce((t, v) => t + v.kasaFarki, 0);
      return { ad, ciro, satisAdedi, ortalamaSepet: satisAdedi > 0 ? ciro / satisAdedi : 0, brutKar, iskonto, iade, kasaFarki };
    })
    .sort((a, b) => b.ciro - a.ciro);

  return (
    <div className="flex flex-col gap-4">
      {filtrePaneli}
      {satirlar.length === 0 ? (
        <R.Kart>
          <R.Bos ikon={R.Users} baslik="Bu aralıkta satış yapan personel yok" aciklama="Filtreyi genişletmeyi deneyin." />
        </R.Kart>
      ) : (
        <R.Kart className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  <th className="text-left font-semibold px-3 py-2.5">Personel</th>
                  <th className="text-right font-semibold px-3 py-2.5">Ciro</th>
                  <th className="text-right font-semibold px-3 py-2.5">Satış Adedi</th>
                  <th className="text-right font-semibold px-3 py-2.5">Ort. Sepet</th>
                  <th className="text-right font-semibold px-3 py-2.5">Brüt Kâr</th>
                  <th className="text-right font-semibold px-3 py-2.5">İskonto</th>
                  <th className="text-right font-semibold px-3 py-2.5">İade</th>
                  <th className="text-right font-semibold px-3 py-2.5">Kasa Farkı</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((x) => (
                  <tr key={x.ad} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                    <td className="px-3 py-2.5 font-medium" style={{ color: R.T.ink900 }}>
                      {x.ad}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold" style={R.MONO}>
                      {R.tl(x.ciro)}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={R.MONO}>
                      {x.satisAdedi}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={R.MONO}>
                      {R.tl(x.ortalamaSepet)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold" style={{ ...R.MONO, color: x.brutKar >= 0 ? R.T.green : R.T.red }}>
                      {R.tl(x.brutKar)}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                      {R.tl(x.iskonto)}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ ...R.MONO, color: x.iade > 0 ? R.T.red : R.T.ink500 }}>
                      {x.iade > 0 ? R.tl(x.iade) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold" style={{ ...R.MONO, color: x.kasaFarki === 0 ? R.T.ink500 : Math.abs(x.kasaFarki) < 0.5 ? R.T.green : R.T.red }}>
                      {kapanmisVardiyalar.some((v) => v.kullaniciAdi === x.ad) ? `${x.kasaFarki >= 0 ? "+" : ""}${R.tl(x.kasaFarki)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </R.Kart>
      )}
    </div>
  );
}
