import type { DB, Hareket, ID, Urun } from './types';
import { gunu } from './format';
import { gecerliHareketler, hareketTutar, netAlis, netSatis, takipGunu, type Donem } from './analiz';
import { PERAKENDE_RE, satirKar } from './analiz2';

const gunOnce = (n: number) => gunu(new Date(Date.now() - n * 864e5));
const buyuk = (s?: string | null) => (s ?? '').toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/\s+/g, ' ').trim();

// ======================= ARAÇ MARKA / MODEL =======================
/** Marka → [marka adları, model adları]. Modeller kelime olarak aranır; sadece rakamdan oluşan model adları kullanılmaz (yanlış eşleşme). */
const ARAC: Record<string, { ad: string[]; model: string[] }> = {
  'Mercedes': { ad: ['MERCEDES', 'MERCEDES-BENZ', 'BENZ'], model: ['SPRINTER', 'VITO', 'ATEGO', 'ACTROS', 'CITAN'] },
  'Volkswagen': { ad: ['VOLKSWAGEN', 'VOLKWAGEN', 'VOLKSVAGEN', 'VW'], model: ['CADDY', 'PASSAT', 'GOLF', 'POLO', 'TRANSPORTER', 'JETTA', 'TIGUAN', 'CRAFTER', 'AMAROK', 'TOURAN', 'SCIROCCO', 'BORA', 'CC'] },
  'Renault': { ad: ['RENAULT'], model: ['KANGO', 'MEGANE', 'CLIO', 'FLUENCE', 'SYMBOL', 'KANGOO', 'TRAFIC', 'MASTER', 'LAGUNA', 'CAPTUR', 'TALISMAN', 'KADJAR', 'SCENIC', 'TALIANT', 'LATITUDE'] },
  'Dacia': { ad: ['DACIA'], model: ['DUSTER', 'SANDERO', 'LOGAN', 'DOKKER', 'LODGY', 'JOGGER'] },
  'Fiat': { ad: ['FIAT'], model: ['EGEA', 'DOBLO', 'LINEA', 'PUNTO', 'FIORINO', 'DUCATO', 'PALIO', 'ALBEA', 'TIPO', 'BRAVO', 'SCUDO', 'MAREA'] },
  'Ford': { ad: ['FORD'], model: ['FUSION', 'FOCUS', 'FIESTA', 'TRANSIT', 'CONNECT', 'COURIER', 'MONDEO', 'KUGA', 'RANGER', 'PUMA', 'CMAX', 'C-MAX', 'TOURNEO'] },
  'Opel': { ad: ['OPEL'], model: ['ASTRA', 'CORSA', 'INSIGNIA', 'VECTRA', 'COMBO', 'ZAFIRA', 'MERIVA', 'MOKKA', 'VIVARO', 'MOVANO', 'GRANDLAND', 'CROSSLAND'] },
  'Toyota': { ad: ['TOYOTA'], model: ['COROLLA', 'AURIS', 'YARIS', 'AVENSIS', 'HILUX', 'RAV4', 'RAV-4', 'C-HR', 'CHR', 'VERSO', 'PROACE'] },
  'Hyundai': { ad: ['HYUNDAI', 'HYUNDAİ'], model: ['I20', 'I-20', 'I30', 'I-30', 'I10', 'ACCENT', 'ELANTRA', 'TUCSON', 'GETZ', 'KONA', 'BAYON', 'SANTA FE', 'IX35'] },
  'Peugeot': { ad: ['PEUGEOT', 'PEUGOT'], model: ['PARTNER', 'RIFTER', 'BOXER', 'EXPERT', 'BIPPER'] },
  'Citroen': { ad: ['CITROEN', 'CITROËN'], model: ['BERLINGO', 'NEMO', 'JUMPY', 'JUMPER', 'C-ELYSEE', 'ELYSEE', 'XSARA', 'SAXO'] },
  'BMW': { ad: ['BMW'], model: [] },
  'Audi': { ad: ['AUDI'], model: [] },
  'Skoda': { ad: ['SKODA'], model: ['OCTAVIA', 'FABIA', 'SUPERB', 'RAPID', 'KODIAQ', 'KAROQ', 'SCALA', 'KAMIQ'] },
  'Cupra': { ad: ['CUPRA'], model: ['FORMENTOR', 'BORN'] },
  'Seat': { ad: ['SEAT'], model: ['LEON', 'IBIZA', 'TOLEDO', 'ATECA', 'ARONA', 'ALTEA'] },
  'Honda': { ad: ['HONDA'], model: ['CIVIC', 'JAZZ', 'ACCORD', 'CR-V', 'CRV', 'HR-V'] },
  'Nissan': { ad: ['NISSAN'], model: ['QASHQAI', 'JUKE', 'MICRA', 'NAVARA', 'NOTE', 'X-TRAIL'] },
  'Kia': { ad: ['KIA'], model: ['CEED', 'SPORTAGE', 'PICANTO', 'STONIC', 'CERATO', 'SORENTO'] },
  'Chevrolet': { ad: ['CHEVROLET'], model: ['AVEO', 'KALOS', 'CRUZE', 'LACETTI', 'SPARK', 'CAPTIVA', 'EPICA'] },
  'Volvo': { ad: ['VOLVO'], model: [] }, 'Mazda': { ad: ['MAZDA'], model: [] }, 'Mitsubishi': { ad: ['MITSUBISHI'], model: ['LANCER', 'COLT', 'ASX', 'OUTLANDER'] },
  'Isuzu': { ad: ['ISUZU'], model: ['D-MAX', 'DMAX'] }, 'Iveco': { ad: ['IVECO'], model: ['DAILY'] }, 'Suzuki': { ad: ['SUZUKI'], model: ['SWIFT', 'VITARA'] },
  'Tofaş': { ad: ['TOFAS'], model: ['SAHIN', 'DOGAN', 'KARTAL'] }, 'Land Rover': { ad: ['LAND ROVER', 'RANGE ROVER'], model: ['DEFENDER', 'EVOQUE', 'DISCOVERY'] },
};
const ARAC_LISTE = Object.entries(ARAC).flatMap(([marka, x]) => [
  ...x.ad.map((k) => ({ marka, kelime: buyuk(k), model: null as string | null })),
  ...x.model.map((k) => ({ marka, kelime: buyuk(k), model: buyuk(k) })),
]).sort((a, b) => b.kelime.length - a.kelime.length);
const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ARAC_RE = ARAC_LISTE.map((x) => ({ ...x, re: new RegExp(`(^|[^A-Z0-9])${kacis(x.kelime)}([^A-Z0-9]|$)`) }));
const MERCEDES_SASI = /(^|[^A-Z0-9])(W|C|S|A|V|X|CLA|GLA|GLC|ML)\s?(1\d{2}|2\d{2}|4\d{2}|6\d{2}|9\d{2})([^0-9]|$)/;

