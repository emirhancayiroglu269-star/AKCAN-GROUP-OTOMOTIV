/* Extracted from Finans.tsx — kept intentionally self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function GunSonuSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("bugun");
  const bugunIso = R.isoGun(new Date());

  const [kasaSayimGirisleri, setKasaSayimGirisleri] = R.useState({});
  const [posGercekGirisleri, setPosGercekGirisleri] = R.useState({});
  const bugunTarihi = new Date();
  const ayBasi = new Date(bugunTarihi.getFullYear(), bugunTarihi.getMonth(), 1).toISOString().slice(0, 10);
  const donemKapanisKontrolu = R.donemKapanisKontrolu(db, ayBasi, bugunIso);
  const donemOzeti = donemKapanisKontrolu.ozet;
  const oncekiAyBaslangic = new Date(bugunTarihi.getFullYear(), bugunTarihi.getMonth() - 1, 1).toISOString().slice(0, 10);
  const oncekiAyBitis = new Date(bugunTarihi.getFullYear(), bugunTarihi.getMonth(), 0).toISOString().slice(0, 10);
  const donemKarsilastirma = R.donemKarsilastirmaRaporu(db, ayBasi, bugunIso, oncekiAyBaslangic, oncekiAyBitis);
  const [donemKapatOnay, setDonemKapatOnay] = R.useState(false);

  const [kapatOnayAcik, setKapatOnayAcik] = R.useState(false);
  const [kapatanKullanici, setKapatanKullanici] = R.useIslemYapan(aktifKullanici);

  const [detayGun, setDetayGun] = R.useState(null);

  const bugunKapaliMi = R.gunKapaliMi(db, bugunIso);
  const ozet = R.gunSonuOzetiHesapla(db, bugunIso);

  const nakitHesaplar = db.hesaplar.filter((h) => h.tip === "Nakit Kasa" && h.aktif !== false);
  const kasaSayimListesi = nakitHesaplar.map((h) => {
    const buGunHareketleri = h.hareketler.filter((hh) => hh.tarih.slice(0, 10) === bugunIso);
    const oncekiHareketler = h.hareketler.filter((hh) => hh.tarih.slice(0, 10) < bugunIso).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
    const acilis = oncekiHareketler.length > 0 ? oncekiHareketler[0].bakiyeSonrasi : 0;
    const girisToplam = buGunHareketleri.reduce((t, hh) => t + hh.giris, 0);
    const cikisToplam = buGunHareketleri.reduce((t, hh) => t + hh.cikis, 0);
    const beklenen = Math.round((acilis + girisToplam - cikisToplam) * 100) / 100;
    const sayilanMetin = kasaSayimGirisleri[h.id];
    const sayilan = sayilanMetin !== undefined && sayilanMetin !== "" ? parseFloat(sayilanMetin) : null;
    return { hesap: h, acilis, beklenen, sayilan, fark: sayilan !== null ? Math.round((sayilan - beklenen) * 100) / 100 : null };
  });

  const posListesi = db.posCihazlari
    .filter((p) => p.aktif !== false)
    .map((p) => {
      const buGunTahsilatlari = db.posTahsilatlari.filter((t) => t.posId === p.id && t.tarih.slice(0, 10) === bugunIso);
      const programToplami = buGunTahsilatlari.reduce((t, x) => t + x.satisTutari, 0);
      const gercekMetin = posGercekGirisleri[p.id];
      const gercek = gercekMetin !== undefined && gercekMetin !== "" ? parseFloat(gercekMetin) : null;
      return { pos: p, programToplami, gercek, fark: gercek !== null ? Math.round((gercek - programToplami) * 100) / 100 : null };
    })
    .filter((x) => x.programToplami > 0 || posGercekGirisleri[x.pos.id] !== undefined);

  const kapanisKontrolu = R.gunSonuKapanisKontrolu(
    db,
    bugunIso,
    kasaSayimListesi.map((k) => ({
      hesapId: k.hesap.id, hesapAdi: k.hesap.ad, acilis: k.acilis,
      beklenen: k.beklenen, sayilan: k.sayilan, fark: k.fark,
    })),
    posListesi.map((p) => ({
      posId: p.pos.id, posAdi: p.pos.ad, programToplami: p.programToplami,
      gercekToplam: p.gercek, fark: p.fark,
    }))
  );

  const kutu = (etiket, deger, ton) => (
    <div className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
      <div className="text-xs" style={{ color: R.T.ink500 }}>
        {etiket}
      </div>
      <div className="text-sm font-semibold mt-0.5" style={{ ...R.MONO, color: ton === "red" ? R.T.red : ton === "green" ? R.T.green : R.T.ink900 }}>
        {R.tl(deger)}
      </div>
    </div>
  );

  const donemiKapat = () => {
    if (!aktifKullanici?.adSoyad) {
      R.bildirimGoster("Aktif kullanıcı bulunamadı.", "hata");
      return;
    }
    const kontrol = R.donemKapanisKontrolu(db, ayBasi, bugunIso);
    if (!kontrol.temiz) {
      R.bildirimGoster(`Dönem kapatılamadı: ${kontrol.bulgular[0]?.mesaj || "Mutabakat bulgusu var."}`, "hata");
      return;
    }
    const kayit = R.donemKapanisKaydiOlustur(db, ayBasi, bugunIso, aktifKullanici.adSoyad);
    if (!kayit) {
      R.bildirimGoster("Dönem kapanışı oluşturulamadı.", "hata");
      return;
    }
    updateDb((prev) => R.islemKaydet(
      { ...prev, donemKapanislari: [kayit, ...(prev.donemKapanislari || [])] },
      {
        kullaniciAdi: kayit.kapatanKullanici,
        islemTuru: "Dönem sonu kapatıldı",
        aciklama: `${R.tarihGoster(ayBasi)} — ${R.tarihGoster(bugunIso)}`,
        eskiDeger: "Açık",
        yeniDeger: `Kapalı — Net faaliyet kârı: ${R.tl(kontrol.ozet.netFaaliyetKari)} — MUTABIK`,
      }
    ));
    R.bildirimGoster("Dönem başarıyla kapatıldı — MUTABIK.", "basari");
    setDonemKapatOnay(false);
  };

  const guneKapat = () => {
    if (!kapatanKullanici.trim()) {
      R.bildirimGoster("Kapatan kullanıcı adı girin.", "hata");
      return;
    }

    const kasaSayimlari = kasaSayimListesi.map((k) => ({
      hesapId: k.hesap.id, hesapAdi: k.hesap.ad, acilis: k.acilis,
      beklenen: k.beklenen, sayilan: k.sayilan, fark: k.fark,
    }));
    const posKontrolleri = posListesi.map((p) => ({
      posId: p.pos.id, posAdi: p.pos.ad, programToplami: p.programToplami,
      gercekToplam: p.gercek, fark: p.fark,
    }));

    const kontrol = R.gunSonuKapanisKontrolu(db, bugunIso, kasaSayimlari, posKontrolleri);
    if (!kontrol.temiz) {
      R.bildirimGoster(`Gün kapatılamadı: ${kontrol.bulgular[0]?.mesaj || "Kapanış kontrolünde bulgu var."}`, "hata");
      return;
    }

    const kayit = R.gunSonuKapanisKaydiOlustur(
      db, bugunIso, aktifKullanici?.adSoyad || kapatanKullanici.trim(),
      kasaSayimlari, posKontrolleri
    );
    if (!kayit) {
      R.bildirimGoster("Gün kapanışı oluşturulamadı.", "hata");
      return;
    }

    updateDb((prev) =>
      R.islemKaydet(
        { ...prev, gunSonlari: [kayit, ...prev.gunSonlari] },
        {
          kullaniciAdi: kayit.kapatanKullanici,
          islemTuru: "Gün sonu kapatıldı",
          aciklama: R.tarihGoster(bugunIso),
          eskiDeger: "Açık",
          yeniDeger: `Kapalı — Ciro: ${R.tl(kontrol.ozet.toplamSatis)} — MUTABIK`,
        }
      )
    );
    R.sonKullaniciAdiKaydet(kapatanKullanici);
    R.bildirimGoster("Gün başarıyla kapatıldı — kapanış mutabık.", "basari");
    setKapatOnayAcik(false);
  };

  const yazdir = (gun) => {
    const pencere = window.open("", "_blank");
    if (!pencere) return;
    const magaza = db.magazaBilgileri || {};
    const o = gun.ozet;
    pencere.document.write(`
      <html><head><title>Gün Sonu — ${R.tarihGoster(gun.tarih)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 4px; } h2 { font-size: 15px; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; } td:last-child { text-align: right; font-weight: 600; }
        .sub { color: #666; font-size: 12px; margin-bottom: 12px; }
      </style></head>
      <body>
        <h1>${magaza.ad || "Mağaza"}</h1>
        <div class="sub">${R.tarihGoster(gun.tarih)} Gün Sonu — Kapatan: ${gun.kapatanKullanici}</div>
        <h2>Ciro / Kâr</h2>
        <table>
          <tr><td>Toplam Satış</td><td>${R.tl(o.toplamSatis)}</td></tr>
          <tr><td>Satış Adedi</td><td>${o.satisAdedi}</td></tr>
          <tr><td>Brüt Ciro</td><td>${R.tl(o.brutCiro)}</td></tr>
          <tr><td>Toplam İskonto</td><td>${R.tl(o.toplamIskonto)}</td></tr>
          <tr><td>Toplam İade</td><td>${R.tl(o.toplamIade)}</td></tr>
          <tr><td>Brüt Kâr</td><td>${R.tl(o.brutKar)}</td></tr>
        </table>
        <h2>Ödeme Türleri</h2>
        <table>
          <tr><td>Nakit</td><td>${R.tl(o.nakitSatis)}</td></tr>
          <tr><td>Kredi Kartı</td><td>${R.tl(o.krediKarti)}</td></tr>
          <tr><td>Havale/EFT</td><td>${R.tl(o.havaleEft)}</td></tr>
          <tr><td>Cari (Açık Hesap)</td><td>${R.tl(o.cariSatis)}</td></tr>
          <tr><td>Müşteri Tahsilatı</td><td>${R.tl(o.musteriTahsilat)}</td></tr>
          <tr><td>Gider</td><td>${R.tl(o.gider)}</td></tr>
          <tr><td>Tedarikçi Ödemesi</td><td>${R.tl(o.tedarikciOdeme)}</td></tr>
        </table>
        <h2>Kasa Sayımı</h2>
        <table>${gun.kasaSayimlari.map((k) => `<tr><td>${k.hesapAdi} — Beklenen: ${R.tl(k.beklenen)}, Sayılan: ${R.tl(k.sayilan)}</td><td style="color:${Math.abs(k.fark) > 0.5 ? "#B3261E" : "#1B7A3D"}">${k.fark >= 0 ? "+" : ""}${R.tl(k.fark)}</td></tr>`).join("") || "<tr><td>Kasa sayımı yapılmadı</td><td>—</td></tr>"}</table>
        <h2>POS Kontrolü</h2>
        <table>${gun.posKontrolleri.map((p) => `<tr><td>${p.posAdi} — Program: ${R.tl(p.programToplami)}, Gerçek: ${R.tl(p.gercekToplam)}</td><td style="color:${Math.abs(p.fark) > 0.5 ? "#B3261E" : "#1B7A3D"}">${p.fark >= 0 ? "+" : ""}${R.tl(p.fark)}</td></tr>`).join("") || "<tr><td>POS kontrolü yok</td><td>—</td></tr>"}</table>
      </body></html>
    `);
    pencere.document.close();
    pencere.print();
  };

  // --- Vardiyalar --------------------------------------------------------------
  const [vardiyaKullanici, setVardiyaKullanici] = R.useIslemYapan(aktifKullanici);
  const [vardiyaKasaTutari, setVardiyaKasaTutari] = R.useState("");
  const [vardiyaHesapId, setVardiyaHesapId] = R.useState("");
  const acikVardiya = db.vardiyalar.find((v) => v.durum === "Açık" && v.kullaniciAdi === (aktifKullanici?.adSoyad || vardiyaKullanici.trim()));

  const vardiyaAc = () => {
    if (!vardiyaKullanici.trim()) {
      R.bildirimGoster("Personel adı girin.", "hata");
      return;
    }
    if (vardiyaHesapId && R.hesabinAktifVardiyasi(db, vardiyaHesapId)) {
      R.bildirimGoster("Bu kasada zaten açık bir vardiya var — önce devir yapın ya da kapatın.", "hata");
      return;
    }
    const hesap = db.hesaplar.find((h) => h.id === vardiyaHesapId);
    updateDb((prev) => ({
      ...prev,
      vardiyalar: [
        {
          id: R.yeniId("vr"),
          kullaniciId: aktifKullanici?.id || null,
          kullaniciAdi: aktifKullanici?.adSoyad || vardiyaKullanici.trim(),
          hesapId: vardiyaHesapId || null,
          hesapAdi: hesap?.ad || "",
          acilisZamani: R.zamanDamgasi(),
          kapanisZamani: null,
          acilisKasaTutari: parseFloat(vardiyaKasaTutari) || 0,
          kapanisKasaTutari: null,
          durum: "Açık",
          not: "",
          devredenVardiyaId: null,
        },
        ...prev.vardiyalar,
      ],
    }));
    R.sonKullaniciAdiKaydet(vardiyaKullanici);
    setVardiyaKasaTutari("");
    R.bildirimGoster("Vardiya açıldı.", "basari");
  };
  const vardiyaKapat = (vardiya, kapanisTutari) => {
    const beklenenNakit = R.vardiyaOzetiHesapla(db, vardiya).beklenenNakit;
    const sayilan = parseFloat(kapanisTutari) || 0;
    updateDb((prev) =>
      R.islemKaydet(
        {
          ...prev,
          vardiyalar: prev.vardiyalar.map((v) =>
            v.id === vardiya.id
              ? { ...v, durum: "Kapalı", kapanisZamani: R.zamanDamgasi(), kapanisKasaTutari: sayilan, beklenenKasaTutari: beklenenNakit, kasaFarki: Math.round((sayilan - beklenenNakit) * 100) / 100, kapananKullanici: aktifKullanici?.adSoyad || vardiyaKullanici.trim() }
              : v
          ),
        },
        {
          kullaniciAdi: aktifKullanici?.adSoyad || vardiyaKullanici.trim(),
          islemTuru: "Vardiya kapatıldı",
          aciklama: `${vardiya.kullaniciAdi} — ${vardiya.hesapAdi || "kasasız"}`,
          eskiDeger: `Beklenen: ${R.tl(beklenenNakit)}`,
          yeniDeger: `Sayılan: ${R.tl(sayilan)}`,
        }
      )
    );
    R.bildirimGoster("Vardiya kapatıldı.", "basari");
  };
  const [vardiyaKapatHedef, setVardiyaKapatHedef] = R.useState(null);
  const [vardiyaKapanisTutari, setVardiyaKapanisTutari] = R.useState("");

  // Vardiya devri — "Kasa 1 → Personel A → Personel B" (48. adım, 6. madde):
  // devreden vardiya Devredildi olarak kapanır (beklenen/gerçek/fark
  // kaydedilir), yeni personel için AYNI kasada yeni bir vardiya açılır.
  const [devirHedef, setDevirHedef] = R.useState(null);
  const [devirGercekKasa, setDevirGercekKasa] = R.useState("");
  const [devirYeniPersonel, setDevirYeniPersonel] = R.useState("");

  const devirYap = () => {
    if (!devirYeniPersonel.trim()) {
      R.bildirimGoster("Devir alan personelin adını girin.", "hata");
      return;
    }
    const ozet = R.vardiyaOzetiHesapla(db, devirHedef);
    const gercek = parseFloat(devirGercekKasa);
    if (isNaN(gercek)) {
      R.bildirimGoster("Gerçek kasa tutarını girin.", "hata");
      return;
    }
    const fark = Math.round((gercek - ozet.beklenenNakit) * 100) / 100;
    const yeniVardiyaId = R.yeniId("vr");
    updateDb((prev) => {
      const sonuc = {
        ...prev,
        vardiyalar: [
          {
            id: yeniVardiyaId,
            kullaniciId: null,
            kullaniciAdi: devirYeniPersonel.trim(),
            hesapId: devirHedef.hesapId,
            hesapAdi: devirHedef.hesapAdi,
            acilisZamani: R.zamanDamgasi(),
            kapanisZamani: null,
            acilisKasaTutari: gercek,
            kapanisKasaTutari: null,
            durum: "Açık",
            not: `${devirHedef.kullaniciAdi} → ${devirYeniPersonel.trim()} devri`,
            devredenVardiyaId: devirHedef.id,
          },
          ...prev.vardiyalar.map((v) =>
            v.id === devirHedef.id
              ? {
                  ...v,
                  durum: "Devredildi",
                  kapanisZamani: R.zamanDamgasi(),
                  kapanisKasaTutari: gercek,
                  beklenenKasaTutari: ozet.beklenenNakit,
                  kasaFarki: fark,
                  kapananKullanici: aktifKullanici?.adSoyad || "",
                  not: `Beklenen: ${R.tl(ozet.beklenenNakit)} · Fark: ${R.tl(fark)} — ${devirYeniPersonel.trim()}'e devredildi`,
                }
              : v
          ),
        ],
      };
      return R.islemKaydet(sonuc, {
        kullaniciAdi: devirHedef.kullaniciAdi,
        islemTuru: "Vardiya devredildi",
        aciklama: `${devirHedef.hesapAdi} — ${devirHedef.kullaniciAdi} → ${devirYeniPersonel.trim()}`,
        eskiDeger: `Beklenen: ${R.tl(ozet.beklenenNakit)}`,
        yeniDeger: `Gerçek: ${R.tl(gercek)} · Fark: ${R.tl(fark)}`,
      });
    });
    R.bildirimGoster(`Vardiya devredildi — fark: ${R.tl(fark)}.`, Math.abs(fark) < 0.5 ? "basari" : "hata");
    setDevirHedef(null);
    setDevirGercekKasa("");
    setDevirYeniPersonel("");
  };

  const gecmisGunler = [...db.gunSonlari].sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
  const acikVardiyalar = db.vardiyalar.filter((v) => v.durum === "Açık");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "bugun", ad: "Bugün — Gün Sonu" },
          { id: "gecmis", ad: "Kapalı Günler" },
          { id: "stoktarihce", ad: "Stok Değeri Geçmişi" },
          { id: "donem", ad: "Dönem Kapanışı" },
          { id: "vardiya", ad: "Vardiyalar" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold whitespace-nowrap"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "donem" && (
        <div className="flex flex-col gap-4">
          <R.Kart className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>Aylık Dönem Kapanışı</h4>
                <p className="text-xs mt-1" style={{ color: R.T.ink500 }}>{R.tarihGoster(ayBasi)} — {R.tarihGoster(bugunIso)}</p>
              </div>
              <div className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ background: donemKapanisKontrolu.temiz ? "#E4F3E9" : "#FDE8E7", color: donemKapanisKontrolu.temiz ? R.T.green : R.T.red }}>
                {donemKapanisKontrolu.temiz ? "🟢 KAPANIŞ MUTABIK" : `🔴 ${donemKapanisKontrolu.bulguSayisi} BULGU`}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {kutu("Net Ciro", donemOzeti.netCiroKdvDahil)}
              {kutu("KDV Hariç Ciro", donemOzeti.netCiroKdvHaric)}
              {kutu("SMM", donemOzeti.smm, "red")}
              {kutu("Brüt Kâr", donemOzeti.brutKar, "green")}
              {kutu("POS Komisyonu", donemOzeti.posKomisyonu, "red")}
              {kutu("Faaliyet Gideri", donemOzeti.faaliyetGideriKdvHaric, "red")}
              {kutu("Net Faaliyet Kârı", donemOzeti.netFaaliyetKari, "green")}
              {kutu("Toplam İade", donemOzeti.iadeCiroKdvDahil, "red")}
            </div>
          </R.Kart>

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>Önceki Dönem Karşılaştırması</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {kutu("Satış", donemKarsilastirma.donem1.ciro)}
              {kutu("Önceki Satış", donemKarsilastirma.donem2.ciro)}
              {kutu("Brüt Kâr", donemKarsilastirma.donem1.brutKar, "green")}
              {kutu("Önceki Brüt Kâr", donemKarsilastirma.donem2.brutKar)}
            </div>
          </R.Kart>

          {donemKapanisKontrolu.bulgular.length > 0 && (
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.red }}>Kapanış Bulguları</h4>
              {donemKapanisKontrolu.bulgular.slice(0, 8).map((b, i) => <div key={i} className="text-xs py-1" style={{ color: R.T.ink700 }}>• {b.mesaj}</div>)}
            </R.Kart>
          )}

          <R.Buton onClick={() => setDonemKapatOnay(true)} disabled={!donemKapanisKontrolu.temiz}>
            <R.Lock size={15} /> Dönemi Kapat
          </R.Buton>

          {donemKapatOnay && (
            <R.Kart className="p-4" style={{ border: `1px solid ${R.T.steel300}` }}>
              <div className="font-semibold text-sm mb-2">Dönem kapanışı onayı</div>
              <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>Bu işlem {R.tarihGoster(ayBasi)} — {R.tarihGoster(bugunIso)} dönemini MUTABIK olarak kapatacaktır.</p>
              <div className="flex gap-2">
                <R.Buton onClick={donemiKapat}><R.Lock size={14} /> Onayla</R.Buton>
                <R.Buton onClick={() => setDonemKapatOnay(false)} variant="ghost">Vazgeç</R.Buton>
              </div>
            </R.Kart>
          )}
        </div>
      )}

      {altSekme === "bugun" && (
        <div className="flex flex-col gap-4">
          {bugunKapaliMi ? (
            <div className="p-3 rounded-md text-sm font-semibold" style={{ background: "#E4F3E9", color: R.T.green }}>
              ✅ Bugünün günü zaten kapatıldı. Değişiklik yapmak için yönetici onayı gerekir.
            </div>
          ) : (
            <p className="text-xs" style={{ color: R.T.ink500 }}>
              {R.tarihGoster(bugunIso)} — henüz kapatılmadı. Aşağıdaki rakamlar anlık günceldir.
            </p>
          )}

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Gün Sonu Özeti
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {kutu("Toplam Satış", ozet.toplamSatis)}
              {kutu("Satış Adedi", ozet.satisAdedi)}
              {kutu("Brüt Ciro", ozet.brutCiro)}
              {kutu("Toplam İskonto", ozet.toplamIskonto)}
              {kutu("Toplam İade", ozet.toplamIade, ozet.toplamIade > 0 ? "red" : null)}
              {kutu("Brüt Kâr", ozet.brutKar, "green")}
              {kutu("Nakit Satış", ozet.nakitSatis)}
              {kutu("Kredi Kartı", ozet.krediKarti)}
              {kutu("Havale/EFT", ozet.havaleEft)}
              {kutu("Cari Satış", ozet.cariSatis)}
              {kutu("Müşteri Tahsilatı", ozet.musteriTahsilat, "green")}
              {kutu("Gider", ozet.gider, "red")}
              {kutu("Tedarikçi Ödemesi", ozet.tedarikciOdeme, "red")}
            </div>
          </R.Kart>

          {nakitHesaplar.length > 0 && (
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
                Kasa Sayımı
              </h4>
              <p className="text-xs mb-2" style={{ color: R.T.ink500 }}>
                Beklenen = Açılış + Girişler − Çıkışlar. Gerçek kasayı sayıp girin.
              </p>
              <div className="flex flex-col gap-2">
                {kasaSayimListesi.map((k) => (
                  <div key={k.hesap.id} className="flex items-center justify-between gap-2 p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: R.T.ink900 }}>
                        {k.hesap.ad}
                      </div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        Açılış: {R.tl(k.acilis)} · Beklenen: <strong>{R.tl(k.beklenen)}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        value={kasaSayimGirisleri[k.hesap.id] ?? ""}
                        onChange={(e) => setKasaSayimGirisleri({ ...kasaSayimGirisleri, [k.hesap.id]: e.target.value })}
                        placeholder="Gerçek kasa"
                        disabled={bugunKapaliMi}
                        className="w-28 px-2 py-1.5 rounded-md border text-sm text-right outline-none"
                        style={{ borderColor: R.T.steel300, ...R.MONO }}
                      />
                      {k.fark !== null && (
                        <span className="text-xs font-semibold" style={{ color: Math.abs(k.fark) < 0.5 ? R.T.green : R.T.red, minWidth: 70, textAlign: "right" }}>
                          {Math.abs(k.fark) < 0.5 ? "🟢 Fark yok" : `🔴 ${k.fark >= 0 ? "+" : ""}${R.tl(k.fark)}`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </R.Kart>
          )}

          {db.posCihazlari.filter((p) => p.aktif !== false).length > 0 && (
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
                POS Kontrolü
              </h4>
              <p className="text-xs mb-2" style={{ color: R.T.ink500 }}>
                Program üzerindeki POS satış tutarı ile fiziksel POS cihazı ekstresini karşılaştırın.
              </p>
              <div className="flex flex-col gap-2">
                {db.posCihazlari
                  .filter((p) => p.aktif !== false)
                  .map((p) => {
                    const satir = posListesi.find((x) => x.pos.id === p.id) || { pos: p, programToplami: 0, gercek: null, fark: null };
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                        <div>
                          <div className="text-sm font-medium" style={{ color: R.T.ink900 }}>
                            {p.ad}
                          </div>
                          <div className="text-xs" style={{ color: R.T.ink500 }}>
                            Program: <strong>{R.tl(satir.programToplami)}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            value={posGercekGirisleri[p.id] ?? ""}
                            onChange={(e) => setPosGercekGirisleri({ ...posGercekGirisleri, [p.id]: e.target.value })}
                            placeholder="POS cihazı"
                            disabled={bugunKapaliMi}
                            className="w-28 px-2 py-1.5 rounded-md border text-sm text-right outline-none"
                            style={{ borderColor: R.T.steel300, ...R.MONO }}
                          />
                          {satir.fark !== null && (
                            <span className="text-xs font-semibold" style={{ color: Math.abs(satir.fark) < 0.5 ? R.T.green : R.T.red, minWidth: 70, textAlign: "right" }}>
                              {Math.abs(satir.fark) < 0.5 ? "🟢 Fark yok" : `🔴 ${Math.abs(satir.fark)}₺ fark`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </R.Kart>
          )}

          {!bugunKapaliMi && (
            <R.Buton onClick={() => setKapatOnayAcik(true)}>
              <R.Lock size={15} /> Günü Kapat
            </R.Buton>
          )}
        </div>
      )}

      {altSekme === "gecmis" && (
        <div className="flex flex-col gap-2">
          {gecmisGunler.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Lock} baslik="Kapatılmış gün yok" aciklama="Bir gün kapatıldığında burada listelenir." />
            </R.Kart>
          ) : (
            gecmisGunler.map((g) => (
              <R.Kart key={g.id} className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                    {R.tarihGoster(g.tarih)}
                  </div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Ciro: {R.tl(g.ozet.toplamSatis)} · Kâr: {R.tl(g.ozet.brutKar)} · Kapatan: {g.kapatanKullanici}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDetayGun(g)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                    Detay
                  </button>
                  <button onClick={() => yazdir(g)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1" style={{ background: R.T.orange, color: "#fff" }}>
                    <R.Printer size={13} /> Yazdır
                  </button>
                </div>
              </R.Kart>
            ))
          )}
        </div>
      )}

      {altSekme === "stoktarihce" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Her gün kapatıldığında o günün stok sermayesi otomatik kaydedilir — zamanla stokun büyüyüp küçülmediğini buradan takip edebilirsiniz.
          </p>
          {(() => {
            const gecmisStok = [...db.gunSonlari].filter((g) => g.stokDegeriAnlikGoruntu).sort((a, b) => new Date(a.tarih) - new Date(b.tarih));
            if (gecmisStok.length === 0) {
              return (
                <R.Kart>
                  <R.Bos ikon={R.Package} baslik="Henüz stok değeri geçmişi yok" aciklama="Bir gün kapatıldığında stok sermayesi anlık görüntüsü burada birikmeye başlar." />
                </R.Kart>
              );
            }
            return (
              <R.Kart className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                        <th className="text-left font-semibold px-3 py-2">Tarih</th>
                        <th className="text-right font-semibold px-3 py-2">Stok Maliyeti</th>
                        <th className="text-right font-semibold px-3 py-2">Tahmini Satış Değeri</th>
                        <th className="text-right font-semibold px-3 py-2">Değişim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...gecmisStok].reverse().map((g) => {
                        const onceki = gecmisStok[gecmisStok.indexOf(g) - 1];
                        const degisim = onceki ? R.fiyatDegisimYuzdesi(onceki.stokDegeriAnlikGoruntu.toplamMaliyet, g.stokDegeriAnlikGoruntu.toplamMaliyet) : null;
                        return (
                          <tr key={g.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                            <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                              {R.tarihGoster(g.tarih)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold" style={R.MONO}>
                              {R.tl(g.stokDegeriAnlikGoruntu.toplamMaliyet)}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                              {R.tl(g.stokDegeriAnlikGoruntu.toplamSatisDegeri)}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ ...R.MONO, color: degisim === null ? R.T.ink500 : degisim >= 0 ? R.T.green : R.T.red }}>
                              {degisim === null ? "—" : `${degisim >= 0 ? "+" : ""}%${degisim}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </R.Kart>
            );
          })()}
        </div>
      )}

      {altSekme === "vardiya" && (
        <div className="flex flex-col gap-4">
          {/* Yönetici ekranı — Aktif Vardiyalar tek bakışta (48. adım, 7. madde) */}
          {acikVardiyalar.length > 0 && (
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                Aktif Vardiyalar — Hangi Personel Hangi Kasada
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-2 py-1.5">Personel</th>
                      <th className="text-left font-semibold px-2 py-1.5">Kasa</th>
                      <th className="text-right font-semibold px-2 py-1.5">Günlük Satış</th>
                      <th className="text-right font-semibold px-2 py-1.5">Beklenen Kasa</th>
                      <th className="px-2 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {acikVardiyalar.map((v) => {
                      const ozet = R.vardiyaOzetiHesapla(db, v);
                      return (
                        <tr key={v.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                          <td className="px-2 py-2" style={{ color: R.T.ink900 }}>
                            {v.kullaniciAdi}
                          </td>
                          <td className="px-2 py-2" style={{ color: R.T.ink900 }}>
                            {v.hesapAdi || "—"}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold" style={R.MONO}>
                            {R.tl(ozet.toplamSatis)}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold" style={R.MONO}>
                            {R.tl(ozet.beklenenNakit)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              {v.hesapId && (
                                <button onClick={() => setDevirHedef(v)} className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                                  Devret
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setVardiyaKapatHedef(v);
                                  setVardiyaKapanisTutari("");
                                }}
                                className="text-xs font-semibold px-2 py-1 rounded-md"
                                style={{ background: R.T.orange, color: "#fff" }}
                              >
                                Kapat
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </R.Kart>
          )}

          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Vardiya Aç
            </h4>
            <div className="flex flex-wrap items-end gap-2">
              <R.Girdi label="Personel" value={vardiyaKullanici} readOnly />
              <R.Secim label="Kasa" value={vardiyaHesapId} onChange={(e) => setVardiyaHesapId(e.target.value)}>
                <option value="">Kasa seçin… (opsiyonel)</option>
                {db.hesaplar
                  .filter((h) => h.aktif !== false)
                  .map((h) => (
                    <option key={h.id} value={h.id} disabled={!!R.hesabinAktifVardiyasi(db, h.id)}>
                      {h.ad} {R.hesabinAktifVardiyasi(db, h.id) ? `(${R.hesabinAktifVardiyasi(db, h.id).kullaniciAdi} kullanıyor)` : ""}
                    </option>
                  ))}
              </R.Secim>
              <R.Girdi label="Açılış Kasa Tutarı" type="number" value={vardiyaKasaTutari} onChange={(e) => setVardiyaKasaTutari(e.target.value)} />
              <R.Buton onClick={vardiyaAc}>
                <R.Plus size={14} /> Vardiya Aç
              </R.Buton>
            </div>
          </R.Kart>

          <div className="flex flex-col gap-2">
            {db.vardiyalar.length === 0 ? (
              <R.Kart>
                <R.Bos ikon={R.Users} baslik="Vardiya yok" aciklama="Personel bazlı kasa takibi için vardiya açın." />
              </R.Kart>
            ) : (
              [...db.vardiyalar]
                .sort((a, b) => new Date(b.acilisZamani) - new Date(a.acilisZamani))
                .slice(0, 30)
                .map((v) => (
                  <R.Kart key={v.id} className="p-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                        {v.kullaniciAdi} {v.hesapAdi && <span style={{ color: R.T.ink500, fontWeight: 400 }}>· {v.hesapAdi}</span>}
                        <R.Rozet tone={v.durum === "Açık" ? "green" : v.durum === "Devredildi" ? "yellow" : "steel"}>
                          {v.durum === "Açık" ? "🟢 Açık" : v.durum === "Devredildi" ? "🔄 Devredildi" : "⚫ Kapalı"}
                        </R.Rozet>
                      </div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        Açılış: {new Date(v.acilisZamani).toLocaleString("tr-TR")} — {R.tl(v.acilisKasaTutari)}
                        {v.durum !== "Açık" && ` · Kapanış: ${new Date(v.kapanisZamani).toLocaleString("tr-TR")} — ${R.tl(v.kapanisKasaTutari)}`}
                      </div>
                      {v.not && (
                        <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                          {v.not}
                        </div>
                      )}
                    </div>
                    {v.durum === "Açık" && !v.hesapId && (
                      <R.Buton
                        onClick={() => {
                          setVardiyaKapatHedef(v);
                          setVardiyaKapanisTutari("");
                        }}
                      >
                        Vardiyayı Kapat
                      </R.Buton>
                    )}
                  </R.Kart>
                ))
            )}
          </div>
        </div>
      )}

      {!bugunKapaliMi && (
        <R.Kart className="p-4 mb-3" style={{ border: `1px solid ${kapanisKontrolu.temiz ? R.T.green : R.T.red}` }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {kapanisKontrolu.temiz ? "🟢 Gün kapanışı MUTABIK" : `🔴 Kapanışta ${kapanisKontrolu.bulguSayisi} bulgu var`}
              </div>
              <div className="text-xs mt-1" style={{ color: R.T.ink500 }}>
                Kasa/POS sayımı ve sistem bütünlüğü kapanıştan önce kontrol edilir.
              </div>
            </div>
            {!kapanisKontrolu.temiz && kapanisKontrolu.bulgular.slice(0, 2).map((b, i) => (
              <div key={i} className="text-xs" style={{ color: R.T.red }}>• {b.mesaj}</div>
            ))}
          </div>
        </R.Kart>
      )}

      {/* Günü Kapat onayı */}
      {kapatOnayAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setKapatOnayAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Günü Kapat — {R.tarihGoster(bugunIso)}
            </h3>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Bu işlem gün sonu rakamlarını, kasa sayımını ve POS farkını kalıcı olarak kaydeder. Kapatıldıktan sonra
              bugüne ait satış/gider işlemleri için yönetici onayı gerekecektir.
            </p>
            <R.Girdi label="Kapatan Kullanıcı" value={kapatanKullanici} readOnly />
            <div className="flex gap-2 mt-3">
              <R.Buton onClick={guneKapat}>
                <R.Lock size={14} /> Günü Kapat
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setKapatOnayAcik(false)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Vardiya kapatma */}
      {vardiyaKapatHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setVardiyaKapatHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Vardiyayı Kapat — {vardiyaKapatHedef.kullaniciAdi}
            </h3>
            {(() => {
              const ozet = R.vardiyaOzetiHesapla(db, vardiyaKapatHedef);
              const sayilan = parseFloat(vardiyaKapanisTutari);
              const fark = !isNaN(sayilan) ? Math.round((sayilan - ozet.beklenenNakit) * 100) / 100 : null;
              return (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="rounded-md p-2" style={{ background: R.T.steel100 }}>
                      Satış: <strong style={R.MONO}>{R.tl(ozet.toplamSatis)}</strong> ({ozet.satisAdedi} adet)
                    </div>
                    <div className="rounded-md p-2" style={{ background: R.T.steel100 }}>
                      Beklenen Nakit: <strong style={R.MONO}>{R.tl(ozet.beklenenNakit)}</strong>
                    </div>
                  </div>
                  <R.Girdi label="Sayılan (Gerçek) Nakit" type="number" value={vardiyaKapanisTutari} onChange={(e) => setVardiyaKapanisTutari(e.target.value)} />
                  {fark !== null && (
                    <p className="text-xs mt-1.5 font-semibold" style={{ color: Math.abs(fark) < 0.5 ? R.T.green : R.T.red }}>
                      {Math.abs(fark) < 0.5 ? "🟢 Fark yok" : `🔴 Fark: ${fark >= 0 ? "+" : ""}${R.tl(fark)}`}
                    </p>
                  )}
                </>
              );
            })()}
            <div className="flex gap-2 mt-3">
              <R.Buton
                onClick={() => {
                  vardiyaKapat(vardiyaKapatHedef, vardiyaKapanisTutari);
                  setVardiyaKapatHedef(null);
                }}
              >
                <R.Check size={14} /> Kapat
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setVardiyaKapatHedef(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Vardiya devri */}
      {devirHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDevirHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Vardiya Devri — {devirHedef.hesapAdi}
            </h3>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              {devirHedef.kullaniciAdi} → Yeni Personel
            </p>
            {(() => {
              const ozet = R.vardiyaOzetiHesapla(db, devirHedef);
              const gercek = parseFloat(devirGercekKasa);
              const fark = !isNaN(gercek) ? Math.round((gercek - ozet.beklenenNakit) * 100) / 100 : null;
              return (
                <div className="flex flex-col gap-3">
                  <p className="text-xs px-2.5 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    Beklenen Kasa: <strong style={{ color: R.T.ink900 }}>{R.tl(ozet.beklenenNakit)}</strong>
                  </p>
                  <R.Girdi label="Devir Alan Personel" value={devirYeniPersonel} onChange={(e) => setDevirYeniPersonel(e.target.value)} />
                  <R.Girdi label="Gerçek (Sayılan) Kasa" type="number" value={devirGercekKasa} onChange={(e) => setDevirGercekKasa(e.target.value)} />
                  {fark !== null && (
                    <p className="text-xs font-semibold" style={{ color: Math.abs(fark) < 0.5 ? R.T.green : R.T.red }}>
                      {Math.abs(fark) < 0.5 ? "🟢 Fark yok" : `🔴 Fark: ${fark >= 0 ? "+" : ""}${R.tl(fark)}`}
                    </p>
                  )}
                </div>
              );
            })()}
            <div className="flex gap-2 mt-3">
              <R.Buton onClick={devirYap}>
                <R.Check size={14} /> Devri Onayla
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setDevirHedef(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Kapalı gün detayı */}
      {detayGun && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setDetayGun(null)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {R.tarihGoster(detayGun.tarih)} Gün Sonu
              </h3>
              <button onClick={() => setDetayGun(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="mb-3 px-3 py-2 rounded-md text-xs font-semibold" style={{ background: R.T.steel100, color: detayGun.kapanisDurumu === "MUTABIK" ? R.T.green : R.T.red }}>
              {detayGun.kapanisDurumu === "MUTABIK" ? "🟢 KAPANIŞ MUTABIK" : "🔴 KAPANIŞTA BULGU VAR"}
              {detayGun.kapanisZamani ? ` · ${new Date(detayGun.kapanisZamani).toLocaleString("tr-TR")}` : ""}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {kutu("Toplam Satış", detayGun.ozet.toplamSatis)}
              {kutu("Satış Adedi", detayGun.ozet.satisAdedi)}
              {kutu("Brüt Kâr", detayGun.ozet.brutKar, "green")}
              {kutu("Toplam İade", detayGun.ozet.toplamIade, detayGun.ozet.toplamIade > 0 ? "red" : null)}
              {kutu("Nakit", detayGun.ozet.nakitSatis)}
              {kutu("Kredi Kartı", detayGun.ozet.krediKarti)}
              {kutu("Gider", detayGun.ozet.gider, "red")}
              {kutu("Tedarikçi Ödemesi", detayGun.ozet.tedarikciOdeme, "red")}
            </div>
            {detayGun.kasaSayimlari.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold uppercase mb-1.5" style={{ color: R.T.ink500 }}>
                  Kasa Sayımı
                </h4>
                {detayGun.kasaSayimlari.map((k, i) => (
                  <div key={i} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md mb-1" style={{ background: R.T.steel100 }}>
                    <span style={{ color: R.T.ink900 }}>{k.hesapAdi}</span>
                    <span className="font-semibold" style={{ color: Math.abs(k.fark) < 0.5 ? R.T.green : R.T.red }}>
                      {Math.abs(k.fark) < 0.5 ? "🟢 Fark yok" : `🔴 ${k.fark >= 0 ? "+" : ""}${R.tl(k.fark)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <R.Buton onClick={() => yazdir(detayGun)}>
              <R.Printer size={14} /> Yazdır / PDF
            </R.Buton>
          </div>
        </div>
      )}
    </div>
  );
}
