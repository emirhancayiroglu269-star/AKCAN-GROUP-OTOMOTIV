// Kullanıcı şifrelerinin saklanması — düz metin DEĞİL, hash.
//
// ÖNEMLİ: Bu bir tarayıcı uygulaması. Hash burada, istemcide hesaplanıyor;
// yani "sunucu tarafı doğrulama" değil. Bir saldırgan tarayıcıda kod
// çalıştırabiliyorsa hash'i yine de atlayabilir. Buradaki kazanç şudur:
//
//   ÖNCE: app_state / yedek dosyası / localStorage okuyan HERKES tüm
//         kullanıcıların şifresini düz metin görüyordu. Yedek dosyası
//         paylaşıldığında şifreler de paylaşılıyordu.
//   SONRA: Aynı kişi yalnızca `pbkdf2$iterasyon$tuz$hash` görüyor. Hash'ten
//         şifreye dönmek PBKDF2-SHA256 + 210.000 iterasyon demek.
//
// Gerçek çözüm Supabase Auth'a geçmek (bkz. docs/rls-dogrulama-raporu.md).
// O zamana kadar bu, veri sızıntısının ağırlığını ciddi biçimde azaltır.
//
// Kullanıcı kaydında TUTULAN alanlar:
//   sifreHash   → "pbkdf2$<iterasyon>$<tuzBase64>$<hashBase64>"
//   sifreTuzu   → (eski kayıtlarla uyum için ayrı da yazılır; asıl bilgi hash'te)
//   sifreAlgoritmasi → "PBKDF2-SHA256"
//   sifreSurumu → 1
// `sifre` (düz metin) alanı KALMAZ — kayıt anında silinir.

export const SIFRE_SURUMU = 1;
export const SIFRE_ALGORITMASI = "PBKDF2-SHA256";
export const SIFRE_ITERASYON = 210000;

// Hash'lenmiş kayıtların standart öneki. "pbkdf2$" ile başlayan bir `sifre`
// alanı düz metin değil, eski bir sürümden kalmış hash'tir.
const ONEK = "pbkdf2$";

const base64Kodla = (baytlar: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < baytlar.length; i++) s += String.fromCharCode(baytlar[i]);
  return btoa(s);
};

const base64Coz = (metin: string): Uint8Array<ArrayBuffer> => {
  const s = atob(metin);
  const baytlar = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) baytlar[i] = s.charCodeAt(i);
  return baytlar;
};

const tuzUret = (uzunluk = 16): string => {
  const baytlar = new Uint8Array(uzunluk);
  crypto.getRandomValues(baytlar);
  return base64Kodla(baytlar);
};

const pbkdf2 = async (sifre: string, tuzB64: string, iterasyon: number): Promise<string> => {
  const anahtar = await crypto.subtle.importKey("raw", new TextEncoder().encode(sifre), "PBKDF2", false, ["deriveBits"]);
  const bitler = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: base64Coz(tuzB64), iterations: iterasyon, hash: "SHA-256" },
    anahtar,
    256
  );
  return base64Kodla(new Uint8Array(bitler));
};

// Şifre → hash kaydı. Kullanıcı kaydına yayılacak alanları döner.
// Düz metin `sifre` alanını ÇAĞIRAN silmelidir (bkz. sifreliKullaniciAlani).
export const sifreHashle = async (
  sifre: string
): Promise<{ sifreHash: string; sifreTuzu: string; sifreAlgoritmasi: string; sifreSurumu: number }> => {
  const tuz = tuzUret();
  const hash = await pbkdf2(sifre, tuz, SIFRE_ITERASYON);
  return {
    sifreHash: `${ONEK}${SIFRE_ITERASYON}$${tuz}$${hash}`,
    sifreTuzu: tuz,
    sifreAlgoritmasi: SIFRE_ALGORITMASI,
    sifreSurumu: SIFRE_SURUMU,
  };
};

// Sabit süreli karşılaştırma — zamanlama saldırısını engeller.
const sabitSureliEsit = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
};

