/* AnaSayfa module — extracted from the V16 monolith. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

export function AnaSayfaSayfasi({ db, setSekme }) {
  const bugunIso = R.isoGun(new Date());
  const bugunTarih = R.bugun();

  // --- Global arama --------------------------------------------------------
  const [globalArama, setGlobalArama] = R.useState("");
  const globalSonuclar = (() => {
    const q = globalArama.trim();
    if (!q) return { urunler: [], musteriler: [], tedarikciler: [] };
    const urunler = R.hizliAramaYap(db, q).slice(0, 5);
    const qLower = q.toLowerCase();
    const qTelefon = q.replace(/\D/g, "");
    const musteriler = db.cariler
      .filter((c) => c.aktif !== false && (c.ad.toLowerCase().includes(qLower) || (qTelefon.length >= 3 && (c.telefon || "").replace(/\D/g, "").includes(qTelefon))))
      .slice(0, 5);
    const tedarikciler = db.tedarikciler.filter((t) => t.aktif !== false && t.ad.toLowerCase().includes(qLower)).slice(0, 5);
    return { urunler, musteriler, tedarikciler };
  })();
  const globalSonucVarMi = globalSonuclar.urunler.length + globalSonuclar.musteriler.length + globalSonuclar.tedarikciler.length > 0;

  // --- Tarih seçimi (Satış Özeti'ni kontrol eder) ---------------------------
  const [tarihSecimi, setTarihSecimi] = R.useState("bugun");
  const [ozelBaslangic, setOzelBaslangic] = R.useState(bugunIso);
  const [ozelBitis, setOzelBitis] = R.useState(bugunIso);
  const [baslangic, bitis] = R.TARIH_ARALIGI_HESAPLA(tarihSecimi, ozelBaslangic, ozelBitis);

  // --- Bugünkü hızlı özet (tarih seçiminden bağımsız, her zaman BUGÜN) -----
  const bugunSatislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && R.tarihGoster(s.tarih) === bugunTarih);
  const bugunCiro = bugunSatislar.reduce((t, s) => t + s.genelToplam, 0);
  const bugunKalemler = bugunSatislar.flatMap((s) => s.kalemler);
  const bugunKar = bugunKalemler.reduce((t, k) => t + R.satisKalemiKarBilgisi(k).karToplam, 0);
  const kasaToplami = db.hesaplar.reduce((t, h) => t + (h.bakiye || 0), 0);
  const musteriAlacagi = db.cariler.reduce((t, c) => t + Math.max(0, c.bakiye || 0), 0);
  const tedarikciBorcu = db.tedarikciler.reduce((t, t2) => t + Math.max(0, t2.bakiye || 0), 0);

  // --- Satış Özeti (seçilen tarih aralığına göre) ---------------------------
  const araliktakiSatislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= baslangic && s.tarih.slice(0, 10) <= bitis);
  const araliktakiToplamCiro = araliktakiSatislar.reduce((t, s) => t + s.genelToplam, 0);
  const araliktakiKalemler = araliktakiSatislar.flatMap((s) => s.kalemler);
  const araliktakiKar = araliktakiKalemler.reduce((t, k) => t + R.satisKalemiKarBilgisi(k).karToplam, 0);
  const araliktakiKarMarji = araliktakiToplamCiro > 0 ? (araliktakiKar / araliktakiToplamCiro) * 100 : null;
  const araliktakiOrtalamaSepet = araliktakiSatislar.length > 0 ? araliktakiToplamCiro / araliktakiSatislar.length : 0;
  const araliktakiIskonto = araliktakiSatislar.reduce((t, s) => t + (s.iskontoToplam || 0), 0);
  const araliktakiIade = db.iadeler.filter((i) => i.tarih.slice(0, 10) >= baslangic && i.tarih.slice(0, 10) <= bitis).reduce((t, i) => t + i.tutar, 0);

  // --- Stok uyarıları ---------------------------------------------------------
  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false);
  const kritikStoklar = aktifParcalar.filter((p) => (p.stok || 0) > 0 && p.stok <= p.kritikSeviye);
  const stoktaOlmayanlar = aktifParcalar.filter((p) => (p.stok || 0) <= 0);
  const uzunSuredirSatilmayanlar = aktifParcalar.filter((p) => {
    const sonTarih = R.sonSatisTarihiBul(db, p.id);
    if (!sonTarih) return true;
    return Math.floor((Date.now() - new Date(sonTarih).getTime()) / 86400000) >= 90;
  });
  const fiyatiGuncellenmesiGerekenler = aktifParcalar.filter((p) => R.hedefKarAltindaMi(p, db.hedefKarAyari));
  const [acikUyariListesi, setAcikUyariListesi] = R.useState(null);

  // --- Finans Özeti ------------------------------------------------------------
  const nakitToplami = db.hesaplar.filter((h) => h.tip === "Nakit Kasa").reduce((t, h) => t + (h.bakiye || 0), 0);
  const posToplami = db.hesaplar.filter((h) => h.tip === "Kredi Kartı / POS").reduce((t, h) => t + (h.bakiye || 0), 0);
  const bankaToplami = db.hesaplar.filter((h) => h.tip === "Banka Hesabı" || h.tip === "Havale / EFT").reduce((t, h) => t + (h.bakiye || 0), 0);
  const bugunTahsilat = db.kasaIslemleri.filter((k) => k.yon === "tahsilat" && k.durum !== "İptal Edildi" && R.tarihGoster(k.tarih) === bugunTarih).reduce((t, k) => t + k.tutar, 0);
  const bugunOdeme = db.kasaIslemleri.filter((k) => k.yon === "odeme" && k.durum !== "İptal Edildi" && R.tarihGoster(k.tarih) === bugunTarih).reduce((t, k) => t + k.tutar, 0);
  const musteriVadesiGelen = db.cariler
    .filter((c) => c.bakiye > 0 && c.vadeGunu > 0)
    .filter((c) => {
      const sonBorc = c.hareketler.find((h) => h.tur === "borç");
      return sonBorc && Math.floor((Date.now() - new Date(sonBorc.tarih).getTime()) / 86400000) > c.vadeGunu;
    })
    .reduce((t, c) => t + c.bakiye, 0);
  const tedarikciVadesiGelen = db.malAlimlari
    .filter((m) => m.vadeTarihi && m.vadeTarihi < bugunIso)
    .reduce((t, m) => t + Math.max(0, (m.faturaGirilenToplam ?? m.hesaplananGenelToplam) - (m.odenenTutar || 0)), 0);

  // --- Uçtan uca mutabakat özeti -------------------------------------------
  // Salt-okuma kontroldür; veri değiştirmez. Yönetici panelinde görünen
  // güvenlik göstergesi için mevcut stok/finans zincirini tek noktadan tarar.
  const mutabakat = R.ucUcaMutabakatOzeti(db);
  const kritikMutabakat = mutabakat.bulgular.filter((b) => ["stok", "satis-odeme", "pos"].includes(b.tip)).slice(0, 5);

  // --- En çok satanlar (bugün) --------------------------------------------------
  const enCokSatanlar = (() => {
    const harita = {};
    bugunKalemler.forEach((k) => {
      if (!harita[k.parcaId]) harita[k.parcaId] = { ad: k.ad, marka: k.marka, adet: 0 };
      harita[k.parcaId].adet += k.adet;
    });
    return Object.values(harita).sort((a, b) => b.adet - a.adet).slice(0, 10);
  })();

  const kutu = (etiket, deger, ton = "graphite") => (
    <R.Kart className="p-4">
      <div className="text-xs" style={{ color: R.T.ink500 }}>
        {etiket}
      </div>
      <div className="text-xl font-semibold mt-1" style={{ ...R.DISPLAY, color: ton === "green" ? R.T.green : ton === "red" ? R.T.red : R.T.ink900 }}>
        {deger}
      </div>
    </R.Kart>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Global arama */}
      <div className="relative">
        <R.Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
        <input
          value={globalArama}
          onChange={(e) => setGlobalArama(e.target.value)}
          placeholder="OEM / stok kodu / barkod / ürün adı / müşteri / tedarikçi ara…"
          className="w-full pl-11 pr-4 py-3.5 rounded-lg border text-base outline-none focus:ring-2"
          style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
        />
        {globalArama.trim() && globalSonucVarMi && (
          <R.Kart className="absolute z-30 left-0 right-0 top-full mt-1 overflow-hidden max-h-96 overflow-y-auto">
            {globalSonuclar.urunler.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-semibold uppercase" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  Ürünler
                </div>
                {globalSonuclar.urunler.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSekme("stok")}
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50"
                    style={{ borderTop: `1px solid ${R.T.steel200}` }}
                  >
                    <span style={{ color: R.T.ink900 }}>
                      {p.ad} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {p.stokKodu}</span>
                    </span>
                    <span style={R.MONO}>{R.tl(p.satisFiyati)}</span>
                  </button>
                ))}
              </div>
            )}
            {globalSonuclar.musteriler.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-semibold uppercase" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  Müşteriler
                </div>
                {globalSonuclar.musteriler.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSekme("musteri")}
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50"
                    style={{ borderTop: `1px solid ${R.T.steel200}` }}
                  >
                    <span style={{ color: R.T.ink900 }}>{c.ad}</span>
                    <span className="text-xs" style={{ color: R.T.ink500 }}>
                      {c.telefon}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {globalSonuclar.tedarikciler.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-semibold uppercase" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  Tedarikçiler
                </div>
                {globalSonuclar.tedarikciler.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSekme("tedarikci")}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    style={{ borderTop: `1px solid ${R.T.steel200}`, color: R.T.ink900 }}
                  >
                    {t.ad}
                  </button>
                ))}
              </div>
            )}
          </R.Kart>
        )}
      </div>

      {/* Bugünkü hızlı özet */}
      <div>
        <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Bugün — {bugunTarih}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kutu("Bugünkü Ciro", R.tl(bugunCiro))}
          {kutu("Bugünkü Brüt Kâr", R.tl(bugunKar), bugunKar >= 0 ? "green" : "red")}
          {kutu("Bugünkü Satış Adedi", bugunSatislar.length)}
          {kutu("Kasa (Toplam)", R.tl(kasaToplami))}
          {kutu("Müşteri Alacağı", R.tl(musteriAlacagi), musteriAlacagi > 0 ? "red" : "graphite")}
          {kutu("Tedarikçi Borcu", R.tl(tedarikciBorcu), tedarikciBorcu > 0 ? "red" : "graphite")}
        </div>
      </div>

      {/* Uçtan uca sistem mutabakatı */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Sistem Mutabakatı
          </h2>
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              background: mutabakat.temiz ? "#dcfce7" : "#fee2e2",
              color: mutabakat.temiz ? "#166534" : "#991b1b",
            }}
          >
            {mutabakat.temiz ? "TEMİZ" : `${mutabakat.bulguSayisi} BULGU`}
          </span>
        </div>
        <R.Kart className="p-4">
          {mutabakat.temiz ? (
            <div className="flex items-center gap-3">
              <div className="text-2xl">✓</div>
              <div>
                <div className="font-semibold text-sm" style={{ color: R.T.green }}>
                  Stok, satış/ödeme ve POS zincirinde mutabakat sağlandı.
                </div>
                <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                  Son kontrol: {new Date().toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold" style={{ color: R.T.red }}>
                {mutabakat.kritik} kritik bulgu tespit edildi.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {kritikMutabakat.map((b, i) => (
                  <div key={`${b.id}-${i}`} className="rounded-md border p-2.5" style={{ borderColor: R.T.steel300 }}>
                    <div className="text-xs font-semibold" style={{ color: R.T.ink900 }}>
                      {b.tip === "stok" ? "Stok" : b.tip === "pos" ? "POS" : b.tip === "satis-odeme" ? "Satış / Ödeme" : "İade"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      {b.mesaj}
                    </div>
                    <div className="text-[11px] mt-1" style={R.MONO}>
                      {b.id}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                Ayrıntılı mutabakat denetimi yönetici ekranına bağlanabilir.
              </div>
            </div>
          )}
        </R.Kart>
      </div>

      {/* Hızlı işlemler */}
      <div className="flex flex-wrap gap-2">
        {[
          { ad: "+ Yeni Satış", sekme: "satis", ikon: R.ShoppingCart },
          { ad: "+ Yeni Alış", sekme: "alis", ikon: R.Truck },
          { ad: "+ Müşteri", sekme: "musteri", ikon: R.Users },
          { ad: "+ Ürün", sekme: "stok", ikon: R.Package },
          { ad: "Tahsilat", sekme: "kasa", ikon: R.ArrowDownCircle },
          { ad: "Ödeme", sekme: "kasa", ikon: R.ArrowUpCircle },
          { ad: "Stok Sayımı", sekme: "sayim", ikon: R.ClipboardList },
        ].map((h) => {
          const Ikon = h.ikon;
          return (
            <button
              key={h.ad}
              onClick={() => setSekme(h.sekme)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold"
              style={{ background: R.T.graphite900, color: "#fff" }}
            >
              <Ikon size={15} />
              {h.ad}
            </button>
          );
        })}
      </div>

      {/* Stok uyarıları */}
      <div>
        <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Stok Uyarıları
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { etiket: "Kritik Stok", emoji: "🔴", liste: kritikStoklar },
            { etiket: "Stokta Olmayan", emoji: "🔴", liste: stoktaOlmayanlar },
            { etiket: "Uzun Süredir Satılmayan (90+ gün)", emoji: "🟠", liste: uzunSuredirSatilmayanlar },
            { etiket: "Fiyatı Güncellenmesi Gereken", emoji: "🟡", liste: fiyatiGuncellenmesiGerekenler },
          ].map((u) => (
            <button key={u.etiket} onClick={() => setAcikUyariListesi(u)} className="text-left">
              <R.Kart className="p-3.5">
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  {u.etiket}
                </div>
                <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: u.liste.length > 0 ? R.T.red : R.T.ink900 }}>
                  {u.emoji} {u.liste.length} ürün
                </div>
              </R.Kart>
            </button>
          ))}
        </div>
      </div>

      {/* Müşteri siparişi uyarıları */}
      {(() => {
        const bekleyenMusteriSayisi = new Set(db.musteriSiparisleri.filter((s) => s.durum === "Bekliyor").map((s) => s.musteriAdi)).size;
        const teslimBekleyenSayisi = db.musteriSiparisleri.filter((s) => s.durum === "Ürün Geldi").length;
        if (bekleyenMusteriSayisi === 0 && teslimBekleyenSayisi === 0) return null;
        return (
          <div>
            <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Müşteri Siparişleri
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bekleyenMusteriSayisi > 0 && (
                <button onClick={() => setSekme("musterisiparisi")} className="text-left">
                  <R.Kart className="p-3.5">
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      Bekleyen Müşteri Siparişi
                    </div>
                    <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
                      🔴 {bekleyenMusteriSayisi} müşterinin bekleyen siparişi var
                    </div>
                  </R.Kart>
                </button>
              )}
              {teslimBekleyenSayisi > 0 && (
                <button onClick={() => setSekme("musterisiparisi")} className="text-left">
                  <R.Kart className="p-3.5">
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      Teslim Bekleyen
                    </div>
                    <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.green }}>
                      🟢 {teslimBekleyenSayisi} sipariş müşteriye teslim edilmeyi bekliyor
                    </div>
                  </R.Kart>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Satış Özeti (tarih seçimli) */}
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Satış Özeti
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
              {[
                { id: "bugun", ad: "Bugün" },
                { id: "dun", ad: "Dün" },
                { id: "hafta", ad: "Bu Hafta" },
                { id: "ay", ad: "Bu Ay" },
                { id: "gecenAy", ad: "Geçen Ay" },
                { id: "ozel", ad: "Özel Tarih" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTarihSecimi(t.id)}
                  className="px-2.5 py-1.5 text-xs font-semibold"
                  style={{ background: tarihSecimi === t.id ? R.T.graphite900 : "#fff", color: tarihSecimi === t.id ? "#fff" : R.T.ink500 }}
                >
                  {t.ad}
                </button>
              ))}
            </div>
            {tarihSecimi === "ozel" && (
              <>
                <input type="date" value={ozelBaslangic} onChange={(e) => setOzelBaslangic(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                <input type="date" value={ozelBitis} onChange={(e) => setOzelBitis(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kutu("Toplam Ciro", R.tl(araliktakiToplamCiro))}
          {kutu("Toplam Kâr", R.tl(araliktakiKar), araliktakiKar >= 0 ? "green" : "red")}
          {kutu("Kâr Marjı", araliktakiKarMarji !== null ? `%${araliktakiKarMarji.toFixed(1)}` : "—")}
          {kutu("Satış Adedi", araliktakiSatislar.length)}
          {kutu("Ortalama Sepet", R.tl(araliktakiOrtalamaSepet))}
          {kutu("İskonto Tutarı", R.tl(araliktakiIskonto))}
          {kutu("İade Tutarı", R.tl(araliktakiIade), araliktakiIade > 0 ? "red" : "graphite")}
        </div>
      </div>

      {/* Toplam Stok Sermayesi (56. adım, 1. madde) — "Ana panelde görünsün" */}
      {(() => {
        const aktifParcalarOzet = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set");
        const ozet = R.stokDegerlemeOzetiHesapla(db, aktifParcalarOzet);
        if (ozet.toplamMaliyet === 0) return null;
        const oluStokParcalari = aktifParcalarOzet.filter((p) => (p.stok || 0) > 0 && R.satisHiziSiniflandir(db, p) === "Ölü Stok");
        const oluStokDegeri = oluStokParcalari.reduce((t, p) => t + (p.stok || 0) * R.gecerliMaliyet(p, db), 0);
        return (
          <div>
            <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Toplam Stok Sermayesi
            </h2>
            <button onClick={() => setSekme("raporlar")} className="text-left w-full">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {kutu("Toplam Stok Maliyeti", R.tl(ozet.toplamMaliyet))}
                {kutu("Tahmini Satış Değeri", R.tl(ozet.toplamSatisDegeri))}
                {kutu("Potansiyel Brüt Kâr", R.tl(ozet.potansiyelKar), "green")}
                {kutu("Satılabilir Stok Değeri", R.tl(ozet.satilabilirMaliyet))}
              </div>
            </button>
            {oluStokDegeri > 0 && (
              <button onClick={() => setSekme("olustok")} className="text-left w-full mt-3">
                <R.Kart className="p-3.5" style={{ background: "#F9DEDE" }}>
                  <div className="text-xs" style={{ color: R.T.red }}>
                    🔴 Ölü Stok — {oluStokParcalari.length} ürün
                  </div>
                  <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
                    Bağlı sermaye: {R.tl(oluStokDegeri)}
                  </div>
                </R.Kart>
              </button>
            )}
          </div>
        );
      })()}

      {/* Kargo/Teslimat uyarıları (51. adım, 7. madde) */}
      {(() => {
        const teslimBekleyen = db.teslimatlar.filter((t) => t.durum === "Kargoya Verildi" || t.durum === "Dağıtımda").length;
        const teslimEdilemeyen = db.teslimatlar.filter((t) => t.durum === "İade Edildi").length;
        if (teslimBekleyen === 0 && teslimEdilemeyen === 0) return null;
        return (
          <div>
            <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Kargo / Teslimat
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teslimBekleyen > 0 && (
                <button onClick={() => setSekme("kargo")} className="text-left">
                  <R.Kart className="p-3.5">
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      Teslim Bekleyen Kargo
                    </div>
                    <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: "#8A6110" }}>
                      🟠 {teslimBekleyen} kargo teslim bekliyor
                    </div>
                  </R.Kart>
                </button>
              )}
              {teslimEdilemeyen > 0 && (
                <button onClick={() => setSekme("kargo")} className="text-left">
                  <R.Kart className="p-3.5">
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      Teslim Edilemeyen
                    </div>
                    <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
                      🔴 {teslimEdilemeyen} kargo teslim edilemedi
                    </div>
                  </R.Kart>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Günlük otomatik özet — Gün Sonu ekranına kısayol (47. adım, 8. madde) */}
      {(() => {
        const gunOzeti = R.gunSonuOzetiHesapla(db, bugunIso);
        const buGunKapali = R.gunKapaliMi(db, bugunIso);
        const kapaliKayit = db.gunSonlari.find((g) => g.tarih === bugunIso && g.durum === "Kapalı");
        const kasaFarki = kapaliKayit ? kapaliKayit.kasaSayimlari.reduce((t, k) => t + k.fark, 0) : null;
        if (gunOzeti.satisAdedi === 0) return null;
        return (
          <button onClick={() => setSekme("gunsonu")} className="text-left">
            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                  Bugünkü Özet {buGunKapali && <R.Rozet tone="steel">Gün Kapalı</R.Rozet>}
                </h4>
                <span className="text-xs" style={{ color: R.T.orangeDark }}>
                  Gün Sonu'na Git →
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div>
                  Bugünkü Ciro: <strong style={R.MONO}>{R.tl(gunOzeti.toplamSatis)}</strong>
                </div>
                <div>
                  Brüt Kâr: <strong style={{ ...R.MONO, color: R.T.green }}>{R.tl(gunOzeti.brutKar)}</strong>
                </div>
                <div>
                  Nakit: <strong style={R.MONO}>{R.tl(gunOzeti.nakitSatis)}</strong>
                </div>
                <div>
                  Kart: <strong style={R.MONO}>{R.tl(gunOzeti.krediKarti)}</strong>
                </div>
                <div>
                  Havale: <strong style={R.MONO}>{R.tl(gunOzeti.havaleEft)}</strong>
                </div>
                {kasaFarki !== null && (
                  <div>
                    Kasa Farkı:{" "}
                    <strong style={{ ...R.MONO, color: Math.abs(kasaFarki) < 0.5 ? R.T.green : R.T.red }}>
                      {kasaFarki >= 0 ? "+" : ""}
                      {R.tl(kasaFarki)}
                    </strong>
                  </div>
                )}
              </div>
            </R.Kart>
          </button>
        );
      })()}

      {/* Finans özeti */}
      <div>
        <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Finans Özeti
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kutu("Nakit", R.tl(nakitToplami))}
          {kutu("POS Toplamı", R.tl(posToplami))}
          {kutu("Banka / Havale", R.tl(bankaToplami))}
          {kutu("Günlük Tahsilat", R.tl(bugunTahsilat), "green")}
          {kutu("Günlük Ödeme", R.tl(bugunOdeme), "red")}
          {kutu("Vadesi Gelen Müşteri Alacağı", R.tl(musteriVadesiGelen), musteriVadesiGelen > 0 ? "red" : "graphite")}
          {kutu("Vadesi Gelen Tedarikçi Borcu", R.tl(tedarikciVadesiGelen), tedarikciVadesiGelen > 0 ? "red" : "graphite")}
        </div>
      </div>

      {/* Vade uyarıları — Bugün tahsil/ödeme + önümüzdeki 7 gün */}
      {(() => {
        const bugunIso = R.isoGun(bugunTarih);
        const bugunTahsilGereken = db.cariler.flatMap((c) => R.musteriAcikFaturalariFifo(db, c)).filter((f) => f.kalan > 0.01 && f.vadeTarihi === bugunIso).reduce((t, f) => t + f.kalan, 0);
        const bugunOdemeGereken = db.tedarikciler.flatMap((t) => R.tedarikciAcikFaturalari(db, t.ad)).filter((m) => m.vadeTarihi === bugunIso).reduce((t, m) => t + m.kalanBorc, 0);
        const yediGunNakit = R.nakitAkisiHesapla(db, 7);
        if (bugunTahsilGereken === 0 && bugunOdemeGereken === 0 && yediGunNakit.beklenenTahsilat === 0 && yediGunNakit.beklenenOdeme === 0) return null;
        return (
          <div>
            <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Vade Uyarıları
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {bugunTahsilGereken > 0 && (
                <button onClick={() => setSekme("vadetakip")} className="text-left">
                  <R.Kart className="p-3.5">
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      Bugün Tahsil Edilmesi Gereken
                    </div>
                    <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
                      🔴 {R.tl(bugunTahsilGereken)}
                    </div>
                  </R.Kart>
                </button>
              )}
              {bugunOdemeGereken > 0 && (
                <button onClick={() => setSekme("vadetakip")} className="text-left">
                  <R.Kart className="p-3.5">
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      Bugün Ödenmesi Gereken
                    </div>
                    <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.red }}>
                      🔴 {R.tl(bugunOdemeGereken)}
                    </div>
                  </R.Kart>
                </button>
              )}
              <button onClick={() => setSekme("vadetakip")} className="text-left">
                <R.Kart className="p-3.5">
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Önümüzdeki 7 Gün (Alacak + Borç)
                  </div>
                  <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: "#8A6110" }}>
                    🟠 {R.tl(yediGunNakit.beklenenTahsilat + yediGunNakit.beklenenOdeme)}
                  </div>
                </R.Kart>
              </button>
            </div>
          </div>
        );
      })()}

      {/* En çok satanlar */}
      <div>
        <h2 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Bugünün En Çok Satan 10 Ürünü
        </h2>
        <R.Kart className="p-4">
          {enCokSatanlar.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Bugün henüz satış yapılmadı.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {enCokSatanlar.map((x, i) => (
                <div key={i} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>
                    {i + 1}. {x.marka} {x.ad}
                  </span>
                  <span className="font-semibold" style={R.MONO}>
                    {x.adet} adet
                  </span>
                </div>
              ))}
            </div>
          )}
        </R.Kart>
      </div>

      {/* Uyarı liste detay modalı */}
      {acikUyariListesi && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setAcikUyariListesi(null)}>
          <div className="w-full max-w-lg rounded-lg overflow-hidden" style={{ background: "#fff", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {acikUyariListesi.emoji} {acikUyariListesi.etiket} ({acikUyariListesi.liste.length})
              </h3>
              <button onClick={() => setAcikUyariListesi(null)} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-2" style={{ maxHeight: "70vh" }}>
              {acikUyariListesi.liste.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: R.T.ink500 }}>
                  Bu kritere uyan ürün yok.
                </p>
              ) : (
                acikUyariListesi.liste.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setAcikUyariListesi(null);
                      setSekme("stok");
                    }}
                    className="w-full text-left flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-50"
                  >
                    <span style={{ color: R.T.ink900 }}>{p.ad}</span>
                    <span style={{ ...R.MONO, color: R.T.ink500 }}>
                      {p.stok} {p.birim}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function YoneticiPaneliSayfasi({ db, setSekme, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("genel");
  const [donemId, setDonemId] = R.useState("ay");
  const bugunIso = R.isoGun(new Date());
  const [baslangic, bitis] = R.yoneticiPaneliDonemAraligi(donemId);

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set");
  const donemSatislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= baslangic && s.tarih.slice(0, 10) <= bitis);
  const donemKalemler = donemSatislar.flatMap((s) => s.kalemler);
  const kademeler = R.karKademeleriHesapla(db, donemKalemler, baslangic, bitis);
  const stokOzeti = R.stokDegerlemeOzetiHesapla(db, aktifParcalar);
  const bugunOzeti = R.gunSonuOzetiHesapla(db, bugunIso);
  // Faz 43: Yönetici finans paneli için tek, merkezi dönem kâr standardı.
  // KPI'lar satış ekranındaki alternatif hesaplardan bağımsız olarak bu motoru referans alır.
  const donemFinans = R.donemKarOzetiHesapla(db, baslangic, bitis);
  const sistemMutabakat = R.ucUcaMutabakatOzeti(db);
  const finansTutarlilik = R.finansTutarlilikOzeti(db);
  const yoneticiSistemTemiz = sistemMutabakat.temiz && finansTutarlilik.temiz;

  const yazdir = () => window.print();

  const ayBaslangic = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA");
  const ayCiro = db.satislar
    .filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= ayBaslangic)
    .reduce((t, s) => t + (s.genelToplam || 0), 0);

  const musteriAlacagi = db.cariler.reduce((t, c) => t + Math.max(0, c.bakiye || 0), 0);
  const tedarikciBorcu = db.tedarikciler.reduce((t, x) => t + Math.max(0, x.bakiye || 0), 0);
  const kasa = db.hesaplar.filter((h) => h.tip === "Nakit Kasa").reduce((t, h) => t + (h.bakiye || 0), 0);
  const banka = db.hesaplar.filter((h) => h.tip !== "Nakit Kasa").reduce((t, h) => t + (h.bakiye || 0), 0);

  const kritikler = aktifParcalar
    .filter((p) => (p.stok || 0) <= (p.kritikSeviye || 0))
    .sort((a, b) => (a.stok || 0) - (b.stok || 0))
    .slice(0, 5);

  const oluStok = aktifParcalar
    .filter((p) => (p.stok || 0) > 0 && R.satisHiziSiniflandir(db, p) === "Ölü Stok")
    .sort((a, b) => (b.stok || 0) * R.gecerliMaliyet(b, db) - (a.stok || 0) * R.gecerliMaliyet(a, db))
    .slice(0, 5);

  const grupla = (fn, valueFn) => {
    const h = {};
    donemKalemler.forEach((k) => {
      const key = fn(k);
      if (!key) return;
      h[key] = (h[key] || 0) + valueFn(k);
    });
    return Object.entries(h).map(([ad, deger]) => ({ ad, deger })).sort((a, b) => b.deger - a.deger).slice(0, 5);
  };

  const enCokSatan = grupla((k) => k.ad, (k) => k.adet || 0);
  const enCokKar = grupla((k) => k.ad, (k) => R.satisKalemiKarBilgisi(k).karToplam || 0);

  const sonSatislar = [...db.satislar]
    .filter((s) => s.durum !== "İptal Edildi")
    .sort((a, b) => String(b.tarih).localeCompare(String(a.tarih)))
    .slice(0, 5);

  const sonAlislar = [...db.malAlimlari]
    .sort((a, b) => String(b.faturaTarihi || "").localeCompare(String(a.faturaTarihi || "")))
    .slice(0, 5);

  const donemCiro = donemSatislar.reduce((t, s) => t + (s.genelToplam || 0), 0);

  // Yönetici hızlı KPI'ları seçili dönemden bağımsız olarak daima güncel
  // işletme durumunu gösterir. Böylece yönetici tek bakışta "şu an ne
  // oluyor?" sorusunun cevabını görür; alt bölümdeki dönem KPI'ları ise
  // seçilen Bugün/Hafta/Ay/Yıl analizini korur.
  const bugunCiro = bugunOzeti.toplamSatis || 0;
  const buAyCiro = ayCiro || 0;
  const stokMaliyeti = stokOzeti.toplamMaliyet || 0;

  // Önceki dönem karşılaştırması: aynı uzunluktaki bir önceki dönem ile
  // ciro, satış adedi, brüt kâr ve ortalama sepet değişimini gösterir.
  const oncekiDonem = (() => {
    const start = new Date(`${baslangic}T00:00:00`);
    const end = new Date(`${bitis}T00:00:00`);
    const gunSayisi = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const oncekiBitis = new Date(start.getTime() - 86400000);
    const oncekiBaslangic = new Date(oncekiBitis.getTime() - (gunSayisi - 1) * 86400000);
    return {
      baslangic: oncekiBaslangic.toLocaleDateString("en-CA"),
      bitis: oncekiBitis.toLocaleDateString("en-CA"),
    };
  })();
  const donemKarsilastirma = R.donemKarsilastir(db, baslangic, bitis, oncekiDonem.baslangic, oncekiDonem.bitis);

  const degisimRozeti = (yuzde) => {
    const n = Number(yuzde || 0);
    if (!Number.isFinite(n) || n === 0) return { metin: "%0", renk: R.T.ink500, bg: R.T.steel100 };
    return {
      metin: `${n > 0 ? "+" : ""}${n.toFixed(1)}%`,
      renk: n > 0 ? "#15803D" : "#DC2626",
      bg: n > 0 ? "#ECFDF3" : "#FEF2F2",
    };
  };

  const gunlukSeri = (() => {
    const gunler = Math.min(14, Math.max(1, Math.round((new Date(bitis) - new Date(baslangic)) / 86400000) + 1));
    const seri = [];
    for (let i = gunler - 1; i >= 0; i--) {
      const gun = new Date(Date.now() - i * 86400000).toLocaleDateString("en-CA");
      const ciro = donemSatislar.filter((s) => s.tarih.slice(0, 10) === gun).reduce((t, s) => t + (s.genelToplam || 0), 0);
      seri.push({ gun, ciro });
    }
    return seri;
  })();

  const toplamAlacakBorc = musteriAlacagi + tedarikciBorcu;
  const alacakOran = toplamAlacakBorc > 0 ? (musteriAlacagi / toplamAlacakBorc) * 100 : 50;

  const renkliKart = (ikon, baslik, deger, ton = "green", alt = "Dönem özeti") => {
    const TonIkon = ikon;
    const tonlar = {
      green: { bg: "#ECFDF3", fg: "#15803D" },
      blue: { bg: "#EFF6FF", fg: "#2563EB" },
      red: { bg: "#FEF2F2", fg: "#DC2626" },
      orange: { bg: "#FFF7ED", fg: "#EA580C" },
      purple: { bg: "#FAF5FF", fg: "#9333EA" },
      steel: { bg: "#F1F5F9", fg: "#475569" },
    };
    const c = tonlar[ton] || tonlar.green;
    return (
      <R.Kart className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium" style={{ color: R.T.ink500 }}>{baslik}</div>
            <div className="text-lg font-bold mt-1" style={{ ...R.MONO, color: R.T.ink900 }}>{typeof deger === "number" ? R.tl(deger) : deger}</div>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg, color: c.fg }}>
            <TonIkon size={17} />
          </div>
        </div>
        <div className="text-[10px] mt-2" style={{ color: R.T.ink500 }}>{alt}</div>
      </R.Kart>
    );
  };

  return (
    <div className="akcan-manager flex flex-col gap-5">
      {/* Yönetici başlığı */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "#166534" }}>AKCAN GROUP OTOMOTİV</div>
          <h2 className="text-2xl font-bold mt-1" style={{ color: R.T.ink900, letterSpacing: "-.03em" }}>Yönetici Kontrol Paneli</h2>
          <p className="text-xs mt-1" style={{ color: R.T.ink500 }}>Genel işletme özeti · {R.tarihGoster(baslangic)} – {R.tarihGoster(bitis)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border bg-white" style={{ borderColor: R.T.steel200 }}>
            {[
              { id: "gun", ad: "Bugün" },
              { id: "hafta", ad: "Bu Hafta" },
              { id: "ay", ad: "Bu Ay" },
              { id: "yil", ad: "Bu Yıl" },
            ].map((d) => (
              <button key={d.id} onClick={() => setDonemId(d.id)} className="px-3 py-2 text-xs font-semibold" style={{ background: donemId === d.id ? "#14532D" : "#fff", color: donemId === d.id ? "#fff" : R.T.ink500 }}>
                {d.ad}
              </button>
            ))}
          </div>
          <button onClick={yazdir} className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white border" style={{ borderColor: R.T.steel200, color: R.T.ink900 }}>
            <R.Printer size={14} /> Yazdır / PDF
          </button>
        </div>
      </div>

      {/* Alt sekmeler — mevcut fonksiyonlar korunuyor */}
      <div className="flex flex-wrap rounded-xl overflow-hidden border bg-white" style={{ borderColor: R.T.steel200 }}>
        {[
          { id: "genel", ad: "Genel Bakış" },
          { id: "stok", ad: "Stok" },
          { id: "satis", ad: "Satış Performansı" },
          { id: "satinalma", ad: "Satın Alma" },
          { id: "cari", ad: "Cari / Finans" },
          { id: "personel", ad: "Personel" },
          { id: "alarm", ad: "Alarm Merkezi" },
          { id: "karsilastirma", ad: "Karşılaştırma" },
        ].map((s) => (
          <button key={s.id} onClick={() => setAltSekme(s.id)} className="flex-1 min-w-[120px] py-2.5 text-xs font-semibold whitespace-nowrap px-3" style={{ background: altSekme === s.id ? "#14532D" : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}>
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "genel" && (
        <div className="flex flex-col gap-5">
          {/* Sabit yönetici özeti — seçili dönemden bağımsız canlı işletme görünümü */}
          <R.Kart className="p-4" style={{ border: `1px solid ${R.T.steel200}` }}>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Yönetici Hızlı Özeti</h3>
                <p className="text-[11px] mt-0.5" style={{ color: R.T.ink500 }}>Bugünkü ve aylık işletme durumunu tek bakışta gösterir.</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#ECFDF3", color: "#166534" }}>CANLI VERİ</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5">
              {[
                { ad: "Bugünkü Ciro", deger: bugunCiro, ikon: R.TrendingUp, ton: "#15803D", aciklama: "Bugün" },
                { ad: "Bu Ayki Ciro", deger: buAyCiro, ikon: R.BarChart3, ton: "#2563EB", aciklama: "Ay başından beri" },
                { ad: "Brüt Kâr", deger: donemFinans.brutKar, ikon: R.LineChart, ton: "#166534", aciklama: "Seçili dönem" },
                { ad: "Net Faaliyet Kârı", deger: donemFinans.netFaaliyetKari, ikon: R.LineChart, ton: donemFinans.netFaaliyetKari >= 0 ? "#15803D" : "#DC2626", aciklama: "Seçili dönem" },
                { ad: "Toplam Gider", deger: donemFinans.faaliyetGideriKdvHaric, ikon: R.ArrowDownCircle, ton: "#DC2626", aciklama: "KDV hariç" },
                { ad: "Müşteri Alacağı", deger: musteriAlacagi, ikon: R.Users, ton: "#EA580C", aciklama: "Cari alacak" },
                { ad: "Tedarikçi Borcu", deger: tedarikciBorcu, ikon: R.Truck, ton: "#9333EA", aciklama: "Cari borç" },
                { ad: "Stok Maliyeti", deger: stokMaliyeti, ikon: R.Package, ton: "#475569", aciklama: "Mevcut stok" },
              ].map((x) => {
                const I = x.ikon;
                return (
                  <div key={x.ad} className="rounded-xl p-3" style={{ background: "#F8FAFC", border: `1px solid ${R.T.steel200}` }}>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fff", color: x.ton }}><I size={14} /></span>
                      <span className="text-[10px] font-semibold truncate" style={{ color: R.T.ink500 }}>{x.ad}</span>
                    </div>
                    <div className="text-sm font-bold mt-2 truncate" style={{ ...R.MONO, color: R.T.ink900 }}>{R.tl(x.deger)}</div>
                    <div className="text-[9px] mt-1" style={{ color: R.T.ink500 }}>{x.aciklama}</div>
                  </div>
                );
              })}
            </div>
          </R.Kart>

          {/* Önceki dönem karşılaştırması */}
          <R.Kart className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Dönem Performansı</h3>
                <p className="text-[11px] mt-0.5" style={{ color: R.T.ink500 }}>Seçili dönem ile bir önceki eş uzunluktaki dönem karşılaştırması.</p>
              </div>
              <span className="text-[10px] font-semibold" style={{ color: R.T.ink500 }}>{R.tarihGoster(oncekiDonem.baslangic)} – {R.tarihGoster(oncekiDonem.bitis)}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { ad: "Ciro", veri: donemKarsilastirma.ciro, tl: true },
                { ad: "Satış Adedi", veri: donemKarsilastirma.satisAdedi, tl: false },
                { ad: "Brüt Kâr", veri: donemKarsilastirma.brutKar, tl: true },
                { ad: "Ort. Sepet", veri: donemKarsilastirma.ortalamaSepet, tl: true },
              ].map((x) => {
                const rozet = degisimRozeti(x.veri.yuzde);
                return (
                  <div key={x.ad} className="rounded-xl p-3" style={{ background: "#fff", border: `1px solid ${R.T.steel200}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold" style={{ color: R.T.ink500 }}>{x.ad}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: rozet.renk, background: rozet.bg }}>{rozet.metin}</span>
                    </div>
                    <div className="text-base font-bold mt-2" style={{ ...R.MONO, color: R.T.ink900 }}>{x.tl ? R.tl(x.veri.g1) : x.veri.g1}</div>
                    <div className="text-[10px] mt-1" style={{ color: R.T.ink500 }}>Önceki: <b style={R.MONO}>{x.tl ? R.tl(x.veri.g2) : x.veri.g2}</b></div>
                  </div>
                );
              })}
            </div>
          </R.Kart>

          {/* Finansal KPI'lar */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {renkliKart(R.TrendingUp, "Net Ciro", donemFinans.netCiroKdvDahil, "green", "İadeler düşülmüş")}
            {renkliKart(R.Package, "SMM", donemFinans.smm, "orange", "Satılan malın maliyeti")}
            {renkliKart(R.BarChart3, "Brüt Kâr", donemFinans.brutKar, "green", "KDV hariç net ciro − SMM")}
            {renkliKart(R.LineChart, "Net Faaliyet Kârı", donemFinans.netFaaliyetKari, donemFinans.netFaaliyetKari >= 0 ? "blue" : "red", "POS komisyonu + faaliyet giderleri sonrası")}
            {renkliKart(R.CreditCard, "POS Komisyonu", donemFinans.posKomisyonu, "red", "Seçili dönem")}
            {renkliKart(R.ArrowDownCircle, "Faaliyet Gideri", donemFinans.faaliyetGideriKdvHaric, "red", "KDV hariç")}
            {renkliKart(R.Users, "Müşteri Alacağı", musteriAlacagi, "orange", "Cari alacak")}
            {renkliKart(R.Truck, "Tedarikçi Borcu", tedarikciBorcu, "purple", "Cari borç")}
          </div>

          <R.Kart className="p-4" style={{ border: `1px solid ${yoneticiSistemTemiz ? "#86EFAC" : "#FCA5A5"}` }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Finans & Sistem Durumu</h3>
                <p className="text-[11px] mt-0.5" style={{ color: R.T.ink500 }}>
                  Yönetici KPI'ları merkezi dönem kâr motorundan besleniyor.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{
                background: yoneticiSistemTemiz ? "#DCFCE7" : "#FEE2E2",
                color: yoneticiSistemTemiz ? "#166534" : "#991B1B"
              }}>
                {yoneticiSistemTemiz ? "✓ MUTABIK" : `⚠ ${sistemMutabakat.bulguSayisi + finansTutarlilik.toplamBulgu} BULGU`}
              </span>
            </div>
            {!yoneticiSistemTemiz && (
              <div className="mt-2 text-xs" style={{ color: R.T.red }}>
                Yönetici panelindeki finansal kararlar için önce Sistem Sağlığı ekranındaki bulgular incelenmelidir.
              </div>
            )}
          </R.Kart>

          {/* Grafik + nakit + alacak/borç */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr_1fr] gap-4">
            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Ciro & Kâr Grafiği</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: R.T.ink500 }}>Son {gunlukSeri.length} gün</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "#ECFDF3", color: "#166534" }}>₺ bazında</span>
              </div>
              <R.FiyatTrendGrafigi seriler={[
                { ad: "Ciro", renk: "#15803D", noktalar: gunlukSeri.map((g) => ({ tarih: g.gun, fiyat: g.ciro })) },
              ]} />
              <div className="mt-2 text-[11px]" style={{ color: R.T.ink500 }}>Dönem cirosu: <b style={{ color: R.T.ink900 }}>{R.tl(donemCiro)}</b></div>
            </R.Kart>

            <R.Kart className="p-4">
              <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Nakit Akış Özeti</h3>
              <p className="text-[11px] mt-0.5 mb-4" style={{ color: R.T.ink500 }}>Mevcut kasa ve banka bakiyeleri</p>
              {[
                { ad: "Kasa Bakiyesi", deger: kasa, ikon: R.Wallet, ton: "#15803D" },
                { ad: "Banka / POS", deger: banka, ikon: R.Landmark, ton: "#2563EB" },
                { ad: "Toplam Kullanılabilir", deger: kasa + banka, ikon: R.TrendingUp, ton: "#166534" },
              ].map((x) => {
                const I = x.ikon;
                return (
                  <div key={x.ad} className="flex items-center justify-between py-3 border-b last:border-b-0" style={{ borderColor: R.T.steel200 }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F1F5F9", color: x.ton }}><I size={15} /></div>
                      <span className="text-xs font-medium">{x.ad}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ ...R.MONO }}>{R.tl(x.deger)}</span>
                  </div>
                );
              })}
            </R.Kart>

            <R.Kart className="p-4">
              <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Alacak & Borç Dağılımı</h3>
              <p className="text-[11px] mt-0.5 mb-3" style={{ color: R.T.ink500 }}>Cari toplamları</p>
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 rounded-full shrink-0" style={{ background: `conic-gradient(#15803D 0 ${alacakOran}%, #DC2626 ${alacakOran}% 100%)`, boxShadow: "inset 0 0 0 20px #fff" }} />
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#15803D" }} /> Müşteri Alacağı</div>
                    <div className="font-bold text-sm mt-0.5" style={R.MONO}>{R.tl(musteriAlacagi)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[11px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#DC2626" }} /> Tedarikçi Borcu</div>
                    <div className="font-bold text-sm mt-0.5" style={R.MONO}>{R.tl(tedarikciBorcu)}</div>
                  </div>
                </div>
              </div>
            </R.Kart>
          </div>

          {/* Satış/stok zekâsı */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { baslik: "En Çok Satan 5 Ürün", liste: enCokSatan, format: (x) => `${x.deger} adet`, tone: "#15803D" },
              { baslik: "En Çok Kâr Bırakan 5 Ürün", liste: enCokKar, format: (x) => R.tl(x.deger), tone: "#166534" },
            ].map((blok) => (
              <R.Kart key={blok.baslik} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">{blok.baslik}</h3>
                  <span className="text-[10px] font-semibold" style={{ color: blok.tone }}>Bu dönem</span>
                </div>
                {blok.liste.length === 0 ? (
                  <div className="text-xs py-4" style={{ color: R.T.ink500 }}>Henüz veri yok.</div>
                ) : (
                  <div className="space-y-2">
                    {blok.liste.map((x, i) => (
                      <div key={x.ad} className="flex items-center gap-2">
                        <span className="w-5 text-[11px] font-bold" style={{ color: R.T.ink500 }}>{i + 1}</span>
                        <span className="flex-1 text-xs truncate">{x.ad}</span>
                        <span className="text-xs font-bold" style={{ ...R.MONO, color: blok.tone }}>{blok.format(x)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </R.Kart>
            ))}

            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Kritik Stoklar</h3>
                <span className="text-[10px] font-bold rounded-full px-2 py-1" style={{ background: "#FEF2F2", color: "#DC2626" }}>{kritikler.length}</span>
              </div>
              {kritikler.length === 0 ? <div className="text-xs py-4" style={{ color: R.T.ink500 }}>Kritik stok yok.</div> : (
                <div className="space-y-2">
                  {kritikler.map((p) => (
                    <button key={p.id} onClick={() => setSekme("stok")} className="w-full flex items-center gap-2 text-left">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#DC2626" }} />
                      <span className="flex-1 text-xs truncate">{p.ad}</span>
                      <span className="text-xs font-bold" style={{ ...R.MONO, color: "#DC2626" }}>{p.stok || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </R.Kart>

            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Ölü Stoklar (90+ gün)</h3>
                <span className="text-[10px] font-bold rounded-full px-2 py-1" style={{ background: "#FFF7ED", color: "#EA580C" }}>{oluStok.length}</span>
              </div>
              {oluStok.length === 0 ? <div className="text-xs py-4" style={{ color: R.T.ink500 }}>Ölü stok yok.</div> : (
                <div className="space-y-2">
                  {oluStok.map((p) => (
                    <button key={p.id} onClick={() => setSekme("olustok")} className="w-full flex items-center gap-2 text-left">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#EA580C" }} />
                      <span className="flex-1 text-xs truncate">{p.ad}</span>
                      <span className="text-xs font-bold" style={{ ...R.MONO, color: "#EA580C" }}>{R.tl((p.stok || 0) * R.gecerliMaliyet(p, db))}</span>
                    </button>
                  ))}
                </div>
              )}
            </R.Kart>
          </div>

          {/* Alt finansal özet */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {renkliKart(R.Wallet, "Kasa Bakiyesi", kasa, "green", "Nakit")}
            {renkliKart(R.Landmark, "Banka / POS", banka, "blue", "Banka hesapları")}
            {renkliKart(R.Package, "Stok Sermayesi", stokOzeti.toplamMaliyet, "steel", "Maliyet değeri")}
            {renkliKart(R.ShoppingCart, "Ortalama Sepet", donemSatislar.length ? donemCiro / donemSatislar.length : 0, "orange", "Dönem ortalaması")}
          </div>

          {/* Son hareketler */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm">Son 5 Satış</h3><button onClick={() => setSekme("satis")} className="text-[11px] font-semibold" style={{ color: "#166534" }}>Tümünü Gör →</button></div>
              <div className="space-y-2">
                {sonSatislar.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] w-16" style={{ color: R.T.ink500 }}>{R.tarihGoster(s.tarih)}</span>
                    <span className="flex-1 truncate">{s.musteriAdi || "Peşin Müşteri"}</span>
                    <span className="font-bold" style={R.MONO}>{R.tl(s.genelToplam || 0)}</span>
                  </div>
                ))}
                {sonSatislar.length === 0 && <div className="text-xs py-3" style={{ color: R.T.ink500 }}>Henüz satış yok.</div>}
              </div>
            </R.Kart>

            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm">Finansal Özet</h3><button onClick={() => setSekme("kasa")} className="text-[11px] font-semibold" style={{ color: "#166534" }}>Kasa →</button></div>
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs"><span>Bugünkü Ciro</span><b style={R.MONO}>{R.tl(bugunOzeti.toplamSatis)}</b></div>
                <div className="flex justify-between text-xs"><span>Bu Ayki Ciro</span><b style={R.MONO}>{R.tl(ayCiro)}</b></div>
                <div className="flex justify-between text-xs"><span>Net Faaliyet Kârı</span><b style={{ ...R.MONO, color: kademeler.netFaaliyetKari >= 0 ? "#15803D" : "#DC2626" }}>{R.tl(kademeler.netFaaliyetKari)}</b></div>
                <div className="flex justify-between text-xs"><span>Potansiyel Stok Kârı</span><b style={{ ...R.MONO, color: "#15803D" }}>{R.tl(stokOzeti.potansiyelKar)}</b></div>
              </div>
            </R.Kart>

            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm">Son 5 Alış</h3><button onClick={() => setSekme("alis")} className="text-[11px] font-semibold" style={{ color: "#166534" }}>Tümünü Gör →</button></div>
              <div className="space-y-2">
                {sonAlislar.map((a, i) => (
                  <div key={a.id || i} className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] w-16" style={{ color: R.T.ink500 }}>{R.tarihGoster(a.faturaTarihi)}</span>
                    <span className="flex-1 truncate">{a.tedarikciAdi || a.tedarikci || "Tedarikçi"}</span>
                    <span className="font-bold" style={R.MONO}>{R.tl(a.faturaGirilenToplam ?? a.hesaplananGenelToplam ?? 0)}</span>
                  </div>
                ))}
                {sonAlislar.length === 0 && <div className="text-xs py-3" style={{ color: R.T.ink500 }}>Henüz alış yok.</div>}
              </div>
            </R.Kart>
          </div>

          {/* Personel işlem günlüğü — yönetici için son hareketler */}
          <R.Kart className="p-4">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-sm">Son İşlemler</h3>
                <p className="text-[11px] mt-0.5" style={{ color: R.T.ink500 }}>Kim, ne yaptı? İşlem geçmişinden otomatik olarak gösterilir.</p>
              </div>
              <button onClick={() => setSekme("kullanicilar")} className="text-[11px] font-semibold" style={{ color: "#166534" }}>İşlem Geçmişi →</button>
            </div>
            {(() => {
              const sonIslemler = (db.islemGecmisi || []).slice().sort((a,b) => new Date(b.tarih || 0) - new Date(a.tarih || 0)).slice(0, 10);
              return sonIslemler.length === 0 ? (
                <div className="text-xs py-4" style={{ color: R.T.ink500 }}>Henüz kaydedilmiş işlem yok.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: R.T.steel200 }}>
                        <th className="text-left py-2 pr-3 font-semibold" style={{ color: R.T.ink500 }}>Tarih / Saat</th>
                        <th className="text-left py-2 pr-3 font-semibold" style={{ color: R.T.ink500 }}>Personel</th>
                        <th className="text-left py-2 pr-3 font-semibold" style={{ color: R.T.ink500 }}>İşlem</th>
                        <th className="text-left py-2 pr-3 font-semibold" style={{ color: R.T.ink500 }}>Açıklama</th>
                        <th className="text-left py-2 font-semibold" style={{ color: R.T.ink500 }}>Değişiklik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sonIslemler.map((i) => (
                        <tr key={i.id} className="border-b last:border-b-0" style={{ borderColor: R.T.steel100 }}>
                          <td className="py-2 pr-3 whitespace-nowrap" style={{ color: R.T.ink500 }}>{i.tarih ? new Date(i.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td className="py-2 pr-3 font-semibold whitespace-nowrap" style={{ color: R.T.ink900 }}>{i.kullaniciAdi || "Sistem"}</td>
                          <td className="py-2 pr-3 whitespace-nowrap"><span className="inline-flex px-2 py-1 rounded-full font-semibold" style={{ background: "#F0FDF4", color: "#166534" }}>{i.islemTuru || "İşlem"}</span></td>
                          <td className="py-2 pr-3 max-w-[340px] truncate" style={{ color: R.T.ink500 }}>{i.aciklama || "—"}</td>
                          <td className="py-2 max-w-[300px]" style={{ color: R.T.ink500 }}>
                            <div className="truncate">{i.eskiDeger || i.yeniDeger ? `${i.eskiDeger || "—"} → ${i.yeniDeger || "—"}` : "—"}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </R.Kart>
        </div>
      )}

      {altSekme === "stok" && <YonPanelStok db={db} aktifParcalar={aktifParcalar} stokOzeti={stokOzeti} setSekme={setSekme} />}
      {altSekme === "satis" && <YonPanelSatis db={db} donemSatislar={donemSatislar} donemKalemler={donemKalemler} baslangic={baslangic} bitis={bitis} />}
      {altSekme === "satinalma" && <YonPanelSatinAlma db={db} setSekme={setSekme} />}
      {altSekme === "cari" && <YonPanelCari db={db} setSekme={setSekme} />}
      {altSekme === "personel" && <YonPanelPersonel db={db} donemSatislar={donemSatislar} donemKalemler={donemKalemler} baslangic={baslangic} bitis={bitis} />}
      {altSekme === "alarm" && <YonPanelAlarm db={db} setSekme={setSekme} />}
      {altSekme === "karsilastirma" && <YonPanelKarsilastirma db={db} />}
    </div>
  );
}

export function YonPanelGenelBakis({ db, baslangic, bitis, bugunIso, kademeler, bugunOzeti, setSekme }) {
  const ayBaslangic = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA");
  const ayKarOzeti = R.donemKarOzetiHesapla(db, ayBaslangic, bugunIso);
  const ayCiro = ayKarOzeti.netCiroKdvDahil;
  const musteriAlacagi = db.cariler.reduce((t, c) => t + Math.max(0, c.bakiye || 0), 0);
  const tedarikciBorcu = db.tedarikciler.reduce((t, x) => t + Math.max(0, x.bakiye || 0), 0);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        ["Bugünkü Ciro", bugunOzeti.toplamSatis],
        ["Bu Ayki Ciro", ayCiro],
        ["Brüt Kâr", kademeler.iskontoSonrasiKar],
        ["Net Faaliyet Kârı", kademeler.netFaaliyetKari],
        ["Toplam Gider", kademeler.giderler],
        ["Müşteri Alacağı", musteriAlacagi],
        ["Tedarikçi Borcu", tedarikciBorcu],
      ].map(([ad, deger]) => (
        <R.Kart key={ad} className="p-4">
          <div className="text-xs" style={{ color: R.T.ink500 }}>{ad}</div>
          <div className="text-lg font-bold mt-1" style={{ ...R.MONO, color: R.T.ink900 }}>{R.tl(deger)}</div>
        </R.Kart>
      ))}
    </div>
  );
}

export function YonPanelStok({ db, aktifParcalar, stokOzeti, setSekme }) {
  const toplamAdet = aktifParcalar.reduce((t, p) => t + (p.stok || 0), 0);
  const kritikler = aktifParcalar.filter((p) => (p.stok || 0) > 0 && p.stok <= p.kritikSeviye);
  const stoktaOlmayan = aktifParcalar.filter((p) => (p.stok || 0) <= 0);
  const siniflar = ["Hızlı", "Normal", "Yavaş", "Ölü Stok"].map((s) => {
    const liste = aktifParcalar.filter((p) => (p.stok || 0) > 0 && R.satisHiziSiniflandir(db, p) === s);
    return { sinif: s, adet: liste.length, deger: liste.reduce((t, p) => t + (p.stok || 0) * R.gecerliMaliyet(p, db), 0) };
  });

  const kutu = (etiket, deger, ton) => (
    <div className="rounded-md p-3" style={{ background: R.T.steel100 }}>
      <div className="text-xs" style={{ color: R.T.ink500 }}>
        {etiket}
      </div>
      <div className="text-base font-semibold mt-0.5" style={{ ...R.MONO, color: ton === "red" ? R.T.red : R.T.ink900 }}>
        {typeof deger === "number" ? R.tl(deger) : deger}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <R.Kart className="p-4">
        <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
          Stok Özeti
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {kutu("Toplam Ürün Sayısı", aktifParcalar.length, "graphite")}
          {kutu("Toplam Stok Adedi", toplamAdet, "graphite")}
          {kutu("Stok Maliyet Değeri", stokOzeti.toplamMaliyet, "graphite")}
          {kutu("Tahmini Satış Değeri", stokOzeti.toplamSatisDegeri, "graphite")}
          {kutu("Potansiyel Brüt Kâr", stokOzeti.potansiyelKar, "green")}
          {kutu("Kritik Stok", `${kritikler.length} ürün`, "red")}
          {kutu("Stokta Olmayan", `${stoktaOlmayan.length} ürün`, "red")}
          {kutu("Rezerve Stok Değeri", stokOzeti.rezerveMaliyet, "graphite")}
        </div>
      </R.Kart>

      <button onClick={() => setSekme("olustok")} className="text-left">
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Stok Performansı — Hız Sınıfları
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {siniflar.map((s) => (
              <div key={s.sinif} className="rounded-md p-2.5 text-center" style={{ background: s.sinif === "Ölü Stok" ? "#F9DEDE" : R.T.steel100 }}>
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  {R.SATIS_HIZI_SINIF_GORSELI[s.sinif].emoji} {s.sinif}
                </div>
                <div className="text-sm font-semibold mt-0.5" style={R.MONO}>
                  {s.adet} ürün
                </div>
                <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                  {R.tl(s.deger)}
                </div>
              </div>
            ))}
          </div>
          {stokOzeti.oluStokGruplari["365+ gün"] > 0 && (
            <p className="text-sm font-semibold mt-2" style={{ color: R.T.red }}>
              🔴 {R.tl(stokOzeti.oluStokGruplari["365+ gün"])} sermaye 365+ gündür stokta bağlı.
            </p>
          )}
        </R.Kart>
      </button>
    </div>
  );
}

export function YonPanelSatis({ db, donemSatislar, donemKalemler, baslangic, bitis }) {
  const ortalamaSepet = donemSatislar.length > 0 ? donemSatislar.reduce((t, s) => t + s.genelToplam, 0) / donemSatislar.length : 0;

  const gruplaVeSirala = (anahtarFn, degerFn) => {
    const harita = {};
    donemKalemler.forEach((k) => {
      const anahtar = anahtarFn(k);
      if (!anahtar) return;
      harita[anahtar] = (harita[anahtar] || 0) + degerFn(k);
    });
    return Object.entries(harita).map(([anahtar, deger]) => ({ anahtar, deger })).sort((a, b) => b.deger - a.deger).slice(0, 8);
  };

  const enCokSatan = gruplaVeSirala((k) => k.ad, (k) => k.adet);
  const enCokKarBirakan = gruplaVeSirala((k) => k.ad, (k) => R.satisKalemiKarBilgisi(k).karToplam);
  const enCokCiroMarka = gruplaVeSirala((k) => k.marka, (k) => k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0));
  const kategoriBazinda = gruplaVeSirala((k) => db.parcalar.find((p) => p.id === k.parcaId)?.kategori, (k) => k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0));

  const gunlukSeri = (() => {
    const gunler = Math.min(30, Math.max(1, Math.round((new Date(bitis) - new Date(baslangic)) / 86400000) + 1));
    const seri = [];
    for (let i = gunler - 1; i >= 0; i--) {
      const gun = new Date(Date.now() - i * 86400000).toLocaleDateString("en-CA");
      const ciro = donemSatislar.filter((s) => s.tarih.slice(0, 10) === gun).reduce((t, s) => t + s.genelToplam, 0);
      seri.push({ gun, ciro });
    }
    return seri;
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <R.Kart className="p-3">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Dönem Ciro
          </div>
          <div className="text-base font-semibold" style={R.MONO}>
            {R.tl(donemSatislar.reduce((t, s) => t + s.genelToplam, 0))}
          </div>
        </R.Kart>
        <R.Kart className="p-3">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Satış Adedi
          </div>
          <div className="text-base font-semibold" style={R.MONO}>
            {donemSatislar.length}
          </div>
        </R.Kart>
        <R.Kart className="p-3">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Ortalama Sepet
          </div>
          <div className="text-base font-semibold" style={R.MONO}>
            {R.tl(ortalamaSepet)}
          </div>
        </R.Kart>
        <R.Kart className="p-3">
          <div className="text-xs" style={{ color: R.T.ink500 }}>
            Toplam Ürün Adedi
          </div>
          <div className="text-base font-semibold" style={R.MONO}>
            {donemKalemler.reduce((t, k) => t + k.adet, 0)}
          </div>
        </R.Kart>
      </div>

      {gunlukSeri.some((g) => g.ciro > 0) && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Günlük Ciro Trendi
          </h4>
          <R.FiyatTrendGrafigi seriler={[{ ad: "Ciro", renk: R.T.orange, noktalar: gunlukSeri.map((g) => ({ tarih: g.gun, fiyat: g.ciro })) }]} />
        </R.Kart>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { baslik: "En Çok Satan Ürünler", liste: enCokSatan, birim: "adet" },
          { baslik: "En Çok Kâr Bırakan Ürünler", liste: enCokKarBirakan, birim: "tl" },
          { baslik: "En Çok Ciro Yapan Markalar", liste: enCokCiroMarka, birim: "tl" },
          { baslik: "Kategori Bazlı Satış", liste: kategoriBazinda, birim: "tl" },
        ].map((blok) => (
          <R.Kart key={blok.baslik} className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              {blok.baslik}
            </h4>
            {blok.liste.length === 0 ? (
              <p className="text-sm" style={{ color: R.T.ink500 }}>
                Veri yok.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {blok.liste.map((x) => (
                  <div key={x.anahtar} className="flex items-center justify-between text-sm px-2 py-1.5 rounded" style={{ background: R.T.steel100 }}>
                    <span style={{ color: R.T.ink900 }}>{x.anahtar}</span>
                    <span className="font-semibold" style={R.MONO}>
                      {blok.birim === "adet" ? `${x.deger} adet` : R.tl(x.deger)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </R.Kart>
        ))}
      </div>
    </div>
  );
}

export function YonPanelSatinAlma({ db, setSekme }) {
  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set");
  const kritikler = aktifParcalar.filter((p) => (p.stok || 0) > 0 && p.stok <= p.kritikSeviye);
  const siparisOnerisiOlan = aktifParcalar.filter((p) => R.akilliSiparisOnerisiHesapla(db, p).onerilenAdet > 0);
  const bekleyenSiparisler = db.satinAlmaSiparisleri.filter((s) => s.durum === "Sipariş Verildi" || s.durum === "Kısmi Geldi");
  const bugunIso = R.isoGun(new Date());
  const gecikenSiparisler = bekleyenSiparisler.filter((s) => s.beklenenTeslimTarihi && s.beklenenTeslimTarihi < bugunIso);
  const ayBaslangic = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA");
  const buAyAlisToplami = db.malAlimlari.filter((m) => m.faturaTarihi >= ayBaslangic).reduce((t, m) => t + (m.faturaGirilenToplam ?? m.hesaplananGenelToplam), 0);

  const kutu = (etiket, deger, onClick, ton) => (
    <button onClick={onClick} className="text-left">
      <R.Kart className="p-3">
        <div className="text-xs" style={{ color: R.T.ink500 }}>
          {etiket}
        </div>
        <div className="text-base font-semibold mt-0.5" style={{ ...R.MONO, color: ton === "red" ? R.T.red : R.T.ink900 }}>
          {typeof deger === "number" && etiket.includes("Toplam") ? R.tl(deger) : deger}
        </div>
      </R.Kart>
    </button>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {kutu("Kritik Stoklar", `${kritikler.length} ürün`, () => setSekme("olustok"), "red")}
      {kutu("Sipariş Önerisi Olan", `${siparisOnerisiOlan.length} ürün`, () => setSekme("siparis"), undefined)}
      {kutu("Bekleyen Satın Alma Siparişi", `${bekleyenSiparisler.length} sipariş`, () => setSekme("satinalma"), undefined)}
      {kutu("Geciken Siparişler", `${gecikenSiparisler.length} sipariş`, () => setSekme("satinalma"), gecikenSiparisler.length > 0 ? "red" : undefined)}
      {kutu("Tedarikçi Fiyat Karşılaştırma", "Görüntüle →", () => setSekme("tedarikcikarsilastirma"), undefined)}
      {kutu("Bu Ayki Alış Toplamı", buAyAlisToplami, () => setSekme("alis"), undefined)}
    </div>
  );
}

export function YonPanelCari({ db, setSekme }) {
  const musteriler = db.cariler.filter((c) => (c.bakiye || 0) > 0).map((c) => ({ c, ozet: R.musteriAlacakOzeti(db, c) })).sort((a, b) => b.ozet.toplamBorc - a.ozet.toplamBorc);
  const tedarikciler = db.tedarikciler.filter((t) => (t.bakiye || 0) > 0).map((t) => ({ t, ozet: R.tedarikciBorcOzeti(db, t) })).sort((a, b) => b.ozet.toplamBorc - a.ozet.toplamBorc);
  const vadesiGecenMusteri = musteriler.filter((x) => x.ozet.vadesiGecen > 0);
  const yediGunNakit = R.nakitAkisiHesapla(db, 7);
  const otuzGunNakit = R.nakitAkisiHesapla(db, 30);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            En Yüksek Alacaklı Müşteriler
          </h4>
          {musteriler.slice(0, 5).map((x) => (
            <div key={x.c.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded mb-1" style={{ background: R.T.steel100 }}>
              <span style={{ color: R.T.ink900 }}>{x.c.ad}</span>
              <span className="font-semibold" style={R.MONO}>
                {R.tl(x.ozet.toplamBorc)}
              </span>
            </div>
          ))}
          {vadesiGecenMusteri.length > 0 && (
            <p className="text-xs font-semibold mt-1" style={{ color: R.T.red }}>
              🔴 {vadesiGecenMusteri.length} müşterinin vadesi geçmiş borcu var.
            </p>
          )}
        </R.Kart>
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            En Yüksek Borçlu Tedarikçiler
          </h4>
          {tedarikciler.slice(0, 5).map((x) => (
            <div key={x.t.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded mb-1" style={{ background: R.T.steel100 }}>
              <span style={{ color: R.T.ink900 }}>{x.t.ad}</span>
              <span className="font-semibold" style={R.MONO}>
                {R.tl(x.ozet.toplamBorc)}
              </span>
            </div>
          ))}
        </R.Kart>
      </div>

      <button onClick={() => setSekme("vadetakip")} className="text-left">
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Nakit Akışı Beklentisi
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { etiket: "Önümüzdeki 7 Gün", x: yediGunNakit },
              { etiket: "Önümüzdeki 30 Gün", x: otuzGunNakit },
            ].map((k) => (
              <div key={k.etiket} className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                <div className="text-xs mb-1" style={{ color: R.T.ink500 }}>
                  {k.etiket}
                </div>
                <div className="text-xs" style={{ color: R.T.green }}>
                  Tahsilat: {R.tl(k.x.beklenenTahsilat)}
                </div>
                <div className="text-xs" style={{ color: R.T.red }}>
                  Ödeme: {R.tl(k.x.beklenenOdeme)}
                </div>
                <div className="text-sm font-semibold" style={{ ...R.MONO, color: k.x.net >= 0 ? R.T.green : R.T.red }}>
                  Net: {k.x.net >= 0 ? "+" : ""}
                  {R.tl(k.x.net)}
                </div>
              </div>
            ))}
          </div>
        </R.Kart>
      </button>
    </div>
  );
}

export function YonPanelPersonel({ db, donemSatislar, donemKalemler, baslangic, bitis }) {
  const kapanmisVardiyalar = db.vardiyalar.filter((v) => v.durum !== "Açık" && v.kapanisZamani && v.kapanisZamani.slice(0, 10) >= baslangic && v.kapanisZamani.slice(0, 10) <= bitis && v.kasaFarki !== null);
  const personeller = [...new Set(donemSatislar.map((s) => s.satisiYapan).filter(Boolean))];
  const satirlar = personeller
    .map((ad) => {
      const buPersonelinSatislari = donemSatislar.filter((s) => s.satisiYapan === ad);
      const buPersonelinKalemleri = donemKalemler.filter((k) => k.satisiYapan === ad);
      const ciro = buPersonelinSatislari.reduce((t, s) => t + s.genelToplam, 0);
      const brutKar = buPersonelinKalemleri.reduce((t, k) => t + R.satisKalemiKarBilgisi(k).karToplam, 0);
      const iskonto = buPersonelinSatislari.reduce((t, s) => t + s.iskontoToplam, 0);
      const iade = db.iadeler.filter((i) => i.iadeyiAlan === ad && i.tarih.slice(0, 10) >= baslangic && i.tarih.slice(0, 10) <= bitis).reduce((t, i) => t + i.tutar, 0);
      const kasaFarki = kapanmisVardiyalar.filter((v) => v.kullaniciAdi === ad).reduce((t, v) => t + v.kasaFarki, 0);
      return { ad, ciro, satisAdedi: buPersonelinSatislari.length, brutKar, iskonto, iade, kasaFarki, kasaFarkiVarMi: kapanmisVardiyalar.some((v) => v.kullaniciAdi === ad) };
    })
    .sort((a, b) => b.ciro - a.ciro);

  return (
    <R.Kart className="overflow-hidden">
      {satirlar.length === 0 ? (
        <R.Bos ikon={R.Users} baslik="Bu dönemde satış yapan personel yok" aciklama="Farklı bir dönem seçmeyi deneyin." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                <th className="text-left font-semibold px-3 py-2">Personel</th>
                <th className="text-right font-semibold px-2 py-2">Ciro</th>
                <th className="text-right font-semibold px-2 py-2">Satış Adedi</th>
                <th className="text-right font-semibold px-2 py-2">Brüt Kâr</th>
                <th className="text-right font-semibold px-2 py-2">İskonto</th>
                <th className="text-right font-semibold px-2 py-2">İade</th>
                <th className="text-right font-semibold px-3 py-2">Kasa Farkı</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((x) => (
                <tr key={x.ad} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                  <td className="px-3 py-2 font-medium" style={{ color: R.T.ink900 }}>
                    {x.ad}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold" style={R.MONO}>
                    {R.tl(x.ciro)}
                  </td>
                  <td className="px-2 py-2 text-right" style={R.MONO}>
                    {x.satisAdedi}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                    {R.tl(x.brutKar)}
                  </td>
                  <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                    {R.tl(x.iskonto)}
                  </td>
                  <td className="px-2 py-2 text-right" style={{ ...R.MONO, color: x.iade > 0 ? R.T.red : R.T.ink500 }}>
                    {x.iade > 0 ? R.tl(x.iade) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold" style={{ ...R.MONO, color: !x.kasaFarkiVarMi ? R.T.ink500 : Math.abs(x.kasaFarki) < 0.5 ? R.T.green : R.T.red }}>
                    {x.kasaFarkiVarMi ? `${x.kasaFarki >= 0 ? "+" : ""}${R.tl(x.kasaFarki)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </R.Kart>
  );
}

export function YonPanelAlarm({ db, setSekme }) {
  const bugunIso = R.isoGun(new Date());
  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set");

  const acilVardiyaFarklari = db.vardiyalar.filter((v) => v.durum !== "Açık" && v.kasaFarki !== null && Math.abs(v.kasaFarki) > 0.5 && v.kapanisZamani?.slice(0, 10) === bugunIso).length;
  const vadesiGecmisMusteri = db.cariler.filter((c) => R.musteriAlacakOzeti(db, c).vadesiGecen > 0).length;
  const kritikStok = aktifParcalar.filter((p) => (p.stok || 0) > 0 && p.stok <= p.kritikSeviye).length;

  const yediGunSonraIso = R.isoGun(new Date(Date.now() + 7 * 86400000));
  const yaklasanOdeme = db.tedarikciler.flatMap((t) => R.tedarikciAcikFaturalari(db, t.ad)).filter((m) => m.vadeTarihi && m.vadeTarihi >= bugunIso && m.vadeTarihi <= yediGunSonraIso).length;
  const bekleyenMusteriSiparisi = db.musteriSiparisleri.filter((s) => s.durum === "Bekliyor" || s.durum === "Tedarikçiye Sipariş Verildi").length;
  const gecikenTedarikciSiparisi = db.satinAlmaSiparisleri.filter((s) => (s.durum === "Sipariş Verildi" || s.durum === "Kısmi Geldi") && s.beklenenTeslimTarihi && s.beklenenTeslimTarihi < bugunIso).length;

  const bugunSatisAdedi = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) === bugunIso).length;
  const bugunYeniAlis = db.malAlimlari.filter((m) => m.faturaTarihi === bugunIso).length;
  const bugunYeniSiparis = db.satinAlmaSiparisleri.filter((s) => s.siparisTarihi === bugunIso).length;

  const gruplar = [
    {
      baslik: "🔴 Acil",
      renk: R.T.red,
      arka: "#F9DEDE",
      maddeler: [
        { metin: `${acilVardiyaFarklari} vardiyada bugün kasa farkı var`, sayi: acilVardiyaFarklari, git: "gunsonu" },
        { metin: `${vadesiGecmisMusteri} müşterinin vadesi geçmiş borcu var`, sayi: vadesiGecmisMusteri, git: "vadetakip" },
        { metin: `${kritikStok} ürün kritik stok seviyesinde`, sayi: kritikStok, git: "olustok" },
      ],
    },
    {
      baslik: "🟠 Önemli",
      renk: "#8A6110",
      arka: "#FDF1D6",
      maddeler: [
        { metin: `${yaklasanOdeme} tedarikçi faturasının vadesi 7 gün içinde`, sayi: yaklasanOdeme, git: "vadetakip" },
        { metin: `${bekleyenMusteriSiparisi} bekleyen müşteri siparişi var`, sayi: bekleyenMusteriSiparisi, git: "musterisiparisi" },
        { metin: `${gecikenTedarikciSiparisi} tedarikçi siparişi gecikti`, sayi: gecikenTedarikciSiparisi, git: "satinalma" },
      ],
    },
    {
      baslik: "🟢 Bilgi",
      renk: R.T.green,
      arka: "#E4F3E9",
      maddeler: [
        { metin: `Bugün ${bugunSatisAdedi} satış yapıldı`, sayi: bugunSatisAdedi, git: "gunsonu" },
        { metin: `Bugün ${bugunYeniAlis} yeni alış girildi`, sayi: bugunYeniAlis, git: "alis" },
        { metin: `Bugün ${bugunYeniSiparis} yeni sipariş oluşturuldu`, sayi: bugunYeniSiparis, git: "satinalma" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {gruplar.map((g) => {
        const gorunurler = g.maddeler.filter((m) => m.sayi > 0);
        if (gorunurler.length === 0) return null;
        return (
          <R.Kart key={g.baslik} className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: g.renk }}>
              {g.baslik}
            </h4>
            <div className="flex flex-col gap-1.5">
              {gorunurler.map((m, i) => (
                <button key={i} onClick={() => setSekme(m.git)} className="text-left text-sm px-2.5 py-2 rounded-md" style={{ background: g.arka, color: g.renk }}>
                  {m.metin}
                </button>
              ))}
            </div>
          </R.Kart>
        );
      })}
      {gruplar.every((g) => g.maddeler.every((m) => m.sayi === 0)) && (
        <R.Kart>
          <R.Bos ikon={R.Check} baslik="Her şey yolunda" aciklama="Şu an acil ya da önemli bir uyarı bulunmuyor." />
        </R.Kart>
      )}
    </div>
  );
}

export function YonPanelKarsilastirma({ db }) {
  const bugun = new Date();
  const bugunIso = R.isoGun(bugun);
  const dunIso = R.isoGun(new Date(Date.now() - 86400000));
  const buHaftaBas = R.isoGun(new Date(Date.now() - 6 * 86400000));
  const gecenHaftaBas = R.isoGun(new Date(Date.now() - 13 * 86400000));
  const gecenHaftaSon = R.isoGun(new Date(Date.now() - 7 * 86400000));
  const buAyBas = R.isoGun(new Date(bugun.getFullYear(), bugun.getMonth(), 1));
  const gecenAyBas = R.isoGun(new Date(bugun.getFullYear(), bugun.getMonth() - 1, 1));
  const gecenAySon = R.isoGun(new Date(bugun.getFullYear(), bugun.getMonth(), 0));
  const buYilBas = R.isoGun(new Date(bugun.getFullYear(), 0, 1));
  const gecenYilBas = R.isoGun(new Date(bugun.getFullYear() - 1, 0, 1));
  const gecenYilSon = R.isoGun(new Date(bugun.getFullYear() - 1, 11, 31));

  const karsilastirmalar = [
    { baslik: "Bugün vs Dün", x: R.donemKarsilastir(db, bugunIso, bugunIso, dunIso, dunIso) },
    { baslik: "Bu Hafta vs Geçen Hafta", x: R.donemKarsilastir(db, buHaftaBas, bugunIso, gecenHaftaBas, gecenHaftaSon) },
    { baslik: "Bu Ay vs Geçen Ay", x: R.donemKarsilastir(db, buAyBas, bugunIso, gecenAyBas, gecenAySon) },
    { baslik: "Bu Yıl vs Geçen Yıl", x: R.donemKarsilastir(db, buYilBas, bugunIso, gecenYilBas, gecenYilSon) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {karsilastirmalar.map((k) => (
        <R.Kart key={k.baslik} className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            {k.baslik}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { etiket: "Ciro", x: k.x.ciro, tl: true },
              { etiket: "Satış Adedi", x: k.x.satisAdedi, tl: false },
              { etiket: "Brüt Kâr", x: k.x.brutKar, tl: true },
              { etiket: "Ortalama Sepet", x: k.x.ortalamaSepet, tl: true },
            ].map((m) => (
              <div key={m.etiket} className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  {m.etiket}
                </div>
                <div className="text-sm font-semibold" style={R.MONO}>
                  {m.tl ? R.tl(m.x.g1) : m.x.g1}
                </div>
                {m.x.yuzde !== null && (
                  <div className="text-xs font-semibold" style={{ color: m.x.yuzde >= 0 ? R.T.green : R.T.red }}>
                    {m.x.yuzde >= 0 ? "+" : ""}%{m.x.yuzde}
                  </div>
                )}
              </div>
            ))}
          </div>
        </R.Kart>
      ))}
    </div>
  );
}

export function StokAnalizMerkeziSayfasi({ db, setSekme }) {
  const [altSekme, setAltSekme] = R.useState("ozet");
  const [arama, setArama] = R.useState("");
  const [siralamaAlani, setSiralamaAlani] = R.useState("stokMaliyeti");
  const [siralamaYonu, setSiralamaYonu] = R.useState("azalan");

  const aktifParcalar = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Set");
  const satirlar = aktifParcalar.map((p) => R.stokAnalizSatiriHesapla(db, p));

  // --- Genel özet -----------------------------------------------------
  const toplamUrun = satirlar.length;
  const toplamAdet = satirlar.reduce((t, x) => t + (x.p.stok || 0), 0);
  const toplamStokMaliyeti = satirlar.reduce((t, x) => t + x.stokMaliyeti, 0);
  const tahminiSatisDegeri = satirlar.reduce((t, x) => t + x.tahminiSatisDegeri, 0);
  const potansiyelKar = tahminiSatisDegeri - toplamStokMaliyeti;
  const kritikListesi = satirlar.filter((x) => x.kritikMi).sort((a, b) => (b.min - b.p.stok) - (a.min - a.p.stok));
  const stoksuzListesi = satirlar
    .filter((x) => x.stoksuzMu)
    .sort((a, b) => (b.satisGecmisiVarMi === a.satisGecmisiVarMi ? 0 : b.satisGecmisiVarMi ? 1 : -1));
  const rezerveStokToplam = satirlar.reduce((t, x) => t + x.rezerveAdet, 0);
  const oluStokListesi = satirlar.filter((x) => x.sinif === "Ölü Stok" && (x.p.stok || 0) > 0);
  const sermayeBagliListesi = satirlar
    .filter((x) => x.stokYasi !== null && x.stokYasi >= 365 && (x.p.stok || 0) > 0)
    .sort((a, b) => b.stokMaliyeti - a.stokMaliyeti);
  const sermayeBagliToplam = sermayeBagliListesi.reduce((t, x) => t + x.stokMaliyeti, 0);

  const ozetKutulari = [
    { baslik: "Toplam Ürün", deger: `${toplamUrun}`, ikon: R.Package, ton: "steel" },
    { baslik: "Toplam Adet", deger: `${toplamAdet}`, ikon: R.PackageSearch, ton: "steel" },
    { baslik: "Toplam Stok Maliyeti", deger: R.tl(toplamStokMaliyeti), ikon: R.Landmark, ton: "steel" },
    { baslik: "Tahmini Satış Değeri", deger: R.tl(tahminiSatisDegeri), ikon: R.TrendingUp, ton: "green" },
    { baslik: "Potansiyel Kâr", deger: R.tl(potansiyelKar), ikon: R.Percent, ton: "green" },
    { baslik: "Kritik Stok", deger: `${kritikListesi.length} ürün`, ikon: R.AlertTriangle, ton: kritikListesi.length > 0 ? "red" : "steel" },
    { baslik: "Stoksuz Ürün", deger: `${stoksuzListesi.length} ürün`, ikon: R.X, ton: stoksuzListesi.length > 0 ? "red" : "steel" },
    { baslik: "Rezerve Stok", deger: `${rezerveStokToplam}`, ikon: R.Lock, ton: "steel" },
    { baslik: "Ölü Stok", deger: `${oluStokListesi.length} ürün`, ikon: R.BarChart3, ton: oluStokListesi.length > 0 ? "yellow" : "steel" },
  ];

  const tonRenk = { steel: R.T.ink900, green: R.T.green, red: R.T.red, yellow: "#8A6110" };
  const tonArkaplan = { steel: "#fff", green: "#fff", red: "#F9DEDE", yellow: "#FDF1D6" };

  // --- Ürün bazlı stok tablosu -----------------------------------------
  const aramaSonuclari = (arama.trim()
    ? satirlar.filter(
        (x) =>
          x.p.ad.toLowerCase().includes(arama.trim().toLowerCase()) ||
          x.p.stokKodu?.toLowerCase().includes(arama.trim().toLowerCase()) ||
          x.p.marka?.toLowerCase().includes(arama.trim().toLowerCase())
      )
    : satirlar
  ).slice();

  const siralaAlanDegeri = (x, alan) => {
    if (alan === "ad") return x.p.ad || "";
    if (alan === "stok") return x.p.stok || 0;
    if (alan === "satilabilir") return x.satilabilir;
    if (alan === "rezerve") return x.rezerveAdet;
    if (alan === "yoldaki") return x.yoldaki;
    if (alan === "stokMaliyeti") return x.stokMaliyeti;
    return x.p.ad || "";
  };
  aramaSonuclari.sort((a, b) => {
    const av = siralaAlanDegeri(a, siralamaAlani);
    const bv = siralaAlanDegeri(b, siralamaAlani);
    const fark = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return siralamaYonu === "azalan" ? -fark : fark;
  });

  const siraliBaslik = (alan, etiket) => (
    <button
      onClick={() => {
        if (siralamaAlani === alan) setSiralamaYonu((v) => (v === "azalan" ? "artan" : "azalan"));
        else {
          setSiralamaAlani(alan);
          setSiralamaYonu("azalan");
        }
      }}
      className="flex items-center gap-0.5 whitespace-nowrap"
    >
      {etiket} {siralamaAlani === alan && <R.ArrowUpDown size={11} />}
    </button>
  );

  // --- Marka / Kategori analizi -----------------------------------------
  const markaAnalizi = R.markaKategoriAnaliziYap(db, satirlar, "marka");
  const kategoriAnalizi = R.markaKategoriAnaliziYap(db, satirlar, "kategori");

  // --- Depo karşılaştırması ---------------------------------------------
  const depoKarsilastirma = (db.depolar || [])
    .filter((d) => d.aktif !== false)
    .map((depo) => {
      const deger = aktifParcalar.reduce((t, p) => t + R.depoStogu(p, depo.id) * R.gecerliMaliyet(p, db), 0);
      const adet = aktifParcalar.reduce((t, p) => t + R.depoStogu(p, depo.id), 0);
      return { depo, deger, adet };
    });

  // --- Stok yaşlandırma ---------------------------------------------------
  const yaslandirmaOzeti = R.STOK_YASI_GRUPLARI.map((g) => {
    const liste = satirlar.filter((x) => (x.p.stok || 0) > 0 && R.stokYasiGrubu(x.stokYasi) === g);
    return { grup: g, adet: liste.length, deger: liste.reduce((t, x) => t + x.stokMaliyeti, 0) };
  });

  const AlTabButon = ({ id, ad, sayi }) => (
    <button
      onClick={() => setAltSekme(id)}
      className="flex-1 py-2.5 text-xs font-semibold whitespace-nowrap px-2"
      style={{ background: altSekme === id ? R.T.graphite900 : "#fff", color: altSekme === id ? "#fff" : R.T.ink500 }}
    >
      {ad}
      {sayi > 0 ? ` (${sayi})` : ""}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        <AlTabButon id="ozet" ad="Genel Özet" />
        <AlTabButon id="urunler" ad="Ürün Bazlı Stok" />
        <AlTabButon id="yaslandirma" ad="Stok Yaşlandırma" />
        <AlTabButon id="marka" ad="Marka Analizi" />
        <AlTabButon id="kategori" ad="Kategori Analizi" />
        <AlTabButon id="depo" ad="Depo Karşılaştırma" />
      </div>

      {altSekme === "ozet" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
            {ozetKutulari.map((k) => (
              <R.Kart key={k.baslik} className="p-3.5" style={{ background: tonArkaplan[k.ton] }}>
                <div className="text-xs flex items-center gap-1.5" style={{ color: R.T.ink500 }}>
                  <k.ikon size={13} /> {k.baslik}
                </div>
                <div className="text-lg font-semibold mt-1" style={{ ...R.MONO, color: tonRenk[k.ton] }}>
                  {k.deger}
                </div>
              </R.Kart>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: R.T.red }}>
                  <R.AlertTriangle size={15} /> Kritik Stok (İlk 5)
                </h3>
                <button onClick={() => setSekme("siparis")} className="text-[11px] font-semibold" style={{ color: R.T.orange }}>
                  Tümünü Gör →
                </button>
              </div>
              {kritikListesi.length === 0 ? (
                <p className="text-xs" style={{ color: R.T.ink500 }}>Kritik seviyede ürün yok.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {kritikListesi.slice(0, 5).map((x) => (
                    <div key={x.p.id} className="flex items-center justify-between text-xs">
                      <span className="truncate">{x.p.ad}</span>
                      <span className="font-semibold shrink-0 ml-2" style={{ ...R.MONO, color: R.T.red }}>
                        {x.p.stok}/{x.min} (eksik {x.min - x.p.stok})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </R.Kart>

            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: R.T.ink900 }}>
                  <R.X size={15} /> Stoksuz Ürünler (İlk 5)
                </h3>
                <button onClick={() => setSekme("stok")} className="text-[11px] font-semibold" style={{ color: R.T.orange }}>
                  Tümünü Gör →
                </button>
              </div>
              {stoksuzListesi.length === 0 ? (
                <p className="text-xs" style={{ color: R.T.ink500 }}>Stoksuz ürün yok.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {stoksuzListesi.slice(0, 5).map((x) => (
                    <div key={x.p.id} className="flex items-center justify-between text-xs">
                      <span className="truncate">
                        {x.p.ad} {x.satisGecmisiVarMi && <span style={{ color: R.T.orange }}>● satış geçmişi var</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </R.Kart>

            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: "#8A6110" }}>
                  <R.BarChart3 size={15} /> Stok Devir Sınıflandırması
                </h3>
                <button onClick={() => setSekme("devirhizi")} className="text-[11px] font-semibold" style={{ color: R.T.orange }}>
                  Detay →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["Hızlı", "Normal", "Yavaş", "Ölü Stok"].map((s) => {
                  const sayi = satirlar.filter((x) => (x.p.stok || 0) > 0 && x.sinif === s).length;
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      <span>{R.SATIS_HIZI_SINIF_GORSELI[s].emoji}</span>
                      <span style={{ color: R.T.ink500 }}>{s}:</span>
                      <span className="font-semibold" style={R.MONO}>{sayi}</span>
                    </div>
                  );
                })}
              </div>
            </R.Kart>

            <R.Kart className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: R.T.ink900 }}>
                  <R.Landmark size={15} /> Sermayeye Bağlı Stok (365+ gün)
                </h3>
                <button onClick={() => setSekme("olustok")} className="text-[11px] font-semibold" style={{ color: R.T.orange }}>
                  Detay →
                </button>
              </div>
              <div className="text-lg font-semibold" style={R.MONO}>{R.tl(sermayeBagliToplam)}</div>
              <p className="text-xs mt-1" style={{ color: R.T.ink500 }}>{sermayeBagliListesi.length} üründe 365 gündür hareket yok.</p>
            </R.Kart>
          </div>
        </div>
      )}

      {altSekme === "urunler" && (
        <R.Kart className="p-4">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ürün adı, kodu veya marka ile ara..."
            className="w-full px-3 py-2 rounded-md border text-sm outline-none mb-3"
            style={{ borderColor: R.T.steel300 }}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: R.T.ink500 }}>
                  <th className="text-left py-2 pr-2">{siraliBaslik("ad", "Ürün")}</th>
                  <th className="text-right py-2 px-2">{siraliBaslik("stok", "Mevcut")}</th>
                  <th className="text-right py-2 px-2">{siraliBaslik("rezerve", "Rezerve")}</th>
                  <th className="text-right py-2 px-2">{siraliBaslik("satilabilir", "Satılabilir")}</th>
                  <th className="text-right py-2 px-2">{siraliBaslik("yoldaki", "Yoldaki")}</th>
                  <th className="text-right py-2 px-2">Min</th>
                  <th className="text-right py-2 px-2">Maks</th>
                  <th className="text-left py-2 px-2">Raf</th>
                  <th className="text-right py-2 pl-2">{siraliBaslik("stokMaliyeti", "Stok Maliyeti")}</th>
                </tr>
              </thead>
              <tbody>
                {aramaSonuclari.slice(0, 200).map((x) => (
                  <tr key={x.p.id} className="border-t" style={{ borderColor: R.T.steel200 }}>
                    <td className="py-2 pr-2">
                      <div className="font-medium truncate max-w-[160px]" style={{ color: R.T.ink900 }}>{x.p.ad}</div>
                      <div style={{ color: R.T.ink500 }}>{x.p.stokKodu}</div>
                    </td>
                    <td className="text-right py-2 px-2" style={{ ...R.MONO, color: x.kritikMi ? R.T.red : x.stoksuzMu ? R.T.red : R.T.ink900, fontWeight: x.kritikMi || x.stoksuzMu ? 700 : 400 }}>
                      {x.p.stok}
                    </td>
                    <td className="text-right py-2 px-2" style={R.MONO}>{x.rezerveAdet || "—"}</td>
                    <td className="text-right py-2 px-2 font-semibold" style={R.MONO}>{x.satilabilir}</td>
                    <td className="text-right py-2 px-2" style={R.MONO}>{x.yoldaki || "—"}</td>
                    <td className="text-right py-2 px-2" style={{ ...R.MONO, color: R.T.ink500 }}>{x.min || "—"}</td>
                    <td className="text-right py-2 px-2" style={{ ...R.MONO, color: R.T.ink500 }}>{x.max || "—"}</td>
                    <td className="py-2 px-2" style={{ color: R.T.ink500 }}>{x.p.rafAdresi || "—"}</td>
                    <td className="text-right py-2 pl-2" style={R.MONO}>{R.tl(x.stokMaliyeti)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {aramaSonuclari.length > 200 && (
              <p className="text-xs text-center mt-3" style={{ color: R.T.ink500 }}>
                {aramaSonuclari.length} sonuçtan ilk 200'ü gösteriliyor — daraltmak için arama kutusunu kullanın.
              </p>
            )}
          </div>
        </R.Kart>
      )}

      {altSekme === "yaslandirma" && (
        <R.Kart className="p-4">
          <h3 className="font-bold text-sm mb-3">Stok Yaşlandırma</h3>
          <div className="flex flex-col gap-2">
            {yaslandirmaOzeti.map((g) => (
              <div key={g.grup} className="flex items-center justify-between p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                <span className="text-sm font-medium">{g.grup}</span>
                <div className="flex items-center gap-4 text-xs" style={{ color: R.T.ink500 }}>
                  <span>{g.adet} ürün</span>
                  <span className="font-semibold" style={{ ...R.MONO, color: R.T.ink900 }}>{R.tl(g.deger)}</span>
                </div>
              </div>
            ))}
          </div>
        </R.Kart>
      )}

      {(altSekme === "marka" || altSekme === "kategori") && (
        <R.Kart className="p-4">
          <h3 className="font-bold text-sm mb-3">{altSekme === "marka" ? "Marka Analizi" : "Kategori Analizi"} (Son 365 Gün Satış)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: R.T.ink500 }}>
                  <th className="text-left py-2 pr-2">{altSekme === "marka" ? "Marka" : "Kategori"}</th>
                  <th className="text-right py-2 px-2">Ürün</th>
                  <th className="text-right py-2 px-2">Stok Maliyeti</th>
                  <th className="text-right py-2 px-2">Satış (365g)</th>
                  <th className="text-right py-2 px-2">Kâr (365g)</th>
                  <th className="text-right py-2 px-2">Devir</th>
                  <th className="text-right py-2 pl-2">Ölü Stok</th>
                </tr>
              </thead>
              <tbody>
                {(altSekme === "marka" ? markaAnalizi : kategoriAnalizi).map((g) => (
                  <tr key={g.ad} className="border-t" style={{ borderColor: R.T.steel200 }}>
                    <td className="py-2 pr-2 font-medium">{g.ad}</td>
                    <td className="text-right py-2 px-2" style={R.MONO}>{g.urunSayisi}</td>
                    <td className="text-right py-2 px-2" style={R.MONO}>{R.tl(g.stokMaliyeti)}</td>
                    <td className="text-right py-2 px-2" style={R.MONO}>{R.tl(g.satisTutari)}</td>
                    <td className="text-right py-2 px-2" style={{ ...R.MONO, color: g.karToplam >= 0 ? R.T.green : R.T.red }}>{R.tl(g.karToplam)}</td>
                    <td className="text-right py-2 px-2" style={R.MONO}>{g.devir !== null ? g.devir.toFixed(2) : "—"}</td>
                    <td className="text-right py-2 pl-2" style={{ ...R.MONO, color: g.oluStokSayisi > 0 ? R.T.red : R.T.ink500 }}>{g.oluStokSayisi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </R.Kart>
      )}

      {altSekme === "depo" && (
        <R.Kart className="p-4">
          <h3 className="font-bold text-sm mb-3">Depo / Şube Stok Değeri Karşılaştırması</h3>
          {depoKarsilastirma.length <= 1 ? (
            <R.Bos ikon={R.MapPin} baslik="Tek depo aktif" aciklama="Karşılaştırma yapabilmek için Depolar / Transfer ekranından ikinci bir depo/şube ekleyin." />
          ) : (
            <div className="flex flex-col gap-2">
              {depoKarsilastirma
                .sort((a, b) => b.deger - a.deger)
                .map((d) => (
                  <div key={d.depo.id} className="flex items-center justify-between p-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                    <div>
                      <div className="text-sm font-medium">{d.depo.ad}</div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>{d.adet} adet</div>
                    </div>
                    <span className="font-semibold" style={R.MONO}>{R.tl(d.deger)}</span>
                  </div>
                ))}
              <button onClick={() => setSekme("transferler")} className="text-[11px] font-semibold text-left mt-1" style={{ color: R.T.orange }}>
                Depolar / Transfer ekranına git →
              </button>
            </div>
          )}
        </R.Kart>
      )}
    </div>
  );
}
