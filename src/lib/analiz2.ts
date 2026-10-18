import type { DB, Hareket, ID, Urun } from './types';
import { gunu } from './format';
import { gecerliHareketler, hareketTutar, hizmetMi, netAlis, netSatis, type Donem } from './analiz';

const gunFark = (a: string, b: string) => Math.round((new Date(a + 'T12:00').getTime() - new Date(b + 'T12:00').getTime()) / 864e5);
export const PERAKENDE_RE = /PERAKENDE/i;

/** Satış satırının kârı: maliyetli ürünse brüt kâr, hizmetse gelirin tamamı (dış hizmet ayrı düşülür) */
export function satirKar(h: Hareket, db: DB, urun: Map<ID, Urun>) {
  const x = hareketTutar(h, db.ayarlar);
  if (!x.maliyetYok) return { ciro: x.ciro, net: x.ciroNet, kar: x.kar };
  return { ciro: x.ciro, net: x.ciroNet, kar: hizmetMi(h, urun.get(h.urun_id)) ? x.ciroNet : 0 };
}

// ======================= MÜŞTERİ =======================
export type Segment = 'Sadık' | 'Düzenli' | 'Yeni' | 'Riskte' | 'Kaybedilen' | 'Tek seferlik' | 'Perakende';
export interface MusteriOzet {
  guid: string; ad: string; telefon?: string | null; bakiye?: number; ciro: number; net: number; kar: number; belge: number; ilk: string; son: string;
  ortSepet: number; ortAralik: number | null; sonGecen: number; segment: Segment; urunCesit: number;
}
export function musteriAnalizi(db: DB, d: Donem): MusteriOzet[] {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const cari = new Map(db.cariler.filter((c) => c.tur === 'musteri').map((c) => [c.bh_id, c]));
  const m = new Map<string, { ad: string; ciro: number; net: number; kar: number; belgeler: Set<string>; gunler: Set<string>; urunler: Set<string>; ilk: string; son: string }>();
  // tüm zamanlar: ilk/son alış ve aralık için; dönem içi: tutarlar
  const tum = db.hareketler.filter((h) => h.tur === 'satis' && h.cari_guid && !h.yok_say);
  for (const h of tum) {
    const g = gunu(h.tarih);
    let x = m.get(h.cari_guid!);
    if (!x) { x = { ad: h.cari_ad ?? '—', ciro: 0, net: 0, kar: 0, belgeler: new Set(), gunler: new Set(), urunler: new Set(), ilk: g, son: g }; m.set(h.cari_guid!, x); }
    if (g < x.ilk) x.ilk = g; if (g > x.son) x.son = g;
    x.gunler.add(g);
    if (g >= d.bas && g <= d.bit) {
      const k = satirKar(h, db, urun);
      x.ciro += k.ciro; x.net += k.net; x.kar += k.kar; x.belgeler.add(h.belge_guid ?? g); x.urunler.add(h.urun_id);
    }
  }
  const bugun = gunu();
  return [...m.entries()].map(([guid, x]) => {
    const c = cari.get(guid);
    const gunler = [...x.gunler].sort();
    const ortAralik = gunler.length > 1 ? gunFark(gunler[gunler.length - 1], gunler[0]) / (gunler.length - 1) : null;
    const sonGecen = gunFark(bugun, x.son);
    const seg: Segment = PERAKENDE_RE.test(x.ad) ? 'Perakende'
      : gunler.length === 1 ? (sonGecen <= 30 ? 'Yeni' : 'Tek seferlik')
      : sonGecen > 90 ? 'Kaybedilen'
      : ortAralik !== null && sonGecen > Math.max(45, ortAralik * 2.5) ? 'Riskte'
      : gunler.length >= 6 ? 'Sadık' : gunFark(bugun, x.ilk) <= 30 ? 'Yeni' : 'Düzenli';
    return { guid, ad: c?.ad ?? x.ad, telefon: c?.telefon, bakiye: c?.bakiye, ciro: x.ciro, net: x.net, kar: x.kar, belge: x.belgeler.size, ilk: x.ilk, son: x.son,
      ortSepet: x.belgeler.size ? x.ciro / x.belgeler.size : 0, ortAralik, sonGecen, segment: seg, urunCesit: x.urunler.size };
  });
}

