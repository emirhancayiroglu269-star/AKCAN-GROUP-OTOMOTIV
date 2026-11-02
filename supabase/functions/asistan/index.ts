// Asistan (Supabase Edge Function): Claude API ile işletme verisi üzerinde soru-cevap ve her sabah inceleme.
// Güvenlik: yalnız aktif YÖNETİCİ (ya da zamanlayıcı anahtarı) çağırabilir. Asistanın veri araçları salt-okunurdur (asistan_veri RPC);
// yazabildiği tek şey hafıza notu ve ONAY BEKLEYEN öneridir. BizimHesap'a ya da stok/fiyata kendi başına hiçbir şey yazmaz.
// Anahtar: Supabase > Edge Functions > Secrets > ANTHROPIC_API_KEY (kullanıcı kendisi girer; kodda ya da veritabanında tutulmaz).
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zamanlayici' };
type Obj = Record<string, unknown>;
const MODEL = Deno.env.get('ASISTAN_MODEL') || 'claude-sonnet-5-5';
const AKSIYONLAR = ['siparis', 'alma', 'kampanya', 'iade', 'beklet', 'tahsilat_notu'];

const ARACLAR = [
  { name: 'satis_ozet', description: 'Son N günün satış özeti: KDV dahil/hariç ciro, brüt kâr (KDV hariç), fiş ve kalem sayısı; 31 güne kadar günlük döküm.', input_schema: { type: 'object', properties: { gun: { type: 'integer', minimum: 1, maximum: 365 } }, required: ['gun'] } },
  { name: 'en_cok_satanlar', description: 'Son N günde en çok satan ürünler (adet ya da tutara göre), kârı ve şu anki stoğu.', input_schema: { type: 'object', properties: { gun: { type: 'integer' }, limit: { type: 'integer', maximum: 30 }, siralama: { type: 'string', enum: ['adet', 'tutar'] } }, required: ['gun'] } },
  { name: 'urun_bul', description: 'Stok kodu, barkod ya da ad/marka/araç kelimeleriyle ürün arar; stok, depo stokları, raf, alış (KDV hariç) ve satış (KDV dahil) fiyatı döner.', input_schema: { type: 'object', properties: { sorgu: { type: 'string' } }, required: ['sorgu'] } },
  { name: 'tedarikci_fiyatlari', description: 'Bir stok kodu için tedarikçilerin son 30 günde okunan fiyatları (KDV hariç birim alış), stok durumu ve kart alışı.', input_schema: { type: 'object', properties: { kod: { type: 'string' } }, required: ['kod'] } },
  { name: 'tahsilat_durumu', description: 'Vadesi geçmiş alacaklar (en büyük 20), toplamı ve son 30 günün tahsilat notları / ödeme sözleri.', input_schema: { type: 'object', properties: {} } },
  { name: 'stok_uyarilari', description: 'Kritik seviyenin altına düşen ürünler, eksi stoklar ve açık stok planları (sipariş, alma vb.).', input_schema: { type: 'object', properties: {} } },
  { name: 'olu_stok', description: '180 gündür satılmayan stoklu ürünler, stok değerine göre (KDV hariç).', input_schema: { type: 'object', properties: { limit: { type: 'integer', maximum: 30 } } } },
  { name: 'hafiza_kaydet', description: 'Kullanıcının verdiği kalıcı bir kararı ya da bilgiyi hafızaya yazar (ör. "Areon koku artık alınmayacak"). Yalnız kullanıcı açıkça söylediğinde kullan.', input_schema: { type: 'object', properties: { metin: { type: 'string', maxLength: 300 } }, required: ['metin'] } },
  { name: 'oneri_olustur', description: 'Kullanıcının ONAYINA sunulacak bir öneri yazar. Onaylanmadan hiçbir şey değişmez. İsteğe bağlı aksiyon onaylanınca uygulanır: siparis/alma/kampanya/iade/beklet (urun_kod ile stok planı) ya da tahsilat_notu (cari ile not).', input_schema: { type: 'object', properties: {
    baslik: { type: 'string', maxLength: 120 }, aciklama: { type: 'string', maxLength: 600 }, oncelik: { type: 'integer', minimum: 1, maximum: 3, description: '1 acil, 2 normal, 3 bilgi' },
    aksiyon: { type: 'object', properties: { tip: { type: 'string', enum: AKSIYONLAR }, urun_kod: { type: 'string' }, cari: { type: 'string' }, not: { type: 'string', maxLength: 300 } }, required: ['tip'] },
  }, required: ['baslik', 'aciklama'] } },
];