export interface Arac { marka: string; model: string | null }
/** Bir metinden (cari adı ya da ürün adı) araç markası ve varsa modeli */
const PLAKA = /^\d{2}\s?[A-Z]{1,3}\s?\d{2,5}$/;
const KISA_CARI: { re: RegExp; marka: string }[] = [
  { re: /(^|[^A-Z0-9])(C[1-5])([^0-9]|$)/, marka: 'Citroen' }, { re: /(^|[^A-Z0-9])P(\d{3,4})([^0-9]|$)/, marka: 'Peugeot' },
  { re: /(^|[^A-Z0-9])(L200|L300)([^0-9]|$)/, marka: 'Mitsubishi' }, { re: /(^|[^A-Z0-9])(CLK|CLA|GLA|GLC|GLE|SLK)([^A-Z]|$)/, marka: 'Mercedes' },
];
/** Bir metinden (cari adı ya da ürün adı) araç markası ve varsa modeli. cari=true: müşteri adındaki araç bölümü (kısa model adlarına da bakılır) */
export function aracCikar(metin?: string | null, cari = false): Arac | null {
  let s = buyuk(metin); if (!s) return null;
  if (cari) s = s.split('/').map((x) => x.trim()).filter((x) => x && !PLAKA.test(x)).join(' / ');
  let marka: string | null = null, model: string | null = null;
  for (const x of ARAC_RE) {
    if (!x.re.test(s)) continue;
    if (x.model) { if (!model && (!marka || marka === x.marka)) { model = x.model; marka = x.marka; } }
    else if (!marka) marka = x.marka;
    if (marka && model) break;
  }
  if (cari && !model) for (const k of KISA_CARI) { const m = s.match(k.re); if (m && (!marka || marka === k.marka)) { marka = k.marka; model = k.marka === 'Peugeot' ? m[2] : m[2]; break; } }
  if (marka && !model) {
    const m = marka === 'Peugeot' ? s.match(/(^|[^A-Z0-9])(\d{3,4})([^0-9]|$)/) : marka === 'Audi' ? s.match(/(^|[^A-Z0-9])([AQ]\d|TT)([^0-9]|$)/)
      : marka === 'Mazda' ? s.match(/MAZDA\s?(?:MAZDA\s?)?()(\d{1,3})([^0-9]|$)/) : marka === 'BMW' ? s.match(/(^|[^A-Z0-9])(\d{3}[A-Z]?|X\d)([^0-9]|$)/) : null;
    if (m) model = m[2];
  }
  if (!marka) { const m = s.match(MERCEDES_SASI); if (m && m[2] === 'W') { marka = 'Mercedes'; model = `${m[2]}${m[3]}`; } }
  else if (marka === 'Mercedes' && !model) { const m = s.match(MERCEDES_SASI); if (m) model = `${m[2]}${m[3]}`; }
  const ESDEGER: Record<string, string> = { 'I-20': 'I20', 'I-30': 'I30', 'RAV-4': 'RAV4', 'CHR': 'C-HR', 'CRV': 'CR-V', 'DMAX': 'D-MAX', 'CMAX': 'C-MAX', 'KANGO': 'KANGOO', 'FUSION': 'FUSION' };
  if (model) model = ESDEGER[model] ?? model;
  const guzel = (m: string) => (/\d/.test(m) || m.length <= 3 ? m : m.charAt(0) + m.slice(1).toLowerCase());
  return marka ? { marka, model: model ? guzel(model) : null } : null;
}
/** Satır için araç: önce müşterinin adındaki araç (servis carileri "AD / PLAKA / MARKA MODEL"), yoksa ürün adındaki uyumluluk */
export function satirAraci(h: Hareket, u?: Urun): { arac: Arac | null; kaynak: 'musteri' | 'urun' | null } {
  if (h.cari_ad && h.cari_ad.includes('/')) { const a = aracCikar(h.cari_ad, true); if (a) return { arac: a, kaynak: 'musteri' }; }
  const a = aracCikar(u?.ad ?? h.urun_ad); return { arac: a, kaynak: a ? 'urun' : null };
}

