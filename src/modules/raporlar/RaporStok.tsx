/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporStok({ db, aktifParcalar }) {
  const ozet = R.stokDegerlemeOzetiHesapla(db, aktifParcalar);
  const toplamAdet = aktifParcalar.reduce((t, p) => t + (p.stok || 0), 0);
  const stokMaliyeti = aktifParcalar.reduce((t, p) => t + (p.stok || 0) * R.gecerliMaliyet(p, db), 0);
  const tahminiSatisDegeri = aktifParcalar.reduce((t, p) => t + (p.stok || 0) * R.kdvHaricSatisFiyati(p), 0);
  const potansiyelKar = tahminiSatisDegeri - stokMaliyeti;

  const kritikler = aktifParcalar.filter((p) => (p.stok || 0) > 0 && p.stok <= p.kritikSeviye);
  const stoktaOlmayan = aktifParcalar.filter((p) => (p.stok || 0) <= 0);
  const negatifStok = aktifParcalar.filter((p) => (p.stok || 0) < 0);
  const fazlaStok = aktifParcalar.filter((p) => p.hedefStok > 0 && p.stok > p.hedefStok);

  const rafBazinda = (() => {
    const harita = {};
    aktifParcalar.forEach((p) => {
      R.parcaRafListesi(p).forEach((k) => {
        harita[k.kod] = (harita[k.kod] || 0) + k.adet;
      });
    });
    return Object.entries(harita).sort((a, b) => b[1] - a[1]);
  })();

  const [detayListe, setDetayListe] = R.useState(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <R.Kart className="p-3.5">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Toplam Stok Adedi
          </div>
          <div className="text-lg font-semibold mt-0.5" style={R.MONO}>
            {toplamAdet}
          </div>
        </R.Kart>
        <R.Kart className="p-3.5">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Stok Maliyet Değeri
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
            Tahmini Brüt Kâr
          </div>
          <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.green }}>
            {R.tl(potansiyelKar)}
          </div>
        </R.Kart>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { etiket: "Kritik Stoklar", sayi: kritikler.length, liste: kritikler, ton: "red" },
          { etiket: "Stokta Olmayan", sayi: stoktaOlmayan.length, liste: stoktaOlmayan, ton: "red" },
          { etiket: "Fazla Stok", sayi: fazlaStok.length, liste: fazlaStok, ton: "yellow" },
          { etiket: "Negatif Stok", sayi: negatifStok.length, liste: negatifStok, ton: "red" },
        ].map((k) => (
          <button key={k.etiket} onClick={() => setDetayListe(k)} className="text-left">
            <R.Kart className="p-3.5">
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {k.etiket}
              </div>
              <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: k.sayi > 0 ? (k.ton === "red" ? R.T.red : "#8A6110") : R.T.ink900 }}>
                {k.sayi}
              </div>
            </R.Kart>
          </button>
        ))}
      </div>

      {/* 7. Kritik stok değeri + 8. Fiziksel/Rezerve/Satılabilir ayrımı */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <R.Kart className="p-3.5">
          <div className="text-xs" style={{ color: R.T.red }}>
            🔴 Kritik Stokların Maliyeti
          </div>
          <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
            {R.tl(ozet.kritikMaliyet)}
          </div>
        </R.Kart>
        <R.Kart className="p-3.5">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Fiziksel Stok Değeri
          </div>
          <div className="text-lg font-semibold mt-0.5" style={R.MONO}>
            {R.tl(ozet.fizikselMaliyet)}
          </div>
        </R.Kart>
        <R.Kart className="p-3.5">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Rezerve Stok Değeri
          </div>
          <div className="text-lg font-semibold mt-0.5" style={R.MONO}>
            {R.tl(ozet.rezerveMaliyet)}
          </div>
        </R.Kart>
        <R.Kart className="p-3.5" style={{ background: "#DEF0DF" }}>
          <div className="text-xs" style={{ color: R.T.green }}>
            Satılabilir Stok Değeri
          </div>
          <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.green }}>
            {R.tl(ozet.satilabilirMaliyet)}
          </div>
        </R.Kart>
      </div>

      {/* 3-4. Kategori ve Marka bazında stok sermayesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Kategori Bazında Stok Sermayesi
          </h4>
          {ozet.kategoriBazinda.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Veri yok.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {ozet.kategoriBazinda.slice(0, 10).map((x) => (
                <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>{x.anahtar}</span>
                  <span className="font-semibold" style={R.MONO}>
                    {R.tl(x.deger)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </R.Kart>
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Marka Bazında Stok Değeri
          </h4>
          {ozet.markaBazinda.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Veri yok.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {ozet.markaBazinda.slice(0, 10).map((x) => (
                <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>{x.anahtar}</span>
                  <span className="font-semibold" style={R.MONO}>
                    {R.tl(x.deger)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </R.Kart>
        {ozet.depoBazinda.length > 0 && (
          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Depo Bazında Stok Değeri
            </h4>
            <div className="flex flex-col gap-1">
              {ozet.depoBazinda.map((x) => (
                <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>{x.anahtar}</span>
                  <span className="font-semibold" style={R.MONO}>
                    {R.tl(x.deger)}
                  </span>
                </div>
              ))}
            </div>
          </R.Kart>
        )}
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Raf Bazında Stok Değeri (İlk 10)
          </h4>
          {ozet.rafBazinda.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Veri yok.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {ozet.rafBazinda.slice(0, 10).map((x) => (
                <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>📍 {x.anahtar}</span>
                  <span className="font-semibold" style={R.MONO}>
                    {R.tl(x.deger)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </R.Kart>
      </div>

      {/* 6. Ölü stok değeri */}
      <R.Kart className="p-4">
        <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Ölü Stok Değeri
        </h4>
        <p className="text-xs mb-2" style={{ color: R.T.ink500 }}>
          Satılmadan (veya hiç satılmamışsa üründe oluşturulduğundan) beri geçen süreye göre, stokta gereksiz yere bağlı kalan sermaye.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { etiket: "90+ gündür satılmayan", deger: ozet.oluStokGruplari["90+ gün"] },
            { etiket: "180+ gündür satılmayan", deger: ozet.oluStokGruplari["180+ gün"] },
            { etiket: "365+ gündür satılmayan", deger: ozet.oluStokGruplari["365+ gün"] },
          ].map((k) => (
            <div key={k.etiket} className="rounded-md p-2.5 text-center" style={{ background: k.deger > 0 ? "#FDF1D6" : R.T.steel100 }}>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {k.etiket}
              </div>
              <div className="text-sm font-semibold mt-0.5" style={{ ...R.MONO, color: k.deger > 0 ? "#8A6110" : R.T.ink900 }}>
                {R.tl(k.deger)}
              </div>
            </div>
          ))}
        </div>
      </R.Kart>

      {detayListe && (
        <R.Kart className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
              {detayListe.etiket}
            </h4>
            <button onClick={() => setDetayListe(null)} style={{ color: R.T.ink500 }}>
              <R.X size={15} />
            </button>
          </div>
          {detayListe.liste.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Bu kritere uyan ürün yok.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {detayListe.liste.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>{p.ad}</span>
                  <span className="font-semibold" style={R.MONO}>
                    {p.stok} {p.birim}
                  </span>
                </div>
              ))}
            </div>
          )}
        </R.Kart>
      )}

      <R.Kart className="p-4">
        <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Raf Bazında Stok
        </h4>
        {rafBazinda.length === 0 ? (
          <p className="text-sm" style={{ color: R.T.ink500 }}>
            Henüz raf ataması yapılmadı.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {rafBazinda.map(([kod, adet]) => (
              <div key={kod} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                <span style={{ ...R.MONO, color: R.T.ink900 }}>📍 {kod}</span>
                <span className="font-semibold" style={R.MONO}>
                  {adet}
                </span>
              </div>
            ))}
          </div>
        )}
      </R.Kart>

      <p className="text-xs" style={{ color: R.T.ink500 }}>
        30/90/180/365+ gündür satılmayan ürünler için "Sipariş Önerisi → Ölü Stok" sekmesine bakabilirsiniz.
      </p>
    </div>
  );
}
