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

// Kategori eşlemesi SIRAYA DUYARLI — bir alt dize diğerini gölgeleyebilir.
// Sıra şu ilkeye göre kuruldu:
//   1) ÖNCE EN ÖZEL (dar) kalıplar, sonra genel olanlar.
//      "Satış iadesi" → İade (Satış değil), "Stok girişi" → Stok (Giriş değil).
//   2) "giriş" tek başına çok geniş bir kelime: "Stok girişi", "Manuel Stok
//      Girişi", "Kasa girişi", "Mal girişi" hepsi içinde geçiyor. Bu yüzden
//      oturum açma dışındaki "giriş" kalıpları kendi kategorisini bulmalı;
//      genel "giriş" kontrolü EN SONA yakın duruyor.
const SIRA: [string[], string][] = [
  // --- özel / dar kalıplar -------------------------------------------
  [["iade"], "İade"],
  [["tahsilat"], "Tahsilat"],
  [["stok", "sayım fazlası", "sayım eksiği", "fire", "hasarlı"], "Stok"],
  [["sayım"], "Sayım"],
  [["transfer"], "Transfer"],
  [["oturum", "çıkış yap", "çıkış yapıldı"], "Giriş"],
  [["satış"], "Satış"],
  [["satın alma", "mal kabul", "mal alış", "alış"], "Alış"],
  [["tedarikçi"], "Tedarikçi"],
  [["müşteri"], "Müşteri"],
  [["ödeme"], "Ödeme"],
  [["kasa"], "Kasa"],
  [["banka"], "Banka"],
  [["pos"], "POS"],
  [["fiyat", "iskonto"], "Fiyat"],
  [["kullanıcı", "personel", "şifre", "giriş yap", "oturum aç"], "Kullanıcı"],
  [["yetki", "rol"], "Yetki"],
  [["ayar"], "Ayar"],
  // "silindi" kendi kategorisini (Müşteri, Ürün, Tedarikçi…) bulmalı; bu
  // yüzden genel "sil" kontrolü en sonda. Yalnızca başka kategoriye
  // uymayan silme işlemleri buraya düşer.
  [["sil"], "Silme"],
  // --- en genel: oturum açma ----------------------------------------
  [["giriş"], "Giriş"],
];

export const auditKategoriBelirle = (islemTuru = "") => {
  const t = String(islemTuru).toLocaleLowerCase("tr-TR");
  for (const [kalıplar, kategori] of SIRA) {
    if (kalıplar.some((k) => t.includes(k))) return kategori;
  }
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
