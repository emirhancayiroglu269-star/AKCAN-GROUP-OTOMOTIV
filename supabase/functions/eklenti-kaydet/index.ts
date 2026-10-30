// Tarayıcı eklentisinden gelen tedarikçi ürünlerini kaydeder (Supabase Edge Function).
// Eklenti, kullanıcı tedarikçi sitesinde (şimdilik Iron Otomotiv B2B) KENDİSİ arama yaptığında sitenin getirdiği sonuçları okur ve buraya yollar.
// Sunucu tedarikçi sitesine hiç bağlanmaz. Yetki: eklenti_anahtar tablosundaki anahtar (sitede Trendyol > İlanlar sayfasında yöneticiye gösterilir).
// Kayıt: tedarikci_katalog (gelen tüm ürünler) + tedarikci_maliyet (stok kodu bizdeki ürünle birebir aynı olanlar → Trendyol maliyet hesabı).
// bh_liste: BizimHesap kart alışı tedarikçideki güncel fiyatın gerisinde kalan ürünler (eklenti BizimHesap'ın kendi
// "Toplu Ürün Güncelleme" Excel'i ile kullanıcının onayıyla yükler); bh_yazildi: yüklenenlerin kaydı (bh_alis_log).
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
type Obj = Record<string, unknown>;
const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const sayi = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const TEDARIKCILER = new Set(['iron']);

// bizdeki aktif ürünlerin normalize stok kodları (fonksiyon sıcakken 10 dk saklanır)
let kodHarita: Map<string, { id: string; kod: string }> | null = null; let haritaZaman = 0;
async function harita() {
  if (kodHarita && Date.now() - haritaZaman < 600_000) return kodHarita;
  const m = new Map<string, { id: string; kod: string }>();
  for (let i = 0; i < 50000; i += 1000) {
    const { data, error } = await db.from('urunler').select('id,kod').eq('aktif', true).not('kod', 'is', null).order('id').range(i, i + 999);
    if (error) throw new Error(error.message);
    for (const u of data ?? []) { const n = norm(u.kod); if (n.length >= 3 && !m.has(n)) m.set(n, { id: u.id as string, kod: u.kod as string }); }
    if (!data || data.length < 1000) break;
  }
  kodHarita = m; haritaZaman = Date.now(); return m;
}

/**
 * BizimHesap kartındaki alış fiyatı, tedarikçide STOKTA olan en ucuz güncel fiyatın (7 gün içinde okunmuş, KDV hariç) %3'ten fazla gerisinde kalan ürünler.
 * Fark %50'yi aşarsa ya da kartta alış yoksa "kontrol" işaretlenir (eklentide varsayılan seçili gelmez).
 */
