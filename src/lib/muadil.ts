import type { DB, Urun } from './types';

/**
 * Muadil = aynı parçanın başka markası. Kural (kullanıcı kararı, 20.10.2026): iki ürün ancak
 * EN AZ 2 ORTAK OEM KODU varsa ve aynı kategorideyse muadil sayılır — tek ortak kod ya da yalnız
 * Otomarmara'nın "eşdeğer" demesi yetmez (ölçümde bunların çoğu başka araç/başka parça çıktı).
 *
 * OEM kodlarının kaynağı:
 *  - Otomarmara'dan gelen OEM listesi — yalnız ürünümüzün Otomarmara'daki ürünle eşleşmesi GÜVENİLİRSE
 *    (stok kodu birebir aynı, ya da kod farklı ama iki ürünün adında aynı parça adı geçiyor).
 *    Örn. bizim GRT-10127 hava filtresi Otomarmara'da MHR-10127 supap takımıyla eşleşmişti: bu eşleşme reddedilir.
 *  - BizimHesap kartındaki etiket alanı ve elle yüklenen OEM / muadil kodları.
 */
export const MUADIL_ESIK = 2;

const norm = (s?: string | null) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
/** Türkçe karaktersiz büyük harf, yalnız harfler ve boşluk */
const harf = (s?: string | null) => (s ?? '').replace(/i/g, 'İ').toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/[^A-Z]+/g, ' ').trim();
/** Parça adı sayılmayan kelimeler (ilk 4 harfi): araç marka/modelleri, üretici markaları, konum ve genel kelimeler */
const DURAK = new Set(('ARKA TAKI SETI ADET KOMP ORJI ORIJ UNIV UYUM MODE BENZ DIZE MERC RENA FIAT OPEL FORD TOYO HYUN PEUG CITR DACI VOLK AUDI SEAT SKOD HOND NISS KANG CLIO MEGA ' +
  'EGEA DOBL LINE FIOR PALI ALBE PUNT PAND CORS ASTR VECT INSI FOCU FIES TRAN CONN CORO YARI AURI ACCE TUCS ELAN GOLF POLO PASS JETT CADD TOUR SPRI VITO CRAF DUCA BOXE ' +
  'JUMP PART BERL SAND LOGA DUST SYMB FLUE LAGU SCEN QASH MICR SUNN CIVI JAZZ ACCO CEED SPOR PICA MINI VOLV MAZD MITS SUZU ISUZ IVEC ESCO MOND KUGA TRAF MAST MOVA CLAS ' +
  'KLAS VALE BOSC SACH LEMF FEBI SWAG MAHL MANN ICIN ESKI').split(' '));
const parcaKelimeleri = (ad?: string | null) => harf(ad).split(' ').filter((k) => k.length >= 4 && !DURAK.has(k.slice(0, 4)));
/** İki ürün adında aynı parça adı geçiyor mu ("ROT BAŞI" = "ROTBAŞI", "FİLTRESİ" = "FILTRE" sayılır) */
export function ayniParcaAdi(a?: string | null, b?: string | null) {
  const ab = harf(a).replace(/ /g, ''), bb = harf(b).replace(/ /g, '');
  return parcaKelimeleri(a).some((k) => bb.includes(k.slice(0, 5))) || parcaKelimeleri(b).some((k) => ab.includes(k.slice(0, 5)));
}

const guvenOnbellek = new WeakMap<object, { om: unknown; s: Set<string> }>();
/** Otomarmara eşleşmesi güvenilir olan ürünler (OEM ve eşdeğer bilgisi yalnız bunlarda kullanılır) */
export function omGuvenilir(db: DB): Set<string> {
  const h = guvenOnbellek.get(db.urunler); if (h && h.om === db.otomarmara_veri) return h.s;
  const id = new Map(db.urunler.map((u) => [String(u.id), u])); const s = new Set<string>();
  for (const v of db.otomarmara_veri ?? []) {
    const u = id.get(String(v.urun_id)); if (!u || !v.om_kod) continue;
    if (norm(u.kod) === norm(v.om_kod) || ayniParcaAdi(u.ad, v.om_ad)) s.add(String(u.id));
  }
  guvenOnbellek.set(db.urunler, { om: db.otomarmara_veri, s }); return s;
}
/** Ürünün Otomarmara eşleşmesi: yok / güvenilir / şüpheli (başka bir ürünle eşleşmiş olabilir) */
export function omEslesme(db: DB, u: Urun): 'yok' | 'guvenilir' | 'supheli' {
  const v = db.otomarmara_veri?.find((x) => String(x.urun_id) === String(u.id));
  if (!v?.om_kod) return 'yok';
  return omGuvenilir(db).has(String(u.id)) ? 'guvenilir' : 'supheli';
}

