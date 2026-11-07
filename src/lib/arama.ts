import type { DB, ID, Urun } from './types';
import { kodNorm } from './format';
import { aracCikar } from './analiz3';
import { omGuvenilir } from './muadil';

/**
 * "Ürün Ara" sayfasının arama motoru.
 * Kaynaklar: stok kodu / barkod, OEM kodları (Otomarmara'dan gelen + BizimHesap etiketi), Otomarmara eşdeğer kodları,
 * ürün adı / marka / kategori / raf ve addaki araç-model bilgisi ("megane 3 balata").
 * Hoşgörü: harf-rakam bitişikliği ("golf5" = "golf 5", "1.5dci" = "1.5 dci"), sık kısaltmalar (vw, mb, pejo),
 * tek harf yazım hataları ("amortisr", "megan"), kodun önüne yazılan marka ("rapro r54892").
 * Sıralama: eşleşme türü, adda geçme, son 6 ayda satış sıklığı ve stok.
 */

/** Türkçe karakterleri ve Romen rakamlarını sadeleştirir, harf-rakam bitişiklerini ayırır: "Megane III Ön Balata" → "MEGANE 3 ON BALATA", "GOLF5" → "GOLF 5" */
const ROMEN: Record<string, string> = { II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8' };
export function katla(s?: string | null) {
  return (s ?? '').replace(/i/g, 'İ').toUpperCase()
    .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, ' ').trim()
    .replace(/(^| )(II|III|IV|VI|VII|VIII|V)(?= |$)/g, (_m, a: string, r: string) => a + ROMEN[r])
    .replace(/([A-Z])(?=\d)/g, '$1 ').replace(/(\d)(?=[A-Z])/g, '$1 ');
}

/** Tezgâhta sık yazılan kısaltma ve söylenişler: aranan kelime yerine bunlardan biri de geçebilir */
const ESANLAM: Record<string, string[]> = {
  VW: ['VOLKSWAGEN'], VOLKSWAGEN: ['VW'], WOLKSWAGEN: ['VOLKSWAGEN', 'VW'],
  MB: ['MERCEDES', 'BENZ'], MERCEDES: ['MB', 'BENZ'], MERCEDES_BENZ: ['MERCEDES'], BENZ: ['MERCEDES', 'MB'], MERCEDEZ: ['MERCEDES', 'MB'],
  PEUGEOT: ['PEJO', 'PEUGOT', 'P'], PEJO: ['PEUGEOT', 'P'], PEUGOT: ['PEUGEOT', 'P'], RENO: ['RENAULT'], RENOLT: ['RENAULT'], CITROEN: ['SITROEN'], SITROEN: ['CITROEN'],
  HYUNDAI: ['HUNDAI', 'HYUNDAİ'], HUNDAI: ['HYUNDAI'], SKODA: ['SKODA'], OPEL: ['OPEL'], FORT: ['FORD'],
  FILITRE: ['FILTRE'], FLTRE: ['FILTRE'], FITRE: ['FILTRE'], AMORTISOR: ['AMORTI', 'AMORTISOR'], AMORTSOR: ['AMORTISOR'],
  BALATA: ['BALATA'], DISK: ['DISK', 'DISKI'], TRIGER: ['TRIGER', 'EKSANTRIK'], DEBRIYAJ: ['DEBRIYAJ', 'BASKI'], ROTBASI: ['ROT BASI', 'ROTBASI'],
  ANTIFIRIZ: ['ANTIFRIZ'], ANTIFRIZ: ['ANTIFRIZ'], SILECEK: ['SILECEK', 'SILGI'], AKU: ['AKU', 'AKUMULATOR'],
};

export type EslesmeTur = 'kod' | 'barkod' | 'oem' | 'esdeger' | 'kismi' | 'metin' | 'yakin';
export interface AramaSatiri { u: Urun; tur: EslesmeTur; etiket?: string; puan: number }

