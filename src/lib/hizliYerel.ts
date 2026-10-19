/**
 * iPhone (Safari / iOS Chrome) hız ve bellek düzeltmesi.
 * Türkçe büyük-küçük harf, 'tr' sıralama ve tarih biçimleme çağrıları analizlerde on binlerce kez yapılıyor.
 * iPhone'un tarayıcı motoru bunların her birinde yeni bir dil biçimlendirici kuruyor; bu hem yavaş hem de belleği
 * doldurup sekmeyi çökertiyordu (bilgisayardaki Chrome bunları kendi içinde önbelleğe aldığı için sorun çıkmıyordu).
 * Burada aynı sonuçları veren hızlı yollar bir kez tanımlanır; diğer tüm durumlar tarayıcının kendi işlevine bırakılır.
 */
const ust = String.prototype.toLocaleUpperCase, alt = String.prototype.toLocaleLowerCase, kars = String.prototype.localeCompare;
const tarihMetin = Date.prototype.toLocaleDateString, tarihSaatMetin = Date.prototype.toLocaleString, saatMetin = Date.prototype.toLocaleTimeString;
const trMi = (l: unknown) => l === 'tr' || l === 'tr-TR';
const SINIR = 20000;
const ustOnb = new Map<string, string>(), altOnb = new Map<string, string>();
const onb = (m: Map<string, string>, s: string, f: (s: string) => string) => { let r = m.get(s); if (r === undefined) { r = f(s); if (m.size > SINIR) m.clear(); m.set(s, r); } return r; };

String.prototype.toLocaleUpperCase = function (this: string, ...a: unknown[]) {
  return trMi(a[0]) ? onb(ustOnb, String(this), (s) => s.replace(/i/g, 'İ').toUpperCase()) : ust.apply(this, a as []);
} as typeof ust;
String.prototype.toLocaleLowerCase = function (this: string, ...a: unknown[]) {
  return trMi(a[0]) ? onb(altOnb, String(this), (s) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()) : alt.apply(this, a as []);
} as typeof alt;

const trSira = new Intl.Collator('tr').compare, varsayilanSira = new Intl.Collator().compare;
String.prototype.localeCompare = function (this: string, ...a: unknown[]) {
  if (a.length <= 1) return varsayilanSira(String(this), String(a[0]));
  if (a.length === 2 && trMi(a[1])) return trSira(String(this), String(a[0]));
  return kars.apply(this, a as [string]);
} as typeof kars;

const iki = (n: number) => (n < 10 ? '0' : '') + n;
const bicimler = new Map<string, Intl.DateTimeFormat>();
const bicim = (l: unknown, o: unknown, varsayilan: Intl.DateTimeFormatOptions) => {
  const k = `${String(l)}|${JSON.stringify(o ?? varsayilan)}`; let f = bicimler.get(k);
  if (!f) { f = new Intl.DateTimeFormat(l as string, (o as Intl.DateTimeFormatOptions) ?? varsayilan); bicimler.set(k, f); } return f;
};
const gecerli = (d: Date) => !Number.isNaN(d.getTime());
Date.prototype.toLocaleDateString = function (this: Date, ...a: unknown[]) {
  if (!gecerli(this) || typeof a[0] !== 'string') return tarihMetin.apply(this, a as []);
  if (a[0] === 'sv' && a[1] === undefined) return `${this.getFullYear()}-${iki(this.getMonth() + 1)}-${iki(this.getDate())}`;
  return bicim(a[0], a[1], { year: 'numeric', month: 'numeric', day: 'numeric' }).format(this);
} as typeof tarihMetin;
Date.prototype.toLocaleString = function (this: Date, ...a: unknown[]) {
  if (!gecerli(this) || typeof a[0] !== 'string') return tarihSaatMetin.apply(this, a as []);
  return bicim(a[0], a[1], { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).format(this);
} as typeof tarihSaatMetin;
Date.prototype.toLocaleTimeString = function (this: Date, ...a: unknown[]) {
  if (!gecerli(this) || typeof a[0] !== 'string') return saatMetin.apply(this, a as []);
  return bicim(a[0], a[1], { hour: 'numeric', minute: 'numeric', second: 'numeric' }).format(this);
} as typeof saatMetin;

export {};