export interface AracOzet { marka: string; ciro: number; kar: number; adet: number; fis: number; musteri: number; modeller: { model: string; ciro: number; adet: number }[]; kategoriler: { ad: string; ciro: number }[]; stokDeger: number; stokCesit: number }
export function aracAnalizi(db: DB, d: Donem) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const m = new Map<string, { ciro: number; kar: number; adet: number; fis: Set<string>; mus: Set<string>; model: Map<string, { ciro: number; adet: number }>; kat: Map<string, number> }>();
  let toplam = 0, bilinmeyen = 0, musteriden = 0;
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis') continue;
    const u = urun.get(h.urun_id); const s = satirKar(h, db, urun); toplam += s.ciro;
    const { arac, kaynak } = satirAraci(h, u);
    if (!arac) { bilinmeyen += s.ciro; continue; }
    if (kaynak === 'musteri') musteriden += s.ciro;
    const x = m.get(arac.marka) ?? { ciro: 0, kar: 0, adet: 0, fis: new Set(), mus: new Set(), model: new Map(), kat: new Map() };
    x.ciro += s.ciro; x.kar += s.kar; x.adet += h.miktar; x.fis.add(h.belge_guid ?? h.tarih); if (h.cari_guid && !PERAKENDE_RE.test(h.cari_ad ?? '')) x.mus.add(h.cari_guid);
    const md = arac.model ?? 'Model belirsiz'; const y = x.model.get(md) ?? { ciro: 0, adet: 0 }; y.ciro += s.ciro; y.adet += h.miktar; x.model.set(md, y);
    const k = u?.kategori || 'Hizmet / diğer'; x.kat.set(k, (x.kat.get(k) ?? 0) + s.ciro);
    m.set(arac.marka, x);
  }
  // stoktaki ürünlerin adlarından marka
  const stok = new Map<string, { deger: number; cesit: number }>();
  let stokToplam = 0;
  for (const u of db.urunler) {
    if (!u.aktif || u.stok <= 0) continue;
    const v = u.stok * (u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, db.ayarlar) : 0); stokToplam += v;
    const a = aracCikar(u.ad); if (!a) continue;
    const x = stok.get(a.marka) ?? { deger: 0, cesit: 0 }; x.deger += v; x.cesit++; stok.set(a.marka, x);
  }
  const markalar: AracOzet[] = [...new Set([...m.keys(), ...stok.keys()])].map((marka) => {
    const x = m.get(marka); const st = stok.get(marka);
    return { marka, ciro: x?.ciro ?? 0, kar: x?.kar ?? 0, adet: x?.adet ?? 0, fis: x?.fis.size ?? 0, musteri: x?.mus.size ?? 0,
      modeller: x ? [...x.model.entries()].map(([model, v]) => ({ model, ...v })).sort((a, b) => b.ciro - a.ciro) : [],
      kategoriler: x ? [...x.kat.entries()].map(([ad, ciro]) => ({ ad, ciro })).sort((a, b) => b.ciro - a.ciro) : [],
      stokDeger: st?.deger ?? 0, stokCesit: st?.cesit ?? 0 };
  }).sort((a, b) => b.ciro - a.ciro || b.stokDeger - a.stokDeger);
  const stokEslesen = [...stok.values()].reduce((t, x) => t + x.deger, 0);
  return { markalar, toplam, bilinmeyen, musteriden, stokToplam, stokEslesen };
}

