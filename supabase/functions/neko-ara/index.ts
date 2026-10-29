// Neko Otomotiv B4B canlı ürün arama (Supabase Edge Function) — yalnız OKUR: ürün arar, stok/fiyat ve eşdeğerleri getirir. Sepete eklemez, sipariş vermez.
// Giriş: b4b.neko.com.tr/b4b/Login/LoginControl → authToken çerezi; arama: b4bservice.neko.com.tr (Bearer authToken).
// Fiyatlar (bizim alış fiyatımız) yalnız yönetici rolüne döner; personel stok durumunu görür.
// Sonuçlar 6 saat önbellekte; Neko'yu yormamak için istekler arası en az 1,2 sn (tüm kullanıcılar için ortak).
// Gizli değerler (kullanıcı girdi): NEKO_KULLANICI_KODU, NEKO_KULLANICI, NEKO_SIFRE
// Çağıran: siteye giriş yapmış kullanıcı ya da zamanlayıcı (x-zamanlayici = ty_gizli.anahtar).
import { createClient } from 'npm:@supabase/supabase-js@2';

const BASE = 'https://b4b.neko.com.tr';
const SERVIS = 'https://b4bservice.neko.com.tr';
const KOD = (Deno.env.get('NEKO_KULLANICI_KODU') ?? '').trim();
const KULLANICI = (Deno.env.get('NEKO_KULLANICI') ?? '').trim();
const SIFRE = Deno.env.get('NEKO_SIFRE') ?? '';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const ONBELLEK_SAAT = 6, OTURUM_DK = 30, ARALIK_MS = 1200, SONUC_SINIR = 30, TOPLU_SINIR = 25;

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zamanlayici' };
type Obj = Record<string, unknown>;
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const sayi = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
class OturumYok extends Error {}

async function sira() {
  const { data: o } = await db.from('neko_oturum').select('son_istek').eq('id', 1).maybeSingle();
  const gecen = o?.son_istek ? Date.now() - new Date(o.son_istek as string).getTime() : 1e9;
  if (gecen < ARALIK_MS) await bekle(ARALIK_MS - gecen);
  await db.from('neko_oturum').update({ son_istek: new Date().toISOString() }).eq('id', 1);
}

