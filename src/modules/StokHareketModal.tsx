/* Stok — stok hareketleri defteri.
   Tüm giriş/çıkışların değiştirilemez kaydı — ürün bazında filtrelenir.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function StokHareketModal({ db, parca, onKapat }): any {
  return (
  <>
      {/* Stok Hareketleri defteri — tüm giriş/çıkışların değiştirilemez kaydı */}
      {parca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => onKapat()}
        >
          <div
            className="w-full max-w-3xl rounded-lg overflow-hidden"
            style={{ background: "#fff", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Hareketleri — {parca.ad}
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: "75vh" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Tarih/Saat</th>
                    <th className="text-left font-semibold px-3 py-2">İşlem Türü</th>
                    <th className="text-left font-semibold px-3 py-2">Belge No</th>
                    <th className="text-right font-semibold px-3 py-2">Giriş</th>
                    <th className="text-right font-semibold px-3 py-2">Çıkış</th>
                    <th className="text-right font-semibold px-3 py-2">Kalan Stok</th>
                    <th className="text-left font-semibold px-3 py-2">Kullanıcı</th>
                    <th className="text-left font-semibold px-3 py-2">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {db.stokHareketleri
                    .filter((h) => h.parcaId === parca.id)
                    .map((h) => (
                      <tr key={h.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: R.T.ink500 }}>
                          {new Date(h.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                          {h.tur}
                        </td>
                        <td className="px-3 py-2" style={R.MONO}>
                          {h.belgeNo || "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                          {h.giris > 0 ? `+${h.giris}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                          {h.cikis > 0 ? `−${h.cikis}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold" style={R.MONO}>
                          {h.kalanStok}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                          {h.kullanici || "—"}
                        </td>
                        <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                          {h.aciklama || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
  </>
  );
}
