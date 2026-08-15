/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporOzet({ db }) {
  const bugunTarih = R.bugun();
  const bugunSatislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && R.tarihGoster(s.tarih) === bugunTarih);
  const bugunKarOzeti = R.donemKarOzetiHesapla(db, bugunTarih, bugunTarih);
  const bugunCiro = bugunKarOzeti.netCiroKdvDahil;
  const bugunKar = bugunKarOzeti.brutKar;
  const karMarji = bugunCiro > 0 ? (bugunKar / bugunCiro) * 100 : null;

  const odemeToplamlari = {};
  bugunSatislar.forEach((s) => (s.odemeler || []).forEach((o) => (odemeToplamlari[o.yontem] = (odemeToplamlari[o.yontem] || 0) + o.tutar)));

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);
  const stokMaliyeti = aktifParcalar.reduce((t, p) => t + (p.stok || 0) * R.gecerliMaliyet(p), 0);
  const tahminiSatisDegeri = aktifParcalar.reduce((t, p) => t + (p.stok || 0) * R.kdvHaricSatisFiyati(p), 0);
  const potansiyelKar = tahminiSatisDegeri - stokMaliyeti;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Bugün — {bugunTarih}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { etiket: "Bugünkü Ciro", deger: R.tl(bugunCiro), ton: "graphite" },
            { etiket: "Satış Adedi", deger: bugunSatislar.length, ton: "graphite" },
            { etiket: "Brüt Kâr", deger: R.tl(bugunKar), ton: bugunKar >= 0 ? "green" : "red" },
            { etiket: "Kâr Marjı", deger: karMarji !== null ? `%${karMarji.toFixed(1)}` : "—", ton: "graphite" },
          ].map((k) => (
            <R.Kart key={k.etiket} className="p-3.5">
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {k.etiket}
              </div>
              <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: k.ton === "green" ? R.T.green : k.ton === "red" ? R.T.red : R.T.ink900 }}>
                {k.deger}
              </div>
            </R.Kart>
          ))}
        </div>
        {Object.keys(odemeToplamlari).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {Object.entries(odemeToplamlari).map(([yontem, tutar]) => (
              <R.Kart key={yontem} className="p-3">
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  {yontem}
                </div>
                <div className="font-semibold" style={R.MONO}>
                  {R.tl(tutar)}
                </div>
              </R.Kart>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Stok Değeri
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <R.Kart className="p-3.5">
            <div className="text-xs" style={{ color: R.T.ink500 }}>
              Stok Maliyeti
            </div>
            <div className="text-lg font-semibold mt-0.5" style={R.MONO}>
              {R.tl(stokMaliyeti)}
            </div>
          </R.Kart>
          <R.Kart className="p-3.5">
            <div className="text-xs" style={{ color: R.T.ink500 }}>
              Tahmini Satış Değeri
            </div>
            <div className="text-lg font-semibold mt-0.5" style={R.MONO}>
              {R.tl(tahminiSatisDegeri)}
            </div>
          </R.Kart>
          <R.Kart className="p-3.5" style={{ background: "#DEF0DF" }}>
            <div className="text-xs" style={{ color: R.T.green }}>
              Potansiyel Brüt Kâr
            </div>
            <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.green }}>
              {R.tl(potansiyelKar)}
            </div>
          </R.Kart>
        </div>
      </div>
    </div>
  );
}
