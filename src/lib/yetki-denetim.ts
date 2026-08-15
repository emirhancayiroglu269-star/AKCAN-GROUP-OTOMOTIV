/**
 * V17 — Yetki / İşlem Kilidi Denetim Motoru
 * Salt-okuma güvenlik denetimidir.
 * Rol matrisindeki kritik işlemlerin tanımlı ve beklenen şekilde korunup korunmadığını kontrol eder.
 */

export type YetkiBulgu = {
  id: string;
  tip: string;
  seviye: "kritik" | "uyari";
  mesaj: string;
  referanslar?: string[];
};

const KRITIK_YETKILER = [
  "satisYapabilir",
  "satisIptalEdebilir",
  "iadeAlabilir",
  "stokDuzeltebilir",
  "malAlisGirebilir",
  "tahsilatGirebilir",
  "kasaCikisiYapabilir",
  "kasaGorebilir",
  "fiyatDegistirebilir",
  "urunSilebilir",
  "kullaniciYonetebilir",
];

const ROL_BEKLENTILERI: Record<string, string[]> = {
  "rol-yonetici": [...KRITIK_YETKILER],
  "rol-satis": ["satisYapabilir", "iadeAlabilir", "iskontoYapabilir", "cariHesapGorebilir"],
  "rol-kasa": ["satisYapabilir", "tahsilatGirebilir", "kasaGorebilir", "kasaCikisiYapabilir", "cariHesapGorebilir"],
  "rol-depo": ["stokDuzeltebilir", "malAlisGirebilir"],
};

export const yetkiDenetimKontrolu = (db: any): YetkiBulgu[] => {
  const b: YetkiBulgu[] = [];
  const roller = Array.isArray(db?.roller) ? db.roller : [];
  const kullanicilar = Array.isArray(db?.kullanicilar) ? db.kullanicilar : [];

  // Her kritik yetki rol şemasında mevcut olmalı.
  for (const rol of roller) {
    for (const anahtar of KRITIK_YETKILER) {
      if (!Object.prototype.hasOwnProperty.call(rol?.yetkiler || {}, anahtar)) {
        b.push({
          id: `${rol.id}:${anahtar}`,
          tip: "eksik-yetki",
          seviye: "kritik",
          mesaj: `${rol.ad || rol.id} rolünde ${anahtar} yetkisi tanımlı değil.`,
          referanslar: [rol.id, anahtar],
        });
      }
    }
  }

  // Sabit roller için kritik görev matrisi bozulmuşsa raporla.
  for (const [rolId, beklenen] of Object.entries(ROL_BEKLENTILERI)) {
    const rol = roller.find((r: any) => r.id === rolId);
    if (!rol) continue;
    for (const anahtar of beklenen) {
      if (rol.yetkiler?.[anahtar] !== true) {
        b.push({
          id: `${rolId}:beklenen:${anahtar}`,
          tip: "rol-matrisi",
          seviye: "kritik",
          mesaj: `${rol.ad || rolId} rolünün ${anahtar} yetkisi kapatılmış/değişmiş.`,
          referanslar: [rolId, anahtar],
        });
      }
    }
  }

  // Aktif kullanıcı geçersiz role bağlıysa kritik durum.
  for (const k of kullanicilar.filter((x: any) => x.aktif !== false)) {
    if (!roller.some((r: any) => r.id === k.rolId)) {
      b.push({
        id: `kullanici:${k.id}`,
        tip: "yetkisiz-rol",
        seviye: "kritik",
        mesaj: `${k.adSoyad || k.kullaniciAdi || k.id} geçerli olmayan bir role bağlı.`,
        referanslar: [k.id, k.rolId],
      });
    }
  }

  // Aktif kullanıcılar için yönetici rolü yoksa kullanıcı/yetki yönetimi erişimi verilmemeli.
  const yonetici = roller.find((r: any) => r.id === "rol-yonetici");
  if (yonetici && yonetici.yetkiler?.kullaniciYonetebilir !== true) {
    b.push({
      id: "rol-yonetici:kullaniciYonetebilir",
      tip: "yonetici-yetkisi",
      seviye: "kritik",
      mesaj: "Yönetici rolünde kullanıcı/yetki yönetimi kapalı.",
      referanslar: ["rol-yonetici"],
    });
  }

  return b;
};

export const yetkiDenetimOzeti = (db: any) => {
  const bulgular = yetkiDenetimKontrolu(db);
  return {
    temiz: bulgular.length === 0,
    bulguSayisi: bulgular.length,
    kritik: bulgular.filter((x) => x.seviye === "kritik").length,
    bulgular,
  };
};
