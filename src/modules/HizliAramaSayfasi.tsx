/* Stok — hızlı arama sayfası (Stok.tsx'ten bölündü).

   Barkod/kod/parça adı araması, gelişmiş filtreler (marka, kategori, raf bölümü,
   stok durumu, fiyat aralığı, kâr marjı, satış performansı), sayfalama ve
   sağdaki ürün detay kartı (UrunDetayKarti.tsx).

   State tamamen bu sayfaya ait — StokSayfasi ile paylaşılan hiçbir state yok. */
import React from "react";
import * as R from "../core/akcan-runtime";
import { UrunDetayKarti } from "./UrunDetayKarti";

export function HizliAramaSayfasi({ db, updateDb, sepet, setSepet, aktifKullanici }) {
  const [q, setQ] = R.useState("");
  const [detayId, setDetayId] = R.useState(null);
  const [gelismisAcik, setGelismisAcik] = R.useState(false);
  const [sayfa, setSayfa] = R.useState(1);
  const SAYFA_BASI = 50;
  const aramaRef = R.useRef(null);

  // --- Filtreler ---------------------------------------------------------------
  const [markaFiltre, setMarkaFiltre] = R.useState("");
  const [kategoriFiltre, setKategoriFiltre] = R.useState("");
  const [rafBolumuFiltre, setRafBolumuFiltre] = R.useState("");
  const [stokDurumFiltre, setStokDurumFiltre] = R.useState(""); // stokta|yok|kritik|fazla|negatif|rezerve|siparişte
  const [fiyatMin, setFiyatMin] = R.useState("");
  const [fiyatMax, setFiyatMax] = R.useState("");
  const [karFiltre, setKarFiltre] = R.useState(""); // maliyetAlti|minKarAlti|karMarjiAlti|fiyatGuncellenmemis
  const [karMarjiEsigi, setKarMarjiEsigi] = R.useState("10");
  const [satisPerfFiltre, setSatisPerfFiltre] = R.useState(""); // hicSatilmayan|cokSatan
  const [satisPerfGun, setSatisPerfGun] = R.useState("90");
  const [satisPerfAdet, setSatisPerfAdet] = R.useState("10");

  R.useEffect(() => {
    aramaRef.current?.focus();
  }, []);

  R.useEffect(() => {
    setSayfa(1);
  }, [q, markaFiltre, kategoriFiltre, rafBolumuFiltre, stokDurumFiltre, fiyatMin, fiyatMax, karFiltre, satisPerfFiltre]);

  // Metin araması VEYA herhangi bir filtre aktifse sonuç hesaplanır — böylece
  // sadece filtrelerle de ("Marka: MANN, Stok: >0" gibi) arama yapılabilir.
  const filtreAktifMi = markaFiltre || kategoriFiltre || rafBolumuFiltre || stokDurumFiltre || fiyatMin || fiyatMax || karFiltre || satisPerfFiltre;
  const temelSonuclar = q.trim() ? R.hizliAramaYap(db, q) : filtreAktifMi ? db.parcalar.filter((p) => p.aktif !== false) : [];

  const bugunIso = R.isoGun(new Date());
  const gunOnceIso = (gun) => new Date(Date.now() - gun * 86400000).toLocaleDateString("en-CA");

  const sonuclar = temelSonuclar.filter((p) => {
    if (markaFiltre && p.marka !== markaFiltre) return false;
    if (kategoriFiltre && p.kategori !== kategoriFiltre && p.anaKategori !== kategoriFiltre) return false;
    if (rafBolumuFiltre && !R.parcaRafListesi(p).some((r) => r.kod.toUpperCase().startsWith(rafBolumuFiltre.toUpperCase()))) return false;
    if (fiyatMin && p.satisFiyati < parseFloat(fiyatMin)) return false;
    if (fiyatMax && p.satisFiyati > parseFloat(fiyatMax)) return false;

    if (stokDurumFiltre === "stokta" && !(p.stok > 0)) return false;
    if (stokDurumFiltre === "yok" && !(p.stok <= 0)) return false;
    if (stokDurumFiltre === "kritik" && !(p.stok > 0 && p.stok <= p.kritikSeviye)) return false;
    if (stokDurumFiltre === "fazla" && !(R.gecerliHedefStok(p) > 0 && p.stok > R.gecerliHedefStok(p) * 1.5)) return false;
    if (stokDurumFiltre === "negatif" && !(p.stok < 0)) return false;
    if (stokDurumFiltre === "rezerve" && !(R.parcaRezerveAdedi(db, p.id) > 0)) return false;
    if (stokDurumFiltre === "sipariste" && !((p.siparisteAdet || 0) > 0)) return false;

    if (karFiltre === "maliyetAlti" && !(R.gecerliMaliyet(p) > 0 && p.satisFiyati < R.gecerliMaliyet(p))) return false;
    if (karFiltre === "minKarAlti" && !(p.minimumSatisFiyati > 0 && p.satisFiyati < p.minimumSatisFiyati)) return false;
    if (karFiltre === "karMarjiAlti") {
      const maliyet = R.gecerliMaliyet(p);
      if (!(maliyet > 0)) return false;
      const marj = ((p.satisFiyati - maliyet) / p.satisFiyati) * 100;
      if (!(marj < parseFloat(karMarjiEsigi))) return false;
    }
    if (karFiltre === "fiyatGuncellenmemis" && !(p.etiketSonYazdirmaFiyati !== null && Math.abs(p.etiketSonYazdirmaFiyati - p.satisFiyati) > 0.005)) return false;

    if (satisPerfFiltre === "hicSatilmayan") {
      const sonTarih = R.sonSatisTarihiBul(db, p.id);
      const gun = parseInt(satisPerfGun) || 90;
      if (sonTarih && Math.floor((Date.now() - new Date(sonTarih).getTime()) / 86400000) < gun) return false;
      if (!sonTarih) {
        // Hiç satılmamışsa da bu filtreye uyar — devam.
      }
    }
    if (satisPerfFiltre === "cokSatan") {
      const gun = parseInt(satisPerfGun) || 30;
      const esikAdet = parseInt(satisPerfAdet) || 10;
      if (R.sonNGunSatisAdedi(db, p.id, gun) < esikAdet) return false;
    }
    return true;
  });

  const sonuclarSayfali = sonuclar.slice((sayfa - 1) * SAYFA_BASI, sayfa * SAYFA_BASI);
  const toplamSayfa = Math.max(1, Math.ceil(sonuclar.length / SAYFA_BASI));

  const yakinOneriler = q.trim() && sonuclar.length === 0 ? R.yakinEslesmeOner(db, q) : [];

  const detayParca = detayId ? db.parcalar.find((p) => p.id === detayId) : null;

  const markalar = [...new Set<string>(db.parcalar.map((p) => p.marka).filter(Boolean) as string[])].sort();
  const kategoriler = [...new Set<string>(db.parcalar.flatMap((p) => [p.kategori, p.anaKategori]).filter(Boolean) as string[])].sort();

  const filtreleriTemizle = () => {
    setMarkaFiltre("");
    setKategoriFiltre("");
    setRafBolumuFiltre("");
    setStokDurumFiltre("");
    setFiyatMin("");
    setFiyatMax("");
    setKarFiltre("");
    setSatisPerfFiltre("");
  };

  // --- Arama geçmişi (personel bazlı) --------------------------------------------
  const aramaGecmisineEkle = (sorgu) => {
    if (!aktifKullanici || !sorgu.trim() || sorgu.trim().length < 2) return;
    updateDb((prev) => ({
      ...prev,
      kullanicilar: prev.kullanicilar.map((k) =>
        k.id === aktifKullanici.id ? { ...k, sonAramalar: [sorgu.trim(), ...(k.sonAramalar || []).filter((s) => s.toLowerCase() !== sorgu.trim().toLowerCase())].slice(0, 10) } : k
      ),
    }));
  };
  const aramaYap = (e) => {
    if (e.key === "Enter") aramaGecmisineEkle(q);
  };
  const gecmistenAra = (sorgu) => {
    setQ(sorgu);
    aramaRef.current?.focus();
  };

  const sepeteEkle = (p) => {
    setSepet((prev) => {
      const mevcut = prev.find((s) => s.parcaId === p.id);
      if (mevcut) return prev.map((s) => (s.parcaId === p.id ? { ...s, adet: s.adet + 1 } : s));
      return [...prev, { parcaId: p.id, adet: 1, birimFiyat: p.satisFiyati || 0, iskontoTuru: "tutar", iskontoDeger: 0 }];
    });
    R.bildirimGoster(`"${p.ad}" sepete eklendi.`, "basari");
  };

  const durumRozet = {
    var: { emoji: "🟢", etiket: "Stokta", renk: R.T.green },
    kritik: { emoji: "🟡", etiket: "Kritik Stok", renk: "#8A6110" },
    yok: { emoji: "🔴", etiket: "Stokta Yok", renk: R.T.red },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <R.Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
        <input
          ref={aramaRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={aramaYap}
          placeholder="Stok kodu, OEM, üretici kodu, muadil, barkod, ürün adı, marka, araç, kategori veya raf adresi yazın…"
          className="w-full pl-11 pr-4 py-3.5 rounded-lg border text-base outline-none focus:ring-2"
          style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
        />
      </div>

      {/* Arama geçmişi */}
      {!q.trim() && aktifKullanici?.sonAramalar?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
            Son Aramalar:
          </span>
          {aktifKullanici.sonAramalar.map((s, i) => (
            <button key={i} onClick={() => gecmistenAra(s)} className="text-xs px-2.5 py-1 rounded-full" style={{ background: R.T.steel100, color: R.T.ink900 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Filtreler */}
      <R.Kart className="p-3.5">
        <div className="flex flex-wrap items-end gap-2">
          <select value={markaFiltre} onChange={(e) => setMarkaFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
            <option value="">Tüm Markalar</option>
            {markalar.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select value={kategoriFiltre} onChange={(e) => setKategoriFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
            <option value="">Tüm Kategoriler</option>
            {kategoriler.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select value={stokDurumFiltre} onChange={(e) => setStokDurumFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
            <option value="">Tüm Stok Durumları</option>
            <option value="stokta">Stokta</option>
            <option value="yok">Stokta Yok</option>
            <option value="kritik">Kritik Stok</option>
            <option value="fazla">Fazla Stok</option>
            <option value="negatif">Negatif Stok</option>
            <option value="rezerve">Rezerve</option>
            <option value="sipariste">Siparişte</option>
          </select>
          <input value={rafBolumuFiltre} onChange={(e) => setRafBolumuFiltre(e.target.value)} placeholder="Raf bölümü (ör. A)" className="w-28 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
          <input type="number" value={fiyatMin} onChange={(e) => setFiyatMin(e.target.value)} placeholder="Min ₺" className="w-20 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
          <input type="number" value={fiyatMax} onChange={(e) => setFiyatMax(e.target.value)} placeholder="Maks ₺" className="w-20 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
          <button onClick={() => setGelismisAcik((v) => !v)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.orangeDark }}>
            Gelişmiş Filtreler {gelismisAcik ? "▲" : "▼"}
          </button>
          {filtreAktifMi && (
            <button onClick={filtreleriTemizle} className="text-xs font-semibold underline" style={{ color: R.T.ink500 }}>
              Temizle
            </button>
          )}
        </div>
        {gelismisAcik && (
          <div className="flex flex-wrap items-end gap-2 mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
            <select value={karFiltre} onChange={(e) => setKarFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
              <option value="">Fiyat/Kâr Filtresi Yok</option>
              <option value="maliyetAlti">Maliyetin Altında</option>
              <option value="minKarAlti">Minimum Kâr Altında</option>
              <option value="karMarjiAlti">Kâr Marjı %'in Altında</option>
              <option value="fiyatGuncellenmemis">Etiket Fiyatı Güncellenmemiş</option>
            </select>
            {karFiltre === "karMarjiAlti" && (
              <input type="number" value={karMarjiEsigi} onChange={(e) => setKarMarjiEsigi(e.target.value)} className="w-16 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
            )}
            <select value={satisPerfFiltre} onChange={(e) => setSatisPerfFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }}>
              <option value="">Satış Performansı Filtresi Yok</option>
              <option value="hicSatilmayan">Son N Günde Hiç Satılmayan</option>
              <option value="cokSatan">Son N Günde X'ten Fazla Satan</option>
            </select>
            {satisPerfFiltre && (
              <>
                <input type="number" value={satisPerfGun} onChange={(e) => setSatisPerfGun(e.target.value)} placeholder="Gün" className="w-16 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                {satisPerfFiltre === "cokSatan" && (
                  <input type="number" value={satisPerfAdet} onChange={(e) => setSatisPerfAdet(e.target.value)} placeholder="Adet" className="w-16 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                )}
              </>
            )}
          </div>
        )}
      </R.Kart>

      {!q.trim() && !filtreAktifMi ? (
        <R.Kart>
          <R.Bos
            ikon={R.Zap}
            baslik="Aramaya başlayın"
            aciklama="Örn. 03L115562, 03L 115 562, 03L-115-562 — hepsi aynı sonucu getirir. Ürün adı, marka, araç veya raf adresiyle de arayabilir, ya da yukarıdan sadece filtre uygulayabilirsiniz."
          />
        </R.Kart>
      ) : sonuclar.length === 0 ? (
        <R.Kart>
          <R.Bos ikon={R.Search} baslik="Sonuç bulunamadı" aciklama="Farklı bir kod veya kelime deneyin." />
          {yakinOneriler.length > 0 && (
            <div className="px-5 pb-5 -mt-3">
              <p className="text-xs font-semibold mb-1.5" style={{ color: R.T.ink500 }}>
                Bunu mu demek istediniz?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {yakinOneriler.map((o) => (
                  <button key={o.parca.id} onClick={() => setQ(o.parca.stokKodu)} className="text-xs px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.orangeDark }}>
                    {o.parca.marka} {o.parca.ad} <strong>(%{o.yuzde})</strong>
                  </button>
                ))}
              </div>
            </div>
          )}
        </R.Kart>
      ) : (
        <>
          <p className="text-sm font-semibold" style={{ color: R.T.ink900 }}>
            {sonuclar.length} ürün bulundu.
          </p>
          <R.Kart className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2.5">Ürün</th>
                    <th className="text-left font-semibold px-3 py-2.5">Marka</th>
                    <th className="text-left font-semibold px-3 py-2.5">Kod</th>
                    <th className="text-left font-semibold px-3 py-2.5">OEM</th>
                    <th className="text-center font-semibold px-3 py-2.5">Stok</th>
                    <th className="text-center font-semibold px-3 py-2.5">Rezerve</th>
                    <th className="text-left font-semibold px-3 py-2.5">Raf</th>
                    <th className="text-right font-semibold px-3 py-2.5">Maliyet</th>
                    <th className="text-right font-semibold px-3 py-2.5">Satış</th>
                    <th className="text-right font-semibold px-3 py-2.5">Kâr</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                {sonuclarSayfali.map((p) => {
                  const durum = durumRozet[R.stokDurumuHesapla(p)];
                  const maliyet = R.gecerliMaliyet(p);
                  const kar = p.satisFiyati - maliyet;
                  const rezerve = R.parcaRezerveAdedi(db, p.id);
                  const oemler = db.kodlar.filter((k) => k.parcaId === p.id && k.tip === "OEM");
                  return (
                    <tr
                      key={p.id}
                      style={{ borderTop: `1px solid ${R.T.steel200}`, cursor: "pointer" }}
                      onClick={() => setDetayId(p.id)}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-3 py-3 font-medium" style={{ color: R.T.ink900 }}>
                        {p.ad}
                      </td>
                      <td className="px-3 py-3" style={{ color: R.T.ink900 }}>
                        {p.marka || "—"}
                      </td>
                      <td className="px-3 py-3" style={R.MONO}>
                        {p.stokKodu}
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                        {oemler.length === 0 ? "—" : oemler.length === 1 ? oemler[0].kod : `${oemler[0].kod} +${oemler.length - 1}`}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: durum.renk }}>
                          {durum.emoji} {p.stok} {p.birim}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs" style={{ color: rezerve > 0 ? "#8A6110" : R.T.ink500 }}>
                        {rezerve > 0 ? rezerve : "—"}
                      </td>
                      <td className="px-3 py-3 font-semibold text-xs" style={{ color: R.T.ink900 }}>
                        {R.parcaRafListesi(p).length === 0
                          ? "—"
                          : R.parcaRafListesi(p).length === 1
                          ? `📍 ${R.parcaRafListesi(p)[0].kod}`
                          : `📍 ${R.parcaRafListesi(p).length} konum`}
                      </td>
                      <td className="px-3 py-3 text-right" style={{ ...R.MONO, color: R.T.ink500 }}>
                        {R.tl(maliyet)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ ...R.MONO, color: R.T.ink900 }}>
                        {R.tl(p.satisFiyati)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ ...R.MONO, color: kar >= 0 ? R.T.green : R.T.red }}>
                        {R.tl(kar)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sepeteEkle(p);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap"
                          style={{ background: R.T.orange, color: "#fff" }}
                        >
                          <R.ShoppingCart size={13} /> Satışa Ekle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {toplamSayfa > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <span className="text-xs" style={{ color: R.T.ink500 }}>
                Sayfa {sayfa} / {toplamSayfa} — {SAYFA_BASI} sonuç/sayfa gösteriliyor (performans için tüm sonuçlar tek seferde işlenmez)
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setSayfa((s) => Math.max(1, s - 1))} disabled={sayfa === 1} className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: R.T.steel100, color: R.T.ink900, opacity: sayfa === 1 ? 0.4 : 1 }}>
                  Önceki
                </button>
                <button
                  onClick={() => setSayfa((s) => Math.min(toplamSayfa, s + 1))}
                  disabled={sayfa === toplamSayfa}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold"
                  style={{ background: R.T.steel100, color: R.T.ink900, opacity: sayfa === toplamSayfa ? 0.4 : 1 }}
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </R.Kart>
        </>
      )}

      <UrunDetayKarti
        db={db}
        detayParca={detayParca}
        setDetayId={setDetayId}
        sepeteEkle={sepeteEkle}
      />
    </div>
  );
}
