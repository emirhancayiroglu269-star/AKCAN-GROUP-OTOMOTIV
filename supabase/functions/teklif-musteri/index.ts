// Müşteri teklif linki (Supabase Edge Function, giriş gerektirmez).
// GET  ?kod=XXXX  → teklifin müşteriye gösterilecek hali (alış fiyatı, tedarikçi, ürün id'si, personel adı GÖNDERİLMEZ)
// POST {kod, yanit: 'onay'|'red'|'revizyon', not?} → müşterinin yanıtını kaydeder (teklif açıkken)
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
type Obj = Record<string, unknown>;
const YANIT = new Set(['onay', 'red', 'revizyon']);
const KOD = /^[A-Za-z0-9]{10,32}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  try {
    const b = req.method === 'POST' ? await req.json().catch(() => ({})) as Obj : {};
    const kod = String(req.method === 'POST' ? b.kod ?? '' : new URL(req.url).searchParams.get('kod') ?? '');
    if (!KOD.test(kod)) return yanit({ ok: false, hata: 'Geçersiz bağlantı' }, 400);
    const { data: t, error } = await db.from('fiyat_teklifleri')
      .select('id,zaman,musteri,arac,kalemler,toplam,durum,gecerlilik,musteri_yanit,musteri_not,yanit_zaman,goruntulenme,ilk_goruntu').eq('kod', kod).maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) return yanit({ ok: false, hata: 'Teklif bulunamadı' }, 404);
    const suresiDoldu = !!t.gecerlilik && new Date(`${t.gecerlilik}T23:59:59+03:00`).getTime() < Date.now();

    if (req.method === 'POST') {
      const y = String(b.yanit ?? '');
      if (!YANIT.has(y)) return yanit({ ok: false, hata: 'Geçersiz yanıt' }, 400);
      if (t.durum !== 'acik') return yanit({ ok: false, hata: 'Bu teklif kapatılmış' }, 409);
      if (suresiDoldu) return yanit({ ok: false, hata: 'Teklifin geçerlilik süresi dolmuş' }, 409);
      const not = String(b.not ?? '').trim().slice(0, 500) || null;
      if (y === 'revizyon' && !not) return yanit({ ok: false, hata: 'Lütfen ne değişsin yazın' }, 400);
      const { error: e2 } = await db.from('fiyat_teklifleri').update({ musteri_yanit: y, musteri_not: not, yanit_zaman: new Date().toISOString() }).eq('id', t.id);
      if (e2) throw new Error(e2.message);
      return yanit({ ok: true });
    }

    const simdi = new Date().toISOString();
    await db.from('fiyat_teklifleri').update({ goruntulenme: (t.goruntulenme ?? 0) + 1, ilk_goruntu: t.ilk_goruntu ?? simdi, son_goruntu: simdi }).eq('id', t.id);
    const { data: a } = await db.from('ayarlar').select('firma_adi,telefon,adres').eq('id', 1).maybeSingle();
    const kalemler = (Array.isArray(t.kalemler) ? t.kalemler : []).map((k: Obj) => ({
      ad: String(k.ad ?? ''), marka: k.marka ? String(k.marka) : null, adet: Number(k.adet) || 0, fiyat: Number(k.fiyat) || 0,
      ekonomik: !!k.ekonomik, stokta: typeof k.stokta === 'boolean' ? k.stokta : null,
    }));
    return yanit({ ok: true, teklif: {
      no: t.id, tarih: t.zaman, musteri: t.musteri, arac: t.arac, kalemler, toplam: Number(t.toplam) || 0,
      gecerlilik: t.gecerlilik, suresi_doldu: suresiDoldu, kapali: t.durum !== 'acik',
      yanit: t.musteri_yanit, yanit_not: t.musteri_not, yanit_zaman: t.yanit_zaman,
    }, firma: { ad: a?.firma_adi ?? '', telefon: a?.telefon ?? null, adres: a?.adres ?? null } });
  } catch (e) {
    return yanit({ ok: false, hata: (e as Error).message.slice(0, 200) }, 500);
  }
});