interface Dizin {
  urun: Urun[];
  /** ' KELIME KELIME ' biçiminde: ad + marka + kategori + kod + raf + araç */
  metin: Map<ID, string>;
  /** yalnız ürün adı (adda geçen eşleşme daha değerli) */
  ad: Map<ID, string>;
  /** yazım hatası toleransı için ürünün kelimeleri */
  kelime: Map<ID, string[]>;
  /** normal kod → ürünler (stok kodu, barkod, marka öneksiz stok kodu) */
  kod: Map<string, Urun[]>;
  /** normal OEM kodu → [ürün, görünen kod] */
  oem: Map<string, { u: Urun; kod: string }[]>;
  /** normal eşdeğer kodu → [ürün, görünen kod] (ürünün Otomarmara eşdeğer listesinde geçen kod) */
  esdeger: Map<string, { u: Urun; kod: string }[]>;
  /** kısmi kod araması için: ürün → ayrı ayrı normal kodları */
  kodlar: Map<ID, string[]>;
  /** son 180 günde kaç faturada satıldı (sıralama için) */
  satis: Map<ID, number>;
}

// Dizin ürün / kod / Otomarmara verisi değişince yeniden kurulur; BizimHesap eşitleme saati gibi küçük değişiklikler dizini bozmaz.
let onbellek: { urunler: unknown; kodlar: unknown; om: unknown; har: unknown; d: Dizin } | null = null;
function ekle<T>(m: Map<string, T[]>, k: string, v: T) { if (!k) return; const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); }
function kodEkle(m: Map<ID, string[]>, id: ID, n: string) { if (!n) return; const l = m.get(id); if (!l) m.set(id, [n]); else if (!l.includes(n)) l.push(n); }

export function dizin(db: DB): Dizin {
  const o = onbellek;
  if (o && o.urunler === db.urunler && o.kodlar === db.urun_kodlari && o.om === db.otomarmara_veri && o.har === db.hareketler) return o.d;
  // yalnız satış verisi değiştiyse kodları yeniden kurmadan satış sayılarını yenile
  if (o && o.urunler === db.urunler && o.kodlar === db.urun_kodlari && o.om === db.otomarmara_veri) {
    o.d.satis = satisSayilari(db); o.har = db.hareketler; return o.d;
  }
  const urun = db.urunler.filter((u) => u.aktif);
  const id = new Map(urun.map((u) => [String(u.id), u]));
  const metin = new Map<ID, string>(), ad = new Map<ID, string>(), kelime = new Map<ID, string[]>();
  const kod = new Map<string, Urun[]>(), oem = new Map<string, { u: Urun; kod: string }[]>(), esdeger = new Map<string, { u: Urun; kod: string }[]>(), kodlar = new Map<ID, string[]>();
  for (const u of urun) {
    const a = aracCikar(u.ad);
    const m = katla([u.ad, u.marka, u.kategori, u.kod, u.barkod, u.raf ? 'RAF ' + u.raf : '', a ? `${a.marka} ${a.model ?? ''}` : ''].filter(Boolean).join(' '));
    metin.set(u.id, ' ' + m + ' '); ad.set(u.id, ' ' + katla(u.ad) + ' ');
    kelime.set(u.id, [...new Set(m.split(' ').filter((k) => k.length >= 4 && !/^\d+$/.test(k)))]);
    ekle(kod, kodNorm(u.kod), u); if (u.barkod) ekle(kod, kodNorm(u.barkod), u);
    kodEkle(kodlar, u.id, kodNorm(u.kod)); kodEkle(kodlar, u.id, kodNorm(u.barkod));
    // stok kodundaki marka ön eki olmadan da bulunsun: BOS-0241140537 → 0241140537
    const onEksiz = (u.kod ?? '').trim().match(/^[A-Za-zÇĞİÖŞÜçğıöşü]{2,4}[-\s](.+)$/);
    if (onEksiz && kodNorm(onEksiz[1]).length >= 4) { ekle(kod, kodNorm(onEksiz[1]), u); kodEkle(kodlar, u.id, kodNorm(onEksiz[1])); }
    for (const e of (u.etiket ?? '').split(',')) { const n = kodNorm(e); if (n.length >= 4) { ekle(oem, n, { u, kod: e.trim() }); kodEkle(kodlar, u.id, n); } }
  }
  // Otomarmara'dan gelen OEM ve eşdeğerler yalnız eşleşmesi güvenilir ürünlerde kullanılır (bkz. muadil.ts)
  const guven = omGuvenilir(db);
  for (const k of db.urun_kodlari) {
    const u = id.get(String(k.urun_id)); if (!u || (k.tur === 'OTOMARMARA' && !guven.has(String(u.id)))) continue;
    const n = k.kod_norm ?? kodNorm(k.kod); if (n.length < 4) continue;
    if (!oem.get(n)?.some((x) => x.u === u)) ekle(oem, n, { u, kod: k.kod }); kodEkle(kodlar, u.id, n);
  }
  for (const v of db.otomarmara_veri ?? []) {
    const u = id.get(String(v.urun_id)); if (!u || !guven.has(String(u.id))) continue;
    for (const e of v.esdegerler ?? []) { const n = kodNorm(e.kod); if (n.length >= 4 && n !== kodNorm(u.kod)) ekle(esdeger, n, { u, kod: e.kod }); }
    if (v.om_kod) { const n = kodNorm(v.om_kod); if (n !== kodNorm(u.kod) && !oem.get(n)?.some((x) => x.u === u)) ekle(oem, n, { u, kod: v.om_kod }); }
  }
  const d: Dizin = { urun, metin, ad, kelime, kod, oem, esdeger, kodlar, satis: satisSayilari(db) };
  onbellek = { urunler: db.urunler, kodlar: db.urun_kodlari, om: db.otomarmara_veri, har: db.hareketler, d };
  return d;
}

