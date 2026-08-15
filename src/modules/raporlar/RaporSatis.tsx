/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporSatis({ db, filtrePaneli, tarihliSatislar, tumKalemler, baslangic, bitis }) {
  const ciro = tarihliSatislar.reduce((t, s) => t + s.genelToplam, 0);
  const adet = tarihliSatislar.length;
  const ortalamaSepet = adet > 0 ? ciro / adet : 0;
  const iskontoToplam = tarihliSatislar.reduce((t, s) => t + (s.iskontoToplam || 0), 0);
  const iadeToplam = db.iadeler.filter((i) => i.tarih.slice(0, 10) >= baslangic && i.tarih.slice(0, 10) <= bitis).reduce((t, i) => t + i.tutar, 0);

  const saatlikDagilim = Array.from({ length: 24 }, (_, saat) => ({
    saat,
    ciro: tarihliSatislar.filter((s) => new Date(s.tarih).getHours() === saat).reduce((t, s) => t + s.genelToplam, 0),
  }));
  const saatMax = Math.max(...saatlikDagilim.map((s) => s.ciro), 1);

  const odemeDagilimi = {};
  tarihliSatislar.forEach((s) => (s.odemeler || []).forEach((o) => (odemeDagilimi[o.yontem] = (odemeDagilimi[o.yontem] || 0) + o.tutar)));

  return (
    <div className="flex flex-col gap-4">
      {filtrePaneli}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { etiket: "Toplam Ciro", deger: R.tl(ciro) },
          { etiket: "Satış Adedi", deger: adet },
          { etiket: "Ortalama Sepet", deger: R.tl(ortalamaSepet) },
          { etiket: "İskonto Toplamı", deger: R.tl(iskontoToplam) },
        ].map((k) => (
          <R.Kart key={k.etiket} className="p-3.5">
            <div className="text-xs" style={{ color: R.T.ink500 }}>
              {k.etiket}
            </div>
            <div className="font-semibold mt-0.5" style={R.MONO}>
              {k.deger}
            </div>
          </R.Kart>
        ))}
      </div>
      <R.Kart className="p-3.5">
        <div className="text-xs" style={{ color: R.T.ink500 }}>
          İade Toplamı (aralıkta)
        </div>
        <div className="font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
          −{R.tl(iadeToplam)}
        </div>
      </R.Kart>

      <R.Kart className="p-4">
        <h4 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
          Saatlere Göre Satış
        </h4>
        <div className="flex items-end gap-1" style={{ height: 100 }}>
          {saatlikDagilim.map((s) => (
            <div key={s.saat} className="flex-1 flex flex-col items-center gap-1" title={`${s.saat}:00 — ${R.tl(s.ciro)}`}>
              <div className="w-full rounded-t-sm" style={{ height: `${Math.max(2, (s.ciro / saatMax) * 80)}px`, background: R.T.orange }} />
              {s.saat % 3 === 0 && (
                <span className="text-[9px]" style={{ color: R.T.ink500 }}>
                  {s.saat}
                </span>
              )}
            </div>
          ))}
        </div>
      </R.Kart>

      <R.Kart className="p-4">
        <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Ödeme Yöntemine Göre Satış
        </h4>
        {Object.keys(odemeDagilimi).length === 0 ? (
          <p className="text-sm" style={{ color: R.T.ink500 }}>
            Bu aralıkta satış yok.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {Object.entries(odemeDagilimi).map(([yontem, tutar]) => (
              <div key={yontem} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                <span style={{ color: R.T.ink900 }}>{yontem}</span>
                <span className="font-semibold" style={R.MONO}>
                  {R.tl(tutar)}
                </span>
              </div>
            ))}
          </div>
        )}
      </R.Kart>

      <R.Buton
        variant="ghost"
        onClick={() =>
          R.csvIndir(
            `satis-raporu-${baslangic}-${bitis}.csv`,
            ["Tarih", "Belge No", "Müşteri", "Kalem Sayısı", "Toplam", "Ödeme"],
            tarihliSatislar.map((s) => [R.tarihGoster(s.tarih), s.id.slice(-6).toUpperCase(), s.musteriAdi, s.kalemler.length, s.genelToplam, (s.odemeler || []).map((o) => o.yontem).join("+")])
          )
        }
      >
        <R.FileDown size={14} /> Excel'e Aktar (CSV)
      </R.Buton>
    </div>
  );
}
