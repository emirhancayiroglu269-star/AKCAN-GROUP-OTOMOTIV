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

/** Teşhis: telefonda açılış aşamalarını ve sürelerini kaydet (yalnız ilk 60 sn, mobil cihazlarda) */
const basla = performance.now(); const asamalar: string[] = [];
let gonderildi = false;
export function asama(ad: string) {
  if (!/iPhone|iPad|Android|Mobile/i.test(navigator.userAgent) || performance.now() - basla > 60000) return;
  asamalar.push(`${Math.round(performance.now() - basla)}ms ${ad}`);
}
if (typeof window !== 'undefined') setTimeout(() => {
  if (gonderildi || !/iPhone|iPad|Android|Mobile/i.test(navigator.userAgent)) return; gonderildi = true;
  fetch(URL_ + '/rest/v1/istemci_hata', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ mesaj: 'teşhis 25sn: ' + (document.body.innerText || '').slice(0, 200).replace(/\s+/g, ' '), yigin: asamalar.join('\n'), ua: navigator.userAgent.slice(0, 300), sayfa: location.hash.slice(0, 100) }) }).catch(() => undefined);
}, 25000);