function satisSayilari(db: DB) {
  const sinir = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10); const m = new Map<ID, number>();
  for (const h of db.hareketler) if (h.tur === 'satis' && !h.yok_say && h.tarih.slice(0, 10) >= sinir) m.set(h.urun_id, (m.get(h.urun_id) ?? 0) + 1);
  return m;
}

/** en fazla `sinir` harf farkı (ekleme / silme / değiştirme / yan yana yer değiştirme) */
function yakinMi(a: string, b: string, sinir: number) {
  if (Math.abs(a.length - b.length) > sinir) return false;
  let onceki2: number[] = []; let onceki = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const s = [i]; let enAz = i;
    for (let j = 1; j <= b.length; j++) {
      const m = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(onceki[j] + 1, s[j - 1] + 1, onceki[j - 1] + m);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, onceki2[j - 2] + 1);
      s.push(v); if (v < enAz) enAz = v;
    }
    if (enAz > sinir) return false;
    onceki2 = onceki; onceki = s;
  }
  return onceki[b.length] <= sinir;
}

/** kelime metinde geçiyor mu: kısa ve sayısal kelimeler tam kelime olarak, uzunlar kelimenin bir parçası olarak */
const gecer = (m: string, k: string) => (k.length <= 2 || /^\d+$/.test(k) ? m.includes(' ' + k + ' ') : m.includes(k));
const gecerEs = (m: string, k: string) => gecer(m, k) || (ESANLAM[k] ?? []).some((e) => gecer(m, ' ' + e + ' ') || gecer(m, e));

