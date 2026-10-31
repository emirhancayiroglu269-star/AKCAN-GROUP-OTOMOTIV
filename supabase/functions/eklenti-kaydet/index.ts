// Tarayıcı eklentisinden gelen tedarikçi ürünlerini kaydeder (Supabase Edge Function).
// Eklenti, kullanıcı tedarikçi sitesinde (Iron Otomotiv ve Başbuğ B2B — ikisi aynı B2B yazılımı) KENDİSİ arama yaptığında sitenin getirdiği sonuçları okur ve buraya yollar.
// Sunucu tedarikçi sitesine hiç bağlanmaz. Yetki: eklenti_anahtar tablosundaki anahtar (sitede Trendyol > İlanlar sayfasında yöneticiye gösterilir).
// Kayıt: tedarikci_katalog (gelen tüm ürünler) + tedarikci_maliyet (stok kodu bizdeki ürünle birebir aynı olanlar → Trendyol maliyet hesabı).
// bh_liste: BizimHesap kart alışı tedarikçideki güncel fiyatın gerisinde kalan ürünler (eklenti BizimHesap'ın kendi
// "Toplu Ürün Güncelleme" Excel'i ile kullanıcının onayıyla yükler); bh_satis_liste: zararına satılanlar (satış fiyatı önerisi);
// bh_stoksuz: tedarikçide stokta olmayan zamlılar (kontrol listesi, hiçbiri seçili gelmez); bh_son: son yüklenen alışlar (geri almak için); bh_yazildi: yüklenenlerin kaydı (bh_alis_log, alan = alis | satis).
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
type Obj = Record<string, unknown>;
const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// marka karşılaştırması Türkçe harfleri sadeleştirir ("FİLTRON" = "FILTRON")
const markaNorm = (s: unknown) => String(s ?? '').toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/[^A-Z0-9]/g, '');
const sayi = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const TEDARIKCILER = new Set(['iron', 'basbug']);

