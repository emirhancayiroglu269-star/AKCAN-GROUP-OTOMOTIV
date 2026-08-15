/* Raporlar ekranı — görev bazlı ayrıştırılmış bileşen.
 * Finans/veri sözleşmeleri bu fazda değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function RaporlarSayfasi({ db, baslangicKategori, baslangicMarka }) {
  const [altSekme, setAltSekme] = R.useState(baslangicKategori?.altSekme || baslangicMarka?.altSekme || "ozet");
  const bugunIso = R.isoGun(new Date());
  const ayBasiIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA");
  const [baslangic, setBaslangic] = R.useState(ayBasiIso);
  const [bitis, setBitis] = R.useState(bugunIso);
  const [markaFiltre, setMarkaFiltre] = R.useState(baslangicMarka?.marka || "");
  const [kategoriFiltre, setKategoriFiltre] = R.useState(baslangicKategori?.kategori || "");

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);
  const markalar = [...new Set(db.parcalar.map((p) => p.marka).filter(Boolean))].sort();
  const kategoriler = [...new Set(db.parcalar.map((p) => p.kategori).filter(Boolean))].sort();

  const hizliAralik = (gun) => {
    setBitis(bugunIso);
    if (gun === "bugun") setBaslangic(bugunIso);
    else if (gun === "hafta") setBaslangic(R.isoGun(new Date(Date.now() - 6 * 86400000)));
    else if (gun === "ay") setBaslangic(ayBasiIso);
    else if (gun === "yil") setBaslangic(new Date(new Date().getFullYear(), 0, 1).toLocaleDateString("en-CA"));
  };

  // Tarih aralığındaki (iptal hariç) satışlar — satış-seviyesi metrikler için.
  const tarihliSatislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= baslangic && s.tarih.slice(0, 10) <= bitis);

  // Marka/kategori filtresi kalem seviyesinde uygulanır — bir satışın SADECE
  // filtreye uyan kalemleri ürün/kâr raporlarına dahil edilir.
  const tumKalemler = tarihliSatislar.flatMap((s) =>
    s.kalemler
      .map((k) => ({ ...k, satisTarihi: s.tarih, satisId: s.id, satisiYapan: s.satisiYapan }))
      .filter((k) => (markaFiltre ? k.marka === markaFiltre : true) && (kategoriFiltre ? db.parcalar.find((p) => p.id === k.parcaId)?.kategori === kategoriFiltre : true))
  );

  const FiltrePaneli = (
    <R.Kart className="p-3.5 flex flex-wrap items-end gap-2">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "bugun", ad: "Bugün" },
          { id: "hafta", ad: "7 Gün" },
          { id: "ay", ad: "Bu Ay" },
          { id: "yil", ad: "Bu Yıl" },
        ].map((h) => (
          <button key={h.id} onClick={() => hizliAralik(h.id)} className="px-2.5 py-2 text-xs font-semibold" style={{ color: R.T.ink500 }}>
            {h.ad}
          </button>
        ))}
      </div>
      <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
      <span className="text-xs" style={{ color: R.T.ink500 }}>
        —
      </span>
      <input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
      <select value={markaFiltre} onChange={(e) => setMarkaFiltre(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
        <option value="">Tüm Markalar</option>
        {markalar.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <select value={kategoriFiltre} onChange={(e) => setKategoriFiltre(e.target.value)} className="px-2 py-2 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
        <option value="">Tüm Kategoriler</option>
        {kategoriler.map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
    </R.Kart>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "ozet", ad: "Özet" },
          { id: "satis", ad: "Satış Raporları" },
          { id: "kar", ad: "Kâr Raporları" },
          { id: "personel", ad: "Personel Performansı" },
          { id: "fiyatanaliz", ad: "Marka/Kategori Fiyat Analizi" },
          { id: "urun", ad: "Ürün Performansı" },
          { id: "stok", ad: "Stok Raporları" },
          { id: "cari", ad: "Cari / Kasa" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-xs font-semibold whitespace-nowrap px-2"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "ozet" && <RaporOzet db={db} />}
      {altSekme === "satis" && (
        <RaporSatis db={db} filtrePaneli={FiltrePaneli} tarihliSatislar={tarihliSatislar} tumKalemler={tumKalemler} baslangic={baslangic} bitis={bitis} />
      )}
      {altSekme === "kar" && <RaporKar db={db} filtrePaneli={FiltrePaneli} tumKalemler={tumKalemler} baslangic={baslangic} bitis={bitis} />}
      {altSekme === "personel" && <RaporPersonel db={db} filtrePaneli={FiltrePaneli} tumKalemler={tumKalemler} tarihliSatislar={tarihliSatislar} baslangic={baslangic} bitis={bitis} />}
      {altSekme === "fiyatanaliz" && <RaporFiyatAnalizi db={db} />}
      {altSekme === "urun" && <RaporUrunPerformansi db={db} filtrePaneli={FiltrePaneli} tumKalemler={tumKalemler} />}
      {altSekme === "stok" && <RaporStok db={db} aktifParcalar={aktifParcalar} />}
      {altSekme === "cari" && <RaporCariKasa db={db} />}
    </div>
  );
}