async function bhListe() {
  const sinir = new Date(Date.now() - 7 * 864e5).toISOString();
  const ted: Obj[] = [];
  for (let i = 0; i < 50000; i += 1000) {
    const { data, error } = await db.from('tedarikci_maliyet').select('urun_id,tedarikci,kod,fiyat,zaman').eq('stok_var', true).not('fiyat', 'is', null).gt('zaman', sinir).order('urun_id').range(i, i + 999);
    if (error) throw new Error(error.message); ted.push(...(data ?? [])); if (!data || data.length < 1000) break;
  }
  const en = new Map<string, Obj>();
  for (const t of ted) { const f = Number(t.fiyat); if (!(f > 0)) continue; const e = en.get(t.urun_id as string); if (!e || f < Number(e.fiyat)) en.set(t.urun_id as string, t); }
  // son 2 saatte eklentiyle BizimHesap'a yüklenmiş ürünler, BizimHesap eşitlemesi kart fiyatını getirene kadar listede tekrar görünmesin
  const { data: son } = await db.from('bh_alis_log').select('urun_id').gt('zaman', new Date(Date.now() - 2 * 3600000).toISOString()).limit(5000);
  for (const x of son ?? []) en.delete(x.urun_id as string);
  const ids = [...en.keys()]; const { data: ay } = await db.from('ayarlar').select('alis_kdv_haric').eq('id', 1).maybeSingle(); const kdvHaric = ay?.alis_kdv_haric !== false;
  const out: Obj[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('urunler').select('id,kod,ad,alis_fiyati,kdv,aktif').in('id', ids.slice(i, i + 200));
    for (const u of data ?? []) {
      if (!u.aktif || !u.kod) continue;
      const t = en.get(u.id as string)!; const kdv = Number(u.kdv) || 20; const alis = Number(u.alis_fiyati) || 0;
      const kart = kdvHaric ? alis : alis / (1 + kdv / 100); const yeni = Math.round(Number(t.fiyat) * 100) / 100;
      if (kart > 0 && yeni <= kart * 1.03) continue;
      out.push({ urun_id: u.id, kod: u.kod, ad: u.ad, kart: Math.round(kart * 100) / 100, kart_ham: alis, yeni, tedarikci: t.tedarikci, ted_kod: t.kod, zaman: t.zaman, kontrol: kart <= 0 || yeni > kart * 1.5 });
    }
  }
  return out.sort((a, x) => Number(a.kontrol) - Number(x.kontrol) || String(a.kod).localeCompare(String(x.kod)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const b = await req.json().catch(() => ({})) as Obj;
  const { data: a } = await db.from('eklenti_anahtar').select('anahtar').eq('id', 1).maybeSingle();
  if (!a?.anahtar || typeof b.anahtar !== 'string' || b.anahtar.trim() !== a.anahtar) return yanit({ ok: false, hata: 'Eklenti anahtarı yanlış' }, 401);
  if (b.islem === 'bh_liste') return yanit({ ok: true, liste: await bhListe() });
  if (b.islem === 'bh_yazildi') {
    const l = (Array.isArray(b.kalemler) ? b.kalemler as Obj[] : []).slice(0, 2000).map((x) => ({ urun_id: typeof x.urun_id === 'string' ? x.urun_id : null, kod: String(x.kod ?? '').slice(0, 80), ad: x.ad ? String(x.ad).slice(0, 250) : null, eski: sayi(x.eski), yeni: sayi(x.yeni), tedarikci: x.tedarikci ? String(x.tedarikci).slice(0, 20) : null }));
    if (l.length) { const { error } = await db.from('bh_alis_log').insert(l); if (error) return yanit({ ok: false, hata: error.message }, 500); }
    return yanit({ ok: true, kaydedilen: l.length });
  }
  const ted = String(b.tedarikci ?? ''); if (!TEDARIKCILER.has(ted)) return yanit({ ok: false, hata: 'Bilinmeyen tedarikçi' }, 400);
  if (b.islem === 'test') return yanit({ ok: true });

  const gelen = (Array.isArray(b.urunler) ? b.urunler as Obj[] : []).slice(0, 500).map((x) => ({
    kod: String(x.kod ?? '').trim().slice(0, 80), marka: x.marka ? String(x.marka).slice(0, 80) : null, ad: x.ad ? String(x.ad).slice(0, 250) : null,
    oem: x.oem ? String(x.oem).slice(0, 500) : null, fiyat: sayi(x.fiyat), liste: sayi(x.liste), stok: sayi(x.stok),
    depolar: Array.isArray(x.depolar) ? (x.depolar as Obj[]).slice(0, 10).map((d) => ({ ad: String(d.ad ?? '').slice(0, 30), adet: sayi(d.adet) })) : null,
  })).filter((x) => norm(x.kod).length >= 3);
  if (!gelen.length) return yanit({ ok: true, kaydedilen: 0, eslesen: [] });
  const zaman = new Date().toISOString();
  const tekil = [...new Map(gelen.map((x) => [x.kod, x])).values()];
  const { error: e1 } = await db.from('tedarikci_katalog').upsert(tekil.map((x) => ({ tedarikci: ted, ...x, kod_norm: norm(x.kod), zaman })));
  if (e1) return yanit({ ok: false, hata: e1.message }, 500);

  // bizdeki ürünle birebir aynı stok kodu → maliyet (aynı ürüne birden çok satır düşerse stokta olanların en ucuzu)
  const h = await harita(); const sec = new Map<string, Obj>(); const eslesen: { kod: string; bizim: string; fiyat: number | null }[] = [];
  for (const x of tekil) {
    const u = h.get(norm(x.kod)); if (!u || !(x.fiyat && x.fiyat > 0)) continue;
    const stokta = (x.stok ?? 0) > 0; const e = sec.get(u.id);
    if (!e || (stokta && !e.stok_var) || (stokta === e.stok_var && x.fiyat < Number(e.fiyat))) sec.set(u.id, { urun_id: u.id, tedarikci: ted, kod: x.kod, ad: x.ad, fiyat: Math.round(x.fiyat * 100) / 100, stok_var: stokta, ham: { liste: x.liste, stok: x.stok, depolar: x.depolar }, hata: null, zaman });
  }
  if (sec.size) { const { error: e2 } = await db.from('tedarikci_maliyet').upsert([...sec.values()]); if (e2) return yanit({ ok: false, hata: e2.message }, 500); }
  for (const s of sec.values()) eslesen.push({ kod: String(s.kod), bizim: h.get(norm(s.kod))!.kod, fiyat: Number(s.fiyat) });
  return yanit({ ok: true, kaydedilen: tekil.length, eslesen });
});
