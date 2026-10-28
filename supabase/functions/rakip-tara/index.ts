// Otoparçasan pazar taraması (Supabase Edge Function): herkese açık "araç markası × kategori" sayfalarının İLK sayfasını okur
// (robots.txt'in izin verdiği adresler; arama, sıralama ve sayfalama adreslerine girmez). Giriş yapmaz, hiçbir şey göndermez.
// Sayfadaki ürün listesini (JSON-LD) kaydeder: ürün adı, üretici markası, üretici kodu, fiyat, stok durumu, listedeki sırası.
// Siteyi yormamak için her turda az sayfa, aralarında bekleme; her sayfa haftada bir yenilenir.
// Çağıran: zamanlayıcı (x-zamanlayici başlığı = ty_gizli.anahtar) ya da siteye giriş yapmış kullanıcı.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE = 'https://otoparcasan.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const MARKALAR = ['renault', 'fiat', 'volkswagen', 'ford', 'opel', 'hyundai', 'toyota', 'peugeot', 'citroen', 'dacia', 'skoda', 'seat', 'honda', 'kia', 'nissan', 'chevrolet', 'mercedes', 'bmw', 'audi'];
const TUR_SAYFA = 8;          // bir turda en fazla bu kadar sayfa
const BEKLEME_MS = 3000;      // sayfalar arası bekleme
const YENILEME_GUN = 7;

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zamanlayici' };
type Obj = Record<string, unknown>;
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sayfaAl(yol: string) {
  const r = await fetch(yol.startsWith('http') ? yol : SITE + yol, { headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9' } });
  return { durum: r.status, metin: r.ok ? await r.text() : (await r.body?.cancel(), '') };
}
const slug = (s: string) => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Ürün adresinden üretici kodu: ".../motor-yag-cubugu-mga-941193" → "941193" (üretici markasından sonrası) */
function kodBul(url: string, uretici: string | null) {
  const son = (url.split('?')[0].split('/').pop() ?? '').toLowerCase();
  if (uretici) {
    const m = slug(uretici); const i = son.lastIndexOf(`-${m}-`);
    if (m && i >= 0) return son.slice(i + m.length + 2);
    if (m && son.startsWith(`${m}-`)) return son.slice(m.length + 1);
  }
  return son.split('-').pop() ?? null;
}

/** Sayfadaki JSON-LD ürün listesini çıkarır */
function urunleriCikar(html: string) {
  const sonuc: { sira: number; url: string; ad: string | null; uretici: string | null; fiyat: number | null; stokta: boolean | null }[] = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let j: unknown; try { j = JSON.parse(m[1]); } catch { continue; }
    const kok = (Array.isArray(j) ? j : [j]) as Obj[];
    for (const k of kok) {
      const listeler = [k, ...(((k['@graph'] ?? []) as Obj[]))].filter((x) => x && x['@type'] === 'ItemList');
      for (const l of listeler) for (const e of (l.itemListElement ?? []) as Obj[]) {
        const it = (e.item ?? e) as Obj; const of = (Array.isArray(it.offers) ? (it.offers as Obj[])[0] : it.offers) as Obj | undefined;
        const url = String(it.url ?? e.url ?? ''); if (!url.startsWith(SITE)) continue;
        const fiyat = Number(of?.price); const st = String(of?.availability ?? '');
        sonuc.push({ sira: Number(e.position) || sonuc.length + 1, url, ad: it.name ? String(it.name).replace(/\s+/g, ' ').trim() : null,
          uretici: ((it.brand ?? {}) as Obj).name ? String(((it.brand ?? {}) as Obj).name) : null, fiyat: Number.isFinite(fiyat) && fiyat > 0 ? fiyat : null,
          stokta: st ? /InStock/i.test(st) : null });
      }
    }
  }
  return [...new Map(sonuc.map((x) => [x.url, x])).values()];
}

async function hazirla() {
  let eklenen = 0;
  for (const marka of MARKALAR) {
    const kokUrl = `${SITE}/oto-yedek-parca/${marka}-yedek-parca`;
    const { durum, metin } = await sayfaAl(kokUrl);
    if (durum !== 200) continue;
    // kategori bağlantıları "?o=o" (sıralama) ekiyle gelir; sıralama adresleri robots.txt'te kapalı olduğu için ek atılır
    const re = new RegExp(`href="(${kokUrl.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}/([a-z0-9-]+))(?:\\?[^"]*)?"`, 'g');
    const sayfalar = [...new Map([...metin.matchAll(re)].map((x) => [x[1], { url: x[1], arac: marka, kategori: x[2] }])).values()];
    if (sayfalar.length) { await db.from('rakip_sayfa').upsert(sayfalar, { onConflict: 'url', ignoreDuplicates: true }); eklenen += sayfalar.length; }
    await bekle(BEKLEME_MS);
  }
  return eklenen;
}

async function tur() {
  const sinir = new Date(Date.now() - YENILEME_GUN * 864e5).toISOString();
  const { data: sayfalar } = await db.from('rakip_sayfa').select('url,kategori').or(`son_tarama.is.null,son_tarama.lt.${sinir}`).order('son_tarama', { ascending: true, nullsFirst: true }).limit(TUR_SAYFA);
  let okunan = 0, urun = 0; const basla = Date.now();
  for (const s of sayfalar ?? []) {
    if (Date.now() - basla > 100_000) break;
    try {
      const { durum, metin } = await sayfaAl(s.url as string);
      const l = durum === 200 ? urunleriCikar(metin) : [];
      if (l.length) {
        const simdi = new Date().toISOString();
        const { error } = await db.from('rakip_urun').upsert(l.map((x) => ({ url: x.url, ad: x.ad, uretici: x.uretici, kod: kodBul(x.url, x.uretici), fiyat: x.fiyat, stokta: x.stokta, kategori: s.kategori, son_gorulme: simdi })), { onConflict: 'url' });
        if (error) throw new Error(error.message);
        await db.from('rakip_gorunum').delete().eq('sayfa_url', s.url);
        await db.from('rakip_gorunum').insert(l.map((x) => ({ sayfa_url: s.url, urun_url: x.url, sira: x.sira, zaman: simdi })));
      }
      await db.from('rakip_sayfa').update({ son_tarama: new Date().toISOString(), durum: durum === 200 ? (l.length ? 'tamam' : 'bos') : `http ${durum}`, urun_sayisi: l.length }).eq('url', s.url);
      okunan++; urun += l.length;
    } catch (e) {
      await db.from('rakip_sayfa').update({ son_tarama: new Date().toISOString(), durum: `hata: ${(e as Error).message.slice(0, 100)}` }).eq('url', s.url);
    }
    await bekle(BEKLEME_MS);
  }
  return { okunan, urun };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const zh = req.headers.get('x-zamanlayici');
  let izinli = false;
  if (zh) { const { data: g } = await db.from('ty_gizli').select('anahtar').eq('id', 1).maybeSingle(); izinli = !!g?.anahtar && g.anahtar === zh; }
  if (!izinli) { const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, ''); const { data: k } = await db.auth.getUser(jwt); izinli = !!k?.user; }
  if (!izinli) return yanit({ ok: false, hata: 'Giriş gerekli' }, 401);
  try {
    const { count } = await db.from('rakip_sayfa').select('url', { count: 'exact', head: true });
    if (!count) return yanit({ ok: true, hazirlanan: await hazirla() });
    return yanit({ ok: true, ...(await tur()) });
  } catch (e) { return yanit({ ok: false, hata: (e as Error).message.slice(0, 300) }, 500); }
});
