// Trendyol entegrasyonu (Supabase Edge Function) — ŞİMDİLİK YALNIZ OKUR: onaylı ilanlar ve sipariş paketleri.
// Trendyol'a stok/fiyat/ürün YAZMAZ (BizimHesap E-Ticaret modülü gönderiyor; çakışmasın).
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
    const l = (d.content ?? d.items ?? []) as Obj[]; if (sayfa === 0) ornek = { anahtarlar: Object.keys(d), ilk: l[0] ?? null };
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
  const bit = Date.now(); const bas = bit - gun * 864e5; const hepsi: ReturnType<typeof paketSatiri>[] = []; let ornek: unknown = null;
  for (let sayfa = 0; sayfa < 50; sayfa++) {
    const d = await ty(`/order/sellers/${SATICI}/v2/orders?startDate=${bas}&endDate=${bit}&page=${sayfa}&size=200&orderByField=PackageLastModifiedDate&orderByDirection=DESC`);
    const l = (d.content ?? []) as Obj[]; if (sayfa === 0) ornek = { anahtarlar: Object.keys(d), ilk: l[0] ? { ...l[0], shipmentAddress: undefined, invoiceAddress: undefined, customerFirstName: undefined, customerLastName: undefined, customerEmail: undefined } : null };
    hepsi.push(...l.map(paketSatiri).filter((x) => x.paket_id && x.paket_id !== 'undefined'));
    const toplamSayfa = sayi(d.totalPages); if (!l.length || (toplamSayfa !== null && sayfa + 1 >= toplamSayfa)) break;
    await bekle(250);
  }
  for (let i = 0; i < hepsi.length; i += 500) { const { error } = await db.from('ty_siparis').upsert(hepsi.slice(i, i + 500)); if (error) throw new Error('ty_siparis: ' + error.message); }
  return { siparis: hepsi.length, ornek };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const zamanlayici = jwt === SERVIS;
  if (!zamanlayici) { const { data: k } = await db.auth.getUser(jwt); if (!k?.user) return yanit({ ok: false, hata: 'Giriş gerekli' }, 401); }
  if (!SATICI || !KEY || !SECRET) {
    const eksik = [!SATICI && 'TRENDYOL_SATICI_ID', !KEY && 'TRENDYOL_API_KEY', !SECRET && 'TRENDYOL_API_SECRET'].filter(Boolean).join(', ');
    await db.from('ty_durum').update({ son_hata: `Trendyol bilgileri eksik: ${eksik}` }).eq('id', 1);
    return yanit({ ok: false, hata: `Supabase > Edge Functions > Secrets'e girilmemiş: ${eksik}` });
  }
  const b = await req.json().catch(() => ({})) as Obj;
  const islem = String(b.islem ?? 'esitle');

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
    const ilanZamani = b.ilan === true || Date.now() - sonUrun > URUN_ARALIK_DK * 60000;
    const s = await siparisleriCek(Number(b.gun) > 0 ? Math.min(14, Number(b.gun)) : SIPARIS_GUN);
    const u = ilanZamani ? await ilanlariCek() : null;
    const { count: sipSay } = await db.from('ty_siparis').select('paket_id', { count: 'exact', head: true });
    await db.from('ty_durum').update({
      son_siparis: new Date().toISOString(), son_hata: null, siparis_sayisi: sipSay ?? null, kilit: null,
      ...(u ? { son_urun: new Date().toISOString(), urun_sayisi: u.ilan, ornek: { ilan: u.ornek, siparis: s.ornek } } : {}),
    }).eq('id', 1);
    return yanit({ ok: true, siparis: s.siparis, ilan: u?.ilan ?? null, eslesen: u?.eslesen ?? null });
  } catch (e) {
    const mesaj = (e as Error).message.slice(0, 600);
    await db.from('ty_durum').update({ son_hata: mesaj, kilit: null }).eq('id', 1);
    return yanit({ ok: false, hata: mesaj }, 500);
  }
});