async function aracCalistir(ad: string, girdi: Obj, ctx: { kullanici: string; kaynak: string; sayac: { oneri: number } }): Promise<string> {
  try {
    if (ad === 'hafiza_kaydet') {
      const metin = String(girdi.metin ?? '').trim().slice(0, 300); if (metin.length < 2) return 'Boş not kaydedilmedi.';
      const { error } = await db.from('asistan_hafiza').insert({ metin, kaynak: 'asistan', kullanici: ctx.kullanici }); if (error) throw error;
      return 'Hafızaya kaydedildi.';
    }
    if (ad === 'oneri_olustur') {
      if (ctx.sayac.oneri >= 8) return 'Bu turda öneri sınırına ulaşıldı (8).';
      const baslik = String(girdi.baslik ?? '').trim().slice(0, 120); if (!baslik) return 'Başlık boş.';
      // aynı başlıkla son 3 günde açık öneri varsa tekrar yazma
      const { data: v } = await db.from('asistan_oneri').select('id').eq('baslik', baslik).gt('zaman', new Date(Date.now() - 3 * 864e5).toISOString()).limit(1);
      if (v?.length) return 'Bu öneri zaten listede, tekrar yazılmadı.';
      const a = girdi.aksiyon as Obj | undefined;
      const aksiyon = a && AKSIYONLAR.includes(String(a.tip)) ? { tip: String(a.tip), urun_kod: a.urun_kod ? String(a.urun_kod).slice(0, 80) : null, cari: a.cari ? String(a.cari).slice(0, 200) : null, not: a.not ? String(a.not).slice(0, 300) : null } : null;
      const { error } = await db.from('asistan_oneri').insert({ baslik, aciklama: String(girdi.aciklama ?? '').slice(0, 600), oncelik: Math.min(3, Math.max(1, Number(girdi.oncelik) || 2)), aksiyon, kaynak: ctx.kaynak, kullanici: ctx.kullanici });
      if (error) throw error; ctx.sayac.oneri++;
      return 'Öneri onaya sunuldu.';
    }
    const { data, error } = await db.rpc('asistan_veri', { p_arac: ad, p: girdi ?? {} });
    if (error) throw error;
    const s = JSON.stringify(data); return s.length > 7000 ? s.slice(0, 7000) + '…(kısaltıldı)' : s;
  } catch (e) { return `Hata: ${(e as Error).message?.slice(0, 200) ?? e}`; }
}

async function sistemMetni(ek: string) {
  const [{ data: ay }, { data: h }] = await Promise.all([
    db.from('ayarlar').select('firma_adi,hedef_marj').eq('id', 1).maybeSingle(),
    db.from('asistan_hafiza').select('metin,kaynak,olusturma').eq('aktif', true).order('olusturma', { ascending: false }).limit(80),
  ]);
  const bugun = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hafiza = (h ?? []).map((x) => `- ${x.metin}${x.kaynak === 'karar' ? ' (kullanıcı kararı)' : ''}`).join('\n') || '(henüz not yok)';
  return `Sen ${ay?.firma_adi ?? 'bu işletme'} adlı yedek parça dükkânının işletme asistanısın. Dükkân BizimHesap kullanıyor; iki depo var (Sultanbeyli ve Velibaba).
Bugün: ${bugun}. Hedef brüt marj: %${ay?.hedef_marj ?? 15}.

Kurallar:
- Türkçe, kısa ve net yaz; tezgâhta okunacak gibi. Gereksiz giriş cümlesi kurma.
- Rakamları ASLA tahmin etme: her sayı için araçları kullan. Araçta olmayan bir şeyi bilmediğini söyle.
- Tutarlarda KDV dahil mi hariç mi olduğunu belirt. Para birimi ₺, Türkçe sayı biçimi (1.234,56).
- Verileri değiştiremezsin. Bir işlem gerekiyorsa (sipariş, kampanya, tahsilat hatırlatması vb.) oneri_olustur ile kullanıcının onayına sun; "yaptım" deme, "onayınıza sundum" de.
- Kullanıcı kalıcı bir karar söylerse (ör. "bu ürünü artık almayacağız") hafiza_kaydet ile kaydet.
- Aşağıdaki hafıza notlarına uy; bir notla çelişen öneri yapma.
${ek}

Hafıza notları:
${hafiza}`;
}

