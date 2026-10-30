import type { DB, Hareket, ID, Urun } from './types';
import { gunu } from './format';
import { GECIS_RE, gecerliHareketler, hareketTutar, hizmetMi, netAlis, netSatis, type Donem, takipGunu, stokluMu } from './analiz';

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
  guid: string; ad: string; telefon?: string | null; bakiye?: number; ciro: number; net: number; kar: number; belge: number; ilk: string; son: string; /** farklı alış günü sayısı (tüm zamanlar) */ gunSay?: number;
  ortSepet: number; ortAralik: number | null; sonGecen: number; segment: Segment; urunCesit: number;
}
/** Araç alım/satım satırı içeren satış faturaları (belge guid) ve bu faturaların carileri */
const gecisOnbellek = new WeakMap<object, { belge: Set<string>; cari: Set<string> }>();
function gecisHesapla(db: DB) {
  const v = gecisOnbellek.get(db.hareketler); if (v) return v;
  const urun = new Map(db.urunler.map((u) => [u.id, u])); const belge = new Set<string>(); const cari = new Set<string>();
  for (const h of db.hareketler) if (h.tur === 'satis' && h.belge_guid && GECIS_RE.test(urun.get(h.urun_id)?.ad ?? h.urun_ad ?? '')) { belge.add(h.belge_guid); if (h.cari_guid) cari.add(h.cari_guid); if (h.cari_ad) cari.add(h.cari_ad.trim().toLocaleUpperCase('tr')); }
  const r = { belge, cari }; gecisOnbellek.set(db.hareketler, r); return r;
}
export const gecisBelgeleri = (db: DB) => gecisHesapla(db).belge;
/** cari guid ya da adı geçiş faturası olan bir cariye mi ait */
export const gecisCarisi = (db: DB, guidVeyaAd?: string | null) => !!guidVeyaAd && (gecisHesapla(db).cari.has(guidVeyaAd) || gecisHesapla(db).cari.has(guidVeyaAd.trim().toLocaleUpperCase('tr')));

export function musteriAnalizi(db: DB, d: Donem): MusteriOzet[] {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const cari = new Map(db.cariler.filter((c) => c.tur === 'musteri').map((c) => [c.bh_id, c]));
  const m = new Map<string, { ad: string; ciro: number; net: number; kar: number; belgeler: Set<string>; gunler: Set<string>; urunler: Set<string>; ilk: string; son: string }>();
  // tüm zamanlar: ilk/son alış ve aralık için; dönem içi: tutarlar
  // araç alım/satım gibi geçiş faturaları (ve o faturadaki maliyetine aktarılan parçalar) müşteri cirosuna sayılmaz
  const gecisBelge = gecisBelgeleri(db);
  const tum = db.hareketler.filter((h) => h.tur === 'satis' && h.cari_guid && !h.yok_say && !(h.belge_guid && gecisBelge.has(h.belge_guid)));
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
    // tek iş: tek gün ya da 14 gün içinde iki gün (aynı aracın tamiri için iki fatura gibi); kaybedilen/riskte için en az 3 farklı gün gerekir
    const tekIs = gunler.length === 1 || (gunler.length === 2 && gunFark(gunler[1], gunler[0]) <= 14);
    const seg: Segment = PERAKENDE_RE.test(x.ad) ? 'Perakende'
      : tekIs ? (sonGecen <= 30 ? 'Yeni' : 'Tek seferlik')
      : gunler.length === 2 ? (sonGecen <= 90 ? 'Düzenli' : 'Tek seferlik')
      : sonGecen > 90 ? 'Kaybedilen'
      : ortAralik !== null && sonGecen > Math.max(45, ortAralik * 2.5) ? 'Riskte'
      : gunler.length >= 6 ? 'Sadık' : gunFark(bugun, x.ilk) <= 30 ? 'Yeni' : 'Düzenli';
    return { guid, ad: c?.ad ?? x.ad, telefon: c?.telefon, bakiye: c?.bakiye, ciro: x.ciro, net: x.net, kar: x.kar, belge: x.belgeler.size, gunSay: x.gunler.size, ilk: x.ilk, son: x.son,
      ortSepet: x.belgeler.size ? x.ciro / x.belgeler.size : 0, ortAralik, sonGecen, segment: seg, urunCesit: x.urunler.size };
  });
}

