/* Extracted from Finans.tsx — kept intentionally self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function GiderYonetimSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("giderler"); // giderler | tekrarlayan | rapor
  const [formAcik, setFormAcik] = R.useState(false);
  const [form, setForm] = R.useState(R.bosGiderKayitForm);
  const [yeniKategoriAdi, setYeniKategoriAdi] = R.useState("");
  const [kategoriEklemeAcik, setKategoriEklemeAcik] = R.useState(false);
  const [durumFiltre, setDurumFiltre] = R.useState("tumu");
  const [kullanici, setKullanici] = R.useIslemYapan(aktifKullanici);
  const belgeInputRef = R.useRef(null);

  const [odemeYapHedef, setOdemeYapHedef] = R.useState(null);
  const [odemeYapTutar, setOdemeYapTutar] = R.useState("");
  const [odemeYapHesapId, setOdemeYapHesapId] = R.useState("");

  const [iptalHedef, setIptalHedef] = R.useState(null);
  const [iptalNedeniMetin, setIptalNedeniMetin] = R.useState("");

  const kdvHaric = (parseFloat(form.tutar) || 0) / (1 + (parseFloat(form.kdvOrani) || 0) / 100);
  const kdvTutari = (parseFloat(form.tutar) || 0) - kdvHaric;

  const formuAc = () => {
    setForm({ ...R.bosGiderKayitForm, kategori: db.giderKategorileri[0]?.ad || "" });
    setFormAcik(true);
  };

  const belgeSec = (e) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (dosya.size > 4 * 1024 * 1024) {
      R.bildirimGoster("Belge 4MB'tan küçük olmalı.", "hata");
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => setForm((f) => ({ ...f, belgeDosyasi: ev.target.result }));
    okuyucu.readAsDataURL(dosya);
    e.target.value = "";
  };

  const kategoriEkle = () => {
    if (!yeniKategoriAdi.trim()) return;
    const kat = { id: R.yeniId("gk"), ad: yeniKategoriAdi.trim() };
    updateDb((prev) => ({ ...prev, giderKategorileri: [...prev.giderKategorileri, kat] }));
    setForm((f) => ({ ...f, kategori: kat.ad }));
    setYeniKategoriAdi("");
    setKategoriEklemeAcik(false);
  };

  const giderKaydet = () => {
    if (!R.yetkiVarMi(db, aktifKullanici, "kasaCikisiYapabilir")) {
      R.bildirimGoster("Gider kaydetme yetkiniz yok.", "hata");
      return;
    }
    const tutar = parseFloat(form.tutar);
    if (!tutar || tutar <= 0) {
      R.bildirimGoster("Geçerli bir tutar girin.", "hata");
      return;
    }
    if (!form.kategori) {
      R.bildirimGoster("Kategori seçin.", "hata");
      return;
    }
    if (R.gunKapaliMi(db, form.tarih)) {
      const onay = R.yoneticiOnayiAl(db, `${R.tarihGoster(form.tarih)} günü kapatılmış — yeni gider eklemek için yönetici onayı gerekiyor.`);
      if (!onay) {
        R.bildirimGoster("Gider eklenmedi — gün kapalı.", "hata");
        return;
      }
    }
    let odenenTutar = 0;
    if (form.odemeDurumu === "Ödendi") odenenTutar = tutar;
    else if (form.odemeDurumu === "Kısmi Ödendi") {
      odenenTutar = parseFloat(form.odenenTutar) || 0;
      if (odenenTutar <= 0 || odenenTutar >= tutar) {
        R.bildirimGoster("Kısmi ödenen tutar, toplam tutardan az ve sıfırdan fazla olmalı (tamamıysa 'Ödendi' seçin).", "hata");
        return;
      }
    }
    if ((form.odemeDurumu === "Ödendi" || form.odemeDurumu === "Kısmi Ödendi") && !form.hesapId && db.hesaplar.length > 0) {
      R.bildirimGoster("Ödemenin yapılacağı hesabı seçin.", "hata");
      return;
    }

    const giderId = R.yeniId("gd");
    const gider = {
      id: giderId,
      tarih: form.tarih,
      kategori: form.kategori,
      aciklama: form.aciklama.trim(),
      tutar,
      kdvOrani: parseFloat(form.kdvOrani) || 0,
      kdvTutari: Math.round(kdvTutari * 100) / 100,
      kdvHaricTutar: Math.round(kdvHaric * 100) / 100,
      odemeYontemi: form.odemeDurumu === "Bekliyor" || form.odemeDurumu === "İptal" ? "" : form.odemeYontemi,
      hesapId: form.hesapId || null,
      belgeNo: form.belgeNo.trim(),
      tedarikciFirma: form.tedarikciFirma.trim(),
      belgeDosyasi: form.belgeDosyasi,
      vadeTarihi: form.vadeTarihi,
      odemeDurumu: form.odemeDurumu,
      odenenTutar,
      kullanici: aktifKullanici?.adSoyad || kullanici.trim(),
      durum: form.odemeDurumu === "İptal" ? "İptal Edildi" : "Tamamlandı",
      tekrarlayanId: null,
    };

    updateDb((prev) => {
      // ÇOK ÖNEMLİ: Sadece fiilen ödeme yapıldıysa (Ödendi/Kısmi Ödendi) kasa
      // hareketi oluşur. "Bekliyor" durumundaki bir gider kasadan hiç para düşmez.
      let sonuc = prev;
      if (odenenTutar > 0 && gider.hesapId) {
        sonuc = R.hesapHareketiUygula(sonuc, {
          hesapId: gider.hesapId,
          tur: `Gider — ${gider.kategori}`,
          cikis: odenenTutar,
          belgeNo: gider.belgeNo,
          aciklama: gider.aciklama || gider.kategori,
          kullanici: gider.kullanici,
          kaynakId: giderId,
        });
      }
      return R.islemKaydet(
        { ...sonuc, giderler: [gider, ...sonuc.giderler] },
        {
          kullaniciAdi: gider.kullanici,
          islemTuru: "Gider kaydedildi",
          aciklama: `${gider.kategori} — ${gider.aciklama || "—"}`,
          eskiDeger: "—",
          yeniDeger: `${R.tl(tutar)} (${gider.odemeDurumu})`,
        }
      );
    });
    R.sonKullaniciAdiKaydet(kullanici);
    R.bildirimGoster("Gider kaydedildi.", "basari");
    setFormAcik(false);
  };

  const odemeYapAc = (gider) => {
    setOdemeYapHedef(gider);
    setOdemeYapTutar(String(Math.round((gider.tutar - gider.odenenTutar) * 100) / 100));
    setOdemeYapHesapId("");
  };

  const odemeYapOnayla = () => {
    const tutar = parseFloat(odemeYapTutar);
    const kalan = odemeYapHedef.tutar - odemeYapHedef.odenenTutar;
    if (!tutar || tutar <= 0 || tutar > kalan + 0.01) {
      R.bildirimGoster(`Geçerli bir tutar girin (en fazla ${R.tl(kalan)}).`, "hata");
      return;
    }
    if (!odemeYapHesapId) {
      R.bildirimGoster("Hesap seçin.", "hata");
      return;
    }
    const yeniOdenen = Math.round((odemeYapHedef.odenenTutar + tutar) * 100) / 100;
    const yeniDurum = yeniOdenen >= odemeYapHedef.tutar - 0.01 ? "Ödendi" : "Kısmi Ödendi";
    updateDb((prev) => {
      let sonuc = R.hesapHareketiUygula(prev, {
        hesapId: odemeYapHesapId,
        tur: `Gider Ödemesi — ${odemeYapHedef.kategori}`,
        cikis: tutar,
        belgeNo: odemeYapHedef.belgeNo,
        aciklama: odemeYapHedef.aciklama || odemeYapHedef.kategori,
        kullanici: aktifKullanici?.adSoyad || kullanici.trim(),
        kaynakId: odemeYapHedef.id,
      });
      return {
        ...sonuc,
        giderler: sonuc.giderler.map((g) => (g.id === odemeYapHedef.id ? { ...g, odenenTutar: yeniOdenen, odemeDurumu: yeniDurum, hesapId: odemeYapHesapId } : g)),
      };
    });
    R.bildirimGoster("Ödeme kaydedildi.", "basari");
    setOdemeYapHedef(null);
  };

  const iptalOnayla = () => {
    if (!iptalNedeniMetin.trim()) {
      R.bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    const g = iptalHedef;
    updateDb((prev) => {
      let sonuc = prev;
      // Daha önce kısmen/tamamen ödenmişse, ödenen kısım hesaba geri eklenir.
      if (g.odenenTutar > 0 && g.hesapId) {
        sonuc = R.hesapHareketiUygula(sonuc, {
          hesapId: g.hesapId,
          tur: "Gider İptali",
          giris: g.odenenTutar,
          aciklama: `İptal: ${g.kategori} (${iptalNedeniMetin.trim()})`,
          kullanici: aktifKullanici?.adSoyad || kullanici.trim(),
          kaynakId: g.id,
        });
      }
      return {
        ...sonuc,
        giderler: sonuc.giderler.map((x) =>
          x.id === g.id ? { ...x, odemeDurumu: "İptal", durum: "İptal Edildi", iptalNedeni: iptalNedeniMetin.trim(), iptalEden: aktifKullanici?.adSoyad || "", iptalTarihi: R.zamanDamgasi() } : x
        ),
      };
    });
    R.bildirimGoster("Gider iptal edildi.", "basari");
    setIptalHedef(null);
    setIptalNedeniMetin("");
  };

  const filtreliGiderler = db.giderler
    .filter((g) => durumFiltre === "tumu" || g.odemeDurumu === durumFiltre)
    .sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

  // --- Tekrarlayan giderler ----------------------------------------------------
  const bosTekrarForm = { kategori: "", aciklama: "", tutar: "", tedarikciFirma: "" };
  const [tekrarFormAcik, setTekrarFormAcik] = R.useState(false);
  const [tekrarForm, setTekrarForm] = R.useState(bosTekrarForm);
  const buAy = R.isoGun(new Date()).slice(0, 7);

  const tekrarKaydet = () => {
    if (!tekrarForm.kategori || !parseFloat(tekrarForm.tutar)) {
      R.bildirimGoster("Kategori ve tutar zorunludur.", "hata");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      tekrarlayanGiderler: [
        ...prev.tekrarlayanGiderler,
        { id: R.yeniId("tg"), kategori: tekrarForm.kategori, aciklama: tekrarForm.aciklama.trim(), tutar: parseFloat(tekrarForm.tutar), tedarikciFirma: tekrarForm.tedarikciFirma.trim(), periyot: "Aylık", aktif: true, sonOlusturulanDonem: null },
      ],
    }));
    setTekrarFormAcik(false);
    setTekrarForm(bosTekrarForm);
    R.bildirimGoster("Tekrarlayan gider tanımlandı.", "basari");
  };

  const tekrarBuAyOlustur = (tg) => {
    const giderId = R.yeniId("gd");
    const gider = {
      id: giderId,
      tarih: R.isoGun(new Date()),
      kategori: tg.kategori,
      aciklama: tg.aciklama || `${tg.kategori} (tekrarlayan)`,
      tutar: tg.tutar,
      kdvOrani: 0,
      kdvTutari: 0,
      kdvHaricTutar: tg.tutar,
      odemeYontemi: "",
      hesapId: null,
      belgeNo: "",
      tedarikciFirma: tg.tedarikciFirma,
      belgeDosyasi: "",
      vadeTarihi: "",
      odemeDurumu: "Bekliyor",
      odenenTutar: 0,
      kullanici: aktifKullanici?.adSoyad || kullanici.trim(),
      durum: "Tamamlandı",
      tekrarlayanId: tg.id,
    };
    updateDb((prev) => ({
      ...prev,
      giderler: [gider, ...prev.giderler],
      tekrarlayanGiderler: prev.tekrarlayanGiderler.map((x) => (x.id === tg.id ? { ...x, sonOlusturulanDonem: buAy } : x)),
    }));
    R.bildirimGoster(`${tg.kategori} — bu ay için gider oluşturuldu (Bekliyor).`, "basari");
  };

  const tekrarPasifYap = (tg) => updateDb((prev) => ({ ...prev, tekrarlayanGiderler: prev.tekrarlayanGiderler.map((x) => (x.id === tg.id ? { ...x, aktif: false } : x)) }));
  const tekrarSil = (tg) => updateDb((prev) => ({ ...prev, tekrarlayanGiderler: prev.tekrarlayanGiderler.filter((x) => x.id !== tg.id) }));

  // --- Gider raporu ------------------------------------------------------------
  const bugunIso = R.isoGun(new Date());
  const ayBasiIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA");
  const [rpBaslangic, setRpBaslangic] = R.useState(ayBasiIso);
  const [rpBitis, setRpBitis] = R.useState(bugunIso);

  const raporGiderleri = db.giderler.filter((g) => g.odemeDurumu !== "İptal" && g.tarih >= rpBaslangic && g.tarih <= rpBitis);
  const toplamGider = raporGiderleri.reduce((t, g) => t + g.tutar, 0);
  const kategoriKirilimi = (() => {
    const harita = {};
    raporGiderleri.forEach((g) => (harita[g.kategori] = (harita[g.kategori] || 0) + g.tutar));
    return Object.entries(harita).sort((a, b) => b[1] - a[1]);
  })();

  const raporSatislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= rpBaslangic && s.tarih.slice(0, 10) <= rpBitis);
  const merkeziKarOzeti = R.donemKarOzetiHesapla(db, rpBaslangic, rpBitis);
  const raporCiro = merkeziKarOzeti.netCiroKdvDahil;
  const raporBrutKar = merkeziKarOzeti.brutKar;
  const netFaaliyetKari = merkeziKarOzeti.netFaaliyetKari;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "giderler", ad: "Giderler" },
          { id: "tekrarlayan", ad: "Tekrarlayan Giderler" },
          { id: "rapor", ad: "Gider Raporu" },
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

      {altSekme === "giderler" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
              {["tumu", ...R.GIDER_ODEME_DURUMLARI].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurumFiltre(d)}
                  className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                  style={{ background: durumFiltre === d ? R.T.graphite900 : "#fff", color: durumFiltre === d ? "#fff" : R.T.ink500 }}
                >
                  {d === "tumu" ? "Tümü" : `${R.giderDurumGorseli[d].emoji} ${d}`}
                </button>
              ))}
            </div>
            <R.Buton onClick={formuAc}>
              <R.Plus size={15} /> Yeni Gider
            </R.Buton>
          </div>

          {filtreliGiderler.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Wallet} baslik="Gider yok" aciklama="Yeni gider kaydı ekleyin." />
            </R.Kart>
          ) : (
            <div className="flex flex-col gap-2">
              {filtreliGiderler.map((g) => {
                const durum = R.giderDurumGorseli[g.odemeDurumu] || R.giderDurumGorseli.Bekliyor;
                const kalan = g.tutar - g.odenenTutar;
                return (
                  <R.Kart key={g.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                          {g.kategori}
                        </span>
                        <R.Rozet tone={durum.ton}>
                          {durum.emoji} {g.odemeDurumu}
                        </R.Rozet>
                        {g.belgeDosyasi && <R.FileDown size={13} style={{ color: R.T.ink500 }} />}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                        {R.tarihGoster(g.tarih)} · {g.aciklama || "—"}
                        {g.tedarikciFirma && ` · ${g.tedarikciFirma}`}
                        {g.belgeNo && ` · Belge: ${g.belgeNo}`}
                        {g.vadeTarihi && ` · Vade: ${R.tarihGoster(g.vadeTarihi)}`}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                        Kaydeden: {g.kullanici || "—"}
                        {g.odemeDurumu === "İptal" && g.iptalNedeni && ` · İptal nedeni: ${g.iptalNedeni}`}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-semibold" style={R.MONO}>
                        {R.tl(g.tutar)}
                      </span>
                      {(g.odemeDurumu === "Bekliyor" || g.odemeDurumu === "Kısmi Ödendi") && (
                        <span className="text-xs" style={{ color: "#8A6110" }}>
                          Kalan: {R.tl(kalan)}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        {(g.odemeDurumu === "Bekliyor" || g.odemeDurumu === "Kısmi Ödendi") && (
                          <button onClick={() => odemeYapAc(g)} className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: R.T.green, color: "#fff" }}>
                            Ödeme Yap
                          </button>
                        )}
                        {g.odemeDurumu !== "İptal" && (
                          <button onClick={() => setIptalHedef(g)} title="İptal Et" style={{ color: R.T.red }}>
                            <R.X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </R.Kart>
                );
              })}
            </div>
          )}
        </div>
      )}

      {altSekme === "tekrarlayan" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <R.Buton onClick={() => setTekrarFormAcik(true)}>
              <R.Plus size={15} /> Tekrarlayan Gider Tanımla
            </R.Buton>
          </div>
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Tarayıcı arka planda çalışmadığı için otomatik/sessiz oluşturma yapılamaz — uygulama açıkken "Bu Ay İçin Oluştur" ile o ayın gideri (Bekliyor durumunda) tek tıkla eklenir.
          </p>
          {db.tekrarlayanGiderler.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.ClipboardList} baslik="Tekrarlayan gider yok" aciklama="ör. Kira → Her ay → 25.000₺" />
            </R.Kart>
          ) : (
            db.tekrarlayanGiderler.map((tg) => (
              <R.Kart key={tg.id} className="p-4 flex items-center justify-between flex-wrap gap-2" style={{ opacity: tg.aktif === false ? 0.5 : 1 }}>
                <div>
                  <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                    {tg.kategori} — {tg.periyot} — {R.tl(tg.tutar)}
                  </div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    {tg.aciklama || "—"} · Son oluşturulan dönem: {tg.sonOlusturulanDonem || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tg.aktif !== false && tg.sonOlusturulanDonem !== buAy && (
                    <R.Buton onClick={() => tekrarBuAyOlustur(tg)}>
                      <R.Plus size={13} /> Bu Ay İçin Oluştur
                    </R.Buton>
                  )}
                  {tg.aktif !== false && (
                    <button onClick={() => tekrarPasifYap(tg)} className="text-xs font-semibold" style={{ color: R.T.ink500 }}>
                      Pasif Yap
                    </button>
                  )}
                  <button onClick={() => tekrarSil(tg)} style={{ color: R.T.red }}>
                    <R.Trash2 size={14} />
                  </button>
                </div>
              </R.Kart>
            ))
          )}
        </div>
      )}

      {altSekme === "rapor" && (
        <div className="flex flex-col gap-4">
          <R.Kart className="p-3.5 flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium" style={{ color: R.T.ink500 }}>
                Başlangıç
              </span>
              <input type="date" value={rpBaslangic} onChange={(e) => setRpBaslangic(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium" style={{ color: R.T.ink500 }}>
                Bitiş
              </span>
              <input type="date" value={rpBitis} onChange={(e) => setRpBitis(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
            </div>
          </R.Kart>

          <R.Kart className="p-4">
            <div className="text-xs" style={{ color: R.T.ink500 }}>
              Toplam Gider
            </div>
            <div className="text-2xl font-semibold mt-0.5" style={{ ...R.DISPLAY, color: R.T.red }}>
              {R.tl(toplamGider)}
            </div>
          </R.Kart>

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Kategorilere Göre
            </h4>
            {kategoriKirilimi.length === 0 ? (
              <p className="text-sm" style={{ color: R.T.ink500 }}>
                Bu aralıkta gider yok.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {kategoriKirilimi.map(([kategori, tutar]) => (
                  <div key={kategori} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ color: R.T.ink900 }}>{kategori}</span>
                    <span className="font-semibold" style={R.MONO}>
                      {R.tl(tutar)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </R.Kart>

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Ciro → Brüt Kâr → Gider → Net Kâr
            </h4>
            <div className="flex flex-col gap-2">
              {[
                { etiket: "Ciro", deger: raporCiro, ton: "graphite" },
                { etiket: "Brüt Kâr", deger: raporBrutKar, ton: raporBrutKar >= 0 ? "green" : "red" },
                { etiket: "Gider", deger: -toplamGider, ton: "red" },
              ].map((k) => (
                <div key={k.etiket} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>{k.etiket}</span>
                  <span className="font-semibold" style={{ ...R.MONO, color: k.ton === "green" ? R.T.green : k.ton === "red" ? R.T.red : R.T.ink900 }}>
                    {k.deger < 0 ? `−${R.tl(Math.abs(k.deger))}` : R.tl(k.deger)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                <span className="font-semibold" style={{ color: R.T.ink900 }}>
                  Tahmini Net Faaliyet Kârı
                </span>
                <span className="text-lg font-semibold" style={{ ...R.MONO, color: netFaaliyetKari >= 0 ? R.T.green : R.T.red }}>
                  {R.tl(netFaaliyetKari)}
                </span>
              </div>
            </div>
          </R.Kart>
        </div>
      )}

      {/* Yeni gider formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Yeni Gider
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <R.Girdi label="Gider Tarihi" type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
              <div>
                <R.Secim label="Kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                  {db.giderKategorileri.map((k) => (
                    <option key={k.id} value={k.ad}>
                      {k.ad}
                    </option>
                  ))}
                </R.Secim>
                <button onClick={() => setKategoriEklemeAcik((v) => !v)} className="text-xs font-semibold mt-1" style={{ color: R.T.orangeDark }}>
                  + Yeni Kategori
                </button>
                {kategoriEklemeAcik && (
                  <div className="flex gap-1 mt-1">
                    <input value={yeniKategoriAdi} onChange={(e) => setYeniKategoriAdi(e.target.value)} className="flex-1 px-2 py-1 rounded border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                    <button onClick={kategoriEkle} className="px-2 py-1 rounded text-xs font-semibold" style={{ background: R.T.orange, color: "#fff" }}>
                      Ekle
                    </button>
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <R.Girdi label="Açıklama" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} placeholder="ör. Ağustos ayı elektrik faturası" />
              </div>
              <R.Girdi label="Tutar (KDV Dahil)" type="number" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} placeholder="0.00" />
              <R.Secim label="KDV Oranı" value={form.kdvOrani} onChange={(e) => setForm({ ...form, kdvOrani: e.target.value })}>
                {R.KDV_ORANLARI.map((k) => (
                  <option key={k} value={k}>
                    %{k}
                  </option>
                ))}
              </R.Secim>
              {parseFloat(form.tutar) > 0 && (
                <div className="col-span-2 flex gap-4 text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  <span>KDV Hariç: {R.tl(kdvHaric)}</span>
                  <span>KDV Tutarı: {R.tl(kdvTutari)}</span>
                </div>
              )}
              <R.Secim label="Ödeme Durumu" value={form.odemeDurumu} onChange={(e) => setForm({ ...form, odemeDurumu: e.target.value })}>
                {R.GIDER_ODEME_DURUMLARI.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </R.Secim>
              {form.odemeDurumu === "Kısmi Ödendi" && (
                <R.Girdi label="Ödenen Tutar" type="number" value={form.odenenTutar} onChange={(e) => setForm({ ...form, odenenTutar: e.target.value })} />
              )}
              {(form.odemeDurumu === "Ödendi" || form.odemeDurumu === "Kısmi Ödendi") && (
                <>
                  <R.Secim label="Ödeme Yöntemi" value={form.odemeYontemi} onChange={(e) => setForm({ ...form, odemeYontemi: e.target.value })}>
                    {R.KASA_ODEME_YONTEMLERI.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </R.Secim>
                  <R.Secim label="Kasa / Banka" value={form.hesapId} onChange={(e) => setForm({ ...form, hesapId: e.target.value })}>
                    <option value="">Seçin…</option>
                    {db.hesaplar.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.ad}
                      </option>
                    ))}
                  </R.Secim>
                </>
              )}
              <R.Girdi label="Tedarikçi / Firma" value={form.tedarikciFirma} onChange={(e) => setForm({ ...form, tedarikciFirma: e.target.value })} />
              <R.Girdi label="Fatura / Belge No" value={form.belgeNo} onChange={(e) => setForm({ ...form, belgeNo: e.target.value })} />
              <R.Girdi label="Vade Tarihi" type="date" value={form.vadeTarihi} onChange={(e) => setForm({ ...form, vadeTarihi: e.target.value })} />
              <R.Girdi label="Kaydeden Kullanıcı" value={kullanici} readOnly />
              <div className="col-span-2">
                <span className="text-xs font-medium block mb-1" style={{ color: R.T.ink500 }}>
                  Belge Fotoğrafı / PDF (opsiyonel)
                </span>
                <button onClick={() => belgeInputRef.current?.click()} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ border: `1px solid ${R.T.steel300}`, color: R.T.ink900 }}>
                  {form.belgeDosyasi ? "Dosyayı Değiştir" : "Dosya Seç"}
                </button>
                <input ref={belgeInputRef} type="file" accept="image/*,.pdf" onChange={belgeSec} className="hidden" />
              </div>
            </div>
            <div className="flex gap-2 pt-4 mt-4" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <R.Buton onClick={giderKaydet}>
                <R.Check size={15} /> Kaydet
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setFormAcik(false)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Tekrarlayan gider tanımlama */}
      {tekrarFormAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setTekrarFormAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Tekrarlayan Gider Tanımla
            </h3>
            <div className="flex flex-col gap-3">
              <R.Secim label="Kategori" value={tekrarForm.kategori} onChange={(e) => setTekrarForm({ ...tekrarForm, kategori: e.target.value })}>
                <option value="">Seçin…</option>
                {db.giderKategorileri.map((k) => (
                  <option key={k.id} value={k.ad}>
                    {k.ad}
                  </option>
                ))}
              </R.Secim>
              <R.Girdi label="Açıklama" value={tekrarForm.aciklama} onChange={(e) => setTekrarForm({ ...tekrarForm, aciklama: e.target.value })} />
              <R.Girdi label="Tutar" type="number" value={tekrarForm.tutar} onChange={(e) => setTekrarForm({ ...tekrarForm, tutar: e.target.value })} />
              <R.Girdi label="Tedarikçi / Firma" value={tekrarForm.tedarikciFirma} onChange={(e) => setTekrarForm({ ...tekrarForm, tedarikciFirma: e.target.value })} />
              <p className="text-xs" style={{ color: R.T.ink500 }}>
                Periyot: Aylık
              </p>
              <R.Buton onClick={tekrarKaydet}>
                <R.Check size={14} /> Kaydet
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Ödeme yap modalı */}
      {odemeYapHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setOdemeYapHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Ödeme Yap — {odemeYapHedef.kategori}
            </h3>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Kalan borç: {R.tl(odemeYapHedef.tutar - odemeYapHedef.odenenTutar)}
            </p>
            <div className="flex flex-col gap-3">
              <R.Girdi label="Ödenen Tutar" type="number" value={odemeYapTutar} onChange={(e) => setOdemeYapTutar(e.target.value)} />
              <R.Secim label="Kasa / Banka" value={odemeYapHesapId} onChange={(e) => setOdemeYapHesapId(e.target.value)}>
                <option value="">Seçin…</option>
                {db.hesaplar.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.ad}
                  </option>
                ))}
              </R.Secim>
              <div className="flex gap-2">
                <R.Buton onClick={odemeYapOnayla}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setOdemeYapHedef(null)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* İptal modalı */}
      {iptalHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setIptalHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Gideri İptal Et
            </h3>
            <p className="text-sm mb-3" style={{ color: R.T.ink500 }}>
              {iptalHedef.kategori} — {R.tl(iptalHedef.tutar)}
              {iptalHedef.odenenTutar > 0 && ` (${R.tl(iptalHedef.odenenTutar)} ödenmişti, hesaba geri eklenecek)`}
            </p>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: R.T.ink500 }}>
                İptal Nedeni *
              </span>
              <textarea
                value={iptalNedeniMetin}
                onChange={(e) => setIptalNedeniMetin(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={iptalOnayla}>
                <R.RotateCcw size={14} /> İptal Et
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setIptalHedef(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
