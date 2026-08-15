import React, { useState, useEffect } from "react";
import { FileDown, Printer, RotateCcw, Search, X } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { bildirimGoster } from "../lib/bildirim";
import { yeniId, tl, tarihGoster, zamanDamgasi } from "../lib/format";
import { islemKaydet, yetkiVarMi, BELGE_TURLERI } from "../lib/constants";
import { stokHareketiUygula } from "../lib/database";
import { setBilesenDetaylari } from "../services/stok-service";
import { satisAramaYap } from "../lib/arama";
import { belgeYazdir } from "../lib/belge-yazdirma";
import { cariHareketiUygula, hesapHareketiUygula } from "../lib/cari-kasa";
import { yoneticiOnayiAl } from "../lib/yonetici-onay";
import { Kart, Buton, Bos, Rozet } from "../components/ui";

export function BelgelerSayfasi({ db, updateDb, aktifKullanici, setSekme, belgeHedefiSatisId }) {
  const [aramaMetin, setAramaMetin] = useState("");
  const [baslangicTarih, setBaslangicTarih] = useState("");
  const [bitisTarih, setBitisTarih] = useState("");
  const [minTutar, setMinTutar] = useState("");
  const [maxTutar, setMaxTutar] = useState("");
  const [belgeTuruFiltre, setBelgeTuruFiltre] = useState("");
  const [seciliBelgeId, setSeciliBelgeId] = useState(null);
  const [iptalHedefBelge, setIptalHedefBelge] = useState(null);
  const [iptalNedeniMetin, setIptalNedeniMetin] = useState("");

  // Ekstre ekranındaki "Belgeye Git" tıklaması buraya bir satış id'si taşır —
  // geldiğinde ilgili belgenin detayını otomatik açar.
  useEffect(() => {
    if (belgeHedefiSatisId) setSeciliBelgeId(belgeHedefiSatisId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [belgeHedefiSatisId]);

  const filtreliBelgeler = (() => {
    let sonuc = aramaMetin.trim()
      ? satisAramaYap(db, aramaMetin)
      : [...db.satislar].sort((a, b) => new Date(b.tarih) - new Date(a.tarih)).slice(0, 60);
    if (baslangicTarih) sonuc = sonuc.filter((s) => s.tarih.slice(0, 10) >= baslangicTarih);
    if (bitisTarih) sonuc = sonuc.filter((s) => s.tarih.slice(0, 10) <= bitisTarih);
    if (minTutar) sonuc = sonuc.filter((s) => s.genelToplam >= parseFloat(minTutar));
    if (maxTutar) sonuc = sonuc.filter((s) => s.genelToplam <= parseFloat(maxTutar));
    if (belgeTuruFiltre) sonuc = sonuc.filter((s) => (s.belgeTuru || "Satış Fişi") === belgeTuruFiltre);
    return sonuc;
  })();

  const seciliBelge = seciliBelgeId ? db.satislar.find((s) => s.id === seciliBelgeId) : null;

  const belgeIptalEt = (satis) => {
    if (!yetkiVarMi(db, aktifKullanici, "satisIptalEdebilir")) {
      const onay = yoneticiOnayiAl(db, "Satış iptal etme yetkiniz yok. Yönetici onayı gerekiyor.");
      if (!onay) {
        bildirimGoster("İptal edilmedi — yönetici onayı verilmedi.", "hata");
        return;
      }
    }
    setIptalHedefBelge(satis);
    setIptalNedeniMetin("");
  };

  const iptalOnayla = () => {
    if (!iptalNedeniMetin.trim()) {
      bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    const satis = iptalHedefBelge;
    const belgeNo = satis.belgeNo || satis.id.slice(-6).toUpperCase();
    const iptalEden = aktifKullanici?.adSoyad || "";
    const iptalTarihi = zamanDamgasi();
    let iptalFinansEngellendi = false;
    let zatenIptal = false;

    updateDb((prev) => {
      const mevcutSatis = prev.satislar.find((x) => x.id === satis.id);
      if (!mevcutSatis || mevcutSatis.durum === "İptal Edildi") {
        zatenIptal = true;
        return prev;
      }

      let sonuc = islemKaydet(prev, {
        kullaniciAdi: iptalEden,
        islemTuru: "Belge iptal edildi",
        aciklama: `${belgeNo} (${mevcutSatis.musteriAdi}) — Sebep: ${iptalNedeniMetin.trim()}`,
        eskiDeger: "Tamamlandı",
        yeniDeger: "İptal Edildi",
      });

      // Set satışında setin kendisini değil, bileşen stoklarını geri ekle.
      for (const k of mevcutSatis.kalemler || []) {
        const parca = sonuc.parcalar.find((p) => p.id === k.parcaId);
        if (!parca) continue;
        if (parca.urunTipi === "Set") {
          for (const bilesen of setBilesenDetaylari(sonuc, parca)) {
            sonuc = stokHareketiUygula(sonuc, {
              parcaId: bilesen.parcaId,
              tur: "Satış İadesi",
              giris: bilesen.adet * k.adet,
              belgeNo,
              kullanici: mevcutSatis.satisiYapan || "",
              aciklama: `İptal: ${belgeNo} — Set: ${parca.ad}`,
            }) || sonuc;
          }
        } else {
          sonuc = stokHareketiUygula(sonuc, {
            parcaId: k.parcaId,
            tur: "Satış İadesi",
            giris: k.adet,
            belgeNo,
            kullanici: mevcutSatis.satisiYapan || "",
            aciklama: `İptal: ${belgeNo} (${iptalNedeniMetin.trim()})`,
          }) || sonuc;
        }
      }

      const odemeler = mevcutSatis.odemeler || [];
      const acikHesapTutari = odemeler
        .filter((o) => o.yontem === "Açık Hesap")
        .reduce((t, o) => t + (Number(o.tutar) || 0), 0);

      if (acikHesapTutari > 0) {
        sonuc = cariHareketiUygula(sonuc, {
          musteriId: mevcutSatis.musteriId,
          musteriAdi: mevcutSatis.musteriAdi,
          tutar: acikHesapTutari,
          tur: "ödeme",
          aciklama: "İptal edilen belge",
          belgeNo,
          kaynakSatisId: mevcutSatis.id,
        });
      }

      // Nakit/havale gibi hesaba gerçekten giren satış tahsilatlarını tersle.
      for (const o of odemeler.filter(
        (o) => o.yontem !== "Kredi Kartı" && o.yontem !== "Açık Hesap" && o.hesapId
      )) {
        const hesap = sonuc.hesaplar.find((h) => h.id === o.hesapId);
        const tutar = Number(o.tutar) || 0;
        if (!hesap || (Number(hesap.bakiye) || 0) < tutar - 0.01) {
          iptalFinansEngellendi = true;
          break;
        }
        sonuc = hesapHareketiUygula(sonuc, {
          hesapId: o.hesapId,
          tur: "Satış İptali",
          cikis: tutar,
          belgeNo,
          aciklama: `İptal: ${belgeNo}`,
          kullanici: mevcutSatis.satisiYapan || "",
          kaynakId: `${mevcutSatis.id}:iptal:${o.yontem}:${o.hesapId}`,
        });
      }

      // Mutabakat gerçekleşmiş POS satışında gerçek banka girişini tersle.
      if (!iptalFinansEngellendi) {
        for (const o of odemeler.filter((o) => o.yontem === "Kredi Kartı" && o.posId)) {
          const posTahsilat = sonuc.posTahsilatlari.find(
            (t) => t.kaynakSatisId === mevcutSatis.id && t.posId === o.posId && t.durum !== "İptal"
          );
          if (!posTahsilat) continue;

          if (posTahsilat.gercekTutar != null) {
            const pos = sonuc.posCihazlari.find((p) => p.id === o.posId);
            const hesapId = pos?.hesapId;
            const hesap = hesapId ? sonuc.hesaplar.find((h) => h.id === hesapId) : null;
            const tutar = Number(posTahsilat.gercekTutar) || 0;
            if (!hesap || (Number(hesap.bakiye) || 0) < tutar - 0.01) {
              iptalFinansEngellendi = true;
              break;
            }
            const kaynakId = `pos:${posTahsilat.id}:iptal`;
            if (!(hesap.hareketler || []).some((h) => h.kaynakId === kaynakId)) {
              sonuc = hesapHareketiUygula(sonuc, {
                hesapId,
                tur: "POS Satış İptali",
                cikis: tutar,
                belgeNo,
                aciklama: `POS iade/iptal: ${belgeNo}`,
                kullanici: mevcutSatis.satisiYapan || "",
                kaynakId,
              });
            }
          }

          sonuc = {
            ...sonuc,
            posTahsilatlari: sonuc.posTahsilatlari.map((t) =>
              t.id === posTahsilat.id ? { ...t, durum: "İptal", iptalTarihi } : t
            ),
          };
        }
      }

      if (iptalFinansEngellendi) return prev;

      return {
        ...sonuc,
        satislar: sonuc.satislar.map((s) =>
          s.id === mevcutSatis.id
            ? {
                ...s,
                durum: "İptal Edildi",
                iptalNedeni: iptalNedeniMetin.trim(),
                iptalEden,
                iptalTarihi,
              }
            : s
        ),
      };
    });

    if (zatenIptal) {
      bildirimGoster("Bu belge zaten iptal edilmiş.", "hata");
      setIptalHedefBelge(null);
      return;
    }
    if (iptalFinansEngellendi) {
      bildirimGoster("İptal için kasa/banka bakiyesi yetersiz. İşlem geri alınmadı.", "hata");
      return;
    }

    bildirimGoster("Belge iptal edildi, stoklar geri eklendi.", "basari");
    setIptalHedefBelge(null);
    setSeciliBelgeId(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <Kart className="p-4 flex flex-col gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.ink500 }} />
          <input
            value={aramaMetin}
            onChange={(e) => setAramaMetin(e.target.value)}
            placeholder="Belge no, müşteri, telefon, ürün kodu, OEM veya personel ara…"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: T.steel300, color: T.ink900 }}
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: T.ink500 }}>
              Başlangıç
            </span>
            <input type="date" value={baslangicTarih} onChange={(e) => setBaslangicTarih(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: T.ink500 }}>
              Bitiş
            </span>
            <input type="date" value={bitisTarih} onChange={(e) => setBitisTarih(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: T.ink500 }}>
              Min. Tutar
            </span>
            <input type="number" value={minTutar} onChange={(e) => setMinTutar(e.target.value)} className="w-24 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: T.ink500 }}>
              Maks. Tutar
            </span>
            <input type="number" value={maxTutar} onChange={(e) => setMaxTutar(e.target.value)} className="w-24 px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: T.steel300 }} />
          </div>
          <select value={belgeTuruFiltre} onChange={(e) => setBelgeTuruFiltre(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: T.steel300, color: T.ink900 }}>
            <option value="">Tüm Belge Türleri</option>
            {BELGE_TURLERI.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </Kart>

      <Kart className="overflow-hidden">
        {filtreliBelgeler.length === 0 ? (
          <Bos ikon={FileDown} baslik="Belge bulunamadı" aciklama="Arama veya filtre kriterlerini değiştirin." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: T.steel100, color: T.ink500 }}>
                  <th className="text-left font-semibold px-3 py-2">Belge No</th>
                  <th className="text-left font-semibold px-2 py-2">Tarih</th>
                  <th className="text-left font-semibold px-2 py-2">Müşteri</th>
                  <th className="text-left font-semibold px-2 py-2">Personel</th>
                  <th className="text-right font-semibold px-2 py-2">Tutar</th>
                  <th className="text-center font-semibold px-2 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filtreliBelgeler.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSeciliBelgeId(s.id)}
                    className="cursor-pointer hover:bg-gray-50"
                    style={{ borderTop: `1px solid ${T.steel200}`, opacity: s.durum === "İptal Edildi" ? 0.55 : 1 }}
                  >
                    <td className="px-3 py-2.5" style={MONO}>
                      {s.belgeNo || s.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-2 py-2.5" style={{ color: T.ink500 }}>
                      {new Date(s.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-2 py-2.5" style={{ color: T.ink900 }}>
                      {s.musteriAdi}
                    </td>
                    <td className="px-2 py-2.5" style={{ color: T.ink500 }}>
                      {s.satisiYapan || "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold" style={MONO}>
                      {tl(s.genelToplam)}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {s.durum === "İptal Edildi" ? <Rozet tone="red">❌ İptal</Rozet> : <Rozet tone="green">✓ {s.belgeTuru || "Satış Fişi"}</Rozet>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kart>

      {/* Belge detayı */}
      {seciliBelge && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSeciliBelgeId(null)}>
          <div className="w-full max-w-2xl rounded-lg overflow-hidden" style={{ background: "#fff", maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${T.steel200}` }}>
              <div>
                <div className="font-semibold text-sm flex items-center gap-2" style={{ color: T.ink900 }}>
                  <span style={MONO}>{seciliBelge.belgeNo || seciliBelge.id.slice(-6).toUpperCase()}</span>
                  <Rozet tone="steel">{seciliBelge.belgeTuru || "Satış Fişi"}</Rozet>
                  {seciliBelge.durum === "İptal Edildi" && <Rozet tone="red">❌ İptal Edildi</Rozet>}
                </div>
                <div className="text-xs" style={{ color: T.ink500 }}>
                  {tarihGoster(seciliBelge.tarih)} · {seciliBelge.musteriAdi}
                </div>
              </div>
              <button onClick={() => setSeciliBelgeId(null)} style={{ color: T.ink500 }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto" style={{ maxHeight: "68vh" }}>
              {seciliBelge.durum === "İptal Edildi" && (
                <div className="mb-3 px-3 py-2 rounded-md text-sm" style={{ background: "#F9DEDE", color: T.red }}>
                  ❌ İptal edildi<br />
                  İptal eden: {seciliBelge.iptalEden || "—"}<br />
                  Tarih: {seciliBelge.iptalTarihi ? tarihGoster(seciliBelge.iptalTarihi) : "—"}<br />
                  Sebep: {seciliBelge.iptalNedeni || "—"}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <div className="text-xs" style={{ color: T.ink500 }}>
                    Satışı Yapan
                  </div>
                  <div style={{ color: T.ink900 }}>{seciliBelge.satisiYapan || "—"}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: T.ink500 }}>
                    Ödeme Yöntemi
                  </div>
                  <div style={{ color: T.ink900 }}>{seciliBelge.odemeler.map((o) => o.yontem).join(" + ")}</div>
                </div>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr style={{ background: T.steel100, color: T.ink500 }}>
                    <th className="text-left font-semibold px-2 py-1.5">Ürün / OEM</th>
                    <th className="text-left font-semibold px-2 py-1.5">Marka</th>
                    <th className="text-right font-semibold px-2 py-1.5">Adet</th>
                    <th className="text-right font-semibold px-2 py-1.5">B. Fiyat</th>
                    <th className="text-right font-semibold px-2 py-1.5">İskonto</th>
                    <th className="text-right font-semibold px-2 py-1.5">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {seciliBelge.kalemler.map((k, i) => {
                    const oemler = db.kodlar.filter((kd) => kd.parcaId === k.parcaId && kd.tip === "OEM").map((kd) => kd.kod);
                    return (
                      <tr key={i} style={{ borderTop: `1px solid ${T.steel200}` }}>
                        <td className="px-2 py-1.5">
                          <div style={{ color: T.ink900 }}>{k.ad}</div>
                          <div className="text-xs" style={{ ...MONO, color: T.ink500 }}>
                            {k.stokKodu}
                            {oemler.length > 0 && ` · OEM: ${oemler.join(", ")}`}
                          </div>
                        </td>
                        <td className="px-2 py-1.5" style={{ color: T.ink500 }}>
                          {k.marka}
                        </td>
                        <td className="px-2 py-1.5 text-right" style={MONO}>
                          {k.adet} {k.birim}
                        </td>
                        <td className="px-2 py-1.5 text-right" style={MONO}>
                          {tl(k.birimFiyat)}
                        </td>
                        <td className="px-2 py-1.5 text-right" style={MONO}>
                          {tl(k.iskontoTutari || 0)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold" style={MONO}>
                          {tl(k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex flex-col gap-1 text-sm max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span style={{ color: T.ink500 }}>Ara Toplam</span>
                  <span style={MONO}>{tl(seciliBelge.araToplam)}</span>
                </div>
                {seciliBelge.iskontoToplam > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: T.ink500 }}>İskonto</span>
                    <span style={MONO}>−{tl(seciliBelge.iskontoToplam)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: T.ink500 }}>KDV (dahil)</span>
                  <span style={MONO}>{tl(seciliBelge.kdvToplam)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1" style={{ borderTop: `1px solid ${T.steel200}` }}>
                  <span>Genel Toplam</span>
                  <span style={MONO}>{tl(seciliBelge.genelToplam)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-3.5" style={{ borderTop: `1px solid ${T.steel200}` }}>
              <Buton onClick={() => belgeYazdir(db, seciliBelge)}>
                <Printer size={14} /> Yazdır
              </Buton>
              <Buton variant="ghost" onClick={() => belgeYazdir(db, seciliBelge)}>
                <FileDown size={14} /> PDF (Yazdır penceresinden "Farklı Kaydet")
              </Buton>
              <Buton variant="ghost" onClick={() => belgeYazdir(db, seciliBelge)}>
                <RotateCcw size={14} /> Yeniden Yazdır
              </Buton>
              {seciliBelge.durum !== "İptal Edildi" && yetkiVarMi(db, aktifKullanici, "iadeAlabilir") && (
                <Buton variant="ghost" onClick={() => setSekme("iade")}>
                  <RotateCcw size={14} /> İade Başlat
                </Buton>
              )}
              {seciliBelge.durum !== "İptal Edildi" && (
                <Buton variant="danger" onClick={() => belgeIptalEt(seciliBelge)}>
                  <X size={14} /> İptal
                </Buton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* İptal nedeni modalı */}
      {iptalHedefBelge && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setIptalHedefBelge(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
              İptal Nedeni
            </h3>
            <p className="text-xs mb-3" style={{ color: T.ink500 }}>
              {iptalHedefBelge.belgeNo || iptalHedefBelge.id.slice(-6).toUpperCase()} — {tl(iptalHedefBelge.genelToplam)}
            </p>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: T.ink500 }}>
                Neden *
              </span>
              <textarea
                value={iptalNedeniMetin}
                onChange={(e) => setIptalNedeniMetin(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                style={{ borderColor: T.steel300, color: T.ink900 }}
                placeholder="ör. Yanlış ürün"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <Buton variant="danger" onClick={iptalOnayla}>
                <RotateCcw size={14} /> İptali Onayla
              </Buton>
              <Buton variant="ghost" onClick={() => setIptalHedefBelge(null)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
