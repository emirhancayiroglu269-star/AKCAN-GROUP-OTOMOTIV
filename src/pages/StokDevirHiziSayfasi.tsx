import React, { useState } from "react";
import { BarChart3, X } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { tl, tarihGoster, isoGun } from "../lib/format";
import { urunDevirHiziHesapla, grupDevirHiziHesapla, DEVIR_HIZI_SINIF_GORSELI } from "../lib/stok-performans";
import { Kart, Bos, Rozet } from "../components/ui";

const DEVIR_HIZI_DONEM_SECENEKLERI = [
  { id: "7", ad: "Son 7 Gün", gun: 7 },
  { id: "30", ad: "Son 30 Gün", gun: 30 },
  { id: "90", ad: "Son 90 Gün", gun: 90 },
  { id: "180", ad: "Son 6 Ay", gun: 180 },
  { id: "365", ad: "Son 1 Yıl", gun: 365 },
  { id: "ozel", ad: "Özel Tarih Aralığı", gun: null },
];

export function StokDevirHiziSayfasi({ db, setSekme }) {
  const [altSekme, setAltSekme] = useState("urunler");
  const [donemId, setDonemId] = useState("90");
  const [ozelBaslangic, setOzelBaslangic] = useState(new Date(Date.now() - 90 * 86400000).toLocaleDateString("en-CA"));
  const [ozelBitis, setOzelBitis] = useState(isoGun(new Date()));
  const [siralamaAlani, setSiralamaAlani] = useState("stokMaliyeti");
  const [detayParcaId, setDetayParcaId] = useState(null);
  const [markaKategoriFiltre, setMarkaKategoriFiltre] = useState("");

  const bugunIso = isoGun(new Date());
  const secilenDonem = DEVIR_HIZI_DONEM_SECENEKLERI.find((d) => d.id === donemId);
  const baslangic = donemId === "ozel" ? ozelBaslangic : new Date(Date.now() - secilenDonem.gun * 86400000).toLocaleDateString("en-CA");
  const bitis = donemId === "ozel" ? ozelBitis : bugunIso;

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set");
  const analizler = aktifParcalar.map((p) => urunDevirHiziHesapla(db, p, baslangic, bitis));

  const filtreliAnalizler = (markaKategoriFiltre ? analizler.filter((a) => a.parca.marka === markaKategoriFiltre || a.parca.kategori === markaKategoriFiltre) : analizler)
    .filter((a) => a.stokMaliyeti > 0 || a.satisAdedi > 0)
    .sort((a, b) => (b[siralamaAlani] ?? -Infinity) - (a[siralamaAlani] ?? -Infinity));

  const markalar = [...new Set(aktifParcalar.map((p) => p.marka).filter(Boolean))].sort();
  const kategoriler = [...new Set(aktifParcalar.map((p) => p.kategori).filter(Boolean))].sort();

  const markaOzetleri = markalar
    .map((m) => ({ ad: m, ...grupDevirHiziHesapla(db, aktifParcalar.filter((p) => p.marka === m), baslangic, bitis) }))
    .filter((x) => x.stokDegeri > 0)
    .sort((a, b) => b.stokDegeri - a.stokDegeri);
  const kategoriOzetleri = kategoriler
    .map((k) => ({ ad: k, ...grupDevirHiziHesapla(db, aktifParcalar.filter((p) => p.kategori === k), baslangic, bitis) }))
    .filter((x) => x.stokDegeri > 0)
    .sort((a, b) => b.stokDegeri - a.stokDegeri);

  const detay = detayParcaId ? analizler.find((a) => a.parca.id === detayParcaId) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: T.steel300 }}>
        {[
          { id: "urunler", ad: "Ürün Bazında (Ana Ekran)" },
          { id: "marka", ad: "Marka Bazında" },
          { id: "kategori", ad: "Kategori Bazında" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold whitespace-nowrap px-2"
            style={{ background: altSekme === s.id ? T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {DEVIR_HIZI_DONEM_SECENEKLERI.map((d) => (
          <button
            key={d.id}
            onClick={() => setDonemId(d.id)}
            className="px-3 py-1.5 rounded-md text-xs font-semibold"
            style={{ background: donemId === d.id ? T.graphite900 : T.steel100, color: donemId === d.id ? "#fff" : T.ink900 }}
          >
            {d.ad}
          </button>
        ))}
        {donemId === "ozel" && (
          <>
            <input type="date" value={ozelBaslangic} onChange={(e) => setOzelBaslangic(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
            <input type="date" value={ozelBitis} onChange={(e) => setOzelBitis(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
          </>
        )}
      </div>

      {altSekme === "urunler" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={markaKategoriFiltre} onChange={(e) => setMarkaKategoriFiltre(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none bg-white" style={{ borderColor: T.steel300, color: T.ink900 }}>
              <option value="">Tüm Marka/Kategoriler</option>
              <optgroup label="Marka">
                {markalar.map((m) => (
                  <option key={`m-${m}`} value={m}>
                    {m}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Kategori">
                {kategoriler.map((k) => (
                  <option key={`k-${k}`} value={k}>
                    {k}
                  </option>
                ))}
              </optgroup>
            </select>
            <select value={siralamaAlani} onChange={(e) => setSiralamaAlani(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none bg-white" style={{ borderColor: T.steel300, color: T.ink900 }}>
              <option value="stokMaliyeti">Stok Değerine Göre Sırala</option>
              <option value="yillikDevirHizi">Devir Hızına Göre Sırala</option>
              <option value="brutKar">Kâra Göre Sırala</option>
              <option value="ciro">Ciroya Göre Sırala</option>
            </select>
            <span className="text-xs ml-auto" style={{ color: T.ink500 }}>
              {tarihGoster(baslangic)} – {tarihGoster(bitis)}
            </span>
          </div>

          {/* 10. madde — Yönetici için en önemli ekran */}
          <Kart className="overflow-hidden">
            <div className="overflow-x-auto max-h-[36rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: T.steel100, color: T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Ürün</th>
                    <th className="text-right font-semibold px-2 py-2">Stok Değeri</th>
                    <th className="text-right font-semibold px-2 py-2">Satış</th>
                    <th className="text-right font-semibold px-2 py-2">Kâr</th>
                    <th className="text-right font-semibold px-2 py-2">Devir Hızı</th>
                    <th className="text-right font-semibold px-2 py-2">Stokta Kalma</th>
                    <th className="text-left font-semibold px-3 py-2">Öneri</th>
                  </tr>
                </thead>
                <tbody>
                  {filtreliAnalizler.map((a) => (
                    <tr key={a.parca.id} style={{ borderTop: `1px solid ${T.steel200}`, cursor: "pointer" }} onClick={() => setDetayParcaId(a.parca.id)}>
                      <td className="px-3 py-2" style={{ color: T.ink900 }}>
                        <div className="flex items-center gap-1.5">
                          <Rozet tone={DEVIR_HIZI_SINIF_GORSELI[a.sinif].ton}>{DEVIR_HIZI_SINIF_GORSELI[a.sinif].emoji}</Rozet>
                          {a.parca.marka} {a.parca.ad}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right" style={MONO}>
                        {tl(a.stokMaliyeti)}
                      </td>
                      <td className="px-2 py-2 text-right" style={MONO}>
                        {a.satisAdedi} adet
                      </td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ ...MONO, color: a.brutKar >= 0 ? T.green : T.red }}>
                        {tl(a.brutKar)}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold" style={MONO}>
                        {a.yillikDevirHizi !== null ? a.yillikDevirHizi.toFixed(2) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right" style={{ ...MONO, color: T.ink500 }}>
                        {a.stoktaKalmaSuresi !== null ? `${a.stoktaKalmaSuresi} gün` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-semibold" style={{ color: a.oneri.emoji === "🔴" ? T.red : a.oneri.emoji === "🟢" ? T.green : "#8A6110" }}>
                          {a.oneri.emoji} {a.oneri.metin}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>
        </div>
      )}

      {altSekme === "marka" && (
        <Kart className="overflow-hidden">
          {markaOzetleri.length === 0 ? (
            <Bos ikon={BarChart3} baslik="Veri yok" aciklama="Marka bazında stok/satış verisi bulunmuyor." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: T.steel100, color: T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Marka</th>
                    <th className="text-right font-semibold px-2 py-2">Stok Değeri</th>
                    <th className="text-right font-semibold px-2 py-2">Dönem Satış Maliyeti</th>
                    <th className="text-right font-semibold px-3 py-2">Devir Hızı (Yıllık)</th>
                  </tr>
                </thead>
                <tbody>
                  {markaOzetleri.map((x) => (
                    <tr key={x.ad} style={{ borderTop: `1px solid ${T.steel200}` }}>
                      <td className="px-3 py-2 font-medium" style={{ color: T.ink900 }}>
                        {x.ad}
                      </td>
                      <td className="px-2 py-2 text-right" style={MONO}>
                        {tl(x.stokDegeri)}
                      </td>
                      <td className="px-2 py-2 text-right" style={{ ...MONO, color: T.ink500 }}>
                        {tl(x.satilanMaliyet)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold" style={MONO}>
                        {x.yillikDevirHizi !== null ? x.yillikDevirHizi.toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Kart>
      )}

      {altSekme === "kategori" && (
        <Kart className="overflow-hidden">
          {kategoriOzetleri.length === 0 ? (
            <Bos ikon={BarChart3} baslik="Veri yok" aciklama="Kategori bazında stok/satış verisi bulunmuyor." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: T.steel100, color: T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Kategori</th>
                    <th className="text-right font-semibold px-2 py-2">Stok Değeri</th>
                    <th className="text-right font-semibold px-2 py-2">Dönem Satış Maliyeti</th>
                    <th className="text-right font-semibold px-3 py-2">Devir Hızı (Yıllık)</th>
                  </tr>
                </thead>
                <tbody>
                  {kategoriOzetleri.map((x) => (
                    <tr key={x.ad} style={{ borderTop: `1px solid ${T.steel200}` }}>
                      <td className="px-3 py-2 font-medium" style={{ color: T.ink900 }}>
                        {x.ad}
                      </td>
                      <td className="px-2 py-2 text-right" style={MONO}>
                        {tl(x.stokDegeri)}
                      </td>
                      <td className="px-2 py-2 text-right" style={{ ...MONO, color: T.ink500 }}>
                        {tl(x.satilanMaliyet)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold" style={MONO}>
                        {x.yillikDevirHizi !== null ? x.yillikDevirHizi.toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Kart>
      )}

      {/* 4. madde — Ürün bazında detaylı analiz */}
      {detay && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDetayParcaId(null)}>
          <div className="w-full max-w-md rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: T.ink900 }}>
                {detay.parca.marka} {detay.parca.ad}
              </h3>
              <button onClick={() => setDetayParcaId(null)} style={{ color: T.ink500 }}>
                <X size={18} />
              </button>
            </div>
            <Rozet tone={DEVIR_HIZI_SINIF_GORSELI[detay.sinif].ton}>
              {DEVIR_HIZI_SINIF_GORSELI[detay.sinif].emoji} {detay.sinif}
            </Rozet>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { etiket: "Mevcut Stok", deger: detay.parca.stok },
                { etiket: "Dönem Satış", deger: `${detay.satisAdedi} adet` },
                { etiket: "Devir Hızı (Yıllık)", deger: detay.yillikDevirHizi !== null ? detay.yillikDevirHizi.toFixed(2) : "—" },
                { etiket: "Ortalama Stokta Kalma", deger: detay.stoktaKalmaSuresi !== null ? `${detay.stoktaKalmaSuresi} gün` : "—" },
                { etiket: "Ciro", deger: tl(detay.ciro) },
                { etiket: "Brüt Kâr", deger: tl(detay.brutKar) },
                { etiket: "Kâr Marjı", deger: detay.karMarji !== null ? `%${detay.karMarji.toFixed(1)}` : "—" },
                { etiket: "Stok Değeri", deger: tl(detay.stokMaliyeti) },
              ].map((k) => (
                <div key={k.etiket} className="rounded-md p-2.5" style={{ background: T.steel100 }}>
                  <div className="text-xs" style={{ color: T.ink500 }}>
                    {k.etiket}
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={MONO}>
                    {k.deger}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2.5 rounded-md text-sm font-semibold" style={{ background: detay.oneri.emoji === "🔴" ? "#F9DEDE" : detay.oneri.emoji === "🟢" ? "#DEF0DF" : "#FDF1D6", color: detay.oneri.emoji === "🔴" ? T.red : detay.oneri.emoji === "🟢" ? T.green : "#8A6110" }}>
              {detay.oneri.emoji} {detay.oneri.metin}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