// ======================= ZAMAN & DÖNEM =======================
export function zamanAnalizi(db: DB, d: Donem) {
  const gunler = Array.from({ length: 7 }, () => ({ ciro: 0, belge: new Set<string>(), gunSay: new Set<string>(), gunluk: new Map<string, number>() }));
  const saatler = Array.from({ length: 24 }, () => ({ ciro: 0, belge: new Set<string>() }));
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis') continue;
    const t = new Date(h.tarih); const ciro = h.miktar * h.satis_fiyati;
    const gi = (t.getDay() + 6) % 7; // Pazartesi = 0
    gunler[gi].ciro += ciro; gunler[gi].belge.add(h.belge_guid ?? h.tarih); gunler[gi].gunSay.add(gunu(h.tarih)); gunler[gi].gunluk.set(gunu(h.tarih), (gunler[gi].gunluk.get(gunu(h.tarih)) ?? 0) + ciro);
    if (h.saat) { const s = Number(h.saat.slice(0, 2)); if (s >= 0 && s < 24) { saatler[s].ciro += ciro; saatler[s].belge.add(h.belge_guid ?? h.tarih); } }
  }
  return {
    gunler: gunler.map((x, i) => ({ ad: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][i], ciro: x.ciro, belge: x.belge.size, ortalama: x.gunSay.size ? x.ciro / x.gunSay.size : 0,
      // tipik gün: tek seferlik büyük satışlardan etkilenmeyen ortanca günlük ciro
      medyan: (() => { const l = [...x.gunluk.values()].sort((a, b) => a - b); const n = l.length; return n ? (n % 2 ? l[(n - 1) / 2] : (l[n / 2 - 1] + l[n / 2]) / 2) : 0; })(), gunSayisi: x.gunSay.size })),
    saatler: saatler.map((x, i) => ({ saat: i, ciro: x.ciro, belge: x.belge.size })),
    saatVar: saatler.some((x) => x.ciro > 0),
  };
}

export function aylikSeri(db: DB) {
  const m = new Map<string, { ciro: number; kar: number; masraf: number; alis: number }>();
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const al = (k: string) => { let x = m.get(k); if (!x) { x = { ciro: 0, kar: 0, masraf: 0, alis: 0 }; m.set(k, x); } return x; };
  for (const h of db.hareketler) {
    if (h.yok_say) continue;
    const k = gunu(h.tarih).slice(0, 7);
    if (h.tur === 'satis') { const s = satirKar(h, db, urun); al(k).ciro += s.ciro; al(k).kar += s.kar; }
    else al(k).alis += h.miktar * h.alis_fiyati;
  }
  const haric = new Set(db.ayarlar.haric_masraf ?? []);
  for (const x of db.masraflar) if (!haric.has(`${x.ana ?? ''}/${x.alt ?? ''}`)) al(x.tarih.slice(0, 7)).masraf += x.tutar;
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([ay, v]) => ({ ay, ...v }));
}

export function oncekiDonem(d: Donem): Donem {
  const uzun = gunFark(d.bit, d.bas) + 1;
  const bit = new Date(new Date(d.bas + 'T12:00').getTime() - 864e5);
  const bas = new Date(bit.getTime() - (uzun - 1) * 864e5);
  return { bas: gunu(bas), bit: gunu(bit) };
}

export function donemOzet(db: DB, d: Donem) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  let ciro = 0, kar = 0, adet = 0; const belge = new Set<string>(), musteri = new Set<string>();
  const kat = new Map<string, number>(), urn = new Map<string, { ad: string; ciro: number; adet: number }>(), kisi = new Map<string, { ciro: number; kar: number; belge: Set<string> }>();
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis') continue;
    const s = satirKar(h, db, urun); const u = urun.get(h.urun_id);
    ciro += s.ciro; kar += s.kar; adet += h.miktar; belge.add(h.belge_guid ?? h.tarih); if (h.cari_guid && !PERAKENDE_RE.test(h.cari_ad ?? '')) musteri.add(h.cari_guid);
    const k = u?.kategori || (hizmetMi(h, u) ? 'Hizmet / işçilik' : 'Kategorisiz'); kat.set(k, (kat.get(k) ?? 0) + s.ciro);
    const ad = u?.ad ?? h.urun_ad ?? '—'; const x = urn.get(h.urun_id) ?? { ad, ciro: 0, adet: 0 }; x.ciro += s.ciro; x.adet += h.miktar; urn.set(h.urun_id, x);
    const kk = h.kullanici || '—'; const p = kisi.get(kk) ?? { ciro: 0, kar: 0, belge: new Set() }; p.ciro += s.ciro; p.kar += s.kar; p.belge.add(h.belge_guid ?? h.tarih); kisi.set(kk, p);
  }
  return { ciro, kar, adet, belge: belge.size, musteri: musteri.size, ortSepet: belge.size ? ciro / belge.size : 0, kat, urn, kisi };
}

