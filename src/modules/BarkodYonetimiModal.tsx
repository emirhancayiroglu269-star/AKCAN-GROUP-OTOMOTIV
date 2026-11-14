/* Stok — barkod yönetimi modalı.
   Birincil barkod listenin ilk elemanıdır; `barkod` alanı onunla senkron
   tutulur. Bir barkod yalnızca bir ürüne bağlı olabilir.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function BarkodYonetimiModal({ db, updateDb, parca, onKapat }): any {
  const [yeniDeger, setYeniDeger] = R.useState("");
  const [hata, setHata] = R.useState("");

  R.useEffect(() => {
    setYeniDeger("");
    setHata("");
  }, [parca?.id]);

  // Bir ürünün barkod listesini güncellerken p.barkod (birincil/eski alan)
  // her zaman listenin ilk elemanıyla senkron tutulur.
  const barkodlariGuncelle = (yeniListe) => {
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => (p.id === parca.id ? { ...p, barkodlar: yeniListe, barkod: yeniListe[0] || "" } : p)),
    }));
  };

  const barkodEkle = () => {
    const deger = yeniDeger.trim();
    if (!deger) {
      setHata("Barkod boş olamaz.");
      return;
    }
    const mevcutListe = R.parcaTumBarkodlari(parca);
    if (mevcutListe.some((b) => b.trim() === deger)) {
      setHata("Bu barkod bu üründe zaten kayıtlı.");
      return;
    }
    const baskaUrunde = R.barkodluParcaBul(db.parcalar, deger);
    if (baskaUrunde && baskaUrunde.id !== parca.id) {
      setHata(`Bu barkod zaten "${baskaUrunde.ad}" ürününde kayıtlı — bir barkod yalnızca bir ürüne bağlı olabilir.`);
      return;
    }
    barkodlariGuncelle([...mevcutListe, deger]);
    setYeniDeger("");
    setHata("");
  };

  const barkodSil = (barkod) => {
    barkodlariGuncelle(R.parcaTumBarkodlari(parca).filter((b) => b !== barkod));
  };

  const barkodBirincilYap = (barkod) => {
    barkodlariGuncelle([barkod, ...R.parcaTumBarkodlari(parca).filter((b) => b !== barkod)]);
  };

  const barkodOtomatikUret = () => {
    barkodlariGuncelle([...R.parcaTumBarkodlari(parca), R.otomatikBarkodUret(db)]);
  };

  return (
  <>
      {/* Barkod yönetimi */}
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
                <R.ScanLine size={16} style={{ color: R.T.orange }} />
                Barkodlar
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {parca.marka} — {parca.ad} ({parca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {R.parcaTumBarkodlari(parca).length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz barkod bağlanmadı.
                </p>
              ) : (
                R.parcaTumBarkodlari(parca).map((b, i) => (
                  <div key={b} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm" style={{ background: R.T.steel100 }}>
                    <span className="flex items-center gap-2 min-w-0">
                      {i === 0 && <R.Rozet tone="graphite">Birincil</R.Rozet>}
                      <span style={R.MONO} className="truncate">
                        {b}
                      </span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {i !== 0 && (
                        <button onClick={() => barkodBirincilYap(b)} className="text-xs font-semibold" style={{ color: R.T.orangeDark }}>
                          Birincil Yap
                        </button>
                      )}
                      <button onClick={() => barkodSil(b)} style={{ color: R.T.red }}>
                        <R.Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Yeni Barkod Ekle
              </span>
              <div className="flex gap-2">
                <input
                  value={yeniDeger}
                  onChange={(e) => {
                    setYeniDeger(e.target.value);
                    setHata("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && barkodEkle()}
                  placeholder="Barkod okutun veya yazın (EAN-13/EAN-8)"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none min-w-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  autoFocus
                />
                <button onClick={barkodEkle} className="px-3 py-2 rounded-md shrink-0" style={{ background: R.T.orange, color: "#fff" }}>
                  <R.Plus size={15} />
                </button>
              </div>
              {hata && (
                <p className="text-xs" style={{ color: R.T.red }}>
                  {hata}
                </p>
              )}
              <R.Buton variant="ghost" onClick={barkodOtomatikUret}>
                <R.ScanLine size={14} /> Otomatik Dahili Barkod Üret
              </R.Buton>
              {R.parcaTumBarkodlari(parca)[0] && (
                <div className="flex justify-center pt-2">
                  <R.EanBarkod kod={R.parcaTumBarkodlari(parca)[0]} genislik={160} yukseklik={50} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
  </>
  );
}
