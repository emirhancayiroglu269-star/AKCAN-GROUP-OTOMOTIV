/* Stok — OEM / muadil kod yönetimi modalı.
   Aynı kodun aynı ürüne iki kez eklenmesini engeller; farklı ürünlere aynı
   kodun bağlanması normaldir (çapraz referansın kendisi budur).
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function KodYonetimiModal({ db, updateDb, parca, onKapat }): any {
  const [yeniTip, setYeniTip] = R.useState("OEM");
  const [yeniDeger, setYeniDeger] = R.useState("");
  const [hata, setHata] = R.useState("");

  const kodlar = db.kodlar.filter((k) => k.parcaId === parca.id);

  R.useEffect(() => {
    setYeniTip("OEM");
    setYeniDeger("");
    setHata("");
  }, [parca?.id]);

  const kodEkle = () => {
    const deger = yeniDeger.trim();
    if (!deger) {
      setHata("Kod boş olamaz.");
      return;
    }
    const normalize = R.kodNormalize(deger);
    // Aynı OEM/Muadil kodun aynı ürüne yanlışlıkla iki kez eklenmesini engeller
    // (farklı ürünlere aynı kodun bağlanması normaldir — çapraz referansın kendisidir).
    if (kodlar.some((k) => R.kodNormalize(k.kod) === normalize)) {
      setHata("Bu kod bu üründe zaten kayıtlı.");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      kodlar: [...prev.kodlar, { id: R.yeniId("k"), parcaId: parca.id, tip: yeniTip, kod: deger }],
    }));
    setYeniDeger("");
    setHata("");
  };

  const kodSil = (kodId) => {
    updateDb((prev) => ({ ...prev, kodlar: prev.kodlar.filter((k) => k.id !== kodId) }));
  };

  return (
  <>
      {/* OEM / Muadil kod yönetimi */}
      {parca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => onKapat()}
        >
          <div
            className="w-full max-w-md rounded-lg p-5 overflow-y-auto"
            style={{ background: "#fff", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                <R.GitCompare size={16} style={{ color: R.T.orange }} />
                OEM / Muadil Kodlar
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {parca.marka} — {parca.ad} ({parca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {kodlar.length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz kod bağlanmadı.
                </p>
              ) : (
                kodlar.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm"
                    style={{ background: R.T.steel100 }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <R.Rozet tone={k.tip === "OEM" ? "graphite" : "orange"}>{k.tip}</R.Rozet>
                      <span style={R.MONO} className="truncate">
                        {k.kod}
                      </span>
                    </span>
                    <button onClick={() => kodSil(k.id)} style={{ color: R.T.red }} className="shrink-0">
                      <R.Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Yeni Kod Ekle
              </span>
              <div className="flex gap-2">
                <select
                  value={yeniTip}
                  onChange={(e) => setYeniTip(e.target.value)}
                  className="px-2 py-2 rounded-md border text-sm outline-none bg-white shrink-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {R.KOD_TIPLERI.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input
                  value={yeniDeger}
                  onChange={(e) => {
                    setYeniDeger(e.target.value);
                    setHata("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && kodEkle()}
                  placeholder="ör. 03L 115 562"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none min-w-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                />
                <button
                  onClick={kodEkle}
                  className="px-3 py-2 rounded-md shrink-0"
                  style={{ background: R.T.orange, color: "#fff" }}
                >
                  <R.Plus size={15} />
                </button>
              </div>
              {hata && (
                <p className="text-xs" style={{ color: R.T.red }}>
                  {hata}
                </p>
              )}
              <p className="text-xs" style={{ color: R.T.ink500 }}>
                <strong>OEM</strong>: aracın orijinal parça numarası (ör. VW/Audi 03L115562).{" "}
                <strong>Muadil</strong>: başka bir markanın kendi kod sistemindeki karşılığı. Boşluk/tire farkı önemli
                değil — arama otomatik normalize eder.
              </p>
            </div>
          </div>
        </div>
      )}
  </>
  );
}
