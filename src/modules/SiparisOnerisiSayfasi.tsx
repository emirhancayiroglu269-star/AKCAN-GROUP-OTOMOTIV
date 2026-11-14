/* Stok — sipariş önerisi / ölü stok ekranı (Stok.tsx'ten bölündü). */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

export function SiparisOnerisiSayfasi({ db, updateDb, setSekme, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("siparis"); // "siparis" | "olu"
  const [sadeceKritik, setSadeceKritik] = R.useState(true);
  const [secililer, setSecililer] = R.useState({}); // { parcaId: true }
  const [oluFiltre, setOluFiltre] = R.useState<number | string>(30); // 30 | 90 | 180 | 365 | "hic"
  const [listeGoster, setListeGoster] = R.useState(false);
  // Manuel müdahale (59. adım, 9. madde) — kullanıcı önerilen miktarı
  // değiştirebilir, isterse nedenini not düşer.
  const [manuelAdetler, setManuelAdetler] = R.useState({}); // { parcaId: adet }
  const [manuelNedenler, setManuelNedenler] = R.useState({}); // { parcaId: neden }

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set");

  const oneriListesiTam = aktifParcalar.map((p) => R.akilliSiparisOnerisiHesapla(db, p));

  const oneriListesi = oneriListesiTam
    .map((x) => ({
      p: x.parca,
      kritik: (x.parca.stok || 0) <= (x.parca.kritikSeviye || 0),
      onerilen: manuelAdetler[x.parca.id] ?? x.onerilenAdet,
      onerilenOrijinal: x.onerilenAdet,
      son30: x.son30,
      ortalamaGunluk: x.ortalamaGunluk,
      tahminiGun: x.tahminiGun,
      sonAlis: x.parca.alisGecmisi?.[0]?.tarih || null,
      analiz: x,
    }))
    .filter((x) => (sadeceKritik ? x.kritik || x.onerilen > 0 : true))
    .sort((a, b) => (b.kritik - a.kritik) || b.onerilen - a.onerilen);

  // Akıllı Uyarılar (10. madde)
  const akilliUyarilar = (() => {
    const stokBitmedenSiparisEdilmeli = oneriListesiTam.filter((x) => x.acilMi).length;
    const yediGunlukStoguKalan = oneriListesiTam.filter((x) => x.tahminiGun !== null && x.tahminiGun <= 7 && x.tahminiGun > 0).length;
    const satisHiziArtan = oneriListesiTam.filter((x) => x.son30 > 0 && x.son90 > 0 && x.son30 / 30 > (x.son90 / 90) * 1.3).length;
    const yeniSiparisGerekmeyen = oneriListesiTam.filter((x) => x.onerilenAdet === 0).length;
    return [
      { emoji: "🔴", metin: `${stokBitmedenSiparisEdilmeli} ürün stok bitmeden sipariş edilmeli.`, gizli: stokBitmedenSiparisEdilmeli === 0 },
      { emoji: "🟠", metin: `${yediGunlukStoguKalan} ürünün 7 günlük stoğu kaldı.`, gizli: yediGunlukStoguKalan === 0 },
      { emoji: "🟡", metin: `${satisHiziArtan} üründe satış hızında artış var.`, gizli: satisHiziArtan === 0 },
      { emoji: "🔵", metin: `${yeniSiparisGerekmeyen} ürün için yeni sipariş gerekmiyor.`, gizli: yeniSiparisGerekmeyen === 0 },
    ].filter((u) => !u.gizli);
  })();

  const oluListesi = (() => {
    const bugun = Date.now();
    return aktifParcalar
      .map((p) => {
        const sonTarih = R.sonSatisTarihiBul(db, p.id);
        const gun = sonTarih ? Math.floor((bugun - new Date(sonTarih).getTime()) / 86400000) : null;
        return { p, sonTarih, gun };
      })
      .filter((x) => {
        if (oluFiltre === "hic") return x.sonTarih === null;
        return x.gun !== null && x.gun >= oluFiltre;
      })
      .sort((a, b) => (b.gun || 99999) - (a.gun || 99999));
  })();

  const secimToggle = (parcaId) => setSecililer((prev) => ({ ...prev, [parcaId]: !prev[parcaId] }));
  const seciliSayisi = Object.values(secililer).filter(Boolean).length;

  // Seçili önerileri, tedarikçiye göre gruplayıp otomatik olarak birer
  // "Taslak" Satın Alma Siparişi'ne dönüştürür — 14. adımdaki öneri motorunu
  // 33. adımdaki gerçek sipariş takibine bağlayan köprü burasıdır.
  const siparisineEkle = () => {
    const secilenler = oneriListesi.filter((x) => secililer[x.p.id]);
    if (secilenler.length === 0) {
      R.bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const gruplar: Record<string, any[]> = {};
    secilenler.forEach((x) => {
      // Tedarikçi seçimi (5. madde) — 53. adımdaki fiyat karşılaştırmasından
      // en uygun tedarikçi varsa o kullanılır, yoksa ürünün kayıtlı tedarikçisi.
      const ted = x.analiz.enUygunTedarikci?.tedarikciAdi || x.p.tedarikci?.trim() || "Tedarikçi Belirtilmemiş";
      if (!gruplar[ted]) gruplar[ted] = [];
      gruplar[ted].push(x);
    });
    updateDb((prev) => {
      let sonuc = prev;
      Object.entries(gruplar).forEach(([ted, urunler]) => {
        const yeniKalemler = urunler.map((x) => ({
          id: R.yeniId("sk"),
          parcaId: x.p.id,
          stokKodu: x.p.stokKodu,
          ad: x.p.ad,
          marka: x.p.marka,
          adet: x.onerilen,
          alinanAdet: 0,
          birimFiyat: x.analiz.enUygunTedarikci?.netMaliyet ?? (x.p.sonAlisFiyati || x.p.alisFiyati || 0),
          iskontoYuzde: 0,
          kdvOrani: x.p.kdvOrani || 0,
        }));
        // Aynı tedarikçi için zaten açık bir Taslak varsa ona ekler, yoksa yeni oluşturur.
        const mevcutTaslak = sonuc.satinAlmaSiparisleri.find((s) => s.tedarikci === ted && s.durum === "Taslak");
        if (mevcutTaslak) {
          sonuc = {
            ...sonuc,
            satinAlmaSiparisleri: sonuc.satinAlmaSiparisleri.map((s) => (s.id === mevcutTaslak.id ? { ...s, kalemler: [...s.kalemler, ...yeniKalemler] } : s)),
          };
        } else {
          sonuc = {
            ...sonuc,
            satinAlmaSiparisleri: [
              {
                id: R.yeniId("sas"),
                tedarikci: ted,
                siparisTarihi: R.isoGun(new Date()),
                beklenenTeslimTarihi: "",
                aciklama: "Sipariş Önerisi'nden otomatik oluşturuldu",
                olusturanKullanici: aktifKullanici?.adSoyad || "",
                durum: "Taslak",
                kalemler: yeniKalemler,
                malKabulGecmisi: [],
                tamamlanmaTarihi: null,
                iptalNedeni: "",
              },
              ...sonuc.satinAlmaSiparisleri,
            ],
          };
        }
      });
      return sonuc;
    });
    R.bildirimGoster(`${Object.keys(gruplar).length} tedarikçi için satın alma siparişi (Taslak) oluşturuldu/güncellendi.`, "basari");
    setSekme("satinalma");
  };

  const siparisListesiOlustur = () => {
    const secilenler = oneriListesi.filter((x) => secililer[x.p.id]);
    if (secilenler.length === 0) {
      R.bildirimGoster("En az bir ürün seçin.", "hata");
      return;
    }
    const gruplar: Record<string, any[]> = {};
    secilenler.forEach((x) => {
      const ted = x.p.tedarikci?.trim() || "Tedarikçi Belirtilmemiş";
      if (!gruplar[ted]) gruplar[ted] = [];
      gruplar[ted].push(x);
    });

    const pencere = window.open("", "_blank", "width=480,height=700");
    if (!pencere) {
      R.bildirimGoster("Yazdırma penceresi açılamadı — pop-up engelleyiciyi kontrol edin.", "hata");
      return;
    }
    const gruplarHtml = Object.entries(gruplar)
      .map(
        ([ted, urunler]) => `
        <h3>${ted}</h3>
        <table>
          <tr><th>Ürün</th><th>Kod</th><th>Mevcut</th><th>Sipariş</th></tr>
          ${urunler
            .map((x) => `<tr><td>${x.p.ad}</td><td>${x.p.stokKodu}</td><td>${x.p.stok}</td><td><strong>${x.onerilen}</strong></td></tr>`)
            .join("")}
        </table>`
      )
      .join("");
    pencere.document.write(`
      <html>
        <head>
          <title>Sipariş Listesi — ${R.bugun()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; font-size: 13px; color: #14171A; }
            h2 { margin: 0 0 4px 0; }
            h3 { margin: 18px 0 6px 0; background: #EEF0F3; padding: 6px 10px; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
            th { color: #5B6470; }
          </style>
        </head>
        <body>
          <h2>AKCAN GROUP OTOMOTİV — Sipariş Listesi</h2>
          <div style="color:#5B6470; margin-bottom:10px;">${R.bugun()} · ${secilenler.length} ürün, tedarikçiye göre gruplandı</div>
          ${gruplarHtml}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    pencere.document.close();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "siparis", ad: "Sipariş Önerileri" },
          { id: "olu", ad: "Ölü Stok" },
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

      {altSekme === "siparis" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sadeceKritik} onChange={(e) => setSadeceKritik(e.target.checked)} />
              <span style={{ color: R.T.ink900 }}>Sadece kritik / önerisi olanları göster</span>
            </label>
            <R.Buton onClick={siparisListesiOlustur} disabled={seciliSayisi === 0}>
              <R.FileDown size={15} /> Sipariş Listesi Oluştur {seciliSayisi > 0 && `(${seciliSayisi})`}
            </R.Buton>
            <R.Buton onClick={siparisineEkle} disabled={seciliSayisi === 0}>
              <R.ClipboardList size={15} /> Satın Alma Siparişine Ekle {seciliSayisi > 0 && `(${seciliSayisi})`}
            </R.Buton>
          </div>

          {oneriListesi.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Package} baslik="Kritik ürün yok" aciklama="Şu an minimum stoğun altına düşen veya sipariş önerisi olan ürün bulunmuyor." />
            </R.Kart>
          ) : (
            <>
              {/* Akıllı Uyarılar (10. madde) */}
              {akilliUyarilar.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {akilliUyarilar.map((u, i) => (
                    <div key={i} className="text-sm px-3 py-2 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      {u.emoji} {u.metin}
                    </div>
                  ))}
                </div>
              )}

            <R.Kart className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="px-3 py-2"></th>
                      <th className="text-left font-semibold px-2 py-2">Ürün / Marka</th>
                      <th className="text-right font-semibold px-2 py-2">Mevcut</th>
                      <th className="text-right font-semibold px-2 py-2">Min.</th>
                      <th className="text-right font-semibold px-2 py-2">Hedef</th>
                      <th className="text-right font-semibold px-2 py-2">Önerilen Sipariş</th>
                      <th className="text-right font-semibold px-2 py-2">Tahmini Maliyet</th>
                      <th className="text-left font-semibold px-2 py-2">Satış Hızı</th>
                      <th className="text-left font-semibold px-2 py-2">Son Alış</th>
                      <th className="text-left font-semibold px-2 py-2">En Uygun Tedarikçi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oneriListesi.map((x) => {
                      const enUygun = R.enUygunTedarikciBul(db, x.p.id);
                      const satisHizSinifi = R.satisHiziSiniflandir(db, x.p);
                      const birimMaliyet = enUygun ? enUygun.netMaliyet : R.gecerliMaliyet(x.p, db);
                      const tahminiMaliyet = x.onerilen * birimMaliyet;
                      return (
                      <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={!!secililer[x.p.id]} onChange={() => secimToggle(x.p.id)} />
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {x.kritik && <R.Rozet tone="red">🔴 Kritik</R.Rozet>}
                            <span style={{ color: R.T.ink900 }}>{x.p.ad}</span>
                          </div>
                          <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                            {x.p.marka} · {x.p.stokKodu}
                          </div>
                          {x.tahminiGun !== null && x.tahminiGun <= 14 && (
                            <div className="text-xs font-semibold mt-0.5" style={{ color: "#8A6110" }}>
                              ⚠️ Son 30 günde {x.son30} satıldı (günlük ~{x.ortalamaGunluk.toFixed(1)}) — yaklaşık {x.tahminiGun} günlük stok kaldı.
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold" style={{ ...R.MONO, color: x.kritik ? R.T.red : R.T.ink900 }}>
                          {x.p.stok}
                        </td>
                        <td className="px-2 py-2.5 text-right" style={R.MONO}>
                          {x.p.kritikSeviye}
                        </td>
                        <td className="px-2 py-2.5 text-right" style={R.MONO}>
                          {R.gecerliHedefStok(x.p)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <input
                            type="number"
                            value={x.onerilen}
                            onChange={(e) => {
                              const yeni = parseFloat(e.target.value) || 0;
                              setManuelAdetler((prev) => ({ ...prev, [x.p.id]: yeni }));
                              if (yeni !== x.onerilenOrijinal) {
                                const neden = window.prompt(`Öneri ${x.onerilenOrijinal} idi, ${yeni} yapıyorsunuz. Değişiklik nedeni (opsiyonel):`, manuelNedenler[x.p.id] || "");
                                if (neden !== null) setManuelNedenler((prev) => ({ ...prev, [x.p.id]: neden }));
                              }
                            }}
                            className="w-16 px-1.5 py-1 rounded border text-right font-semibold text-sm outline-none"
                            style={{ borderColor: x.onerilen !== x.onerilenOrijinal ? R.T.orange : R.T.steel300, ...R.MONO, color: R.T.orangeDark }}
                          />
                          {x.onerilen !== x.onerilenOrijinal && (
                            <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                              (önerilen: {x.onerilenOrijinal})
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                          {R.tl(tahminiMaliyet)}
                        </td>
                        <td className="px-2 py-2.5">
                          <R.Rozet tone={R.SATIS_HIZI_SINIF_GORSELI[satisHizSinifi].ton as any}>
                            {R.SATIS_HIZI_SINIF_GORSELI[satisHizSinifi].emoji} {satisHizSinifi}
                          </R.Rozet>
                          <div className="text-xs mt-0.5 font-semibold" style={{ color: satisHizSinifi === "Ölü Stok" || satisHizSinifi === "Yavaş" ? R.T.red : R.T.green }}>
                            {satisHizSinifi === "Ölü Stok" || satisHizSinifi === "Yavaş" ? "❌ Yeni sipariş önerme" : "🟢 Sipariş öner"}
                          </div>
                        </td>
                        <td className="px-2 py-2.5" style={{ color: R.T.ink500 }}>
                          {x.sonAlis ? R.tarihGoster(x.sonAlis) : "—"}
                        </td>
                        <td className="px-2 py-2.5" style={{ color: R.T.ink900 }}>
                          {enUygun ? (
                            <span>
                              ✅ {enUygun.tedarikciAdi} <span style={{ color: R.T.ink500 }}>({R.tl(enUygun.netMaliyet)})</span>
                            </span>
                          ) : (
                            <span style={{ color: R.T.ink500 }}>{x.p.tedarikci || "—"}</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </R.Kart>

            {/* Toplam önerilen alış (8. madde) */}
            {(() => {
              const toplamMaliyet = oneriListesi.reduce((t, x) => {
                const enUygun = R.enUygunTedarikciBul(db, x.p.id);
                const birimMaliyet = enUygun ? enUygun.netMaliyet : R.gecerliMaliyet(x.p, db);
                return t + x.onerilen * birimMaliyet;
              }, 0);
              return (
                <R.Kart className="p-4 flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                    Toplam önerilen alış
                  </span>
                  <span className="text-lg font-semibold" style={{ ...R.DISPLAY, color: R.T.orangeDark }}>
                    {R.tl(toplamMaliyet)}
                  </span>
                </R.Kart>
              );
            })()}
            </>
          )}
        </>
      )}

      {altSekme === "olu" && (
        <>
          <div className="flex rounded-md overflow-hidden border w-fit" style={{ borderColor: R.T.steel300 }}>
            {[
              { id: 30, ad: "30+ gün" },
              { id: 90, ad: "90+ gün" },
              { id: 180, ad: "180+ gün" },
              { id: 365, ad: "365+ gün" },
              { id: "hic", ad: "Hiç Satılmamış" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setOluFiltre(f.id)}
                className="px-3 py-2 text-xs font-semibold"
                style={{ background: oluFiltre === f.id ? R.T.graphite900 : "#fff", color: oluFiltre === f.id ? "#fff" : R.T.ink500 }}
              >
                {f.ad}
              </button>
            ))}
          </div>

          {oluListesi.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Package} baslik="Bu kritere uyan ürün yok" aciklama="Seçtiğiniz süreye göre ölü stok bulunmuyor." />
            </R.Kart>
          ) : (
            <R.Kart className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-3 py-2">Ürün / Marka</th>
                      <th className="text-right font-semibold px-2 py-2">Stok</th>
                      <th className="text-right font-semibold px-2 py-2">Stok Değeri</th>
                      <th className="text-left font-semibold px-2 py-2">Son Satış</th>
                      <th className="text-right font-semibold px-2 py-2">Gün</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oluListesi.map((x) => (
                      <tr key={x.p.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2.5">
                          <div style={{ color: R.T.ink900 }}>{x.p.ad}</div>
                          <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                            {x.p.marka} · {x.p.stokKodu}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold" style={R.MONO}>
                          {x.p.stok}
                        </td>
                        <td className="px-2 py-2.5 text-right" style={R.MONO}>
                          {R.tl(R.gecerliMaliyet(x.p) * x.p.stok)}
                        </td>
                        <td className="px-2 py-2.5" style={{ color: R.T.ink500 }}>
                          {x.sonTarih ? R.tarihGoster(x.sonTarih) : "Hiç satılmadı"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                          {x.gun !== null ? x.gun : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </R.Kart>
          )}
        </>
      )}
    </div>
  );
}
