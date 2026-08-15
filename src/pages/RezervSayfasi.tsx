import React, { useState } from "react";
import { Check, ClipboardList, Plus, ShoppingCart, X } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { bildirimGoster } from "../lib/bildirim";
import { yeniId, tl, tarihGoster, isoGun, zamanDamgasi } from "../lib/format";
import { islemKaydet, ODEME_YONTEMLERI } from "../lib/constants";
import { sonKullaniciAdiKaydet, useIslemYapan } from "../lib/kullanici-hooks";
import { stokHareketiUygula } from "../lib/database";
import { gecerliMaliyet } from "../lib/maliyet";
import { hizliAramaYap } from "../lib/arama";
import { yeniBelgeNumarasiUret, belgeSayaciGuncelle } from "../lib/belge";
import { cariHareketiUygula, hesapHareketiUygula } from "../lib/cari-kasa";
import { parcaRezerveAdedi, parcaSatilabilirStok, REZERV_DURUMLARI, rezervDurumGorseli } from "../lib/rezerv";
import { Kart, Buton, Girdi, Secim, Bos, Rozet } from "../components/ui";

const bosRezervForm = {
  musteriAdi: "",
  musteriTelefon: "",
  parcaId: "",
  adet: "1",
  rezervFiyati: "",
  rezervTarihi: isoGun(new Date()),
  sonGecerlilikTarihi: new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-CA"),
  not: "",
};