// ======================= DEPO =======================
const depoAd = (s?: string | null) => buyuk(s).replace(/ DEPO(SU)?$/, '') || '';
export interface DepoOzet { ad: string; ciro: number; kar: number; fis: number; alis: number; stokDeger: number; stokCesit: number; oluDeger: number; oluCesit: number; enCok: { ad: string; ciro: number }[] }
export interface Transfer { u: Urun; kaynak: string; hedef: string; adet: number; kaynakStok: number; hedefStok: number; hedefSatis: number; kaynakSatis: number }
export function depoAnalizi(db: DB, d: Donem) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const depoMap = new Map(db.depolar.filter((x) => x.aktif).map((x) => [x.id, x.ad]));
  const goster = new Map<string, string>(); // normal ad → gösterilen ad
  for (const ad of depoMap.values()) goster.set(depoAd(ad), ad);
  const o = new Map<string, { ciro: number; kar: number; fis: Set<string>; alis: number; urun: Map<string, { ad: string; ciro: number }> }>();
  const al = (k: string) => { let x = o.get(k); if (!x) { x = { ciro: 0, kar: 0, fis: new Set(), alis: 0, urun: new Map() }; o.set(k, x); } return x; };
  let belirsiz = 0, belirsizKar = 0;
  for (const h of gecerliHareketler(db, d)) {
    const k = depoAd(h.depo);
    if (h.tur === 'satis') {
      const s = satirKar(h, db, urun);
      if (!k) { belirsiz += s.ciro; belirsizKar += s.kar; continue; }
      if (!goster.has(k)) goster.set(k, h.depo!);
      const x = al(k); x.ciro += s.ciro; x.kar += s.kar; x.fis.add(h.belge_guid ?? h.tarih);
      const ad = urun.get(h.urun_id)?.ad ?? h.urun_ad ?? '—'; const y = x.urun.get(h.urun_id) ?? { ad, ciro: 0 }; y.ciro += s.ciro; x.urun.set(h.urun_id, y);
    } else if (k) { if (!goster.has(k)) goster.set(k, h.depo!); al(k).alis += h.miktar * h.alis_fiyati; }
  }
  // depo × ürün stok ve son 60 günlük depo satışı
  const stok = new Map<string, Map<ID, number>>(); // depo → ürün → miktar
  for (const s of db.urun_depo_stok) { const k = depoAd(depoMap.get(s.depo_id)); if (!k) continue; const m = stok.get(k) ?? new Map(); m.set(s.urun_id, (m.get(s.urun_id) ?? 0) + s.miktar); stok.set(k, m); }
  const d60: Donem = { bas: gunOnce(59), bit: gunu() }; const gun60 = takipGunu(db, d60);
  const satis60 = new Map<string, Map<ID, number>>(); const sonSatis = new Map<string, Map<ID, string>>();
  for (const h of db.hareketler) {
    if (h.yok_say || h.tur !== 'satis') continue; const k = depoAd(h.depo); if (!k) continue; const g = gunu(h.tarih);
    const ss = sonSatis.get(k) ?? new Map(); if (!ss.get(h.urun_id) || g > ss.get(h.urun_id)!) ss.set(h.urun_id, g); sonSatis.set(k, ss);
    if (g < d60.bas) continue; const m = satis60.get(k) ?? new Map(); m.set(h.urun_id, (m.get(h.urun_id) ?? 0) + h.miktar); satis60.set(k, m);
  }
  const anahtarlar = [...new Set([...goster.keys()])];
  const maliyet = (u: Urun) => (u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, db.ayarlar) : 0);
  const sinir90 = gunOnce(90);
  const depolar: DepoOzet[] = anahtarlar.map((k) => {
    const x = o.get(k); const st = stok.get(k) ?? new Map(); let deger = 0, cesit = 0, olu = 0, oluC = 0;
    for (const [id, q] of st) { if (q <= 0) continue; const u = urun.get(id); if (!u?.aktif) continue; const v = q * maliyet(u); deger += v; cesit++;
      const son = sonSatis.get(k)?.get(id); if (!son || son < sinir90) { olu += v; oluC++; } }
    return { ad: goster.get(k) ?? k, ciro: x?.ciro ?? 0, kar: x?.kar ?? 0, fis: x?.fis.size ?? 0, alis: x?.alis ?? 0, stokDeger: deger, stokCesit: cesit, oluDeger: olu, oluCesit: oluC,
      enCok: x ? [...x.urun.values()].sort((a, b) => b.ciro - a.ciro).slice(0, 10) : [] };
  }).sort((a, b) => b.ciro - a.ciro);
  // transfer önerisi: bir depoda bitmiş ama orada satılıyor, diğer depoda ihtiyaçtan fazla var
  const transfer: Transfer[] = [];
  for (const u of db.urunler) {
    if (!u.aktif) continue;
    for (const h of anahtarlar) {
      const hs = stok.get(h)?.get(u.id) ?? 0, hSat = satis60.get(h)?.get(u.id) ?? 0;
      if (hs > 0 || hSat <= 0) continue;
      let enIyi: Transfer | null = null;
      for (const k of anahtarlar) {
        if (k === h) continue; const ks = stok.get(k)?.get(u.id) ?? 0, kSat = satis60.get(k)?.get(u.id) ?? 0;
        const kendiIhtiyac = Math.ceil((kSat / gun60) * 30); const fazla = ks - Math.max(1, kendiIhtiyac);
        if (fazla <= 0) continue;
        const adet = Math.max(1, Math.min(fazla, Math.ceil((hSat / gun60) * 30)));
        if (!enIyi || fazla > enIyi.kaynakStok - enIyi.adet) enIyi = { u, kaynak: goster.get(k) ?? k, hedef: goster.get(h) ?? h, adet, kaynakStok: ks, hedefStok: hs, hedefSatis: hSat, kaynakSatis: kSat };
      }
      if (enIyi) transfer.push(enIyi);
    }
  }
  transfer.sort((a, b) => b.hedefSatis - a.hedefSatis);
  return { depolar, belirsiz, belirsizKar, transfer, gun60 };
}

