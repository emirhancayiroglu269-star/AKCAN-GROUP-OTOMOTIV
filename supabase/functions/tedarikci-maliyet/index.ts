// Tedarikçi güncel maliyet kontrolü (Supabase Edge Function) — yalnız OKUR: Otomarmara ve Neko'da ürün arar, fiyat/stok kaydeder.
// Sepete eklemez, sipariş vermez, BizimHesap'a yazmaz.
// Trendyol'daki (bizdeki ürünle eşleşmiş) ilanların ürünlerini sırayla dolaşır; her ürün günde bir kez (20 saatten eski kayıt) sorgulanır.
// Eşleşme yalnız TAM kodla: Otomarmara kodu bizim stok koduyla birebir aynı (FBI-180118), Neko kodu ön ek dahil aynı (FBI 180118);
// ya da ön eksiz kod aynı ve Neko'daki üretici adı bizdeki markayla uyuşuyor. Muadil ürünün fiyatı kullanılmaz.
// Fiyat: KDV hariç birim alış. Otomarmara nakit fiyatı (KDV dahil) KDV'den arındırılır; Neko NetPrice zaten KDV hariç.
// Çağıran: zamanlayıcı (x-zamanlayici = ty_gizli.anahtar) ya da siteden yönetici. Bir çağrı en fazla ~110 sn çalışır.
// Gizli değerler (kullanıcı girdi): OM_MUSTERI_KODU, OM_KULLANICI, OM_SIFRE, NEKO_KULLANICI_KODU, NEKO_KULLANICI, NEKO_SIFRE
import { createClient } from 'npm:@supabase/supabase-js@2';
import { DOMParser, type Element, type Node } from 'jsr:@b-fuze/deno-dom';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const SURE_MS = 110_000, YENILE_SAAT = 20;
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zamanlayici' };
type Obj = Record<string, unknown>;
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const katla = (s: unknown) => String(s ?? '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const sayi = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
/** "FTR-OE682/2" → "OE682/2" (baştaki marka kısaltması) */
const terim = (kod: string) => { const m = String(kod || '').trim().match(/^[A-ZÇĞİÖŞÜ0-9]{2,4}-(.+)$/i); return m && norm(m[1]).length >= 4 ? m[1].trim() : String(kod || '').trim(); };
class OturumYok extends Error {}

// =============== Otomarmara ===============
const OM = { base: 'https://b4b.otomarmara.com.tr', musteri: Deno.env.get('OM_MUSTERI_KODU') ?? '', kullanici: Deno.env.get('OM_KULLANICI') ?? '', sifre: Deno.env.get('OM_SIFRE') ?? '' };
const omCerez = new Map<string, string>();
const omCerezAl = (r: Response) => { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) omCerez.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); } };
const omCerezMetni = () => [...omCerez.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
async function omIstek(yol: string, init: RequestInit = {}, yonlendir = 5): Promise<string> {
  // Otomarmara'yı yormamak için istekler arası en az 1,5 sn (sitedeki aramalarla ortak sayaç)
  const { data: o } = await db.from('om_oturum').select('son_istek').eq('id', 1).maybeSingle();
  const gecen = o?.son_istek ? Date.now() - new Date(o.son_istek).getTime() : 1e9;
  if (gecen < 1500) await bekle(1500 - gecen);
  await db.from('om_oturum').update({ son_istek: new Date().toISOString() }).eq('id', 1);
  const r = await fetch(OM.base + yol, { ...init, redirect: 'manual', headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9', Cookie: omCerezMetni(), ...(init.headers ?? {}) } });
  omCerezAl(r);
  if (r.status >= 300 && r.status < 400 && r.headers.get('location') && yonlendir > 0) {
    await r.body?.cancel(); const loc = new URL(r.headers.get('location')!, OM.base);
    if (/hesap\/giris/i.test(loc.pathname) && !/hesap\/giris|account\/login/i.test(yol)) throw new OturumYok('oturum düştü');
    return omIstek(loc.pathname + loc.search, {}, yonlendir - 1);
  }
  if (!r.ok) throw new Error('Otomarmara yanıt vermedi (' + r.status + ')');
  return (await r.text()).slice(0, 300_000);
}
async function omGiris() {
  omCerez.clear();
  const g = await omIstek('/hesap/giris');
  if (/Just a moment|cf-chl/i.test(g)) throw new Error('Otomarmara güvenlik doğrulaması istedi');
  const tok = (g.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) || g.match(/value="([^"]+)"[^>]*name="__RequestVerificationToken"/) || [])[1];
  if (!tok) throw new Error('Otomarmara giriş formu okunamadı');
  await omIstek('/account/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: OM.base + '/hesap/giris' }, body: new URLSearchParams({ CustomerCode: OM.musteri, Username: OM.kullanici, Password: OM.sifre, UserPrivacy: 'true', UserAgreement: 'true', __RequestVerificationToken: tok }) });
  const k = await omIstek('/musteri');
  if (/hesap\/giris|name="Password"/i.test(k) && !/SearchTextInput/.test(k)) throw new Error('Otomarmara girişi başarısız');
  await db.from('om_oturum').update({ cerez: omCerezMetni(), zaman: new Date().toISOString() }).eq('id', 1);
}
async function omHazirla() {
  const { data: o } = await db.from('om_oturum').select('cerez, zaman').eq('id', 1).maybeSingle();
  if (o?.cerez && o.zaman && Date.now() - new Date(o.zaman).getTime() < 20 * 60000) { omCerez.clear(); for (const p of String(o.cerez).split(';')) { const i = p.indexOf('='); if (i > 0) omCerez.set(p.slice(0, i).trim(), p.slice(i + 1).trim()); } }
  else await omGiris();
}
const metin = (el: Node | null): string => { if (!el) return ''; const l: string[] = []; const gez = (n: Node) => { if (n.nodeType === 3) { const t = (n.textContent ?? '').trim(); if (t) l.push(t); } else n.childNodes.forEach(gez); }; gez(el); return l.join(' '); };
const kodBul = (t: string) => { const l = [...t.matchAll(/(?:^|\s)([A-Z0-9ÇĞİÖŞÜ]{2,6}-[A-Z0-9][A-Z0-9.\-/]*)/g)].map((m) => m[1]); return l.length ? l[l.length - 1] : null; };
async function omAra(q: string) {
  const sd = JSON.stringify({ sparepartbrands: '', models: '', categories: '', searchtext: q, searchType: 'all', specialOfferId: 0, wellcomePopupId: 0 });
  const h = await omIstek('/_ClientSummaryData', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: new URLSearchParams({ sortOrder: 'ascending', searchString: sd, firstItem: '0' }) });
  if (/name="Password"/i.test(h)) throw new OturumYok('oturum düştü');
  const d = new DOMParser().parseFromString('<table><tbody>' + h + '</tbody></table>', 'text/html')!;
  return [...d.querySelectorAll('tr')].map((r) => {
    const td = [...(r as Element).querySelectorAll('td')] as Element[];
    const t0 = td[0] ? metin(td[0]) : ''; const kod = kodBul(t0);
    const varMi = td.slice(4, 10).some((x) => /background-color:\s*green/i.test(x.innerHTML));
    const tl = (x?: Element) => { const m = (x ? metin(x) : '').match(/([\d.]+,\d{2})/); return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null; };
    return { kod, ad: td[1] ? metin(td[1]).slice(0, 160) : '', var: varMi, nakit: tl(td[13]), tekCekim: tl(td[12]) };
  }).filter((x) => x.kod);
}

// =============== Neko ===============
const NK = { base: 'https://b4b.neko.com.tr', servis: 'https://b4bservice.neko.com.tr', kod: (Deno.env.get('NEKO_KULLANICI_KODU') ?? '').trim(), kullanici: (Deno.env.get('NEKO_KULLANICI') ?? '').trim(), sifre: Deno.env.get('NEKO_SIFRE') ?? '' };
let nkToken = '';
async function nkSira() {
  const { data: o } = await db.from('neko_oturum').select('son_istek').eq('id', 1).maybeSingle();
  const gecen = o?.son_istek ? Date.now() - new Date(o.son_istek as string).getTime() : 1e9;
  if (gecen < 1200) await bekle(1200 - gecen);
  await db.from('neko_oturum').update({ son_istek: new Date().toISOString() }).eq('id', 1);
}
async function nkGiris() {
  const cerez = new Map<string, string>();
  const al = (r: Response) => { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) cerez.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); } };
  await nkSira();
  const g = await fetch(NK.base + '/', { headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9' } }); al(g);
  const h = await g.text();
  if (/Just a moment|cf-chl/i.test(h)) throw new Error('Neko güvenlik doğrulaması istedi');
  const tok = h.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1];
  if (!tok) throw new Error('Neko giriş formu okunamadı');
  const p = await fetch(NK.base + '/b4b/Login/LoginControl', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', Referer: NK.base + '/', Cookie: [...cerez.entries()].map(([k, v]) => `${k}=${v}`).join('; ') },
    body: new URLSearchParams({ __RequestVerificationToken: tok, username: NK.kullanici, password: NK.sifre, userCode: NK.kod }).toString() });
  al(p); const j = await p.json().catch(() => ({})) as Obj;
  if (String(j.Success) !== 'true') throw new Error('Neko girişi başarısız');
  nkToken = decodeURIComponent(cerez.get('authToken') ?? '');
  if (!nkToken) throw new Error('Neko oturum anahtarı alınamadı');
  await db.from('neko_oturum').update({ token: nkToken, zaman: new Date().toISOString() }).eq('id', 1);
}
async function nkHazirla() {
  const { data: o } = await db.from('neko_oturum').select('token, zaman').eq('id', 1).maybeSingle();
  if (o?.token && o.zaman && Date.now() - new Date(o.zaman as string).getTime() < 30 * 60000) nkToken = o.token as string; else await nkGiris();
}
async function nkAra(q: string) {
  await nkSira();
  const w = q.replace(/\*/g, '').trim().split(/\s+/).filter(Boolean);
  const r = await fetch(NK.servis + '/b4b/search?Searchtext=' + encodeURIComponent(`*${w.join('* *')}*`) + '&ProducerId=-1&campaignProducerId=-1', { headers: { 'User-Agent': UA, 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer ' + nkToken } });
  if (r.status === 401 || r.status === 403) { await r.body?.cancel(); throw new OturumYok('oturum düştü'); }
  if (!r.ok) { await r.body?.cancel(); throw new Error('Neko yanıt vermedi (' + r.status + ')'); }
  const l = await r.json();
  return (Array.isArray(l) ? l as Obj[] : []).map((x) => ({ kod: String(x.ModelNumber ?? '').trim(), ad: String(x.Name ?? '').trim().slice(0, 160), uretici: String(x.Producer ?? '').trim(),
    var: (sayi(x.ProductAvailable) ?? 0) > 0 || (sayi(x.STOK) ?? 0) > 0, net: sayi(x.NetPrice), doviz: x.Currency ? String(x.Currency) : null })).filter((x) => x.kod);
}

// =============== bir ürünü sorgula ===============
type Urun = { id: string; kod: string; marka: string | null; kdv: number };
async function dene<T>(f: () => Promise<T>, giris: () => Promise<void>): Promise<T> { try { return await f(); } catch (e) { if (!(e instanceof OturumYok)) throw e; await giris(); return await f(); } }
async function omSorgula(u: Urun) {
  const kn = norm(u.kod);
  let l = await dene(() => omAra(u.kod), omGiris);
  let b = l.filter((x) => norm(x.kod) === kn);
  if (!b.length && terim(u.kod) !== u.kod) { l = await dene(() => omAra(terim(u.kod)), omGiris); b = l.filter((x) => norm(x.kod) === kn); }
  const x = b.sort((a, c) => Number(c.var) - Number(a.var))[0];
  const kdvli = x ? (x.nakit ?? x.tekCekim) : null;
  return { kod: x?.kod ?? null, ad: x?.ad ?? null, fiyat: kdvli && kdvli > 0 ? Math.round(kdvli / (1 + u.kdv / 100) * 100) / 100 : null, stok_var: x ? x.var : null, ham: x ? { nakit: x.nakit, tekCekim: x.tekCekim } : null };
}
async function nkSorgula(u: Urun) {
  const kn = norm(u.kod); const tn = norm(terim(u.kod)); const mk = katla(u.marka).slice(0, 4);
  const l = await dene(() => nkAra(terim(u.kod)), nkGiris);
  const b = l.filter((x) => {
    if (norm(x.kod) === kn) return true;
    // ön eki farklı yazılmış olabilir: ön eksiz kod aynı + üretici bizdeki markayla uyuşuyor
    const ure = katla(x.uretici);
    return tn.length >= 4 && norm(x.kod.replace(/^[A-Z0-9ÇĞİÖŞÜ]{2,4}\s+/i, '')) === tn && mk.length >= 3 && (ure.startsWith(mk) || katla(u.marka).startsWith(ure.slice(0, 4)));
  });
  const x = b.sort((a, c) => Number(c.var) - Number(a.var) || (a.net ?? 1e12) - (c.net ?? 1e12))[0];
  return { kod: x?.kod ?? null, ad: x?.ad ?? null, fiyat: x?.net && x.net > 0 ? x.net : null, stok_var: x ? x.var : null, ham: x ? { uretici: x.uretici, doviz: x.doviz } : null };
}

// =============== sıra ===============
async function hepsi<T>(f: (a: number, b: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < 100000; i += 1000) { const { data, error } = await f(i, i + 999); if (error) throw new Error(error.message); out.push(...((data ?? []) as T[])); if (!data || data.length < 1000) break; }
  return out;
}
async function siradakiler(): Promise<string[]> {
  const ilan = await hepsi<{ urun_id: string }>((a, b) => db.from('ty_urun').select('urun_id').not('urun_id', 'is', null).order('barkod').range(a, b));
  const kayit = await hepsi<{ urun_id: string; zaman: string }>((a, b) => db.from('tedarikci_maliyet').select('urun_id,zaman').order('urun_id').range(a, b));
  const son = new Map<string, number>();
  for (const k of kayit) { const z = new Date(k.zaman).getTime(); son.set(k.urun_id, Math.min(son.get(k.urun_id) ?? Infinity, z)); }
  const sinir = Date.now() - YENILE_SAAT * 3600000;
  return [...new Set(ilan.map((x) => x.urun_id))].filter((id) => (son.get(id) ?? 0) < sinir).sort((a, b) => (son.get(a) ?? 0) - (son.get(b) ?? 0));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const zh = req.headers.get('x-zamanlayici'); let yetki = false;
  if (zh) { const { data: g } = await db.from('ty_gizli').select('anahtar').eq('id', 1).maybeSingle(); yetki = !!g?.anahtar && g.anahtar === zh; }
  if (!yetki) {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: k } = await db.auth.getUser(jwt); if (!k?.user) return yanit({ ok: false, hata: 'Giriş gerekli' }, 401);
    const { count } = await db.from('kullanicilar').select('eposta', { count: 'exact', head: true });
    if (count) { const { data: ku } = await db.from('kullanicilar').select('rol,aktif').ilike('eposta', k.user.email ?? '-').maybeSingle(); if (!ku?.aktif || ku.rol !== 'yonetici') return yanit({ ok: false, hata: 'Yalnız yönetici' }, 403); }
  }
  const basla = Date.now();
  const sira = await siradakiler();
  if (!sira.length) return yanit({ ok: true, islenen: 0, kalan: 0 });
  const omAcik = !!(OM.musteri && OM.kullanici && OM.sifre), nkAcik = !!(NK.kod && NK.kullanici && NK.sifre);
  let omHata: string | null = null, nkHata: string | null = null;
  if (omAcik) { try { await omHazirla(); } catch (e) { omHata = (e as Error).message; } }
  if (nkAcik) { try { await nkHazirla(); } catch (e) { nkHata = (e as Error).message; } }
  if ((!omAcik || omHata) && (!nkAcik || nkHata)) return yanit({ ok: false, hata: [omHata, nkHata].filter(Boolean).join(' · ') || 'Tedarikçi bilgileri tanımlı değil' }, 502);

  let islenen = 0, bulunan = 0;
  for (let i = 0; i < sira.length && Date.now() - basla < SURE_MS; i += 20) {
    const parca = sira.slice(i, i + 20);
    const { data: ul } = await db.from('urunler').select('id,kod,marka,kdv,aktif').in('id', parca);
    for (const r of (ul ?? []) as Obj[]) {
      if (Date.now() - basla > SURE_MS) break;
      const u: Urun = { id: String(r.id), kod: String(r.kod ?? '').trim(), marka: (r.marka as string | null) ?? null, kdv: Number(r.kdv) || 20 };
      const zaman = new Date().toISOString(); const satir: Obj[] = [];
      if (!r.aktif || norm(u.kod).length < 3) {
        satir.push({ urun_id: u.id, tedarikci: 'otomarmara', fiyat: null, kod: null, hata: 'kod yok / pasif', zaman }, { urun_id: u.id, tedarikci: 'neko', fiyat: null, kod: null, hata: 'kod yok / pasif', zaman });
      } else {
        // iki tedarikçi aynı anda (her birinin kendi istek aralığı var)
        const [om, nk] = await Promise.allSettled([
          omAcik && !omHata ? omSorgula(u) : Promise.reject(new Error(omHata ?? 'tanımlı değil')),
          nkAcik && !nkHata ? nkSorgula(u) : Promise.reject(new Error(nkHata ?? 'tanımlı değil')),
        ]);
        for (const [ted, s] of [['otomarmara', om], ['neko', nk]] as const) {
          if (s.status === 'fulfilled') { satir.push({ urun_id: u.id, tedarikci: ted, ...s.value, hata: null, zaman }); if (s.value.fiyat) bulunan++; }
          else satir.push({ urun_id: u.id, tedarikci: ted, fiyat: null, kod: null, stok_var: null, ham: null, hata: String((s.reason as Error)?.message ?? s.reason).slice(0, 200), zaman });
        }
      }
      // geçici hata (oturum, bağlantı) olan kayıt eski zamanla bırakılır ki yarın değil bir sonraki turda tekrar denensin
      const kalici = satir.filter((x) => !x.hata || x.hata === 'kod yok / pasif');
      const gecici = satir.filter((x) => x.hata && x.hata !== 'kod yok / pasif').map((x) => ({ ...x, zaman: new Date(Date.now() - YENILE_SAAT * 3600000 - 60000).toISOString() }));
      if (kalici.length) await db.from('tedarikci_maliyet').upsert(kalici);
      // geçici hatada önceki fiyat korunur: yalnız hiç kaydı olmayanlar için boş satır yazılır
      for (const g of gecici) { const { data: var_ } = await db.from('tedarikci_maliyet').select('urun_id').eq('urun_id', g.urun_id).eq('tedarikci', g.tedarikci).maybeSingle(); if (var_) await db.from('tedarikci_maliyet').update({ hata: g.hata, zaman: g.zaman }).eq('urun_id', g.urun_id).eq('tedarikci', g.tedarikci); else await db.from('tedarikci_maliyet').insert(g); }
      islenen++;
    }
  }
  return yanit({ ok: true, islenen, bulunan, kalan: Math.max(0, sira.length - islenen), omHata, nkHata, sure: Math.round((Date.now() - basla) / 1000) });
});
