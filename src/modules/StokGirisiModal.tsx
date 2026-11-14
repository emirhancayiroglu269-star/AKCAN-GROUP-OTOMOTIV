/* Stok — stok girişi modalı.
   Gelen adet + birim fiyatı ağırlıklı ortalama maliyetle birleştirir, stoğu artırır
   ve hem maliyet/alış geçmişine hem stok hareket defterine işler.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function StokGirisiModal({ db, updateDb, parca, onKapat }): any {
  const [adet, setAdet] = R.useState("");
  const [paketId, setPaketId] = R.useState("");
  const [paketAdedi, setPaketAdedi] = R.useState("");
  const [fiyat, setFiyat] = R.useState("");
  const [belgeNo, setBelgeNo] = R.useState("");
  const [kullanici, setKullanici] = R.useState("");

  R.useEffect(() => {
    setAdet("");
    setPaketId("");
    setPaketAdedi("");
    setFiyat(String(parca?.sonAlisFiyati || parca?.alisFiyati || ""));
    setBelgeNo("");
    setKullanici(R.sonKullaniciAdi());
  }, [parca?.id]);

  // Gelen adet + fiyatı, ağırlıklı ortalama maliyet formülüyle mevcut ortalama
  // maliyetle birleştirir; stoğu artırır; hem maliyet/alış geçmişine hem de
  // genel stok hareket geçmişine ("Mal Alış") işler.
  const kaydet = () => {
    const gelenAdet = parseFloat(adet);
    const birimFiyat = parseFloat(fiyat);
    if (!gelenAdet || gelenAdet <= 0) {
      R.bildirimGoster("Geçerli bir adet girin.", "hata");
      return;
    }
    if (!birimFiyat || birimFiyat <= 0) {
      R.bildirimGoster("Geçerli bir birim fiyat girin.", "hata");
      return;
    }
    let engellendi = false;
    updateDb((prev) => {
      const p = prev.parcalar.find((x) => x.id === parca.id);
      if (!p) return prev;
      // ÖNEMLİ SIRA: stok hareketi KABUL EDİLMEDEN ortalama maliyet ve alış
      // geçmişi yazılmaz. Aksi halde hareket engellendiğinde (veya aynı belge
      // no ile zaten uygulanmışsa) stok artmadan maliyet artıyordu.
      const hareket = R.stokHareketiUygula(prev, {
        parcaId: parca.id,
        tur: "Mal Alış",
        giris: gelenAdet,
        belgeNo: belgeNo.trim(),
        kullanici: kullanici.trim(),
        aciklama: `Birim fiyat: ${R.tl(birimFiyat)}`,
      });
      if (hareket.durum === "zaten-uygulandi") {
        R.bildirimGoster("Bu belge numarasıyla bu ürün için stok girişi zaten yapılmış.", "uyari");
        engellendi = true;
        return prev;
      }
      if (hareket.durum !== "uygulandi") {
        R.bildirimGoster("Stok girişi uygulanamadı.", "hata");
        engellendi = true;
        return prev;
      }
      const yeni = hareket.db;
      const yeniOrtalama = R.agirlikliOrtalamaMaliyetHesapla(p.stok, p.ortalamaMaliyet, gelenAdet, birimFiyat);
      return {
        ...yeni,
        parcalar: yeni.parcalar.map((x) =>
          x.id === parca.id
            ? {
                ...x,
                sonAlisFiyati: birimFiyat,
                ortalamaMaliyet: Math.round(yeniOrtalama * 100) / 100,
                alisGecmisi: [{ id: R.yeniId("g"), tarih: R.zamanDamgasi(), adet: gelenAdet, birimFiyat }, ...(x.alisGecmisi || [])],
              }
            : x
        ),
      };
    });
    if (engellendi) return;
    R.sonKullaniciAdiKaydet(kullanici);
    R.bildirimGoster("Stok girişi işlendi, ortalama maliyet güncellendi.", "basari");
    onKapat();
  };

  return (
  <>
      {/* Stok girişi modalı */}
      {parca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => onKapat()}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Girişi — {parca.ad}
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Mevcut stok: <strong>{parca.stok} {parca.birim}</strong> · Mevcut ortalama maliyet:{" "}
              <strong>{R.tl(parca.ortalamaMaliyet)}</strong>
            </p>
            <div className="flex flex-col gap-3">
              {parca.paketBirimleri && parca.paketBirimleri.length > 0 && (
                <div className="flex gap-2 items-end p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                  <div className="flex-1">
                    <span className="text-xs font-medium block mb-1" style={{ color: R.T.ink500 }}>
                      Paket ile Gir
                    </span>
                    <select
                      value={paketId}
                      onChange={(e) => setPaketId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border text-sm outline-none bg-white"
                      style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    >
                      <option value="">Paket seç…</option>
                      {parca.paketBirimleri.map((pk) => (
                        <option key={pk.id} value={pk.id}>
                          {pk.ad} (1 = {pk.iceriyorAdet} {parca.birim})
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    value={paketAdedi}
                    onChange={(e) => setPaketAdedi(e.target.value)}
                    placeholder="Kaç paket"
                    className="w-24 px-2 py-1.5 rounded-md border text-sm outline-none"
                    style={{ borderColor: R.T.steel300 }}
                  />
                  <button
                    onClick={() => {
                      const pk = parca.paketBirimleri.find((p) => p.id === paketId);
                      if (!pk || !parseFloat(paketAdedi)) {
                        R.bildirimGoster("Paket ve adet seçin.", "hata");
                        return;
                      }
                      setAdet(String(pk.iceriyorAdet * parseFloat(paketAdedi)));
                    }}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold shrink-0"
                    style={{ background: R.T.orange, color: "#fff" }}
                  >
                    Adete Çevir
                  </button>
                </div>
              )}
              <R.Girdi
                label={`Gelen Adet (${parca.birim})`}
                type="number"
                value={adet}
                onChange={(e) => setAdet(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <R.Girdi
                label="Birim Alış Fiyatı (KDV Hariç)"
                type="number"
                value={fiyat}
                onChange={(e) => setFiyat(e.target.value)}
                placeholder="0.00"
              />
              {parseFloat(adet) > 0 && parseFloat(fiyat) > 0 && (
                <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  Yeni ortalama maliyet:{" "}
                  <strong style={{ color: R.T.ink900 }}>
                    {R.tl(
                      R.agirlikliOrtalamaMaliyetHesapla(
                        parca.stok,
                        parca.ortalamaMaliyet,
                        parseFloat(adet),
                        parseFloat(fiyat)
                      )
                    )}
                  </strong>{" "}
                  ({(parca.stok || 0)} {parca.birim} × {R.tl(parca.ortalamaMaliyet)} + {adet} × {R.tl(parseFloat(fiyat))})
                </p>
              )}
              <R.Girdi
                label="Belge No (opsiyonel)"
                value={belgeNo}
                onChange={(e) => setBelgeNo(e.target.value)}
                placeholder="ör. AL-1254"
              />
              <R.Girdi
                label="İşlemi Yapan"
                value={kullanici}
                readOnly
                placeholder="ör. Emirhan"
              />
              <div className="flex gap-2">
                <R.Buton onClick={kaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => onKapat()}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}
  </>
  );
}
