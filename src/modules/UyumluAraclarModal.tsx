/* Stok — uyumlu araç yönetimi modalı.
   Ürüne araç bağlar ve uyumluluk durumunu (Kesin Uyumlu / Muhtemel …) yönetir.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function UyumluAraclarModal({ db, updateDb, parca, onKapat }): any {
  const [yeniDurum, setYeniDurum] = R.useState(R.UYUMLULUK_DURUMLARI[0]);
  const [aramaMetni, setAramaMetni] = R.useState("");

  const uyumluluklar = R.parcaUyumluAraclari(db, parca.id);
  const aramaSonuclari = aramaMetni.trim()
    ? db.araclar.filter((a) => {
        const etiket = R.aracEtiketi(a).toLowerCase();
        return etiket.includes(aramaMetni.trim().toLowerCase());
      })
    : [];

  R.useEffect(() => {
    setYeniDurum(R.UYUMLULUK_DURUMLARI[0]);
    setAramaMetni("");
  }, [parca?.id]);

  const uyumlulukEkle = (aracId) => {
    if (db.uyumluluklar.some((u) => u.parcaId === parca.id && u.aracId === aracId)) {
      R.bildirimGoster("⚠️ Bu araç uyumluluğu zaten mevcut.", "hata");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      uyumluluklar: [...prev.uyumluluklar, { id: R.yeniId("uy"), parcaId: parca.id, aracId, durum: yeniDurum, not: "" }],
    }));
    setAramaMetni("");
  };

  const uyumlulukDurumGuncelle = (uyumlulukId, durum) => {
    updateDb((prev) => ({ ...prev, uyumluluklar: prev.uyumluluklar.map((u) => (u.id === uyumlulukId ? { ...u, durum } : u)) }));
  };

  const uyumlulukSil = (uyumlulukId) => {
    updateDb((prev) => ({ ...prev, uyumluluklar: prev.uyumluluklar.filter((u) => u.id !== uyumlulukId) }));
  };

  return (
  <>
      {/* Uyumlu araçlar yönetimi */}
      {parca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => onKapat()}
        >
          <div className="w-full max-w-lg rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                <R.Car size={16} style={{ color: R.T.orange }} />
                Uyumlu Araçlar
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {parca.marka} — {parca.ad} ({parca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {R.parcaUyumluAraclari(db, parca.id).length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz araç bağlanmadı.
                </p>
              ) : (
                R.parcaUyumluAraclari(db, parca.id).map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm" style={{ background: R.T.steel100 }}>
                    <span className="min-w-0 truncate" style={{ color: R.T.ink900 }}>
                      {R.aracEtiketi(u.arac)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={u.durum}
                        onChange={(e) => uyumlulukDurumGuncelle(u.id, e.target.value)}
                        className="text-xs px-1.5 py-1 rounded border outline-none bg-white"
                        style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                      >
                        {R.UYUMLULUK_DURUMLARI.map((d) => (
                          <option key={d} value={d}>
                            {R.uyumlulukGorseli[d].emoji} {d}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => uyumlulukSil(u.id)} style={{ color: R.T.red }}>
                        <R.Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Araç Ekle
              </span>
              <div className="flex gap-2">
                <select
                  value={yeniDurum}
                  onChange={(e) => setYeniDurum(e.target.value)}
                  className="px-2 py-2 rounded-md border text-xs outline-none bg-white shrink-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {R.UYUMLULUK_DURUMLARI.map((d) => (
                    <option key={d} value={d}>
                      {R.uyumlulukGorseli[d].emoji} {d}
                    </option>
                  ))}
                </select>
                <input
                  value={aramaMetni}
                  onChange={(e) => setAramaMetni(e.target.value)}
                  placeholder="ör. Golf 1.6 TDI"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none min-w-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                />
              </div>
              {aramaSonuclari.length > 0 && (
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {aramaSonuclari.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => uyumlulukEkle(a.id)}
                      className="text-left text-sm px-2.5 py-1.5 rounded-md hover:bg-gray-50"
                      style={{ background: R.T.steel100, color: R.T.ink900 }}
                    >
                      {R.aracEtiketi(a)}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs" style={{ color: R.T.ink500 }}>
                Aracı burada bulamıyorsanız önce "Araçlar" sayfasından araç veritabanına ekleyin.
              </p>
            </div>
          </div>
        </div>
      )}
  </>
  );
}