// Girilen şifre bu hash ile eşleşiyor mu?
// Bozuk / tanınmayan hash → false (asla "doğru" varsayılmaz).
export const sifreHashDogruMu = async (sifre: string, hash: string): Promise<boolean> => {
  try {
    const kayit = String(hash || "");
    if (!kayit.startsWith(ONEK)) return false;
    const parcalar = kayit.slice(ONEK.length).split("$");
    if (parcalar.length !== 3) return false;
    const iterasyon = parseInt(parcalar[0], 10);
    const tuz = parcalar[1];
    const beklenen = parcalar[2];
    if (!Number.isFinite(iterasyon) || iterasyon <= 0 || !tuz || !beklenen) return false;
    const hesaplanan = await pbkdf2(String(sifre || ""), tuz, iterasyon);
    return sabitSureliEsit(hesaplanan, beklenen);
  } catch {
    return false;
  }
};

// Bu şifre değeri zaten hash mi? (pbkdf2$<iter>$<tuz>$<hash>)
export const sifreHashMi = (deger: any): boolean => typeof deger === "string" && deger.startsWith(ONEK);

// Kullanıcı kaydında düz metin şifre var mı? (migration ve doğrulama için)
export const kullaniciDuzMetinSifreliMi = (k: any): boolean => {
  if (!k) return false;
  const s = k.sifre;
  return typeof s === "string" && s.length > 0 && !sifreHashMi(s);
};

// Kullanıcının doğrulamasında kullanılacak hash'i bulur.
// Eski kayıtlarda `sifre` alanı düz metin tutulmuş olabilir — o durumda düz metin
// karşılaştırmasına düşülür ki kullanıcılar kilitlenmesin. Kayıt bir sonraki
// girişte otomatik olarak hash'lenir (bkz. App.tsx girisYap).
export const kullaniciSifreHashiniAl = (k: any): string => {
  if (!k) return "";
  if (typeof k.sifreHash === "string" && k.sifreHash.startsWith(ONEK)) return k.sifreHash;
  if (sifreHashMi(k.sifre)) return k.sifre;
  return "";
};

// Giriş doğrulaması — hem yeni (hash) hem eski (düz metin) kayıtlarla çalışır.
export const sifreDogruMu = async (k: any, girilenSifre: string): Promise<boolean> => {
  if (!k) return false;
  const hash = kullaniciSifreHashiniAl(k);
  if (hash) return sifreHashDogruMu(girilenSifre, hash);
  // Eski kayıt: henüz hash'lenmemiş düz metin.
  const duzMetin = typeof k.sifre === "string" ? k.sifre : "";
  if (!duzMetin) return false;
  return sabitSureliEsit(duzMetin, String(girilenSifre || ""));
};

// Aynı kullanıcı nesnesinin hem hash'li alanlarını hem düz metin alanını
// kaldırılmış hâlini üretir. Kaydetmeden önce HER ZAMAN buna sarılmalıdır —
// aksi halde düz metin şifre JSON'a geri sızar.
export const sifreAlaniniTemizle = <T extends Record<string, any>>(k: T): T => {
  const { sifre, ...kalan } = k as any;
  return kalan as T;
};

// Kullanıcı listesini hash'e geçirir. Şifresi olmayan / zaten hash'li
// kayıtlar olduğu gibi kalır. Dönen `degisen` sayısı migration raporu içindir.
export const kullanicilariHashle = async (
  kullanicilar: any[]
): Promise<{ kullanicilar: any[]; degisen: number; hatali: string[] }> => {
  const sonuc: any[] = [];
  const hatali: string[] = [];
  let degisen = 0;
  for (const k of kullanicilar || []) {
    if (!kullaniciDuzMetinSifreliMi(k)) {
      sonuc.push(sifreAlaniniTemizle(k));
      continue;
    }
    try {
      const hash = await sifreHashle(String(k.sifre));
      sonuc.push({ ...sifreAlaniniTemizle(k), ...hash });
      degisen++;
    } catch {
      // Hash'lenemeyen kayıt şifresini kaybetmesin: olduğu gibi bırakılır,
      // adı raporlanır. Sessizce şifre silmek kullanıcıyı kilitlemek demektir.
      hatali.push(String(k.kullaniciAdi || k.id || "?"));
      sonuc.push(k);
    }
  }
  return { kullanicilar: sonuc, degisen, hatali };
};
