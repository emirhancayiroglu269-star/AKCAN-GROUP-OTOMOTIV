// BizimHesap eşitleme servisi (Supabase Edge Function) — yalnızca OKUR, BizimHesap'a hiçbir şey yazmaz.
// Depoları, ürünleri (fiyat + toplam stok), depo stoklarını, müşteri ve tedarikçi bakiyelerini çeker.
// Stok ve bakiye değişimleri veritabanında hareket olarak kaydedilir (bh_urunleri_yaz, bh_carileri_yaz).
// Gizli değer (Supabase > Edge Functions > Secrets): BH_TOKEN
import { createClient } from 'npm:@supabase/supabase-js@2';

const BASE = 'https://bizimhesap.com/api/b2b';
const BH_KEY = 'BZMHB2B724018943908D0B82491F203F'; // BizimHesap dokümanındaki sabit B2B anahtarı
const TOKEN = Deno.env.get('BH_TOKEN') ?? '';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

type Obj = Record<string, unknown>;

// ---------- Yardımcılar ----------
async function bh(path: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Key: BH_KEY, Token: TOKEN, 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await r.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* düz metin */ }
  if (!r.ok) throw new Error(`BizimHesap ${path} → HTTP ${r.status}: ${text.slice(0, 300)}`);
  return body;
}

/** Yanıt içindeki ilk diziyi bulur ({data:[...]}, {result:{products:[...]}} vb.) */
function diziBul(v: unknown, derinlik = 0): Obj[] {
  if (Array.isArray(v)) return v as Obj[];
  if (v && typeof v === 'object' && derinlik < 4) {
    for (const x of Object.values(v as Obj)) { const d = diziBul(x, derinlik + 1); if (d.length) return d; }
  }
  return [];
}

/** Büyük/küçük harf duyarsız alan okuma; ilk dolu adayı döndürür */
function al(o: Obj, ...adaylar: string[]): unknown {
  const m = new Map(Object.keys(o).map((k) => [k.toLowerCase(), k]));
  for (const a of adaylar) { const k = m.get(a.toLowerCase()); if (k !== undefined && o[k] !== null && o[k] !== '') return o[k]; }
  return undefined;
}
const metin = (v: unknown) => (v === undefined || v === null ? null : String(v).trim() || null);
const sayi = (v: unknown) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : null;
};
const parca = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
async function ozet(veri: unknown): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(veri)));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
}
async function rpc(fn: string, args: Obj) { const { data, error } = await db.rpc(fn, args); if (error) throw new Error(`${fn}: ${error.message}`); return data; }

