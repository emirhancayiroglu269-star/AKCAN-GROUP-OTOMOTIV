import { yetkiVarMi } from "./constants";
import { sifreDogruMu } from "./sifre-hash";

// Kullanıcı sistemi kurulduktan sonra yönetici onayı artık gerçek bir
// kullanıcı adı + şifre doğrulamasıdır: "kullaniciYonetebilir" yetkisine
// sahip aktif bir kullanıcının kimliği doğrulanmadan onay verilmez. Henüz
// hiç kullanıcı tanımlanmadıysa (geçiş dönemi / ilk kurulum), eski basit PIN
// mekanizmasına geri döner — böylece kullanıcı sistemi kurulmadan önce de
// uygulama kilitlenmez.
// Şifre doğrulaması artık hash ile yapılır (PBKDF2-SHA256). Eski düz-metin
// kayıtları için geriye dönük uyumluluk vardır (kullanıcı kilitlenmez).
export const yoneticiOnayiAl = async (db: any, mesaj: string): Promise<boolean> => {
  const yoneticiler = (db.kullanicilar || []).filter((k) => k.aktif !== false && yetkiVarMi(db, k, "kullaniciYonetebilir"));
  if (yoneticiler.length === 0) {
    const kayitliPin = localStorage.getItem("akcan-yonetici-pin");
    if (!kayitliPin) {
      const yeniPin = window.prompt(
        `${mesaj}\n\nHenüz bir Yönetici PIN'i belirlenmemiş. Bundan sonraki onaylarda kullanılacak bir PIN belirleyin (en az 4 hane):`
      );
      if (!yeniPin || yeniPin.trim().length < 4) return false;
      localStorage.setItem("akcan-yonetici-pin", yeniPin.trim());
      return true;
    }
    const girilen = window.prompt(`${mesaj}\n\nYönetici PIN'ini girin:`);
    if (girilen === null) return false;
    return girilen === kayitliPin;
  }
  const kadi = window.prompt(`${mesaj}\n\nOnaylayan yöneticinin kullanıcı adını girin:`);
  if (!kadi) return false;
  const sifre = window.prompt("Şifre:");
  if (sifre === null) return false;
  // Hash ile doğrulama (eski düz-metin kayıtları da desteklenir)
  for (const k of yoneticiler) {
    const eslesme = await sifreDogruMu(k, sifre);
    if (eslesme && k.kullaniciAdi.toLowerCase() === kadi.trim().toLowerCase()) {
      return true;
    }
  }
  return false;
};