// ======================= İNDİRİM =======================
export interface IndirimKisi { ad: string; guid?: string | null; ciro: number; listeTutar: number; fark: number; indirim: number; satir: number; altSatir: number }
export function indirimAnalizi(db: DB, d: Donem) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const musteri = new Map<string, IndirimKisi>(), kullanici = new Map<string, IndirimKisi>(), urunM = new Map<string, IndirimKisi & { u: Urun }>();
  let ciro = 0, liste = 0, fark = 0, indirim = 0, satir = 0, alt = 0; const seg = { usta: { ciro: 0, liste: 0 }, perakende: { ciro: 0, liste: 0 } };
  const ekle = <T extends IndirimKisi>(m: Map<string, T>, k: string, bos: () => T, c: number, l: number, f: number, i: number, a: boolean) => {
    const x = m.get(k) ?? bos(); x.ciro += c; x.listeTutar += l; x.fark += f; x.indirim += i; x.satir++; if (a) x.altSatir++; m.set(k, x);
  };
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis') continue; const u = urun.get(h.urun_id); if (!u || !(u.satis_fiyati > 0)) continue;
    const c = h.miktar * h.satis_fiyati, l = h.miktar * u.satis_fiyati;
    const f = Math.max(0, l - c), i = (h.indirim ?? 0) * (1 + h.kdv / 100); const a = h.satis_fiyati < u.satis_fiyati * 0.98;
    ciro += c; liste += l; fark += f; indirim += i; satir++; if (a) alt++;
    const per = PERAKENDE_RE.test(h.cari_ad ?? '') || !h.cari_guid; const sg = per ? seg.perakende : seg.usta; sg.ciro += c; sg.liste += l;
    const mk = h.cari_guid ?? (h.cari_ad || 'Perakende');
    ekle(musteri, mk, () => ({ ad: h.cari_ad || 'Perakende', guid: h.cari_guid, ciro: 0, listeTutar: 0, fark: 0, indirim: 0, satir: 0, altSatir: 0 }), c, l, f, i, a);
    ekle(kullanici, h.kullanici || '—', () => ({ ad: h.kullanici || '—', ciro: 0, listeTutar: 0, fark: 0, indirim: 0, satir: 0, altSatir: 0 }), c, l, f, i, a);
    ekle(urunM, u.id, () => ({ u, ad: u.ad, ciro: 0, listeTutar: 0, fark: 0, indirim: 0, satir: 0, altSatir: 0 }), c, l, f, i, a);
  }
  const sirala = <T extends IndirimKisi>(m: Map<string, T>) => [...m.values()].filter((x) => x.fark > 0.5).sort((a, b) => b.fark - a.fark);
  return { ciro, liste, fark, farkNet: fark / 1.2, indirim, satir, alt, seg, musteri: sirala(musteri), kullanici: [...kullanici.values()].sort((a, b) => b.ciro - a.ciro), urun: sirala(urunM) };
}