// ======================= STOK SAĞLIĞI =======================
export function sonSatislar(db: DB) {
  const m = new Map<ID, string>();
  for (const h of db.hareketler) if (h.tur === 'satis' && !h.yok_say) { const g = gunu(h.tarih); const o = m.get(h.urun_id); if (!o || g > o) m.set(h.urun_id, g); }
  return m;
}
export function sonAlislar(db: DB) {
  const m = new Map<ID, { tarih: string; fiyat: number; tedarikci?: string | null }>();
  for (const h of db.hareketler) if (h.tur === 'alis' && h.kaynak === 'fatura') { const g = gunu(h.tarih); const o = m.get(h.urun_id); if (!o || g > o.tarih) m.set(h.urun_id, { tarih: g, fiyat: h.alis_fiyati, tedarikci: h.cari_ad }); }
  return m;
}

export function devirHizi(db: DB, d: Donem) {
  const gun = Math.max(1, gunFark(d.bit < gunu() ? d.bit : gunu(), d.bas) + 1);
  const kat = new Map<string, { smm: number; stok: number; urun: number }>();
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  for (const u of db.urunler) {
    if (!u.aktif || u.stok <= 0 || !(u.alis_fiyati > 0)) continue;
    const k = u.kategori || 'Kategorisiz'; const x = kat.get(k) ?? { smm: 0, stok: 0, urun: 0 };
    x.stok += u.stok * netAlis(u.alis_fiyati, u.kdv, db.ayarlar); x.urun++; kat.set(k, x);
  }
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis' || !(h.alis_fiyati > 0)) continue;
    const u = urun.get(h.urun_id); const k = u?.kategori || 'Kategorisiz';
    const x = kat.get(k) ?? { smm: 0, stok: 0, urun: 0 }; x.smm += h.miktar * netAlis(h.alis_fiyati, h.kdv, db.ayarlar); kat.set(k, x);
  }
  return [...kat.entries()].map(([ad, x]) => ({ ad, ...x, yillikDevir: x.stok > 0 ? (x.smm / x.stok) * (365 / gun) : 0, stokGunu: x.smm > 0 ? x.stok / (x.smm / gun) : Infinity }));
}

