/* Stok — stok düzeltme modalı.
   Stoğu değiştirmenin tek "elle" yolu: her zaman bir tür/sebep seçilir ve
   açıklama zorunludur — ham adet doğrudan yazılamaz.
   Stok.tsx bölünmesi: kendi state'ini ve iş kurallarını taşır. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function StokDuzeltmeModal({ db, updateDb, aktifKullanici, parca, onKapat }): any {
  const [yon, setYon] = R.useState("giris"); // "giris" | "cikis"
  const [tur, setTur] = R.useState(R.STOK_GIRIS_TURLERI[0]);
  const [adet, setAdet] = R.useState("");
  const [belgeNo, setBelgeNo] = R.useState("");
  const [kullanici, setKullanici] = R.useState("");
  const [aciklama, setAciklama] = R.useState("");

  R.useEffect(() => {
    setYon("giris");
    setTur(R.STOK_GIRIS_TURLERI[0]);
    setAdet("");
    setBelgeNo("");
    setKullanici(R.sonKullaniciAdi());
    setAciklama("");
  }, [parca?.id]);

  // Stok adedi HİÇBİR yerde doğrudan yazılamaz; her düzeltme bir sebep
  // seçilerek ve zorunlu bir açıklama girilerek hareket olarak kaydedilir.
  const kaydet = () => {
    if (!R.yetkiVarMi(db, aktifKullanici, "stokDuzeltebilir")) {
      R.bildirimGoster("Stok düzeltme yetkiniz yok.", "hata");
      return;
    }
    const miktar = parseFloat(adet);
    if (!miktar || miktar <= 0) {
      R.bildirimGoster("Geçerli bir adet girin.", "hata");
      return;
    }
    if (!aciklama.trim()) {
      R.bildirimGoster("Sebep / açıklama zorunludur.", "hata");
      return;
    }
    let engellendi = false;
    updateDb((prev) => {
      const hareket = R.stokHareketiUygula(prev, {
        parcaId: parca.id,
        tur,
        giris: yon === "giris" ? miktar : 0,
        cikis: yon === "cikis" ? miktar : 0,
        belgeNo: belgeNo.trim(),
        kullanici: kullanici.trim(),
        aciklama: aciklama.trim(),
      });
      if (hareket.durum === "engellendi" || hareket.durum === "parca-yok") {
        engellendi = true;
        return prev;
      }
      const sonuc = hareket.db;
      return R.islemKaydet(sonuc, {
        kullaniciAdi: aktifKullanici?.adSoyad || kullanici.trim(),
        islemTuru: `Stok düzeltildi (${tur})`,
        aciklama: `${parca?.ad || parca.id} — ${aciklama.trim()}`,
        eskiDeger: `${parca?.stok ?? "—"} ${parca?.birim || ""}`,
        yeniDeger: `${yon === "giris" ? "+" : "-"}${miktar} ${parca?.birim || ""}`,
      });
    });
    if (engellendi) {
      R.bildirimGoster("Bu işlem stoğu eksiye düşürür — ayarlardan eksi stok izni açık değil.", "hata");
      return;
    }
    R.sonKullaniciAdiKaydet(kullanici);
    R.bildirimGoster("Stok düzeltmesi kaydedildi.", "basari");
    onKapat();
  };

  return (
  <>
      {/* Stok Düzeltme modalı — stoğu değiştirmenin tek "elle" yolu; her zaman
          bir sebep (tür) seçilir ve açıklama zorunludur, ham adet asla
          doğrudan yazılamaz. */}
      {parca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => onKapat()}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Düzeltme — {parca.ad}
              </h3>
              <button onClick={() => onKapat()} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Mevcut stok: <strong>{parca.stok} {parca.birim}</strong>
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
                {[
                  { id: "giris", ad: "Giriş (+)" },
                  { id: "cikis", ad: "Çıkış (−)" },
                ].map((y) => (
                  <button
                    key={y.id}
                    onClick={() => {
                      setYon(y.id);
                      setTur(y.id === "giris" ? R.STOK_GIRIS_TURLERI[0] : R.STOK_CIKIS_TURLERI[0]);
                    }}
                    className="flex-1 py-2 text-sm font-semibold"
                    style={{
                      background: yon === y.id ? (y.id === "giris" ? R.T.green : R.T.red) : "#fff",
                      color: yon === y.id ? "#fff" : R.T.ink500,
                    }}
                  >
                    {y.ad}
                  </button>
                ))}
              </div>
              <R.Secim label="Tür / Sebep" value={tur} onChange={(e) => setTur(e.target.value)}>
                {(yon === "giris" ? R.STOK_GIRIS_TURLERI : R.STOK_CIKIS_TURLERI).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </R.Secim>
              <R.Girdi
                label={`Adet (${parca.birim})`}
                type="number"
                value={adet}
                onChange={(e) => setAdet(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <R.Girdi
                label="Belge No (opsiyonel)"
                value={belgeNo}
                onChange={(e) => setBelgeNo(e.target.value)}
                placeholder="ör. SY-2026-08"
              />
              <R.Girdi
                label="İşlemi Yapan"
                value={kullanici}
                readOnly
                placeholder="ör. Emirhan"
              />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: R.T.ink500 }}>
                  Açıklama / Sebep *
                </span>
                <textarea
                  value={aciklama}
                  onChange={(e) => setAciklama(e.target.value)}
                  rows={2}
                  className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  placeholder="ör. Fiziksel sayımda 3 adet fazla çıktı"
                />
              </label>
              {yon === "cikis" &&
                parseFloat(adet) > parca.stok &&
                !db.ayarlar.eksiStokIzni && (
                  <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: "#F9DEDE", color: R.T.red }}>
                    Mevcut stoktan fazla çıkış giremezsiniz — Ayarlar'da "Eksi Stok İzni" kapalı.
                  </p>
                )}
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
