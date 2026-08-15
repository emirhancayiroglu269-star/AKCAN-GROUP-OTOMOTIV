/* Extracted from Finans.tsx — kept intentionally self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function VadeTakipSayfasi({ db, updateDb, aktifKullanici, musteriyeGit, tedarikciyeGit }) {
  const [altSekme, setAltSekme] = R.useState("musteri");
  const [nakitAkisiGunu, setNakitAkisiGunu] = R.useState(30);

  const musteriOzetleri = db.cariler
    .filter((c) => c.aktif !== false && c.bakiye > 0)
    .map((c) => ({ musteri: c, ozet: R.musteriAlacakOzeti(db, c) }))
    .sort((a, b) => b.ozet.toplamBorc - a.ozet.toplamBorc);

  const tedarikciOzetleri = db.tedarikciler
    .filter((t) => t.aktif !== false && t.bakiye > 0)
    .map((t) => ({ tedarikci: t, ozet: R.tedarikciBorcOzeti(db, t) }))
    .sort((a, b) => b.ozet.toplamBorc - a.ozet.toplamBorc);

  // Vade Grupları — hem müşteri hem tedarikçi açık faturalarını tek listede,
  // vade grubuna göre toplar.
  const tumFaturalar = [
    ...db.cariler.flatMap((c) => R.musteriAcikFaturalariFifo(db, c).filter((f) => f.kalan > 0.01).map((f) => ({ tur: "musteri", ad: c.ad, id: c.id, tutar: f.kalan, vadeTarihi: f.vadeTarihi }))),
    ...db.tedarikciler.flatMap((t) => R.tedarikciAcikFaturalari(db, t.ad).map((m) => ({ tur: "tedarikci", ad: t.ad, id: t.id, tutar: m.kalanBorc, vadeTarihi: m.vadeTarihi }))),
  ];
  const gruplar = {};
  R.VADE_GRUP_SIRASI.forEach((g) => (gruplar[g] = []));
  tumFaturalar.forEach((f) => gruplar[R.vadeGrubuBul(f.vadeTarihi)].push(f));

  const nakitAkisi = R.nakitAkisiHesapla(db, nakitAkisiGunu);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "musteri", ad: "Müşteri Alacakları" },
          { id: "tedarikci", ad: "Tedarikçi Borçları" },
          { id: "gruplar", ad: "Vade Grupları" },
          { id: "nakit", ad: "Nakit Akışı" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold whitespace-nowrap"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "musteri" && (
        <R.Kart className="overflow-hidden">
          {musteriOzetleri.length === 0 ? (
            <R.Bos ikon={R.Users} baslik="Alacak yok" aciklama="Bakiyesi pozitif olan müşteri bulunmuyor." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2.5">Müşteri</th>
                    <th className="text-right font-semibold px-3 py-2.5">Toplam Borç</th>
                    <th className="text-right font-semibold px-3 py-2.5">Vadesi Gelen</th>
                    <th className="text-right font-semibold px-3 py-2.5">Vadesi Geçen</th>
                    <th className="text-left font-semibold px-3 py-2.5">Son Ödeme</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {musteriOzetleri.map(({ musteri, ozet }) => (
                    <tr key={musteri.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2.5 font-medium" style={{ color: R.T.ink900 }}>
                        {musteri.ad}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold" style={R.MONO}>
                        {R.tl(ozet.toplamBorc)}
                      </td>
                      <td className="px-3 py-2.5 text-right" style={{ ...R.MONO, color: "#8A6110" }}>
                        {ozet.vadesiGelen > 0 ? R.tl(ozet.vadesiGelen) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right" style={{ ...R.MONO, color: ozet.vadesiGecen > 0 ? R.T.red : R.T.ink500 }}>
                        {ozet.vadesiGecen > 0 ? R.tl(ozet.vadesiGecen) : "—"}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: R.T.ink500 }}>
                        {ozet.sonOdemeTarihi ? R.tarihGoster(ozet.sonOdemeTarihi) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => musteriyeGit(musteri.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap" style={{ background: R.T.green, color: "#fff" }}>
                          Tahsilat Yap
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "tedarikci" && (
        <R.Kart className="overflow-hidden">
          {tedarikciOzetleri.length === 0 ? (
            <R.Bos ikon={R.Truck} baslik="Borç yok" aciklama="Bakiyesi pozitif olan tedarikçi bulunmuyor." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2.5">Tedarikçi</th>
                    <th className="text-right font-semibold px-3 py-2.5">Toplam Borç</th>
                    <th className="text-right font-semibold px-3 py-2.5">7 Gün İçinde</th>
                    <th className="text-right font-semibold px-3 py-2.5">Vadesi Geçen</th>
                    <th className="text-left font-semibold px-3 py-2.5">Son Ödeme</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {tedarikciOzetleri.map(({ tedarikci, ozet }) => {
                    const yediGunSonraIso = R.isoGun(new Date(Date.now() + 7 * 86400000));
                    const bugunIso = R.isoGun(new Date());
                    const yediGunIcinde = ozet.faturalar.filter((m) => m.vadeTarihi && m.vadeTarihi >= bugunIso && m.vadeTarihi <= yediGunSonraIso).reduce((t, m) => t + m.kalanBorc, 0);
                    return (
                      <tr key={tedarikci.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2.5 font-medium" style={{ color: R.T.ink900 }}>
                          {tedarikci.ad}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold" style={R.MONO}>
                          {R.tl(ozet.toplamBorc)}
                        </td>
                        <td className="px-3 py-2.5 text-right" style={{ ...R.MONO, color: "#8A6110" }}>
                          {yediGunIcinde > 0 ? R.tl(yediGunIcinde) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right" style={{ ...R.MONO, color: ozet.vadesiGecen > 0 ? R.T.red : R.T.ink500 }}>
                          {ozet.vadesiGecen > 0 ? R.tl(ozet.vadesiGecen) : "—"}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: R.T.ink500 }}>
                          {ozet.sonOdemeTarihi ? R.tarihGoster(ozet.sonOdemeTarihi) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => tedarikciyeGit(tedarikci.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap" style={{ background: R.T.green, color: "#fff" }}>
                            Ödeme Yap
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "gruplar" && (
        <div className="flex flex-col gap-3">
          {R.VADE_GRUP_SIRASI.map((grup) => {
            const liste = gruplar[grup];
            if (liste.length === 0) return null;
            const toplam = liste.reduce((t, f) => t + f.tutar, 0);
            const renk = grup === "Vadesi Geçmiş" ? { emoji: "🔴", ton: "red" } : grup === "Bugün" ? { emoji: "🟠", ton: "yellow" } : grup === "1–7 gün" ? { emoji: "🟡", ton: "yellow" } : { emoji: "🟢", ton: "green" };
            return (
              <R.Kart key={grup} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: R.T.ink900 }}>
                    {renk.emoji} {grup}
                  </h4>
                  <span className="font-semibold text-sm" style={R.MONO}>
                    {R.tl(toplam)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {liste.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => (f.tur === "musteri" ? musteriyeGit(f.id) : tedarikciyeGit(f.id))}
                      className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md text-left"
                      style={{ background: R.T.steel100 }}
                    >
                      <span style={{ color: R.T.ink900 }}>
                        {f.tur === "musteri" ? "👤" : "🚚"} {f.ad} {f.vadeTarihi && <span style={{ color: R.T.ink500 }}>· {R.tarihGoster(f.vadeTarihi)}</span>}
                      </span>
                      <span className="font-semibold" style={R.MONO}>
                        {R.tl(f.tutar)}
                      </span>
                    </button>
                  ))}
                </div>
              </R.Kart>
            );
          })}
          {tumFaturalar.length === 0 && (
            <R.Kart>
              <R.Bos ikon={R.Calendar} baslik="Açık fatura yok" aciklama="Şu an vadeye bağlı bir alacak/borç bulunmuyor." />
            </R.Kart>
          )}
        </div>
      )}

      {altSekme === "nakit" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {[7, 30, 60, 90].map((g) => (
              <button
                key={g}
                onClick={() => setNakitAkisiGunu(g)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold"
                style={{ background: nakitAkisiGunu === g ? R.T.graphite900 : R.T.steel100, color: nakitAkisiGunu === g ? "#fff" : R.T.ink900 }}
              >
                Önümüzdeki {g} Gün
              </button>
            ))}
          </div>
          <R.Kart className="p-4">
            <div className="flex flex-col gap-2">
              {[
                { etiket: "Beklenen Tahsilat", deger: nakitAkisi.beklenenTahsilat, ton: "green" },
                { etiket: "Beklenen Ödeme", deger: -nakitAkisi.beklenenOdeme, ton: "red" },
              ].map((k) => (
                <div key={k.etiket} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>{k.etiket}</span>
                  <span className="font-semibold" style={{ ...R.MONO, color: k.ton === "green" ? R.T.green : R.T.red }}>
                    {k.deger < 0 ? `−${R.tl(Math.abs(k.deger))}` : R.tl(k.deger)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                <span className="font-semibold" style={{ color: R.T.ink900 }}>
                  Net Beklenen Nakit
                </span>
                <span className="text-lg font-semibold" style={{ ...R.MONO, color: nakitAkisi.net >= 0 ? R.T.green : R.T.red }}>
                  {nakitAkisi.net >= 0 ? "+" : "−"}
                  {R.tl(Math.abs(nakitAkisi.net))}
                </span>
              </div>
            </div>
          </R.Kart>
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Bu tahmin, açık faturaların vade tarihlerine dayanır — müşterilerin fiili ödeme alışkanlıkları vadeden
            sapabileceğinden yaklaşık bir öngörüdür.
          </p>
        </div>
      )}
    </div>
  );
}
