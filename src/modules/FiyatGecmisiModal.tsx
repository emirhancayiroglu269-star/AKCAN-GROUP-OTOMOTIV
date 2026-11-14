/* Stok — satış fiyatı geçmişi modalı.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function FiyatGecmisiModal({ parca, onKapat }): any {
  return (
  <>
      {/* Satış fiyatı geçmişi modalı */}
      {parca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => onKapat()}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Satış Fiyatı Geçmişi — {parca.ad}
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {(parca.fiyatGecmisi || []).map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink500 }}>{R.tarihGoster(f.tarih)}</span>
                  <span style={R.MONO}>
                    {f.eskiFiyat !== null ? `${R.tl(f.eskiFiyat)} → ${R.tl(f.yeniFiyat)}` : `İlk fiyat: ${R.tl(f.yeniFiyat)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
  </>
  );
}