// bizdeki aktif ürünlerin normalize stok kodları (fonksiyon sıcakken 10 dk saklanır)
// tam: kodun tamamı (Iron, Otomarmara gibi bizimle aynı kodlayanlar); govde: marka öneki atılmış kod (Başbuğ "MANN HU 7032 Z" ↔ bizim "MAN-HU7032Z")
type HU = { id: string; kod: string; marka: string; onek: string };
let kodHarita: { tam: Map<string, HU>; govde: Map<string, HU[]> } | null = null; let haritaZaman = 0;
const onekAt = (k: string) => { const t = k.trim(); const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü]{2,6})[\s-]+(.+)$/); return m ? { onek: norm(m[1]), govde: norm(m[2]) } : { onek: '', govde: norm(t) }; };
async function harita() {
  if (kodHarita && Date.now() - haritaZaman < 600_000) return kodHarita;
  const tam = new Map<string, HU>(); const govde = new Map<string, HU[]>();
  for (let i = 0; i < 50000; i += 1000) {
    const { data, error } = await db.from('urunler').select('id,kod,marka').eq('aktif', true).not('kod', 'is', null).order('id').range(i, i + 999);
    if (error) throw new Error(error.message);
    for (const u of data ?? []) {
      const n = norm(u.kod); if (n.length < 3) continue;
      const o = onekAt(String(u.kod)); const hu: HU = { id: u.id as string, kod: u.kod as string, marka: markaNorm(u.marka), onek: o.onek };
      if (!tam.has(n)) tam.set(n, hu);
      if (o.onek && o.govde.length >= 4) { const l = govde.get(o.govde) ?? []; l.push(hu); govde.set(o.govde, l); }
    }
    if (!data || data.length < 1000) break;
  }
  kodHarita = { tam, govde }; haritaZaman = Date.now(); return kodHarita;
}
/** Tedarikçi kodunu bizdeki ürüne bağlar: önce kodun tamamı, olmazsa marka öneki atılmış kod + marka uyumu (tek aday kalırsa) */
function eslestir(h: NonNullable<typeof kodHarita>, kod: string, marka: string | null) {
  const t = h.tam.get(norm(kod)); if (t) return t;
  const o = onekAt(kod); const m = markaNorm(marka);
  const markaUyar = (u: HU) => !!m && !!u.marka && (u.marka === m || u.marka.startsWith(m) || m.startsWith(u.marka));
  let aday: HU[];
  if (o.onek && o.govde.length >= 4) aday = (h.govde.get(o.govde) ?? []).filter((u) => markaUyar(u) || (!!u.onek && (o.onek.startsWith(u.onek) || u.onek.startsWith(o.onek))));
  // tedarikçi kodu marka öneksizse (Başbuğ "1682953780" + marka EUROREPAR ↔ bizim "ERP-1682953780"): yalnız marka uyarsa
  else if (!o.onek && o.govde.length >= 6) aday = (h.govde.get(o.govde) ?? []).filter(markaUyar);
  else return null;
  return aday.length === 1 ? aday[0] : null;
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

/**
 * Kontrol listesi: hiçbir tedarikçide STOKTA olmayan ama okunan en ucuz güncel fiyatı (7 gün) kart alışından %3'ten fazla yüksek ürünler.
 * Stokta olmadığı için fiyat eski/geçici olabilir: eklentide hiçbiri seçili gelmez, kullanıcı kontrol edip doğru olanları seçer.
 */
async function bhStoksuz() {
  const sinir = new Date(Date.now() - 7 * 864e5).toISOString();
  const en = new Map<string, Obj>(); const stoklu = new Set<string>();
  for (let i = 0; i < 50000; i += 1000) {
    const { data, error } = await db.from('tedarikci_maliyet').select('urun_id,tedarikci,kod,fiyat,stok_var,zaman').not('fiyat', 'is', null).gt('zaman', sinir).order('urun_id').range(i, i + 999);
    if (error) throw new Error(error.message);
    for (const t of data ?? []) { const id = t.urun_id as string; const f = Number(t.fiyat); if (!(f > 0)) continue;
      if (t.stok_var === true) { stoklu.add(id); continue; }
      const e = en.get(id); if (!e || f < Number(e.fiyat)) en.set(id, t); }
    if (!data || data.length < 1000) break;
  }
  for (const id of stoklu) en.delete(id); // stokta olan tedarikçisi varsa ana listede (bh_liste) değerlendirilir
  const { data: son } = await db.from('bh_alis_log').select('urun_id').gt('zaman', new Date(Date.now() - 2 * 3600000).toISOString()).limit(5000);
  for (const x of son ?? []) en.delete(x.urun_id as string);
  const ids = [...en.keys()]; const { data: ay } = await db.from('ayarlar').select('alis_kdv_haric').eq('id', 1).maybeSingle(); const kdvHaric = ay?.alis_kdv_haric !== false;
  const out: Obj[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('urunler').select('id,kod,ad,alis_fiyati,kdv,aktif,stok').in('id', ids.slice(i, i + 200));
    for (const u of data ?? []) {
      if (!u.aktif || !u.kod) continue;
      const t = en.get(u.id as string)!; const kdv = Number(u.kdv) || 20; const alis = Number(u.alis_fiyati) || 0;
      const kart = kdvHaric ? alis : alis / (1 + kdv / 100); const yeni = Math.round(Number(t.fiyat) * 100) / 100;
      if (!(kart > 0) || yeni <= kart * 1.03) continue;
      out.push({ urun_id: u.id, kod: u.kod, ad: u.ad, kart: Math.round(kart * 100) / 100, kart_ham: alis, yeni, tedarikci: t.tedarikci, ted_kod: t.kod, zaman: t.zaman, stok: Number(u.stok) || 0, kontrol: yeni > kart * 1.5 });
    }
  }
  return out.sort((a, x) => Number(a.kontrol) - Number(x.kontrol) || (Number(a.yeni) / Number(a.kart)) - (Number(x.yeni) / Number(x.kart)));
}

/**
 * Hedef marjın altında satılan ürünler (zarar = satış fiyatı KDV hariç güncel maliyetin altında). Güncel maliyet = kart alışı ya da tedarikçideki güncel fiyat
 * (sitedeki fiyat uyarısıyla aynı kural: stokta olan en ucuz tedarikçi, yoksa en ucuz; kartı %3–%50 aşıyorsa kullanılır). Öneri = %hedef marj (ayarlar, varsayılan 15) için KDV dahil fiyat, 50 TL'ye yukarı yuvarlanır.
 * Son 48 saatte alışı eklentiyle %50'den fazla yükseltilmiş ve geri alınmamış ürünler "bekle" işaretlenir (önce alış kontrol edilmeli).
 */
const HIZMET_RE = /işçilik|iscilik|hizmet|revizyon|prim\b|primi|montaj|tamir|torna|kaporta|ücret|rektefiye|değişim|degisim/;
async function bhSatisListe() {
  const { data: ay } = await db.from('ayarlar').select('alis_kdv_haric,hedef_marj').eq('id', 1).maybeSingle();
  const kdvHaric = ay?.alis_kdv_haric !== false; const hedef = Math.min(80, Math.max(1, Number(ay?.hedef_marj ?? 15) || 15));
  const urunler: Obj[] = [];
  for (let i = 0; i < 50000; i += 1000) {
    const { data, error } = await db.from('urunler').select('id,kod,ad,kategori,alis_fiyati,satis_fiyati,kdv,stok').eq('aktif', true).gt('alis_fiyati', 0).gt('satis_fiyati', 0).order('id').range(i, i + 999);
    if (error) throw new Error(error.message); urunler.push(...(data ?? [])); if (!data || data.length < 1000) break;
  }
  // sitedeki uyarıyla aynı kapsam: stokta olan ya da stoğu bitmiş ama son 90 günde satılmış ürünler
  const satilan = new Set<string>(); const s90 = new Date(Date.now() - 90 * 864e5).toISOString();
  for (const [tablo, filtre] of [['rapor_satirlari', true], ['hareketler', false]] as const) {
    for (let i = 0; i < 100000; i += 1000) {
      let q = db.from(tablo).select('urun_id').eq('tur', 'satis').gt('tarih', s90).not('urun_id', 'is', null);
      if (filtre) q = q.or('gecersiz.is.null,gecersiz.eq.false');
      const { data, error } = await q.order('id').range(i, i + 999);
      if (error) break; for (const x of data ?? []) satilan.add(x.urun_id as string); if (!data || data.length < 1000) break;
    }
  }
  const tedEn = new Map<string, { fiyat: number; stokta: boolean; tedarikci: string }>();
  for (let i = 0; i < 50000; i += 1000) {
    const { data, error } = await db.from('tedarikci_maliyet').select('urun_id,tedarikci,fiyat,stok_var').not('fiyat', 'is', null).gt('zaman', new Date(Date.now() - 7 * 864e5).toISOString()).order('urun_id').range(i, i + 999);
    if (error) throw new Error(error.message);
    for (const t of data ?? []) { const f = Number(t.fiyat); if (!(f > 0)) continue; const st = t.stok_var === true; const e = tedEn.get(t.urun_id as string);
      if (!e || (st && !e.stokta) || (st === e.stokta && f < e.fiyat)) tedEn.set(t.urun_id as string, { fiyat: f, stokta: st, tedarikci: String(t.tedarikci) }); }
    if (!data || data.length < 1000) break;
  }
  const { data: log } = await db.from('bh_alis_log').select('urun_id,eski,yeni,alan,zaman,tedarikci').gt('zaman', new Date(Date.now() - 48 * 3600000).toISOString()).order('zaman', { ascending: false }).limit(5000);
  const sonAlis = new Map<string, Obj>(); const sonSatis = new Set<string>();
  for (const x of log ?? []) { const id = x.urun_id as string; if (!id) continue;
    if (x.alan === 'satis') { if (Date.now() - new Date(x.zaman as string).getTime() < 2 * 3600000) sonSatis.add(id); }
    else if (!sonAlis.has(id)) sonAlis.set(id, x); }
  const out: Obj[] = [];
  for (const u of urunler) {
    const id = u.id as string; if (!(Number(u.stok) > 0) && !satilan.has(id)) continue;
    if (!u.kod || !u.kategori || sonSatis.has(id) || HIZMET_RE.test(String(u.ad ?? '').toLocaleLowerCase('tr'))) continue;
    const kdv = Number(u.kdv) || 20; const alis = Number(u.alis_fiyati); const kart = kdvHaric ? alis : alis / (1 + kdv / 100);
    const t = tedEn.get(id); const tedKullan = !!t && t.fiyat > kart * 1.03 && t.fiyat <= kart * 1.5; const maliyet = tedKullan ? t!.fiyat : kart;
    const satis = Number(u.satis_fiyati); const net = satis / (1 + kdv / 100);
    const marj = ((net - maliyet) / net) * 100;
    if (marj >= hedef - 0.5) continue; // hedef marjın altında kalanlar (zararına olanlar dahil)
    const oneri = Math.ceil((maliyet / (1 - hedef / 100)) * (1 + kdv / 100) / 50) * 50;
    const l = sonAlis.get(id); const bekle = !!l && l.tedarikci !== 'geri_al' && Number(l.yeni) > Number(l.eski) * 1.5 && Math.abs(alis - Number(l.yeni)) <= Math.max(0.05, Number(l.yeni) * 0.01);
    out.push({ urun_id: id, kod: u.kod, ad: u.ad, alis: Math.round(maliyet * 100) / 100, kart: Math.round(kart * 100) / 100, kaynak: tedKullan ? t!.tedarikci : null, kart_ham: satis, yeni: oneri, marj: Math.round(marj * 10) / 10, zarar: net < maliyet, bekle, hedef });
  }
  return out.sort((a, x) => Number(a.bekle) - Number(x.bekle) || Number(a.marj) - Number(x.marj));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const b = await req.json().catch(() => ({})) as Obj;
  const { data: a } = await db.from('eklenti_anahtar').select('anahtar').eq('id', 1).maybeSingle();
  if (!a?.anahtar || typeof b.anahtar !== 'string' || b.anahtar.trim() !== a.anahtar) return yanit({ ok: false, hata: 'Eklenti anahtarı yanlış' }, 401);
  if (b.islem === 'bh_liste') return yanit({ ok: true, liste: await bhListe() });
  if (b.islem === 'bh_stoksuz') return yanit({ ok: true, liste: await bhStoksuz() });
  if (b.islem === 'bh_satis_liste') return yanit({ ok: true, liste: await bhSatisListe() });
  if (b.islem === 'bh_son') {
    // son 48 saatte eklentiyle yüklenen ve BizimHesap kartında hâlâ o değerde duran alış fiyatları (geri almak için)
    const { data: l } = await db.from('bh_alis_log').select('urun_id,kod,ad,eski,yeni,tedarikci,zaman').gt('zaman', new Date(Date.now() - 48 * 3600000).toISOString()).neq('tedarikci', 'geri_al').eq('alan', 'alis').order('zaman', { ascending: false }).limit(2000);
    const ids = [...new Set((l ?? []).map((x) => x.urun_id as string).filter(Boolean))]; const mevcut = new Map<string, number>();
    for (let i = 0; i < ids.length; i += 200) { const { data } = await db.from('urunler').select('id,alis_fiyati').in('id', ids.slice(i, i + 200)); for (const u of data ?? []) mevcut.set(u.id as string, Number(u.alis_fiyati)); }
    const gor = new Set<string>(); const out: Obj[] = [];
    for (const x of l ?? []) { const id = x.urun_id as string; if (!id || gor.has(id)) continue; gor.add(id); const m = mevcut.get(id); const yeni = Number(x.yeni), eski = Number(x.eski);
      if (m === undefined || Math.abs(m - yeni) > Math.max(0.05, yeni * 0.01)) continue;
      out.push({ urun_id: id, kod: x.kod, ad: x.ad, eski, yeni, tedarikci: x.tedarikci, zaman: x.zaman, supheli: eski > 0 && yeni > eski * 1.5 }); }
    return yanit({ ok: true, liste: out.sort((a, x) => Number(x.supheli) - Number(a.supheli) || (Number(x.yeni) / Math.max(0.01, Number(x.eski))) - (Number(a.yeni) / Math.max(0.01, Number(a.eski)))) });
  }
  if (b.islem === 'bh_yazildi') {
    const l = (Array.isArray(b.kalemler) ? b.kalemler as Obj[] : []).slice(0, 2000).map((x) => ({ urun_id: typeof x.urun_id === 'string' ? x.urun_id : null, kod: String(x.kod ?? '').slice(0, 80), ad: x.ad ? String(x.ad).slice(0, 250) : null, eski: sayi(x.eski), yeni: sayi(x.yeni), tedarikci: x.tedarikci ? String(x.tedarikci).slice(0, 20) : null, alan: x.alan === 'satis' ? 'satis' : 'alis' }));
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
  const h = await harita(); const sec = new Map<string, Obj>(); const bizimKod = new Map<string, string>(); const eslesen: { kod: string; bizim: string; fiyat: number | null }[] = [];
  for (const x of tekil) {
    const u = eslestir(h, x.kod, x.marka); if (!u || !(x.fiyat && x.fiyat > 0)) continue;
    bizimKod.set(u.id, u.kod);
    const stokta = (x.stok ?? 0) > 0; const e = sec.get(u.id);
    if (!e || (stokta && !e.stok_var) || (stokta === e.stok_var && x.fiyat < Number(e.fiyat))) sec.set(u.id, { urun_id: u.id, tedarikci: ted, kod: x.kod, ad: x.ad, fiyat: Math.round(x.fiyat * 100) / 100, stok_var: stokta, ham: { liste: x.liste, stok: x.stok, depolar: x.depolar }, hata: null, zaman });
  }
  if (sec.size) { const { error: e2 } = await db.from('tedarikci_maliyet').upsert([...sec.values()]); if (e2) return yanit({ ok: false, hata: e2.message }, 500); }
  for (const s of sec.values()) eslesen.push({ kod: String(s.kod), bizim: bizimKod.get(String(s.urun_id)) ?? String(s.kod), fiyat: Number(s.fiyat) });
  return yanit({ ok: true, kaydedilen: tekil.length, eslesen });
});
