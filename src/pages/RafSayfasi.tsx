import React, { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { parcaRafListesi } from "../lib/raf";
import { Kart, Bos } from "../components/ui";

export function RafSayfasi({ db }) {
  const [arama, setArama] = useState("");
  const [seciliRaf, setSeciliRaf] = useState(null);

  // Tüm ürünlerden, kullanımda olan benzersiz raf kodlarının listesini çıkarır.
  const tumRaflar = (() => {
    const harita = {};
    db.parcalar.forEach((p) => {
      parcaRafListesi(p).forEach((k) => {
        if (!harita[k.kod]) harita[k.kod] = { kod: k.kod, urunSayisi: 0, toplamAdet: 0 };
        harita[k.kod].urunSayisi += 1;
        harita[k.kod].toplamAdet += k.adet;
      });
    });
    return Object.values(harita).sort((a, b) => a.kod.localeCompare(b.kod, "tr"));
  })();

  const filtreliRaflar = arama.trim() ? tumRaflar.filter((r) => r.kod.toLowerCase().includes(arama.trim().toLowerCase())) : tumRaflar;

  const rafUrunleri = seciliRaf
    ? db.parcalar
        .map((p) => ({ p, konum: parcaRafListesi(p).find((k) => k.kod === seciliRaf) }))
        .filter((x) => x.konum)
        .sort((a, b) => a.p.ad.localeCompare(b.p.ad, "tr"))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.ink500 }} />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value.toUpperCase())}
            placeholder="Raf kodu ara… (ör. A-01)"
            className="w-full pl-9 pr-3 py-2 rounded-md border text-sm outline-none"
            style={{ borderColor: T.steel300 }}
          />
        </div>
        {filtreliRaflar.length === 0 ? (
          <Kart>
            <Bos ikon={MapPin} baslik="Raf yok" aciklama="Henüz hiçbir ürüne raf adresi girilmedi." />
          </Kart>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtreliRaflar.map((r) => (
              <button
                key={r.kod}
                onClick={() => setSeciliRaf(r.kod)}
                className="text-left p-3 rounded-lg border transition-colors"
                style={{ borderColor: seciliRaf === r.kod ? T.orange : T.steel200, background: seciliRaf === r.kod ? "#FBE1D5" : "#fff" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={MONO}>
                    📍 {r.kod}
                  </span>
                  <span className="text-xs" style={{ color: T.ink500 }}>
                    {r.urunSayisi} ürün
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        {!seciliRaf ? (
          <Kart className="h-full flex items-center justify-center">
            <Bos ikon={MapPin} baslik="Bir raf seçin" aciklama="Stok sayımında işinize yarayacak şekilde, o raftaki tüm ürünler burada listelenir." />
          </Kart>
        ) : (
          <Kart className="overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.steel200}` }}>
              <h3 className="font-semibold text-sm" style={{ color: T.ink900 }}>
                📍 {seciliRaf}
              </h3>
              <span className="text-xs" style={{ color: T.ink500 }}>
                {rafUrunleri.length} ürün · Toplam {rafUrunleri.reduce((t, x) => t + x.konum.adet, 0)} adet
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: T.steel100, color: T.ink500 }}>
                    <th className="text-left font-semibold px-4 py-2">Stok Kodu</th>
                    <th className="text-left font-semibold px-4 py-2">Ürün</th>
                    <th className="text-left font-semibold px-4 py-2">Marka</th>
                    <th className="text-right font-semibold px-4 py-2">Adet</th>
                  </tr>
                </thead>
                <tbody>
                  {rafUrunleri.map(({ p, konum }) => (
                    <tr key={p.id} style={{ borderTop: `1px solid ${T.steel200}` }}>
                      <td className="px-4 py-2.5" style={MONO}>
                        {p.stokKodu}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: T.ink900 }}>
                        {p.ad}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: T.ink500 }}>
                        {p.marka || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={MONO}>
                        {konum.adet} {p.birim}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>
        )}
      </div>
    </div>
  );
}