// ======================= TEDARİKÇİ =======================
export interface TedarikciOzet { guid: string; ad: string; alis: number; belge: number; cesit: number; satilanAdet: number; alinanAdet: number; kar: number; bakiye?: number }
export function tedarikciAnalizi(db: DB, d: Donem) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const cari = new Map(db.cariler.filter((c) => c.tur === 'tedarikci').map((c) => [c.bh_id, c]));
  // ürün → tedarikçi bazında alınan adet (dönem içi)
  const urunTed = new Map<ID, Map<string, number>>();
  const t = new Map<string, { ad: string; alis: number; belgeler: Set<string>; urunler: Set<string>; alinan: number }>();
  const fiyatlar = new Map<ID, Map<string, number[]>>();
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'alis' || h.kaynak !== 'fatura' || !h.cari_guid) continue;
    const x = t.get(h.cari_guid) ?? { ad: h.cari_ad ?? '—', alis: 0, belgeler: new Set(), urunler: new Set(), alinan: 0 };
    x.alis += h.miktar * h.alis_fiyati; x.belgeler.add(h.belge_guid ?? h.tarih); x.alinan += h.miktar; x.urunler.add(h.urun_id); t.set(h.cari_guid, x);
    if (urun.has(h.urun_id)) {
      const m = urunTed.get(h.urun_id) ?? new Map(); m.set(h.cari_guid, (m.get(h.cari_guid) ?? 0) + h.miktar); urunTed.set(h.urun_id, m);
      const f = fiyatlar.get(h.urun_id) ?? new Map(); const l = f.get(h.cari_guid) ?? []; l.push(h.alis_fiyati); f.set(h.cari_guid, l); fiyatlar.set(h.urun_id, f);
    }
  }
  // satışları, ürünün alındığı tedarikçilere alım payına göre dağıt
  const sat = new Map<string, { adet: number; kar: number }>();
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis') continue;
    const m = urunTed.get(h.urun_id); if (!m) continue;
    const top = [...m.values()].reduce((a, b) => a + b, 0) || 1;
    const k = hareketTutar(h, db.ayarlar).kar;
    for (const [g, q] of m) { const s = sat.get(g) ?? { adet: 0, kar: 0 }; s.adet += (h.miktar * q) / top; s.kar += (k * q) / top; sat.set(g, s); }
  }
  const liste: TedarikciOzet[] = [...t.entries()].map(([guid, x]) => ({ guid, ad: cari.get(guid)?.ad ?? x.ad, alis: x.alis, belge: x.belgeler.size, cesit: x.urunler.size, alinanAdet: x.alinan,
    satilanAdet: sat.get(guid)?.adet ?? 0, kar: sat.get(guid)?.kar ?? 0, bakiye: cari.get(guid)?.bakiye })).sort((a, b) => b.alis - a.alis);
  // aynı ürün farklı tedarikçi fiyat karşılaştırması
  const ad = new Map([...t.entries()].map(([g, x]) => [g, cari.get(g)?.ad ?? x.ad]));
  const karsilastirma = [...fiyatlar.entries()].filter(([, f]) => f.size > 1).map(([uid, f]) => {
    const l = [...f.entries()].map(([g, p]) => ({ ad: ad.get(g) ?? '—', ort: p.reduce((a, b) => a + b, 0) / p.length, adet: p.length })).sort((a, b) => a.ort - b.ort);
    return { urun: urun.get(uid)!, liste: l, fark: l[l.length - 1].ort - l[0].ort, farkYuzde: l[0].ort > 0 ? ((l[l.length - 1].ort - l[0].ort) / l[0].ort) * 100 : 0 };
  }).sort((a, b) => b.fark - a.fark);
  return { liste, karsilastirma };
}

// ======================= FİYAT ÖNERİSİ =======================
/** Hedef marja göre önerilen KDV dahil satış fiyatı (5 TL'ye yuvarlanır) */
export function onerilenFiyat(u: Urun, alisNetDeger: number, hedefMarj: number) {
  if (!(alisNetDeger > 0)) return null;
  const net = alisNetDeger / (1 - Math.min(hedefMarj, 90) / 100);
  return Math.ceil((net * (1 + u.kdv / 100)) / 5) * 5;
}
export const kdvHaricSatis = (u: Urun) => netSatis(u.satis_fiyati, u.kdv);

// ======================= NAKİT =======================
export function nakitAkisi(db: DB, d: Donem) {
  const gunluk = new Map<string, { giris: number; cikis: number }>();
  const tip = new Map<string, { giris: number; cikis: number }>();
  let giris = 0, cikis = 0;
  for (const k of db.kasa_akisi) {
    if (k.tarih < d.bas || k.tarih > d.bit) continue;
    if (k.tip === 'Virman' || /virman/i.test(k.aciklama ?? '')) continue;
    giris += k.giris; cikis += k.cikis;
    const g = gunluk.get(k.tarih) ?? { giris: 0, cikis: 0 }; g.giris += k.giris; g.cikis += k.cikis; gunluk.set(k.tarih, g);
    const t = tip.get(k.tip || 'Diğer') ?? { giris: 0, cikis: 0 }; t.giris += k.giris; t.cikis += k.cikis; tip.set(k.tip || 'Diğer', t);
  }
  const gun = Math.max(1, gunFark(d.bit < gunu() ? d.bit : gunu(), d.bas) + 1);
  return { giris, cikis, gunlukGiris: giris / gun, gunlukCikis: cikis / gun, gunluk, tip };
}
