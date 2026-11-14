/* Stok — ürün yönetimi sayfası (StokSayfasi).
   Bu dosya sayfanın state'ini ve çizimini tutar; iş kuralları ayrı dosyalarda:
     · ürün kaydetme/silme, fotoğraf-doküman, stok girişi/düzeltme/raf açma
       → useStokIslemleri.tsx
     · modalların kendi form state'i ve kaydetme kuralları
       → StokGirisiModal · StokDuzeltmeModal · RafTasimaModal · KodYonetimiModal …
     · ürün ızgarası → UrunListesi.tsx, ürün formu → UrunFormu.tsx,
       ürün detayı → UrunDetayPaneli.tsx
     · hızlı arama sayfası → HizliAramaSayfasi.tsx

   App.tsx tek yerden import etmeye devam eder: bölünen sayfalar aşağıda
   yeniden dışa aktarılıyor. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";
import { UrunListesi } from "./UrunListesi";
import { UrunFormu } from "./UrunFormu";
import { StokModallari } from "./StokModallari";
import { UrunDetayPaneli } from "./UrunDetayPaneli";
import { useStokIslemleri } from "./useStokIslemleri";
// Bölünen sayfalar — App.tsx tek yerden import etmeye devam eder.
export { SiparisOnerisiSayfasi } from "./SiparisOnerisiSayfasi";
export { SayimSayfasi } from "./SayimSayfasi";
export { TopluFiyatSayfasi } from "./TopluFiyatSayfasi";
export { BarkodBulunamadiModal } from "./BarkodBulunamadiModal";
export { HizliAramaSayfasi } from "./HizliAramaSayfasi";

export function StokSayfasi({ db, updateDb, aktifKullanici, yeniFormSinyali }) {
  const [ara, setAra] = R.useState("");
  const [durumFiltre, setDurumFiltre] = R.useState("aktif"); // aktif | pasif | tumu
  const [markaFiltre, setMarkaFiltre] = R.useState("");
  const [kategoriFiltre, setKategoriFiltre] = R.useState("");
  const [formAcik, setFormAcik] = R.useState(false);
  const [duzenlenenId, setDuzenlenenId] = R.useState(null);
  const [form, setForm] = R.useState(R.bosForm);
  const [girisModalId, setGirisModalId] = R.useState(null); // stok girişi yapılan parça id
  const [girisAdet, setGirisAdet] = R.useState("");
  const [girisPaketId, setGirisPaketId] = R.useState("");
  const [girisPaketAdedi, setGirisPaketAdedi] = R.useState("");
  const [girisFiyat, setGirisFiyat] = R.useState("");
  const [girisBelgeNo, setGirisBelgeNo] = R.useState("");
  const [girisKullanici, setGirisKullanici] = R.useIslemYapan(aktifKullanici);
  const [duzeltmeModalId, setDuzeltmeModalId] = R.useState(null); // Stok Düzeltme yapılan parça id
  const [duzeltmeYon, setDuzeltmeYon] = R.useState("giris"); // "giris" | "cikis"
  const [duzeltmeTur, setDuzeltmeTur] = R.useState(R.STOK_GIRIS_TURLERI[0]);
  const [duzeltmeAdet, setDuzeltmeAdet] = R.useState("");
  const [duzeltmeBelgeNo, setDuzeltmeBelgeNo] = R.useState("");
  const [duzeltmeKullanici, setDuzeltmeKullanici] = R.useIslemYapan(aktifKullanici);
  const [duzeltmeAciklama, setDuzeltmeAciklama] = R.useState("");
  const [hareketlerAcikId, setHareketlerAcikId] = R.useState(null);
  const [tedarikciKarsilastirmaAcikId, setTedarikciKarsilastirmaAcikId] = R.useState(null);
  const [ayarlarAcik, setAyarlarAcik] = R.useState(false);
  const [rafModalId, setRafModalId] = R.useState(null);
  const [rafTransferKaynak, setRafTransferKaynak] = R.useState("");
  const [rafTransferHedef, setRafTransferHedef] = R.useState("");
  const [rafTransferAdet, setRafTransferAdet] = R.useState("");
  const [rafTransferKullanici, setRafTransferKullanici] = R.useIslemYapan(aktifKullanici);
  const [gecmisAcikId, setGecmisAcikId] = R.useState(null);
  const [fiyatGecmisAcikId, setFiyatGecmisAcikId] = R.useState(null);
  const [silinecek, setSilinecek] = R.useState(null);
  const [kodModalId, setKodModalId] = R.useState(null); // OEM/Muadil kod yönetimi açık olan parça id
  const [uyariModal, setUyariModal] = R.useState(null); // { basliklar: [], mukerrerParca, benzerler: [] }
  const [barkodModalId, setBarkodModalId] = R.useState(null);
  const [aracModalId, setAracModalId] = R.useState(null);
  const [detayModalId, setDetayModalId] = R.useState(null);
  const [detaySekme, setDetaySekme] = R.useState("fotograf");
  const [gecmisAltGorunum, setGecmisAltGorunum] = R.useState("zaman");
  const [buyukFotoUrl, setBuyukFotoUrl] = R.useState(null);
  const [fotoYukleniyor, setFotoYukleniyor] = R.useState(false);
  const [yeniFotoTuru, setYeniFotoTuru] = R.useState("Ana Ürün");
  const [yeniDokumanTuru, setYeniDokumanTuru] = R.useState("Teknik Katalog");
  const [topluFotoAcik, setTopluFotoAcik] = R.useState(false);
  const [topluFotoSonuc, setTopluFotoSonuc] = R.useState(null);
  const fotoInputRef = R.useRef(null);
  const dokumanInputRef = R.useRef(null);
  const topluFotoInputRef = R.useRef(null);
  const [aracAramaMetni, setAracAramaMetni] = R.useState("");
  const [yeniUyumDurumu, setYeniUyumDurumu] = R.useState("Kesin Uyumlu");
  const [yeniBarkodDegeri, setYeniBarkodDegeri] = R.useState("");
  const [barkodHata, setBarkodHata] = R.useState("");
  const [yeniKodTipi, setYeniKodTipi] = R.useState("OEM");
  const [yeniKodDegeri, setYeniKodDegeri] = R.useState("");
  const [kodHata, setKodHata] = R.useState("");
  const [hedefTuru, setHedefTuru] = R.useState(db.hedefKarAyari?.tur || "markup");
  const [hedefDeger, setHedefDeger] = R.useState(String(db.hedefKarAyari?.deger ?? 30));
  const dosyaInputRef = R.useRef(null);

  // Hızlı İşlem Merkezi'nden (F5 → Yeni Ürün) gelen sinyal — her farklı sinyal
  // değerinde (App() bir sayaç artırarak tetikler) formu otomatik açar.
  R.useEffect(() => {
    if (yeniFormSinyali) formuAc(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yeniFormSinyali]);

  // Tüm iş kuralları (ürün kaydetme/silme, fotoğraf-doküman, stok girişi,
  // stok düzeltme, raf taşıma) useStokIslemleri'nde. Sayfa yalnızca state'i
  // ve çizimi tutar.
  const islemler = useStokIslemleri({
    db,
    updateDb,
    aktifKullanici,
    form,
    setForm,
    duzenlenenId,
    setDuzenlenenId,
    setFormAcik,
    uyariModal,
    setUyariModal,
    hedefTuru,
    hedefDeger,
    girisModalId,
    setGirisModalId,
    setGirisFiyat,
    duzeltmeModalId,
    setDuzeltmeModalId,
    setDuzeltmeYon,
    setDuzeltmeTur,
    setDuzeltmeAdet,
    setDuzeltmeBelgeNo,
    setDuzeltmeKullanici,
    setDuzeltmeAciklama,
    rafModalId,
    setRafModalId,
    setRafTransferKaynak,
    setRafTransferHedef,
    setRafTransferAdet,
    setRafTransferKullanici,
    setSilinecek,
    detayModalId,
    setFotoYukleniyor,
    yeniFotoTuru,
    yeniDokumanTuru,
    setTopluFotoSonuc,
  });
  const {
    formuAc,
    formuKapat,
    fotografSec,
    kaydet,
    sil,
    fotografEkle,
    fotografSil,
    fotografAnaYap,
    fotografSiraDegistir,
    dokumanEkle,
    dokumanSil,
    topluFotoYukle,
    aktifPasifDegistir,
    girisModaliAc,
    girisiKaydet,
    duzeltmeModaliAc,
    duzeltmeKaydet,
    rafModaliAc,
    rafTransferiKaydet,
  } = islemler;

  const kodModalParca = kodModalId ? db.parcalar.find((p) => p.id === kodModalId) : null;
  const barkodModalParca = barkodModalId ? db.parcalar.find((p) => p.id === barkodModalId) : null;
  const aracModalParca = aracModalId ? db.parcalar.find((p) => p.id === aracModalId) : null;
  const detayModalParca = detayModalId ? db.parcalar.find((p) => p.id === detayModalId) : null;
  const aracAramaSonuclari = aracAramaMetni.trim()
    ? db.araclar
        .filter((a) => a.aktif !== false)
        .filter((a) => R.aracEtiketi(a).toLowerCase().includes(aracAramaMetni.trim().toLowerCase()))
        .slice(0, 8)
    : [];
  const kodModalKodlari = kodModalId ? db.kodlar.filter((k) => k.parcaId === kodModalId) : [];

  const kodEkle = () => {
    const deger = yeniKodDegeri.trim();
    if (!deger) {
      setKodHata("Kod boş olamaz.");
      return;
    }
    const normalize = R.kodNormalize(deger);
    // Aynı OEM/Muadil kodun aynı ürüne yanlışlıkla iki kez eklenmesini engeller
    // (farklı ürünlere aynı kodun bağlanması normaldir — bu, çapraz referansın kendisidir).
    const zatenVar = kodModalKodlari.some((k) => R.kodNormalize(k.kod) === normalize);
    if (zatenVar) {
      setKodHata("Bu kod bu üründe zaten kayıtlı.");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      kodlar: [...prev.kodlar, { id: R.yeniId("k"), parcaId: kodModalId, tip: yeniKodTipi, kod: deger }],
    }));
    setYeniKodDegeri("");
    setKodHata("");
  };

  const kodSil = (kodId) => {
    updateDb((prev) => ({ ...prev, kodlar: prev.kodlar.filter((k) => k.id !== kodId) }));
  };

  // --- Barkod yönetimi ------------------------------------------------------
  // Bir ürünün barkod listesini güncellerken p.barkod (birincil/eski alan)
  // her zaman listenin ilk elemanıyla senkron tutulur.
  const barkodlariGuncelle = (parcaId, yeniListe) => {
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => (p.id === parcaId ? { ...p, barkodlar: yeniListe, barkod: yeniListe[0] || "" } : p)),
    }));
  };

  const barkodEkle = () => {
    const deger = yeniBarkodDegeri.trim();
    if (!deger) {
      setBarkodHata("Barkod boş olamaz.");
      return;
    }
    const parca = db.parcalar.find((p) => p.id === barkodModalId);
    const mevcutListe = R.parcaTumBarkodlari(parca);
    if (mevcutListe.some((b) => b.trim() === deger)) {
      setBarkodHata("Bu barkod bu üründe zaten kayıtlı.");
      return;
    }
    const baskaUrunde = R.barkodluParcaBul(db.parcalar, deger);
    if (baskaUrunde && baskaUrunde.id !== barkodModalId) {
      setBarkodHata(`Bu barkod zaten "${baskaUrunde.ad}" ürününde kayıtlı — bir barkod yalnızca bir ürüne bağlı olabilir.`);
      return;
    }
    barkodlariGuncelle(barkodModalId, [...mevcutListe, deger]);
    setYeniBarkodDegeri("");
    setBarkodHata("");
  };

  const barkodSil = (parcaId, barkod) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    barkodlariGuncelle(parcaId, R.parcaTumBarkodlari(parca).filter((b) => b !== barkod));
  };

  const barkodBirincilYap = (parcaId, barkod) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    const diger = R.parcaTumBarkodlari(parca).filter((b) => b !== barkod);
    barkodlariGuncelle(parcaId, [barkod, ...diger]);
  };

  const barkodOtomatikUret = () => {
    const parca = db.parcalar.find((p) => p.id === barkodModalId);
    const yeni = R.otomatikBarkodUret(db);
    barkodlariGuncelle(barkodModalId, [...R.parcaTumBarkodlari(parca), yeni]);
  };

  // --- Uyumlu araç yönetimi --------------------------------------------------
  const uyumlulukEkle = (aracId) => {
    if (db.uyumluluklar.some((u) => u.parcaId === aracModalId && u.aracId === aracId)) {
      R.bildirimGoster("⚠️ Bu araç uyumluluğu zaten mevcut.", "hata");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      uyumluluklar: [...prev.uyumluluklar, { id: R.yeniId("uy"), parcaId: aracModalId, aracId, durum: yeniUyumDurumu, not: "" }],
    }));
    setAracAramaMetni("");
  };
  const uyumlulukDurumGuncelle = (uyumlulukId, durum) => {
    updateDb((prev) => ({ ...prev, uyumluluklar: prev.uyumluluklar.map((u) => (u.id === uyumlulukId ? { ...u, durum } : u)) }));
  };
  const uyumlulukSil = (uyumlulukId) => {
    updateDb((prev) => ({ ...prev, uyumluluklar: prev.uyumluluklar.filter((u) => u.id !== uyumlulukId) }));
  };

  // --- Fotoğraf yönetimi ------------------------------------------------------
  const girisModalParca = girisModalId ? db.parcalar.find((p) => p.id === girisModalId) : null;
  const duzeltmeModalParca = duzeltmeModalId ? db.parcalar.find((p) => p.id === duzeltmeModalId) : null;
  const hareketlerParca = hareketlerAcikId ? db.parcalar.find((p) => p.id === hareketlerAcikId) : null;
  const gecmisParca = gecmisAcikId ? db.parcalar.find((p) => p.id === gecmisAcikId) : null;
  const tedarikciKarsilastirmaParca = tedarikciKarsilastirmaAcikId ? db.parcalar.find((p) => p.id === tedarikciKarsilastirmaAcikId) : null;
  const fiyatGecmisParca = fiyatGecmisAcikId ? db.parcalar.find((p) => p.id === fiyatGecmisAcikId) : null;
  const rafModalParca = rafModalId ? db.parcalar.find((p) => p.id === rafModalId) : null;

  const filtreli = db.parcalar
    .filter((p) => {
      if (durumFiltre === "aktif") return p.aktif !== false;
      if (durumFiltre === "pasif") return p.aktif === false;
      return true;
    })
    .filter((p) => (markaFiltre ? p.marka === markaFiltre : true))
    .filter((p) => (kategoriFiltre ? p.kategori === kategoriFiltre || p.anaKategori === kategoriFiltre : true))
    .filter((p) => {
      const q = ara.trim().toLowerCase();
      if (!q) return true;
      const qNorm = R.kodNormalize(ara);
      return (
        p.ad.toLowerCase().includes(q) ||
        (p.stokKodu || "").toLowerCase().includes(q) ||
        R.parcaTumBarkodlari(p).some((b) => b.toLowerCase().includes(q)) ||
        (p.ureticiKodu || "").toLowerCase().includes(q) ||
        (p.marka || "").toLowerCase().includes(q) ||
        (p.kategori || "").toLowerCase().includes(q) ||
        (qNorm.length > 0 && db.kodlar.some((k) => k.parcaId === p.id && R.kodNormalize(k.kod).includes(qNorm)))
      );
    });

  const kritikSayisi = db.parcalar.filter((p) => p.aktif !== false && p.stok <= p.kritikSeviye).length;

  // --- Form içindeki canlı fiyatlandırma/kâr hesapları --------------------
  // Düzenlenen ürün varsa gerçek (izlenen) ortalama maliyeti, yeni ürün
  // oluşturuluyorsa henüz kaydedilmemiş "Alış Fiyatı" girişini taban alır.
  const duzenlenenParca = duzenlenenId && duzenlenenId !== "yeni" ? db.parcalar.find((p) => p.id === duzenlenenId) : null;
  const formMaliyet = duzenlenenParca ? R.gecerliMaliyet(duzenlenenParca) : parseFloat(form.alisFiyati) || 0;
  const formKdvOrani = parseFloat(form.kdvOrani) || 0;
  const formSatisFiyati = parseFloat(form.satisFiyati) || 0;
  const formSatisFiyatiNet = formSatisFiyati / (1 + formKdvOrani / 100);
  const formKarTutari = formSatisFiyatiNet - formMaliyet;
  const formKarOraniMarkup = formMaliyet > 0 ? (formKarTutari / formMaliyet) * 100 : null;
  const formKarOraniMargin = formSatisFiyatiNet > 0 ? (formKarTutari / formSatisFiyatiNet) * 100 : null;
  const formTavsiyeFiyat = R.tavsiyeFiyatHesapla(formMaliyet, formKdvOrani, hedefTuru, hedefDeger);
  const formIskontoOrani = formTavsiyeFiyat > 0 ? ((formTavsiyeFiyat - formSatisFiyati) / formTavsiyeFiyat) * 100 : null;
  const sonFiyatTarihi = duzenlenenParca?.fiyatGecmisi?.[0]?.tarih;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <R.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
          <input
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Ürün adı, stok kodu, barkod, marka, OEM/muadil kod ara…"
            className="w-full pl-9 pr-3 py-2 rounded-md border text-sm outline-none"
            style={{ borderColor: R.T.steel300 }}
          />
        </div>
        <select
          value={markaFiltre}
          onChange={(e) => setMarkaFiltre(e.target.value)}
          className="px-2 py-2 rounded-md border text-sm outline-none bg-white"
          style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
        >
          <option value="">Tüm Markalar</option>
          {db.markalar
            .filter((m) => m.aktif !== false)
            .map((m) => (
              <option key={m.id} value={m.ad}>
                {m.ad}
              </option>
            ))}
        </select>
        <select
          value={kategoriFiltre}
          onChange={(e) => setKategoriFiltre(e.target.value)}
          className="px-2 py-2 rounded-md border text-sm outline-none bg-white"
          style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
        >
          <option value="">Tüm Kategoriler</option>
          {db.kategoriler
            .filter((k) => k.aktif !== false)
            .map((k) => (
              <option key={k.id} value={k.ad}>
                {k.ustKategoriId ? `— ${k.ad}` : k.ad}
              </option>
            ))}
        </select>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
            {[
              { id: "aktif", ad: "Aktif" },
              { id: "pasif", ad: "Pasif" },
              { id: "tumu", ad: "Tümü" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDurumFiltre(d.id)}
                className="px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: durumFiltre === d.id ? R.T.graphite900 : "#fff",
                  color: durumFiltre === d.id ? "#fff" : R.T.ink500,
                }}
              >
                {d.ad}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAyarlarAcik(true)}
            title="Stok Ayarları"
            className="flex items-center justify-center w-9 h-9 rounded-md shrink-0"
            style={{ border: `1px solid ${R.T.steel300}`, color: R.T.ink500 }}
          >
            <R.Settings size={15} />
          </button>
          <R.Buton
            variant="ghost"
            onClick={() => {
              setTopluFotoSonuc(null);
              setTopluFotoAcik(true);
            }}
          >
            <R.ImageIcon size={15} /> Toplu Fotoğraf Yükle
          </R.Buton>
          <R.Buton onClick={() => formuAc(null)}>
            <R.Plus size={15} /> Yeni Ürün Kartı
          </R.Buton>
        </div>
      </div>

      {topluFotoAcik && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setTopluFotoAcik(false)}
        >
          <div className="w-full max-w-lg rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Toplu Fotoğraf Yükle
              </h3>
              <button onClick={() => setTopluFotoAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Dosya adlarında geçen stok kodları otomatik okunur ve ilgili ürüne "Ana Ürün" fotoğrafı olarak eklenir. ör.{" "}
              <span style={R.MONO}>MANN-HU7197X.jpg</span> → stok kodu "HU7197X" (veya benzeri) içeren ürüne bağlanır.
            </p>
            <R.Buton onClick={() => topluFotoInputRef.current?.click()}>
              <R.ImageIcon size={15} /> Dosyaları Seç
            </R.Buton>
            <input ref={topluFotoInputRef} type="file" accept="image/*" multiple onChange={topluFotoYukle} className="hidden" />
            {topluFotoSonuc && (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: R.T.green }}>
                    Eşleşen ve eklenen ({topluFotoSonuc.eslesen.length})
                  </p>
                  {topluFotoSonuc.eslesen.map((x, i) => (
                    <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      {x.dosyaAdi} → {x.ad}
                    </div>
                  ))}
                </div>
                {topluFotoSonuc.eslesmeyen.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: R.T.red }}>
                      Eşleşmeyen ({topluFotoSonuc.eslesmeyen.length})
                    </p>
                    {topluFotoSonuc.eslesmeyen.map((ad, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: "#F9DEDE", color: R.T.red }}>
                        {ad}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {ayarlarAcik && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setAyarlarAcik(false)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Stok Ayarları
              </h3>
              <button onClick={() => setAyarlarAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={db.ayarlar.eksiStokIzni}
                onChange={(e) =>
                  updateDb((prev) => ({ ...prev, ayarlar: { ...prev.ayarlar, eksiStokIzni: e.target.checked } }))
                }
                className="mt-0.5"
              />
              <span>
                <span className="font-medium" style={{ color: R.T.ink900 }}>
                  Eksi Stok İzni
                </span>
                <p className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                  Kapalıyken (önerilen), mevcut stoktan fazla satış veya stok çıkışı engellenir. Açarsanız stok
                  eksiye düşebilir — sadece özel durumlarda önerilir.
                </p>
              </span>
            </label>
          </div>
        </div>
      )}

      {kritikSayisi > 0 && (
        <div
          className="px-4 py-2.5 rounded-md flex items-center gap-2 text-sm"
          style={{ background: "#F9DEDE", color: R.T.red }}
        >
          <R.AlertTriangle size={15} />
          {kritikSayisi} ürün minimum stok seviyesinin altında veya tükenmiş.
        </div>
      )}

      <UrunListesi
        db={db}
        aktifKullanici={aktifKullanici}
        filtreli={filtreli}
        onDuzenle={formuAc}
        onSil={setSilinecek}
        onAktifPasif={aktifPasifDegistir}
        onKod={setKodModalId}
        onBarkod={setBarkodModalId}
        onArac={setAracModalId}
        onDetay={setDetayModalId}
        onDetaySekme={setDetaySekme}
        onTedarikciKarsilastirma={setTedarikciKarsilastirmaAcikId}
        onAlisGecmisi={setGecmisAcikId}
        onFiyatGecmisi={setFiyatGecmisAcikId}
        onStokGirisi={girisModaliAc}
        onDuzeltme={duzeltmeModaliAc}
        onRaf={rafModaliAc}
        onHareketler={setHareketlerAcikId}
      />

      {formAcik && (
        <UrunFormu
          db={db}
          form={form}
          setForm={setForm}
          duzenlenenId={duzenlenenId}
          duzenlenenParca={duzenlenenParca}
          formuKapat={formuKapat}
          kaydet={kaydet}
          dosyaInputRef={dosyaInputRef}
          fotografSec={fotografSec}
          hedefTuru={hedefTuru}
          setHedefTuru={setHedefTuru}
          hedefDeger={hedefDeger}
          setHedefDeger={setHedefDeger}
          formMaliyet={formMaliyet}
          formKdvOrani={formKdvOrani}
          formSatisFiyati={formSatisFiyati}
          formSatisFiyatiNet={formSatisFiyatiNet}
          formKarTutari={formKarTutari}
          formKarOraniMarkup={formKarOraniMarkup}
          formKarOraniMargin={formKarOraniMargin}
          formTavsiyeFiyat={formTavsiyeFiyat}
          formIskontoOrani={formIskontoOrani}
          sonFiyatTarihi={sonFiyatTarihi}
        />
      )}

      <StokModallari
        db={db}
        updateDb={updateDb}
        aktifKullanici={aktifKullanici}
        uyariModal={uyariModal}
        setUyariModal={setUyariModal}
        girisModalId={girisModalId}
        setGirisModalId={setGirisModalId}
        rafModalId={rafModalId}
        setRafModalId={setRafModalId}
        duzeltmeModalId={duzeltmeModalId}
        setDuzeltmeModalId={setDuzeltmeModalId}
        hareketlerAcikId={hareketlerAcikId}
        setHareketlerAcikId={setHareketlerAcikId}
        tedarikciKarsilastirmaAcikId={tedarikciKarsilastirmaAcikId}
        setTedarikciKarsilastirmaAcikId={setTedarikciKarsilastirmaAcikId}
        gecmisAcikId={gecmisAcikId}
        setGecmisAcikId={setGecmisAcikId}
        fiyatGecmisAcikId={fiyatGecmisAcikId}
        setFiyatGecmisAcikId={setFiyatGecmisAcikId}
        kodModalId={kodModalId}
        setKodModalId={setKodModalId}
        barkodModalId={barkodModalId}
        setBarkodModalId={setBarkodModalId}
        aracModalId={aracModalId}
        setAracModalId={setAracModalId}
        formuAc={formuAc}
        kaydet={kaydet}
      />

      <UrunDetayPaneli
        db={db}
        updateDb={updateDb}
        buyukFotoUrl={buyukFotoUrl}
        detayModalParca={detayModalParca}
        dokumanEkle={dokumanEkle}
        dokumanInputRef={dokumanInputRef}
        dokumanSil={dokumanSil}
        fotoInputRef={fotoInputRef}
        fotoYukleniyor={fotoYukleniyor}
        fotografAnaYap={fotografAnaYap}
        fotografEkle={fotografEkle}
        fotografSil={fotografSil}
        fotografSiraDegistir={fotografSiraDegistir}
        gecmisAltGorunum={gecmisAltGorunum}
        setBuyukFotoUrl={setBuyukFotoUrl}
        setDetayModalId={setDetayModalId}
        setDetaySekme={setDetaySekme}
        setFotoYukleniyor={setFotoYukleniyor}
        setGecmisAltGorunum={setGecmisAltGorunum}
        setSilinecek={setSilinecek}
        setYeniDokumanTuru={setYeniDokumanTuru}
        setYeniFotoTuru={setYeniFotoTuru}
        sil={sil}
        silinecek={silinecek}
        yeniDokumanTuru={yeniDokumanTuru}
        yeniFotoTuru={yeniFotoTuru}
        detaySekme={detaySekme}
        setAracModalId={setAracModalId}
        setKodHata={setKodHata}
        setKodModalId={setKodModalId}
        setYeniKodDegeri={setYeniKodDegeri}
      />
    </div>
  );
}
