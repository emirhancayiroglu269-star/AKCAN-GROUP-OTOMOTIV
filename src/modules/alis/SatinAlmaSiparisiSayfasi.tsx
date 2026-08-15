/* Alış/Tedarikçi ekranı — ayrıştırılmış bileşen.
 * Finans ve veri sözleşmeleri değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function SatinAlmaSiparisiSayfasi({ db, updateDb, aktifKullanici }) {
  const [durumFiltre, setDurumFiltre] = R.useState("tumu");
  const [seciliSiparisId, setSeciliSiparisId] = R.useState(null);
  const [formAcik, setFormAcik] = R.useState(false);
  const [tedarikci, setTedarikci] = R.useState("");
  const [siparisTarihi, setSiparisTarihi] = R.useState(R.isoGun(new Date()));
  const [beklenenTeslimTarihi, setBeklenenTeslimTarihi] = R.useState("");
  const [aciklama, setAciklama] = R.useState("");
  const [kalemler, setKalemler] = R.useState([]);
  const [urunArama, setUrunArama] = R.useState("");
  const [olusturan, setOlusturan] = R.useIslemYapan(aktifKullanici);

  const [malKabulSiparis, setMalKabulSiparis] = R.useState(null);
  const [malKabulAdetleri, setMalKabulAdetleri] = R.useState({});
  const [iptalHedef, setIptalHedef] = R.useState(null);
  const [iptalNedeniMetin, setIptalNedeniMetin] = R.useState("");

  const filtreliSiparisler = db.satinAlmaSiparisleri
    .filter((s) => durumFiltre === "tumu" || s.durum === durumFiltre)
    .sort((a, b) => new Date(b.siparisTarihi) - new Date(a.siparisTarihi));
  const seciliSiparis = seciliSiparisId ? db.satinAlmaSiparisleri.find((s) => s.id === seciliSiparisId) : null;

  const urunAramaSonuclari = urunArama.trim() ? R.hizliAramaYap(db, urunArama).slice(0, 6) : [];

  const kalemEkle = (p) => {
    if (kalemler.some((k) => k.parcaId === p.id)) {
      R.bildirimGoster("Bu ürün zaten eklenmiş.", "hata");
      return;
    }
    setKalemler((prev) => [
      ...prev,
      { id: R.yeniId("sk"), parcaId: p.id, stokKodu: p.stokKodu, ad: p.ad, marka: p.marka, adet: R.onerilenSiparisAdedi(p) || 1, alinanAdet: 0, birimFiyat: p.sonAlisFiyati || p.alisFiyati || 0, iskontoYuzde: 0, kdvOrani: p.kdvOrani || 0 },
    ]);
    setUrunArama("");
  };
  const kalemGuncelle = (id, alan, deger) => setKalemler((prev) => prev.map((k) => (k.id === id ? { ...k, [alan]: deger } : k)));
  const kalemSil = (id) => setKalemler((prev) => prev.filter((k) => k.id !== id));

  const formuSifirla = () => {
    setTedarikci("");
    setSiparisTarihi(R.isoGun(new Date()));
    setBeklenenTeslimTarihi("");
    setAciklama("");
    setKalemler([]);
    setUrunArama("");
  };

  const siparisKaydet = () => {
    if (!tedarikci.trim()) {
      R.bildirimGoster("Tedarikçi zorunludur.", "hata");
      return;
    }
    if (kalemler.length === 0) {
      R.bildirimGoster("En az bir ürün ekleyin.", "hata");
      return;
    }
    const siparis = {
      id: R.yeniId("sas"),
      tedarikci: tedarikci.trim(),
      siparisTarihi,
      beklenenTeslimTarihi,
      aciklama: aciklama.trim(),
      olusturanKullanici: aktifKullanici?.adSoyad || olusturan.trim(),
      durum: "Taslak",
      kalemler,
      malKabulGecmisi: [],
      tamamlanmaTarihi: null,
      iptalNedeni: "",
    };
    updateDb((prev) =>
      R.islemKaydet(
        { ...prev, satinAlmaSiparisleri: [siparis, ...prev.satinAlmaSiparisleri] },
        { kullaniciAdi: siparis.olusturanKullanici, islemTuru: "Satın alma siparişi oluşturuldu", aciklama: `${tedarikci.trim()} — ${kalemler.length} kalem`, eskiDeger: "—", yeniDeger: R.tl(R.siparisGenelToplam(siparis)) }
      )
    );
    R.sonKullaniciAdiKaydet(olusturan);
    R.bildirimGoster("Sipariş oluşturuldu (Taslak).", "basari");
    setFormAcik(false);
    formuSifirla();
  };

  const durumDegistir = (siparis, yeniDurum) => {
    updateDb((prev) => ({ ...prev, satinAlmaSiparisleri: prev.satinAlmaSiparisleri.map((s) => (s.id === siparis.id ? { ...s, durum: yeniDurum } : s)) }));
    R.bildirimGoster(`Durum "${yeniDurum}" olarak güncellendi.`, "basari");
  };

  const iptalOnayla = () => {
    if (!iptalNedeniMetin.trim()) {
      R.bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      satinAlmaSiparisleri: prev.satinAlmaSiparisleri.map((s) => (s.id === iptalHedef.id ? { ...s, durum: "İptal", iptalNedeni: iptalNedeniMetin.trim() } : s)),
    }));
    R.bildirimGoster("Sipariş iptal edildi.", "basari");
    setIptalHedef(null);
    setIptalNedeniMetin("");
  };

  // --- Mal Kabul --------------------------------------------------------------
  const malKabulAc = (siparis) => {
    setMalKabulSiparis(siparis);
    const varsayilan = {};
    siparis.kalemler.forEach((k) => (varsayilan[k.id] = String(Math.max(0, k.adet - k.alinanAdet))));
    setMalKabulAdetleri(varsayilan);
  };

  const malKabulOnayla = () => {
    const siparis = malKabulSiparis;
    const kabulEdilenler = siparis.kalemler.map((k) => ({ ...k, buSeferAdet: Math.min(parseFloat(malKabulAdetleri[k.id]) || 0, k.adet - k.alinanAdet) })).filter((k) => k.buSeferAdet > 0);
    if (kabulEdilenler.length === 0) {
      R.bildirimGoster("En az bir kalem için gelen adet girin.", "hata");
      return;
    }
    const belgeNo = `SAS-${siparis.id.slice(-6).toUpperCase()}`;
    let engellendi = false;
    updateDb((prev) => {
      let sonuc = prev;
      kabulEdilenler.forEach((k) => {
        const parca = sonuc.parcalar.find((p) => p.id === k.parcaId);
        if (!parca) return;
        const netFiyat = k.birimFiyat * (1 - (k.iskontoYuzde || 0) / 100);
        const yeniOrtalama = R.agirlikliOrtalamaMaliyetHesapla(parca.stok, parca.ortalamaMaliyet, k.buSeferAdet, netFiyat);
        sonuc = {
          ...sonuc,
          parcalar: sonuc.parcalar.map((p) =>
            p.id === k.parcaId
              ? {
                  ...p,
                  sonAlisFiyati: netFiyat,
                  ortalamaMaliyet: Math.round(yeniOrtalama * 100) / 100,
                  alisGecmisi: [{ id: R.yeniId("g"), tarih: R.zamanDamgasi(), adet: k.buSeferAdet, birimFiyat: netFiyat, tedarikci: siparis.tedarikci }, ...(p.alisGecmisi || [])],
                }
              : p
          ),
        };
        const yeni = R.stokHareketiUygula(sonuc, { parcaId: k.parcaId, tur: "Mal Alış", giris: k.buSeferAdet, belgeNo, kullanici: aktifKullanici?.adSoyad || olusturan.trim(), aciklama: `Satın alma siparişi — ${siparis.tedarikci}` });
        if (!yeni) {
          engellendi = true;
          return;
        }
        sonuc = yeni;
      });
      if (engellendi) return prev;

      const toplamTutar = kabulEdilenler.reduce((t, k) => t + k.buSeferAdet * k.birimFiyat * (1 - (k.iskontoYuzde || 0) / 100) * (1 + (k.kdvOrani || 0) / 100), 0);
      sonuc = R.tedarikciHareketiUygula(sonuc, { tedarikciAdi: siparis.tedarikci, tutar: Math.round(toplamTutar * 100) / 100, tur: "borç", aciklama: `Mal kabul — ${belgeNo}`, faturaNo: belgeNo });

      const guncelKalemler = siparis.kalemler.map((k) => {
        const kabul = kabulEdilenler.find((x) => x.id === k.id);
        return kabul ? { ...k, alinanAdet: k.alinanAdet + kabul.buSeferAdet } : k;
      });
      const toplamSip = guncelKalemler.reduce((t, k) => t + k.adet, 0);
      const toplamAlinan = guncelKalemler.reduce((t, k) => t + k.alinanAdet, 0);
      const yeniDurum = toplamAlinan >= toplamSip ? "Tamamlandı" : "Kısmi Geldi";

      sonuc = {
        ...sonuc,
        satinAlmaSiparisleri: sonuc.satinAlmaSiparisleri.map((s) =>
          s.id === siparis.id
            ? {
                ...s,
                kalemler: guncelKalemler,
                durum: yeniDurum,
                tamamlanmaTarihi: yeniDurum === "Tamamlandı" ? R.zamanDamgasi() : s.tamamlanmaTarihi,
                malKabulGecmisi: [{ id: R.yeniId("mk"), tarih: R.zamanDamgasi(), kullanici: aktifKullanici?.adSoyad || olusturan.trim(), kalemler: kabulEdilenler.map((k) => ({ parcaId: k.parcaId, adet: k.buSeferAdet })) }, ...s.malKabulGecmisi],
              }
            : s
        ),
      };
      return R.islemKaydet(sonuc, {
        kullaniciAdi: aktifKullanici?.adSoyad || olusturan.trim(),
        islemTuru: "Mal kabul yapıldı",
        aciklama: `${siparis.tedarikci} — ${belgeNo}`,
        eskiDeger: `${toplamAlinan - kabulEdilenler.reduce((t, k) => t + k.buSeferAdet, 0)}/${toplamSip} adet`,
        yeniDeger: `${toplamAlinan}/${toplamSip} adet (${yeniDurum})`,
      });
    });
    if (engellendi) {
      R.bildirimGoster("Mal kabul işlenirken bir sorun oluştu.", "hata");
      return;
    }
    R.bildirimGoster("Mal kabul tamamlandı — stok güncellendi, kalan adet açık sipariş olarak kaldı.", "basari");
    setMalKabulSiparis(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
          {["tumu", ...R.SIPARIS_DURUMLARI].map((d) => (
            <button
              key={d}
              onClick={() => setDurumFiltre(d)}
              className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              style={{ background: durumFiltre === d ? R.T.graphite900 : "#fff", color: durumFiltre === d ? "#fff" : R.T.ink500 }}
            >
              {d === "tumu" ? "Tümü" : `${R.siparisDurumGorseli[d].emoji} ${d}`}
            </button>
          ))}
        </div>
        <R.Buton
          onClick={() => {
            formuSifirla();
            setFormAcik(true);
          }}
        >
          <R.Plus size={15} /> Yeni Sipariş
        </R.Buton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 flex flex-col gap-2">
          {filtreliSiparisler.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.ClipboardList} baslik="Sipariş yok" aciklama="Yeni sipariş oluşturun veya Sipariş Önerileri'nden ekleyin." />
            </R.Kart>
          ) : (
            filtreliSiparisler.map((s) => {
              const durum = R.siparisDurumGorseli[s.durum];
              return (
                <button
                  key={s.id}
                  onClick={() => setSeciliSiparisId(s.id)}
                  className="text-left p-3.5 rounded-lg border transition-colors"
                  style={{ borderColor: seciliSiparisId === s.id ? R.T.orange : R.T.steel200, background: seciliSiparisId === s.id ? "#FBE1D5" : "#fff" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate" style={{ color: R.T.ink900 }}>
                      {s.tedarikci}
                    </span>
                    <R.Rozet tone={durum.ton}>
                      {durum.emoji} {s.durum}
                    </R.Rozet>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                    {R.tarihGoster(s.siparisTarihi)} · {s.kalemler.length} kalem · {R.tl(R.siparisGenelToplam(s))}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2">
          {!seciliSiparis ? (
            <R.Kart className="h-full flex items-center justify-center">
              <R.Bos ikon={R.ClipboardList} baslik="Bir sipariş seçin" aciklama="Detaylarını, kalemlerini ve mal kabul durumunu görmek için soldan bir sipariş seçin." />
            </R.Kart>
          ) : (
            <div className="flex flex-col gap-4">
              <R.Kart className="p-4">
                <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <div className="font-semibold text-base flex items-center gap-2" style={{ color: R.T.ink900 }}>
                      {seciliSiparis.tedarikci}
                      <R.Rozet tone={R.siparisDurumGorseli[seciliSiparis.durum].ton}>
                        {R.siparisDurumGorseli[seciliSiparis.durum].emoji} {seciliSiparis.durum}
                      </R.Rozet>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      Sipariş: {R.tarihGoster(seciliSiparis.siparisTarihi)}
                      {seciliSiparis.beklenenTeslimTarihi && ` · Beklenen Teslim: ${R.tarihGoster(seciliSiparis.beklenenTeslimTarihi)}`} · Oluşturan: {seciliSiparis.olusturanKullanici || "—"}
                    </div>
                    {seciliSiparis.aciklama && (
                      <div className="text-xs mt-0.5 italic" style={{ color: R.T.ink500 }}>
                        "{seciliSiparis.aciklama}"
                      </div>
                    )}
                    {seciliSiparis.durum === "İptal" && seciliSiparis.iptalNedeni && (
                      <div className="text-xs mt-0.5" style={{ color: R.T.red }}>
                        İptal nedeni: {seciliSiparis.iptalNedeni}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {seciliSiparis.durum === "Taslak" && (
                      <R.Buton variant="ghost" onClick={() => durumDegistir(seciliSiparis, "Sipariş Verildi")}>
                        Sipariş Ver
                      </R.Buton>
                    )}
                    {(seciliSiparis.durum === "Sipariş Verildi" || seciliSiparis.durum === "Kısmi Geldi") && (
                      <R.Buton onClick={() => malKabulAc(seciliSiparis)}>
                        <R.Package size={14} /> Mal Kabul Yap
                      </R.Buton>
                    )}
                    {seciliSiparis.durum !== "İptal" && seciliSiparis.durum !== "Tamamlandı" && (
                      <button onClick={() => setIptalHedef(seciliSiparis)} title="İptal Et" style={{ color: R.T.red }}>
                        <R.X size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-2 py-1.5">Ürün</th>
                      <th className="text-right font-semibold px-2 py-1.5">Sipariş</th>
                      <th className="text-right font-semibold px-2 py-1.5">Gelen</th>
                      <th className="text-right font-semibold px-2 py-1.5">Bekleyen</th>
                      <th className="text-right font-semibold px-2 py-1.5">Birim Fiyat</th>
                      <th className="text-right font-semibold px-2 py-1.5">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seciliSiparis.kalemler.map((k) => (
                      <tr key={k.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-2 py-1.5">
                          <div style={{ color: R.T.ink900 }}>{k.ad}</div>
                          <div className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                            {k.marka} · {k.stokKodu}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right" style={R.MONO}>
                          {k.adet}
                        </td>
                        <td className="px-2 py-1.5 text-right" style={{ ...R.MONO, color: R.T.green }}>
                          {k.alinanAdet}
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold" style={{ ...R.MONO, color: k.adet - k.alinanAdet > 0 ? "#8A6110" : R.T.ink500 }}>
                          {k.adet - k.alinanAdet}
                        </td>
                        <td className="px-2 py-1.5 text-right" style={R.MONO}>
                          {R.tl(k.birimFiyat)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold" style={R.MONO}>
                          {R.tl(R.siparisKalemNetToplam(k))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end mt-2 text-sm font-semibold" style={{ color: R.T.ink900 }}>
                  Genel Toplam: <span style={{ ...R.MONO, marginLeft: 6 }}>{R.tl(R.siparisGenelToplam(seciliSiparis))}</span>
                </div>
              </R.Kart>

              {seciliSiparis.malKabulGecmisi.length > 0 && (
                <R.Kart className="p-4">
                  <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                    Mal Kabul Geçmişi
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {seciliSiparis.malKabulGecmisi.map((mk) => (
                      <div key={mk.id} className="text-xs px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                        {R.tarihGoster(mk.tarih)} · {mk.kullanici || "—"} · {mk.kalemler.reduce((t, k) => t + k.adet, 0)} adet teslim alındı
                      </div>
                    ))}
                  </div>
                </R.Kart>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Yeni sipariş formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-2xl rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              Yeni Satın Alma Siparişi
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <R.Girdi label="Tedarikçi *" value={tedarikci} onChange={(e) => setTedarikci(e.target.value)} list="tedarikci-listesi" />
              <datalist id="tedarikci-listesi">
                {db.tedarikciler.filter((t) => t.aktif !== false).map((t) => (
                  <option key={t.id} value={t.ad} />
                ))}
              </datalist>
              <R.Girdi label="Oluşturan Kullanıcı" value={olusturan} readOnly />
              <R.Girdi label="Sipariş Tarihi" type="date" value={siparisTarihi} onChange={(e) => setSiparisTarihi(e.target.value)} />
              <R.Girdi label="Beklenen Teslim Tarihi" type="date" value={beklenenTeslimTarihi} onChange={(e) => setBeklenenTeslimTarihi(e.target.value)} />
              <div className="col-span-2">
                <R.Girdi label="Açıklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
              </div>
            </div>

            <div className="relative mb-2">
              <R.Girdi label="Ürün Ekle" value={urunArama} onChange={(e) => setUrunArama(e.target.value)} placeholder="Ürün ara…" />
              {urunAramaSonuclari.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border shadow-lg bg-white max-h-48 overflow-y-auto" style={{ borderColor: R.T.steel300 }}>
                  {urunAramaSonuclari.map((p) => {
                    const bekleyenTalep = R.parcaBekleyenMusteriTalebi(db, p.id);
                    return (
                      <button key={p.id} onMouseDown={() => kalemEkle(p)} className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50" style={{ color: R.T.ink900 }}>
                        <span>{p.ad}</span>
                        <span className="text-xs text-right" style={{ color: R.T.ink500 }}>
                          Son alış: {R.tl(p.sonAlisFiyati || 0)}
                          {bekleyenTalep > 0 && (
                            <div style={{ color: R.T.orangeDark, fontWeight: 600 }}>Bekleyen müşteri talebi: {bekleyenTalep} adet</div>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {kalemler.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {kalemler.map((k) => {
                  const parca = db.parcalar.find((p) => p.id === k.parcaId);
                  const sonAlis = parca?.sonAlisFiyati || 0;
                  const degisimYuzde = sonAlis > 0 ? ((k.birimFiyat - sonAlis) / sonAlis) * 100 : null;
                  // Aynı ürünü farklı tedarikçilerden alma karşılaştırması.
                  const tedarikciFiyatlari = {};
                  (parca?.alisGecmisi || []).forEach((g) => {
                    if (g.tedarikci && !(g.tedarikci in tedarikciFiyatlari)) tedarikciFiyatlari[g.tedarikci] = g.birimFiyat;
                  });
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
                          <input type="number" value={k.adet} onChange={(e) => kalemGuncelle(k.id, "adet", parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 rounded border text-sm outline-none" style={{ borderColor: R.T.steel300, ...R.MONO }} />
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
                          <input type="number" value={k.iskontoYuzde} onChange={(e) => kalemGuncelle(k.id, "iskontoYuzde", parseFloat(e.target.value) || 0)} className="w-16 px-2 py-1 rounded border text-sm outline-none" style={{ borderColor: R.T.steel300, ...R.MONO }} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs" style={{ color: R.T.ink500 }}>
                            KDV %
                          </span>
                          <input type="number" value={k.kdvOrani} onChange={(e) => kalemGuncelle(k.id, "kdvOrani", parseFloat(e.target.value) || 0)} className="w-16 px-2 py-1 rounded border text-sm outline-none" style={{ borderColor: R.T.steel300, ...R.MONO }} />
                        </div>
                        <span className="text-sm font-semibold ml-auto" style={R.MONO}>
                          {R.tl(R.siparisKalemNetToplam(k))}
                        </span>
                      </div>
                      {sonAlis > 0 && (
                        <p className="text-xs mt-1.5" style={{ color: degisimYuzde > 0 ? R.T.red : R.T.green }}>
                          Son alış: {R.tl(sonAlis)} → Yeni alış: {R.tl(k.birimFiyat)} · Değişim: {degisimYuzde >= 0 ? "+" : ""}
                          {degisimYuzde.toFixed(2)}%
                        </p>
                      )}
                      {Object.keys(tedarikciFiyatlari).length > 1 && (
                        <p className="text-xs mt-1" style={{ color: R.T.ink500 }}>
                          Diğer tedarikçiler: {Object.entries(tedarikciFiyatlari).map(([t, f]) => `${t}: ${R.tl(f)}`).join(" · ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <R.Buton onClick={siparisKaydet}>
                <R.Check size={14} /> Siparişi Kaydet (Taslak)
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setFormAcik(false)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Mal Kabul modalı */}
      {malKabulSiparis && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setMalKabulSiparis(null)}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
              Mal Kabul — {malKabulSiparis.tedarikci}
            </h3>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Kısmi teslimat desteklenir: girilen adet kadarı stoğa eklenir, kalanı açık sipariş olarak devam eder.
            </p>
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {malKabulSiparis.kalemler.map((k) => {
                const bekleyen = k.adet - k.alinanAdet;
                if (bekleyen <= 0) return null;
                const gelenAdet = parseFloat(malKabulAdetleri[k.id]) || 0;
                const musteriTalebi = R.parcaBekleyenMusteriTalebi(db, k.parcaId);
                const serbestKalan = Math.max(0, gelenAdet - musteriTalebi);
                return (
                  <div key={k.id} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                    <div>
                      <div className="text-sm" style={{ color: R.T.ink900 }}>
                        {k.ad}
                      </div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        Sipariş: {k.adet} · Önceden gelen: {k.alinanAdet} · Bekleyen: {bekleyen}
                      </div>
                      {gelenAdet > 0 && musteriTalebi > 0 && (
                        <div className="text-xs mt-0.5" style={{ color: "#8A6110" }}>
                          Gelen: {gelenAdet} · Müşteri siparişi: {Math.min(musteriTalebi, gelenAdet)} · Serbest stok: {serbestKalan}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      value={malKabulAdetleri[k.id] || ""}
                      onChange={(e) => setMalKabulAdetleri((prev) => ({ ...prev, [k.id]: e.target.value }))}
                      max={bekleyen}
                      className="w-20 px-2 py-1.5 rounded border text-sm text-right outline-none"
                      style={{ borderColor: R.T.steel300, ...R.MONO }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <R.Buton onClick={malKabulOnayla}>
                <R.Check size={14} /> Mal Kabulü Onayla
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setMalKabulSiparis(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* İptal modalı */}
      {iptalHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setIptalHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Siparişi İptal Et
            </h3>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: R.T.ink500 }}>
                İptal Nedeni *
              </span>
              <textarea value={iptalNedeniMetin} onChange={(e) => setIptalNedeniMetin(e.target.value)} rows={2} className="px-3 py-2 rounded-md border text-sm outline-none resize-none" style={{ borderColor: R.T.steel300, color: R.T.ink900 }} autoFocus />
            </label>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={iptalOnayla}>
                <R.X size={14} /> İptal Et
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
