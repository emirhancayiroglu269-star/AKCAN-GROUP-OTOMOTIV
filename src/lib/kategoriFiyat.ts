import type { DB, Urun } from './types';
import { gunu } from './format';
import { gecerliHareketler, hareketTutar, netAlis, netSatis, type Donem } from './analiz';
import { onerilenFiyat, sonAlislar, sonSatislar } from './analiz2';

export type Durum = 'artir' | 'indir' | 'uygun' | 'maliyetsiz';
export interface KatUrun { u: Urun; maliyet: number; maliyetKaynak: 'fatura' | 'kart' | null; marj: number | null; oneri: number | null; durum: Durum; satilan90: number; sonSatis?: string; aylikEtki: number }
export interface KatOzet {
  ad: string; urunSay: number; stokDeger: number; satisSatir: number; satilan: number; ciroNet: number; kar: number;
  gerceklesenMarj: number | null; p75: number | null; listeMarj: number | null; stokGunu: number;
  onerilen: number; neden: string; hedef: number; kayitli: boolean;
  urunler: KatUrun[]; artir: number; indir: number; aylikEtki: number; indirDeger: number;
}

const yuvarla5 = (x: number) => Math.round(x / 5) * 5;
const yuzdelik = (l: number[], p: number) => { if (!l.length) return null; const s = [...l].sort((a, b) => a - b); const i = (s.length - 1) * p; const a = Math.floor(i), b = Math.ceil(i); return s[a] + (s[b] - s[a]) * (i - a); };
const gun = (fark: number) => gunu(new Date(Date.now() - fark * 864e5));
const gunFark = (a: string, b: string) => Math.round((new Date(a + 'T12:00').getTime() - new Date(b + 'T12:00').getTime()) / 864e5);