// ======================= KARTLAR =======================
export function urunKarti(db: DB, id: ID) {
  const u = db.urunler.find((x) => x.id === id) ?? null;
  const h = db.hareketler.filter((x) => !x.yok_say && x.urun_id === id);
  const satis = h.filter((x) => x.tur === 'satis'), alis = h.filter((x) => x.tur === 'alis');
  const ay = new Map<string, { adet: number; ciro: number }>();
  for (const x of satis) { const k = gunu(x.tarih).slice(0, 7); const y = ay.get(k) ?? { adet: 0, ciro: 0 }; y.adet += x.miktar; y.ciro += x.miktar * x.satis_fiyati; ay.set(k, y); }
  const ted = new Map<string, { ad: string; adet: number; tutar: number; son: string; sonFiyat: number }>();
  for (const x of [...alis].sort((a, b) => a.tarih.localeCompare(b.tarih))) { const k = x.cari_ad || '—'; const y = ted.get(k) ?? { ad: k, adet: 0, tutar: 0, son: '', sonFiyat: 0 }; y.adet += x.miktar; y.tutar += x.miktar * x.alis_fiyati; y.son = gunu(x.tarih); y.sonFiyat = x.alis_fiyati; ted.set(k, y); }
  const depo = db.urun_depo_stok.filter((s) => s.urun_id === id).map((s) => ({ ad: db.depolar.find((x) => x.id === s.depo_id)?.ad ?? '—', miktar: s.miktar }));
  let ciro = 0, kar = 0, adet = 0; for (const x of satis) { const t = hareketTutar(x, db.ayarlar); ciro += t.ciro; kar += t.kar; adet += x.miktar; }
  const musteri = new Map<string, { ad: string; adet: number }>(); for (const x of satis) { if (!x.cari_ad || PERAKENDE_RE.test(x.cari_ad)) continue; const y = musteri.get(x.cari_ad) ?? { ad: x.cari_ad, adet: 0 }; y.adet += x.miktar; musteri.set(x.cari_ad, y); }
  return { u, satis: satis.slice(0, 30), alis: alis.slice(0, 20), ay: [...ay.entries()].sort().map(([k, v]) => ({ ay: k, ...v })), tedarikci: [...ted.values()].sort((a, b) => a.tutar / a.adet - b.tutar / b.adet), depo,
    ciro, kar, adet, fiyat: db.fiyat_gecmisi.filter((f) => f.urun_id === id).slice(0, 10), musteri: [...musteri.values()].sort((a, b) => b.adet - a.adet).slice(0, 8), arac: u ? aracCikar(u.ad) : null };
}

export function musteriKarti(db: DB, guid: string | null, ad: string) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const c = guid ? db.cariler.find((x) => x.bh_id === guid) : db.cariler.find((x) => x.ad === ad);
  const h = db.hareketler.filter((x) => !x.yok_say && x.tur === 'satis' && (guid ? x.cari_guid === guid : x.cari_ad === ad));
  const belgeler = new Map<string, { tarih: string; tutar: number; kalem: number; kar: number }>();
  const ay = new Map<string, number>(); const urunler = new Map<string, { ad: string; adet: number; ciro: number }>();
  let ciro = 0, kar = 0;
  for (const x of h) {
    const s = satirKar(x, db, urun); ciro += s.ciro; kar += s.kar;
    const b = belgeler.get(x.belge_guid ?? x.tarih) ?? { tarih: x.tarih, tutar: 0, kalem: 0, kar: 0 }; b.tutar += s.ciro; b.kalem++; b.kar += s.kar; belgeler.set(x.belge_guid ?? x.tarih, b);
    const k = gunu(x.tarih).slice(0, 7); ay.set(k, (ay.get(k) ?? 0) + s.ciro);
    const ua = urun.get(x.urun_id)?.ad ?? x.urun_ad ?? '—'; const y = urunler.get(ua) ?? { ad: ua, adet: 0, ciro: 0 }; y.adet += x.miktar; y.ciro += s.ciro; urunler.set(ua, y);
  }
  const ana = buyuk((c?.ad ?? ad).split('/')[0]);
  const tahsilat = db.kasa_akisi.filter((k) => k.giris > 0 && k.karsi && ana.length > 3 && buyuk(k.karsi).includes(ana)).sort((a, b) => b.tarih.localeCompare(a.tarih));
  const vg = db.vadesi_gecen.find((v) => buyuk(v.cari) === buyuk(c?.ad ?? ad));
  const b = [...belgeler.values()].sort((x, y) => y.tarih.localeCompare(x.tarih));
  const gunler = [...new Set(b.map((x) => gunu(x.tarih)))].sort();
  const aralik = gunler.length > 1 ? Math.round((new Date(gunler[gunler.length - 1]).getTime() - new Date(gunler[0]).getTime()) / 864e5 / (gunler.length - 1)) : null;
  const plakaArac = (c?.ad ?? ad).includes('/') ? aracCikar(c?.ad ?? ad, true) : null;
  return { cari: c ?? null, ad: c?.ad ?? ad, ciro, kar, belgeler: b, ay: [...ay.entries()].sort().map(([k, v]) => ({ ay: k, ciro: v })), urunler: [...urunler.values()].sort((x, y) => y.ciro - x.ciro).slice(0, 10),
    tahsilat: tahsilat.slice(0, 15), tahsilatToplam: tahsilat.reduce((t, k) => t + k.giris, 0), vadesiGecen: vg ?? null, aralik, ilk: gunler[0], son: gunler[gunler.length - 1], arac: plakaArac };
}

