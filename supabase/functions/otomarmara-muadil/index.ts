// Otomarmara B4B → Analiz (Supabase Edge Function): yalnız İSTENEN ürünlerin OEM / eşdeğer bilgisini okur.
// Otomarmara'da hiçbir şey değiştirmez (sepete eklemez, sipariş vermez): ürün arar, OEM ve eşdeğer listesini okur.
// Gizli değerler (Supabase > Edge Functions > Secrets) — kullanıcı kendisi girer: OM_MUSTERI_KODU, OM_KULLANICI, OM_SIFRE
// Tetikleme: site "Otomarmara'dan getir" deyince + cron (bekleyen varsa işler). Bir turda en fazla 8 ürün, aralarında bekleme.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { DOMParser, type Element, type Node } from 'jsr:@b-fuze/deno-dom';

const BASE = 'https://b4b.otomarmara.com.tr';
const MUSTERI = Deno.env.get('OM_MUSTERI_KODU') ?? '';
const KULLANICI = Deno.env.get('OM_KULLANICI') ?? '';
const SIFRE = Deno.env.get('OM_SIFRE') ?? '';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const TUR_LIMIT = 8;
const SAYFA_SINIR = 300_000;
/** bir ürün bu kadar denemede bitirilemezse (servis o üründe kapanıyorsa) atlanır */
const DENEME_SINIR = 2;

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---------- Basit çerez kutusu ----------
const cerez = new Map<string, string>();
const cerezAl = (r: Response) => { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) cerez.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); } };
const cerezMetni = () => [...cerez.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
class OturumYok extends Error {}

async function istek(yol: string, init: RequestInit = {}, yonlendir = 5): Promise<{ r: Response; t: string; url: string }> {
  const r = await fetch(BASE + yol, { ...init, redirect: 'manual', headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9', Cookie: cerezMetni(), ...(init.headers ?? {}) } });
  cerezAl(r);
  if (r.status >= 300 && r.status < 400 && r.headers.get('location') && yonlendir > 0) {
    await r.body?.cancel();
    const loc = new URL(r.headers.get('location')!, BASE); return istek(loc.pathname + loc.search, {}, yonlendir - 1);
  }
  // aşırı büyük sayfa (binlerce satır) ayrıştırılırken sunucunun işlem gücü sınırı aşılmasın
  const t = await r.text();
  return { r, t: t.length > SAYFA_SINIR ? t.slice(0, SAYFA_SINIR) : t, url: yol };
}

async function girisYap() {
  cerez.clear();
  const g = await istek('/hesap/giris');
  if (/Just a moment|cf-chl/i.test(g.t)) throw new Error('Otomarmara güvenlik doğrulaması istedi (Cloudflare); sunucudan giriş yapılamıyor');
  const tok = (g.t.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) || g.t.match(/value="([^"]+)"[^>]*name="__RequestVerificationToken"/) || [])[1];
  if (!tok) throw new Error('Otomarmara giriş formu okunamadı');
  const govde = new URLSearchParams({ CustomerCode: MUSTERI, Username: KULLANICI, Password: SIFRE, UserPrivacy: 'true', UserAgreement: 'true', __RequestVerificationToken: tok });
  await istek('/account/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: BASE + '/hesap/giris' }, body: govde });
  const k = await istek('/musteri');
  if (/hesap\/giris|name="Password"/i.test(k.t) && !/SearchTextInput/.test(k.t)) throw new OturumYok('Otomarmara girişi başarısız (müşteri kodu / kullanıcı / şifre kontrol edin)');
}

// ---------- Ayrıştırma ----------
const ayristir = (h: string) => new DOMParser().parseFromString(h, 'text/html')!;
const metin = (el: Node | null): string => { if (!el) return ''; const l: string[] = []; const gez = (n: Node) => { if (n.nodeType === 3) { const t = (n.textContent ?? '').trim(); if (t) l.push(t); } else n.childNodes.forEach(gez); }; gez(el); return l.join(' '); };
// marka adı da tire içerebildiği için (RENAULT-MAIS-ORJINAL REN-224019185R) son kod biçimli parça alınır
const kodBul = (t: string) => { const l = [...t.matchAll(/(?:^|\s)([A-Z0-9ÇĞİÖŞÜ]{2,6}-[A-Z0-9][A-Z0-9.\-/]*)/g)].map((m) => m[1]); return l.length ? l[l.length - 1] : null; };
const terim = (kod: string) => { const m = String(kod || '').trim().match(/^[A-ZÇĞİÖŞÜ]{2,4}-(.+)$/i); return m && norm(m[1]).length >= 4 ? m[1].trim() : String(kod || '').trim(); };
const oturumKontrol = (t: string) => { if (/name="Password"/i.test(t) && !/GetOems|EŞDEĞER|OEMLER/i.test(t)) throw new OturumYok('Otomarmara oturumu düştü'); };

async function ara(t: string) {
  const sd = JSON.stringify({ sparepartbrands: '', models: '', categories: '', searchtext: t, searchType: 'all', specialOfferId: 0, wellcomePopupId: 0 });
  const { t: h } = await istek('/_ClientSummaryData', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: new URLSearchParams({ sortOrder: 'ascending', searchString: sd, firstItem: '0' }) });
  oturumKontrol(h);
  const d = ayristir('<table><tbody>' + h + '</tbody></table>');
  return [...d.querySelectorAll('tr')].map((r) => {
    const td = (r as Element).querySelectorAll('td'); const id = ((r as Element).innerHTML.match(/GetOems\((\d+)\)/) || [])[1];
    return { id, kod: kodBul(td[0] ? metin(td[0]) : ''), ad: td[1] ? metin(td[1]) : '' };
  }).filter((x) => x.id && x.kod);
}
async function oemler(id: string) {
  const { t } = await istek('/musteri/anasayfa/getoems/' + id); oturumKontrol(t);
  const d = ayristir(t); d.querySelectorAll('h4,h5,h6,button,script,style').forEach((e) => (e as Element).remove());
  return [...new Set(metin(d.body).split(/\s+/).map((x) => x.trim()).filter((x) => /\d/.test(x) && norm(x).length >= 4 && x.length <= 40 && !/TL$/i.test(x) && !/:$/.test(x)))];
}
async function esdegerler(id: string) {
  const { t } = await istek('/musteri/anasayfa/getsimilargroupids/' + id); oturumKontrol(t);
  const d = ayristir(t);
  return [...d.querySelectorAll('tbody tr')].map((r) => { const td = (r as Element).querySelectorAll('td'); return { kod: kodBul(td[0] ? metin(td[0]) : ''), ad: td[1] ? metin(td[1]).slice(0, 160) : null }; }).filter((x) => x.kod);
}
async function isle(u: { urun_id: string; kod: string }) {
  const t = terim(u.kod); const n = norm(u.kod), nt = norm(t);
  if (nt.length < 3) return { urun_id: u.urun_id, durum: 'bulunamadi', hata: 'Stok kodu aramaya uygun değil' };
  const l = await ara(t);
  const sec = l.find((x) => norm(x.kod) === n) || l.find((x) => norm(x.kod).endsWith(nt)) || l.find((x) => norm(x.kod).includes(nt));
  if (!sec) return { urun_id: u.urun_id, durum: 'bulunamadi', hata: `Otomarmara'da "${t}" araması bu ürünü bulamadı` };
  await bekle(1200); const o = await oemler(sec.id!);
  await bekle(1200); const e = (await esdegerler(sec.id!)).filter((x) => norm(x.kod) !== norm(sec.kod));
  return { urun_id: u.urun_id, durum: 'tamam', om_kod: sec.kod, om_ad: sec.ad.slice(0, 200), oemler: o.filter((x) => norm(x) !== norm(sec.kod)), esdegerler: e };
}

// ---------- Giriş noktası ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Record<string, unknown>, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const durum = (p: Record<string, unknown>) => db.from('om_durum').update(p).eq('id', 1);

  const { data: bek } = await db.from('otomarmara_veri').select('urun_id').eq('durum', 'istendi').limit(1);
  if (!bek?.length) return yanit({ ok: true, bekleyen: 0 });
  // giriş başarısız olduysa hesabın kilitlenmemesi için 30 dakika bekle (Ayarlar'dan "şimdi dene" ile zorlanabilir)
  const zorla = await req.json().then((b) => !!b?.zorla).catch(() => false);
  const { data: od } = await db.from('om_durum').select('son_hata, son_calisma').eq('id', 1).maybeSingle();
  if (!zorla && od?.son_hata && /girişi başarısız/.test(od.son_hata) && od.son_calisma && Date.now() - new Date(od.son_calisma).getTime() < 30 * 60 * 1000) return yanit({ ok: false, atlandi: 'son giriş başarısız; 30 dk bekleniyor' });
  if (!MUSTERI || !KULLANICI || !SIFRE) { await durum({ son_hata: 'Otomarmara bilgileri girilmemiş (Supabase > Edge Functions > Secrets: OM_MUSTERI_KODU, OM_KULLANICI, OM_SIFRE)', son_calisma: new Date().toISOString() }); return yanit({ ok: false, hata: 'gizli değerler yok' }); }

  // aynı anda iki tur çalışmasın
  const simdi = new Date();
  const { data: kilit } = await db.from('om_durum').update({ kilit: simdi.toISOString() }).eq('id', 1).or(`kilit.is.null,kilit.lt.${new Date(simdi.getTime() - 4 * 60 * 1000).toISOString()}`).select('id, islenen');
  if (!kilit?.length) return yanit({ ok: true, atlandi: 'önceki tur sürüyor' });
  let islenen = 0;
  try {
    // önceki turlarda işlenirken servisin kapandığı ürünler kuyruğu tıkamasın
    await db.from('otomarmara_veri').update({ durum: 'hata', guncelleme: new Date().toISOString(), hata: `Otomarmara sayfası işlenemedi (${DENEME_SINIR} deneme; sayfa çok büyük olabilir)` }).eq('durum', 'istendi').gte('deneme', DENEME_SINIR);
    const { data: l, error } = await db.from('otomarmara_veri').select('urun_id, deneme, urunler!inner(kod)').eq('durum', 'istendi').order('oncelik', { ascending: false }).order('istendi').limit(TUR_LIMIT);
    if (error) throw new Error(error.message);
    await girisYap();
    for (const x of l ?? []) {
      const u = { urun_id: x.urun_id as string, kod: String((x as unknown as { urunler: { kod: string } }).urunler?.kod ?? '') };
      let s: Record<string, unknown>;
      await db.from('otomarmara_veri').update({ deneme: (Number((x as { deneme?: number }).deneme) || 0) + 1 }).eq('urun_id', u.urun_id);
      try { s = await isle(u); } catch (e) { if (e instanceof OturumYok) throw e; s = { urun_id: u.urun_id, durum: 'hata', hata: String((e as Error).message).slice(0, 200) }; }
      let { error: e2 } = await db.rpc('om_sonuc_yaz', { p: s });
      // tek ürünün sonucu yazılamazsa kuyruk tıkanmasın: o ürün "hata" olarak işaretlenir, sıradakine geçilir
      if (e2) ({ error: e2 } = await db.rpc('om_sonuc_yaz', { p: { urun_id: u.urun_id, durum: 'hata', hata: ('Sonuç kaydedilemedi: ' + e2.message).slice(0, 200) } }));
      if (e2) throw new Error(e2.message);
      islenen++; await bekle(1500);
    }
    await durum({ son_calisma: new Date().toISOString(), son_hata: null, kilit: null, islenen: (Number(kilit[0].islenen) || 0) + islenen });
    // kullanıcının istediği (öncelikli) ürün kaldıysa hemen devam et; toplu doldurma ise cron hızında (2 dk'da 8 ürün) yavaş ilerler
    const { count } = await db.from('otomarmara_veri').select('urun_id', { count: 'exact', head: true }).eq('durum', 'istendi');
    const { count: oncelikli } = await db.from('otomarmara_veri').select('urun_id', { count: 'exact', head: true }).eq('durum', 'istendi').eq('oncelik', 1);
    if ((oncelikli ?? 0) > 0) {
      const p = fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/otomarmara-muadil', { method: 'POST', headers: { Authorization: req.headers.get('Authorization') ?? '', 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil?.(p);
    }
    return yanit({ ok: true, islenen, kalan: count ?? 0 });
  } catch (e) {
    const mesaj = (e as Error).message.slice(0, 500);
    await durum({ son_hata: mesaj, son_calisma: new Date().toISOString(), kilit: null });
    return yanit({ ok: false, hata: mesaj, islenen }, 500);
  }
});