/** Kategori bazında gerçekleşen/liste marjı, önerilen hedef marj ve ürün fiyat önerileri */
export function kategoriFiyatlama(db: DB, taslak?: Record<string, number>): KatOzet[] {
  const a = db.ayarlar; const genelHedef = a.hedef_marj ?? 35;
  const kayitli = { ...(a.kategori_marj ?? {}), ...(taslak ?? {}) };
  const ilk = db.bh_durum?.rapor_ilk ?? gun(180);
  const d: Donem = { bas: gun(179) > ilk ? gun(179) : ilk, bit: gunu() };
  const gunSay = Math.max(1, gunFark(d.bit, d.bas) + 1);
  const d90bas = gun(89);
  const sonAl = sonAlislar(db), sonSat = sonSatislar(db);
  const urunMap = new Map(db.urunler.map((u) => [u.id, u]));

  type Topl = { satir: number; satilan: number; ciroNet: number; kar: number; smm: number; marjlar: number[] };
  const top = new Map<string, Topl>(); const adet90 = new Map<string, number>(), adet180 = new Map<string, number>();
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis' || !(h.alis_fiyati > 0) || !(h.miktar > 0)) continue;
    const u = urunMap.get(h.urun_id); if (!u?.kategori) continue;
    const t = hareketTutar(h, a); if (!(t.ciroNet > 0)) continue;
    const x = top.get(u.kategori) ?? { satir: 0, satilan: 0, ciroNet: 0, kar: 0, smm: 0, marjlar: [] };
    x.satir++; x.satilan += h.miktar; x.ciroNet += t.ciroNet; x.kar += t.kar; x.smm += t.maliyet; x.marjlar.push((t.kar / t.ciroNet) * 100); top.set(u.kategori, x);
    adet180.set(u.id, (adet180.get(u.id) ?? 0) + h.miktar);
    if (gunu(h.tarih) >= d90bas) adet90.set(u.id, (adet90.get(u.id) ?? 0) + h.miktar);
  }
  // hızlı dönen kategoriler: en çok satış satırı olan %10'luk dilim (en az 50 satış)
  const satirlar = [...top.values()].map((x) => x.satir).sort((p, q) => p - q);
  const hizliSinir = Math.max(50, satirlar.length ? satirlar[Math.floor(satirlar.length * 0.9)] : 0);

  const katlar = new Map<string, Urun[]>();
  for (const u of db.urunler) if (u.aktif && u.kategori && u.satis_fiyati > 0) { const l = katlar.get(u.kategori) ?? []; l.push(u); katlar.set(u.kategori, l); }

  return [...katlar.entries()].map(([ad, urunler]) => {
    const t = top.get(ad);
    const maliyetler = urunler.map((u) => {
      const s = sonAl.get(u.id); const kart = u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, a) : 0;
      const maliyet = Math.max(kart, s?.fiyat ?? 0);
      return { u, maliyet, kaynak: (maliyet <= 0 ? null : s && s.fiyat >= kart ? 'fatura' : 'kart') as KatUrun['maliyetKaynak'] };
    });
    const listeMarjlar = maliyetler.filter((m) => m.maliyet > 0).map((m) => { const n = netSatis(m.u.satis_fiyati, m.u.kdv); return ((n - m.maliyet) / n) * 100; });
    const listeMarj = yuzdelik(listeMarjlar, 0.5);
    const gerceklesen = t && t.ciroNet > 0 ? (t.kar / t.ciroNet) * 100 : null;
    const p75 = t && t.marjlar.length >= 5 ? yuzdelik(t.marjlar, 0.75) : null;

    let onerilen: number; let neden: string;
    if (p75 !== null) {
      onerilen = yuvarla5(p75);
      neden = `Son 6 ayda bu kategorideki satışların dörtte biri %${p75.toFixed(0)} ve üstü marjla yapılmış; müşteri bu fiyatı kabul ediyor.`;
      const hizli = t!.satir >= hizliSinir;
      const tavan = gerceklesen !== null ? Math.max(15, yuvarla5(gerceklesen + (hizli ? 5 : 10))) : Infinity;
      if (onerilen > tavan) {
        onerilen = tavan;
        neden = hizli
          ? `Çok satılan, fiyatı karşılaştırılan kategori: ortalama marj %${gerceklesen!.toFixed(0)}, en fazla 5 puan artış önerilir (satışların dörtte biri %${p75.toFixed(0)}+ marjla yapılmış).`
          : `Aşamalı artış: ortalama marj %${gerceklesen!.toFixed(0)}, en fazla 10 puan artış önerilir (satışların dörtte biri %${p75.toFixed(0)}+ marjla yapılmış). Satış düşmezse tekrar artırılabilir.`;
      }
    } else if (listeMarj !== null) {
      onerilen = yuvarla5(listeMarj);
      neden = `Yeterli satış yok; kartlardaki fiyatların ortanca marjı (%${listeMarj.toFixed(0)}) esas alındı.`;
    } else { onerilen = genelHedef; neden = 'Satış ve maliyet bilgisi yok; genel hedef marj kullanıldı.'; }
    onerilen = Math.min(60, Math.max(15, onerilen));
    const hedef = kayitli[ad] ?? onerilen;

    const ku: KatUrun[] = maliyetler.map(({ u, maliyet, kaynak }) => {
      const n = netSatis(u.satis_fiyati, u.kdv);
      const marj = maliyet > 0 ? ((n - maliyet) / n) * 100 : null;
      const oneri = onerilenFiyat(u, maliyet, hedef);
      const s90 = adet90.get(u.id) ?? 0; const son = sonSat.get(u.id);
      let durum: Durum = 'uygun';
      if (oneri === null || marj === null) durum = 'maliyetsiz';
      else if (u.satis_fiyati < oneri * 0.97) durum = 'artir';
      else if (u.stok > 0 && s90 === 0 && marj > hedef + 15 && (!son || gunFark(gunu(), son) > 90)) durum = 'indir';
      const aylikEtki = durum === 'artir' && oneri ? (netSatis(oneri, u.kdv) - n) * (adet180.get(u.id) ?? 0) * (30 / gunSay) : 0;
      return { u, maliyet, maliyetKaynak: kaynak, marj, oneri, durum, satilan90: s90, sonSatis: son, aylikEtki };
    });
    const stokDeger = maliyetler.reduce((s, m) => s + (m.u.stok > 0 ? m.u.stok * m.maliyet : 0), 0);
    const indirler = ku.filter((x) => x.durum === 'indir');
    return {
      ad, urunSay: urunler.length, stokDeger, satisSatir: t?.satir ?? 0, satilan: t?.satilan ?? 0, ciroNet: t?.ciroNet ?? 0, kar: t?.kar ?? 0,
      gerceklesenMarj: gerceklesen, p75, listeMarj, stokGunu: t && t.smm > 0 ? stokDeger / (t.smm / gunSay) : Infinity,
      onerilen, neden, hedef, kayitli: ad in kayitli, urunler: ku,
      artir: ku.filter((x) => x.durum === 'artir').length, indir: indirler.length, aylikEtki: ku.reduce((s, x) => s + x.aylikEtki, 0),
      indirDeger: indirler.reduce((s, x) => s + x.u.stok * x.maliyet, 0),
    };
  }).sort((x, y) => y.ciroNet - x.ciroNet || y.stokDeger - x.stokDeger);
}