// ======================= MEVSİMSELLİK =======================
/** Kategori/ad için aylık talep profili (1 = normal). Türkiye iklimine göre genel kabul; veri biriktikçe kendi satışlarınızla karşılaştırın. */
const MEVSIM: { re: RegExp; ad: string; ay: number[] }[] = [
  { re: /ANT[Iİ]-?F[Iİ]?R[Iİ]Z/, ad: 'Antifriz', ay: [1.4, 1.2, 0.9, 0.6, 0.5, 0.5, 0.5, 0.6, 0.9, 1.4, 1.6, 1.5] },
  { re: /AKU|AKÜ/, ad: 'Akü', ay: [1.3, 1.2, 1.0, 0.9, 0.85, 0.9, 1.0, 1.0, 0.95, 1.1, 1.3, 1.35] },
  { re: /KLIMA|KLİMA|POLEN|KABIN FILT|KABİN FİLT|KOMPRESOR|KOMPRESÖR/, ad: 'Klima', ay: [0.5, 0.6, 0.8, 1.0, 1.3, 1.6, 1.7, 1.5, 1.0, 0.7, 0.5, 0.5] },
  { re: /SILECEK|SİLECEK/, ad: 'Silecek', ay: [1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.7, 0.7, 0.9, 1.3, 1.5, 1.3] },
  { re: /KIZDIRMA|ISITMA BUJ|ISITICI/, ad: 'Kızdırma bujisi', ay: [1.4, 1.2, 0.9, 0.7, 0.6, 0.6, 0.6, 0.6, 0.8, 1.2, 1.5, 1.5] },
  { re: /SU RADYAT|FAN |FAN$|DEVIRDAIM|DEVİRDAİM|TERMOSTAT/, ad: 'Soğutma', ay: [0.8, 0.8, 0.9, 1.0, 1.1, 1.25, 1.3, 1.25, 1.0, 0.9, 0.85, 0.8] },
];
export function mevsim(u: Pick<Urun, 'kategori' | 'ad'>, ayIndeks = new Date().getMonth()) {
  const s = buyuk(`${u.kategori ?? ''} ${u.ad}`);
  const m = MEVSIM.find((x) => x.re.test(s)); if (!m) return null;
  const simdi = m.ay[ayIndeks], sonra = m.ay[(ayIndeks + 1) % 12];
  return { ad: m.ad, katsayi: Math.round((sonra / simdi) * 100) / 100, profil: m.ay };
}

// ======================= TEDARİKÇİ SİPARİŞ =======================
/** Ürün için son 6 ayın alımlarından en ucuz ve en son tedarikçi */
export function urunTedarikcileri(db: DB) {
  const sinir = gunOnce(180);
  const m = new Map<ID, Map<string, { ad: string; tutar: number; adet: number; son: string }>>();
  for (const h of db.hareketler) {
    if (h.tur !== 'alis' || h.kaynak !== 'fatura' || !h.cari_ad || !(h.alis_fiyati > 0) || gunu(h.tarih) < sinir) continue;
    const x = m.get(h.urun_id) ?? new Map(); const y = x.get(h.cari_ad) ?? { ad: h.cari_ad, tutar: 0, adet: 0, son: '' };
    y.tutar += h.miktar * h.alis_fiyati; y.adet += h.miktar; if (gunu(h.tarih) > y.son) y.son = gunu(h.tarih); x.set(h.cari_ad, y); m.set(h.urun_id, x);
  }
  const sonuc = new Map<ID, { ucuz: { ad: string; fiyat: number }; son: { ad: string; tarih: string }; secenek: number }>();
  for (const [id, x] of m) {
    const l = [...x.values()]; const ucuz = l.reduce((a, b) => (b.tutar / b.adet < a.tutar / a.adet ? b : a)); const son = l.reduce((a, b) => (b.son > a.son ? b : a));
    sonuc.set(id, { ucuz: { ad: ucuz.ad, fiyat: ucuz.tutar / ucuz.adet }, son: { ad: son.ad, tarih: son.son }, secenek: l.length });
  }
  return sonuc;
}

