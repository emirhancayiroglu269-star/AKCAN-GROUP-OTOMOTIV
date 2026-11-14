/* Stok — sayım ekranı (Stok.tsx'ten bölündü).
   Sayım fazlası/eksiği buradan stok hareketine dönüşür. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";
import { BarkodBulunamadiModal } from "./BarkodBulunamadiModal";

export function SayimSayfasi({ db, updateDb, aktifKullanici, baslangicKategori, baslangicMarka }) {
  const [aktifSayimId, setAktifSayimId] = R.useState(() => db.sayimlar.find((s) => s.durum === "Devam Ediyor")?.id || null);
  const [yeniSayimAcik, setYeniSayimAcik] = R.useState(!!baslangicKategori || !!baslangicMarka);
  const [kapsamTuru, setKapsamTuru] = R.useState(baslangicMarka ? "marka" : baslangicKategori ? "kategori" : "tumu");
  const [kapsamDeger, setKapsamDeger] = R.useState(baslangicMarka?.marka || baslangicKategori?.kategori || "");
  const [kapsamUrunIdleri, setKapsamUrunIdleri] = R.useState([]);
  const [urunGrubuArama, setUrunGrubuArama] = R.useState("");
  const [baslatan, setBaslatan] = R.useIslemYapan(aktifKullanici);
  const [barkodGiris, setBarkodGiris] = R.useState("");
  const [aramaMetni, setAramaMetni] = R.useState("");
  const [onayEkraniAcik, setOnayEkraniAcik] = R.useState(false);
  const [gecmisDetayId, setGecmisDetayId] = R.useState(null);
  const [sonOkutulan, setSonOkutulan] = R.useState(null); // { parca, sayilan } — yanlış ürün kontrolü (5. madde)
  const [barkodBulunamadiModal, setBarkodBulunamadiModal] = R.useState(null); // { kod }
  const [kameraAcik, setKameraAcik] = R.useState(false);
  const barkodRef = R.useRef(null);
  const videoRef = R.useRef(null);
  const kameraStreamRef = R.useRef(null);

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);
  const markalar = [...new Set<string>(aktifParcalar.map((p) => p.marka).filter(Boolean) as string[])].sort();
  const kategoriler = [...new Set<string>(aktifParcalar.map((p) => p.kategori).filter(Boolean) as string[])].sort();
  const raflar = [...new Set<string>(aktifParcalar.flatMap((p) => R.parcaRafListesi(p).map((k) => k.kod)) as string[])].sort();

  const aktifSayim = aktifSayimId ? db.sayimlar.find((s) => s.id === aktifSayimId) : null;

  const sayimBaslat = () => {
    if ((kapsamTuru === "marka" || kapsamTuru === "kategori" || kapsamTuru === "raf") && !kapsamDeger) {
      R.bildirimGoster("Kapsam için bir değer seçin.", "hata");
      return;
    }
    if (kapsamTuru === "urunGrubu" && kapsamUrunIdleri.length === 0) {
      R.bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const id = R.yeniId("say");
    updateDb((prev) => ({
      ...prev,
      sayimlar: [
        { id, sayimNo: prev.sayimlar.length + 1, tarih: R.zamanDamgasi(), kapsamTuru, kapsamDeger, kapsamUrunIdleri, baslatan: baslatan.trim(), durum: "Devam Ediyor", kalemler: [] },
        ...prev.sayimlar,
      ],
    }));
    R.sonKullaniciAdiKaydet(baslatan);
    setAktifSayimId(id);
    setYeniSayimAcik(false);
  };

  const sayimIptalEt = () => {
    if (!window.confirm("Devam eden sayım silinsin mi? Sayılan veriler kaybolacak.")) return;
    updateDb((prev) => ({ ...prev, sayimlar: prev.sayimlar.filter((s) => s.id !== aktifSayimId) }));
    setAktifSayimId(null);
  };

  const sayilanAdetGuncelle = (parcaId, adet) => {
    updateDb((prev) => ({
      ...prev,
      sayimlar: prev.sayimlar.map((s) => {
        if (s.id !== aktifSayimId) return s;
        const mevcut = s.kalemler.some((k) => k.parcaId === parcaId);
        return {
          ...s,
          kalemler: mevcut ? s.kalemler.map((k) => (k.parcaId === parcaId ? { ...k, sayilanAdet: adet } : k)) : [...s.kalemler, { parcaId, sayilanAdet: adet }],
        };
      }),
    }));
  };

  // Barkod okutuldukça +1 artırır; tam barkod eşleşmesi bulunamazsa "Yeni
  // Ürün Oluştur / Barkodu Mevcut Ürüne Bağla" seçenekli modal açar (4. madde).
  // Hem elle Enter'a basmadan hem de kamera taramasından çağrılabilir olması
  // için ayrı bir fonksiyona çıkarılmıştır.
  const kodIsle = (kodHam) => {
    const kod = (kodHam || "").trim();
    if (!kod) return;
    const kapsam = R.sayimKapsamindakiParcalar(db, aktifSayim);
    const p = R.barkodluParcaBul(kapsam, kod);
    if (!p) {
      const herhangiUrun = R.barkodluParcaBul(db.parcalar, kod);
      if (herhangiUrun) {
        R.bildirimGoster("Bu ürün sayım kapsamının dışında.", "hata");
      } else {
        setBarkodBulunamadiModal({ kod });
      }
      setBarkodGiris("");
      return;
    }
    const mevcutKayit = aktifSayim.kalemler.find((k) => k.parcaId === p.id);
    const yeniAdet = (mevcutKayit?.sayilanAdet || 0) + 1;
    sayilanAdetGuncelle(p.id, yeniAdet);
    setSonOkutulan({ parca: p, sayilan: yeniAdet }); // Yanlış ürün kontrolü (5. madde) — foto/marka/raf/sistem stoğu gösterilir.
    setBarkodGiris("");
  };

  const barkodEnter = (e) => {
    if (e.key !== "Enter") return;
    kodIsle(barkodGiris);
  };

  // --- Mobil kullanım: telefon/tablet kamerasıyla barkod okutma (9. madde) -----
  // Tarayıcının yerleşik BarcodeDetector API'sini kullanır — bu API şu an
  // Chrome/Edge/Android'de desteklenir; iOS Safari'de HENÜZ desteklenmez,
  // bu durumda kullanıcıya açıkça bildirilir ve elle/harici okuyucu ile
  // devam edilebilir.
  const sonTaranan = R.useRef("");
  const kameraBaslat = async () => {
    if (!("BarcodeDetector" in window)) {
      R.bildirimGoster("Bu tarayıcı kamera ile barkod okumayı desteklemiyor (Chrome/Android önerilir). Harici barkod okuyucu veya elle giriş kullanabilirsiniz.", "hata");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      kameraStreamRef.current = stream;
      setKameraAcik(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
      const BarcodeDetectorSinifi = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorSinifi({ formats: ["ean_13", "ean_8", "code_128", "upc_a"] });
      const tara = async () => {
        if (!kameraStreamRef.current || !videoRef.current) return;
        try {
          const barkodlar = await detector.detect(videoRef.current);
          if (barkodlar.length > 0 && barkodlar[0].rawValue !== sonTaranan.current) {
            sonTaranan.current = barkodlar[0].rawValue;
            kodIsle(barkodlar[0].rawValue);
            setTimeout(() => (sonTaranan.current = ""), 1200); // aynı barkodu art arda tekrar saymayı önler
          }
        } catch (err) {
          /* tarama hatası — bir sonraki karede tekrar denenir */
        }
        if (kameraStreamRef.current) requestAnimationFrame(tara);
      };
      requestAnimationFrame(tara);
    } catch (err) {
      R.bildirimGoster("Kameraya erişilemedi — tarayıcı izni kontrol edin.", "hata");
    }
  };
  const kameraDurdur = () => {
    kameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    kameraStreamRef.current = null;
    setKameraAcik(false);
  };
  R.useEffect(() => () => kameraStreamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const canliOzet = aktifSayim ? R.sayimOzetiHesapla(db, aktifSayim) : null;
  const gorunenSatirlar = canliOzet
    ? aramaMetni.trim()
      ? canliOzet.satirlar.filter(
          (x) => x.p.ad.toLowerCase().includes(aramaMetni.toLowerCase()) || R.kodNormalize(x.p.stokKodu).includes(R.kodNormalize(aramaMetni))
        )
      : canliOzet.satirlar
    : [];

  const sayimiOnayla = () => {
    const ozet = R.sayimOzetiHesapla(db, aktifSayim);
    // Onay sistemi (8. madde): Sayım Sonuçları → Farkları İncele → Yönetici
    // Onayı → Stokları Güncelle. Fark yoksa onay istemeye gerek yok.
    if ((ozet.eksik > 0 || ozet.fazla > 0) && !R.yetkiVarMi(db, aktifKullanici, "stokDuzeltebilir")) {
      const onay = R.yoneticiOnayiAl(db, `Bu sayımda ${ozet.eksik + ozet.fazla} üründe fark var — stokları güncellemek için yönetici onayı gerekiyor.`);
      if (!onay) {
        R.bildirimGoster("Sayım onaylanmadı — stoklar değişmedi.", "hata");
        return;
      }
    }
    let stokEngellendi = false;
    updateDb((prev) => {
      let sonuc = prev;
      for (const satir of ozet.satirlar) {
        if (satir.fark === null || satir.fark === 0) continue;
        const hareket = R.stokHareketiUygula(sonuc, {
          parcaId: satir.p.id,
          tur: satir.fark < 0 ? "Sayım Eksiği" : "Sayım Fazlası",
          giris: satir.fark > 0 ? satir.fark : 0,
          cikis: satir.fark < 0 ? -satir.fark : 0,
          belgeNo: aktifSayim.id.slice(-6).toUpperCase(),
          kullanici: baslatan.trim(),
          aciklama: `Stok sayımı (${aktifSayim.kapsamTuru === "tumu" ? "Tüm Stok" : aktifSayim.kapsamDeger})`,
        });
        if (hareket.durum === "engellendi" || hareket.durum === "parca-yok") {
          stokEngellendi = true;
          return prev;
        }
        sonuc = hareket.db;
      }
      return {
        ...sonuc,
        sayimlar: sonuc.sayimlar.map((s) =>
          s.id === aktifSayim.id
            ? {
                ...s,
                // Fark değerleri, o anki sistem stoğuyla birlikte kalıcı olarak
                // saklanır — geçmiş sayım detayında yeniden hesaplamaya gerek kalmaz.
                kalemler: s.kalemler.map((k) => {
                  const satir = ozet.satirlar.find((x) => x.p.id === k.parcaId);
                  return satir ? { ...k, sistemStoguOSirada: satir.sistemStogu, fark: satir.fark } : k;
                }),
                durum: "Onaylandı",
                onaylayanKullanici: aktifKullanici?.adSoyad || baslatan.trim(),
                onayTarihi: R.zamanDamgasi(),
                ozet: { toplam: ozet.toplam, eksik: ozet.eksik, fazla: ozet.fazla, dogru: ozet.dogru, sayilmayan: ozet.sayilmayan },
                maliFark: { eksikMaliyet: ozet.eksikMaliyet, fazlaMaliyet: ozet.fazlaMaliyet, net: ozet.net },
              }
            : s
        ),
      };
    });
    if (stokEngellendi) {
      R.bildirimGoster("Sayım onaylanamadı — bir üründe beklenmeyen bir stok sorunu oluştu.", "hata");
      return;
    }
    R.bildirimGoster("Sayım onaylandı, stok farkları hareket olarak işlendi.", "basari");
    setOnayEkraniAcik(false);
    setAktifSayimId(null);
  };

  const gecmisSayimlar = db.sayimlar.filter((s) => s.durum === "Onaylandı");
  const gecmisDetay = gecmisDetayId ? db.sayimlar.find((s) => s.id === gecmisDetayId) : null;

  const kapsamEtiketi = (s) =>
    s.kapsamTuru === "tumu" ? "Tüm Stok" : `${s.kapsamTuru === "marka" ? "Marka" : s.kapsamTuru === "kategori" ? "Kategori" : "Raf"}: ${s.kapsamDeger}`;

  // --- Onay ekranı (Sayım Farkları) --------------------------------------
  if (aktifSayim && onayEkraniAcik) {
    const ozet = canliOzet;
    return (
      <div className="flex flex-col gap-5">
        <div className="px-3.5 py-2.5 rounded-md text-sm flex items-center justify-between" style={{ background: "#FDF1D6", color: "#8A6110" }}>
          <span>Sayım #{aktifSayim.sayimNo} Farkları — henüz stoklar değişmedi</span>
          <button onClick={() => setOnayEkraniAcik(false)} className="font-semibold underline">
            Sayıma Geri Dön
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { etiket: "Toplam Sayılan", deger: ozet.toplam - ozet.sayilmayan, ton: "graphite" },
            { etiket: "Eksik", deger: ozet.eksik, ton: "red" },
            { etiket: "Fazla", deger: ozet.fazla, ton: "green" },
            { etiket: "Doğru", deger: ozet.dogru, ton: "graphite" },
            { etiket: "Sayılmayan", deger: ozet.sayilmayan, ton: "yellow" },
          ].map((k) => (
            <R.Kart key={k.etiket} className="p-3.5">
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {k.etiket}
              </div>
              <div
                className="text-xl font-semibold mt-0.5"
                style={{ ...R.DISPLAY, color: k.ton === "red" ? R.T.red : k.ton === "green" ? R.T.green : k.ton === "yellow" ? "#8A6110" : R.T.ink900 }}
              >
                {k.deger}
              </div>
            </R.Kart>
          ))}
        </div>

        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Mali Fark
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Eksik Stok Maliyeti
              </div>
              <div className="text-lg font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                −{R.tl(ozet.eksikMaliyet)}
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Fazla Stok Maliyeti
              </div>
              <div className="text-lg font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                +{R.tl(ozet.fazlaMaliyet)}
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Net Stok Farkı
              </div>
              <div className="text-lg font-semibold" style={{ ...R.MONO, color: ozet.net >= 0 ? R.T.green : R.T.red }}>
                {R.tl(ozet.net)}
              </div>
            </div>
          </div>
        </R.Kart>

        {ozet.sayilmayan > 0 && (
          <p className="text-xs px-3 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink500 }}>
            {ozet.sayilmayan} ürün henüz sayılmadı — bunlar için stok değişikliği yapılmayacak, mevcut sistem stoğu korunacak.
          </p>
        )}

        <R.Kart className="overflow-hidden">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  <th className="text-left font-semibold px-3 py-2">Ürün</th>
                  <th className="text-right font-semibold px-2 py-2">Sistem</th>
                  <th className="text-right font-semibold px-2 py-2">Sayılan</th>
                  <th className="text-right font-semibold px-2 py-2">Fark</th>
                </tr>
              </thead>
              <tbody>
                {ozet.satirlar
                  .filter((x) => x.fark !== null && x.fark !== 0)
                  .map((x) => (
                    <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2">{x.p.ad}</td>
                      <td className="px-2 py-2 text-right" style={R.MONO}>
                        {x.sistemStogu}
                      </td>
                      <td className="px-2 py-2 text-right" style={R.MONO}>
                        {x.sayilan}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ ...R.MONO, color: x.fark < 0 ? R.T.red : R.T.green }}>
                        {x.fark < 0 ? `🔴 ${x.fark}` : `🟢 +${x.fark}`}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </R.Kart>

        <R.Buton onClick={sayimiOnayla}>
          <R.Check size={16} /> Sayımı Onayla ve Stokları Güncelle
        </R.Buton>
      </div>
    );
  }

  // --- Sayım ekranı (devam eden sayım) ------------------------------------
  if (aktifSayim) {
    const tamamlanmaYuzdesi = canliOzet.toplam > 0 ? Math.round(((canliOzet.toplam - canliOzet.sayilmayan) / canliOzet.toplam) * 100) : 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="px-3.5 py-2.5 rounded-md text-sm flex items-center justify-between flex-wrap gap-2" style={{ background: "#FDF1D6", color: "#8A6110" }}>
          <span>
            <strong>Sayım #{aktifSayim.sayimNo}</strong> — {kapsamEtiketi(aktifSayim)} · Başlatan: {aktifSayim.baslatan || "—"} · <strong>%{tamamlanmaYuzdesi} tamamlandı</strong>
          </span>
          <button onClick={sayimIptalEt} className="font-semibold underline shrink-0">
            Sayımı İptal Et
          </button>
        </div>

        {/* Yanlış ürün kontrolü (5. madde) — son okutulan ürünün foto/marka/raf/stok bilgisi */}
        {sonOkutulan && (
          <R.Kart className="p-3 flex items-center gap-3" style={{ borderColor: R.T.green, borderWidth: 2 }}>
            {sonOkutulan.parca.fotograflar?.[0]?.url ? (
              <img src={sonOkutulan.parca.fotograflar[0].url} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-md flex items-center justify-center shrink-0" style={{ background: R.T.steel100 }}>
                <R.ImageIcon size={20} style={{ color: R.T.ink500 }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: R.T.ink900 }}>
                ✅ {sonOkutulan.parca.marka} — {sonOkutulan.parca.ad}
              </div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Raf: {R.parcaRafListesi(sonOkutulan.parca)[0]?.kod || "—"} · Sistem Stoğu: {sonOkutulan.parca.stok} · Sayılan: <strong>{sonOkutulan.sayilan}</strong>
              </div>
            </div>
          </R.Kart>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { etiket: "Toplam Ürün", deger: canliOzet.toplam },
            { etiket: "Sayılan", deger: canliOzet.toplam - canliOzet.sayilmayan },
            { etiket: "Farklı", deger: canliOzet.eksik + canliOzet.fazla },
            { etiket: "Doğru", deger: canliOzet.dogru },
          ].map((k) => (
            <R.Kart key={k.etiket} className="p-3">
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {k.etiket}
              </div>
              <div style={{ ...R.DISPLAY, fontSize: 20, color: R.T.ink900 }}>{k.deger}</div>
            </R.Kart>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <R.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
            <input
              ref={barkodRef}
              value={barkodGiris}
              onChange={(e) => setBarkodGiris(e.target.value)}
              onKeyDown={barkodEnter}
              placeholder="Barkod okutun (her okutmada +1 sayılır) veya ürün adı/kod ile arayıp aşağıdan elle girin…"
              className="w-full pl-10 pr-3 py-3 rounded-lg border text-sm outline-none focus:ring-2"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
              autoFocus
            />
          </div>
          <button onClick={kameraBaslat} title="Telefon/tablet kamerasıyla barkod okut" className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: R.T.graphite900, color: "#fff" }}>
            <R.ScanLine size={20} />
          </button>
        </div>
        <R.Girdi value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} placeholder="Listeyi ürün adı/koduna göre filtrele…" />

        <R.Kart className="overflow-hidden">
          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  <th className="text-left font-semibold px-3 py-2">Ürün Kodu / Marka / Ürün</th>
                  <th className="text-left font-semibold px-2 py-2">Raf</th>
                  <th className="text-right font-semibold px-2 py-2">Sistem</th>
                  <th className="text-center font-semibold px-2 py-2">Sayılan</th>
                  <th className="text-right font-semibold px-2 py-2">Fark</th>
                </tr>
              </thead>
              <tbody>
                {gorunenSatirlar.map((x) => (
                  <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                    <td className="px-3 py-2">
                      <div style={{ color: R.T.ink900 }}>{x.p.ad}</div>
                      <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                        {x.p.stokKodu} · {x.p.marka}
                      </div>
                    </td>
                    <td className="px-2 py-2" style={{ color: R.T.ink500 }}>
                      {R.parcaRafListesi(x.p)[0]?.kod || "—"}
                    </td>
                    <td className="px-2 py-2 text-right" style={R.MONO}>
                      {x.sistemStogu}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={x.sayilan ?? ""}
                        onChange={(e) => sayilanAdetGuncelle(x.p.id, e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
                        placeholder="—"
                        className="w-20 mx-auto block px-1.5 py-1 rounded border text-sm text-center outline-none"
                        style={{ borderColor: R.T.steel300 }}
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-semibold" style={{ ...R.MONO, color: x.fark === null ? R.T.ink500 : x.fark < 0 ? R.T.red : x.fark > 0 ? R.T.green : R.T.ink500 }}>
                      {x.fark === null ? "—" : x.fark === 0 ? "0" : x.fark < 0 ? `🔴 ${x.fark}` : `🟢 +${x.fark}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </R.Kart>

        <R.Buton onClick={() => setOnayEkraniAcik(true)}>
          <R.ClipboardList size={16} /> Sayımı Bitir — Farkları Gör
        </R.Buton>

        {/* Barkod bulunamadı — Yeni Ürün Oluştur / Barkodu Mevcut Ürüne Bağla (4. madde) */}
        {barkodBulunamadiModal && (
          <BarkodBulunamadiModal db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} kod={barkodBulunamadiModal.kod} onKapat={() => setBarkodBulunamadiModal(null)} />
        )}

        {/* Mobil kamera ile barkod okutma (9. madde) */}
        {kameraAcik && (
          <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
            <video ref={videoRef} playsInline muted className="w-full max-w-sm rounded-lg" style={{ background: "#000" }} />
            <p className="text-white text-sm mt-4 text-center max-w-sm">Barkodu kamera görüş alanına getirin — otomatik algılanacaktır.</p>
            <button onClick={kameraDurdur} className="mt-4 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: "#fff", color: R.T.ink900 }}>
              Kamerayı Kapat
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Ana ekran: geçmiş sayımlar + yeni sayım başlatma --------------------
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: R.T.ink500 }}>
          Şu anda devam eden bir sayım yok.
        </span>
        <R.Buton onClick={() => setYeniSayimAcik(true)}>
          <R.Plus size={15} /> Yeni Sayım Başlat
        </R.Buton>
      </div>

      {gecmisSayimlar.length === 0 ? (
        <R.Kart>
          <R.Bos ikon={R.ClipboardList} baslik="Henüz sayım yapılmadı" aciklama="İlk stok sayımınızı başlatarak sistem stoğu ile fiziksel stoğu karşılaştırın." />
        </R.Kart>
      ) : (
        <R.Kart className="overflow-hidden">
          <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
            <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
              Geçmiş Sayımlar
            </span>
          </div>
          {gecmisSayimlar.map((s) => (
            <button
              key={s.id}
              onClick={() => setGecmisDetayId(s.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50"
              style={{ borderTop: `1px solid ${R.T.steel200}` }}
            >
              <div>
                <div style={{ color: R.T.ink900 }}>
                  <strong>Sayım #{s.sayimNo}</strong> — {kapsamEtiketi(s)} <span style={{ color: R.T.ink500 }}>· {R.tarihGoster(s.onayTarihi || s.tarih)}</span>
                </div>
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  {s.ozet?.toplam || 0} ürün · {s.ozet?.eksik || 0} eksik · {s.ozet?.fazla || 0} fazla · {s.ozet?.dogru || 0} doğru · Başlatan: {s.baslatan || "—"} · Onaylayan: {s.onaylayanKullanici || "—"}
                </div>
              </div>
              <span className="font-semibold shrink-0" style={{ ...R.MONO, color: (s.maliFark?.net || 0) >= 0 ? R.T.green : R.T.red }}>
                {R.tl(s.maliFark?.net || 0)}
              </span>
            </button>
          ))}
        </R.Kart>
      )}

      {/* Yeni sayım başlatma modalı */}
      {yeniSayimAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setYeniSayimAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Yeni Sayım Başlat
              </h3>
              <button onClick={() => setYeniSayimAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <R.Secim
                label="Kapsam"
                value={kapsamTuru}
                onChange={(e) => {
                  setKapsamTuru(e.target.value);
                  setKapsamDeger("");
                }}
              >
                <option value="tumu">Tüm Stok</option>
                <option value="marka">Marka</option>
                <option value="kategori">Kategori</option>
                <option value="raf">Raf</option>
                <option value="urunGrubu">Belirli Ürün Grubu</option>
              </R.Secim>
              {kapsamTuru === "marka" && (
                <R.Secim value={kapsamDeger} onChange={(e) => setKapsamDeger(e.target.value)}>
                  <option value="">Marka seçin…</option>
                  {markalar.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </R.Secim>
              )}
              {kapsamTuru === "kategori" && (
                <R.Secim value={kapsamDeger} onChange={(e) => setKapsamDeger(e.target.value)}>
                  <option value="">Kategori seçin…</option>
                  {kategoriler.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </R.Secim>
              )}
              {kapsamTuru === "raf" && (
                <R.Secim value={kapsamDeger} onChange={(e) => setKapsamDeger(e.target.value)}>
                  <option value="">Raf seçin…</option>
                  {raflar.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </R.Secim>
              )}
              {kapsamTuru === "urunGrubu" && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      value={urunGrubuArama}
                      onChange={(e) => setUrunGrubuArama(e.target.value)}
                      placeholder="Ürün ara ve ekle…"
                      className="w-full px-3 py-2 rounded-md border text-sm outline-none"
                      style={{ borderColor: R.T.steel300 }}
                    />
                    {urunGrubuArama.trim() && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-40 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                        {R.hizliAramaYap(db, urunGrubuArama)
                          .filter((p) => !kapsamUrunIdleri.includes(p.id))
                          .slice(0, 6)
                          .map((p) => (
                            <button
                              key={p.id}
                              onMouseDown={() => {
                                setKapsamUrunIdleri((prev) => [...prev, p.id]);
                                setUrunGrubuArama("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              style={{ color: R.T.ink900 }}
                            >
                              {p.ad}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  {kapsamUrunIdleri.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {kapsamUrunIdleri.map((id) => {
                        const p = db.parcalar.find((x) => x.id === id);
                        return (
                          <span key={id} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                            {p?.ad || "—"}
                            <button onClick={() => setKapsamUrunIdleri((prev) => prev.filter((x) => x !== id))} style={{ color: R.T.red }}>
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <R.Girdi label="Sayımı Başlatan" value={baslatan} readOnly />
              <R.Buton onClick={sayimBaslat}>
                <R.Check size={15} /> Sayımı Başlat
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Geçmiş sayım detayı */}
      {gecmisDetay && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setGecmisDetayId(null)}>
          <div className="w-full max-w-2xl rounded-lg overflow-hidden" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {kapsamEtiketi(gecmisDetay)} — {R.tarihGoster(gecmisDetay.onayTarihi)}
              </h3>
              <button onClick={() => setGecmisDetayId(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-4" style={{ maxHeight: "75vh" }}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Eksik Maliyeti
                  </div>
                  <div className="font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                    −{R.tl(gecmisDetay.maliFark?.eksikMaliyet || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Fazla Maliyeti
                  </div>
                  <div className="font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                    +{R.tl(gecmisDetay.maliFark?.fazlaMaliyet || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Net Fark
                  </div>
                  <div className="font-semibold" style={{ ...R.MONO, color: (gecmisDetay.maliFark?.net || 0) >= 0 ? R.T.green : R.T.red }}>
                    {R.tl(gecmisDetay.maliFark?.net || 0)}
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-2 py-1.5">Ürün</th>
                    <th className="text-right font-semibold px-2 py-1.5">Sayılan</th>
                    <th className="text-right font-semibold px-2 py-1.5">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {gecmisDetay.kalemler
                    .filter((k) => k.fark !== 0 && k.fark !== undefined)
                    .map((k) => {
                      const p = db.parcalar.find((x) => x.id === k.parcaId);
                      if (!p) return null;
                      return (
                        <tr key={k.parcaId} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                          <td className="px-2 py-1.5">{p.ad}</td>
                          <td className="px-2 py-1.5 text-right" style={R.MONO}>
                            {k.sayilanAdet}
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold" style={{ ...R.MONO, color: k.fark < 0 ? R.T.red : R.T.green }}>
                            {k.fark < 0 ? `🔴 ${k.fark}` : `🟢 +${k.fark}`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
