// Trendyol entegrasyonu (Supabase Edge Function): onaylı ilanları ve sipariş paketlerini OKUR.
// YAZDIĞI TEK ŞEY: ayarlarda "stok gönderimi" açıksa eşleşen ilanların STOK adedi (iki deponun toplamı − güvenlik stoğu).
// Fiyat ve ürün içeriği yazmaz. Her gönderim ty_gonderim tablosuna kaydedilir.
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
  const { data: ilan, error } = await db.from('ty_urun').select('barkod,baslik,stok,urun_id').not('urun_id', 'is', null);
  if (error) throw new Error(error.message);
  const ids = [...new Set((ilan ?? []).map((x) => x.urun_id as string))]; const stok = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 200) { const { data: u } = await db.from('urunler').select('id,stok,aktif').in('id', ids.slice(i, i + 200)); for (const x of u ?? []) stok.set(x.id as string, x.aktif ? Number(x.stok) || 0 : 0); }
  const degisen = (ilan ?? []).flatMap((x) => {
    if (!stok.has(x.urun_id as string)) return [];
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

  if (islem === 'stok_gonder' && zamanlayici) return yanit({ ok: false, hata: 'Elle gönderim yalnız siteden yapılır' }, 403);

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
    const gonderilen = gonder && u ? await stokGonder(islem === 'stok_gonder' ? 'elle' : 'otomatik', ayar) : 0;
    const { count: sipSay } = await db.from('ty_siparis').select('paket_id', { count: 'exact', head: true });
    await db.from('ty_durum').update({
      ...(islem === 'stok_gonder' ? {} : { son_siparis: new Date().toISOString() }), son_hata: null, siparis_sayisi: sipSay ?? null, kilit: null,
      ...(u ? { son_urun: new Date().toISOString(), urun_sayisi: u.ilan, ornek: { ilan: u.ornek, siparis: s.ornek } } : {}),
    }).eq('id', 1);
    return yanit({ ok: true, siparis: s.siparis, ilan: u?.ilan ?? null, eslesen: u?.eslesen ?? null, stokGonderilen: gonderilen });
  } catch (e) {
    const mesaj = (e as Error).message.slice(0, 600);
    await db.from('ty_durum').update({ son_hata: mesaj, kilit: null }).eq('id', 1);
    return yanit({ ok: false, hata: mesaj }, 500);
  }
});