export interface MuadilSatir { v: Urun; ortak: number }
const onbellek = new WeakMap<object, { om: unknown; kod: unknown; bul: (u: Urun) => MuadilSatir[] }>();

/** Ürün → muadilleri (en az 2 ortak OEM kodu + aynı kategori), stoklu olanlar önde */
export function muadilDetay(db: DB): (u: Urun) => MuadilSatir[] {
  const hazir = onbellek.get(db.urunler); if (hazir && hazir.om === db.otomarmara_veri && hazir.kod === db.urun_kodlari) return hazir.bul;
  const guven = omGuvenilir(db); const id = new Map(db.urunler.filter((u) => u.aktif).map((u) => [String(u.id), u]));
  const kodlari = new Map<string, Set<string>>();
  const ekle = (uid: string, k: string) => { const n = norm(k); if (n.length < 5) return; let s = kodlari.get(uid); if (!s) kodlari.set(uid, (s = new Set())); s.add(n); };
  for (const u of id.values()) for (const e of (u.etiket ?? '').split(',')) ekle(String(u.id), e);
  for (const k of db.urun_kodlari) { const uid = String(k.urun_id); if (!id.has(uid)) continue; if (k.tur === 'OTOMARMARA' && !guven.has(uid)) continue; ekle(uid, k.kod_norm ?? k.kod); }
  const idx = new Map<string, string[]>();
  for (const [uid, s] of kodlari) for (const n of s) { const l = idx.get(n); if (l) l.push(uid); else idx.set(n, [uid]); }
  const sonuc = new Map<string, MuadilSatir[]>();
  const bul = (u: Urun) => {
    const uid = String(u.id); const h = sonuc.get(uid); if (h) return h;
    const say = new Map<string, number>();
    for (const n of kodlari.get(uid) ?? []) for (const o of idx.get(n) ?? []) if (o !== uid) say.set(o, (say.get(o) ?? 0) + 1);
    const l: MuadilSatir[] = [];
    for (const [o, n] of say) { if (n < MUADIL_ESIK) continue; const v = id.get(o); if (v && (v.kategori ?? '') === (u.kategori ?? '')) l.push({ v, ortak: n }); }
    l.sort((a, b) => Number(b.v.stok > 0) - Number(a.v.stok > 0) || b.ortak - a.ortak || b.v.stok - a.v.stok);
    sonuc.set(uid, l); return l;
  };
  onbellek.set(db.urunler, { om: db.otomarmara_veri, kod: db.urun_kodlari, bul }); return bul;
}
/** Muadil ürünler (eski kullanım için ürün listesi) */
export function muadilBulucu(db: DB): (u: Urun) => Urun[] { const d = muadilDetay(db); return (u) => d(u).map((x) => x.v); }

/** Stokta olan muadiller ("SRD-SA2481 (3)" biçiminde kısa metinle) */
export function stoktakiMuadiller(db: DB, u: Urun) { return muadilBulucu(db)(u).filter((v) => v.stok > 0); }
/** Depo bazında: o depoda stokta olan muadiller */
export function depoMuadil(db: DB, u: Urun) {
  const ds = new Map<string, number>(); for (const x of db.urun_depo_stok) ds.set(`${x.urun_id}|${x.depo_id}`, Number(x.miktar) || 0);
  const m = muadilBulucu(db)(u);
  return db.depolar.filter((d) => d.aktif !== false).map((d) => ({ depo: d, muadil: m.map((v) => ({ v, adet: ds.get(`${v.id}|${d.id}`) ?? 0 })).filter((x) => x.adet > 0) }));
}
export const depoKisa = (ad: string) => ad.replace(/\s*DEPO(SU)?\s*$/i, '').trim();
export const muadilMetin = (l: Urun[]) => l.map((v) => `${v.kod || v.ad.slice(0, 20)} (${Math.round(v.stok)})`).join(', ');
