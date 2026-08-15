/* Extracted from Satis.tsx — public component kept self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function TekliflerSayfasi({ db, updateDb, aktifKullanici, setSekme, setSepet }) {
  R.useEffect(() => {
    const guncel = R.teklifSureleriGuncelle(db);
    if (guncel !== db) updateDb(() => guncel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [altSekme, setAltSekme] = R.useState("teklifler");
  const [durumFiltre, setDurumFiltre] = R.useState("tumu");
  const [formAcik, setFormAcik] = R.useState(false);
  const [form, setForm] = R.useState(R.bosTeklifForm);
  const [kalemler, setKalemler] = R.useState([]);
  const [urunArama, setUrunArama] = R.useState("");
  const [hazirlayan, setHazirlayan] = R.useIslemYapan(aktifKullanici);
  const [iptalNedeni, setIptalNedeni] = R.useState("");
  const [reddetHedef, setReddetHedef] = R.useState(null);

  const urunAramaSonuclari = urunArama.trim() ? R.hizliAramaYap(db, urunArama).slice(0, 6) : [];

  const kalemEkle = (p) => {
    if (kalemler.some((k) => k.parcaId === p.id)) return;
    setKalemler((prev) => [
      ...prev,
      { id: R.yeniId("tk"), parcaId: p.id, stokKodu: p.stokKodu, ad: p.ad, marka: p.marka, adet: 1, birimFiyat: p.satisFiyati || 0, iskontoTuru: "yuzde", iskontoDeger: 0, kdvOrani: p.kdvOrani || 0, maliyet: R.gecerliMaliyet(p, db) },
    ]);
    setUrunArama("");
  };
  const kalemGuncelle = (id, alan, deger) => setKalemler((prev) => prev.map((k) => (k.id === id ? { ...k, [alan]: deger } : k)));
  const kalemSil = (id) => setKalemler((prev) => prev.filter((k) => k.id !== id));

  const formuAc = () => {
    setForm(R.bosTeklifForm);
    setKalemler([]);
    setUrunArama("");
    setFormAcik(true);
  };

  const teklifKaydet = () => {
    if (!form.musteriAdi.trim()) {
      R.bildirimGoster("Müşteri adı zorunludur.", "hata");
      return;
    }
    if (kalemler.length === 0) {
      R.bildirimGoster("En az bir ürün ekleyin.", "hata");
      return;
    }
    const musteriKaydi = db.cariler.find((c) => c.ad.toLowerCase() === form.musteriAdi.trim().toLowerCase());
    const belgeBilgisi = R.yeniBelgeNumarasiUret(db, "Teklif");
    const teklif = {
      id: R.yeniId("tf"),
      teklifNo: belgeBilgisi.belgeNo,
      tarih: form.tarih,
      gecerlilikTarihi: form.gecerlilikTarihi,
      musteriAdi: form.musteriAdi.trim(),
      musteriId: musteriKaydi?.id || null,
      kalemler,
      aciklama: form.aciklama.trim(),
      hazirlayanPersonel: aktifKullanici?.adSoyad || hazirlayan.trim(),
      durum: "Taslak",
      donusturulenSatisId: null,
      rezervIdleri: [],
    };

    updateDb((prev) => {
      let sonuc = R.belgeSayaciGuncelle(prev, belgeBilgisi.anahtar, belgeBilgisi.siraSonraki);
      // Opsiyonel: ürünleri rezerve et — teklif kabul edilene kadar başka
      // müşteriye satılmasın (9. adım, "ayrı bir seçim olmalı").
      let rezervIdleri = [];
      if (form.rezerveEt) {
        kalemler.forEach((k) => {
          const rezervId = R.yeniId("rz");
          rezervIdleri.push(rezervId);
          sonuc = {
            ...sonuc,
            rezervler: [
              {
                id: rezervId,
                musteriAdi: teklif.musteriAdi,
                musteriTelefon: "",
                parcaId: k.parcaId,
                adet: k.adet,
                rezervFiyati: k.birimFiyat,
                rezervTarihi: form.tarih,
                sonGecerlilikTarihi: form.gecerlilikTarihi,
                not: `Teklif ${teklif.teklifNo}`,
                olusturanKullanici: teklif.hazirlayanPersonel,
                durum: "Bekliyor",
                donusturulenSatisId: null,
                iptalNedeni: "",
              },
              ...sonuc.rezervler,
            ],
          };
        });
      }
      teklif.rezervIdleri = rezervIdleri;
      return R.islemKaydet(
        { ...sonuc, teklifler: [teklif, ...sonuc.teklifler] },
        { kullaniciAdi: teklif.hazirlayanPersonel, islemTuru: "Teklif oluşturuldu", aciklama: `${teklif.teklifNo} — ${teklif.musteriAdi}`, eskiDeger: "—", yeniDeger: R.tl(R.teklifGenelToplam(teklif)) }
      );
    });
    R.sonKullaniciAdiKaydet(hazirlayan);
    R.bildirimGoster("Teklif oluşturuldu.", "basari");
    setFormAcik(false);
  };

  const durumDegistir = (teklif, yeniDurum, nedenMetin) => {
    updateDb((prev) => ({ ...prev, teklifler: prev.teklifler.map((t) => (t.id === teklif.id ? { ...t, durum: yeniDurum, redNedeni: nedenMetin || t.redNedeni } : t)) }));
    R.bildirimGoster(`Teklif "${yeniDurum}" olarak işaretlendi.`, "basari");
  };

  // "Teklifi Aç → Satışa Dönüştür" — ürünleri tekrar seçtirmeden, teklifteki
  // SABİT fiyatı koruyarak sepete aktarır (4. adım: fiyat sonradan değişse
  // bile teklif fiyatı geçerlidir).
  const satisaDonustur = (teklif) => {
    if (!setSepet || !setSekme) return;
    const eklenecekler = teklif.kalemler
      .map((k) => {
        const parca = db.parcalar.find((p) => p.id === k.parcaId);
        if (!parca) return null;
        return { parcaId: k.parcaId, adet: k.adet, birimFiyat: k.birimFiyat, iskontoTuru: k.iskontoTuru, iskontoDeger: k.iskontoDeger, fiyatKaynagi: `Teklif ${teklif.teklifNo}` };
      })
      .filter(Boolean);
    if (eklenecekler.length === 0) {
      R.bildirimGoster("Bu tekliften ürünler artık sistemde bulunamadı.", "hata");
      return;
    }
    setSepet((prev) => {
      let yeni = [...prev];
      eklenecekler.forEach((e) => {
        const mevcut = yeni.find((s) => s.parcaId === e.parcaId);
        yeni = mevcut ? yeni.map((s) => (s.parcaId === e.parcaId ? { ...s, adet: s.adet + e.adet } : s)) : [...yeni, e];
      });
      return yeni;
    });
    updateDb((prev) => ({ ...prev, teklifler: prev.teklifler.map((t) => (t.id === teklif.id ? { ...t, durum: "Satışa Dönüştü" } : t)) }));
    R.bildirimGoster(`${eklenecekler.length} ürün, teklif fiyatlarıyla sepete aktarıldı.`, "basari");
    setSekme("satis");
  };

  const yazdir = (teklif) => {
    const pencere = window.open("", "_blank");
    if (!pencere) return;
    const magaza = db.magazaBilgileri || {};
    const satirlarHtml = teklif.kalemler
      .map((k) => {
        const oem = db.kodlar.find((kd) => kd.parcaId === k.parcaId && kd.tip === "OEM");
        return `<tr><td>${k.ad}</td><td>${k.marka}</td><td>${k.stokKodu}</td><td>${oem?.kod || "—"}</td><td style="text-align:center">${k.adet}</td><td style="text-align:right">${R.tl(k.birimFiyat)}</td><td style="text-align:right;font-weight:600">${R.tl(R.teklifKalemNetTutar(k))}</td></tr>`;
      })
      .join("");
    pencere.document.write(`
      <html><head><title>Teklif ${teklif.teklifNo}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 12px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        .toplam { text-align: right; font-size: 15px; font-weight: 700; margin-top: 8px; }
      </style></head>
      <body>
        <h1>${magaza.ad || "Mağaza"}</h1>
        <div class="sub">${[magaza.adres, magaza.telefon, magaza.vergiDairesi && `${magaza.vergiDairesi} V.D.`, magaza.vergiNo && `VN: ${magaza.vergiNo}`].filter(Boolean).join(" · ")}</div>
        <h2 style="font-size:15px">Fiyat Teklifi — ${teklif.teklifNo}</h2>
        <div class="sub">Müşteri: ${teklif.musteriAdi} · Tarih: ${R.tarihGoster(teklif.tarih)} · Geçerlilik: ${R.tarihGoster(teklif.gecerlilikTarihi)}</div>
        <table>
          <thead><tr><th>Ürün</th><th>Marka</th><th>Kod</th><th>OEM</th><th>Adet</th><th>Birim Fiyat</th><th>Tutar</th></tr></thead>
          <tbody>${satirlarHtml}</tbody>
        </table>
        <div class="toplam">Genel Toplam: ${R.tl(R.teklifGenelToplam(teklif))}</div>
        ${teklif.aciklama ? `<p class="sub" style="margin-top:16px">${teklif.aciklama}</p>` : ""}
        <p class="sub" style="margin-top:24px">Hazırlayan: ${teklif.hazirlayanPersonel}</p>
      </body></html>
    `);
    pencere.document.close();
    pencere.print();
  };

  // --- Maliyet altı teklif kontrolü (8. adım) -----------------------------------
  const kalemMaliyetUyarisi = (k) => {
    const efektifBirim = k.iskontoTuru === "yuzde" ? k.birimFiyat * (1 - (k.iskontoDeger || 0) / 100) : k.birimFiyat - (k.iskontoDeger || 0) / (k.adet || 1);
    const net = efektifBirim / (1 + (k.kdvOrani || 0) / 100);
    return net < k.maliyet ? net - k.maliyet : null;
  };

  const filtreliTeklifler = db.teklifler.filter((t) => durumFiltre === "tumu" || t.durum === durumFiltre).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "teklifler", ad: "Teklifler" },
          { id: "fiyatlistesi", ad: "Toplu Fiyat Listesi" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "teklifler" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
              {["tumu", ...R.TEKLIF_DURUMLARI].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurumFiltre(d)}
                  className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                  style={{ background: durumFiltre === d ? R.T.graphite900 : "#fff", color: durumFiltre === d ? "#fff" : R.T.ink500 }}
                >
                  {d === "tumu" ? "Tümü" : `${R.teklifDurumGorseli[d].emoji} ${d}`}
                </button>
              ))}
            </div>
            <R.Buton onClick={formuAc}>
              <R.Plus size={15} /> Yeni Teklif
            </R.Buton>
          </div>

          {filtreliTeklifler.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.FileText} baslik="Teklif yok" aciklama="Satışa dönüştürmeden fiyat teklifi oluşturun." />
            </R.Kart>
          ) : (
            filtreliTeklifler.map((t) => {
              const durum = R.teklifDurumGorseli[t.durum];
              return (
                <R.Kart key={t.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                        {t.teklifNo}
                      </span>
                      <R.Rozet tone={durum.ton}>
                        {durum.emoji} {t.durum}
                      </R.Rozet>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      {t.musteriAdi} · {t.kalemler.length} ürün · {R.tl(R.teklifGenelToplam(t))} · Tarih: {R.tarihGoster(t.tarih)} · Geçerlilik: {R.tarihGoster(t.gecerlilikTarihi)}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      Hazırlayan: {t.hazirlayanPersonel}
                      {t.rezervIdleri?.length > 0 && " · 📦 Ürünler rezerve edildi"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {t.durum === "Taslak" && (
                      <button onClick={() => durumDegistir(t, "Gönderildi")} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                        Gönderildi İşaretle
                      </button>
                    )}
                    {(t.durum === "Taslak" || t.durum === "Gönderildi") && (
                      <>
                        <button onClick={() => durumDegistir(t, "Onaylandı")} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.green, color: "#fff" }}>
                          Onaylandı
                        </button>
                        <button onClick={() => setReddetHedef(t)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: "#F9DEDE", color: R.T.red }}>
                          Reddet
                        </button>
                      </>
                    )}
                    {t.durum === "Onaylandı" && (
                      <R.Buton onClick={() => satisaDonustur(t)}>
                        <R.ShoppingCart size={13} /> Satışa Dönüştür
                      </R.Buton>
                    )}
                    <button onClick={() => yazdir(t)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      <R.Printer size={13} /> Yazdır / PDF
                    </button>
                  </div>
                </R.Kart>
              );
            })
          )}
        </div>
      )}

      {altSekme === "fiyatlistesi" && <TopluFiyatListesi db={db} />}

      {/* Yeni teklif formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-2xl rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Yeni Fiyat Teklifi
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <R.Girdi label="Müşteri *" value={form.musteriAdi} onChange={(e) => setForm({ ...form, musteriAdi: e.target.value })} list="teklif-musteri-listesi" />
              <datalist id="teklif-musteri-listesi">
                {db.cariler.filter((c) => c.aktif !== false).map((c) => (
                  <option key={c.id} value={c.ad} />
                ))}
              </datalist>
              <R.Girdi label="Hazırlayan Personel" value={hazirlayan} readOnly />
              <R.Girdi label="Teklif Tarihi" type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
              <R.Girdi label="Geçerlilik Tarihi" type="date" value={form.gecerlilikTarihi} onChange={(e) => setForm({ ...form, gecerlilikTarihi: e.target.value })} />
            </div>

            <div className="relative mb-2">
              <R.Girdi label="Ürün Ekle" value={urunArama} onChange={(e) => setUrunArama(e.target.value)} placeholder="Ürün ara…" />
              {urunAramaSonuclari.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-48 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                  {urunAramaSonuclari.map((p) => (
                    <button key={p.id} onMouseDown={() => kalemEkle(p)} className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50" style={{ color: R.T.ink900 }}>
                      <span>{p.ad}</span>
                      <span className="text-xs" style={{ color: R.T.ink500 }}>
                        {R.tl(p.satisFiyati)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {kalemler.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {kalemler.map((k) => {
                  const zararUyarisi = kalemMaliyetUyarisi(k);
                  return (
                    <div key={k.id} className="p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm" style={{ color: R.T.ink900 }}>
                          {k.ad}
                        </span>
                        <button onClick={() => kalemSil(k.id)} style={{ color: R.T.red }}>
                          <R.Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs" style={{ color: R.T.ink500 }}>
                            Adet
                          </span>
                          <input type="number" value={k.adet} onChange={(e) => kalemGuncelle(k.id, "adet", parseFloat(e.target.value) || 0)} className="w-16 px-2 py-1 rounded border text-sm outline-none" style={{ borderColor: R.T.steel300, ...R.MONO }} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs" style={{ color: R.T.ink500 }}>
                            Birim Fiyat
                          </span>
                          <input type="number" value={k.birimFiyat} onChange={(e) => kalemGuncelle(k.id, "birimFiyat", parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 rounded border text-sm outline-none" style={{ borderColor: R.T.steel300, ...R.MONO }} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs" style={{ color: R.T.ink500 }}>
                            İskonto %
                          </span>
                          <input type="number" value={k.iskontoDeger} onChange={(e) => kalemGuncelle(k.id, "iskontoDeger", parseFloat(e.target.value) || 0)} className="w-16 px-2 py-1 rounded border text-sm outline-none" style={{ borderColor: R.T.steel300, ...R.MONO }} />
                        </div>
                        <span className="text-sm font-semibold ml-auto" style={R.MONO}>
                          {R.tl(R.teklifKalemNetTutar(k))}
                        </span>
                      </div>
                      {zararUyarisi !== null && (
                        <p className="text-xs mt-1.5 font-semibold" style={{ color: R.T.red }}>
                          🔴 Maliyet altında teklif — Maliyet: {R.tl(k.maliyet)}, Kayıp: {R.tl(zararUyarisi)}/adet
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-end text-sm font-semibold" style={{ color: R.T.ink900 }}>
                  Genel Toplam: <span style={{ ...R.MONO, marginLeft: 6 }}>{R.tl(kalemler.reduce((t, k) => t + R.teklifKalemNetTutar(k), 0))}</span>
                </div>
              </div>
            )}

            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: R.T.ink500 }}>
                Açıklama
              </span>
              <textarea value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} rows={2} className="px-3 py-2 rounded-md border text-sm outline-none resize-none" style={{ borderColor: R.T.steel300, color: R.T.ink900 }} />
            </label>

            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={form.rezerveEt} onChange={(e) => setForm({ ...form, rezerveEt: e.target.checked })} />
              <span style={{ color: R.T.ink900 }}>Ürünleri rezerve et (teklif onaylanana kadar başkasına satılmasın)</span>
            </label>

            <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <R.Buton
                onClick={() => {
                  const zararliVarMi = kalemler.some((k) => kalemMaliyetUyarisi(k) !== null);
                  if (zararliVarMi) {
                    const onay = R.yoneticiOnayiAl(db, "Bu teklifte maliyet altında fiyatlandırılmış ürün var — yönetici onayı gerekiyor.");
                    if (!onay) {
                      R.bildirimGoster("Teklif kaydedilmedi.", "hata");
                      return;
                    }
                  }
                  teklifKaydet();
                }}
              >
                <R.Check size={15} /> Teklifi Kaydet
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setFormAcik(false)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Reddet nedeni */}
      {reddetHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setReddetHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Teklifi Reddet
            </h3>
            <textarea
              value={iptalNedeni}
              onChange={(e) => setIptalNedeni(e.target.value)}
              rows={2}
              placeholder="Ret nedeni (opsiyonel)"
              className="w-full px-3 py-2 rounded-md border text-sm outline-none resize-none mb-3"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
            />
            <div className="flex gap-2">
              <R.Buton
                variant="danger"
                onClick={() => {
                  durumDegistir(reddetHedef, "Reddedildi", iptalNedeni.trim());
                  setReddetHedef(null);
                  setIptalNedeni("");
                }}
              >
                Reddet
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setReddetHedef(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
