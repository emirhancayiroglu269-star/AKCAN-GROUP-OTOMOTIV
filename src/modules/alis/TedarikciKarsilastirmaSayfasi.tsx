/* Alış/Tedarikçi ekranı — ayrıştırılmış bileşen.
 * Finans ve veri sözleşmeleri değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function TedarikciKarsilastirmaSayfasi({ db, updateDb, aktifKullanici, setSekme }) {
  R.useEffect(() => {
    const guncel = R.tedarikciTeklifSureleriGuncelle(db);
    if (guncel !== db) updateDb(() => guncel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [altSekme, setAltSekme] = R.useState("urun");

  // --- Ürün Karşılaştırma -------------------------------------------------------
  const [urunArama, setUrunArama] = R.useState("");
  const [seciliParca, setSeciliParca] = R.useState(null);
  const urunAramaSonuclari = urunArama.trim() && !seciliParca ? R.hizliAramaYap(db, urunArama).slice(0, 8) : [];
  const karsilastirma = seciliParca ? R.urunTedarikciKarsilastirmasi(db, seciliParca.id) : [];
  const alisIstatistikleri = seciliParca ? R.urunAlisIstatistikleri(db, seciliParca.id) : null;

  // --- Marka Karşılaştırma --------------------------------------------------------
  const [markaFiltre, setMarkaFiltre] = R.useState("");
  const markalar = [...new Set(db.parcalar.map((p) => p.marka).filter(Boolean))].sort();
  const markaKarsilastirmasi = markaFiltre
    ? (() => {
        const urunler = db.parcalar.filter((p) => p.marka === markaFiltre && p.aktif !== false);
        const tedarikciToplamlari = {};
        urunler.forEach((p) => {
          const k = R.urunTedarikciKarsilastirmasi(db, p.id);
          if (k.length > 0) {
            const enUcuz = k[0];
            if (!tedarikciToplamlari[enUcuz.tedarikciAdi]) tedarikciToplamlari[enUcuz.tedarikciAdi] = { tedarikciAdi: enUcuz.tedarikciAdi, enUcuzOlduguUrunSayisi: 0 };
            tedarikciToplamlari[enUcuz.tedarikciAdi].enUcuzOlduguUrunSayisi++;
          }
        });
        return { toplamUrun: urunler.length, karsilastirilanUrun: urunler.filter((p) => R.urunTedarikciKarsilastirmasi(db, p.id).length > 0).length, siralama: Object.values(tedarikciToplamlari).sort((a, b) => b.enUcuzOlduguUrunSayisi - a.enUcuzOlduguUrunSayisi) };
      })()
    : null;

  // --- Teklifler -------------------------------------------------------------------
  const [teklifFormAcik, setTeklifFormAcik] = R.useState(false);
  const [teklifForm, setTeklifForm] = R.useState(R.bosTedarikciTeklifForm);
  const [teklifUrunArama, setTeklifUrunArama] = R.useState("");
  const [teklifSeciliUrun, setTeklifSeciliUrun] = R.useState(null);
  const [teklifDurumFiltre, setTeklifDurumFiltre] = R.useState("Geçerli");
  const teklifUrunSonuclari = teklifUrunArama.trim() && !teklifSeciliUrun ? R.hizliAramaYap(db, teklifUrunArama).slice(0, 6) : [];

  const teklifKaydet = () => {
    if (!teklifForm.tedarikciAdi.trim() || !teklifSeciliUrun || !parseFloat(teklifForm.birimFiyat)) {
      R.bildirimGoster("Tedarikçi, ürün ve fiyat zorunludur.", "hata");
      return;
    }
    const teklif = {
      id: R.yeniId("tt"),
      teklifTarihi: teklifForm.teklifTarihi,
      tedarikciAdi: teklifForm.tedarikciAdi.trim(),
      parcaId: teklifSeciliUrun.id,
      adet: parseFloat(teklifForm.adet) || 1,
      birimFiyat: parseFloat(teklifForm.birimFiyat),
      iskontoYuzde: parseFloat(teklifForm.iskontoYuzde) || 0,
      kdvOrani: parseFloat(teklifForm.kdvOrani) || 0,
      kargoUcreti: parseFloat(teklifForm.kargoUcreti) || 0,
      nakliyeUcreti: parseFloat(teklifForm.nakliyeUcreti) || 0,
      digerMaliyet: parseFloat(teklifForm.digerMaliyet) || 0,
      gecerlilikTarihi: teklifForm.gecerlilikTarihi,
      stokDurumu: teklifForm.stokDurumu || null,
      notlar: teklifForm.notlar.trim(),
      durum: "Geçerli",
    };
    updateDb((prev) =>
      R.islemKaydet(
        { ...prev, tedarikciTeklifleri: [teklif, ...prev.tedarikciTeklifleri] },
        { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: "Tedarikçi teklifi kaydedildi", aciklama: `${teklif.tedarikciAdi} — ${teklifSeciliUrun.ad}`, eskiDeger: "—", yeniDeger: R.tl(R.teklifNetMaliyetHesapla(teklif)) }
      )
    );
    R.bildirimGoster("Teklif kaydedildi.", "basari");
    setTeklifFormAcik(false);
    setTeklifForm(R.bosTedarikciTeklifForm);
    setTeklifSeciliUrun(null);
    setTeklifUrunArama("");
  };

  // "Sipariş Oluştur" — en uygun teklif(ler)i doğrudan Satın Alma
  // Siparişi'ne (33. adım) aktarır (9. madde).
  const sipariseAktar = (teklif) => {
    const parca = db.parcalar.find((p) => p.id === teklif.parcaId);
    if (!parca) return;
    const yeniKalem = {
      id: R.yeniId("sk"),
      parcaId: parca.id,
      stokKodu: parca.stokKodu,
      ad: parca.ad,
      marka: parca.marka,
      adet: teklif.adet,
      alinanAdet: 0,
      birimFiyat: teklif.birimFiyat,
      iskontoYuzde: teklif.iskontoYuzde,
      kdvOrani: teklif.kdvOrani,
    };
    updateDb((prev) => {
      const mevcutTaslak = prev.satinAlmaSiparisleri.find((s) => s.tedarikci === teklif.tedarikciAdi && s.durum === "Taslak");
      let sonuc;
      if (mevcutTaslak) {
        sonuc = { ...prev, satinAlmaSiparisleri: prev.satinAlmaSiparisleri.map((s) => (s.id === mevcutTaslak.id ? { ...s, kalemler: [...s.kalemler, yeniKalem] } : s)) };
      } else {
        sonuc = {
          ...prev,
          satinAlmaSiparisleri: [
            {
              id: R.yeniId("sas"),
              tedarikci: teklif.tedarikciAdi,
              siparisTarihi: R.isoGun(new Date()),
              beklenenTeslimTarihi: "",
              aciklama: "Tedarikçi Fiyat Karşılaştırma'dan otomatik oluşturuldu",
              olusturanKullanici: aktifKullanici?.adSoyad || "",
              durum: "Taslak",
              kalemler: [yeniKalem],
              malKabulGecmisi: [],
              tamamlanmaTarihi: null,
              iptalNedeni: "",
            },
            ...prev.satinAlmaSiparisleri,
          ],
        };
      }
      return { ...sonuc, tedarikciTeklifleri: sonuc.tedarikciTeklifleri.map((t) => (t.id === teklif.id ? { ...t, durum: "Kullanıldı" } : t)) };
    });
    R.bildirimGoster(`${parca.ad} — ${teklif.tedarikciAdi} için satın alma siparişine eklendi.`, "basari");
    if (setSekme) setSekme("satinalma");
  };

  const filtreliTeklifler = db.tedarikciTeklifleri.filter((t) => teklifDurumFiltre === "tumu" || t.durum === teklifDurumFiltre).sort((a, b) => new Date(b.teklifTarihi) - new Date(a.teklifTarihi));

  // --- Tedarikçi Performansı --------------------------------------------------------
  const performansListesi = db.tedarikciler
    .filter((t) => t.aktif !== false)
    .map((t) => ({ tedarikci: t, performans: R.tedarikciTeslimatPerformansi(db, t.ad) }))
    .filter((x) => x.performans !== null)
    .sort((a, b) => (b.performans.zamanindaYuzde || 0) - (a.performans.zamanindaYuzde || 0));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "urun", ad: "Ürün Karşılaştırma" },
          { id: "marka", ad: "Marka Karşılaştırma" },
          { id: "teklifler", ad: "Teklifler" },
          { id: "performans", ad: "Tedarikçi Performansı" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold whitespace-nowrap px-2"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "urun" && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <R.Girdi
              label="Ürün Ara"
              value={seciliParca ? seciliParca.ad : urunArama}
              onChange={(e) => {
                setSeciliParca(null);
                setUrunArama(e.target.value);
              }}
              placeholder="Stok kodu, OEM, ürün adı…"
            />
            {urunAramaSonuclari.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-52 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                {urunAramaSonuclari.map((p) => (
                  <button key={p.id} onMouseDown={() => setSeciliParca(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: R.T.ink900 }}>
                    {p.ad} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {p.stokKodu}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {seciliParca && (
            <>
              {alisIstatistikleri && (
                <R.Kart className="p-4">
                  <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                    Alış İstatistikleri
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { etiket: "Son Alış", deger: alisIstatistikleri.sonAlis.birimFiyat },
                      { etiket: "En Düşük Alış", deger: alisIstatistikleri.enDusuk.birimFiyat, ton: "green" },
                      { etiket: "Ortalama Alış", deger: alisIstatistikleri.ortalama },
                      { etiket: "Son 3 Alış Ort.", deger: alisIstatistikleri.son3Ortalama },
                    ].map((k) => (
                      <div key={k.etiket} className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                        <div className="text-xs" style={{ color: R.T.ink500 }}>
                          {k.etiket}
                        </div>
                        <div className="text-sm font-semibold mt-0.5" style={{ ...R.MONO, color: k.ton === "green" ? R.T.green : R.T.ink900 }}>
                          {R.tl(k.deger)}
                        </div>
                      </div>
                    ))}
                  </div>
                </R.Kart>
              )}

              <R.Kart className="overflow-hidden">
                <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Tedarikçi Karşılaştırması — {seciliParca.ad}
                  </span>
                </div>
                {karsilastirma.length === 0 ? (
                  <R.Bos ikon={R.Truck} baslik="Karşılaştırma verisi yok" aciklama="Bu ürün için henüz geçerli teklif veya alış geçmişi bulunmuyor." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                          <th className="text-left font-semibold px-3 py-2">Tedarikçi</th>
                          <th className="text-right font-semibold px-2 py-2">Son Alış</th>
                          <th className="text-right font-semibold px-2 py-2">Teklif</th>
                          <th className="text-right font-semibold px-2 py-2">İskonto</th>
                          <th className="text-right font-semibold px-3 py-2">Net Maliyet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {karsilastirma.map((x, i) => (
                          <tr key={x.tedarikciAdi} style={{ borderTop: `1px solid ${R.T.steel200}`, background: i === 0 ? "#E4F3E9" : "transparent" }}>
                            <td className="px-3 py-2 font-medium" style={{ color: R.T.ink900 }}>
                              {i === 0 && "✅ "}
                              {x.tedarikciAdi}
                              {x.teklif?.stokDurumu && <span className="ml-1">{R.tedarikciStokDurumGorseli[x.teklif.stokDurumu]}</span>}
                            </td>
                            <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                              {x.sonAlisFiyati !== null ? R.tl(x.sonAlisFiyati) : "—"}
                            </td>
                            <td className="px-2 py-2 text-right" style={R.MONO}>
                              {x.teklif ? R.tl(x.teklif.birimFiyat) : "—"}
                            </td>
                            <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                              {x.teklif?.iskontoYuzde > 0 ? `%${x.teklif.iskontoYuzde}` : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold" style={{ ...R.MONO, color: i === 0 ? R.T.green : R.T.ink900 }}>
                              {R.tl(x.netMaliyet)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </R.Kart>
            </>
          )}
        </div>
      )}

      {altSekme === "marka" && (
        <div className="flex flex-col gap-4">
          <R.Kart className="p-4">
            <R.Secim label="Marka" value={markaFiltre} onChange={(e) => setMarkaFiltre(e.target.value)}>
              <option value="">Seçin…</option>
              {markalar.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </R.Secim>
          </R.Kart>
          {markaKarsilastirmasi && (
            <R.Kart className="p-4">
              <p className="text-sm mb-3" style={{ color: R.T.ink500 }}>
                {markaFiltre} — {markaKarsilastirmasi.toplamUrun} ürün ({markaKarsilastirmasi.karsilastirilanUrun} tanesi karşılaştırılabilir)
              </p>
              {markaKarsilastirmasi.siralama.length === 0 ? (
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Bu markanın ürünleri için henüz tedarikçi teklifi/alış geçmişi yok.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {markaKarsilastirmasi.siralama.map((x, i) => (
                    <div key={x.tedarikciAdi} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: i === 0 ? "#E4F3E9" : R.T.steel100 }}>
                      <span style={{ color: R.T.ink900 }}>
                        {i === 0 && "🏆 "}
                        {x.tedarikciAdi}
                      </span>
                      <span className="font-semibold" style={R.MONO}>
                        {x.enUcuzOlduguUrunSayisi} üründe en uygun
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </R.Kart>
          )}
        </div>
      )}

      {altSekme === "teklifler" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
              {["tumu", "Geçerli", "Süresi Doldu", "Kullanıldı"].map((d) => (
                <button
                  key={d}
                  onClick={() => setTeklifDurumFiltre(d)}
                  className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                  style={{ background: teklifDurumFiltre === d ? R.T.graphite900 : "#fff", color: teklifDurumFiltre === d ? "#fff" : R.T.ink500 }}
                >
                  {d === "tumu" ? "Tümü" : d}
                </button>
              ))}
            </div>
            <R.Buton onClick={() => setTeklifFormAcik(true)}>
              <R.Plus size={15} /> Teklif Kaydet
            </R.Buton>
          </div>

          {filtreliTeklifler.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.FileText} baslik="Teklif yok" aciklama="WhatsApp, e-posta veya telefonla alınan tedarikçi tekliflerini buradan kaydedin." />
            </R.Kart>
          ) : (
            filtreliTeklifler.map((t) => {
              const parca = db.parcalar.find((p) => p.id === t.parcaId);
              return (
                <R.Kart key={t.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                        {t.tedarikciAdi}
                      </span>
                      <R.Rozet tone={t.durum === "Geçerli" ? "green" : t.durum === "Süresi Doldu" ? "red" : "steel"}>{t.durum}</R.Rozet>
                      {t.stokDurumu && <R.Rozet tone="steel">{R.tedarikciStokDurumGorseli[t.stokDurumu]} {t.stokDurumu}</R.Rozet>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      {parca?.ad || "(silinmiş ürün)"} · {t.adet} adet · {R.tl(t.birimFiyat)}/adet · Net Maliyet: <strong>{R.tl(R.teklifNetMaliyetHesapla(t))}</strong>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      Teklif Tarihi: {R.tarihGoster(t.teklifTarihi)}
                      {t.gecerlilikTarihi && ` · Geçerlilik: ${R.tarihGoster(t.gecerlilikTarihi)}`}
                      {t.durum === "Süresi Doldu" && <span style={{ color: R.T.red, fontWeight: 600 }}> · ⚠️ Tedarikçi teklifinin süresi doldu.</span>}
                    </div>
                    {t.notlar && (
                      <div className="text-xs mt-0.5 italic" style={{ color: R.T.ink500 }}>
                        "{t.notlar}"
                      </div>
                    )}
                  </div>
                  {t.durum === "Geçerli" && (
                    <R.Buton onClick={() => sipariseAktar(t)}>
                      <R.ClipboardList size={13} /> Sipariş Oluştur
                    </R.Buton>
                  )}
                </R.Kart>
              );
            })
          )}
        </div>
      )}

      {altSekme === "performans" && (
        <R.Kart className="overflow-hidden">
          {performansListesi.length === 0 ? (
            <R.Bos ikon={R.Truck} baslik="Performans verisi yok" aciklama="Satın alma siparişleri tamamlandıkça burada tedarikçi performansı görünecek." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Tedarikçi</th>
                    <th className="text-right font-semibold px-2 py-2">Ort. Fiyat</th>
                    <th className="text-right font-semibold px-2 py-2">Ort. Teslimat</th>
                    <th className="text-right font-semibold px-2 py-2">Zamanında</th>
                    <th className="text-right font-semibold px-2 py-2">Eksik Teslim</th>
                    <th className="text-right font-semibold px-3 py-2">İade Oranı</th>
                  </tr>
                </thead>
                <tbody>
                  {performansListesi.map(({ tedarikci, performans }) => (
                    <tr key={tedarikci.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2 font-medium" style={{ color: R.T.ink900 }}>
                        {tedarikci.ad}
                      </td>
                      <td className="px-2 py-2 text-right" style={R.MONO}>
                        {performans.ortalamaFiyat !== null ? R.tl(performans.ortalamaFiyat) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right" style={R.MONO}>
                        {performans.ortalamaTeslimatGun !== null ? `${performans.ortalamaTeslimatGun} gün` : "—"}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                        {performans.zamanindaYuzde !== null ? `%${performans.zamanindaYuzde}` : "—"}
                      </td>
                      <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: performans.eksikYuzde > 0 ? R.T.red : R.T.ink500 }}>
                        %{performans.eksikYuzde}
                      </td>
                      <td className="px-3 py-2 text-right" style={{ ...R.MONO, color: performans.iadeOrani > 0 ? R.T.red : R.T.ink500 }}>
                        %{performans.iadeOrani}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {/* Yeni teklif formu */}
      {teklifFormAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setTeklifFormAcik(false)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Tedarikçi Teklifi Kaydet
            </h3>
            <div className="flex flex-col gap-3">
              <R.Girdi label="Tedarikçi *" value={teklifForm.tedarikciAdi} onChange={(e) => setTeklifForm({ ...teklifForm, tedarikciAdi: e.target.value })} list="tk-tedarikci-listesi" />
              <datalist id="tk-tedarikci-listesi">
                {db.tedarikciler.filter((t) => t.aktif !== false).map((t) => (
                  <option key={t.id} value={t.ad} />
                ))}
              </datalist>
              <div className="relative">
                <R.Girdi
                  label="Ürün *"
                  value={teklifSeciliUrun ? teklifSeciliUrun.ad : teklifUrunArama}
                  onChange={(e) => {
                    setTeklifSeciliUrun(null);
                    setTeklifUrunArama(e.target.value);
                  }}
                  placeholder="Ürün ara…"
                />
                {teklifUrunSonuclari.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-44 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                    {teklifUrunSonuclari.map((p) => (
                      <button key={p.id} onMouseDown={() => setTeklifSeciliUrun(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: R.T.ink900 }}>
                        {p.ad}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Teklif Tarihi" type="date" value={teklifForm.teklifTarihi} onChange={(e) => setTeklifForm({ ...teklifForm, teklifTarihi: e.target.value })} />
                <R.Girdi label="Geçerlilik Tarihi" type="date" value={teklifForm.gecerlilikTarihi} onChange={(e) => setTeklifForm({ ...teklifForm, gecerlilikTarihi: e.target.value })} />
                <R.Girdi label="Adet" type="number" value={teklifForm.adet} onChange={(e) => setTeklifForm({ ...teklifForm, adet: e.target.value })} />
                <R.Girdi label="Birim Fiyat *" type="number" value={teklifForm.birimFiyat} onChange={(e) => setTeklifForm({ ...teklifForm, birimFiyat: e.target.value })} />
                <R.Girdi label="İskonto %" type="number" value={teklifForm.iskontoYuzde} onChange={(e) => setTeklifForm({ ...teklifForm, iskontoYuzde: e.target.value })} />
                <R.Girdi label="KDV %" type="number" value={teklifForm.kdvOrani} onChange={(e) => setTeklifForm({ ...teklifForm, kdvOrani: e.target.value })} />
                <R.Girdi label="Kargo Ücreti" type="number" value={teklifForm.kargoUcreti} onChange={(e) => setTeklifForm({ ...teklifForm, kargoUcreti: e.target.value })} />
                <R.Girdi label="Nakliye Ücreti" type="number" value={teklifForm.nakliyeUcreti} onChange={(e) => setTeklifForm({ ...teklifForm, nakliyeUcreti: e.target.value })} />
                <R.Girdi label="Diğer Maliyet" type="number" value={teklifForm.digerMaliyet} onChange={(e) => setTeklifForm({ ...teklifForm, digerMaliyet: e.target.value })} />
                <R.Secim label="Tedarikçi Stok Durumu" value={teklifForm.stokDurumu} onChange={(e) => setTeklifForm({ ...teklifForm, stokDurumu: e.target.value })}>
                  <option value="">Belirtilmedi</option>
                  {R.TEDARIKCI_STOK_DURUMLARI.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </R.Secim>
              </div>
              {parseFloat(teklifForm.birimFiyat) > 0 && (
                <p className="text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                  Net Maliyet (hesaplanan):{" "}
                  <strong>
                    {R.tl(
                      R.teklifNetMaliyetHesapla({
                        birimFiyat: parseFloat(teklifForm.birimFiyat) || 0,
                        iskontoYuzde: parseFloat(teklifForm.iskontoYuzde) || 0,
                        kdvOrani: parseFloat(teklifForm.kdvOrani) || 0,
                        kargoUcreti: parseFloat(teklifForm.kargoUcreti) || 0,
                        nakliyeUcreti: parseFloat(teklifForm.nakliyeUcreti) || 0,
                        digerMaliyet: parseFloat(teklifForm.digerMaliyet) || 0,
                        adet: parseFloat(teklifForm.adet) || 1,
                      })
                    )}
                  </strong>
                </p>
              )}
              <R.Girdi label="Notlar" value={teklifForm.notlar} onChange={(e) => setTeklifForm({ ...teklifForm, notlar: e.target.value })} placeholder="ör. WhatsApp'tan alındı, 3 gün geçerli" />
              <div className="flex gap-2">
                <R.Buton onClick={teklifKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setTeklifFormAcik(false)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
