/* Stok — mükerrer/benzer ürün uyarısı modalı.
   Yeni ürün kaydedilirken çıkan "bu ürün zaten var" / "benzer kayıt" / "fiyat
   uyarısı" adımları. Karar StokSayfasi'nın `kaydet` akışına geri döner.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function MukerrerUyariModal({ uyariModal, setUyariModal, formuAc, kaydet }): any {
  return (
  <>
      {/* Mükerrer / benzer ürün / fiyat uyarı modalı — "1. Mükerrer ürün
          kontrolü" ve "9. Benzer ürün önerisi" burada kullanıcıya sunulur. */}
      {uyariModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setUyariModal(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            {uyariModal.mukerrerParca ? (
              <>
                <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                  ⚠️ Bu ürün sistemde mevcut
                </h3>
                <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
                  <strong style={{ color: R.T.ink900 }}>
                    {uyariModal.mukerrerParca.marka} {uyariModal.mukerrerParca.ad}
                  </strong>{" "}
                  ({uyariModal.mukerrerParca.stokKodu}) zaten kayıtlı — aynı stok kodu, üretici kodu+marka ya da barkod eşleşiyor.
                </p>
                <div className="flex flex-col gap-2">
                  <R.Buton
                    onClick={() => {
                      setUyariModal(null);
                      formuAc(uyariModal.mukerrerParca);
                    }}
                  >
                    <R.Pencil size={14} /> Mevcut Ürünü Aç
                  </R.Buton>
                  <R.Buton variant="ghost" onClick={() => kaydet(true)}>
                    Yeni Ürün Olarak Devam Et
                  </R.Buton>
                  <R.Buton variant="ghost" onClick={() => setUyariModal(null)}>
                    Vazgeç
                  </R.Buton>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                  Devam etmeden önce kontrol edin
                </h3>
                {uyariModal.benzerler.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs mb-1.5" style={{ color: R.T.ink500 }}>
                      Benzer kayıt(lar) bulundu — yazım hatası olabilir mi?
                    </p>
                    {uyariModal.benzerler.map((b) => (
                      <div key={b.parca.id} className="text-sm px-2.5 py-1.5 rounded-md mb-1" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                        {b.parca.marka} {b.parca.ad} ({b.parca.stokKodu}) — <strong>%{b.yuzde} eşleşme</strong>
                      </div>
                    ))}
                  </div>
                )}
                {uyariModal.fiyatUyarilari.map((u, i) => (
                  <p key={i} className="text-sm mb-1.5" style={{ color: "#8A6110" }}>
                    {u}
                  </p>
                ))}
                <div className="flex flex-col gap-2 mt-3">
                  <R.Buton onClick={() => kaydet(true)}>
                    <R.Check size={14} /> Yine de Kaydet
                  </R.Buton>
                  <R.Buton variant="ghost" onClick={() => setUyariModal(null)}>
                    Vazgeç, Düzenlemeye Dön
                  </R.Buton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
  </>
  );
}
