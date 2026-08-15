import { yetkiVarMi } from "./constants";

// Kullanıcı sistemi kurulduktan sonra yönetici onayı artık gerçek bir
// kullanıcı adı + şifre doğrulamasıdır: "kullaniciYonetebilir" yetkisine
// sahip aktif bir kullanıcının kimliği doğrulanmadan onay verilmez. Henüz
// hiç kullanıcı tanımlanmadıysa (geçiş dönemi / ilk kurulum), eski basit PIN
// mekanizmasına geri döner — böylece kullanıcı sistemi kurulmadan önce de
// uygulama kilitlenmez.
export const yoneticiOnayiAl = (db, mesaj) => {
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
  return yoneticiler.some((k) => k.kullaniciAdi.toLowerCase() === kadi.trim().toLowerCase() && k.sifre === sifre);
};