// ---------- oturum ----------
let token = '';
async function girisYap() {
  const cerez = new Map<string, string>();
  const al = (r: Response) => { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) cerez.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); } };
  const metin = () => [...cerez.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  await sira();
  const g = await fetch(BASE + '/', { headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9' } }); al(g);
  const h = await g.text();
  if (/Just a moment|cf-chl/i.test(h)) throw new Error('Neko güvenlik doğrulaması istedi; şu an sunucudan aranamıyor');
  const tok = h.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1];
  if (!tok) throw new Error('Neko giriş formu okunamadı');
  const p = await fetch(BASE + '/b4b/Login/LoginControl', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', Referer: BASE + '/', Cookie: metin() },
    body: new URLSearchParams({ __RequestVerificationToken: tok, username: KULLANICI, password: SIFRE, userCode: KOD }).toString() });
  al(p); const j = await p.json().catch(() => ({})) as Obj;
  if (String(j.Success) !== 'true') throw new Error('Neko girişi başarısız (kullanıcı bilgilerini kontrol edin)');
  token = decodeURIComponent(cerez.get('authToken') ?? '');
  if (!token) throw new Error('Neko oturum anahtarı alınamadı');
  await db.from('neko_oturum').update({ token, zaman: new Date().toISOString() }).eq('id', 1);
}
async function oturumHazirla() {
  const { data: o } = await db.from('neko_oturum').select('token, zaman').eq('id', 1).maybeSingle();
  if (o?.token && o.zaman && Date.now() - new Date(o.zaman as string).getTime() < OTURUM_DK * 60000) token = o.token as string; else await girisYap();
}
async function api(yol: string): Promise<unknown> {
  await sira();
  const r = await fetch(SERVIS + '/' + yol, { headers: { 'User-Agent': UA, 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer ' + token } });
  if (r.status === 401 || r.status === 403) { await r.body?.cancel(); throw new OturumYok('oturum düştü'); }
  if (!r.ok) { await r.body?.cancel(); throw new Error('Neko yanıt vermedi (' + r.status + ')'); }
  return r.json();
}

// ---------- arama ----------
const satir = (x: Obj) => ({
  id: sayi(x.ProductId), kod: String(x.ModelNumber ?? '').trim(), ad: String(x.Name ?? '').trim().slice(0, 200), uretici: String(x.Producer ?? '').trim() || null,
  stok: sayi(x.STOK), stokDurum: x.ISTs ? String(x.ISTs) : null, var: (sayi(x.ProductAvailable) ?? 0) > 0 || (sayi(x.STOK) ?? 0) > 0,
  resim: typeof x.ProductImage === 'string' && x.ProductImage.startsWith('https://') ? x.ProductImage : null,
  liste: sayi(x.PriceTL), net: sayi(x.NetPrice), netKdv: sayi(x.NetPriceVAT), iskonto: x.Discount ? String(x.Discount).trim() : null, doviz: x.Currency ? String(x.Currency) : null,
});
type Satir = ReturnType<typeof satir>;
const lucene = (q: string) => { const w = q.replace(/\*/g, '').trim().split(/\s+/).filter(Boolean); return w.length ? `*${w.join('* *')}*` : ''; };
/** "FTR-OE682/2" gibi bizim stok kodlarında baştaki marka kısaltmasını atar */
const terim = (q: string) => { const m = q.trim().match(/^[A-ZÇĞİÖŞÜ]{2,4}-(.+)$/i); return m && norm(m[1]).length >= 4 ? m[1].trim() : q.trim(); };
async function ara(q: string): Promise<Satir[]> {
  const l = await api('b4b/search?Searchtext=' + encodeURIComponent(lucene(q)) + '&ProducerId=-1&campaignProducerId=-1');
  return (Array.isArray(l) ? l as Obj[] : []).map(satir).filter((x) => x.id && x.kod).slice(0, SONUC_SINIR);
}
async function esdeger(id: number): Promise<Satir[]> {
  const l = await api('b4b/search/equivalentproducts?ProductId=' + id);
  return (Array.isArray(l) ? l as Obj[] : []).map(satir).filter((x) => x.id && x.kod).slice(0, 100);
}
async function aramaYap(q: string) {
  let l = await ara(q);
  if (!l.length && terim(q) !== q) l = await ara(terim(q));
  return l;
}

async function onbellekli<T>(anahtar: string, calis: () => Promise<T>): Promise<{ veri: T; onbellek: boolean; zaman: string }> {
  const { data: on } = await db.from('neko_arama').select('sonuc, zaman').eq('anahtar', anahtar).maybeSingle();
  if (on && Date.now() - new Date(on.zaman as string).getTime() < ONBELLEK_SAAT * 3600000) return { veri: on.sonuc as T, onbellek: true, zaman: on.zaman as string };
  const veri = await calis();
  const zaman = new Date().toISOString();
  await db.from('neko_arama').upsert({ anahtar, sonuc: veri as unknown as Obj, zaman });
  return { veri, onbellek: false, zaman };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  // yetki: zamanlayıcı ya da siteye giriş yapmış kullanıcı; fiyatlar yalnız yöneticiye
  const zh = req.headers.get('x-zamanlayici'); let zamanlayici = false; let maliyet = false;
  if (zh) { const { data: g } = await db.from('ty_gizli').select('anahtar').eq('id', 1).maybeSingle(); zamanlayici = !!g?.anahtar && g.anahtar === zh; }
  if (zamanlayici) maliyet = true;
  else {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: k } = await db.auth.getUser(jwt); if (!k?.user) return yanit({ ok: false, hata: 'Giriş gerekli' }, 401);
    const { count } = await db.from('kullanicilar').select('eposta', { count: 'exact', head: true });
    if (!count) maliyet = true;
    else { const { data: ku } = await db.from('kullanicilar').select('rol,aktif').ilike('eposta', k.user.email ?? '-').maybeSingle(); if (!ku?.aktif) return yanit({ ok: false, hata: 'Yetki yok' }, 403); maliyet = ku.rol === 'yonetici'; }
  }
  if (!KOD || !KULLANICI || !SIFRE) return yanit({ ok: false, hata: 'Neko bilgileri sunucuda tanımlı değil' }, 500);
  const gizle = (l: Satir[]) => (maliyet ? l : l.map((x) => ({ ...x, liste: null, net: null, netKdv: null, iskonto: null })));

  const b = await req.json().catch(() => ({})) as Obj;
  const islem = String(b.islem ?? 'ara');
  const dene = async <T>(f: () => Promise<T>): Promise<T> => { await oturumHazirla(); try { return await f(); } catch (e) { if (!(e instanceof OturumYok)) throw e; await girisYap(); return await f(); } };
  try {
    if (islem === 'esdeger') {
      const id = Number(b.id); if (!(id > 0)) return yanit({ ok: false, hata: 'ürün yok' }, 400);
      const r = await onbellekli(`e:${id}`, () => dene(() => esdeger(id)));
      return yanit({ ok: true, onbellek: r.onbellek, zaman: r.zaman, maliyet, sonuclar: gizle(r.veri) });
    }
    if (islem === 'toplu') {
      // birden çok kod: her kod için Neko'daki en uygun karşılık (stokta olan, en ucuz)
      const kodlar = [...new Set(((b.kodlar ?? []) as unknown[]).map((x) => String(x ?? '').trim()).filter((x) => norm(x).length >= 3))].slice(0, TOPLU_SINIR);
      const sonuc: Obj[] = []; const basla = Date.now();
      for (const k of kodlar) {
        if (Date.now() - basla > 110_000) { sonuc.push({ kod: k, yarim: true }); continue; }
        try {
          const r = await onbellekli(`a:${k.toLocaleUpperCase('tr').replace(/\s+/g, ' ')}`, () => dene(() => aramaYap(k)));
          const l = r.veri; const kn = norm(terim(k));
          const ayni = l.filter((x) => norm(x.kod).includes(kn));
          const aday = (ayni.length ? ayni : l).slice().sort((a, x) => Number(x.var) - Number(a.var) || (a.net ?? 1e12) - (x.net ?? 1e12));
          sonuc.push({ kod: k, adet: l.length, ayni: ayni.length > 0, en: aday[0] ? gizle([aday[0]])[0] : null, stoktaSayisi: l.filter((x) => x.var).length });
        } catch (e) { sonuc.push({ kod: k, hata: (e as Error).message.slice(0, 120) }); }
      }
      return yanit({ ok: true, maliyet, sonuclar: sonuc });
    }
    const q = String(b.q ?? '').trim().slice(0, 60);
    if (norm(q).length < 3) return yanit({ ok: false, hata: 'En az 3 karakter yazın' }, 400);
    const r = await onbellekli(`a:${q.toLocaleUpperCase('tr').replace(/\s+/g, ' ')}`, () => dene(() => aramaYap(q)));
    await db.from('neko_arama').delete().lt('zaman', new Date(Date.now() - 3 * 86400000).toISOString());
    return yanit({ ok: true, onbellek: r.onbellek, zaman: r.zaman, maliyet, sonuclar: gizle(r.veri) });
  } catch (e) { return yanit({ ok: false, hata: (e as Error).message.slice(0, 300) }, 502); }
});
