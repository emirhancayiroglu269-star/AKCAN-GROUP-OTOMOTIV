import React, { useState } from "react";
import { Check, Percent, Plus, Trash2, Users, X } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { bildirimGoster } from "../lib/bildirim";
import { yeniId, tl, tarihGoster, isoGun, zamanDamgasi } from "../lib/format";
import { islemKaydet } from "../lib/constants";
import { hizliAramaYap } from "../lib/arama";
import { kampanyaOnizlemesiHesapla, kampanyaSatisRaporu } from "../lib/fiyatlandirma";
import { yoneticiOnayiAl } from "../lib/yonetici-onay";
import { Kart, Buton, Girdi, Secim, Bos, Rozet } from "../components/ui";

export function FiyatKurallariSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = useState("gruplar"); // gruplar | ozelFiyat | kampanya

  // --- Fiyat Grupları -----------------------------------------------------
  const [seciliGrupId, setSeciliGrupId] = useState(db.musteriFiyatGruplari[0]?.id || null);
  const [yeniGrupAdi, setYeniGrupAdi] = useState("");
  const [kuralHedefTuru, setKuralHedefTuru] = useState("tumu");
  const [kuralHedefDeger, setKuralHedefDeger] = useState("");
  const [kuralUrunArama, setKuralUrunArama] = useState("");
  const [kuralIskontoTuru, setKuralIskontoTuru] = useState("yuzde");
  const [kuralIskontoDeger, setKuralIskontoDeger] = useState("10");

  const seciliGrup = seciliGrupId ? db.musteriFiyatGruplari.find((g) => g.id === seciliGrupId) : null;
  const grupKurallari = seciliGrup ? db.fiyatGrubuKurallari.filter((k) => k.grupId === seciliGrup.id) : [];
  const kuralUrunAramaSonuclari = kuralUrunArama.trim() ? hizliAramaYap(db, kuralUrunArama).slice(0, 6) : [];

  const markalar = [...new Set(db.parcalar.map((p) => p.marka).filter(Boolean))].sort();

  const grupEkle = () => {
    if (!yeniGrupAdi.trim()) return;
    const g = { id: yeniId("fg"), ad: yeniGrupAdi.trim(), aciklama: "" };
    updateDb((prev) => ({ ...prev, musteriFiyatGruplari: [...prev.musteriFiyatGruplari, g] }));
    setYeniGrupAdi("");
    setSeciliGrupId(g.id);
  };

  const grupSil = (g) => {
    if (db.cariler.some((c) => c.fiyatGrubuId === g.id)) {
      bildirimGoster("Bu fiyat grubunu kullanan müşteriler var — önce onların grubunu değiştirin.", "hata");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      musteriFiyatGruplari: prev.musteriFiyatGruplari.filter((x) => x.id !== g.id),
      fiyatGrubuKurallari: prev.fiyatGrubuKurallari.filter((k) => k.grupId !== g.id),
    }));
    if (seciliGrupId === g.id) setSeciliGrupId(null);
  };

  const kuralEkle = () => {
    if (!seciliGrup) return;
    if (kuralHedefTuru !== "tumu" && !kuralHedefDeger) {
      bildirimGoster("Hedef seçin (ürün/kategori/marka).", "hata");
      return;
    }
    const deger = parseFloat(kuralIskontoDeger);
    if (isNaN(deger) || deger < 0) {
      bildirimGoster("Geçerli bir iskonto değeri girin.", "hata");
      return;
    }
    const kural = { id: yeniId("fgk"), grupId: seciliGrup.id, hedefTuru: kuralHedefTuru, hedefDeger: kuralHedefTuru === "tumu" ? null : kuralHedefDeger, iskontoTuru: kuralIskontoTuru, iskontoDeger: deger };
    updateDb((prev) =>
      islemKaydet(
        { ...prev, fiyatGrubuKurallari: [...prev.fiyatGrubuKurallari, kural] },
        {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Fiyat grubu kuralı eklendi",
          aciklama: `${seciliGrup.ad} — ${kuralHedefTuru === "tumu" ? "Tüm Ürünler" : kuralHedefDeger}`,
          eskiDeger: "—",
          yeniDeger: `${kuralIskontoTuru === "yuzde" ? "%" : ""}${deger}${kuralIskontoTuru === "tutar" ? "₺" : ""} iskonto`,
        }
      )
    );
    setKuralHedefDeger("");
    setKuralUrunArama("");
    bildirimGoster("Kural eklendi.", "basari");
  };

  const kuralSil = (kuralId) => {
    updateDb((prev) => ({ ...prev, fiyatGrubuKurallari: prev.fiyatGrubuKurallari.filter((k) => k.id !== kuralId) }));
  };

  const hedefEtiketiGetir = (kural) => {
    if (kural.hedefTuru === "tumu") return "Tüm Ürünler";
    if (kural.hedefTuru === "urun") return db.parcalar.find((p) => p.id === kural.hedefDeger)?.ad || kural.hedefDeger;
    return kural.hedefDeger;
  };

  // --- Müşteriye Özel Fiyat -------------------------------------------------
  const [ofMusteriArama, setOfMusteriArama] = useState("");
  const [ofSeciliMusteri, setOfSeciliMusteri] = useState(null);
  const [ofUrunArama, setOfUrunArama] = useState("");
  const [ofSeciliUrun, setOfSeciliUrun] = useState(null);
  const [ofFiyat, setOfFiyat] = useState("");

  const ofMusteriSonuclari = !ofSeciliMusteri && ofMusteriArama.trim() ? db.cariler.filter((c) => c.aktif !== false && c.ad.toLowerCase().includes(ofMusteriArama.toLowerCase())).slice(0, 6) : [];
  const ofUrunSonuclari = !ofSeciliUrun && ofUrunArama.trim() ? hizliAramaYap(db, ofUrunArama).slice(0, 6) : [];

  const ozelFiyatEkle = () => {
    if (!ofSeciliMusteri || !ofSeciliUrun) {
      bildirimGoster("Müşteri ve ürün seçin.", "hata");
      return;
    }
    const fiyat = parseFloat(ofFiyat);
    if (isNaN(fiyat) || fiyat < 0) {
      bildirimGoster("Geçerli bir fiyat girin.", "hata");
      return;
    }
    const mevcut = db.musteriOzelFiyatlar.find((f) => f.musteriId === ofSeciliMusteri.id && f.parcaId === ofSeciliUrun.id);
    const kayit = { id: mevcut?.id || yeniId("mof"), musteriId: ofSeciliMusteri.id, parcaId: ofSeciliUrun.id, fiyat, tarih: zamanDamgasi(), kullanici: aktifKullanici?.adSoyad || "" };
    updateDb((prev) =>
      islemKaydet(
        { ...prev, musteriOzelFiyatlar: mevcut ? prev.musteriOzelFiyatlar.map((f) => (f.id === mevcut.id ? kayit : f)) : [...prev.musteriOzelFiyatlar, kayit] },
        {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Müşteriye özel fiyat tanımlandı",
          aciklama: `${ofSeciliMusteri.ad} → ${ofSeciliUrun.ad}`,
          eskiDeger: mevcut ? tl(mevcut.fiyat) : tl(ofSeciliUrun.satisFiyati),
          yeniDeger: tl(fiyat),
        }
      )
    );
    bildirimGoster("Müşteriye özel fiyat kaydedildi.", "basari");
    setOfSeciliMusteri(null);
    setOfSeciliUrun(null);
    setOfFiyat("");
    setOfMusteriArama("");
    setOfUrunArama("");
  };

  const ozelFiyatSil = (f) => {
    updateDb((prev) =>
      islemKaydet(
        { ...prev, musteriOzelFiyatlar: prev.musteriOzelFiyatlar.filter((x) => x.id !== f.id) },
        {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Müşteriye özel fiyat kaldırıldı",
          aciklama: `${db.cariler.find((c) => c.id === f.musteriId)?.ad || "—"} → ${db.parcalar.find((p) => p.id === f.parcaId)?.ad || "—"}`,
          eskiDeger: tl(f.fiyat),
          yeniDeger: "Normal Fiyat",
        }
      )
    );
  };

  // --- Kampanyalar -----------------------------------------------------------
  const bosKampanyaForm = {
    ad: "",
    baslangicTarihi: isoGun(new Date()),
    bitisTarihi: new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-CA"),
    hedefTuru: "kategori",
    hedefDeger: "",
    hedefUrunIdleri: [],
    hedefMusteriGrubuId: "",
    iskontoTuru: "yuzde",
    iskontoDeger: "10",
    minimumAdet: "",
    maksimumAdet: "",
  };
  const [kampanyaFormAcik, setKampanyaFormAcik] = useState(false);
  const [kampanyaForm, setKampanyaForm] = useState(bosKampanyaForm);
  const [kampanyaUrunArama, setKampanyaUrunArama] = useState("");
  const [raporGosterKampanyaId, setRaporGosterKampanyaId] = useState(null);

  const bugunIso = isoGun(new Date());
  const kampanyaDurumu = (k) => {
    if (k.aktif === false) return { etiket: "Pasif", ton: "steel" };
    if (k.bitisTarihi < bugunIso) return { etiket: "Bitti", ton: "steel" };
    if (k.baslangicTarihi > bugunIso) return { etiket: "Planlandı", ton: "yellow" };
    return { etiket: "Aktif", ton: "green" };
  };

  const kampanyaKaydet = () => {
    if (!kampanyaForm.ad.trim()) {
      bildirimGoster("Kampanya adı zorunludur.", "hata");
      return;
    }
    if (kampanyaForm.hedefTuru !== "tumu" && kampanyaForm.hedefTuru !== "urunGrubu" && !kampanyaForm.hedefDeger) {
      bildirimGoster("Hedef seçin.", "hata");
      return;
    }
    if (kampanyaForm.hedefTuru === "urunGrubu" && kampanyaForm.hedefUrunIdleri.length === 0) {
      bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const kampanya = {
      id: yeniId("kmp"),
      ad: kampanyaForm.ad.trim(),
      baslangicTarihi: kampanyaForm.baslangicTarihi,
      bitisTarihi: kampanyaForm.bitisTarihi,
      hedefTuru: kampanyaForm.hedefTuru,
      hedefDeger: kampanyaForm.hedefDeger,
      hedefUrunIdleri: kampanyaForm.hedefUrunIdleri,
      hedefMusteriGrubuId: kampanyaForm.hedefMusteriGrubuId || "",
      iskontoTuru: kampanyaForm.iskontoTuru,
      iskontoDeger: parseFloat(kampanyaForm.iskontoDeger) || 0,
      minimumAdet: kampanyaForm.minimumAdet ? parseFloat(kampanyaForm.minimumAdet) : null,
      maksimumAdet: kampanyaForm.maksimumAdet ? parseFloat(kampanyaForm.maksimumAdet) : null,
      aktif: true,
      maliyetAltiOnaylandi: false,
    };

    // Minimum kâr kontrolü (5. madde) — kampanya fiyatı maliyetin altına
    // düşüyorsa yönetici onayı olmadan yayınlanmasın.
    const onizleme = kampanyaOnizlemesiHesapla(db, kampanya);
    const zararliUrunler = onizleme.filter((x) => x.maliyetAlti);
    if (zararliUrunler.length > 0) {
      const onay = yoneticiOnayiAl(db, `🔴 Maliyet altı kampanya! ${zararliUrunler.length} üründe kampanya fiyatı maliyetin altında (ör. ${zararliUrunler[0].parca.ad}: Maliyet ${tl(zararliUrunler[0].maliyet)}, Kampanya ${tl(zararliUrunler[0].kampanyaliFiyat)}). Yayınlamak için yönetici onayı gerekiyor.`);
      if (!onay) {
        bildirimGoster("Kampanya kaydedilmedi.", "hata");
        return;
      }
      kampanya.maliyetAltiOnaylandi = true;
    }

    updateDb((prev) =>
      islemKaydet(
        { ...prev, kampanyalar: [kampanya, ...prev.kampanyalar] },
        {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Kampanya oluşturuldu",
          aciklama: `${kampanya.ad} (${tarihGoster(kampanya.baslangicTarihi)}–${tarihGoster(kampanya.bitisTarihi)})`,
          eskiDeger: "—",
          yeniDeger: `${kampanya.iskontoTuru === "yuzde" ? "%" : ""}${kampanya.iskontoDeger}${kampanya.iskontoTuru === "tutar" ? "₺" : ""} indirim`,
        }
      )
    );
    bildirimGoster("Kampanya oluşturuldu — süre bitince fiyat otomatik eski haline döner.", "basari");
    setKampanyaFormAcik(false);
    setKampanyaForm(bosKampanyaForm);
  };

  const kampanyaPasifYap = (k) => updateDb((prev) => ({ ...prev, kampanyalar: prev.kampanyalar.map((x) => (x.id === k.id ? { ...x, aktif: false } : x)) }));
  const kampanyaSil = (k) => updateDb((prev) => ({ ...prev, kampanyalar: prev.kampanyalar.filter((x) => x.id !== k.id) }));
  const kampanyaUrunSonuclari = kampanyaUrunArama.trim() ? hizliAramaYap(db, kampanyaUrunArama).slice(0, 6) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: T.steel300 }}>
        {[
          { id: "gruplar", ad: "Fiyat Grupları" },
          { id: "ozelFiyat", ad: "Müşteriye Özel Fiyat" },
          { id: "kampanya", ad: "Kampanyalar" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{ background: altSekme === s.id ? T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      <p className="text-xs -mt-3" style={{ color: T.ink500 }}>
        Öncelik sırası: <strong>Müşteriye Özel Fiyat</strong> → <strong>Müşteri Fiyat Grubu</strong> → <strong>Aktif Kampanya</strong> →{" "}
        <strong>Normal Satış Fiyatı</strong>. Satış ekranında bir ürün sepete eklenirken bu sıra otomatik uygulanır.
      </p>

      {altSekme === "gruplar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={yeniGrupAdi}
                onChange={(e) => setYeniGrupAdi(e.target.value)}
                placeholder="Yeni grup adı…"
                className="flex-1 px-3 py-2 rounded-md border text-sm outline-none"
                style={{ borderColor: T.steel300 }}
              />
              <button onClick={grupEkle} className="px-3 py-2 rounded-md" style={{ background: T.orange, color: "#fff" }}>
                <Plus size={15} />
              </button>
            </div>
            <Kart className="overflow-hidden">
              {db.musteriFiyatGruplari.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSeciliGrupId(g.id)}
                  className="w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between"
                  style={{ borderTop: `1px solid ${T.steel200}`, background: seciliGrupId === g.id ? "#FBE1D5" : "#fff", color: T.ink900 }}
                >
                  <span>{g.ad}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: T.ink500 }}>
                      {db.fiyatGrubuKurallari.filter((k) => k.grupId === g.id).length} kural
                    </span>
                    <Trash2
                      size={13}
                      style={{ color: T.red }}
                      onClick={(e) => {
                        e.stopPropagation();
                        grupSil(g);
                      }}
                    />
                  </span>
                </button>
              ))}
            </Kart>
          </div>

          <div className="lg:col-span-2">
            {!seciliGrup ? (
              <Kart className="h-full flex items-center justify-center">
                <Bos ikon={Percent} baslik="Bir fiyat grubu seçin" aciklama="Kurallarını görmek ve yeni kural eklemek için soldan bir grup seçin." />
              </Kart>
            ) : (
              <div className="flex flex-col gap-4">
                <Kart className="p-4">
                  <h4 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
                    {seciliGrup.ad} — Kurallar
                  </h4>
                  {grupKurallari.length === 0 ? (
                    <p className="text-sm" style={{ color: T.ink500 }}>
                      Henüz kural yok — bu gruptaki müşteriler normal fiyattan alışveriş yapar.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {grupKurallari.map((k) => (
                        <div key={k.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: T.steel100 }}>
                          <span style={{ color: T.ink900 }}>{hedefEtiketiGetir(k)}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold" style={MONO}>
                              {k.iskontoTuru === "yuzde" ? `%${k.iskontoDeger}` : tl(k.iskontoDeger)} indirim
                            </span>
                            <button onClick={() => kuralSil(k.id)} style={{ color: T.red }}>
                              <Trash2 size={13} />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Kart>

                <Kart className="p-4">
                  <h4 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
                    Yeni Kural Ekle
                  </h4>
                  <div className="flex flex-wrap items-end gap-2">
                    <Secim
                      label="Hedef"
                      value={kuralHedefTuru}
                      onChange={(e) => {
                        setKuralHedefTuru(e.target.value);
                        setKuralHedefDeger("");
                      }}
                    >
                      <option value="tumu">Tüm Ürünler</option>
                      <option value="urun">Belirli Ürün</option>
                      <option value="kategori">Kategori</option>
                      <option value="marka">Marka</option>
                    </Secim>
                    {kuralHedefTuru === "urun" && (
                      <div className="relative">
                        <Girdi
                          label="Ürün"
                          value={kuralHedefDeger ? db.parcalar.find((p) => p.id === kuralHedefDeger)?.ad || "" : kuralUrunArama}
                          onChange={(e) => {
                            setKuralHedefDeger("");
                            setKuralUrunArama(e.target.value);
                          }}
                          placeholder="Ürün ara…"
                        />
                        {!kuralHedefDeger && kuralUrunAramaSonuclari.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-44 overflow-y-auto" style={{ borderColor: T.steel300 }}>
                            {kuralUrunAramaSonuclari.map((p) => (
                              <button key={p.id} onMouseDown={() => setKuralHedefDeger(p.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: T.ink900 }}>
                                {p.ad}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {kuralHedefTuru === "kategori" && (
                      <Secim label="Kategori" value={kuralHedefDeger} onChange={(e) => setKuralHedefDeger(e.target.value)}>
                        <option value="">Seçin…</option>
                        {db.kategoriler.filter((k) => k.aktif !== false).map((k) => (
                          <option key={k.id} value={k.ad}>
                            {k.ustKategoriId ? `— ${k.ad}` : k.ad}
                          </option>
                        ))}
                      </Secim>
                    )}
                    {kuralHedefTuru === "marka" && (
                      <Secim label="Marka" value={kuralHedefDeger} onChange={(e) => setKuralHedefDeger(e.target.value)}>
                        <option value="">Seçin…</option>
                        {markalar.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </Secim>
                    )}
                    <Secim label="Tür" value={kuralIskontoTuru} onChange={(e) => setKuralIskontoTuru(e.target.value)}>
                      <option value="yuzde">%</option>
                      <option value="tutar">₺</option>
                    </Secim>
                    <Girdi label="Değer" type="number" value={kuralIskontoDeger} onChange={(e) => setKuralIskontoDeger(e.target.value)} />
                    <Buton onClick={kuralEkle}>
                      <Plus size={14} /> Ekle
                    </Buton>
                  </div>
                </Kart>
              </div>
            )}
          </div>
        </div>
      )}

      {altSekme === "ozelFiyat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <Kart className="p-4 flex flex-col gap-3">
              <h4 className="font-semibold text-sm" style={{ color: T.ink900 }}>
                Yeni Özel Fiyat
              </h4>
              <div className="relative">
                <Girdi
                  label="Müşteri"
                  value={ofSeciliMusteri ? ofSeciliMusteri.ad : ofMusteriArama}
                  onChange={(e) => {
                    setOfSeciliMusteri(null);
                    setOfMusteriArama(e.target.value);
                  }}
                  placeholder="Müşteri ara…"
                />
                {ofMusteriSonuclari.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-40 overflow-y-auto" style={{ borderColor: T.steel300 }}>
                    {ofMusteriSonuclari.map((c) => (
                      <button key={c.id} onMouseDown={() => setOfSeciliMusteri(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: T.ink900 }}>
                        {c.ad}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <Girdi
                  label="Ürün"
                  value={ofSeciliUrun ? ofSeciliUrun.ad : ofUrunArama}
                  onChange={(e) => {
                    setOfSeciliUrun(null);
                    setOfUrunArama(e.target.value);
                  }}
                  placeholder="Ürün ara…"
                />
                {ofUrunSonuclari.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-40 overflow-y-auto" style={{ borderColor: T.steel300 }}>
                    {ofUrunSonuclari.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => {
                          setOfSeciliUrun(p);
                          setOfFiyat(String(p.satisFiyati));
                        }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50"
                        style={{ color: T.ink900 }}
                      >
                        <span>{p.ad}</span>
                        <span style={MONO}>{tl(p.satisFiyati)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Girdi label="Özel Fiyat (KDV Dahil)" type="number" value={ofFiyat} onChange={(e) => setOfFiyat(e.target.value)} />
              <Buton onClick={ozelFiyatEkle}>
                <Check size={14} /> Kaydet
              </Buton>
            </Kart>
          </div>
          <div className="lg:col-span-2">
            <Kart className="overflow-hidden">
              <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${T.steel200}`, background: T.steel100 }}>
                <span className="text-xs font-semibold uppercase" style={{ color: T.ink500 }}>
                  Tanımlı Özel Fiyatlar
                </span>
              </div>
              {db.musteriOzelFiyatlar.length === 0 ? (
                <Bos ikon={Users} baslik="Özel fiyat yok" aciklama="Soldaki formdan bir müşteri-ürün özel fiyatı ekleyin." />
              ) : (
                db.musteriOzelFiyatlar.map((f) => {
                  const musteri = db.cariler.find((c) => c.id === f.musteriId);
                  const urun = db.parcalar.find((p) => p.id === f.parcaId);
                  return (
                    <div key={f.id} className="flex items-center justify-between px-4 py-2.5 text-sm" style={{ borderTop: `1px solid ${T.steel200}` }}>
                      <div>
                        <div style={{ color: T.ink900 }}>
                          {musteri?.ad || "—"} → {urun?.ad || "—"}
                        </div>
                        <div className="text-xs" style={{ color: T.ink500 }}>
                          {tarihGoster(f.tarih)} · {f.kullanici || "—"} · Normal: {tl(urun?.satisFiyati || 0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold" style={MONO}>
                          {tl(f.fiyat)}
                        </span>
                        <button onClick={() => ozelFiyatSil(f)} style={{ color: T.red }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </Kart>
          </div>
        </div>
      )}

      {altSekme === "kampanya" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Buton onClick={() => setKampanyaFormAcik(true)}>
              <Plus size={15} /> Yeni Kampanya
            </Buton>
          </div>
          {db.kampanyalar.length === 0 ? (
            <Kart>
              <Bos ikon={Percent} baslik="Kampanya yok" aciklama="Belirli tarih aralığında ürün/kategori/marka indirimi tanımlayın." />
            </Kart>
          ) : (
            db.kampanyalar.map((k) => {
              const durum = kampanyaDurumu(k);
              return (
                <Kart key={k.id} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: T.ink900 }}>
                          {k.ad}
                        </span>
                        <Rozet tone={durum.ton}>{durum.etiket}</Rozet>
                        {k.maliyetAltiOnaylandi && <Rozet tone="red">🔴 Maliyet Altı (Onaylı)</Rozet>}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: T.ink500 }}>
                        {tarihGoster(k.baslangicTarihi)} – {tarihGoster(k.bitisTarihi)} ·{" "}
                        {k.hedefTuru === "urun" ? db.parcalar.find((p) => p.id === k.hedefDeger)?.ad : k.hedefTuru === "urunGrubu" ? `${k.hedefUrunIdleri?.length || 0} ürün` : k.hedefTuru === "tumu" ? "Tüm Ürünler" : k.hedefDeger} ·{" "}
                        {k.iskontoTuru === "yuzde" ? `%${k.iskontoDeger}` : k.iskontoTuru === "sabitFiyat" ? `${tl(k.iskontoDeger)} sabit` : k.iskontoTuru === "kademeliYuzde" ? `${k.minimumAdet}+ adette %${k.iskontoDeger}` : k.iskontoTuru === "xAlYOde" ? `${k.minimumAdet} al ${k.iskontoDeger} öde` : tl(k.iskontoDeger)}
                        {k.hedefMusteriGrubuId && ` · ${db.musteriFiyatGruplari.find((g) => g.id === k.hedefMusteriGrubuId)?.ad || "Müşteri Grubu"}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setRaporGosterKampanyaId(raporGosterKampanyaId === k.id ? null : k.id)} className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: T.steel100, color: T.ink900 }}>
                        {raporGosterKampanyaId === k.id ? "Raporu Gizle" : "Satış Raporu"}
                      </button>
                      {k.aktif !== false && (
                        <button onClick={() => kampanyaPasifYap(k)} className="text-xs font-semibold" style={{ color: T.ink500 }}>
                          Pasif Yap
                        </button>
                      )}
                      <button onClick={() => kampanyaSil(k)} style={{ color: T.red }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {raporGosterKampanyaId === k.id &&
                    (() => {
                      const rapor = kampanyaSatisRaporu(db, k);
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${T.steel200}` }}>
                          {[
                            { etiket: "Kampanya Satış", deger: `${rapor.adet} adet` },
                            { etiket: "Ciro", deger: tl(rapor.ciro) },
                            { etiket: "Toplam İndirim", deger: tl(rapor.toplamIskonto), ton: "red" },
                            { etiket: "Brüt Kâr", deger: tl(rapor.brutKar), ton: "green" },
                          ].map((r) => (
                            <div key={r.etiket} className="rounded-md p-2.5" style={{ background: T.steel100 }}>
                              <div className="text-xs" style={{ color: T.ink500 }}>
                                {r.etiket}
                              </div>
                              <div className="text-sm font-semibold mt-0.5" style={{ ...MONO, color: r.ton === "red" ? T.red : r.ton === "green" ? T.green : T.ink900 }}>
                                {r.deger}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                </Kart>
              );
            })
          )}
        </div>
      )}

      {kampanyaFormAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setKampanyaFormAcik(false)}>
          <div className="w-full max-w-md rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: T.ink900 }}>
              Yeni Kampanya
            </h3>
            <div className="flex flex-col gap-3">
              <Girdi label="Kampanya Adı *" value={kampanyaForm.ad} onChange={(e) => setKampanyaForm({ ...kampanyaForm, ad: e.target.value })} placeholder="ör. Yağ Filtrelerinde %10 İndirim" />
              <div className="grid grid-cols-2 gap-3">
                <Girdi label="Başlangıç Tarihi" type="date" value={kampanyaForm.baslangicTarihi} onChange={(e) => setKampanyaForm({ ...kampanyaForm, baslangicTarihi: e.target.value })} />
                <Girdi label="Bitiş Tarihi" type="date" value={kampanyaForm.bitisTarihi} onChange={(e) => setKampanyaForm({ ...kampanyaForm, bitisTarihi: e.target.value })} />
              </div>
              <Secim
                label="Hedef"
                value={kampanyaForm.hedefTuru}
                onChange={(e) => setKampanyaForm({ ...kampanyaForm, hedefTuru: e.target.value, hedefDeger: "" })}
              >
                <option value="urun">Belirli Ürün</option>
                <option value="urunGrubu">Ürün Grubu (Çoklu Seçim)</option>
                <option value="kategori">Kategori</option>
                <option value="marka">Marka</option>
                <option value="tumu">Tüm Ürünler</option>
              </Secim>
              {kampanyaForm.hedefTuru === "urun" && (
                <div className="relative">
                  <Girdi
                    label="Ürün"
                    value={kampanyaForm.hedefDeger ? db.parcalar.find((p) => p.id === kampanyaForm.hedefDeger)?.ad || "" : kampanyaUrunArama}
                    onChange={(e) => {
                      setKampanyaForm({ ...kampanyaForm, hedefDeger: "" });
                      setKampanyaUrunArama(e.target.value);
                    }}
                    placeholder="Ürün ara…"
                  />
                  {!kampanyaForm.hedefDeger && kampanyaUrunSonuclari.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-40 overflow-y-auto" style={{ borderColor: T.steel300 }}>
                      {kampanyaUrunSonuclari.map((p) => (
                        <button key={p.id} onMouseDown={() => setKampanyaForm({ ...kampanyaForm, hedefDeger: p.id })} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: T.ink900 }}>
                          {p.ad}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {kampanyaForm.hedefTuru === "urunGrubu" && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Girdi label="Ürün Ekle" value={kampanyaUrunArama} onChange={(e) => setKampanyaUrunArama(e.target.value)} placeholder="Ürün ara…" />
                    {kampanyaUrunSonuclari.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-40 overflow-y-auto" style={{ borderColor: T.steel300 }}>
                        {kampanyaUrunSonuclari
                          .filter((p) => !kampanyaForm.hedefUrunIdleri.includes(p.id))
                          .map((p) => (
                            <button
                              key={p.id}
                              onMouseDown={() => {
                                setKampanyaForm({ ...kampanyaForm, hedefUrunIdleri: [...kampanyaForm.hedefUrunIdleri, p.id] });
                                setKampanyaUrunArama("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              style={{ color: T.ink900 }}
                            >
                              {p.ad}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  {kampanyaForm.hedefUrunIdleri.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {kampanyaForm.hedefUrunIdleri.map((id) => {
                        const p = db.parcalar.find((x) => x.id === id);
                        return (
                          <span key={id} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: T.steel100, color: T.ink900 }}>
                            {p?.ad || "—"}
                            <button onClick={() => setKampanyaForm({ ...kampanyaForm, hedefUrunIdleri: kampanyaForm.hedefUrunIdleri.filter((x) => x !== id) })} style={{ color: T.red }}>
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {kampanyaForm.hedefTuru === "kategori" && (
                <Secim label="Kategori" value={kampanyaForm.hedefDeger} onChange={(e) => setKampanyaForm({ ...kampanyaForm, hedefDeger: e.target.value })}>
                  <option value="">Seçin…</option>
                  {db.kategoriler.filter((k) => k.aktif !== false).map((k) => (
                    <option key={k.id} value={k.ad}>
                      {k.ustKategoriId ? `— ${k.ad}` : k.ad}
                    </option>
                  ))}
                </Secim>
              )}
              {kampanyaForm.hedefTuru === "marka" && (
                <Secim label="Marka" value={kampanyaForm.hedefDeger} onChange={(e) => setKampanyaForm({ ...kampanyaForm, hedefDeger: e.target.value })}>
                  <option value="">Seçin…</option>
                  {markalar.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Secim>
              )}
              <Secim label="Müşteri Grubu (opsiyonel)" value={kampanyaForm.hedefMusteriGrubuId} onChange={(e) => setKampanyaForm({ ...kampanyaForm, hedefMusteriGrubuId: e.target.value })}>
                <option value="">Tüm Müşteriler</option>
                {db.musteriFiyatGruplari.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.ad}
                  </option>
                ))}
              </Secim>
              <div className="grid grid-cols-2 gap-3">
                <Secim label="İndirim Türü" value={kampanyaForm.iskontoTuru} onChange={(e) => setKampanyaForm({ ...kampanyaForm, iskontoTuru: e.target.value })}>
                  <option value="yuzde">% İndirim</option>
                  <option value="tutar">₺ İndirim</option>
                  <option value="sabitFiyat">Sabit Kampanya Fiyatı</option>
                  <option value="kademeliYuzde">X Adet Al → % İndirim</option>
                  <option value="xAlYOde">X Adet Al → Y Adet Fiyatına</option>
                </Secim>
                <Girdi
                  label={kampanyaForm.iskontoTuru === "sabitFiyat" ? "Sabit Fiyat (₺)" : kampanyaForm.iskontoTuru === "xAlYOde" ? "Ödenecek Adet (Y)" : kampanyaForm.iskontoTuru === "tutar" ? "İndirim (₺)" : "İndirim (%)"}
                  type="number"
                  value={kampanyaForm.iskontoDeger}
                  onChange={(e) => setKampanyaForm({ ...kampanyaForm, iskontoDeger: e.target.value })}
                />
              </div>
              {(kampanyaForm.iskontoTuru === "kademeliYuzde" || kampanyaForm.iskontoTuru === "xAlYOde") && (
                <Girdi
                  label={kampanyaForm.iskontoTuru === "xAlYOde" ? "Alınacak Adet (X)" : "Minimum Adet (X)"}
                  type="number"
                  value={kampanyaForm.minimumAdet}
                  onChange={(e) => setKampanyaForm({ ...kampanyaForm, minimumAdet: e.target.value })}
                  placeholder="ör. 3"
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Girdi label="Minimum Adet (opsiyonel)" type="number" value={kampanyaForm.minimumAdet} onChange={(e) => setKampanyaForm({ ...kampanyaForm, minimumAdet: e.target.value })} />
                <Girdi label="Maksimum Adet (opsiyonel)" type="number" value={kampanyaForm.maksimumAdet} onChange={(e) => setKampanyaForm({ ...kampanyaForm, maksimumAdet: e.target.value })} />
              </div>

              {/* Kampanya önizleme (6. madde) — canlı hesaplanır */}
              {(() => {
                const onizleme = kampanyaOnizlemesiHesapla(db, { ...kampanyaForm, iskontoDeger: parseFloat(kampanyaForm.iskontoDeger) || 0, minimumAdet: parseFloat(kampanyaForm.minimumAdet) || null });
                if (onizleme.length === 0) return null;
                const zararli = onizleme.filter((x) => x.maliyetAlti);
                const stokRiskli = onizleme.filter((x) => x.stokYetersizOlabilir);
                return (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-semibold uppercase" style={{ color: T.ink500 }}>
                      Önizleme ({onizleme.length} ürün)
                    </div>
                    <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                      {onizleme.slice(0, 20).map((x) => (
                        <div key={x.parca.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded" style={{ background: x.maliyetAlti ? "#F9DEDE" : T.steel100 }}>
                          <span style={{ color: T.ink900 }}>{x.parca.ad}</span>
                          <span style={MONO}>
                            <s style={{ color: T.ink500 }}>{tl(x.eskiFiyat)}</s> → <strong>{tl(x.kampanyaliFiyat)}</strong> (Kâr: {tl(x.kar)})
                          </span>
                        </div>
                      ))}
                    </div>
                    {zararli.length > 0 && (
                      <p className="text-xs font-semibold" style={{ color: T.red }}>
                        🔴 {zararli.length} üründe maliyet altı kampanya — kaydederken yönetici onayı istenecek.
                      </p>
                    )}
                    {stokRiskli.length > 0 && (
                      <p className="text-xs font-semibold" style={{ color: "#8A6110" }}>
                        ⚠️ {stokRiskli.length} üründe stok, son 30 günlük satış hızına göre yetersiz olabilir.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <Buton onClick={kampanyaKaydet}>
                  <Check size={14} /> Kampanyayı Oluştur
                </Buton>
                <Buton variant="ghost" onClick={() => setKampanyaFormAcik(false)}>
                  Vazgeç
                </Buton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