// ---------- Çekme ----------
async function cek() {
  const ornek: Obj = {};
  const iz: unknown[] = []; // değişiklik algılama: fiyat, stok, depo stoğu, bakiye

  const depoHam = diziBul(await bh('/warehouses'));
  ornek.depolar = depoHam.slice(0, 3);
  const depolar = depoHam.map((d) => ({
    bh_id: metin(al(d, 'id', 'warehouseId', 'guid')),
    ad: metin(al(d, 'title', 'name', 'warehouseName')) ?? 'Depo',
  })).filter((d) => d.bh_id);
  await rpc('bh_depolari_yaz', { p: depolar });

  // Ürünler: fiyatlar + BizimHesap'ın toplam stoğu (stok değişimi = satış/alış hareketi)
  const urunHam = diziBul(await bh('/products'));
  ornek.urunler = urunHam.slice(0, 2);
  const urunler = urunHam.map((u) => ({
    bh_id: metin(al(u, 'id', 'productId', 'guid')),
    ad: metin(al(u, 'title', 'name', 'productName')),
    kod: metin(al(u, 'code', 'productCode', 'stockCode')),
    barkod: metin(al(u, 'barcode', 'ean')),
    marka: metin(al(u, 'brand', 'brandName')),
    kategori: metin(al(u, 'category', 'categoryName')),
    birim: metin(al(u, 'unit', 'unitName')),
    alis_fiyati: sayi(al(u, 'buyingPrice', 'purchasePrice', 'cost')),
    satis_fiyati: sayi(al(u, 'price', 'salePrice', 'sellingPrice')),
    kdv: sayi(al(u, 'tax', 'taxRate', 'vat')),
    stok: sayi(al(u, 'quantity', 'qty', 'stock')),
    ham: u,
  })).filter((u) => u.bh_id);
  iz.push(urunler.map((u) => [u.bh_id, u.alis_fiyati, u.satis_fiyati, u.stok, u.ad, u.kod]).sort()); // API sırası değişebilir: sırala
  let degisen = 0;
  for (const p of parca(urunler, 400)) degisen += Number(await rpc('bh_urunleri_yaz', { p })) || 0;

  // Depo stokları (her depo tek seferde: listede olmayanlar 0 yapılır)
  let stokSatiri = 0;
  for (const d of depolar) {
    const ham = diziBul(await bh(`/inventory/${encodeURIComponent(d.bh_id!)}`));
    if (!ornek.stok) ornek.stok = ham.slice(0, 2);
    const satirlar = ham.map((s) => ({
      urun_bh_id: metin(al(s, 'productId', 'id', 'guid')),
      miktar: sayi(al(s, 'quantity', 'qty', 'stock', 'amount')) ?? 0,
    })).filter((s) => s.urun_bh_id);
    stokSatiri += satirlar.length;
    iz.push(d.bh_id, satirlar.map((s) => [s.urun_bh_id, s.miktar]).sort());
    await rpc('bh_depo_stogu_yaz', { p_depo_bh: d.bh_id, p: satirlar });
  }

  // Müşteri ve tedarikçi bakiyeleri (hata verirse stok eşitlemesini bozmasın)
  let cari = 0; let cariHata: string | null = null;
  try {
    for (const [yol, tur] of [['/customers', 'musteri'], ['/suppliers', 'tedarikci']] as const) {
      const ham = diziBul(await bh(yol));
      const satirlar = ham.map((c) => ({
        bh_id: metin(al(c, 'id', 'guid')), tur,
        ad: metin(al(c, 'title', 'name')), kod: metin(al(c, 'code')), telefon: metin(al(c, 'phone', 'gsm')),
        eposta: metin(al(c, 'email')), vergi_no: metin(al(c, 'taxno', 'taxNo')), vergi_dairesi: metin(al(c, 'taxoffice', 'taxOffice')),
        adres: metin(al(c, 'address')), bakiye: sayi(al(c, 'balance')) ?? 0, cek_senet: sayi(al(c, 'chequeandbond')) ?? 0,
      })).filter((c) => c.bh_id);
      cari += satirlar.length;
      iz.push(satirlar.map((c) => [c.bh_id, c.bakiye, c.cek_senet]).sort());
      for (const p of parca(satirlar, 500)) await rpc('bh_carileri_yaz', { p });
    }
  } catch (e) { cariHata = (e as Error).message.slice(0, 300); }

  return { depo: depolar.length, urun: urunler.length, degisen, stokSatiri, cari, cariHata, ornek, parmak: await ozet(iz) };
}

// ---------- Giriş noktası ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (!TOKEN) {
    await db.from('bh_durum').update({ son_hata: 'BH_TOKEN girilmemiş (Supabase > Edge Functions > Secrets)' }).eq('id', 1);
    return yanit({ ok: false, hata: 'BH_TOKEN girilmemiş' });
  }
  // Aynı anda iki eşitleme çalışmasın (her dakika tetiklenir; bir tur 1 dakikayı aşarsa sonraki atlanır)
  const simdi = new Date();
  const { data: kilit } = await db.from('bh_durum').update({ kilit: simdi.toISOString() }).eq('id', 1)
    .or(`kilit.is.null,kilit.lt.${new Date(simdi.getTime() - 3 * 60 * 1000).toISOString()}`).select('id, parmak_izi');
  if (!kilit?.length) return yanit({ ok: true, atlandi: 'önceki eşitleme sürüyor' });
  try {
    const c = await cek();
    const zaman = new Date().toISOString();
    const degisti = c.parmak !== kilit[0].parmak_izi;
    await db.from('bh_durum').update({
      son_esitleme: zaman, son_hata: c.cariHata ? `Cari bakiyeleri alınamadı: ${c.cariHata}` : null,
      urun_sayisi: c.urun, depo_sayisi: c.depo, cari_sayisi: c.cari, ham_ornek: c.ornek,
      parmak_izi: c.parmak, ...(degisti ? { son_degisim: zaman } : {}), kilit: null,
    }).eq('id', 1);
    return yanit({ ok: true, depo: c.depo, urun: c.urun, degisen: c.degisen, stokSatiri: c.stokSatiri, cari: c.cari, degisti });
  } catch (e) {
    const mesaj = (e as Error).message.slice(0, 800);
    await db.from('bh_durum').update({ son_hata: mesaj, son_esitleme: new Date().toISOString(), kilit: null }).eq('id', 1);
    return yanit({ ok: false, hata: mesaj }, 500);
  }
});
