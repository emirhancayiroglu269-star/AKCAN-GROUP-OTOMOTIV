import React, { useState } from "react";
import { Package, Truck, X } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { tl, tarihGoster } from "../lib/format";
import { gecerliMaliyet } from "../lib/maliyet";
import {
  sonNGunSatisAdedi,
  parcaSonSatisTarihi,
  satisHiziSiniflandir,
  stokYasiGunu,
  stokYasiGrubu,
  oluStokAksiyonOnerileri,
  SATIS_HIZI_SINIF_GORSELI,
  STOK_YASI_GRUPLARI,
} from "../lib/olu-stok";
import { Kart, Bos, Rozet } from "../components/ui";

export function OluStokSayfasi({ db, updateDb, setSekme }) {
  const [altSekme, setAltSekme] = useState("ozet");
  const [sinifFiltre, setSinifFiltre] = useState("tumu");
  const [detayParcaId, setDetayParcaId] = useState(null);

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set" && (p.stok || 0) > 0);

  const siniflandirilmis = aktifParcalar.map((p) => {
    const sinif = satisHiziSiniflandir(db, p);
    const sonSatis = parcaSonSatisTarihi(db, p.id);
    const gunFarki = sonSatis ? Math.floor((Date.now() - new Date(sonSatis)) / 86400000) : null;
    const maliyet = gecerliMaliyet(p, db);
    const toplamMaliyet = (p.stok || 0) * maliyet;
    const son30 = sonNGunSatisAdedi(db, p.id, 30);
    const son180 = sonNGunSatisAdedi(db, p.id, 180);
    return { parca: p, sinif, sonSatis, gunFarki, maliyet, toplamMaliyet, son30, son180, stokYasi: stokYasiGunu(db, p.id) };
  });

  const sinifOzeti = ["Hızlı", "Normal", "Yavaş", "Ölü Stok"].map((s) => {
    const liste = siniflandirilmis.filter((x) => x.sinif === s);
    return { sinif: s, adet: liste.length, deger: liste.reduce((t, x) => t + x.toplamMaliyet, 0) };
  });

  const filtreliListe = (sinifFiltre === "tumu" ? siniflandirilmis : siniflandirilmis.filter((x) => x.sinif === sinifFiltre)).sort((a, b) => b.toplamMaliyet - a.toplamMaliyet);

  // Fazla stok (8. madde) — ölü stoktan ayrı: mevcut stok, hedef stoğu
  // aşıyor VE son 30 günde çok az satılıyor.
  const fazlaStokListesi = siniflandirilmis.filter((x) => x.parca.hedefStok > 0 && x.parca.stok > x.parca.hedefStok && x.son30 <= 3).sort((a, b) => b.toplamMaliyet - a.toplamMaliyet);

  // Tedarikçiye İade Kontrolü (7. madde) — tedarikçi bazında gruplu, uzun
  // süredir satılmayan ürünler.
  const esik = db.ayarlar?.satisHiziEsikleri || { oluStokGunEsigi: 90 };
  const iadeAdaylari = siniflandirilmis.filter((x) => x.sinif === "Ölü Stok" && x.parca.tedarikci);
  const tedarikciBazindaIade = (() => {
    const harita = {};
    iadeAdaylari.forEach((x) => {
      if (!harita[x.parca.tedarikci]) harita[x.parca.tedarikci] = [];
      harita[x.parca.tedarikci].push(x);
    });
    return Object.entries(harita)
      .map(([tedarikci, liste]) => ({ tedarikci, liste, toplamDeger: liste.reduce((t, x) => t + x.toplamMaliyet, 0) }))
      .sort((a, b) => b.toplamDeger - a.toplamDeger);
  })();

  const stokYasiOzeti = STOK_YASI_GRUPLARI.map((g) => ({
    grup: g,
    adet: siniflandirilmis.filter((x) => stokYasiGrubu(x.stokYasi) === g).length,
    deger: siniflandirilmis.filter((x) => stokYasiGrubu(x.stokYasi) === g).reduce((t, x) => t + x.toplamMaliyet, 0),
  })).filter((g) => g.adet > 0);

  const detay = detayParcaId ? siniflandirilmis.find((x) => x.parca.id === detayParcaId) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: T.steel300 }}>
        {[
          { id: "ozet", ad: "Sınıflandırma Özeti" },
          { id: "liste", ad: "Ürün Listesi" },
          { id: "fazla", ad: `Fazla Stok${fazlaStokListesi.length > 0 ? ` (${fazlaStokListesi.length})` : ""}` },
          { id: "iade", ad: "Tedarikçiye İade Kontrolü" },
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

      {altSekme === "ozet" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sinifOzeti.map((s) => (
              <button
                key={s.sinif}
                onClick={() => {
                  setSinifFiltre(s.sinif);
                  setAltSekme("liste");
                }}
                className="text-left"
              >
                <Kart className="p-3.5" style={{ background: s.sinif === "Ölü Stok" && s.adet > 0 ? "#F9DEDE" : "#fff" }}>
                  <div className="text-xs flex items-center gap-1" style={{ color: T.ink500 }}>
                    {SATIS_HIZI_SINIF_GORSELI[s.sinif].emoji} {s.sinif}
                  </div>
                  <div className="text-lg font-semibold mt-0.5" style={MONO}>
                    {s.adet} ürün
                  </div>
                  <div className="text-xs" style={{ ...MONO, color: T.ink500 }}>
                    {tl(s.deger)}
                  </div>
                </Kart>
              </button>
            ))}
          </div>

          {stokYasiOzeti.length > 0 && (
            <Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
                Stok Yaşı Dağılımı
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {STOK_YASI_GRUPLARI.map((g) => {
                  const x = stokYasiOzeti.find((s) => s.grup === g);
                  return (
                    <div key={g} className="rounded-md p-2.5 text-center" style={{ background: T.steel100 }}>
                      <div className="text-xs" style={{ color: T.ink500 }}>
                        {g}
                      </div>
                      <div className="text-sm font-semibold mt-0.5" style={MONO}>
                        {x?.adet || 0} ürün
                      </div>
                      <div className="text-xs" style={{ ...MONO, color: T.ink500 }}>
                        {tl(x?.deger || 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Kart>
          )}

          <p className="text-xs px-1" style={{ color: T.ink500 }}>
            Eşikler: Son 30 günde {esik.hizliEsigi}+ satış → Hızlı, {(db.ayarlar?.satisHiziEsikleri || {}).normalEsigiMin}–{esik.hizliEsigi - 1} → Normal,{" "}
            {(db.ayarlar?.satisHiziEsikleri || {}).yavasEsigiMin}–{(db.ayarlar?.satisHiziEsikleri || {}).normalEsigiMin - 1} → Yavaş, {esik.oluStokGunEsigi}+ gündür satılmadıysa → Ölü Stok. Ayarlar → Fiyat'tan
            değiştirilebilir.
          </p>
        </div>
      )}

      {altSekme === "liste" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: T.steel300 }}>
            {["tumu", "Hızlı", "Normal", "Yavaş", "Ölü Stok"].map((s) => (
              <button
                key={s}
                onClick={() => setSinifFiltre(s)}
                className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                style={{ background: sinifFiltre === s ? T.graphite900 : "#fff", color: sinifFiltre === s ? "#fff" : T.ink500 }}
              >
                {s === "tumu" ? "Tümü" : `${SATIS_HIZI_SINIF_GORSELI[s].emoji} ${s}`}
              </button>
            ))}
          </div>
          <Kart className="overflow-hidden">
            <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: T.steel100, color: T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Ürün</th>
                    <th className="text-right font-semibold px-2 py-2">Stok</th>
                    <th className="text-right font-semibold px-2 py-2">Toplam Maliyet</th>
                    <th className="text-left font-semibold px-2 py-2">Son Satış</th>
                    <th className="text-left font-semibold px-3 py-2">Sınıf</th>
                  </tr>
                </thead>
                <tbody>
                  {filtreliListe.map((x) => (
                    <tr key={x.parca.id} style={{ borderTop: `1px solid ${T.steel200}`, cursor: "pointer" }} onClick={() => setDetayParcaId(x.parca.id)}>
                      <td className="px-3 py-2" style={{ color: T.ink900 }}>
                        {x.parca.marka} {x.parca.ad}
                      </td>
                      <td className="px-2 py-2 text-right" style={MONO}>
                        {x.parca.stok}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold" style={MONO}>
                        {tl(x.toplamMaliyet)}
                      </td>
                      <td className="px-2 py-2" style={{ color: T.ink500 }}>
                        {x.sonSatis ? `${tarihGoster(x.sonSatis)} (${x.gunFarki} gün önce)` : "Hiç satılmadı"}
                      </td>
                      <td className="px-3 py-2">
                        <Rozet tone={SATIS_HIZI_SINIF_GORSELI[x.sinif].ton}>
                          {SATIS_HIZI_SINIF_GORSELI[x.sinif].emoji} {x.sinif}
                        </Rozet>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>
        </div>
      )}

      {altSekme === "fazla" && (
        <Kart className="overflow-hidden">
          {fazlaStokListesi.length === 0 ? (
            <Bos ikon={Package} baslik="Fazla stok yok" aciklama="Hedef stoğu aşan ve az satan ürün bulunmuyor." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: T.steel100, color: T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Ürün</th>
                    <th className="text-right font-semibold px-2 py-2">Mevcut Stok</th>
                    <th className="text-right font-semibold px-2 py-2">Hedef Stok</th>
                    <th className="text-right font-semibold px-2 py-2">Son 30 Gün Satış</th>
                    <th className="text-right font-semibold px-3 py-2">Bağlı Sermaye</th>
                  </tr>
                </thead>
                <tbody>
                  {fazlaStokListesi.map((x) => (
                    <tr key={x.parca.id} style={{ borderTop: `1px solid ${T.steel200}` }}>
                      <td className="px-3 py-2" style={{ color: T.ink900 }}>
                        {x.parca.marka} {x.parca.ad}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ ...MONO, color: "#8A6110" }}>
                        {x.parca.stok}
                      </td>
                      <td className="px-2 py-2 text-right" style={{ ...MONO, color: T.ink500 }}>
                        {x.parca.hedefStok}
                      </td>
                      <td className="px-2 py-2 text-right" style={MONO}>
                        {x.son30}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold" style={MONO}>
                        {tl(x.toplamMaliyet)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Kart>
      )}

      {altSekme === "iade" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs" style={{ color: T.ink500 }}>
            {esik.oluStokGunEsigi}+ gündür satılmayan ve tedarikçisi belli olan ürünler, tedarikçiye iade değerlendirmesi için tedarikçi bazında gruplanmıştır.
          </p>
          {tedarikciBazindaIade.length === 0 ? (
            <Kart>
              <Bos ikon={Truck} baslik="İade adayı yok" aciklama="Şu an tedarikçisi belli, uzun süredir satılmayan ürün bulunmuyor." />
            </Kart>
          ) : (
            tedarikciBazindaIade.map((t) => (
              <Kart key={t.tedarikci} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm" style={{ color: T.ink900 }}>
                    {t.tedarikci} → {esik.oluStokGunEsigi}+ gündür satılmayan {t.liste.length} ürün
                  </h4>
                  <span className="text-sm font-semibold" style={MONO}>
                    {tl(t.toplamDeger)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {t.liste.map((x) => (
                    <div key={x.parca.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded" style={{ background: T.steel100 }}>
                      <span style={{ color: T.ink900 }}>
                        {x.parca.ad} · {x.parca.stok} adet
                      </span>
                      <span style={MONO}>{tl(x.toplamMaliyet)}</span>
                    </div>
                  ))}
                </div>
              </Kart>
            ))
          )}
        </div>
      )}

      {/* Ürün detayı + aksiyon önerileri (5. ve 6. madde) */}
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
            <div className="flex flex-col gap-1.5 text-sm mb-3">
              <div className="flex justify-between px-2.5 py-1.5 rounded-md" style={{ background: T.steel100 }}>
                <span style={{ color: T.ink500 }}>Stok</span>
                <strong style={{ color: T.ink900 }}>{detay.parca.stok}</strong>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 rounded-md" style={{ background: T.steel100 }}>
                <span style={{ color: T.ink500 }}>Maliyet (birim)</span>
                <strong style={MONO}>{tl(detay.maliyet)}</strong>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 rounded-md" style={{ background: T.steel100 }}>
                <span style={{ color: T.ink500 }}>Toplam Maliyet</span>
                <strong style={MONO}>{tl(detay.toplamMaliyet)}</strong>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 rounded-md" style={{ background: T.steel100 }}>
                <span style={{ color: T.ink500 }}>Son Satış</span>
                <strong style={{ color: T.ink900 }}>{detay.sonSatis ? `${detay.gunFarki} gün önce` : "Hiç satılmadı"}</strong>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 rounded-md" style={{ background: T.steel100 }}>
                <span style={{ color: T.ink500 }}>Son 6 Ay Satış</span>
                <strong style={{ color: T.ink900 }}>{detay.son180} adet</strong>
              </div>
            </div>
            <Rozet tone={SATIS_HIZI_SINIF_GORSELI[detay.sinif].ton}>
              {SATIS_HIZI_SINIF_GORSELI[detay.sinif].emoji} {detay.sinif} {detay.sinif === "Ölü Stok" || detay.sinif === "Yavaş" ? "ürün" : ""}
            </Rozet>

            {(detay.sinif === "Ölü Stok" || detay.sinif === "Yavaş") && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold uppercase mb-1.5" style={{ color: T.ink500 }}>
                  Önerilen Aksiyonlar
                </h4>
                <ul className="flex flex-col gap-1">
                  {oluStokAksiyonOnerileri(db, detay.parca, detay.sinif).map((o, i) => (
                    <li key={i} className="text-sm px-2.5 py-1.5 rounded-md" style={{ background: "#FDF1D6", color: "#8A6110" }}>
                      • {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
