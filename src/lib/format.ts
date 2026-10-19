const tl = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
export const para = (n: number) => tl.format(Number.isFinite(n) ? n : 0);
const sayiB = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
export const sayi = (n: number) => sayiB.format(n || 0);
export const tarih = (s?: string | null) => (s ? new Date(s).toLocaleDateString('tr-TR') : '—');
export const tarihSaat = (s?: string | null) =>
  s ? new Date(s).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const bugunMu = (s: string) => new Date(s).toDateString() === new Date().toDateString();
export const yuvarla = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Türkçe virgüllü girişi sayıya çevirir: "1.250,50" → 1250.5 */
export const parse = (v: string | number) => {
  if (typeof v === 'number') return v;
  const s = v.trim(); if (!s) return 0;
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : 0;
};
export const ara = (metin: string, ...alanlar: (string | null | undefined)[]) => {
  const q = metin.trim().toLocaleLowerCase('tr');
  if (!q) return true;
  const hay = alanlar.filter(Boolean).join(' ').toLocaleLowerCase('tr');
  return q.split(/\s+/).every((p) => hay.includes(p));
};
export const telLink = (tel?: string | null) => {
  const d = (tel || '').replace(/\D/g, '');
  if (!d) return null;
  return d.startsWith('90') ? d : d.startsWith('0') ? '9' + d : '90' + d;
};
/** Kod karşılaştırması için: harf/rakam dışındakileri at, büyük harf ('4246.R1' = '424 6r1') */
export const kodNorm = (s?: string | null) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
/** Yerel saatle YYYY-MM-DD */
const gunOnb = new Map<string, string>();
const gunHesap = (d: Date) => (Number.isNaN(d.getTime()) ? 'Invalid Date' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
export const gunu = (s: string | Date = new Date()) => {
  if (typeof s !== 'string') return gunHesap(new Date(s));
  let r = gunOnb.get(s); if (r === undefined) { r = gunHesap(new Date(s)); if (gunOnb.size > 50000) gunOnb.clear(); gunOnb.set(s, r); } return r;
};
