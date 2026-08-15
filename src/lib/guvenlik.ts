// Client-side security hardening. Server-side authentication remains authoritative.
const LOGIN_LIMIT_KEY = "akcan-giris-limit";
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const oku = () => {
  try {
    const raw = localStorage.getItem(LOGIN_LIMIT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
};

const yaz = (value: any) => {
  try { localStorage.setItem(LOGIN_LIMIT_KEY, JSON.stringify(value)); } catch {}
};

const anahtar = (kullaniciAdi: string) => String(kullaniciAdi || "").trim().toLocaleLowerCase("tr-TR").slice(0, 120);

export const girisKilidiDurumu = (kullaniciAdi: string) => {
  const key = anahtar(kullaniciAdi);
  if (!key) return { kilitli: false, kalanMs: 0, kalanDeneme: MAX_FAILURES };
  const all = oku();
  const kayit = all[key];
  if (!kayit) return { kilitli: false, kalanMs: 0, kalanDeneme: MAX_FAILURES };
  const now = Date.now();
  if (kayit.kilitBitis && kayit.kilitBitis > now) {
    return { kilitli: true, kalanMs: kayit.kilitBitis - now, kalanDeneme: 0 };
  }
  if (kayit.kilitBitis && kayit.kilitBitis <= now) {
    delete all[key];
    yaz(all);
    return { kilitli: false, kalanMs: 0, kalanDeneme: MAX_FAILURES };
  }
  return { kilitli: false, kalanMs: 0, kalanDeneme: Math.max(0, MAX_FAILURES - (Number(kayit.hata) || 0)) };
};

export const girisBasarisiz = (kullaniciAdi: string) => {
  const key = anahtar(kullaniciAdi);
  if (!key) return girisKilidiDurumu(key);
  const all = oku();
  const onceki = all[key] || { hata: 0 };
  const hata = (Number(onceki.hata) || 0) + 1;
  const kayit: any = { hata, sonHata: Date.now() };
  if (hata >= MAX_FAILURES) kayit.kilitBitis = Date.now() + LOCKOUT_MS;
  all[key] = kayit;
  yaz(all);
  return girisKilidiDurumu(key);
};

export const girisBasarili = (kullaniciAdi: string) => {
  const key = anahtar(kullaniciAdi);
  if (!key) return;
  const all = oku();
  delete all[key];
  yaz(all);
};

export const sifreGucluMu = (sifre: string) => {
  const s = String(sifre || "");
  return s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s);
};

export const kalanKilitSuresiMetni = (ms: number) => {
  const dk = Math.max(1, Math.ceil(ms / 60000));
  return `${dk} dakika`;
};