export function RezervSayfasi({ db, updateDb, aktifKullanici }) {
  const [formAcik, setFormAcik] = useState(false);
  const [form, setForm] = useState(bosRezervForm);
  const [parcaArama, setParcaArama] = useState("");
  const [parcaAramaAcik, setParcaAramaAcik] = useState(false);
  const [seciliParca, setSeciliParca] = useState(null);
  const [olusturan, setOlusturan] = useIslemYapan(aktifKullanici);
  const [durumFiltre, setDurumFiltre] = useState("Bekliyor");

  const [donusturRezerv, setDonusturRezerv] = useState(null);
  const [donusturFiyatTercihi, setDonusturFiyatTercihi] = useState(db.ayarlar.rezervSatisFiyatiTercihi || "rezerv");
  const [donusturOdemeYontemi, setDonusturOdemeYontemi] = useState("Nakit");
  const [donusturHesapId, setDonusturHesapId] = useState("");

  const [iptalRezerv, setIptalRezerv] = useState(null);
  const [iptalNedeni, setIptalNedeni] = useState("");

  const parcaAramaSonuclari = parcaArama.trim() ? hizliAramaYap(db, parcaArama).slice(0, 8) : [];

  const formuAc = () => {
    setForm(bosRezervForm);
    setSeciliParca(null);
    setParcaArama("");
    setFormAcik(true);
  };

  const parcaSec = (p) => {
    setSeciliParca(p);
    setForm((f) => ({ ...f, parcaId: p.id, rezervFiyati: String(p.satisFiyati) }));
    setParcaArama("");
    setParcaAramaAcik(false);
  };

  const kaydet = () => {
    if (!form.musteriAdi.trim()) {
      bildirimGoster("Müşteri adı zorunludur.", "hata");
      return;
    }
    if (!seciliParca) {
      bildirimGoster("Ürün seçin.", "hata");
      return;
    }
    const adet = parseFloat(form.adet);
    if (!adet || adet <= 0) {
      bildirimGoster("Geçerli bir adet girin.", "hata");
      return;
    }
    const satilabilir = parcaSatilabilirStok(db, seciliParca);
    if (adet > satilabilir) {
      bildirimGoster(`Bu üründe satılabilir stok yalnızca ${satilabilir} ${seciliParca.birim} — daha fazlası rezerve edilemez.`, "hata");
      return;
    }
    if (!form.sonGecerlilikTarihi) {
      bildirimGoster("Son geçerlilik tarihi zorunludur.", "hata");
      return;
    }
    const rezerv = {
      id: yeniId("rz"),
      musteriAdi: form.musteriAdi.trim(),
      musteriTelefon: form.musteriTelefon.trim(),
      parcaId: seciliParca.id,
      adet,
      rezervFiyati: parseFloat(form.rezervFiyati) || seciliParca.satisFiyati,
      rezervTarihi: form.rezervTarihi,
      sonGecerlilikTarihi: form.sonGecerlilikTarihi,
      not: form.not.trim(),
      olusturanKullanici: aktifKullanici?.adSoyad || olusturan.trim(),
      durum: "Bekliyor",
      donusturulenSatisId: null,
    };
    updateDb((prev) =>
      islemKaydet(
        { ...prev, rezervler: [rezerv, ...prev.rezervler] },
        {
          kullaniciAdi: aktifKullanici?.adSoyad || olusturan.trim(),
          islemTuru: "Rezerv oluşturuldu",
          aciklama: `${seciliParca.ad} — ${form.musteriAdi.trim()}`,
          eskiDeger: "—",
          yeniDeger: `${adet} ${seciliParca.birim} @ ${tl(rezerv.rezervFiyati)}`,
        }
      )
    );
    sonKullaniciAdiKaydet(olusturan);
    bildirimGoster("Rezerv oluşturuldu.", "basari");
    setFormAcik(false);
  };

  const iptalOnayla = () => {
    if (!iptalNedeni.trim()) {
      bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    updateDb((prev) =>
      islemKaydet(
        { ...prev, rezervler: prev.rezervler.map((r) => (r.id === iptalRezerv.id ? { ...r, durum: "İptal Edildi", iptalNedeni: iptalNedeni.trim() } : r)) },
        {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Rezerv iptal edildi",
          aciklama: `${iptalRezerv.musteriAdi} — ${iptalNedeni.trim()}`,
          eskiDeger: "Bekliyor",
          yeniDeger: "İptal Edildi",
        }
      )
    );
    bildirimGoster("Rezerv iptal edildi, stok tekrar satılabilir hale geldi.", "basari");
    setIptalRezerv(null);
    setIptalNedeni("");
  };

  // --- Rezervi Aç → Satışa Dönüştür -------------------------------------------
  const donusturuluyorParca = donusturRezerv ? db.parcalar.find((p) => p.id === donusturRezerv.parcaId) : null;
  const kullanilacakFiyat = donusturuluyorParca
    ? donusturFiyatTercihi === "rezerv"
      ? donusturRezerv.rezervFiyati
      : donusturuluyorParca.satisFiyati
    : 0;
  const donusturToplam = donusturRezerv ? kullanilacakFiyat * donusturRezerv.adet : 0;

  const donusturuAc = (rezerv) => {
    setDonusturRezerv(rezerv);
    setDonusturFiyatTercihi(db.ayarlar.rezervSatisFiyatiTercihi || "rezerv");
    setDonusturOdemeYontemi("Nakit");
    setDonusturHesapId("");
  };

  const satisaDonustur = () => {
    const parca = donusturuluyorParca;
    if (!parca) return;
    const kdvHaric = donusturToplam / (1 + (parca.kdvOrani || 0) / 100);
    const kdvToplam = donusturToplam - kdvHaric;
    const satisId = yeniId("s");
    const satis = {
      id: satisId,
      tarih: zamanDamgasi(),
      musteriAdi: donusturRezerv.musteriAdi,
      musteriId: null,
      satisiYapan: aktifKullanici?.adSoyad || olusturan.trim(),
      belgeTuru: "Satış Fişi",
      kalemler: [
        {
          parcaId: parca.id,
          stokKodu: parca.stokKodu,
          ad: parca.ad,
          marka: parca.marka,
          birim: parca.birim,
          adet: donusturRezerv.adet,
          birimFiyat: kullanilacakFiyat,
          iskontoTutari: 0,
          kdvOrani: parca.kdvOrani || 0,
          maliyet: gecerliMaliyet(parca, db),
          iadeEdilenAdet: 0,
        },
      ],
      genelIskontoTutari: 0,
      araToplam: donusturToplam,
      iskontoToplam: 0,
      kdvToplam: Math.round(kdvToplam * 100) / 100,
      genelToplam: Math.round(donusturToplam * 100) / 100,
      odemeler: [{ yontem: donusturOdemeYontemi, hesapId: donusturHesapId || null, tutar: Math.round(donusturToplam * 100) / 100 }],
      not: `Rezervden dönüştürüldü (${donusturFiyatTercihi === "rezerv" ? "rezerv fiyatı" : "güncel fiyat"} kullanıldı)`,
      durum: "Tamamlandı",
      acikHesapOdenen: 0,
      eFatura: { durum: "Gönderilmedi", eFaturaNo: null },
    };

    let engellendi = false;
    updateDb((prev) => {
      const { belgeNo: uretilenNo, anahtar, siraSonraki } = yeniBelgeNumarasiUret(prev, "Satış Fişi");
      const belgeNo = uretilenNo;
      satis.belgeNo = belgeNo;
      satis.not = `Rezervden dönüştürüldü (Rezerv #${belgeNo}, ${donusturFiyatTercihi === "rezerv" ? "rezerv fiyatı" : "güncel fiyat"} kullanıldı)`;
      let sonuc = belgeSayaciGuncelle(prev, anahtar, siraSonraki);
      sonuc = stokHareketiUygula(sonuc, {
        parcaId: parca.id,
        tur: "Perakende Satış",
        cikis: donusturRezerv.adet,
        belgeNo,
        kullanici: satis.satisiYapan,
        aciklama: `Rezervden satış — ${donusturRezerv.musteriAdi}`,
      });
      if (!sonuc) {
        engellendi = true;
        return prev;
      }
      if (donusturOdemeYontemi === "Açık Hesap") {
        sonuc = cariHareketiUygula(sonuc, {
          musteriId: null,
          musteriAdi: donusturRezerv.musteriAdi,
          tutar: satis.genelToplam,
          tur: "borç",
          aciklama: "Rezervden satış",
          belgeNo,
          kaynakSatisId: satisId,
        });
      } else if (donusturHesapId) {
        sonuc = hesapHareketiUygula(sonuc, {
          hesapId: donusturHesapId,
          tur: `Satış — ${donusturOdemeYontemi}`,
          giris: satis.genelToplam,
          belgeNo,
          aciklama: `Rezervden satış (${donusturRezerv.musteriAdi})`,
          kullanici: satis.satisiYapan,
          kaynakId: satisId,
        });
      }
      sonuc = {
        ...sonuc,
        satislar: [satis, ...sonuc.satislar],
        rezervler: sonuc.rezervler.map((r) => (r.id === donusturRezerv.id ? { ...r, durum: "Teslim Edildi", donusturulenSatisId: satisId } : r)),
      };
      return islemKaydet(sonuc, {
        kullaniciAdi: satis.satisiYapan,
        islemTuru: "Rezerv satışa dönüştürüldü",
        aciklama: `${parca.ad} — ${donusturRezerv.musteriAdi}`,
        eskiDeger: "Bekliyor",
        yeniDeger: `Satış #${belgeNo} — ${tl(satis.genelToplam)}`,
      });
    });
    if (engellendi) {
      bildirimGoster("Dönüştürme başarısız — stok işlenirken bir sorun oluştu.", "hata");
      return;
    }
    bildirimGoster("Rezerv satışa dönüştürüldü.", "basari");
    setDonusturRezerv(null);
  };

  const filtreliRezervler = db.rezervler
    .filter((r) => durumFiltre === "tumu" || r.durum === durumFiltre)
    .sort((a, b) => new Date(b.rezervTarihi) - new Date(a.rezervTarihi));

  const bekleyenSayisi = db.rezervler.filter((r) => r.durum === "Bekliyor").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: T.steel300 }}>
          {["Bekliyor", ...REZERV_DURUMLARI.filter((d) => d !== "Bekliyor"), "tumu"].map((d) => (
            <button
              key={d}
              onClick={() => setDurumFiltre(d)}
              className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              style={{ background: durumFiltre === d ? T.graphite900 : "#fff", color: durumFiltre === d ? "#fff" : T.ink500 }}
            >
              {d === "tumu" ? "Tümü" : `${rezervDurumGorseli[d].emoji} ${d}`}
            </button>
          ))}
        </div>
        <Buton onClick={formuAc}>
          <Plus size={15} /> Yeni Rezerv
        </Buton>
      </div>

      {bekleyenSayisi > 0 && (
        <p className="text-xs" style={{ color: T.ink500 }}>
          Şu an <strong>{bekleyenSayisi}</strong> ürün "Bekliyor" durumunda rezerve edilmiş.
        </p>
      )}

      {filtreliRezervler.length === 0 ? (
        <Kart>
          <Bos ikon={ClipboardList} baslik="Rezerv yok" aciklama="Yeni bir rezerv oluşturarak müşteri için ürün ayırın." />
        </Kart>
      ) : (
        <div className="flex flex-col gap-2">
          {filtreliRezervler.map((r) => {
            const parca = db.parcalar.find((p) => p.id === r.parcaId);
            const durum = rezervDurumGorseli[r.durum];
            const suresiGecmisMi = r.durum === "Bekliyor" && r.sonGecerlilikTarihi < isoGun(new Date());
            return (
              <Kart key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: T.ink900 }}>
                        {parca?.ad || "(Ürün silinmiş)"}
                      </span>
                      <Rozet tone={durum.ton}>
                        {durum.emoji} {r.durum}
                      </Rozet>
                    </div>
                    <div className="text-xs mt-0.5" style={{ ...MONO, color: T.ink500 }}>
                      {parca?.marka} · {parca?.stokKodu}
                      {parca && db.kodlar.some((k) => k.parcaId === parca.id && k.tip === "OEM") && (
                        <> · OEM: {db.kodlar.filter((k) => k.parcaId === parca.id && k.tip === "OEM").map((k) => k.kod).join(", ")}</>
                      )}
                    </div>
                    <div className="text-sm mt-1" style={{ color: T.ink900 }}>
                      {r.musteriAdi} {r.musteriTelefon && <span style={{ ...MONO, color: T.ink500 }}>· {r.musteriTelefon}</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: T.ink500 }}>
                      {r.adet} {parca?.birim} @ {tl(r.rezervFiyati)} · Rezerv: {tarihGoster(r.rezervTarihi)} · Son geçerlilik:{" "}
                      <span style={{ color: suresiGecmisMi ? T.red : T.ink500 }}>{tarihGoster(r.sonGecerlilikTarihi)}</span>
                    </div>
                    {r.not && (
                      <div className="text-xs mt-1 italic" style={{ color: T.ink500 }}>
                        "{r.not}"
                      </div>
                    )}
                    <div className="text-xs mt-1" style={{ color: T.ink500 }}>
                      Oluşturan: {r.olusturanKullanici || "—"}
                      {r.iptalNedeni && ` · İptal nedeni: ${r.iptalNedeni}`}
                    </div>
                  </div>
                  {r.durum === "Bekliyor" && parca && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Buton onClick={() => donusturuAc(r)}>
                        <ShoppingCart size={14} /> Satışa Dönüştür
                      </Buton>
                      <Buton variant="ghost" onClick={() => setIptalRezerv(r)}>
                        <X size={14} /> İptal Et
                      </Buton>
                    </div>
                  )}
                </div>
              </Kart>
            );
          })}
        </div>
      )}

      {/* Yeni Rezerv formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: T.ink900 }}>
                Yeni Rezerv
              </h3>
              <button onClick={() => setFormAcik(false)} style={{ color: T.ink500 }}>
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Girdi label="Müşteri Adı *" value={form.musteriAdi} onChange={(e) => setForm({ ...form, musteriAdi: e.target.value })} />
                <Girdi label="Telefon" value={form.musteriTelefon} onChange={(e) => setForm({ ...form, musteriTelefon: e.target.value })} />
              </div>
              <div className="relative">
                <Girdi
                  label="Ürün *"
                  value={seciliParca ? `${seciliParca.ad} (${seciliParca.stokKodu})` : parcaArama}
                  onChange={(e) => {
                    setSeciliParca(null);
                    setParcaArama(e.target.value);
                    setParcaAramaAcik(true);
                  }}
                  onFocus={() => setParcaAramaAcik(true)}
                  placeholder="Ürün ara…"
                />
                {parcaAramaAcik && !seciliParca && parcaAramaSonuclari.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-52 overflow-y-auto" style={{ borderColor: T.steel300 }}>
                    {parcaAramaSonuclari.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => parcaSec(p)}
                        className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50"
                        style={{ color: T.ink900 }}
                      >
                        <span>
                          {p.ad} <span style={{ ...MONO, color: T.ink500 }}>· {p.stokKodu}</span>
                        </span>
                        <span className="text-xs" style={{ color: T.ink500 }}>
                          Satılabilir: {parcaSatilabilirStok(db, p)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {seciliParca && (
                <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: T.steel100, color: T.ink500 }}>
                  Satılabilir stok: <strong>{parcaSatilabilirStok(db, seciliParca)}</strong> {seciliParca.birim}
                  {parcaRezerveAdedi(db, seciliParca.id) > 0 && ` (${parcaRezerveAdedi(db, seciliParca.id)} zaten rezerve)`}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Girdi label="Adet *" type="number" value={form.adet} onChange={(e) => setForm({ ...form, adet: e.target.value })} />
                <Girdi label="Satış Fiyatı" type="number" value={form.rezervFiyati} onChange={(e) => setForm({ ...form, rezervFiyati: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Girdi label="Rezerv Tarihi" type="date" value={form.rezervTarihi} onChange={(e) => setForm({ ...form, rezervTarihi: e.target.value })} />
                <Girdi label="Son Geçerlilik Tarihi *" type="date" value={form.sonGecerlilikTarihi} onChange={(e) => setForm({ ...form, sonGecerlilikTarihi: e.target.value })} />
              </div>
              <Girdi label="Oluşturan Kullanıcı" value={olusturan} readOnly />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: T.ink500 }}>
                  Not
                </span>
                <textarea
                  value={form.not}
                  onChange={(e) => setForm({ ...form, not: e.target.value })}
                  rows={2}
                  className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ borderColor: T.steel300, color: T.ink900 }}
                />
              </label>
              <Buton onClick={kaydet}>
                <Check size={15} /> Rezervi Oluştur
              </Buton>
            </div>
          </div>
        </div>
      )}

      {/* Satışa Dönüştür modalı */}
      {donusturRezerv && donusturuluyorParca && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDonusturRezerv(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: T.ink900 }}>
                Rezervi Satışa Dönüştür
              </h3>
              <button onClick={() => setDonusturRezerv(null)} style={{ color: T.ink500 }}>
                <X size={16} />
              </button>
            </div>
            <p className="text-sm mb-3" style={{ color: T.ink500 }}>
              {donusturuluyorParca.ad} — {donusturRezerv.adet} {donusturuluyorParca.birim} — {donusturRezerv.musteriAdi}
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-xs font-semibold uppercase" style={{ color: T.ink500 }}>
                  Fiyat
                </span>
                <div className="flex rounded-md overflow-hidden border mt-1" style={{ borderColor: T.steel300 }}>
                  <button
                    onClick={() => setDonusturFiyatTercihi("rezerv")}
                    className="flex-1 py-2 text-xs font-semibold"
                    style={{ background: donusturFiyatTercihi === "rezerv" ? T.graphite900 : "#fff", color: donusturFiyatTercihi === "rezerv" ? "#fff" : T.ink500 }}
                  >
                    Rezerv Fiyatı ({tl(donusturRezerv.rezervFiyati)})
                  </button>
                  <button
                    onClick={() => setDonusturFiyatTercihi("guncel")}
                    className="flex-1 py-2 text-xs font-semibold"
                    style={{ background: donusturFiyatTercihi === "guncel" ? T.graphite900 : "#fff", color: donusturFiyatTercihi === "guncel" ? "#fff" : T.ink500 }}
                  >
                    Güncel Fiyat ({tl(donusturuluyorParca.satisFiyati)})
                  </button>
                </div>
              </div>
              <Secim label="Ödeme Yöntemi" value={donusturOdemeYontemi} onChange={(e) => setDonusturOdemeYontemi(e.target.value)}>
                {ODEME_YONTEMLERI.filter((y) => db.ayarlar.odemeYontemleriDurumu?.[y] !== false).map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Secim>
              {donusturOdemeYontemi !== "Açık Hesap" && db.hesaplar.length > 0 && (
                <Secim label="Hangi Hesaba" value={donusturHesapId} onChange={(e) => setDonusturHesapId(e.target.value)}>
                  <option value="">Seçin… (opsiyonel)</option>
                  {db.hesaplar.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.ad}
                    </option>
                  ))}
                </Secim>
              )}
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${T.steel200}` }}>
                <span className="font-semibold" style={{ color: T.ink900 }}>
                  Toplam
                </span>
                <span className="text-lg font-semibold" style={MONO}>
                  {tl(donusturToplam)}
                </span>
              </div>
              <Buton onClick={satisaDonustur}>
                <Check size={15} /> Satışı Tamamla
              </Buton>
            </div>
          </div>
        </div>
      )}

      {/* İptal onayı */}
      {iptalRezerv && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setIptalRezerv(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
              Rezervi İptal Et
            </h3>
            <p className="text-sm mb-3" style={{ color: T.ink500 }}>
              {iptalRezerv.musteriAdi} için {iptalRezerv.adet} adetlik rezerv iptal edilecek, stok tekrar satılabilir hale gelecek.
            </p>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: T.ink500 }}>
                İptal Nedeni *
              </span>
              <textarea
                value={iptalNedeni}
                onChange={(e) => setIptalNedeni(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                style={{ borderColor: T.steel300, color: T.ink900 }}
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <Buton variant="danger" onClick={iptalOnayla}>
                <X size={14} /> İptal Et
              </Buton>
              <Buton variant="ghost" onClick={() => setIptalRezerv(null)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
