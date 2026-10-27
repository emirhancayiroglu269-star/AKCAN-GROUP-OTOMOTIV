// Trendyol entegrasyonu (Supabase Edge Function): onaylı ilanları ve sipariş paketlerini OKUR.
// YAZDIKLARI: (1) ayarlarda "stok gönderimi" açıksa eşleşen ilanların STOK adedi (iki deponun toplamı − güvenlik stoğu),
// (2) yeni ilan (elle ya da ayardan açıksa otomatik), (3) ayardan açıksa kâr hedefinin altında kalan ilanların fiyatını hedefe yükseltir.
// Her gönderim ty_gonderim / ty_yukleme tablolarına kaydedilir.
// Çağıran: siteye giriş yapmış kullanıcı (test/eşitle düğmesi) veya zamanlayıcı (service role).
// Gizli değerler (kullanıcı girer): TRENDYOL_SATICI_ID, TRENDYOL_API_KEY, TRENDYOL_API_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2';

const BASE = 'https://apigw.trendyol.com/integration';
const SATICI = (Deno.env.get('TRENDYOL_SATICI_ID') ?? '').trim();
const KEY = (Deno.env.get('TRENDYOL_API_KEY') ?? '').trim();
const SECRET = (Deno.env.get('TRENDYOL_API_SECRET') ?? '').trim();
const SERVIS = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const URUN_ARALIK_DK = 60;   // ilanlar saatte bir
const SIPARIS_GUN = 14;      // son 14 günde değişen paketler (Trendyol en fazla 2 haftalık aralık verir)

