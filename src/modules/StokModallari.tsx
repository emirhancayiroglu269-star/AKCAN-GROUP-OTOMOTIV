/* Stok — ürün üzerindeki modal ve paneller (Stok.tsx'ten bölündü).
   Stok girişi, stok düzeltme, raf taşıma, hareket defteri, tedarikçi
   karşılaştırması, alış/satış fiyat geçmişi, OEM/muadil kod, barkod ve
   araç uyumluluğu yönetimi burada.
   State StokSayfasi'nda yaşıyor; bu dosya yalnızca çiziyor. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function StokModallari({
  db,
  updateDb,
aracAramaMetni,
  aracAramaSonuclari,
  aracModalParca,
  barkodBirincilYap,
  barkodEkle,
  barkodHata,
  barkodModalParca,
  barkodOtomatikUret,
  barkodSil,
  duzeltmeAciklama,
  duzeltmeAdet,
  duzeltmeBelgeNo,
  duzeltmeKaydet,
  duzeltmeKullanici,
  duzeltmeModalParca,
  duzeltmeTur,
  duzeltmeYon,
  fiyatGecmisParca,
  formuAc,
  gecmisParca,
  girisAdet,
  girisBelgeNo,
  girisFiyat,
  girisKullanici,
  girisModalParca,
  girisPaketAdedi,
  girisPaketId,
  girisiKaydet,
  hareketlerParca,
  kaydet,
  kodEkle,
  kodHata,
  kodModalKodlari,
  kodModalParca,
  kodSil,
  rafModalParca,
  rafTransferAdet,
  rafTransferHedef,
  rafTransferKaynak,
  rafTransferKullanici,
  rafTransferiKaydet,
  setAracAramaMetni,
  setAracModalId,
  setBarkodHata,
  setBarkodModalId,
  setDuzeltmeAciklama,
  setDuzeltmeAdet,
  setDuzeltmeBelgeNo,
  setDuzeltmeModalId,
  setDuzeltmeTur,
  setDuzeltmeYon,
  setFiyatGecmisAcikId,
  setGecmisAcikId,
  setGirisAdet,
  setGirisBelgeNo,
  setGirisFiyat,
  setGirisModalId,
  setGirisPaketAdedi,
  setGirisPaketId,
  setHareketlerAcikId,
  setHedefDeger,
  setHedefTuru,
  setKodHata,
  setKodModalId,
  setRafModalId,
  setRafTransferAdet,
  setRafTransferHedef,
  setRafTransferKaynak,
  setTedarikciKarsilastirmaAcikId,
  setUyariModal,
  setYeniBarkodDegeri,
  setYeniKodDegeri,
  setYeniKodTipi,
  setYeniUyumDurumu,
  tedarikciKarsilastirmaParca,
  uyariModal,
  uyumlulukDurumGuncelle,
  uyumlulukEkle,
  uyumlulukSil,
  yeniBarkodDegeri,
  yeniKodDegeri,
  yeniKodTipi,
  yeniUyumDurumu
}) {
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

      {/* Stok girişi modalı */}
      {girisModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setGirisModalId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Girişi — {girisModalParca.ad}
              </h3>
              <button onClick={() => setGirisModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Mevcut stok: <strong>{girisModalParca.stok} {girisModalParca.birim}</strong> · Mevcut ortalama maliyet:{" "}
              <strong>{R.tl(girisModalParca.ortalamaMaliyet)}</strong>
            </p>
            <div className="flex flex-col gap-3">
              {girisModalParca.paketBirimleri && girisModalParca.paketBirimleri.length > 0 && (
                <div className="flex gap-2 items-end p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                  <div className="flex-1">
                    <span className="text-xs font-medium block mb-1" style={{ color: R.T.ink500 }}>
                      Paket ile Gir
                    </span>
                    <select
                      value={girisPaketId}
                      onChange={(e) => setGirisPaketId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border text-sm outline-none bg-white"
                      style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    >
                      <option value="">Paket seç…</option>
                      {girisModalParca.paketBirimleri.map((pk) => (
                        <option key={pk.id} value={pk.id}>
                          {pk.ad} (1 = {pk.iceriyorAdet} {girisModalParca.birim})
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    value={girisPaketAdedi}
                    onChange={(e) => setGirisPaketAdedi(e.target.value)}
                    placeholder="Kaç paket"
                    className="w-24 px-2 py-1.5 rounded-md border text-sm outline-none"
                    style={{ borderColor: R.T.steel300 }}
                  />
                  <button
                    onClick={() => {
                      const pk = girisModalParca.paketBirimleri.find((p) => p.id === girisPaketId);
                      if (!pk || !parseFloat(girisPaketAdedi)) {
                        R.bildirimGoster("Paket ve adet seçin.", "hata");
                        return;
                      }
                      setGirisAdet(String(pk.iceriyorAdet * parseFloat(girisPaketAdedi)));
                    }}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold shrink-0"
                    style={{ background: R.T.orange, color: "#fff" }}
                  >
                    Adete Çevir
                  </button>
                </div>
              )}
              <R.Girdi
                label={`Gelen Adet (${girisModalParca.birim})`}
                type="number"
                value={girisAdet}
                onChange={(e) => setGirisAdet(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <R.Girdi
                label="Birim Alış Fiyatı (KDV Hariç)"
                type="number"
                value={girisFiyat}
                onChange={(e) => setGirisFiyat(e.target.value)}
                placeholder="0.00"
              />
              {parseFloat(girisAdet) > 0 && parseFloat(girisFiyat) > 0 && (
                <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  Yeni ortalama maliyet:{" "}
                  <strong style={{ color: R.T.ink900 }}>
                    {R.tl(
                      R.agirlikliOrtalamaMaliyetHesapla(
                        girisModalParca.stok,
                        girisModalParca.ortalamaMaliyet,
                        parseFloat(girisAdet),
                        parseFloat(girisFiyat)
                      )
                    )}
                  </strong>{" "}
                  ({(girisModalParca.stok || 0)} {girisModalParca.birim} × {R.tl(girisModalParca.ortalamaMaliyet)} + {girisAdet} × {R.tl(parseFloat(girisFiyat))})
                </p>
              )}
              <R.Girdi
                label="Belge No (opsiyonel)"
                value={girisBelgeNo}
                onChange={(e) => setGirisBelgeNo(e.target.value)}
                placeholder="ör. AL-1254"
              />
              <R.Girdi
                label="İşlemi Yapan"
                value={girisKullanici}
                readOnly
                placeholder="ör. Emirhan"
              />
              <div className="flex gap-2">
                <R.Buton onClick={girisiKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setGirisModalId(null)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raf / Depo konumları + raf taşıma modalı */}
      {rafModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setRafModalId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Raf / Depo Konumları — {rafModalParca.ad}
              </h3>
              <button onClick={() => setRafModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 my-3">
              {R.parcaRafListesi(rafModalParca).length === 0 ? (
                <p className="text-xs" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz raf adresi girilmedi.
                </p>
              ) : (
                R.parcaRafListesi(rafModalParca).map((k) => (
                  <div key={k.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ ...R.MONO, color: R.T.ink900 }}>📍 {k.kod}</span>
                    <span className="font-semibold" style={R.MONO}>
                      {k.adet} {rafModalParca.birim}
                    </span>
                  </div>
                ))
              )}
              {R.parcaRafListesi(rafModalParca).length > 1 && (
                <div className="flex items-center justify-between text-xs font-semibold px-2.5 pt-1" style={{ color: R.T.ink500 }}>
                  <span>Toplam</span>
                  <span style={R.MONO}>
                    {R.parcaRafListesi(rafModalParca).reduce((t, k) => t + k.adet, 0)} {rafModalParca.birim}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2.5" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Raf Taşı
              </span>
              <R.Secim label="Kaynak Raf" value={rafTransferKaynak} onChange={(e) => setRafTransferKaynak(e.target.value)}>
                <option value="">Seçin…</option>
                {R.parcaRafListesi(rafModalParca).map((k) => (
                  <option key={k.id} value={k.kod}>
                    {k.kod} ({k.adet} {rafModalParca.birim})
                  </option>
                ))}
              </R.Secim>
              <R.Girdi
                label="Yeni Raf (Bölüm-Raf-Göz)"
                value={rafTransferHedef}
                onChange={(e) => setRafTransferHedef(e.target.value.toUpperCase())}
                placeholder="ör. B-02-05"
              />
              <R.Girdi label={`Adet (${rafModalParca.birim})`} type="number" value={rafTransferAdet} onChange={(e) => setRafTransferAdet(e.target.value)} placeholder="0" />
              <R.Girdi label="Kullanıcı" value={rafTransferKullanici} readOnly />
              <div className="flex gap-2">
                <R.Buton onClick={rafTransferiKaydet}>
                  <R.MapPin size={14} /> Taşımayı Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setRafModalId(null)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stok Düzeltme modalı — stoğu değiştirmenin tek "elle" yolu; her zaman
          bir sebep (tür) seçilir ve açıklama zorunludur, ham adet asla
          doğrudan yazılamaz. */}
      {duzeltmeModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDuzeltmeModalId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Düzeltme — {duzeltmeModalParca.ad}
              </h3>
              <button onClick={() => setDuzeltmeModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Mevcut stok: <strong>{duzeltmeModalParca.stok} {duzeltmeModalParca.birim}</strong>
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
                      setDuzeltmeYon(y.id);
                      setDuzeltmeTur(y.id === "giris" ? R.STOK_GIRIS_TURLERI[0] : R.STOK_CIKIS_TURLERI[0]);
                    }}
                    className="flex-1 py-2 text-sm font-semibold"
                    style={{
                      background: duzeltmeYon === y.id ? (y.id === "giris" ? R.T.green : R.T.red) : "#fff",
                      color: duzeltmeYon === y.id ? "#fff" : R.T.ink500,
                    }}
                  >
                    {y.ad}
                  </button>
                ))}
              </div>
              <R.Secim label="Tür / Sebep" value={duzeltmeTur} onChange={(e) => setDuzeltmeTur(e.target.value)}>
                {(duzeltmeYon === "giris" ? R.STOK_GIRIS_TURLERI : R.STOK_CIKIS_TURLERI).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </R.Secim>
              <R.Girdi
                label={`Adet (${duzeltmeModalParca.birim})`}
                type="number"
                value={duzeltmeAdet}
                onChange={(e) => setDuzeltmeAdet(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <R.Girdi
                label="Belge No (opsiyonel)"
                value={duzeltmeBelgeNo}
                onChange={(e) => setDuzeltmeBelgeNo(e.target.value)}
                placeholder="ör. SY-2026-08"
              />
              <R.Girdi
                label="İşlemi Yapan"
                value={duzeltmeKullanici}
                readOnly
                placeholder="ör. Emirhan"
              />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: R.T.ink500 }}>
                  Açıklama / Sebep *
                </span>
                <textarea
                  value={duzeltmeAciklama}
                  onChange={(e) => setDuzeltmeAciklama(e.target.value)}
                  rows={2}
                  className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  placeholder="ör. Fiziksel sayımda 3 adet fazla çıktı"
                />
              </label>
              {duzeltmeYon === "cikis" &&
                parseFloat(duzeltmeAdet) > duzeltmeModalParca.stok &&
                !db.ayarlar.eksiStokIzni && (
                  <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: "#F9DEDE", color: R.T.red }}>
                    Mevcut stoktan fazla çıkış giremezsiniz — Ayarlar'da "Eksi Stok İzni" kapalı.
                  </p>
                )}
              <div className="flex gap-2">
                <R.Buton onClick={duzeltmeKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setDuzeltmeModalId(null)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stok Hareketleri defteri — tüm giriş/çıkışların değiştirilemez kaydı */}
      {hareketlerParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setHareketlerAcikId(null)}
        >
          <div
            className="w-full max-w-3xl rounded-lg overflow-hidden"
            style={{ background: "#fff", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Hareketleri — {hareketlerParca.ad}
              </h3>
              <button onClick={() => setHareketlerAcikId(null)} style={{ color: R.T.ink500 }}>
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
                    .filter((h) => h.parcaId === hareketlerParca.id)
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

      {/* Bu ürünü kimlerden aldım — tedarikçi karşılaştırması */}
      {tedarikciKarsilastirmaParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setTedarikciKarsilastirmaAcikId(null)}
        >
          <div className="w-full max-w-md rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Bu Ürünü Kimlerden Aldım? — {tedarikciKarsilastirmaParca.ad}
              </h3>
              <button onClick={() => setTedarikciKarsilastirmaAcikId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Tekrar sipariş verirken tedarikçileri hızlıca karşılaştırın — her tedarikçi için en son alış fiyatı gösterilir.
            </p>
            {(() => {
              const tedarikciBazinda: Record<string, any[]> = {};
              (tedarikciKarsilastirmaParca.alisGecmisi || [])
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

      {/* Alış geçmişi modalı */}
      {gecmisParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setGecmisAcikId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Alış / Maliyet Geçmişi — {gecmisParca.ad}
              </h3>
              <button onClick={() => setGecmisAcikId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {(gecmisParca.alisGecmisi || []).map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink500 }}>{R.tarihGoster(g.tarih)}</span>
                  <span style={R.MONO}>
                    {g.adet} {gecmisParca.birim} × {R.tl(g.birimFiyat)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Satış fiyatı geçmişi modalı */}
      {fiyatGecmisParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setFiyatGecmisAcikId(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Satış Fiyatı Geçmişi — {fiyatGecmisParca.ad}
              </h3>
              <button onClick={() => setFiyatGecmisAcikId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {(fiyatGecmisParca.fiyatGecmisi || []).map((f) => (
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

      {/* OEM / Muadil kod yönetimi */}
      {kodModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setKodModalId(null)}
        >
          <div
            className="w-full max-w-md rounded-lg p-5 overflow-y-auto"
            style={{ background: "#fff", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                <R.GitCompare size={16} style={{ color: R.T.orange }} />
                OEM / Muadil Kodlar
              </h3>
              <button onClick={() => setKodModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {kodModalParca.marka} — {kodModalParca.ad} ({kodModalParca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {kodModalKodlari.length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz kod bağlanmadı.
                </p>
              ) : (
                kodModalKodlari.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm"
                    style={{ background: R.T.steel100 }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <R.Rozet tone={k.tip === "OEM" ? "graphite" : "orange"}>{k.tip}</R.Rozet>
                      <span style={R.MONO} className="truncate">
                        {k.kod}
                      </span>
                    </span>
                    <button onClick={() => kodSil(k.id)} style={{ color: R.T.red }} className="shrink-0">
                      <R.Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Yeni Kod Ekle
              </span>
              <div className="flex gap-2">
                <select
                  value={yeniKodTipi}
                  onChange={(e) => setYeniKodTipi(e.target.value)}
                  className="px-2 py-2 rounded-md border text-sm outline-none bg-white shrink-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {R.KOD_TIPLERI.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input
                  value={yeniKodDegeri}
                  onChange={(e) => {
                    setYeniKodDegeri(e.target.value);
                    setKodHata("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && kodEkle()}
                  placeholder="ör. 03L 115 562"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none min-w-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                />
                <button
                  onClick={kodEkle}
                  className="px-3 py-2 rounded-md shrink-0"
                  style={{ background: R.T.orange, color: "#fff" }}
                >
                  <R.Plus size={15} />
                </button>
              </div>
              {kodHata && (
                <p className="text-xs" style={{ color: R.T.red }}>
                  {kodHata}
                </p>
              )}
              <p className="text-xs" style={{ color: R.T.ink500 }}>
                <strong>OEM</strong>: aracın orijinal parça numarası (ör. VW/Audi 03L115562).{" "}
                <strong>Muadil</strong>: başka bir markanın kendi kod sistemindeki karşılığı. Boşluk/tire farkı önemli
                değil — arama otomatik normalize eder.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Barkod yönetimi */}
      {barkodModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setBarkodModalId(null)}
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
              <button onClick={() => setBarkodModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {barkodModalParca.marka} — {barkodModalParca.ad} ({barkodModalParca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {R.parcaTumBarkodlari(barkodModalParca).length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz barkod bağlanmadı.
                </p>
              ) : (
                R.parcaTumBarkodlari(barkodModalParca).map((b, i) => (
                  <div key={b} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm" style={{ background: R.T.steel100 }}>
                    <span className="flex items-center gap-2 min-w-0">
                      {i === 0 && <R.Rozet tone="graphite">Birincil</R.Rozet>}
                      <span style={R.MONO} className="truncate">
                        {b}
                      </span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {i !== 0 && (
                        <button onClick={() => barkodBirincilYap(barkodModalParca.id, b)} className="text-xs font-semibold" style={{ color: R.T.orangeDark }}>
                          Birincil Yap
                        </button>
                      )}
                      <button onClick={() => barkodSil(barkodModalParca.id, b)} style={{ color: R.T.red }}>
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
                  value={yeniBarkodDegeri}
                  onChange={(e) => {
                    setYeniBarkodDegeri(e.target.value);
                    setBarkodHata("");
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
              {barkodHata && (
                <p className="text-xs" style={{ color: R.T.red }}>
                  {barkodHata}
                </p>
              )}
              <R.Buton variant="ghost" onClick={barkodOtomatikUret}>
                <R.ScanLine size={14} /> Otomatik Dahili Barkod Üret
              </R.Buton>
              {R.parcaTumBarkodlari(barkodModalParca)[0] && (
                <div className="flex justify-center pt-2">
                  <R.EanBarkod kod={R.parcaTumBarkodlari(barkodModalParca)[0]} genislik={160} yukseklik={50} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uyumlu araçlar yönetimi */}
      {aracModalParca && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setAracModalId(null)}
        >
          <div className="w-full max-w-lg rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                <R.Car size={16} style={{ color: R.T.orange }} />
                Uyumlu Araçlar
              </h3>
              <button onClick={() => setAracModalId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: R.T.ink500 }}>
              {aracModalParca.marka} — {aracModalParca.ad} ({aracModalParca.stokKodu})
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {R.parcaUyumluAraclari(db, aracModalParca.id).length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: R.T.ink500 }}>
                  Bu ürüne henüz araç bağlanmadı.
                </p>
              ) : (
                R.parcaUyumluAraclari(db, aracModalParca.id).map((u) => (
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
                  value={yeniUyumDurumu}
                  onChange={(e) => setYeniUyumDurumu(e.target.value)}
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
                  value={aracAramaMetni}
                  onChange={(e) => setAracAramaMetni(e.target.value)}
                  placeholder="ör. Golf 1.6 TDI"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none min-w-0"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                />
              </div>
              {aracAramaSonuclari.length > 0 && (
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {aracAramaSonuclari.map((a) => (
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
