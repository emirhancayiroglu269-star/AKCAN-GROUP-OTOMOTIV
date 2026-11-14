/* Stok — raf/depo taşıma modalı.
   Ürünün raf konumlarını gösterir; bir raftan diğerine adet taşır. Taşıma her
   zaman rafHareketleri defterine iz bırakır.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function RafTasimaModal({ db, updateDb, parca, onKapat }): any {
  const konumlar = R.parcaRafListesi(parca);
  const [kaynak, setKaynak] = R.useState(konumlar[0]?.kod || "");
  const [hedef, setHedef] = R.useState("");
  const [adet, setAdet] = R.useState("");
  const [kullanici, setKullanici] = R.useState("");

  R.useEffect(() => {
    setKaynak(R.parcaRafListesi(parca)[0]?.kod || "");
    setHedef("");
    setAdet("");
    setKullanici(R.sonKullaniciAdi());
  }, [parca?.id]);

  const kaydet = () => {
    const miktar = parseFloat(adet);
    if (!kaynak) {
      R.bildirimGoster("Kaynak raf seçin.", "hata");
      return;
    }
    if (!hedef.trim()) {
      R.bildirimGoster("Yeni raf adresini girin.", "hata");
      return;
    }
    if (hedef.trim() === kaynak) {
      R.bildirimGoster("Yeni raf, kaynak rafla aynı olamaz.", "hata");
      return;
    }
    if (!miktar || miktar <= 0) {
      R.bildirimGoster("Geçerli bir adet girin.", "hata");
      return;
    }
    let basarisiz = false;
    updateDb((prev) => {
      const sonuc = R.rafTransferiUygula(prev, {
        parcaId: parca.id,
        eskiRaf: kaynak,
        yeniRaf: hedef,
        adet: miktar,
        kullanici: kullanici.trim(),
      });
      if (!sonuc) {
        basarisiz = true;
        return prev;
      }
      return sonuc;
    });
    if (basarisiz) {
      R.bildirimGoster("Bu raftan bu kadar adet taşınamaz — kaynak raftaki adedi kontrol edin.", "hata");
      return;
    }
    R.sonKullaniciAdiKaydet(kullanici);
    R.bildirimGoster("Raf taşıma kaydedildi.", "basari");
    onKapat();
  };

  return (
  <>
      {/* Raf / Depo konumları + raf taşıma modalı */}
      {parca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => onKapat()}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Raf / Depo Konumları — {parca.ad}
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 my-3">
              {R.parcaRafListesi(parca).length === 0 ? (
                <p className="text-xs" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz raf adresi girilmedi.
                </p>
              ) : (
                R.parcaRafListesi(parca).map((k) => (
                  <div key={k.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ ...R.MONO, color: R.T.ink900 }}>📍 {k.kod}</span>
                    <span className="font-semibold" style={R.MONO}>
                      {k.adet} {parca.birim}
                    </span>
                  </div>
                ))
              )}
              {R.parcaRafListesi(parca).length > 1 && (
                <div className="flex items-center justify-between text-xs font-semibold px-2.5 pt-1" style={{ color: R.T.ink500 }}>
                  <span>Toplam</span>
                  <span style={R.MONO}>
                    {R.parcaRafListesi(parca).reduce((t, k) => t + k.adet, 0)} {parca.birim}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2.5" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Raf Taşı
              </span>
              <R.Secim label="Kaynak Raf" value={kaynak} onChange={(e) => setKaynak(e.target.value)}>
                <option value="">Seçin…</option>
                {R.parcaRafListesi(parca).map((k) => (
                  <option key={k.id} value={k.kod}>
                    {k.kod} ({k.adet} {parca.birim})
                  </option>
                ))}
              </R.Secim>
              <R.Girdi
                label="Yeni Raf (Bölüm-Raf-Göz)"
                value={hedef}
                onChange={(e) => setHedef(e.target.value.toUpperCase())}
                placeholder="ör. B-02-05"
              />
              <R.Girdi label={`Adet (${parca.birim})`} type="number" value={adet} onChange={(e) => setAdet(e.target.value)} placeholder="0" />
              <R.Girdi label="Kullanıcı" value={kullanici} readOnly />
              <div className="flex gap-2">
                <R.Buton onClick={kaydet}>
                  <R.MapPin size={14} /> Taşımayı Kaydet
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
