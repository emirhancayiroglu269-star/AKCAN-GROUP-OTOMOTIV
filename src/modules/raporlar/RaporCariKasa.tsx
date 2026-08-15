/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporCariKasa({ db }) {
  const bugunIso = R.isoGun(new Date());
  const musteriAlacaklari = db.cariler.reduce((t, c) => t + Math.max(0, c.bakiye || 0), 0);
  const tedarikciBorclari = db.tedarikciler.reduce((t, t2) => t + Math.max(0, t2.bakiye || 0), 0);
  const kasa = db.hesaplar.filter((h) => h.tip === "Nakit Kasa").reduce((t, h) => t + (h.bakiye || 0), 0);
  const bankaPos = db.hesaplar.filter((h) => h.tip !== "Nakit Kasa").reduce((t, h) => t + (h.bakiye || 0), 0);

  const musteriVadesiGecen = db.cariler
    .filter((c) => c.bakiye > 0 && c.vadeGunu > 0)
    .filter((c) => {
      const sonBorc = c.hareketler.find((h) => h.tur === "borç");
      return sonBorc && Math.floor((new Date(bugunIso) - new Date(sonBorc.tarih)) / 86400000) > c.vadeGunu;
    })
    .reduce((t, c) => t + c.bakiye, 0);

  const tedarikciVadesiGecen = db.malAlimlari
    .filter((m) => m.vadeTarihi && m.vadeTarihi < bugunIso)
    .reduce((t, m) => t + Math.max(0, (m.faturaGirilenToplam ?? m.hesaplananGenelToplam) - (m.odenenTutar || 0)), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <R.Kart className="p-4">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Müşteri Alacakları
          </div>
          <div className="text-xl font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
            {R.tl(musteriAlacaklari)}
          </div>
        </R.Kart>
        <R.Kart className="p-4">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Tedarikçi Borçları
          </div>
          <div className="text-xl font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
            {R.tl(tedarikciBorclari)}
          </div>
        </R.Kart>
        <R.Kart className="p-4">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Kasa (Nakit)
          </div>
          <div className="text-xl font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.green }}>
            {R.tl(kasa)}
          </div>
        </R.Kart>
        <R.Kart className="p-4">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Banka / POS
          </div>
          <div className="text-xl font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.green }}>
            {R.tl(bankaPos)}
          </div>
        </R.Kart>
        <R.Kart className="p-4" style={{ background: musteriVadesiGecen > 0 ? "#F9DEDE" : "#fff" }}>
          <div className="text-xs" style={{ color: musteriVadesiGecen > 0 ? R.T.red : R.T.ink500 }}>
            Müşteri — Vadesi Geçen
          </div>
          <div className="text-xl font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
            {R.tl(musteriVadesiGecen)}
          </div>
        </R.Kart>
        <R.Kart className="p-4" style={{ background: tedarikciVadesiGecen > 0 ? "#F9DEDE" : "#fff" }}>
          <div className="text-xs" style={{ color: tedarikciVadesiGecen > 0 ? R.T.red : R.T.ink500 }}>
            Tedarikçi — Vadesi Geçen
          </div>
          <div className="text-xl font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
            {R.tl(tedarikciVadesiGecen)}
          </div>
        </R.Kart>
      </div>
      <R.Kart className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold" style={{ color: R.T.ink900 }}>
            Net Nakit Durumu
          </span>
          <span className="font-semibold text-lg" style={{ ...R.MONO, color: kasa + bankaPos - tedarikciBorclari >= 0 ? R.T.green : R.T.red }}>
            {R.tl(kasa + bankaPos + musteriAlacaklari - tedarikciBorclari)}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: R.T.ink500 }}>
          Kasa + Banka/POS + Müşteri Alacakları − Tedarikçi Borçları
        </p>
      </R.Kart>
    </div>
  );
}
