/* Stok — hızlı aramada ürüne tıklanınca açılan detay paneli.
   Stok.tsx'ten bölündü; state HizliAramaSayfasi'nda yaşıyor. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function UrunDetayKarti({ db, detayParca, setDetayId, sepeteEkle }) {
  if (!detayParca) return null;
  return (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 pb-8 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDetayId(null)}
        >
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: R.T.steel100 }}
                >
                  {detayParca.fotograf ? (
                    <img src={detayParca.fotograf} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <R.ImageIcon size={18} style={{ color: R.T.ink500 }} />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                    {detayParca.ad}
                  </div>
                  <div className="text-xs mt-0.5" style={{ ...R.MONO, color: R.T.ink500 }}>
                    {detayParca.marka} · {detayParca.stokKodu}
                  </div>
                </div>
              </div>
              <button onClick={() => setDetayId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Alış / Maliyet
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={R.MONO}>
                    {R.tl(R.gecerliMaliyet(detayParca))}
                  </div>
                </div>
                <div className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Satış Fiyatı
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={R.MONO}>
                    {R.tl(detayParca.satisFiyati)}
                  </div>
                </div>
                <div className="rounded-md p-2.5" style={{ background: "#DEF0DF" }}>
                  <div className="text-xs" style={{ color: R.T.green }}>
                    Kâr Marjı
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.green }}>
                    {R.tl(detayParca.satisFiyati - R.gecerliMaliyet(detayParca))}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  OEM Kodları
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {db.kodlar.filter((k) => k.parcaId === detayParca.id && k.tip === "OEM").length === 0 ? (
                    <span className="text-sm" style={{ color: R.T.ink500 }}>
                      Kayıtlı OEM kodu yok.
                    </span>
                  ) : (
                    db.kodlar
                      .filter((k) => k.parcaId === detayParca.id && k.tip === "OEM")
                      .map((k) => (
                        <R.Rozet key={k.id} tone="graphite">
                          {k.kod}
                        </R.Rozet>
                      ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  Muadiller
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {db.kodlar.filter((k) => k.parcaId === detayParca.id && k.tip === "Muadil").length === 0 ? (
                    <span className="text-sm" style={{ color: R.T.ink500 }}>
                      Kayıtlı muadil kod yok.
                    </span>
                  ) : (
                    db.kodlar
                      .filter((k) => k.parcaId === detayParca.id && k.tip === "Muadil")
                      .map((k) => (
                        <R.Rozet key={k.id} tone="orange">
                          {k.kod}
                        </R.Rozet>
                      ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  Uyumlu Araçlar
                </div>
                {R.parcaUyumluAraclari(db, detayParca.id).length === 0 ? (
                  <p className="text-sm" style={{ color: R.T.ink500 }}>
                    Henüz araç eşleştirilmedi.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {R.parcaUyumluAraclari(db, detayParca.id).map((u) => (
                      <div key={u.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                        <span style={{ color: R.T.ink900 }}>{R.aracEtiketi(u.arac)}</span>
                        <span className="text-xs font-semibold" style={{ color: R.uyumlulukGorseli[u.durum].ton === "green" ? R.T.green : R.uyumlulukGorseli[u.durum].ton === "red" ? R.T.red : "#8A6110" }}>
                          {R.uyumlulukGorseli[u.durum].emoji} {u.durum}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  Stok Hareketleri (Alış Geçmişi)
                </div>
                {(detayParca.alisGecmisi || []).length === 0 ? (
                  <p className="text-sm" style={{ color: R.T.ink500 }}>
                    Henüz stok girişi yapılmadı.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {detayParca.alisGecmisi.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                        <span style={{ color: R.T.ink500 }}>{R.tarihGoster(g.tarih)}</span>
                        <span style={R.MONO}>
                          {g.adet} {detayParca.birim} × {R.tl(g.birimFiyat)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Son Alış
                  </div>
                  <div style={{ color: R.T.ink900 }}>
                    {detayParca.alisGecmisi?.length > 0
                      ? `${R.tarihGoster(detayParca.alisGecmisi[0].tarih)} · ${R.tl(detayParca.alisGecmisi[0].birimFiyat)}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Son Satış
                  </div>
                  <div style={{ color: R.T.ink500 }}>Satış modülü henüz eklenmedi</div>
                </div>
              </div>

              <R.Buton
                onClick={() => {
                  sepeteEkle(detayParca);
                  setDetayId(null);
                }}
              >
                <R.ShoppingCart size={15} /> Satışa Ekle
              </R.Buton>
            </div>
          </div>
      </div>
  );
}
