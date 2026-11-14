/* Stok — tedarikçi karşılaştırması modalı.
   "Bu ürünü kimlerden aldım?" — alış geçmişini tedarikçi bazında özetler.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function TedarikciKarsilastirmaModal({ parca, onKapat }): any {
  return (
  <>
      {/* Bu ürünü kimlerden aldım — tedarikçi karşılaştırması */}
      {parca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => onKapat()}
        >
          <div className="w-full max-w-md rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Bu Ürünü Kimlerden Aldım? — {parca.ad}
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Tekrar sipariş verirken tedarikçileri hızlıca karşılaştırın — her tedarikçi için en son alış fiyatı gösterilir.
            </p>
            {(() => {
              const tedarikciBazinda: Record<string, any[]> = {};
              (parca.alisGecmisi || [])
                .filter((g) => g.tedarikci)
                .forEach((g) => {
                  if (!tedarikciBazinda[g.tedarikci]) tedarikciBazinda[g.tedarikci] = [];
                  tedarikciBazinda[g.tedarikci].push(g);
                });
              const gruplar = Object.entries(tedarikciBazinda)
                .map(([tedarikci, gecmis]) => ({ tedarikci, gecmis: gecmis.sort((a, b) => Number(new Date(b.tarih)) - Number(new Date(a.tarih))) }))
                .sort((a, b) => a.gecmis[0].birimFiyat - b.gecmis[0].birimFiyat);
              const enUcuz = gruplar[0]?.gecmis[0]?.birimFiyat;
              return (
                <div className="flex flex-col gap-2">
                  {gruplar.map((g) => (
                    <div key={g.tedarikci} className="rounded-md overflow-hidden" style={{ border: `1px solid ${R.T.steel200}` }}>
                      <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: R.T.steel100 }}>
                        <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: R.T.ink900 }}>
                          {g.tedarikci}
                          {g.gecmis[0].birimFiyat === enUcuz && <R.Rozet tone="green">En Ucuz</R.Rozet>}
                        </span>
                        <span className="text-sm font-semibold" style={R.MONO}>
                          {R.tl(g.gecmis[0].birimFiyat)}
                        </span>
                      </div>
                      {g.gecmis.length > 1 && (
                        <div className="px-3 py-2 flex flex-col gap-1">
                          {g.gecmis.map((h) => (
                            <div key={h.id} className="flex items-center justify-between text-xs">
                              <span style={{ color: R.T.ink500 }}>{R.tarihGoster(h.tarih)}</span>
                              <span style={R.MONO}>{R.tl(h.birimFiyat)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
  </>
  );
}
