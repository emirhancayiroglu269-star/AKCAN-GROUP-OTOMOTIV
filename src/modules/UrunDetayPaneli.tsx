/* Stok — ürün detay paneli (Stok.tsx'ten bölündü).
   Fotoğraflar | Teknik Bilgiler | OEM | Muadiller | Araç Uyumluluğu | Dokümanlar,
   geçmiş paneli, büyük fotoğraf görüntüleyici ve silme onayı burada.
   State StokSayfasi'nda yaşıyor; bu dosya yalnızca çiziyor. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function UrunDetayPaneli({
  db,
  updateDb,
buyukFotoUrl,
  detayModalParca,
  dokumanEkle,
  dokumanInputRef,
  dokumanSil,
  fotoInputRef,
  fotoYukleniyor,
  fotografAnaYap,
  fotografEkle,
  fotografSil,
  fotografSiraDegistir,
  gecmisAltGorunum,
  setBuyukFotoUrl,
  setDetayModalId,
  setDetaySekme,
  setFotoYukleniyor,
  setGecmisAltGorunum,
  setSilinecek,
  setYeniDokumanTuru,
  setYeniFotoTuru,
  sil,
  silinecek,
  yeniDokumanTuru,
  yeniFotoTuru,
  detaySekme,
  setAracModalId,
  setKodHata,
  setKodModalId,
  setYeniKodDegeri
}) {
  return (
    <>
      {/* Ürün Detayı — Fotoğraflar | Teknik Bilgiler | OEM | Muadiller | Araç Uyumluluğu | Dokümanlar */}
      {detayModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDetayModalId(null)}
        >
          <div className="w-full max-w-3xl rounded-lg overflow-hidden" style={{ background: "#fff", maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <div>
                <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                  {detayModalParca.ad}
                </div>
                <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                  {detayModalParca.marka} · {detayModalParca.stokKodu}
                </div>
              </div>
              <button onClick={() => setDetayModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="flex overflow-x-auto" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              {[
                { id: "fotograf", ad: "Fotoğraflar" },
                { id: "teknik", ad: "Teknik Bilgiler" },
                { id: "oem", ad: "OEM" },
                { id: "muadil", ad: "Muadiller" },
                { id: "arac", ad: "Araç Uyumluluğu" },
                { id: "dokuman", ad: "Dokümanlar" },
                { id: "gecmis", ad: "Geçmiş" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setDetaySekme(s.id)}
                  className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                  style={{ color: detaySekme === s.id ? R.T.orangeDark : R.T.ink500, borderBottom: detaySekme === s.id ? `2px solid ${R.T.orange}` : "2px solid transparent" }}
                >
                  {s.ad}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto" style={{ maxHeight: "65vh" }}>
              {/* Fotoğraflar */}
              {detaySekme === "fotograf" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <R.Secim label="Yeni fotoğrafın türü" value={yeniFotoTuru} onChange={(e) => setYeniFotoTuru(e.target.value)}>
                      {R.FOTOGRAF_TURLERI.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </R.Secim>
                    <R.Buton onClick={() => fotoInputRef.current?.click()} disabled={fotoYukleniyor}>
                      <R.ImageIcon size={15} /> {fotoYukleniyor ? "Yükleniyor…" : "Fotoğraf Ekle"}
                    </R.Buton>
                    <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={fotografEkle} className="hidden" />
                  </div>
                  <p className="text-xs" style={{ color: R.T.ink500 }}>
                    JPG/PNG/WEBP desteklenir, otomatik olarak sıkıştırılır. Listedeki ilk fotoğraf "Ana Fotoğraf" sayılır.
                  </p>
                  {(detayModalParca.fotograflar || []).length === 0 ? (
                    <R.Bos ikon={R.ImageIcon} baslik="Fotoğraf yok" aciklama="Yukarıdan ilk fotoğrafı ekleyin." />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {detayModalParca.fotograflar.map((f, i) => (
                        <div key={f.id} className="rounded-md overflow-hidden" style={{ border: `1px solid ${R.T.steel200}` }}>
                          <button onClick={() => setBuyukFotoUrl(f.url)} className="block w-full" style={{ aspectRatio: "1", background: R.T.steel100 }}>
                            <img src={f.url} alt={f.tur} className="w-full h-full object-cover" />
                          </button>
                          <div className="p-2 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: R.T.ink500 }}>
                                {f.tur}
                              </span>
                              {i === 0 && <R.Rozet tone="orange">Ana</R.Rozet>}
                            </div>
                            <div className="flex items-center gap-1">
                              {i !== 0 && (
                                <button onClick={() => fotografAnaYap(detayModalParca.id, f.id)} title="Ana Yap" className="text-xs" style={{ color: R.T.orangeDark }}>
                                  Ana Yap
                                </button>
                              )}
                              <div className="ml-auto flex items-center gap-1">
                                <button onClick={() => fotografSiraDegistir(detayModalParca.id, i, -1)} disabled={i === 0} style={{ color: R.T.ink500, opacity: i === 0 ? 0.3 : 1 }}>
                                  <R.ChevronRight size={13} style={{ transform: "rotate(-90deg)" }} />
                                </button>
                                <button
                                  onClick={() => fotografSiraDegistir(detayModalParca.id, i, 1)}
                                  disabled={i === detayModalParca.fotograflar.length - 1}
                                  style={{ color: R.T.ink500, opacity: i === detayModalParca.fotograflar.length - 1 ? 0.3 : 1 }}
                                >
                                  <R.ChevronRight size={13} style={{ transform: "rotate(90deg)" }} />
                                </button>
                                <button onClick={() => fotografSil(detayModalParca.id, f.id)} style={{ color: R.T.red }}>
                                  <R.Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Teknik Bilgiler */}
              {detaySekme === "teknik" && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Marka", detayModalParca.marka],
                      ["Ana Kategori", detayModalParca.anaKategori || "—"],
                      ["Alt Kategori", detayModalParca.kategori || "—"],
                      ["Birim", detayModalParca.birim],
                      ["KDV Oranı", `%${detayModalParca.kdvOrani}`],
                      ["Üretici Kodu", detayModalParca.ureticiKodu || "—"],
                      ["Raf", R.parcaRafListesi(detayModalParca)[0]?.kod || "—"],
                      ["Stok", `${detayModalParca.stok} ${detayModalParca.birim}`],
                    ].map(([etiket, deger]) => (
                      <div key={etiket} className="flex flex-col rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                        <span className="text-xs" style={{ color: R.T.ink500 }}>
                          {etiket}
                        </span>
                        <span style={{ color: R.T.ink900 }}>{deger}</span>
                      </div>
                    ))}
                  </div>
                  {db.depolar.length > 1 && (
                    <div>
                      <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                        Depo Bazında Stok Dağılımı
                      </div>
                      <div className="flex flex-col gap-1">
                        {db.depolar
                          .filter((d) => d.aktif !== false)
                          .map((d) => (
                            <div key={d.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                              <span style={{ color: R.T.ink900 }}>
                                {d.kod} — {d.ad}
                              </span>
                              <span className="font-semibold" style={R.MONO}>
                                {R.depoStogu(detayModalParca, d.id)} {detayModalParca.birim}
                              </span>
                            </div>
                          ))}
                        {R.parcaAcikTransferAdedi(db, detayModalParca.id) > 0 && (
                          <div className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: "#FDF1D6" }}>
                            <span style={{ color: "#8A6110" }}>🚚 Yolda (transferde)</span>
                            <span className="font-semibold" style={{ ...R.MONO, color: "#8A6110" }}>
                              {R.parcaAcikTransferAdedi(db, detayModalParca.id)} {detayModalParca.birim}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const kategoriObj = db.kategoriler.find((k) => k.ad === detayModalParca.kategori) || db.kategoriler.find((k) => k.ad === detayModalParca.anaKategori);
                    const ozelAlanlar = kategoriObj ? R.kategoriOzelAlanlari(db, kategoriObj) : [];
                    if (ozelAlanlar.length === 0) return null;
                    return (
                      <div>
                        <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                          Kategoriye Özel Alanlar
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {ozelAlanlar.map((oa) => (
                            <div key={oa.id} className="flex flex-col rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                              <span className="text-xs" style={{ color: R.T.ink500 }}>
                                {oa.ad}
                              </span>
                              <span style={{ color: R.T.ink900 }}>{detayModalParca.kategoriOzelDegerler?.[oa.ad] || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {detayModalParca.aciklama && (
                    <div>
                      <div className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                        Açıklama
                      </div>
                      <p className="text-sm" style={{ color: R.T.ink900 }}>
                        {detayModalParca.aciklama}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* OEM */}
              {detaySekme === "oem" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {db.kodlar.filter((k) => k.parcaId === detayModalParca.id && k.tip === "OEM").length === 0 ? (
                      <span className="text-sm" style={{ color: R.T.ink500 }}>
                        Kayıtlı OEM kodu yok.
                      </span>
                    ) : (
                      db.kodlar
                        .filter((k) => k.parcaId === detayModalParca.id && k.tip === "OEM")
                        .map((k) => (
                          <R.Rozet key={k.id} tone="graphite">
                            {k.kod}
                          </R.Rozet>
                        ))
                    )}
                  </div>
                  <R.Buton
                    variant="ghost"
                    onClick={() => {
                      setDetayModalId(null);
                      setKodModalId(detayModalParca.id);
                      setYeniKodDegeri("");
                      setKodHata("");
                    }}
                  >
                    <R.GitCompare size={14} /> OEM / Muadil Kodlarını Düzenle
                  </R.Buton>
                </div>
              )}

              {/* Muadiller */}
              {detaySekme === "muadil" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {db.kodlar.filter((k) => k.parcaId === detayModalParca.id && k.tip === "Muadil").length === 0 ? (
                      <span className="text-sm" style={{ color: R.T.ink500 }}>
                        Kayıtlı muadil kod yok.
                      </span>
                    ) : (
                      db.kodlar
                        .filter((k) => k.parcaId === detayModalParca.id && k.tip === "Muadil")
                        .map((k) => (
                          <R.Rozet key={k.id} tone="orange">
                            {k.kod}
                          </R.Rozet>
                        ))
                    )}
                  </div>
                  <R.Buton
                    variant="ghost"
                    onClick={() => {
                      setDetayModalId(null);
                      setKodModalId(detayModalParca.id);
                      setYeniKodDegeri("");
                      setKodHata("");
                    }}
                  >
                    <R.GitCompare size={14} /> OEM / Muadil Kodlarını Düzenle
                  </R.Buton>
                </div>
              )}

              {/* Araç Uyumluluğu */}
              {detaySekme === "arac" && (
                <div className="flex flex-col gap-2">
                  {R.parcaUyumluAraclari(db, detayModalParca.id).length === 0 ? (
                    <p className="text-sm" style={{ color: R.T.ink500 }}>
                      Henüz araç eşleştirilmedi.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {R.parcaUyumluAraclari(db, detayModalParca.id).map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                          <span style={{ color: R.T.ink900 }}>{R.aracEtiketi(u.arac)}</span>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: R.uyumlulukGorseli[u.durum].ton === "green" ? R.T.green : R.uyumlulukGorseli[u.durum].ton === "red" ? R.T.red : "#8A6110" }}
                          >
                            {R.uyumlulukGorseli[u.durum].emoji} {u.durum}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <R.Buton
                    variant="ghost"
                    onClick={() => {
                      setDetayModalId(null);
                      setAracModalId(detayModalParca.id);
                    }}
                  >
                    <R.Car size={14} /> Uyumlu Araçları Düzenle
                  </R.Buton>
                </div>
              )}

              {/* Dokümanlar */}
              {detaySekme === "dokuman" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <R.Secim label="Doküman türü" value={yeniDokumanTuru} onChange={(e) => setYeniDokumanTuru(e.target.value)}>
                      {R.DOKUMAN_TURLERI.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </R.Secim>
                    <R.Buton onClick={() => dokumanInputRef.current?.click()}>
                      <R.FileDown size={15} className="rotate-180" /> Doküman Ekle
                    </R.Buton>
                    <input ref={dokumanInputRef} type="file" accept=".pdf,.doc,.docx" multiple onChange={dokumanEkle} className="hidden" />
                  </div>
                  <p className="text-xs" style={{ color: R.T.ink500 }}>
                    PDF veya Word belgesi ekleyin (dosya başına en fazla 8MB).
                  </p>
                  {(detayModalParca.dokumanlar || []).length === 0 ? (
                    <R.Bos ikon={R.FileDown} baslik="Doküman yok" aciklama="Teknik katalog, montaj talimatı, garanti belgesi gibi dosyalar ekleyin." />
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {detayModalParca.dokumanlar.map((d) => (
                        <div key={d.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                          <div className="min-w-0">
                            <div style={{ color: R.T.ink900 }}>{d.ad}</div>
                            <div className="text-xs" style={{ color: R.T.ink500 }}>
                              {d.tur} · {d.boyutKb} KB · {R.tarihGoster(d.tarih)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a href={d.url} download={d.dosyaAdi} className="text-xs font-semibold" style={{ color: R.T.orangeDark }}>
                              İndir
                            </a>
                            <button onClick={() => dokumanSil(detayModalParca.id, d.id)} style={{ color: R.T.red }}>
                              <R.Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Geçmiş — Stok Özeti + Zaman Çizelgesi + Alış/Satış/Stok/Fiyat Geçmişi */}
              {detaySekme === "gecmis" && (
                <R.UrunGecmisiIcerik db={db} parca={detayModalParca} altGorunum={gecmisAltGorunum} setAltGorunum={setGecmisAltGorunum} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Büyük fotoğraf görüntüleme */}
      {buyukFotoUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setBuyukFotoUrl(null)}
        >
          <img src={buyukFotoUrl} alt="" className="max-w-full max-h-full object-contain rounded-md" />
          <button onClick={() => setBuyukFotoUrl(null)} className="absolute top-5 right-5" style={{ color: "#fff" }}>
            <R.X size={28} />
          </button>
        </div>
      )}

      {/* Silme onayı */}
      {silinecek && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSilinecek(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Bu ürün kartı silinsin mi?
            </h3>
            <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
              <strong>{silinecek.ad}</strong> ({silinecek.stokKodu}) kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={() => sil(silinecek.id)}>
                <R.Trash2 size={14} /> Sil
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setSilinecek(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