export const kdvHaricListe = (u: Urun) => netSatis(u.satis_fiyati, u.kdv);

// ======================= DEPO BAZLI SİPARİŞ =======================
export interface DepoSiparisSatir {
  u: Urun; stok: number; satilan: number; hiz: number; hedef: number; ihtiyac: number; transfer: number; siparis: number;
  digerStok: { ad: string; stok: number; fazla: number }[]; neden: 'bitti' | 'azaliyor'; yeterGun: number; mevsim: { ad: string; katsayi: number } | null;
}
export interface DepoSiparis { anahtar: string; ad: string; satirlar: DepoSiparisSatir[] }
/** Her depo için kendi stoğu ve kendi satış hızına göre sipariş listesi; diğer depoda fazlası olan kısım transfer olarak ayrılır */
export function depoSiparisleri(db: DB, gunSec = 60, hedefGun = 30, mevsimAcik = true): DepoSiparis[] {
  const depolar = db.depolar.filter((x) => x.aktif).map((x) => ({ id: x.id, k: depoAd(x.ad), ad: x.ad }));
  const kIdx = new Map(depolar.map((x) => [x.k, x]));
  const stok = new Map<string, Map<ID, number>>();
  for (const s of db.urun_depo_stok) { const d = depolar.find((x) => x.id === s.depo_id); if (!d) continue; const m = stok.get(d.k) ?? new Map(); m.set(s.urun_id, (m.get(s.urun_id) ?? 0) + s.miktar); stok.set(d.k, m); }
  const d: Donem = { bas: gunOnce(gunSec - 1), bit: gunu() }; const gun = takipGunu(db, d);
  const satis = new Map<string, Map<ID, number>>();
  for (const h of gecerliHareketler(db, d)) { if (h.tur !== 'satis') continue; const k = depoAd(h.depo); if (!kIdx.has(k)) continue; const m = satis.get(k) ?? new Map(); m.set(h.urun_id, (m.get(h.urun_id) ?? 0) + h.miktar); satis.set(k, m); }
  const ihtiyacHesap = (u: Urun, k: string, ms: number) => { const st = stok.get(k)?.get(u.id) ?? 0, sat = satis.get(k)?.get(u.id) ?? 0, hiz = (sat / gun) * ms; return { st, sat, hiz, hedef: sat > 0 ? Math.max(1, Math.ceil(hiz * hedefGun)) : 0 }; };
  return depolar.map((dp) => {
    const satirlar: DepoSiparisSatir[] = [];
    for (const u of db.urunler) {
      if (!u.aktif) continue;
      const ms = mevsimAcik ? mevsim(u) : null; const kat = ms?.katsayi ?? 1;
      const b = ihtiyacHesap(u, dp.k, kat);
      if (b.sat <= 0) continue;
      const ihtiyac = Math.max(0, b.hedef - Math.max(0, b.st));
      if (b.st > 0 && ihtiyac <= 0) continue;
      const diger = depolar.filter((o) => o.k !== dp.k).map((o) => { const x = ihtiyacHesap(u, o.k, kat); return { ad: o.ad, stok: x.st, fazla: Math.max(0, x.st - x.hedef) }; });
      const transfer = Math.min(ihtiyac, diger.reduce((t, x) => t + x.fazla, 0));
      satirlar.push({ u, stok: b.st, satilan: b.sat, hiz: b.hiz, hedef: b.hedef, ihtiyac, transfer, siparis: Math.max(0, ihtiyac - transfer), digerStok: diger,
        neden: b.st <= 0 ? 'bitti' : 'azaliyor', yeterGun: b.hiz > 0 ? Math.max(0, b.st) / b.hiz : Infinity, mevsim: ms && ms.katsayi !== 1 ? ms : null });
    }
    satirlar.sort((x, y) => (x.neden === y.neden ? 0 : x.neden === 'bitti' ? -1 : 1) || y.satilan - x.satilan);
    return { anahtar: dp.k, ad: dp.ad, satirlar };
  });
}
