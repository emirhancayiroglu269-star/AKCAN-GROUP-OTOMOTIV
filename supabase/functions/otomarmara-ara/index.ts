// Otomarmara B4B canlı ürün arama (Supabase Edge Function) — sitedeki "Ürün Ara" sayfası için.
// Yalnız OKUR: ürün arar, isteğe bağlı olarak bir ürünün OEM / eşdeğer listesini getirir. Sepete eklemez, sipariş vermez.
// Yalnız siteye giriş yapmış kullanıcılar çağırabilir. Sonuçlar 6 saat önbellekte tutulur; istekler arasında en az 1,5 sn beklenir.
// Gizli değerler (kullanıcı girdi): OM_MUSTERI_KODU, OM_KULLANICI, OM_SIFRE
import { createClient } from 'npm:@supabase/supabase-js@2';
import { DOMParser, type Element, type Node } from 'jsr:@b-fuze/deno-dom';

const BASE = 'https://b4b.otomarmara.com.tr';
const MUSTERI = Deno.env.get('OM_MUSTERI_KODU') ?? '';
const KULLANICI = Deno.env.get('OM_KULLANICI') ?? '';
const SIFRE = Deno.env.get('OM_SIFRE') ?? '';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const SAYFA_SINIR = 300_000;
const ONBELLEK_SAAT = 6;
const OTURUM_DK = 20;
const ARALIK_MS = 1500;
const SONUC_SINIR = 30;
let HAM = false; // keşif: hücrelerin ham HTML'i
const DEPOLAR = ['OTOMARKET', 'MERKEZ', 'FSM', 'ATAŞEHİR', 'PENDİK', 'DEPO']; // arama tablosundaki depo sütunları (sırasıyla)

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---------- çerez ----------
const cerez = new Map<string, string>();
const cerezAl = (r: Response) => { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) cerez.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); } };
const cerezMetni = () => [...cerez.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
const cerezYukle = (s: string) => { cerez.clear(); for (const p of s.split(';')) { const i = p.indexOf('='); if (i > 0) cerez.set(p.slice(0, i).trim(), p.slice(i + 1).trim()); } };
class OturumYok extends Error {}

async function istek(yol: string, init: RequestInit = {}, yonlendir = 5): Promise<string> {
  // Otomarmara'yı yormamak için istekler arası en az 1,5 sn (tüm kullanıcılar için ortak)
  const { data: o } = await db.from('om_oturum').select('son_istek').eq('id', 1).maybeSingle();
  const gecen = o?.son_istek ? Date.now() - new Date(o.son_istek).getTime() : 1e9;
  if (gecen < ARALIK_MS) await bekle(ARALIK_MS - gecen);
  await db.from('om_oturum').update({ son_istek: new Date().toISOString() }).eq('id', 1);
  const r = await fetch(BASE + yol, { ...init, redirect: 'manual', headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9', Cookie: cerezMetni(), ...(init.headers ?? {}) } });
  cerezAl(r);
  if (r.status >= 300 && r.status < 400 && r.headers.get('location') && yonlendir > 0) {
    await r.body?.cancel(); const loc = new URL(r.headers.get('location')!, BASE);
    if (/hesap\/giris/i.test(loc.pathname) && !/hesap\/giris|account\/login/i.test(yol)) throw new OturumYok('oturum düştü');
    return istek(loc.pathname + loc.search, {}, yonlendir - 1);
  }
  if (!r.ok) throw new Error('Otomarmara yanıt vermedi (' + r.status + ')');
  const t = await r.text(); return t.length > SAYFA_SINIR ? t.slice(0, SAYFA_SINIR) : t;
}

async function girisYap() {
  cerez.clear();
  const g = await istek('/hesap/giris');
  if (/Just a moment|cf-chl/i.test(g)) throw new Error('Otomarmara güvenlik doğrulaması istedi; şu an sunucudan aranamıyor');
  const tok = (g.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) || g.match(/value="([^"]+)"[^>]*name="__RequestVerificationToken"/) || [])[1];
  if (!tok) throw new Error('Otomarmara giriş formu okunamadı');
  await istek('/account/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: BASE + '/hesap/giris' }, body: new URLSearchParams({ CustomerCode: MUSTERI, Username: KULLANICI, Password: SIFRE, UserPrivacy: 'true', UserAgreement: 'true', __RequestVerificationToken: tok }) });
  const k = await istek('/musteri');
  if (/hesap\/giris|name="Password"/i.test(k) && !/SearchTextInput/.test(k)) throw new Error('Otomarmara girişi başarısız');
  await db.from('om_oturum').update({ cerez: cerezMetni(), zaman: new Date().toISOString() }).eq('id', 1);
}
async function oturumHazirla() {
  const { data: o } = await db.from('om_oturum').select('cerez, zaman').eq('id', 1).maybeSingle();
  if (o?.cerez && o.zaman && Date.now() - new Date(o.zaman).getTime() < OTURUM_DK * 60000) cerezYukle(o.cerez); else await girisYap();
}
const oturumKontrol = (t: string) => { if (/name="Password"/i.test(t) && !/GetOems|EŞDEĞER|OEMLER/i.test(t)) throw new OturumYok('oturum düştü'); };

// ---------- ayrıştırma ----------
const ayristir = (h: string) => new DOMParser().parseFromString(h, 'text/html')!;
const metin = (el: Node | null): string => { if (!el) return ''; const l: string[] = []; const gez = (n: Node) => { if (n.nodeType === 3) { const t = (n.textContent ?? '').trim(); if (t) l.push(t); } else n.childNodes.forEach(gez); }; gez(el); return l.join(' '); };
const kodBul = (t: string) => { const l = [...t.matchAll(/(?:^|\s)([A-Z0-9ÇĞİÖŞÜ]{2,6}-[A-Z0-9][A-Z0-9.\-/]*)/g)].map((m) => m[1]); return l.length ? l[l.length - 1] : null; };
const terim = (kod: string) => { const m = String(kod || '').trim().match(/^[A-ZÇĞİÖŞÜ]{2,4}-(.+)$/i); return m && norm(m[1]).length >= 4 ? m[1].trim() : String(kod || '').trim(); };

async function ara(q: string) {
  const sd = JSON.stringify({ sparepartbrands: '', models: '', categories: '', searchtext: q, searchType: 'all', specialOfferId: 0, wellcomePopupId: 0 });
  const h = await istek('/_ClientSummaryData', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: new URLSearchParams({ sortOrder: 'ascending', searchString: sd, firstItem: '0' }) });
  oturumKontrol(h);
  const d = ayristir('<table><tbody>' + h + '</tbody></table>');
  return [...d.querySelectorAll('tr')].map((r) => {
    const td = [...(r as Element).querySelectorAll('td')] as Element[]; const id = ((r as Element).innerHTML.match(/GetOems\((\d+)\)/) || [])[1];
    const t0 = td[0] ? metin(td[0]) : ''; const kod = kodBul(t0);
    // depo stok rozetleri (yeşil = var, kırmızı = yok, mavi = tedarik edilebilir) ve fiyatlar (KDV dahil: taksit, tek çekim, nakit)
    const depolar = DEPOLAR.map((ad, i) => { const h = td[4 + i]?.innerHTML ?? ''; return { ad, durum: /background-color:\s*green/i.test(h) ? 'var' : /background-color:\s*red/i.test(h) || /--failure/.test(h) ? 'yok' : /status-badge/.test(h) ? 'tedarik' : null }; });
    const tl = (x?: Element) => { const m = (x ? metin(x) : '').match(/([\d.]+,\d{2})/); return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null; };
    return { id, kod, marka: kod ? t0.replace(kod, '').trim().slice(0, 60) : '', ad: td[1] ? metin(td[1]).slice(0, 200) : '', ek: [] as string[], depolar,
      fiyat: { taksit: tl(td[11]), tekCekim: tl(td[12]), nakit: tl(td[13]) },
      ham: HAM ? td.map((x) => x.innerHTML.replace(/\s+/g, ' ').slice(0, 260)) : undefined };
  }).filter((x) => x.id && x.kod).slice(0, SONUC_SINIR);
}
async function detay(id: string) {
  const o = ayristir(await istek('/musteri/anasayfa/getoems/' + id)); o.querySelectorAll('h4,h5,h6,button,script,style').forEach((e) => (e as Element).remove());
  const oemler = [...new Set(metin(o.body).split(/\s+/).map((x) => x.trim()).filter((x) => /\d/.test(x) && norm(x).length >= 4 && x.length <= 40 && !/TL$/i.test(x) && !/:$/.test(x)))].slice(0, 300);
  const e = ayristir(await istek('/musteri/anasayfa/getsimilargroupids/' + id));
  const esdegerler = [...e.querySelectorAll('tbody tr')].map((r) => { const td = (r as Element).querySelectorAll('td'); return { kod: kodBul(td[0] ? metin(td[0]) : ''), ad: td[1] ? metin(td[1]).slice(0, 160) : null }; }).filter((x) => x.kod).slice(0, 300);
  return { oemler, esdegerler };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Record<string, unknown>, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  // yalnız siteye giriş yapmış kullanıcı
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: k } = await db.auth.getUser(jwt);
  if (!k?.user) return yanit({ ok: false, hata: 'Giriş gerekli' }, 401);
  // fiyat (bizim alış fiyatımız) yalnız yöneticiye
  let maliyet = false;
  { const { count } = await db.from('kullanicilar').select('eposta', { count: 'exact', head: true });
    if (!count) maliyet = true; else { const { data: ku } = await db.from('kullanicilar').select('rol,aktif').ilike('eposta', k.user.email ?? '-').maybeSingle(); if (!ku?.aktif) return yanit({ ok: false, hata: 'Yetki yok' }, 403); maliyet = ku.rol === 'yonetici'; } }
  const gizle = (sonuc: Record<string, unknown>) => (maliyet || !Array.isArray(sonuc.sonuclar) ? sonuc : { ...sonuc, sonuclar: (sonuc.sonuclar as Record<string, unknown>[]).map((x) => ({ ...x, fiyat: null })) });
  if (!MUSTERI || !KULLANICI || !SIFRE) return yanit({ ok: false, hata: 'Otomarmara bilgileri sunucuda tanımlı değil' }, 500);

  const b = await req.json().catch(() => ({}));
  const q = String(b?.q ?? '').trim().slice(0, 60); const id = String(b?.id ?? '').replace(/\D/g, '').slice(0, 12);
  if (!id && norm(q).length < 3 && q.length < 3) return yanit({ ok: false, hata: 'En az 3 karakter yazın' }, 400);
  const anahtar = id ? 'd:' + id : 'a2:' + q.toLocaleUpperCase('tr').replace(/\s+/g, ' ');
  HAM = b?.ham === true;
  const { data: on } = await db.from('om_arama').select('sonuc, zaman').eq('anahtar', anahtar).maybeSingle();
  if (on && !HAM && Date.now() - new Date(on.zaman).getTime() < ONBELLEK_SAAT * 3600000) return yanit({ ok: true, onbellek: true, zaman: on.zaman, maliyet, ...gizle(on.sonuc as Record<string, unknown>) });

  const calis = async () => {
    if (id) return detay(id);
    let l = await ara(q);
    if (!l.length && terim(q) !== q) l = await ara(terim(q));
    if (HAM) { const m = await istek('/musteri'); return { sonuclar: l, basliklar: [...m.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((x) => x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 60) }; }
    return { sonuclar: l };
  };
  try {
    await oturumHazirla();
    let sonuc: Record<string, unknown>;
    try { sonuc = await calis(); } catch (e) { if (!(e instanceof OturumYok)) throw e; await girisYap(); sonuc = await calis(); }
    if (!HAM) await db.from('om_arama').upsert({ anahtar, sonuc, zaman: new Date().toISOString() });
    // eski önbellek kayıtlarını temizle
    await db.from('om_arama').delete().lt('zaman', new Date(Date.now() - 3 * 86400000).toISOString());
    return yanit({ ok: true, onbellek: false, zaman: new Date().toISOString(), maliyet, ...gizle(sonuc) });
  } catch (e) {
    return yanit({ ok: false, hata: (e as Error).message.slice(0, 300) }, 502);
  }
});