async function claude(sistem: string, mesajlar: Obj[], ctx: { kullanici: string; kaynak: string; sayac: { oneri: number } }) {
  const anahtar = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anahtar) throw Object.assign(new Error('Asistan için Anthropic API anahtarı henüz girilmemiş (Supabase > Edge Functions > Secrets > ANTHROPIC_API_KEY).'), { anahtarYok: true });
  const msj = [...mesajlar]; let son = '';
  for (let tur = 0; tur < 7; tur++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': anahtar, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: sistem, tools: ARACLAR, messages: msj }),
    });
    const j = await r.json().catch(() => ({})) as Obj;
    if (!r.ok) { const h = (j.error as Obj)?.message ?? `HTTP ${r.status}`; throw new Error(`Claude API: ${String(h).slice(0, 200)}`); }
    const icerik = (j.content as Obj[]) ?? [];
    son = icerik.filter((b) => b.type === 'text').map((b) => String(b.text)).join('\n').trim() || son;
    if (j.stop_reason !== 'tool_use') return son || '(boş cevap)';
    msj.push({ role: 'assistant', content: icerik });
    const sonuclar: Obj[] = [];
    for (const b of icerik) if (b.type === 'tool_use') sonuclar.push({ type: 'tool_result', tool_use_id: b.id, content: await aracCalistir(String(b.name), (b.input as Obj) ?? {}, ctx) });
    msj.push({ role: 'user', content: sonuclar });
  }
  return son || 'Bu soru için çok fazla adım gerekti; soruyu daraltır mısınız?';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const b = await req.json().catch(() => ({})) as Obj;
    // yetki: zamanlayıcı (sabah incelemesi) ya da aktif yönetici
    let kullanici = '';
    const zam = req.headers.get('x-zamanlayici');
    if (zam) {
      const { data: g } = await db.from('ty_gizli').select('anahtar').eq('id', 1).maybeSingle();
      if (!g?.anahtar || g.anahtar !== zam) return yanit({ ok: false, hata: 'Yetkisiz' }, 401);
      kullanici = 'zamanlayıcı';
    } else {
      const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      const { data: ben } = await db.auth.getUser(jwt); const eposta = (ben?.user?.email ?? '').toLowerCase();
      if (!eposta) return yanit({ ok: false, hata: 'Giriş gerekli' }, 401);
      const { count } = await db.from('kullanicilar').select('id', { count: 'exact', head: true });
      if (count) { const { data: k } = await db.from('kullanicilar').select('rol,aktif').ilike('eposta', eposta).maybeSingle(); if (!k?.aktif || k.rol !== 'yonetici') return yanit({ ok: false, hata: 'Asistan yalnız yöneticiye açık' }, 403); }
      kullanici = eposta;
    }

    if (b.islem === 'durum') return yanit({ ok: true, anahtar: !!Deno.env.get('ANTHROPIC_API_KEY'), model: MODEL });

    if (b.islem === 'sor') {
      if (kullanici === 'zamanlayıcı') return yanit({ ok: false, hata: 'Yetkisiz' }, 401);
      const mesaj = String(b.mesaj ?? '').trim().slice(0, 2000); if (!mesaj) return yanit({ ok: false, hata: 'Mesaj boş' }, 400);
      const { data: g } = await db.from('asistan_mesaj').select('rol,metin').eq('kullanici', kullanici).order('zaman', { ascending: false }).limit(10);
      const gecmis = (g ?? []).reverse().map((x) => ({ role: x.rol, content: x.metin }));
      while (gecmis.length && gecmis[0].role !== 'user') gecmis.shift();
      const ctx = { kullanici, kaynak: 'sohbet', sayac: { oneri: 0 } };
      const cevap = await claude(await sistemMetni('Şu an kullanıcıyla sohbet ediyorsun; sorusunu cevapla.'), [...gecmis, { role: 'user', content: mesaj }], ctx);
      await db.from('asistan_mesaj').insert([{ kullanici, rol: 'user', metin: mesaj }, { kullanici, rol: 'assistant', metin: cevap.slice(0, 8000) }]);
      return yanit({ ok: true, cevap, oneri: ctx.sayac.oneri });
    }

    if (b.islem === 'sabah') {
      const { data: acik } = await db.from('asistan_oneri').select('baslik').eq('durum', 'yeni').order('zaman', { ascending: false }).limit(40);
      const ctx = { kullanici, kaynak: 'sabah', sayac: { oneri: 0 } };
      const ek = `Şu an SABAH İNCELEMESİ yapıyorsun; kullanıcı yok. Dünkü ve son 7 günün satışlarına, tahsilata, stok uyarılarına ve ölü stoğa bak.
Gerçekten işe yarar en fazla 6 bulguyu oneri_olustur ile yaz (her biri somut, kısa, ne yapılacağı belli). Önemsiz ya da zaten bilinen şeyleri yazma.
Şu an onay bekleyen öneriler (tekrar yazma): ${(acik ?? []).map((x) => x.baslik).join(' | ') || 'yok'}
Bitince tek paragraf özet yaz.`;
      const ozet = await claude(await sistemMetni(ek), [{ role: 'user', content: 'Sabah incelemesini yap.' }], ctx);
      return yanit({ ok: true, ozet, oneri: ctx.sayac.oneri });
    }

    if (b.islem === 'sohbet_temizle') {
      if (kullanici === 'zamanlayıcı') return yanit({ ok: false, hata: 'Yetkisiz' }, 401);
      await db.from('asistan_mesaj').delete().eq('kullanici', kullanici);
      return yanit({ ok: true });
    }
    return yanit({ ok: false, hata: 'Bilinmeyen işlem' }, 400);
  } catch (e) {
    const err = e as Error & { anahtarYok?: boolean };
    return yanit({ ok: false, hata: err.message?.slice(0, 300) ?? String(e), anahtar_yok: !!err.anahtarYok }, err.anahtarYok ? 200 : 500);
  }
});