/** Arama: tam kod > OEM > eşdeğer > kısmi kod > ad/araç metni > benzer yazım. Aynı ürün en iyi eşleşmesiyle bir kez listelenir. */
export function genelArama(db: DB, q: string, limit = 80): AramaSatiri[] {
  const s = q.trim(); if (!s) return [];
  const d = dizin(db); const sonuc = new Map<ID, AramaSatiri>();
  const koy = (u: Urun, tur: EslesmeTur, puan: number, etiket?: string) => { const x = sonuc.get(u.id); if (!x || x.puan < puan) sonuc.set(u.id, { u, tur, puan, etiket }); };
  const kodAra = (qn: string, carpan = 1) => {
    if (qn.length < 3) return;
    for (const u of d.kod.get(qn) ?? []) koy(u, u.barkod && kodNorm(u.barkod) === qn ? 'barkod' : 'kod', 100 * carpan);
    for (const x of d.oem.get(qn) ?? []) koy(x.u, 'oem', 90 * carpan, x.kod);
    for (const x of d.esdeger.get(qn) ?? []) koy(x.u, 'esdeger', 80 * carpan, x.kod);
  };
  // 1) yazılanın tamamı kod olarak
  const qn = kodNorm(s); kodAra(qn);
  // 2) "RAPRO R54892", "BOSCH 0 986 494 xxx" gibi: kodun önüne marka yazılmışsa her parça ayrı ayrı kod olarak
  const parca = s.split(/\s+/).filter(Boolean);
  if (!sonuc.size && parca.length >= 2) for (const p of parca) { const n = kodNorm(p); if (/\d/.test(n) && n.length >= 4) kodAra(n, 0.95); }
  // 3) kodun bir kısmı: kodun başı yazılmışsa (5+ karakter) ya da ortasından 6+ karakter
  if (qn.length >= 5 && /\d/.test(qn)) for (const u of d.urun) {
    if (sonuc.has(u.id)) continue; const k = d.kodlar.get(u.id); if (!k) continue;
    if (k.some((x) => x.startsWith(qn))) koy(u, 'kismi', 65); else if (qn.length >= 6 && k.some((x) => x.includes(qn))) koy(u, 'kismi', 58);
  }
  // 4) ad / marka / kategori / araç: yazılan her kelime geçmeli (Türkçe karaktersiz, Romen rakamı sayı, harf-rakam ayrık)
  const kel = katla(s).split(' ').filter(Boolean);
  // "golf 5", "megane 3", "w 205": model adından hemen sonra o numara geliyorsa (ya da "GOLF 4 5 6" gibi artan sırada) üste çıkar
  const ikili = kel.flatMap((k, i) => (i > 0 && /^\d+$/.test(k) && !/^\d+$/.test(kel[i - 1]) ? [[kel[i - 1], Number(k)] as const] : []));
  const yanYana = (a: string) => { const t = a.trim().split(' '); return ikili.every(([m, n]) => t.some((x, i) => {
    if (x !== m) return false;
    for (let j = i + 1; j < t.length && /^\d+$/.test(t[j]); j++) { const v = Number(t[j]); if (v === n) return true; if (v > n) return false; }
    return false;
  })); };
  const bonus = (u: Urun) => {
    const a = d.ad.get(u.id)!; const n = d.satis.get(u.id) ?? 0;
    return (ikili.length && yanYana(a) ? 10 : 0) + (kel.every((k) => gecerEs(a, k)) ? 8 : 0) + (kel[0] && a.startsWith(' ' + kel[0]) ? 4 : 0) + Math.min(8, Math.round(Math.log2(1 + n) * 2)) + (u.stok > 0 ? 4 : 0);
  };
  if (kel.length) for (const u of d.urun) {
    if (sonuc.has(u.id)) continue; const m = d.metin.get(u.id)!;
    if (kel.every((k) => gecerEs(m, k))) koy(u, 'metin', 40 + bonus(u));
  }
  // 5) az sonuç varsa yazım hatalarına hoşgörü: 5+ harfli kelimeler bir harf (9+ harfte iki harf) farkla da eşleşir
  const yakinlar = kel.filter((k) => k.length >= 5 && !/\d/.test(k));
  if (sonuc.size < 8 && yakinlar.length) for (const u of d.urun) {
    if (sonuc.has(u.id)) continue; const m = d.metin.get(u.id)!; const w = d.kelime.get(u.id)!;
    const tamam = kel.every((k) => gecerEs(m, k) || (yakinlar.includes(k) && w.some((x) => yakinMi(k, x.length > k.length + 2 ? x.slice(0, k.length) : x, k.length >= 9 ? 2 : 1))));
    if (tamam) koy(u, 'yakin', 25 + bonus(u));
  }
  return [...sonuc.values()].sort((a, b) => b.puan - a.puan || Number(b.u.stok > 0) - Number(a.u.stok > 0) || b.u.stok - a.u.stok).slice(0, limit);
}

/** Otomarmara'dan gelen bir kodun bizdeki karşılığı: stok kodu, OEM ya da eşdeğer olarak kayıtlı ürünler */
export function koddanBizdeki(db: DB, kod: string): AramaSatiri[] {
  const n = kodNorm(kod); if (n.length < 3) return [];
  const d = dizin(db); const l: AramaSatiri[] = [];
  for (const u of d.kod.get(n) ?? []) l.push({ u, tur: 'kod', puan: 100 });
  for (const x of d.oem.get(n) ?? []) if (!l.some((y) => y.u === x.u)) l.push({ u: x.u, tur: 'oem', puan: 90, etiket: x.kod });
  for (const x of d.esdeger.get(n) ?? []) if (!l.some((y) => y.u === x.u)) l.push({ u: x.u, tur: 'esdeger', puan: 80, etiket: x.kod });
  return l.sort((a, b) => b.puan - a.puan || b.u.stok - a.u.stok);
}

export const ESLESME_AD: Record<EslesmeTur, string> = { kod: 'Stok kodu', barkod: 'Barkod', oem: 'OEM', esdeger: 'Otomarmara eşdeğeri', kismi: 'Kodun bir kısmı', metin: 'Ad / araç', yakin: 'Benzer yazım' };