// ======================= ZAMAN & DÖNEM =======================
export function zamanAnalizi(db: DB, d: Donem) {
  const gunler = Array.from({ length: 7 }, () => ({ ciro: 0, belge: new Set<string>(), gunSay: new Set<string>(), gunluk: new Map<string, number>() }));
  const saatler = Array.from({ length: 24 }, () => ({ ciro: 0, belge: new Set<string>() }));
  const gecis = gecisBelgeleri(db);
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis' || (h.belge_guid && gecis.has(h.belge_guid))) continue;
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
  const gecis = gecisBelgeleri(db);
  for (const h of db.hareketler) {
    if (h.yok_say || (h.belge_guid && gecis.has(h.belge_guid))) continue;
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
  const gecis = gecisBelgeleri(db); // araç alım/satım faturaları satış analizine katılmaz
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis' || (h.belge_guid && gecis.has(h.belge_guid))) continue;
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
  const gun = takipGunu(db, d); // satış verisi başlamadan önceki günler sayılmaz
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
export interface TedarikciOzet { guid: string; ad: string; alis: number; belge: number; cesit: number; satilanAdet: number; alinanAdet: number; kar: number; bakiye?: number; toplu?: { tarih: string; satir: number; tutar: number } }
export function tedarikciAnalizi(db: DB, d: Donem) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const cari = new Map(db.cariler.filter((c) => c.tur === 'tedarikci').map((c) => [c.bh_id, c]));
  // ürün → tedarikçi bazında alınan adet (dönem içi)
  const urunTed = new Map<ID, Map<string, number>>();
  const t = new Map<string, { ad: string; alis: number; belgeler: Map<string, { g: string; satir: number; tutar: number }>; urunler: Set<string>; alinan: number }>();
  const alimlar = new Map<ID, { g: string; ted: string; fiyat: number; miktar: number }[]>();
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'alis' || h.kaynak !== 'fatura' || !h.cari_guid) continue;
    const x = t.get(h.cari_guid) ?? { ad: h.cari_ad ?? '—', alis: 0, belgeler: new Map(), urunler: new Set(), alinan: 0 };
    const bk = h.belge_guid ?? h.tarih; const bl = x.belgeler.get(bk) ?? { g: gunu(h.tarih), satir: 0, tutar: 0 }; bl.satir++; bl.tutar += h.miktar * h.alis_fiyati; x.belgeler.set(bk, bl);
    x.alis += h.miktar * h.alis_fiyati; x.alinan += h.miktar; x.urunler.add(h.urun_id); t.set(h.cari_guid, x);
    const u = urun.get(h.urun_id);
    if (u) {
      const m = urunTed.get(h.urun_id) ?? new Map(); m.set(h.cari_guid, (m.get(h.cari_guid) ?? 0) + h.miktar); urunTed.set(h.urun_id, m);
      if (h.alis_fiyati > 0 && stokluMu(u)) { const l = alimlar.get(h.urun_id) ?? []; l.push({ g: gunu(h.tarih), ted: h.cari_guid, fiyat: h.alis_fiyati, miktar: h.miktar }); alimlar.set(h.urun_id, l); }
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
  const liste: TedarikciOzet[] = [...t.entries()].map(([guid, x]) => {
    // tek faturada 100+ kalem: depo dolumu / toplu stok alımı (satılma oranı kısa dönemde düşük görünür)
    const toplu = [...x.belgeler.values()].filter((bl) => bl.satir >= 100).sort((p, q) => q.satir - p.satir)[0];
    return { guid, ad: cari.get(guid)?.ad ?? x.ad, alis: x.alis, belge: x.belgeler.size, cesit: x.urunler.size, alinanAdet: x.alinan,
      satilanAdet: sat.get(guid)?.adet ?? 0, kar: sat.get(guid)?.kar ?? 0, bakiye: cari.get(guid)?.bakiye, toplu: toplu ? { tarih: toplu.g, satir: toplu.satir, tutar: toplu.tutar } : undefined };
  }).sort((a, b) => b.alis - a.alis);
  // aynı ürün farklı tedarikçi: her tedarikçinin son alış fiyatı, en son alımdan en fazla 45 gün önceki alımlar karşılaştırılır (enflasyon farkı sayılmasın)
  const ad = new Map([...t.entries()].map(([g, x]) => [g, cari.get(g)?.ad ?? x.ad]));
  const karsilastirma = [...alimlar.entries()].map(([uid, l]) => {
    const son = l.reduce((m, x) => (x.g > m ? x.g : m), ''); const sinir = gunu(new Date(new Date(son + 'T12:00').getTime() - 45 * 864e5));
    const pencere = l.filter((x) => x.g >= sinir);
    const tedSon = new Map<string, { g: string; fiyat: number }>();
    for (const x of pencere) { const o = tedSon.get(x.ted); if (!o || x.g > o.g) tedSon.set(x.ted, { g: x.g, fiyat: x.fiyat }); }
    if (tedSon.size < 2) return null;
    const ll = [...tedSon.entries()].map(([g, v]) => ({ ad: ad.get(g) ?? '—', ort: v.fiyat, tarih: v.g, adet: pencere.filter((x) => x.ted === g).reduce((s2, x) => s2 + x.miktar, 0) })).sort((p, q) => p.ort - q.ort);
    const enUcuz = ll[0].ort;
    const tasarruf = pencere.reduce((s2, x) => s2 + Math.max(0, x.fiyat - enUcuz) * x.miktar, 0);
    return { urun: urun.get(uid)!, liste: ll, fark: ll[ll.length - 1].ort - enUcuz, farkYuzde: enUcuz > 0 ? ((ll[ll.length - 1].ort - enUcuz) / enUcuz) * 100 : 0, tasarruf };
  }).filter((x): x is NonNullable<typeof x> => !!x && x.farkYuzde >= 2 && x.farkYuzde <= 200).sort((a, b) => b.tasarruf - a.tasarruf);
  return { liste, karsilastirma };
}

// ======================= FİYAT ÖNERİSİ =======================
/** Hedef marja göre önerilen KDV dahil satış fiyatı (50 TL'ye yukarı yuvarlanır) */
export function onerilenFiyat(u: Urun, alisNetDeger: number, hedefMarj: number) {
  if (!(alisNetDeger > 0)) return null;
  const net = alisNetDeger / (1 - Math.min(hedefMarj, 90) / 100);
  return Math.ceil((net * (1 + u.kdv / 100)) / 50) * 50;
}
export const kdvHaricSatis = (u: Urun) => netSatis(u.satis_fiyati, u.kdv);

// ======================= NAKİT =======================
export function nakitAkisi(db: DB, d: Donem) {
  const gunluk = new Map<string, { giris: number; cikis: number }>();
  const tip = new Map<string, { giris: number; cikis: number }>();
  let giris = 0, cikis = 0;
  // "Para Girişi / Para Çıkışı" BizimHesap'ta kendi hesaplar arası aktarımdır (POS → banka, banka → kredi kartı, ortak hesabı).
  // POS parası bankaya ertesi gün ve toplu geçtiği için gün-tutar eşleşmesi tutmuyor; bu yüzden hepsi gerçek giriş/çıkıştan ayrı tutulur.
  const aktarim = { giris: 0, cikis: 0, hesap: new Map<string, number>() };
  for (const k of db.kasa_akisi) {
    if (k.tarih < d.bas || k.tarih > d.bit) continue;
    if (k.tip === 'Virman' || /virman/i.test(k.aciklama ?? '') || k.tip === 'Para Girişi' || k.tip === 'Para Çıkışı') {
      aktarim.giris += k.giris; aktarim.cikis += k.cikis; const h = k.hesap || '—'; aktarim.hesap.set(h, (aktarim.hesap.get(h) ?? 0) + k.giris - k.cikis); continue;
    }
    giris += k.giris; cikis += k.cikis;
    const g = gunluk.get(k.tarih) ?? { giris: 0, cikis: 0 }; g.giris += k.giris; g.cikis += k.cikis; gunluk.set(k.tarih, g);
    const t = tip.get(k.tip || 'Diğer') ?? { giris: 0, cikis: 0 }; t.giris += k.giris; t.cikis += k.cikis; tip.set(k.tip || 'Diğer', t);
  }
  const gun = Math.max(1, gunFark(d.bit < gunu() ? d.bit : gunu(), d.bas) + 1);
  return { giris, cikis, gunlukGiris: giris / gun, gunlukCikis: cikis / gun, gunluk, tip, aktarim };
}
