/* Stok — ürün kartı ekle/düzenle modalı (Stok.tsx'ten bölündü).
   Form state'i StokSayfasi'nda yaşıyor; bu dosya yalnızca çiziyor. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function UrunFormu({
  db,
  form,
  setForm,
  duzenlenenId,
  duzenlenenParca,
  formuKapat,
  kaydet,
  dosyaInputRef,
  fotografSec,
  hedefTuru,
  setHedefTuru,
  hedefDeger,
  setHedefDeger,
  formMaliyet,
  formKdvOrani,
  formSatisFiyati,
  formSatisFiyatiNet,
  formKarTutari,
  formKarOraniMarkup,
  formKarOraniMargin,
  formTavsiyeFiyat,
  formIskontoOrani,
  sonFiyatTarihi,
}) {
  return (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={formuKapat}
        >
          <div
            className="w-full max-w-2xl rounded-lg p-5"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {duzenlenenId === "yeni" ? "Yeni Ürün Kartı" : "Ürün Kartını Düzenle"}
              </h3>
              <button onClick={formuKapat} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: R.T.steel100 }}
                >
                  {form.fotograf ? (
                    <img src={form.fotograf} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <R.ImageIcon size={20} style={{ color: R.T.ink500 }} />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => dosyaInputRef.current?.click()}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ border: `1px solid ${R.T.steel300}`, color: R.T.ink900 }}
                  >
                    Fotoğraf Seç
                  </button>
                  {form.fotograf && (
                    <button
                      onClick={() => setForm((f) => ({ ...f, fotograf: "" }))}
                      className="text-xs"
                      style={{ color: R.T.red }}
                    >
                      Kaldır
                    </button>
                  )}
                  <input ref={dosyaInputRef} type="file" accept="image/*" onChange={fotografSec} className="hidden" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Stok Kodu *" value={form.stokKodu} onChange={(e) => setForm({ ...form, stokKodu: e.target.value })} placeholder="ör. FLT-2201" />
                <R.Girdi
                  label={duzenlenenId === "yeni" ? "Barkod" : "Birincil Barkod (salt okunur — 'Barkodlar' düğmesinden yönetin)"}
                  value={form.barkod}
                  onChange={(e) => duzenlenenId === "yeni" && setForm({ ...form, barkod: e.target.value })}
                  placeholder="ör. 8690000000001"
                  readOnly={duzenlenenId !== "yeni"}
                  style={duzenlenenId !== "yeni" ? { background: R.T.steel100 } : undefined}
                />
                <div className="col-span-2">
                  <R.Girdi label="Ürün Adı *" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="ör. Yağ Filtresi" />
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium" style={{ color: R.T.ink500 }}>
                    Ürün Markası
                  </span>
                  <input
                    list="marka-listesi"
                    value={form.marka}
                    onChange={(e) => setForm({ ...form, marka: e.target.value })}
                    placeholder="ör. Bosch"
                    className="px-3 py-2 rounded-md border text-sm outline-none"
                    style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  />
                  <datalist id="marka-listesi">
                    {db.markalar.filter((m) => m.aktif !== false).map((m) => (
                      <option key={m.id} value={m.ad} />
                    ))}
                  </datalist>
                </label>
                <R.Girdi label="Üretici Parça Kodu" value={form.ureticiKodu} onChange={(e) => setForm({ ...form, ureticiKodu: e.target.value })} placeholder="ör. 0451103316" />
                <R.Secim
                  label="Ana Kategori"
                  value={form.anaKategoriId}
                  onChange={(e) => setForm({ ...form, anaKategoriId: e.target.value, altKategoriId: "", kategoriOzelDegerler: {} })}
                >
                  <option value="">Seçin…</option>
                  {R.anaKategoriler(db).filter((k) => k.aktif !== false).map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ad}
                    </option>
                  ))}
                </R.Secim>
                <R.Secim
                  label="Alt Kategori"
                  value={form.altKategoriId}
                  onChange={(e) => setForm({ ...form, altKategoriId: e.target.value, kategoriOzelDegerler: {} })}
                  disabled={!form.anaKategoriId}
                >
                  <option value="">{form.anaKategoriId ? "(Yok / doğrudan ana kategori)" : "Önce ana kategori seçin"}</option>
                  {form.anaKategoriId &&
                    R.altKategoriler(db, form.anaKategoriId)
                      .filter((k) => k.aktif !== false)
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.ad}
                        </option>
                      ))}
                </R.Secim>
                <R.Secim label="Birim" value={form.birim} onChange={(e) => setForm({ ...form, birim: e.target.value })}>
                  {R.BIRIMLER.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </R.Secim>
                <R.Secim label="KDV Oranı" value={form.kdvOrani} onChange={(e) => setForm({ ...form, kdvOrani: e.target.value })}>
                  {R.KDV_ORANLARI.map((k) => (
                    <option key={k} value={k}>
                      %{k}
                    </option>
                  ))}
                </R.Secim>
                <R.Secim
                  label="Ürün Tipi"
                  value={form.urunTipi}
                  onChange={(e) => setForm({ ...form, urunTipi: e.target.value })}
                  hint="Set: birden fazla ürünün tek satış paketi — kendi stoğu yoktur, satılınca bileşenlerinin stoğu düşer. Bunu OEM/Muadil ile karıştırmayın; muadil aynı ihtiyacı karşılayan farklı bir markanın kendi ürünüdür."
                >
                  {R.URUN_TIPLERI.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </R.Secim>
                {(() => {
                  const seciliKategori = db.kategoriler.find((k) => k.id === (form.altKategoriId || form.anaKategoriId));
                  const ozelAlanlar = seciliKategori ? R.kategoriOzelAlanlari(db, seciliKategori) : [];
                  if (ozelAlanlar.length === 0) return null;
                  return (
                    <div className="col-span-2 grid grid-cols-2 gap-3 p-3 rounded-md" style={{ background: R.T.steel100 }}>
                      <span className="col-span-2 text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                        {seciliKategori.ad} — Özel Alanlar
                      </span>
                      {ozelAlanlar.map((oa) => (
                        <R.Girdi
                          key={oa.id}
                          label={oa.ad}
                          type={oa.tip === "sayi" ? "number" : "text"}
                          value={form.kategoriOzelDegerler[oa.ad] || ""}
                          onChange={(e) => setForm({ ...form, kategoriOzelDegerler: { ...form.kategoriOzelDegerler, [oa.ad]: e.target.value } })}
                        />
                      ))}
                    </div>
                  );
                })()}
                {form.urunTipi === "Set" && <R.SetBilesenYoneticisi db={db} form={form} setForm={setForm} />}
                {form.urunTipi === "Basit" && <R.PaketBirimYoneticisi form={form} setForm={setForm} />}
                <R.Girdi
                  label="Ana Raf (Bölüm-Raf-Göz)"
                  value={form.rafAdresi}
                  onChange={(e) => setForm({ ...form, rafAdresi: e.target.value.toUpperCase() })}
                  placeholder="ör. A-01-03"
                  hint="Ürün birden fazla rafta tutuluyorsa, kartındaki 'Raf' butonundan konum ekleyip taşıma yapabilirsiniz."
                />
                <R.Girdi
                  label={duzenlenenId === "yeni" ? "Alış Fiyatı (KDV Hariç) *" : "Alış Fiyatı (KDV Hariç, referans)"}
                  type="number"
                  value={form.alisFiyati}
                  onChange={(e) => setForm({ ...form, alisFiyati: e.target.value })}
                  placeholder="0.00"
                  hint={duzenlenenId !== "yeni" ? "Ortalama maliyet 'Stok Girişi' ile otomatik güncellenir." : undefined}
                />
                <R.Girdi
                  label="Perakende Satış Fiyatı (KDV Dahil) *"
                  type="number"
                  value={form.satisFiyati}
                  onChange={(e) => setForm({ ...form, satisFiyati: e.target.value })}
                  placeholder="0.00"
                />
                {duzenlenenId !== "yeni" && parseFloat(form.satisFiyati) !== db.parcalar.find((p) => p.id === duzenlenenId)?.satisFiyati && (
                  <R.Secim label="Fiyat Değişikliği Nedeni" value={form.fiyatDegisimNedeni} onChange={(e) => setForm({ ...form, fiyatDegisimNedeni: e.target.value })}>
                    <option value="">Belirtilmedi</option>
                    {R.FIYAT_DEGISIM_NEDENLERI.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </R.Secim>
                )}
                <R.Girdi
                  label="Minimum Satış Fiyatı (KDV Dahil)"
                  type="number"
                  value={form.minimumSatisFiyati}
                  onChange={(e) => setForm({ ...form, minimumSatisFiyati: e.target.value })}
                  placeholder="0.00"
                  hint="Satış ekranında bu fiyatın altına inilirse yönetici onayı istenir."
                />
                {duzenlenenId === "yeni" && (
                  <R.Girdi
                    label="Başlangıç Stoğu"
                    type="number"
                    value={form.stok}
                    onChange={(e) => setForm({ ...form, stok: e.target.value })}
                    placeholder="0"
                    hint="Girilen alış fiyatıyla ilk maliyet kaydı otomatik oluşur."
                  />
                )}
                <R.Girdi
                  label="Minimum Stok"
                  type="number"
                  value={form.kritikSeviye}
                  onChange={(e) => setForm({ ...form, kritikSeviye: e.target.value })}
                  placeholder="0"
                />
                <R.Girdi
                  label="Hedef Stok"
                  type="number"
                  value={form.hedefStok}
                  onChange={(e) => setForm({ ...form, hedefStok: e.target.value })}
                  placeholder="0"
                  hint="Sipariş önerisi bu seviyeye tamamlanacak şekilde hesaplanır."
                />
                <R.Girdi
                  label="Güvenlik Stoğu"
                  type="number"
                  value={form.guvenlikStogu}
                  onChange={(e) => setForm({ ...form, guvenlikStogu: e.target.value })}
                  placeholder="0"
                  hint="Satışlar artınca sipariş önerisi bu seviyenin altına düşürmeyecek şekilde hesaplanır."
                />
                <R.Girdi
                  label="Siparişteki Adet"
                  type="number"
                  value={form.siparisteAdet}
                  onChange={(e) => setForm({ ...form, siparisteAdet: e.target.value })}
                  placeholder="0"
                  hint="Yolda olan, henüz gelmemiş sipariş adedi."
                />
                <R.Girdi
                  label="Tedarikçi"
                  value={form.tedarikci}
                  onChange={(e) => setForm({ ...form, tedarikci: e.target.value })}
                  placeholder="ör. Eryaz Otomotiv"
                />
                <label className="flex items-center gap-2 text-sm mt-6">
                  <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                  <span style={{ color: R.T.ink900 }}>Aktif</span>
                </label>
              </div>

              {/* Fiyatlandırma ve Kâr özeti — canlı hesaplanır */}
              <div className="rounded-md p-3.5" style={{ background: R.T.steel100 }}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Fiyatlandırma ve Kâr
                  </span>
                  {sonFiyatTarihi && (
                    <span className="text-xs" style={{ color: R.T.ink500 }}>
                      Son fiyat değişikliği: {R.tarihGoster(sonFiyatTarihi)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <div style={{ color: R.T.ink500 }}>KDV Hariç Maliyet</div>
                    <div className="font-semibold" style={R.MONO}>
                      {R.tl(formMaliyet)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>KDV Dahil Maliyet</div>
                    <div className="font-semibold" style={R.MONO}>
                      {R.tl(formMaliyet * (1 + formKdvOrani / 100))}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>Kâr Tutarı (TL)</div>
                    <div className="font-semibold" style={{ ...R.MONO, color: formKarTutari >= 0 ? R.T.green : R.T.red }}>
                      {R.tl(formKarTutari)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>Maliyete Göre Kâr Oranı</div>
                    <div className="font-semibold" style={R.MONO}>
                      {formKarOraniMarkup !== null ? `%${formKarOraniMarkup.toFixed(1)}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>Satış Üzerinden Kâr Marjı</div>
                    <div className="font-semibold" style={R.MONO}>
                      {formKarOraniMargin !== null ? `%${formKarOraniMargin.toFixed(1)}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: R.T.ink500 }}>İskonto Oranı (tavsiyeye göre)</div>
                    <div className="font-semibold" style={R.MONO}>
                      {formIskontoOrani !== null ? `%${formIskontoOrani.toFixed(1)}` : "—"}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5" style={{ borderTop: `1px solid ${R.T.steel300}` }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Hedef Kâr Oranı ile Fiyat Öner
                  </span>
                  <div className="flex flex-wrap items-end gap-2 mt-1.5">
                    <select
                      value={hedefTuru}
                      onChange={(e) => setHedefTuru(e.target.value)}
                      className="px-2 py-2 rounded-md border text-xs outline-none bg-white"
                      style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    >
                      <option value="markup">Maliyete Göre (Markup)</option>
                      <option value="margin">Satış Üzerinden (Margin)</option>
                    </select>
                    <input
                      type="number"
                      value={hedefDeger}
                      onChange={(e) => setHedefDeger(e.target.value)}
                      className="w-20 px-2 py-2 rounded-md border text-sm outline-none"
                      style={{ borderColor: R.T.steel300, ...R.MONO }}
                      placeholder="30"
                    />
                    <span className="text-sm" style={{ color: R.T.ink500 }}>
                      %
                    </span>
                    <div className="flex-1 min-w-[140px] text-sm">
                      <span style={{ color: R.T.ink500 }}>Tavsiye Fiyat: </span>
                      <span className="font-semibold" style={R.MONO}>
                        {R.tl(formTavsiyeFiyat)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, satisFiyati: String(Math.round(formTavsiyeFiyat * 100) / 100) }))}
                      disabled={!formTavsiyeFiyat}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-40"
                      style={{ background: R.T.orange, color: "#fff" }}
                    >
                      Bu Fiyatı Kullan
                    </button>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: R.T.ink500 }}>
                    Örn. 1.000₺ maliyetli üründe %30 markup → satış 1.300₺ (kâr 300₺, markup %30, margin %23,1).
                  </p>
                </div>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: R.T.ink500 }}>
                  Ürün Açıklaması
                </span>
                <textarea
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  rows={3}
                  className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  placeholder="Ürünle ilgili notlar…"
                />
              </label>

              <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                <R.Buton onClick={() => kaydet()}>
                  <R.Check size={15} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={formuKapat}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
        </div>
      </div>
  );
}
