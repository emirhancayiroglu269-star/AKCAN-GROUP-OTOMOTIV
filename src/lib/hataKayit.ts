import { SUPABASE_ANON_KEY, SUPABASE_URL } from './baglanti';

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL;
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_ANON_KEY;
let son = 0;
/** Tarayıcıda oluşan hatayı veritabanına yaz (telefon gibi konsolu görülemeyen cihazlarda sorunu bulmak için) */
export function hataKaydet(e: unknown, ek = '') {
  try {
    if (Date.now() - son < 3000) return; son = Date.now();
    const err = e instanceof Error ? e : new Error(String((e as { message?: string })?.message ?? e));
    fetch(URL_ + '/rest/v1/istemci_hata', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ mesaj: (ek ? ek + ': ' : '') + String(err.message).slice(0, 500), yigin: String(err.stack ?? '').slice(0, 3000), ua: navigator.userAgent.slice(0, 300), sayfa: location.hash.slice(0, 100) }) }).catch(() => undefined);
  } catch { /* yok */ }
}

/** Teşhis: telefonda açılış aşamalarını kaydet. Sekme çökse bile son ulaşılan aşama görünsün diye her aşama anında gönderilir
 *  (yalnız mobil cihazlarda, açılışın ilk 90 sn'si, 10 dakikada en fazla 4 açılış). */
const basla = performance.now(); const oturum = Math.random().toString(36).slice(2, 7);
const mobil = typeof navigator !== 'undefined' && /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
let gonderilen = 0;
const izinli = (() => {
  if (!mobil) return false;
  try { const t = Date.now(); const l = (JSON.parse(localStorage.getItem('teshis') || '[]') as number[]).filter((x) => t - x < 600000); if (l.length >= 4) return false; l.push(t); localStorage.setItem('teshis', JSON.stringify(l)); } catch { /* yok */ }
  return true;
})();
export function asama(ad: string) {
  if (!izinli || gonderilen >= 40 || performance.now() - basla > 90000) return; gonderilen++;
  try {
    fetch(URL_ + '/rest/v1/istemci_hata', { method: 'POST', keepalive: true, headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ mesaj: `teşhis ${oturum} ${Math.round(performance.now() - basla)}ms ${ad}`.slice(0, 300), yigin: null, ua: navigator.userAgent.slice(0, 300), sayfa: location.hash.slice(0, 100) }) }).catch(() => undefined);
  } catch { /* yok */ }
}
/** bir hesaplamanın başını ve sonunu (süresiyle) kaydet */
export function olc<T>(ad: string, f: () => T): T {
  if (!izinli) return f();
  asama(ad + ' basladi'); const t = performance.now(); const x = f(); asama(`${ad} bitti ${Math.round(performance.now() - t)}ms`); return x;
}
asama('basladi');