const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVIS, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
type Obj = Record<string, unknown>;
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ty(yol: string): Promise<Obj> {
  for (let deneme = 0; deneme < 3; deneme++) {
    const r = await fetch(BASE + yol, { headers: { Authorization: 'Basic ' + btoa(`${KEY}:${SECRET}`), 'User-Agent': `${SATICI} - SelfIntegration`, Accept: 'application/json' } });
    const t = await r.text();
    if (r.status === 429) { await bekle(1500 * (deneme + 1)); continue; }
    if (!r.ok) throw new Error(`Trendyol ${yol.split('?')[0].replace(SATICI, '{id}')} → HTTP ${r.status}: ${t.slice(0, 200)}`);
    try { return JSON.parse(t) as Obj; } catch { throw new Error('Trendyol yanıtı okunamadı'); }
  }
  throw new Error('Trendyol çok fazla istek dedi (429); biraz sonra tekrar denenecek');
}
async function tyPost(yol: string, govde: unknown): Promise<Obj> {
  for (let deneme = 0; deneme < 3; deneme++) {
    const r = await fetch(BASE + yol, { method: 'POST', headers: { Authorization: 'Basic ' + btoa(`${KEY}:${SECRET}`), 'User-Agent': `${SATICI} - SelfIntegration`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(govde) });
    const t = await r.text();
    if (r.status === 429) { await bekle(2000 * (deneme + 1)); continue; }
    if (!r.ok) throw new Error(`Trendyol stok gönderimi → HTTP ${r.status}: ${t.slice(0, 200)}`);
    try { return JSON.parse(t) as Obj; } catch { return {}; }
  }
  throw new Error('Trendyol çok fazla istek dedi (429)');
}
const sayi = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const metin = (v: unknown) => (v === null || v === undefined ? null : String(v).trim() || null);
const ad = (v: unknown) => (v && typeof v === 'object' ? metin((v as Obj).name ?? (v as Obj).title) : metin(v));

// ---------- ilanlar (onaylı ürünler, v2) ----------
function urunSatirlari(icerik: Obj): Obj[] {
  const varyant = Array.isArray(icerik.variants) && icerik.variants.length ? (icerik.variants as Obj[]) : [icerik];
  return varyant.map((v) => {
    const fiyat = (v.price ?? icerik.price ?? {}) as Obj; const stok = (v.stock ?? icerik.stock ?? {}) as Obj;
    return {
      barkod: metin(v.barcode ?? icerik.barcode),
      stok_kodu: metin(v.stockCode ?? v.merchantSku ?? icerik.stockCode),
      baslik: metin(icerik.title ?? v.title),
      marka: ad(icerik.brand) ?? metin(icerik.brandName),
      kategori: ad(icerik.category) ?? metin(icerik.categoryName),
      satis_fiyati: sayi(fiyat.salePrice ?? v.salePrice ?? icerik.salePrice),
      liste_fiyati: sayi(fiyat.listPrice ?? v.listPrice ?? icerik.listPrice),
      stok: sayi(stok.quantity ?? v.quantity ?? icerik.quantity),
      kdv: sayi(v.vatRate ?? icerik.vatRate),
      satista: (v.onSale ?? icerik.onSale) === undefined ? null : Boolean(v.onSale ?? icerik.onSale) && !(v.archived ?? icerik.archived),
      icerik_id: metin(icerik.contentId ?? icerik.productMainId ?? icerik.id),
      kategori_id: sayi(((icerik.category ?? {}) as Obj).id ?? icerik.categoryId), marka_id: sayi(((icerik.brand ?? {}) as Obj).id ?? icerik.brandId),
      komisyon: sayi(v.commission ?? icerik.commission), desi: sayi(v.dimensionalWeight ?? icerik.dimensionalWeight),
      ozellikler: Array.isArray(icerik.attributes) ? icerik.attributes : null,
      onayli: true, guncelleme: new Date().toISOString(),
    };
  }).filter((x) => x.barkod);
}
async function ilanlariCek() {
  const hepsi: Obj[] = []; let ornek: unknown = null;
  for (let sayfa = 0; sayfa < 200; sayfa++) {
    const d = await ty(`/product/sellers/${SATICI}/products/approved?page=${sayfa}&size=100`);
    const l = (d.content ?? d.items ?? []) as Obj[]; if (sayfa === 0 && (!ornek || l.length)) ornek = { anahtarlar: Object.keys(d), ilk: l[0] ?? null };
    for (const x of l) hepsi.push(...urunSatirlari(x));
    const toplamSayfa = sayi(d.totalPages); if (!l.length || (toplamSayfa !== null && sayfa + 1 >= toplamSayfa)) break;
    await bekle(250);
  }
  const tekil = [...new Map(hepsi.map((x) => [x.barkod as string, x])).values()];
  for (let i = 0; i < tekil.length; i += 500) { const { error } = await db.from('ty_urun').upsert(tekil.slice(i, i + 500)); if (error) throw new Error('ty_urun: ' + error.message); }
  // artık Trendyol'da olmayan ilanları kaldır (yarım yanıtta silmemek için en az 1 ilan geldiyse)
  if (tekil.length) { const { error } = await db.from('ty_urun').delete().lt('guncelleme', new Date(Date.now() - 6 * 3600000).toISOString()); if (error) throw new Error(error.message); }
  const { data: es } = await db.rpc('ty_eslestir_say');
  await db.rpc('ty_esleme_ogren');
  return { ilan: tekil.length, eslesen: es, ornek };
}

// ---------- siparişler (paketler, v2) ----------
function paketSatiri(p: Obj) {
  const satirlar = ((p.lines ?? []) as Obj[]).map((l) => ({
    barkod: metin(l.barcode), stok_kodu: metin(l.stockCode ?? l.merchantSku), ad: metin(l.productName),
    adet: sayi(l.quantity) ?? 1, birim_fiyat: sayi(l.lineUnitPrice ?? l.price), brut: sayi(l.lineGrossAmount ?? l.amount),
    indirim: sayi(l.lineTotalDiscount ?? l.discount) ?? 0, satici_indirim: sayi(l.lineSellerDiscount) ?? 0,
    komisyon: sayi(l.commission), kdv: sayi(l.vatRate ?? l.vatBaseAmount), durum: metin(l.orderLineItemStatusName),
  }));
  const tarih = sayi(p.orderDate ?? p.createdDate); const son = sayi(p.lastModifiedDate ?? p.packageLastModifiedDate);
  const adres = (p.shipmentAddress ?? {}) as Obj;
  return {
    paket_id: String(p.shipmentPackageId ?? p.id ?? p.packageId), siparis_no: metin(p.orderNumber),
    tarih: tarih ? new Date(tarih).toISOString() : null, son_degisim: son ? new Date(son).toISOString() : null,
    durum: metin(p.shipmentPackageStatus ?? p.status), sehir: metin(adres.city),
    toplam: sayi(p.packageTotalPrice ?? p.totalPrice), indirim: sayi(p.packageTotalDiscount ?? p.totalDiscount) ?? 0,
    kargo_firma: metin(p.cargoProviderName), kargo_takip: metin(p.cargoTrackingNumber),
    satirlar, guncelleme: new Date().toISOString(),
  };
}
async function siparisleriCek(gun = SIPARIS_GUN) {
  // Trendyol tek istekte en fazla 2 haftalık aralık verir: daha uzun süre 14 günlük pencerelere bölünür
  const hepsi: ReturnType<typeof paketSatiri>[] = []; let ornek: unknown = null;
  for (let p = 0; p * 14 < gun; p++) {
  const bit = Date.now() - p * 14 * 864e5; const bas = bit - Math.min(14, gun - p * 14) * 864e5;
  for (let sayfa = 0; sayfa < 50; sayfa++) {
    const d = await ty(`/order/sellers/${SATICI}/v2/orders?startDate=${bas}&endDate=${bit}&page=${sayfa}&size=200&orderByField=PackageLastModifiedDate&orderByDirection=DESC`);
    const l = (d.content ?? []) as Obj[]; if (sayfa === 0 && (!ornek || l.length)) ornek = { anahtarlar: Object.keys(d), ilk: l[0] ? { ...l[0], shipmentAddress: undefined, invoiceAddress: undefined, customerFirstName: undefined, customerLastName: undefined, customerEmail: undefined } : null };
    hepsi.push(...l.map(paketSatiri).filter((x) => x.paket_id && x.paket_id !== 'undefined'));
    const toplamSayfa = sayi(d.totalPages); if (!l.length || (toplamSayfa !== null && sayfa + 1 >= toplamSayfa)) break;
    await bekle(250);
  }
  }
  for (let i = 0; i < hepsi.length; i += 500) { const { error } = await db.from('ty_siparis').upsert(hepsi.slice(i, i + 500)); if (error) throw new Error('ty_siparis: ' + error.message); }
  return { siparis: hepsi.length, ornek };
}

// ---------- stok gönderimi ----------
type Ayar = { stok_gonder?: boolean; guvenlik?: number };
async function ayarOku(): Promise<Ayar> { const { data } = await db.from('ayarlar').select('trendyol').eq('id', 1).maybeSingle(); return ((data?.trendyol ?? {}) as Ayar); }
async function stokGonder(kaynak: 'otomatik' | 'elle', ayar: Ayar) {
  const guvenlik = Math.max(0, Number(ayar.guvenlik) || 0);
  const { data: ilan, error } = await db.from('ty_urun').select('barkod,baslik,stok,urun_id,satista').not('urun_id', 'is', null);
  if (error) throw new Error(error.message);
  const ids = [...new Set((ilan ?? []).map((x) => x.urun_id as string))]; const stok = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 200) { const { data: u } = await db.from('urunler').select('id,stok,aktif').in('id', ids.slice(i, i + 200)); for (const x of u ?? []) stok.set(x.id as string, x.aktif ? Number(x.stok) || 0 : 0); }
  const degisen = (ilan ?? []).flatMap((x) => {
    // satışa kapatılmış ilanın stoğu Trendyol'da güncellenemez (hata verir); atlanır
    if (!stok.has(x.urun_id as string) || x.satista === false) return [];
    const yeni = Math.min(20000, Math.max(0, Math.floor(stok.get(x.urun_id as string)!) - guvenlik)); const eski = Number(x.stok);
    return yeni === eski ? [] : [{ barkod: x.barkod as string, baslik: x.baslik as string | null, eski: Number.isFinite(eski) ? eski : null, yeni }];
  });
  for (let i = 0; i < degisen.length; i += 1000) {
    const parca = degisen.slice(i, i + 1000);
    const r = await tyPost(`/inventory/sellers/${SATICI}/products/price-and-inventory`, { items: parca.map((x) => ({ barcode: x.barkod, quantity: x.yeni })) });
    const batch = metin(r.batchRequestId);
    await db.from('ty_gonderim').insert(parca.map((x) => ({ ...x, batch_id: batch, kaynak })));
    for (const x of parca) await db.from('ty_urun').update({ stok: x.yeni }).eq('barkod', x.barkod);
  }
  return degisen.length;
}
async function batchKontrol() {
  const { data } = await db.from('ty_gonderim').select('batch_id').eq('durum', 'gonderildi').not('batch_id', 'is', null).gt('zaman', new Date(Date.now() - 2 * 864e5).toISOString()).limit(500);
  for (const id of [...new Set((data ?? []).map((x) => x.batch_id as string))].slice(0, 10)) {
    try {
      const d = await ty(`/product/sellers/${SATICI}/products/batch-requests/${encodeURIComponent(id)}`);
      const items = (d.items ?? []) as Obj[]; if (!items.length && !/COMPLETED/i.test(String(d.status ?? ''))) continue;
      for (const it of items) {
        const bk = metin(((it.requestItem ?? {}) as Obj).barcode ?? it.barcode); if (!bk) continue;
        const ok = /SUCCESS/i.test(String(it.status ?? ''));
        await db.from('ty_gonderim').update({ durum: ok ? 'basarili' : 'hatali', hata: ok ? null : JSON.stringify(it.failureReasons ?? it.status).slice(0, 300) }).eq('batch_id', id).eq('barkod', bk);
      }
      if (!items.length) await db.from('ty_gonderim').update({ durum: 'basarili' }).eq('batch_id', id).eq('durum', 'gonderildi');
    } catch { /* bir sonraki turda tekrar bakılır */ }
  }
}

