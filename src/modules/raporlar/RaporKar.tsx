/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporKar({ db, filtrePaneli, tumKalemler, baslangic, bitis }) {
  const toplamKar = tumKalemler.reduce((t, k) => t + R.satisKalemiKarBilgisi(k).karToplam, 0);
  const toplamCiro = tumKalemler.reduce((t, k) => t + (k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0)), 0);
  const kademeler = R.karKademeleriHesapla(db, tumKalemler, baslangic, bitis);
  const merkeziKarOzeti = R.donemKarOzetiHesapla(db, baslangic, bitis);

  const grupla = (anahtarFn) => {
    const harita = {};
    tumKalemler.forEach((k) => {
      const anahtar = anahtarFn(k) || "Belirtilmemiş";
      if (!harita[anahtar]) harita[anahtar] = { anahtar, kar: 0, ciro: 0, adet: 0 };
      const kb = R.satisKalemiKarBilgisi(k);
      harita[anahtar].kar += kb.karToplam;
      harita[anahtar].ciro += k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0);
      harita[anahtar].adet += k.adet;
    });
    return Object.values(harita).sort((a, b) => b.kar - a.kar);
  };

  const urunBazinda = (() => {
    const harita = {};
    tumKalemler.forEach((k) => {
      if (!harita[k.parcaId]) harita[k.parcaId] = { ad: k.ad, kar: 0, adet: 0 };
      harita[k.parcaId].kar += R.satisKalemiKarBilgisi(k).karToplam;
      harita[k.parcaId].adet += k.adet;
    });
    return Object.values(harita).sort((a, b) => b.kar - a.kar);
  })();

  const markaBazinda = grupla((k) => k.marka);
  const kategoriBazinda = grupla((k) => db.parcalar.find((p) => p.id === k.parcaId)?.kategori);
  const personelBazinda = grupla((k) => k.satisiYapan);
  const tarihBazinda = (() => {
    const harita = {};
    tumKalemler.forEach((k) => {
      const gun = (k.satisTarihi || "").slice(0, 10);
      if (!harita[gun]) harita[gun] = { anahtar: gun, kar: 0, ciro: 0, adet: 0 };
      const kb = R.satisKalemiKarBilgisi(k);
      harita[gun].kar += kb.karToplam;
      harita[gun].ciro += k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0);
      harita[gun].adet += k.adet;
    });
    return Object.values(harita).sort((a, b) => new Date(b.anahtar) - new Date(a.anahtar));
  })();
  const zararSatislari = tumKalemler.filter((k) => R.satisKalemiKarBilgisi(k).karBirim < -0.005);
  const dusukKarSatislari = tumKalemler.filter((k) => {
    const kb = R.satisKalemiKarBilgisi(k);
    return kb.karBirim >= -0.005 && kb.karYuzde !== null && kb.karYuzde < R.DUSUK_KAR_ESIGI_YUZDE;
  });

  return (
    <div className="flex flex-col gap-4">
      {filtrePaneli}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <R.Kart className="p-3.5">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Brüt Kâr
          </div>
          <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: toplamKar >= 0 ? R.T.green : R.T.red }}>
            {R.tl(toplamKar)}
          </div>
        </R.Kart>
        <R.Kart className="p-3.5">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Satış Başına Kâr
          </div>
          <div className="text-lg font-semibold mt-0.5" style={R.MONO}>
            {R.tl(tumKalemler.length > 0 ? toplamKar / tumKalemler.length : 0)}
          </div>
        </R.Kart>
        <R.Kart className="p-3.5">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Kâr Marjı
          </div>
          <div className="text-lg font-semibold mt-0.5" style={R.MONO}>
            {toplamCiro > 0 ? `%${((toplamKar / toplamCiro) * 100).toFixed(1)}` : "—"}
          </div>
        </R.Kart>
      </div>

      {/* Kâr Türleri — 46. adım, 5. madde: her kademe ayrı ayrı görülebilmeli */}
      <R.Kart className="p-4">
        <h4 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
          Kâr Türleri
        </h4>
        <div className="flex flex-col gap-2">
          {[
            { etiket: "Brüt Kâr (Liste Fiyatı Üzerinden)", deger: kademeler.bruteKar },
            { etiket: `İskonto Sonrası Kâr (Gerçek Satış Fiyatı)`, deger: merkeziKarOzeti.brutKar + merkeziKarOzeti.smm },
            { etiket: `POS Komisyonu Sonrası Kâr (−${R.tl(merkeziKarOzeti.posKomisyonu)} komisyon)`, deger: merkeziKarOzeti.brutKar - merkeziKarOzeti.posKomisyonu },
            { etiket: `Giderler Sonrası Net Faaliyet Kârı (−${R.tl(merkeziKarOzeti.faaliyetGideriKdvHaric)} gider)`, deger: merkeziKarOzeti.netFaaliyetKari, kalin: true },
          ].map((k) => (
            <div key={k.etiket} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
              <span style={{ color: R.T.ink900, fontWeight: k.kalin ? 600 : 400 }}>{k.etiket}</span>
              <span className="font-semibold" style={{ ...R.MONO, color: k.deger >= 0 ? R.T.green : R.T.red }}>
                {R.tl(k.deger)}
              </span>
            </div>
          ))}
        </div>
      </R.Kart>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            En Yüksek Kâr Bırakan Ürünler
          </h4>
          <div className="flex flex-col gap-1">
            {urunBazinda.slice(0, 10).map((x, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                <span style={{ color: R.T.ink900 }}>
                  {i + 1}. {x.ad}
                </span>
                <span className="font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                  {R.tl(x.kar)}
                </span>
              </div>
            ))}
          </div>
        </R.Kart>
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Marka Bazında Kâr
          </h4>
          <div className="flex flex-col gap-1">
            {markaBazinda.slice(0, 10).map((x) => (
              <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                <span style={{ color: R.T.ink900 }}>{x.anahtar}</span>
                <span className="font-semibold" style={{ ...R.MONO, color: x.kar >= 0 ? R.T.green : R.T.red }}>
                  {R.tl(x.kar)}
                </span>
              </div>
            ))}
          </div>
        </R.Kart>
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Kategori Bazında Kâr
          </h4>
          <div className="flex flex-col gap-1">
            {kategoriBazinda.slice(0, 10).map((x) => (
              <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                <span style={{ color: R.T.ink900 }}>{x.anahtar}</span>
                <span className="font-semibold" style={{ ...R.MONO, color: x.kar >= 0 ? R.T.green : R.T.red }}>
                  {R.tl(x.kar)}
                </span>
              </div>
            ))}
          </div>
        </R.Kart>
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Personel Bazında Kâr
          </h4>
          <div className="flex flex-col gap-1">
            {personelBazinda.slice(0, 10).map((x) => (
              <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                <span style={{ color: R.T.ink900 }}>
                  {x.anahtar} <span style={{ color: R.T.ink500 }}>· Ciro: {R.tl(x.ciro)}</span>
                </span>
                <span className="font-semibold" style={{ ...R.MONO, color: x.kar >= 0 ? R.T.green : R.T.red }}>
                  {R.tl(x.kar)} {x.ciro > 0 && `(%${((x.kar / x.ciro) * 100).toFixed(1)})`}
                </span>
              </div>
            ))}
          </div>
        </R.Kart>
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Tarih Bazında Kâr
          </h4>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {tarihBazinda.slice(0, 31).map((x) => (
              <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                <span style={{ color: R.T.ink900 }}>{R.tarihGoster(x.anahtar)}</span>
                <span className="font-semibold" style={{ ...R.MONO, color: x.kar >= 0 ? R.T.green : R.T.red }}>
                  {R.tl(x.kar)}
                </span>
              </div>
            ))}
          </div>
        </R.Kart>
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5" style={{ color: R.T.red }}>
            <R.AlertTriangle size={14} /> Zararına / Düşük Kârla Yapılan Satışlar
          </h4>
          {zararSatislari.length === 0 && dusukKarSatislari.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Bu aralıkta zararına veya düşük kârla satış yok.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {zararSatislari.map((k, i) => (
                <div key={`z${i}`} className="flex items-center justify-between text-xs px-2 py-1.5 rounded" style={{ background: "#F9DEDE" }}>
                  <span style={{ color: R.T.ink900 }}>⛔ {k.ad}</span>
                  <span className="font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                    {R.tl(R.satisKalemiKarBilgisi(k).karToplam)}
                  </span>
                </div>
              ))}
              {dusukKarSatislari.map((k, i) => (
                <div key={`d${i}`} className="flex items-center justify-between text-xs px-2 py-1.5 rounded" style={{ background: "#FDF1D6" }}>
                  <span style={{ color: R.T.ink900 }}>⚠️ {k.ad}</span>
                  <span className="font-semibold" style={{ ...R.MONO, color: "#8A6110" }}>
                    %{R.satisKalemiKarBilgisi(k).karYuzde.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </R.Kart>
      </div>
    </div>
  );
}
