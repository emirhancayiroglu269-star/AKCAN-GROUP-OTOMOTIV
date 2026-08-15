import { yeniId, zamanDamgasi } from "./format";

export const AUDIT_KATEGORILERI = [
  "Giriş", "Satış", "Alış", "Tahsilat", "Ödeme", "Kasa", "Banka", "POS",
  "İade", "Stok", "Sayım", "Transfer", "Müşteri", "Tedarikçi", "Fiyat",
  "Kullanıcı", "Yetki", "Ayar", "Silme", "Diğer",
];

const metin = (v: any) => {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return String(v); }
};

// SHA/WebCrypto async gerektirmeden audit zincirini bozulmaya dayanıklı tutmak
// için deterministik 32-bit hash kullanılır. Bu bir parola hash'i değildir;
// sadece kayıt zincirindeki değişiklikleri tespit etmek içindir.
const zincirHash = (girdi: string) => {
  let h = 2166136261;
  for (let i = 0; i < girdi.length; i++) {
    h ^= girdi.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};

export const auditKategoriBelirle = (islemTuru = "") => {
  const t = String(islemTuru).toLocaleLowerCase("tr-TR");
  if (t.includes("giriş") || t.includes("oturum")) return "Giriş";
  if (t.includes("satış")) return "Satış";
  if (t.includes("alış")) return "Alış";
  if (t.includes("tahsilat")) return "Tahsilat";
  if (t.includes("ödeme")) return "Ödeme";
  if (t.includes("kasa")) return "Kasa";
  if (t.includes("banka")) return "Banka";
  if (t.includes("pos")) return "POS";
  if (t.includes("iade")) return "İade";
  if (t.includes("stok")) return "Stok";
  if (t.includes("sayım")) return "Sayım";
  if (t.includes("transfer")) return "Transfer";
  if (t.includes("müşteri")) return "Müşteri";
  if (t.includes("tedarikçi")) return "Tedarikçi";
  if (t.includes("fiyat")) return "Fiyat";
  if (t.includes("kullanıcı") || t.includes("personel")) return "Kullanıcı";
  if (t.includes("yetki") || t.includes("rol")) return "Yetki";
  if (t.includes("ayar")) return "Ayar";
  if (t.includes("sil")) return "Silme";
  return "Diğer";
};

export const auditKaydiEkle = (prev: any, input: {
  kullaniciAdi?: string;
  islemTuru: string;
  aciklama?: string;
  eskiDeger?: any;
  yeniDeger?: any;
  hedefId?: string | null;
  islemId?: string | null;
  kategori?: string;
  sonuc?: "Başarılı" | "Reddedildi" | "Hata";
}) => {
  const eskiDeger = metin(input.eskiDeger ?? "—");
  const yeniDeger = metin(input.yeniDeger ?? "—");
  const onceki = Array.isArray(prev.auditGecmisi) ? prev.auditGecmisi[0] : null;
  const oncekiHash = onceki?.hash || "GENESIS";
  const tarih = zamanDamgasi();
  const kategori = input.kategori || auditKategoriBelirle(input.islemTuru);
  const id = yeniId("audit");
  const temel = [
    id, tarih, input.kullaniciAdi || "", kategori, input.islemTuru,
    input.aciklama || "", eskiDeger, yeniDeger, input.hedefId || "",
    input.islemId || "", input.sonuc || "Başarılı", oncekiHash,
  ].join("|");
  const kayit = {
    id,
    tarih,
    kullaniciAdi: input.kullaniciAdi || "",
    kategori,
    islemTuru: input.islemTuru,
    aciklama: input.aciklama || "",
    eskiDeger,
    yeniDeger,
    hedefId: input.hedefId || null,
    islemId: input.islemId || null,
    sonuc: input.sonuc || "Başarılı",
    oncekiHash,
    hash: zincirHash(temel),
  };
  const gecmis = Array.isArray(prev.auditGecmisi) ? prev.auditGecmisi : [];
  return { ...prev, auditGecmisi: [kayit, ...gecmis].slice(0, 5000) };
};

export const auditZincirKontrolu = (db: any) => {
  const liste = Array.isArray(db?.auditGecmisi) ? db.auditGecmisi : [];
  const bulgular: any[] = [];
  // Yeni kayıtlar en yeniden eskiye tutuluyor.
  for (let i = 0; i < liste.length; i++) {
    const k = liste[i];
    const sonraki = liste[i + 1];
    if (!k?.hash) {
      // Faz-5 öncesi kayıtlar zincirsiz olabilir; bunları hata değil legacy olarak raporla.
      continue;
    }
    if (sonraki && k.oncekiHash !== sonraki.hash) {
      bulgular.push({ id: k.id, tur: "Zincir bozuk", aciklama: `${k.islemTuru} kaydının önceki hash bağlantısı uyuşmuyor.` });
    }
    const temel = [
      k.id, k.tarih, k.kullaniciAdi || "", k.kategori || auditKategoriBelirle(k.islemTuru),
      k.islemTuru || "", k.aciklama || "", k.eskiDeger ?? "—", k.yeniDeger ?? "—",
      k.hedefId || "", k.islemId || "", k.sonuc || "Başarılı", k.oncekiHash || "GENESIS",
    ].join("|");
    if (zincirHash(temel) !== k.hash) {
      bulgular.push({ id: k.id, tur: "Kayıt değiştirilmiş", aciklama: `${k.islemTuru} kaydının hash değeri uyuşmuyor.` });
    }
  }
  return { uygun: bulgular.length === 0, toplamBulgu: bulgular.length, bulgular };
};

export const kritikYetkiVarMi = (db: any, aktifKullanici: any, anahtar: string) => {
  if (!aktifKullanici?.id) return false;
  const kullanici = (db?.kullanicilar || []).find((u: any) => u.id === aktifKullanici.id && u.aktif !== false);
  if (!kullanici) return false;
  const rol = (db?.roller || []).find((r: any) => r.id === kullanici.rolId);
  return !!rol?.yetkiler?.[anahtar];
};
