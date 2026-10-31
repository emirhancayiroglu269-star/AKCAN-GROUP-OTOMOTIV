// Kullanıcı giriş hesabı yönetimi (Supabase Edge Function): yalnız YÖNETİCİ çağırabilir.
// islem 'olustur': e-posta + şifre ile giriş hesabı açar (e-posta onayı gerekmez) ve kullanicilar listesine ekler/günceller.
// islem 'sifre':   listedeki bir kullanıcının şifresini değiştirir.
// Şifreyi yönetici sitede kendisi yazar; hiçbir yerde saklanmaz ya da kaydedilmez.
import { createClient } from 'npm:@supabase/supabase-js@2';

const URL = Deno.env.get('SUPABASE_URL')!;
const db = createClient(URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
type Obj = Record<string, unknown>;
const ROLLER = new Set(['yonetici', 'kasiyer', 'teknisyen']);

async function kullaniciBul(eposta: string) {
  for (let sayfa = 1; sayfa <= 20; sayfa++) {
    const { data, error } = await db.auth.admin.listUsers({ page: sayfa, perPage: 200 });
    if (error) throw new Error(error.message);
    const u = data.users.find((x) => (x.email ?? '').toLowerCase() === eposta);
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Obj, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    // çağıran: giriş yapmış ve kullanicilar listesinde aktif yönetici (liste boşsa herkes yönetici sayılır — benim_rolum ile aynı kural)
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: ben } = await db.auth.getUser(jwt);
    const benEposta = (ben?.user?.email ?? '').toLowerCase();
    if (!benEposta) return yanit({ ok: false, hata: 'Giriş gerekli' }, 401);
    const { count } = await db.from('kullanicilar').select('id', { count: 'exact', head: true });
    if (count) {
      const { data: k } = await db.from('kullanicilar').select('rol,aktif').ilike('eposta', benEposta).maybeSingle();
      if (!k || !k.aktif || k.rol !== 'yonetici') return yanit({ ok: false, hata: 'Bu işlem için yönetici yetkisi gerekli' }, 403);
    }

    const b = await req.json().catch(() => ({})) as Obj;
    const eposta = String(b.eposta ?? '').trim().toLowerCase();
    const sifre = String(b.sifre ?? '');
    if (!/^\S+@\S+\.\S+$/.test(eposta)) return yanit({ ok: false, hata: 'Geçerli bir e-posta girin' }, 400);
    if (sifre.length < 6) return yanit({ ok: false, hata: 'Şifre en az 6 karakter olmalı' }, 400);

    if (b.islem === 'olustur') {
      const rol = ROLLER.has(String(b.rol)) ? String(b.rol) : 'kasiyer';
      const ad = b.ad ? String(b.ad).trim().slice(0, 80) : null;
      const var_ = await kullaniciBul(eposta);
      if (var_) {
        const { error } = await db.auth.admin.updateUserById(var_.id, { password: sifre, email_confirm: true });
        if (error) return yanit({ ok: false, hata: error.message }, 400);
      } else {
        const { error } = await db.auth.admin.createUser({ email: eposta, password: sifre, email_confirm: true, user_metadata: ad ? { ad } : {} });
        if (error) return yanit({ ok: false, hata: error.message }, 400);
      }
      // ilk kayıtta çağıran yönetici de listeye eklenir (kendini kilitlemesin)
      if (!count && benEposta !== eposta) await db.from('kullanicilar').insert({ eposta: benEposta, rol: 'yonetici', aktif: true });
      const { data: mevcut } = await db.from('kullanicilar').select('id').ilike('eposta', eposta).maybeSingle();
      const { error: e2 } = mevcut
        ? await db.from('kullanicilar').update({ rol, aktif: true, ...(ad ? { ad } : {}) }).eq('id', mevcut.id)
        : await db.from('kullanicilar').insert({ eposta, ad, rol, aktif: true });
      if (e2) return yanit({ ok: false, hata: e2.message }, 500);
      return yanit({ ok: true, vardi: !!var_ });
    }

    if (b.islem === 'sifre') {
      const { data: k } = await db.from('kullanicilar').select('id').ilike('eposta', eposta).maybeSingle();
      if (!k) return yanit({ ok: false, hata: 'Bu e-posta kullanıcı listesinde yok' }, 400);
      const u = await kullaniciBul(eposta);
      if (!u) {
        const { error } = await db.auth.admin.createUser({ email: eposta, password: sifre, email_confirm: true });
        if (error) return yanit({ ok: false, hata: error.message }, 400);
        return yanit({ ok: true, olusturuldu: true });
      }
      const { error } = await db.auth.admin.updateUserById(u.id, { password: sifre, email_confirm: true });
      if (error) return yanit({ ok: false, hata: error.message }, 400);
      return yanit({ ok: true });
    }
    return yanit({ ok: false, hata: 'Bilinmeyen işlem' }, 400);
  } catch (e) {
    return yanit({ ok: false, hata: (e as Error).message.slice(0, 300) }, 500);
  }
});