// ---------- yeni ilan (ürün oluşturma) ----------
type Kat = { id: number; ad: string; yol: string };
async function kategoriler(): Promise<Kat[]> {
  const { data: o } = await db.from('ty_onbellek').select('veri,zaman').eq('anahtar', 'kategoriler').maybeSingle();
  if (o && Date.now() - new Date(o.zaman as string).getTime() < 864e5) return o.veri as Kat[];
  const d = await ty('/product/product-categories');
  const l: Kat[] = [];
  const gez = (x: Obj, yol: string[]) => { const ad = String(x.name ?? ''); const alt = (x.subCategories ?? []) as Obj[]; const y = [...yol, ad];
    if (!alt.length) l.push({ id: Number(x.id), ad, yol: y.join(' > ') }); else for (const a of alt) gez(a, y); };
  for (const x of ((d.categories ?? []) as Obj[])) gez(x, []);
  await db.from('ty_onbellek').upsert({ anahtar: 'kategoriler', veri: l, zaman: new Date().toISOString() });
  return l;
}
const katla = (s: string) => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
async function ozellikler(kategoriId: number) {
  const d = await ty(`/product/categories/${kategoriId}/attributes`);
  const l = ((d.categoryAttributes ?? []) as Obj[]);
  const sonuc = [];
  for (const a of l) {
    const at = (a.attribute ?? {}) as Obj;
    const cevir = (v: Obj) => ({ id: Number(v.id ?? v.attributeValueId ?? v.valueId), ad: String(v.name ?? v.value ?? v.attributeValue ?? v.attributeValueName ?? '') });
    let degerler = ((a.attributeValues ?? a.values ?? []) as Obj[]).map(cevir).filter((x) => Number.isFinite(x.id) && x.ad);
    if (!degerler.length && a.required && !a.allowCustom) {
      try {
        for (let sayfa = 0; sayfa < 12; sayfa++) {
          const v = await ty(`/product/categories/${kategoriId}/attributes/${at.id}/values?page=${sayfa}&size=500`);
          const p = ((v.content ?? v.attributeValues ?? v.values ?? []) as Obj[]); degerler.push(...p.map(cevir).filter((x) => Number.isFinite(x.id) && x.ad));
          const ts = sayi(v.totalPages); if (p.length < 500 || (ts !== null && sayfa + 1 >= ts)) break;
        }
      } catch { /* değer listesi alınamadı */ }
    }
    sonuc.push({ id: Number(at.id), ad: String(at.name ?? ''), zorunlu: !!a.required, serbest: !!a.allowCustom, coklu: !!a.allowMultipleAttributeValues, degerler: degerler.slice(0, 5000) });
  }
  const ilk = ((l.find((a) => ((a.attributeValues ?? []) as Obj[]).length)?.attributeValues ?? []) as Obj[])[0];
  return { kategori: String(d.name ?? ''), ozellikler: sonuc, degerAlanlari: ilk ? Object.keys(ilk) : [] };
}
type YukKalem = { urun_id: string; baslik: string; aciklama: string; fiyat: number; liste_fiyat?: number; stok: number; desi?: number; kategori_id: number; marka_id: number; ozellikler: Obj[]; gorseller?: string[] };
const temizKod = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 40);
async function urunYukle(kalemler: YukKalem[], kullanici: string | null) {
  if (!kalemler.length || kalemler.length > 200) throw new Error('1 ile 200 arası ürün gönderin');
  const ids = kalemler.map((k) => k.urun_id);
  const { data: urunler, error } = await db.from('urunler').select('id,kod,barkod,kdv,aktif,bh_ham').in('id', ids);
  if (error) throw new Error(error.message);
  const um = new Map((urunler ?? []).map((u) => [u.id as string, u]));
  const items: Obj[] = []; const kayit: Obj[] = []; const hatalar: string[] = [];
  for (const k of kalemler) {
    const u = um.get(k.urun_id); if (!u || !u.aktif) { hatalar.push(`${k.baslik}: ürün bulunamadı/pasif`); continue; }
    const barkod = String(u.barkod ?? '').trim(); if (!barkod || !/^[A-Za-z0-9._-]{1,40}$/.test(barkod)) { hatalar.push(`${k.baslik}: geçerli barkod yok`); continue; }
    let gorsel = (k.gorseller ?? []).filter((x) => /^https:\/\//.test(x));
    if (!gorsel.length) { try { const ph = JSON.parse(String(((u.bh_ham ?? {}) as Obj).photo ?? '[]')) as Obj[]; gorsel = ph.map((p) => String(p.PhotoUrlOriginal ?? p.PhotoUrl ?? '')).filter((x) => /^https:\/\//.test(x)); } catch { /* yok */ } }
    if (!gorsel.length) { hatalar.push(`${k.baslik}: görsel yok`); continue; }
    const fiyat = Math.round(Number(k.fiyat) * 100) / 100; if (!(fiyat > 0)) { hatalar.push(`${k.baslik}: fiyat yok`); continue; }
    const item: Obj = {
      barcode: barkod, title: String(k.baslik).slice(0, 100), productMainId: temizKod(String(u.kod ?? barkod)) || barkod,
      brandId: Number(k.marka_id), categoryId: Number(k.kategori_id), quantity: Math.max(0, Math.min(20000, Math.floor(Number(k.stok) || 0))),
      stockCode: String(u.kod ?? barkod).slice(0, 100), dimensionalWeight: Math.max(1, Number(k.desi) || 1), description: String(k.aciklama || k.baslik).slice(0, 30000),
      currencyType: 'TRY', listPrice: Math.max(fiyat, Number(k.liste_fiyat) || 0), salePrice: fiyat, vatRate: Number(u.kdv) || 20,
      images: gorsel.slice(0, 8).map((url) => ({ url })),
      attributes: (k.ozellikler ?? []).map((a) => (a.customAttributeValue !== undefined && a.customAttributeValue !== null && a.customAttributeValue !== '' ? { attributeId: Number(a.attributeId), customAttributeValue: String(a.customAttributeValue) } : { attributeId: Number(a.attributeId), attributeValueId: Number(a.attributeValueId) })),
    };
    items.push(item); kayit.push({ urun_id: u.id, barkod, baslik: item.title, fiyat, stok: item.quantity, kullanici, istek: item });
  }
  if (!items.length) return { gonderilen: 0, hatalar };
  const r = await tyPost(`/product/sellers/${SATICI}/v2/products`, { items });
  const batch = metin(r.batchRequestId);
  await db.from('ty_yukleme').insert(kayit.map((x) => ({ ...x, batch_id: batch })));
  return { gonderilen: items.length, hatalar, batch };
}
async function yuklemeKontrol() {
  const { data } = await db.from('ty_yukleme').select('batch_id').eq('durum', 'gonderildi').not('batch_id', 'is', null).gt('zaman', new Date(Date.now() - 7 * 864e5).toISOString()).limit(200);
  for (const id of [...new Set((data ?? []).map((x) => x.batch_id as string))].slice(0, 10)) {
    try {
      const d = await ty(`/product/sellers/${SATICI}/products/batch-requests/${encodeURIComponent(id)}`);
      const items = (d.items ?? []) as Obj[]; if (!/COMPLETED/i.test(String(d.status ?? '')) && !items.some((i) => /SUCCESS|FAILED/i.test(String(i.status ?? '')))) continue;
      for (const it of items) {
        const bk = metin(((it.requestItem ?? {}) as Obj).barcode ?? (((it.requestItem ?? {}) as Obj).product as Obj | undefined)?.barcode ?? it.barcode); if (!bk) continue;
        const ok = /SUCCESS/i.test(String(it.status ?? ''));
        await db.from('ty_yukleme').update({ durum: ok ? 'basarili' : 'hatali', hata: ok ? null : JSON.stringify(it.failureReasons ?? it.status).slice(0, 500) }).eq('batch_id', id).eq('barkod', bk);
      }
    } catch { /* sonra tekrar */ }
  }
}

// ---------- otomatik yükleme ----------
// Ayarlarda "otomatik yükleme" açıksa her turda, kategori+marka eşleşmesi hazır, stoklu, barkodlu, görselli ürünlerden
// günlük sınıra kadar yeni ilan açar. Eksik bilgisi olan ürün atlanır ve nedeni ty_oto_atla'ya yazılır (7 gün sonra tekrar denenir).
type OtoAyar = Ayar & { fiyat_gonder?: boolean; oto_yukle?: boolean; oto_limit?: number; oto_duzenli?: boolean; komisyon?: number; kargo?: number; hizmet?: number; stopaj?: number; hedef_marj?: number };
type Oz = { id: number; ad: string; zorunlu: boolean; serbest: boolean; degerler: { id: number; ad: string }[] };
const ARAC_ID = 370;
const urunOzel = (o: { id: number; ad: string }) => o.id === ARAC_ID || /motor|araç|arac/i.test(o.ad);
async function ozellikOnbellek(kategoriId: number): Promise<Oz[]> {
  const anahtar = `oz:${kategoriId}`;
  const { data: o } = await db.from('ty_onbellek').select('veri,zaman').eq('anahtar', anahtar).maybeSingle();
  if (o && Date.now() - new Date(o.zaman as string).getTime() < 7 * 864e5) return o.veri as Oz[];
  const r = await ozellikler(kategoriId);
  await db.from('ty_onbellek').upsert({ anahtar, veri: r.ozellikler, zaman: new Date().toISOString() });
  return r.ozellikler as Oz[];
}
function aracBul(ad: string, o: Oz) {
  const metin = ` ${katla(ad).replace(/[^a-z0-9]+/g, ' ')} `; let enIyi: { d: { id: number; ad: string }; i: number } | null = null;
  for (const d of o.degerler) {
    const model = katla(d.ad).split(/\s+/).slice(1).join(' ').replace(/[^a-z0-9]+/g, ' ').trim(); if (model.length < 3 || model === 'universal') continue;
    const i = metin.indexOf(` ${model} `); if (i >= 0 && (!enIyi || i < enIyi.i || (i === enIyi.i && d.ad.length > enIyi.d.ad.length))) enIyi = { d, i };
  }
  return enIyi?.d ?? o.degerler.find((d) => katla(d.ad) === 'universal') ?? null;
}
function ozBul(ad: string, o: Oz) {
  if (o.id === ARAC_ID) return aracBul(ad, o);
  if (/hac[iı]?m/i.test(o.ad)) { const m = ad.match(/(^|[^0-9])([0-6])[.,]([0-9])(?![0-9])/); return m ? o.degerler.find((x) => x.ad.startsWith(`${m[2]}.${m[3]}L`)) ?? null : null; }
  if (/teknoloji/i.test(o.ad)) { const k = katla(ad); return [...o.degerler].sort((a, b) => b.ad.length - a.ad.length).find((d) => { const x = katla(d.ad); return x.length >= 3 && new RegExp(`(^|[^a-z])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(k); }) ?? null; }
  return null;
}
function hedefFiyat(alisNet: number, kdv: number, a: OtoAyar, komisyon: number) {
  const marj = a.hedef_marj ?? 15, stopaj = a.stopaj ?? 1, kargo = a.kargo ?? 100, hizmet = a.hizmet ?? 0;
  const pay = (1 - marj / 100) / (1 + kdv / 100) - komisyon / 100 / 1.2 - stopaj / 100;
  if (!(alisNet > 0) || pay <= 0) return null;
  return Math.ceil((alisNet + (kargo + hizmet) / 1.2) / pay) - 0.1;
}
/** Eşleşmemiş markaları Trendyol'da birebir aynı adla arar; tam eşleşen varsa kaydeder (yanlış marka riskini almamak için yalnız tam ad) */
async function markaOgren(n = 6) {
  const { data } = await db.rpc('ty_eslesmemis', { n: 40 });
  const { data: denenen } = await db.from('ty_onbellek').select('veri').eq('anahtar', 'marka_denenen').maybeSingle();
  const dn = new Set((denenen?.veri ?? []) as string[]); let ogrenilen = 0, bakilan = 0;
  for (const m of ((data ?? []) as { tur: string; ad: string }[]).filter((x) => x.tur === 'marka' && !dn.has(x.ad))) {
    if (bakilan++ >= n) break; dn.add(m.ad);
    try {
      const d = await ty(`/product/brands/by-name?name=${encodeURIComponent(m.ad)}`) as unknown;
      const l = (Array.isArray(d) ? d : ((d as Obj).brands ?? (d as Obj).content ?? [])) as Obj[];
      const tam = l.find((x) => katla(String(x.name ?? '')).replace(/[^a-z0-9]/g, '') === katla(m.ad).replace(/[^a-z0-9]/g, ''));
      if (tam) { await db.from('ty_marka_esleme').upsert({ bh_marka: m.ad, ty_marka_id: Number(tam.id), ty_marka_ad: String(tam.name), guncelleme: new Date().toISOString() }); ogrenilen++; }
    } catch { /* sonra */ }
    await bekle(300);
  }
  await db.from('ty_onbellek').upsert({ anahtar: 'marka_denenen', veri: [...dn], zaman: new Date().toISOString() });
  return ogrenilen;
}
async function otoYukle(a: OtoAyar, adet?: number) {
  const limit = Math.max(1, Math.min(200, Number(a.oto_limit) || 30));
  const gun = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10); // İstanbul günü
  const { count } = await db.from('ty_yukleme').select('id', { count: 'exact', head: true }).eq('kullanici', 'otomatik').gte('zaman', new Date(`${gun}T00:00:00+03:00`).toISOString());
  const kalan = limit - (count ?? 0);
  const markaYeni = await markaOgren();
  if (kalan <= 0) return { gonderilen: 0, atlanan: 0, markaYeni, not: 'günlük sınır doldu' };
  const n = Math.min(kalan, adet ?? 10);
  const { data: aday, error } = await db.rpc('ty_oto_adaylar', { n: n * 3, duzenli: a.oto_duzenli !== false });
  if (error) throw new Error(error.message);
  const l = (aday ?? []) as Obj[]; if (!l.length) return { gonderilen: 0, atlanan: 0, markaYeni };
  const ids = l.map((x) => x.id as string);
  const { data: ay } = await db.from('ayarlar').select('alis_kdv_haric').eq('id', 1).maybeSingle();
  const kdvHaric = ay?.alis_kdv_haric !== false;
  const sonAlis = new Map<string, number>();
  const { data: h } = await db.from('hareketler').select('urun_id,alis_fiyati,tarih').eq('tur', 'alis').in('urun_id', ids).order('tarih', { ascending: false }).limit(2000);
  for (const x of h ?? []) if (!sonAlis.has(x.urun_id as string) && Number(x.alis_fiyati) > 0) sonAlis.set(x.urun_id as string, Number(x.alis_fiyati));
  const { data: kd } = await db.from('urun_kodlari').select('urun_id,kod,tur').in('urun_id', ids).neq('tur', 'OTOMARMARA');
  const { data: kom } = await db.from('ty_urun').select('kategori_id,komisyon').not('komisyon', 'is', null);
  const komKat = new Map((kom ?? []).map((x) => [Number(x.kategori_id), Number(x.komisyon)]));
  const kalemler: YukKalem[] = []; const atla: { urun_id: string; neden: string }[] = [];
  for (const u of l) {
    if (kalemler.length >= n) break;
    const id = u.id as string; const ad = String(u.ad ?? ''); const kat = Number(u.ty_kategori_id); const kdv = Number(u.kdv) || 20;
    try {
      const ozs = await ozellikOnbellek(kat);
      const katOz = ((u.kat_ozellikler ?? []) as Obj[]).filter((x) => Number(x.attributeId) !== ARAC_ID);
      const ozel = ozs.filter((o) => urunOzel(o) && !o.serbest && o.degerler.length && (o.zorunlu || o.id === ARAC_ID));
      const ozelIds = new Set(ozel.map((o) => o.id));
      const sec = ozel.map((o) => ({ o, d: ozBul(ad, o) }));
      const oz: Obj[] = [...katOz.filter((x) => !ozelIds.has(Number(x.attributeId))), ...sec.filter((x) => x.d).map((x) => ({ attributeId: x.o.id, attributeValueId: x.d!.id }))];
      const verilen = new Set(oz.map((x) => Number(x.attributeId)));
      const eksik = ozs.filter((o) => o.zorunlu && !verilen.has(o.id)).map((o) => o.ad);
      if (eksik.length) { atla.push({ urun_id: id, neden: `Seçilemeyen zorunlu özellik: ${eksik.join(', ')}` }); continue; }
      const alis = Number(u.alis_fiyati) || 0; const net = kdvHaric ? alis : alis / (1 + kdv / 100);
      const maliyet = Math.max(net, sonAlis.get(id) ?? 0);
      const komisyon = komKat.get(kat) ?? Number(a.komisyon ?? 20);
      const fiyat = hedefFiyat(maliyet, kdv, a, komisyon);
      if (!fiyat) { atla.push({ urun_id: id, neden: 'Fiyat hesaplanamadı' }); continue; }
      const arac = sec.find((x) => x.o.id === ARAC_ID)?.d;
      const kodlar = (kd ?? []).filter((k) => k.urun_id === id).map((k) => String(k.kod));
      const oem = [u.etiket as string | null, ...kodlar].filter(Boolean).join(', ');
      const marka = metin(u.marka);
      kalemler.push({
        urun_id: id, baslik: `${marka ? marka + ' ' : ''}${ad}`.slice(0, 100), fiyat,
        aciklama: [ad, marka && `Marka: ${marka}`, u.kod && `Stok kodu: ${u.kod}`, oem && `OEM / muadil kodları: ${oem}`, arac && `Uyumlu araç: ${arac.ad}`].filter(Boolean).join('\n'),
        stok: Math.max(0, Math.floor(Number(u.stok) || 0) - Math.max(0, Number(a.guvenlik) || 0)), desi: Number(u.desi) || 1,
        kategori_id: kat, marka_id: Number(u.ty_marka_id), ozellikler: oz,
      });
    } catch (e) { atla.push({ urun_id: id, neden: `Kategori özellikleri okunamadı: ${(e as Error).message.slice(0, 120)}` }); }
  }
  const sifir = kalemler.filter((k) => k.stok < 1);
  for (const k of sifir) atla.push({ urun_id: k.urun_id, neden: 'Güvenlik stoğu düşülünce stok kalmıyor' });
  const gonder = kalemler.filter((k) => k.stok >= 1);
  if (atla.length) await db.from('ty_oto_atla').upsert(atla.map((x) => ({ ...x, zaman: new Date().toISOString() })));
  const r = gonder.length ? await urunYukle(gonder, 'otomatik') : { gonderilen: 0, hatalar: [] as string[] };
  return { gonderilen: r.gonderilen, atlanan: atla.length, hatalar: r.hatalar, markaYeni };
}

// ---------- fiyat güncelleme ----------
// Trendyol fiyatı kâr hedefinin altında kalan (veya zararına) ilanların fiyatını hedef fiyata YÜKSELTİR; hedefin üstündekilere dokunmaz.
// Güvenlik: hedef, mevcut fiyatın 2,5 katından fazlaysa (alış fiyatı hatalı olabilir) gönderilmez, listede gösterilir.
// Aynı ilana 24 saatte 3'ten fazla fiyat gönderilmişse başka bir sistem (ör. BizimHesap) fiyatı geri çekiyor demektir: durdurulur.
async function fiyatGonder(kaynak: 'otomatik' | 'elle', a: OtoAyar) {
  const { data: ilan, error } = await db.from('ty_urun').select('barkod,baslik,stok,urun_id,satista,satis_fiyati,liste_fiyati,komisyon,kdv').not('urun_id', 'is', null);
  if (error) throw new Error(error.message);
  const l = (ilan ?? []).filter((x) => x.satista !== false && Number(x.satis_fiyati) > 0);
  const ids = [...new Set(l.map((x) => x.urun_id as string))];
  const um = new Map<string, Obj>(); const sonAlis = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 200) {
    const parca = ids.slice(i, i + 200);
    const { data: u } = await db.from('urunler').select('id,alis_fiyati,kdv,aktif').in('id', parca); for (const x of u ?? []) um.set(x.id as string, x);
    const { data: h } = await db.from('hareketler').select('urun_id,alis_fiyati,tarih').eq('tur', 'alis').in('urun_id', parca).order('tarih', { ascending: false }).limit(5000);
    for (const x of h ?? []) if (!sonAlis.has(x.urun_id as string) && Number(x.alis_fiyati) > 0) sonAlis.set(x.urun_id as string, Number(x.alis_fiyati));
  }
  const { data: ay } = await db.from('ayarlar').select('alis_kdv_haric').eq('id', 1).maybeSingle(); const kdvHaric = ay?.alis_kdv_haric !== false;
  const { data: gecmis } = await db.from('ty_gonderim').select('barkod').eq('tur', 'fiyat').gt('zaman', new Date(Date.now() - 864e5).toISOString());
  const sayac = new Map<string, number>(); for (const g of gecmis ?? []) sayac.set(g.barkod as string, (sayac.get(g.barkod as string) ?? 0) + 1);
  const gonder: { barkod: string; baslik: string | null; stok: number | null; eski: number; yeni: number; liste: number }[] = []; const supheli: Obj[] = [];
  for (const t of l) {
    const u = um.get(t.urun_id as string); if (!u || !u.aktif) continue;
    const kdv = Number(u.kdv) || Number(t.kdv) || 20; const alis = Number(u.alis_fiyati) || 0;
    const maliyet = Math.max(kdvHaric ? alis : alis / (1 + kdv / 100), sonAlis.get(u.id as string) ?? 0);
    const kom = Number(t.komisyon) > 0 && Number(t.komisyon) <= 60 ? Number(t.komisyon) : Number(a.komisyon ?? 20);
    const hedef = hedefFiyat(maliyet, kdv, a, kom); const eski = Number(t.satis_fiyati);
    if (!hedef || hedef <= eski + 0.5) continue;
    if (hedef > eski * 2.5) { supheli.push({ barkod: t.barkod, baslik: t.baslik, eski, hedef, neden: 'Hedef fiyat mevcut fiyatın 2,5 katından fazla — alış fiyatını kontrol edin' }); continue; }
    if ((sayac.get(t.barkod as string) ?? 0) >= 3) { supheli.push({ barkod: t.barkod, baslik: t.baslik, eski, hedef, neden: 'Fiyat 24 saatte 3 kez gönderildi ama geri düşüyor — başka bir sistem (BizimHesap E-Ticaret?) fiyatı değiştiriyor olabilir' }); continue; }
    gonder.push({ barkod: t.barkod as string, baslik: t.baslik as string | null, stok: sayi(t.stok), eski, yeni: hedef, liste: Math.max(hedef, Number(t.liste_fiyati) || 0) });
  }
  for (let i = 0; i < gonder.length; i += 1000) {
    const parca = gonder.slice(i, i + 1000);
    const r = await tyPost(`/inventory/sellers/${SATICI}/products/price-and-inventory`, { items: parca.map((x) => ({ barcode: x.barkod, ...(x.stok !== null ? { quantity: Math.max(0, Math.floor(x.stok)) } : {}), salePrice: x.yeni, listPrice: x.liste })) });
    const batch = metin(r.batchRequestId);
    await db.from('ty_gonderim').insert(parca.map((x) => ({ barkod: x.barkod, baslik: x.baslik, eski: x.stok, yeni: x.stok, fiyat_eski: x.eski, fiyat_yeni: x.yeni, tur: 'fiyat', batch_id: batch, kaynak })));
    for (const x of parca) await db.from('ty_urun').update({ satis_fiyati: x.yeni, liste_fiyati: x.liste }).eq('barkod', x.barkod);
  }
  await db.from('ty_onbellek').upsert({ anahtar: 'fiyat_supheli', veri: supheli, zaman: new Date().toISOString() });
  return { gonderilen: gonder.length, supheli: supheli.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  // zamanlayıcı: veritabanındaki gizli anahtarı başlıkta gönderir (anon anahtar herkese açık olduğu için tek başına yetmez)
  const zh = req.headers.get('x-zamanlayici');
  let zamanlayici = jwt === SERVIS;
  if (!zamanlayici && zh) { const { data: g } = await db.from('ty_gizli').select('anahtar').eq('id', 1).maybeSingle(); zamanlayici = !!g?.anahtar && g.anahtar === zh; }
  if (!zamanlayici) { const { data: k } = await db.auth.getUser(jwt); if (!k?.user) return yanit({ ok: false, hata: 'Giriş gerekli' }, 401); }
  if (!SATICI || !KEY || !SECRET) {
    const eksik = [!SATICI && 'TRENDYOL_SATICI_ID', !KEY && 'TRENDYOL_API_KEY', !SECRET && 'TRENDYOL_API_SECRET'].filter(Boolean).join(', ');
    await db.from('ty_durum').update({ son_hata: `Trendyol bilgileri eksik: ${eksik}` }).eq('id', 1);
    return yanit({ ok: false, hata: `Supabase > Edge Functions > Secrets'e girilmemiş: ${eksik}` });
  }
  const b = await req.json().catch(() => ({})) as Obj;
  const islem = String(b.islem ?? 'esitle');

  if (['stok_gonder', 'urun_yukle', 'esleme_kaydet', 'oto_yukle', 'fiyat_gonder'].includes(islem) && zamanlayici) return yanit({ ok: false, hata: 'Bu işlem yalnız siteden yapılır' }, 403);

  try {
    if (islem === 'kategori_ara') {
      const q = katla(String(b.q ?? '').trim()); const l = await kategoriler(); if (q.length < 2) return yanit({ ok: true, sonuclar: [] });
      const kel = q.split(/\s+/).filter(Boolean);
      return yanit({ ok: true, sonuclar: l.filter((k) => { const y = katla(k.yol); return kel.every((w) => y.includes(w)); }).sort((a, x) => Number(katla(x.ad).includes(q)) - Number(katla(a.ad).includes(q)) || a.yol.length - x.yol.length).slice(0, 40) });
    }
    if (islem === 'ozellikler') return yanit({ ok: true, ...(await ozellikler(Number(b.kategoriId))) });
    if (islem === 'marka_ara') {
      const q = String(b.q ?? '').trim(); if (q.length < 2) return yanit({ ok: true, sonuclar: [] });
      const d = await ty(`/product/brands/by-name?name=${encodeURIComponent(q)}`) as unknown;
      const l = (Array.isArray(d) ? d : ((d as Obj).brands ?? (d as Obj).content ?? [])) as Obj[];
      return yanit({ ok: true, sonuclar: l.slice(0, 30).map((x) => ({ id: Number(x.id), ad: String(x.name ?? '') })) });
    }
    if (islem === 'esleme_kaydet') {
      if (b.tur === 'kategori') { const { error } = await db.from('ty_kategori_esleme').upsert({ bh_kategori: String(b.bh), ty_kategori_id: Number(b.id), ty_kategori_ad: metin(b.ad), ozellikler: b.ozellikler ?? [], desi: sayi(b.desi), guncelleme: new Date().toISOString() }); if (error) throw new Error(error.message); }
      else { const { error } = await db.from('ty_marka_esleme').upsert({ bh_marka: String(b.bh), ty_marka_id: Number(b.id), ty_marka_ad: metin(b.ad), guncelleme: new Date().toISOString() }); if (error) throw new Error(error.message); }
      return yanit({ ok: true });
    }
    if (islem === 'fiyat_gonder') return yanit({ ok: true, ...(await fiyatGonder('elle', await ayarOku() as OtoAyar)) });
    if (islem === 'oto_yukle') {
      // siteden "şimdi çalıştır": ayar kapalı olsa da kullanıcının isteğiyle bir tur çalışır
      return yanit({ ok: true, ...(await otoYukle(await ayarOku() as OtoAyar, Math.min(30, Number(b.adet) || 10))) });
    }
    if (islem === 'urun_yukle') {
      const { data: k } = await db.auth.getUser(jwt);
      return yanit({ ok: true, ...(await urunYukle((b.kalemler ?? []) as YukKalem[], k?.user?.email ?? null)) });
    }
  } catch (e) { return yanit({ ok: false, hata: (e as Error).message.slice(0, 500) }); }

  if (islem === 'test') {
    try { const d = await ty(`/product/sellers/${SATICI}/products/approved?page=0&size=1`); return yanit({ ok: true, ilanSayisi: sayi(d.totalElements), anahtarlar: Object.keys(d) }); }
    catch (e) { return yanit({ ok: false, hata: (e as Error).message }); }
  }

  // aynı anda iki eşitleme çalışmasın
  const simdi = new Date();
  const { data: kilit } = await db.from('ty_durum').update({ kilit: simdi.toISOString() }).eq('id', 1)
    .or(`kilit.is.null,kilit.lt.${new Date(simdi.getTime() - 5 * 60000).toISOString()}`).select('son_urun');
  if (!kilit?.length) return yanit({ ok: true, atlandi: 'önceki eşitleme sürüyor' });
  try {
    const sonUrun = kilit[0].son_urun ? new Date(kilit[0].son_urun as string).getTime() : 0;
    const ayar = await ayarOku();
    const gonder = islem === 'stok_gonder' || (islem === 'esitle' && ayar.stok_gonder === true);
    // stok gönderilecekse Trendyol'daki güncel stok her turda okunur
    const ilanZamani = gonder || b.ilan === true || Date.now() - sonUrun > URUN_ARALIK_DK * 60000;
    const s = islem === 'stok_gonder' ? { siparis: 0, ornek: null } : await siparisleriCek(Number(b.gun) > 0 ? Math.min(30, Number(b.gun)) : SIPARIS_GUN);
    const u = ilanZamani ? await ilanlariCek() : null;
    await batchKontrol();
    await yuklemeKontrol();
    const gonderilen = gonder && u ? await stokGonder(islem === 'stok_gonder' ? 'elle' : 'otomatik', ayar) : 0;
    // fiyat güncelleme: ayardan açıksa, ilanlar taze okunduğu turlarda
    let fiyat: Obj | null = null;
    if (islem === 'esitle' && u && (ayar as OtoAyar).fiyat_gonder === true) { try { fiyat = await fiyatGonder('otomatik', ayar as OtoAyar); } catch (e) { fiyat = { hata: (e as Error).message.slice(0, 300) }; } }
    // otomatik yükleme: ayardan açıksa zamanlayıcı turlarında (hata olursa eşitleme durmaz)
    let oto: Obj | null = null;
    if (islem === 'esitle' && (ayar as OtoAyar).oto_yukle === true) { try { oto = await otoYukle(ayar as OtoAyar); } catch (e) { oto = { hata: (e as Error).message.slice(0, 300) }; } }
    const { count: sipSay } = await db.from('ty_siparis').select('paket_id', { count: 'exact', head: true });
    await db.from('ty_durum').update({
      ...(islem === 'stok_gonder' ? {} : { son_siparis: new Date().toISOString() }), son_hata: null, siparis_sayisi: sipSay ?? null, kilit: null,
      ...(u ? { son_urun: new Date().toISOString(), urun_sayisi: u.ilan, ornek: { ilan: u.ornek, siparis: s.ornek } } : {}),
    }).eq('id', 1);
    return yanit({ ok: true, siparis: s.siparis, ilan: u?.ilan ?? null, eslesen: u?.eslesen ?? null, stokGonderilen: gonderilen, fiyat, oto });
  } catch (e) {
    const mesaj = (e as Error).message.slice(0, 600);
    await db.from('ty_durum').update({ son_hata: mesaj, kilit: null }).eq('id', 1);
    return yanit({ ok: false, hata: mesaj }, 500);
  }
});
