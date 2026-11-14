import { describe, it, expect } from "vitest";
import {
  sifreHashle,
  sifreHashDogruMu,
  sifreHashMi,
  kullaniciDuzMetinSifreliMi,
  kullaniciSifreHashiniAl,
  sifreDogruMu,
  sifreAlaniniTemizle,
  kullanicilariHashle,
  SIFRE_ITERASYON,
} from "../../src/lib/sifre-hash";

// ─────────────────────────────────────────────────────────────────────────────
// Şifre saklama sözleşmesi.
//
// Kural: düz metin şifre hiçbir yerde kalıcı olarak durmaz. Kullanıcı kaydı,
// app_state JSON'u ve yedek dosyası yalnızca `sifreHash` taşır.
// ─────────────────────────────────────────────────────────────────────────────

describe("sifreHashle — hash üretimi", () => {
  it("PBKDF2 formatında hash üretir", async () => {
    const h = await sifreHashle("Gizli123");
    expect(h.sifreHash.startsWith("pbkdf2$")).toBe(true);
    expect(h.sifreHash.split("$")).toHaveLength(4);
    expect(h.sifreHash.split("$")[1]).toBe(String(SIFRE_ITERASYON));
    expect(h.sifreAlgoritmasi).toBe("PBKDF2-SHA256");
    expect(h.sifreSurumu).toBe(1);
  });

  it("hash içinde düz metin şifre geçmez", async () => {
    const h = await sifreHashle("CokGizli987");
    expect(h.sifreHash).not.toContain("CokGizli987");
    expect(JSON.stringify(h)).not.toContain("CokGizli987");
  });

  it("aynı şifre iki kez hash'lenince farklı sonuç verir (tuz)", async () => {
    const a = await sifreHashle("AyniSifre123");
    const b = await sifreHashle("AyniSifre123");
    expect(a.sifreHash).not.toBe(b.sifreHash);
    expect(a.sifreTuzu).not.toBe(b.sifreTuzu);
    // İkisi de doğrulamadan geçer
    expect(await sifreHashDogruMu("AyniSifre123", a.sifreHash)).toBe(true);
    expect(await sifreHashDogruMu("AyniSifre123", b.sifreHash)).toBe(true);
  });

  it("tuz her seferinde 16 bayt", async () => {
    const h = await sifreHashle("Deneme123");
    expect(atob(h.sifreTuzu)).toHaveLength(16);
  });
});

describe("sifreHashDogruMu — doğrulama", () => {
  it("doğru şifreyi kabul eder", async () => {
    const h = await sifreHashle("Dogru123");
    expect(await sifreHashDogruMu("Dogru123", h.sifreHash)).toBe(true);
  });

  it("yanlış şifreyi reddeder", async () => {
    const h = await sifreHashle("Dogru123");
    expect(await sifreHashDogruMu("yanlis", h.sifreHash)).toBe(false);
    expect(await sifreHashDogruMu("Dogru124", h.sifreHash)).toBe(false);
    expect(await sifreHashDogruMu("", h.sifreHash)).toBe(false);
  });

  it("büyük/küçük harfe duyarlıdır", async () => {
    const h = await sifreHashle("SifreAbc1");
    expect(await sifreHashDogruMu("sifreabc1", h.sifreHash)).toBe(false);
    expect(await sifreHashDogruMu("SIFREABC1", h.sifreHash)).toBe(false);
  });

  it("Türkçe karakterli şifreyi doğru doğrular", async () => {
    const h = await sifreHashle("Şifreğüç1");
    expect(await sifreHashDogruMu("Şifreğüç1", h.sifreHash)).toBe(true);
    expect(await sifreHashDogruMu("sifreguc1", h.sifreHash)).toBe(false);
  });

  it("bozuk / tanınmayan hash'te true DÖNMEZ", async () => {
    expect(await sifreHashDogruMu("x", "")).toBe(false);
    expect(await sifreHashDogruMu("x", "duz-metin")).toBe(false);
    expect(await sifreHashDogruMu("x", "pbkdf2$")).toBe(false);
    expect(await sifreHashDogruMu("x", "pbkdf2$abc$tuz$hash")).toBe(false);
    expect(await sifreHashDogruMu("x", "pbkdf2$0$tuz$hash")).toBe(false);
    expect(await sifreHashDogruMu("x", "pbkdf2$1000$tuz")).toBe(false);
    // geçersiz base64 → istisna fırlatmaz, false döner
    expect(await sifreHashDogruMu("x", "pbkdf2$1000$!!!$!!!")).toBe(false);
  });
});

describe("sifreHashMi / kullaniciDuzMetinSifreliMi", () => {
  it("hash değerini tanır", async () => {
    const h = await sifreHashle("Test1234");
    expect(sifreHashMi(h.sifreHash)).toBe(true);
    expect(sifreHashMi("DuzMetin123")).toBe(false);
    expect(sifreHashMi("")).toBe(false);
    expect(sifreHashMi(null)).toBe(false);
    expect(sifreHashMi(undefined)).toBe(false);
  });

  it("düz metin şifreli kaydı tespit eder", () => {
    expect(kullaniciDuzMetinSifreliMi({ sifre: "DuzMetin123" })).toBe(true);
    expect(kullaniciDuzMetinSifreliMi({ sifre: "" })).toBe(false);
    expect(kullaniciDuzMetinSifreliMi({})).toBe(false);
    expect(kullaniciDuzMetinSifreliMi({ sifreHash: "pbkdf2$a$b$c" })).toBe(false);
  });

  it("eski sürümün `sifre` alanına yazdığı hash'i düz metin saymaz", () => {
    const eski = { sifre: "pbkdf2$210000$tuz$hash" };
    expect(kullaniciDuzMetinSifreliMi(eski)).toBe(false);
    expect(kullaniciSifreHashiniAl(eski)).toBe("pbkdf2$210000$tuz$hash");
  });
});

describe("sifreDogruMu — iki sürümle uyumluluk", () => {
  it("hash'li kaydı doğrular", async () => {
    const h = await sifreHashle("Yeni1234");
    const k = { kullaniciAdi: "a", ...h };
    expect(await sifreDogruMu(k, "Yeni1234")).toBe(true);
    expect(await sifreDogruMu(k, "yanlis")).toBe(false);
  });

  it("henüz hash'lenmemiş ESKİ kaydı hâlâ doğrular (kullanıcı kilitlenmez)", async () => {
    const k = { kullaniciAdi: "eski", sifre: "EskiSifre1" };
    expect(await sifreDogruMu(k, "EskiSifre1")).toBe(true);
    expect(await sifreDogruMu(k, "yanlis")).toBe(false);
  });

  it("şifresi hiç olmayan kayıtta her şeyi reddeder", async () => {
    expect(await sifreDogruMu({ kullaniciAdi: "b" }, "")).toBe(false);
    expect(await sifreDogruMu({ kullaniciAdi: "b" }, "herhangi")).toBe(false);
    expect(await sifreDogruMu(null, "herhangi")).toBe(false);
  });

  it("sifreHash varsa düz metin alana düşmez", async () => {
    const h = await sifreHashle("Dogru1234");
    // Bozuk bir kurcalama: hash doğru ama düz metin farklı yazılmış
    const k = { ...h, sifre: "Saldirgan123" };
    expect(await sifreDogruMu(k, "Dogru1234")).toBe(true);
    expect(await sifreDogruMu(k, "Saldirgan123")).toBe(false);
  });
});

describe("sifreAlaniniTemizle", () => {
  it("düz metin şifreyi kaldırır, diğer alanları korur", () => {
    const k = { id: "u1", adSoyad: "Ali", kullaniciAdi: "ali", sifre: "Gizli123", rolId: "rol-satis" };
    const t = sifreAlaniniTemizle(k);
    expect(t).not.toHaveProperty("sifre");
    expect(t.id).toBe("u1");
    expect(t.adSoyad).toBe("Ali");
    expect(t.rolId).toBe("rol-satis");
  });

  it("hash alanlarına dokunmaz", async () => {
    const h = await sifreHashle("Test1234");
    const t = sifreAlaniniTemizle({ id: "u", ...h });
    expect(t.sifreHash).toBe(h.sifreHash);
    expect(t.sifreTuzu).toBe(h.sifreTuzu);
  });

  it("girdiyi değiştirmez (saf fonksiyon)", () => {
    const k = { id: "u", sifre: "Gizli123" };
    sifreAlaniniTemizle(k);
    expect(k.sifre).toBe("Gizli123");
  });
});

describe("kullanicilariHashle — migration", () => {
  it("düz metin şifreleri hash'ler ve düz metni siler", async () => {
    const liste = [
      { id: "u1", kullaniciAdi: "ali", sifre: "Ali12345" },
      { id: "u2", kullaniciAdi: "veli", sifre: "Veli1234" },
    ];
    const s = await kullanicilariHashle(liste);
    expect(s.degisen).toBe(2);
    expect(s.hatali).toEqual([]);
    expect(s.kullanicilar).toHaveLength(2);
    for (const k of s.kullanicilar) {
      expect(k).not.toHaveProperty("sifre");
      expect(k.sifreHash.startsWith("pbkdf2$")).toBe(true);
    }
    // Eski şifrelerle giriş hâlâ çalışır
    expect(await sifreDogruMu(s.kullanicilar[0], "Ali12345")).toBe(true);
    expect(await sifreDogruMu(s.kullanicilar[1], "Veli1234")).toBe(true);
  });

  it("zaten hash'li kayıtları yeniden hash'lemez", async () => {
    const h = await sifreHashle("Mevcut1234");
    const liste = [{ id: "u1", kullaniciAdi: "ali", ...h }];
    const s = await kullanicilariHashle(liste);
    expect(s.degisen).toBe(0);
    expect(s.kullanicilar[0].sifreHash).toBe(h.sifreHash);
  });

  it("şifresi olmayan kullanıcıyı olduğu gibi bırakır", async () => {
    const liste = [{ id: "u1", kullaniciAdi: "sifresiz" }];
    const s = await kullanicilariHashle(liste);
    expect(s.degisen).toBe(0);
    expect(s.kullanicilar[0]).toEqual({ id: "u1", kullaniciAdi: "sifresiz" });
  });

  it("karışık listeyi doğru işler", async () => {
    const h = await sifreHashle("Hashli1234");
    const liste = [
      { id: "u1", kullaniciAdi: "duzmetin", sifre: "DuzMetin1" },
      { id: "u2", kullaniciAdi: "hashli", ...h },
      { id: "u3", kullaniciAdi: "sifresiz" },
    ];
    const s = await kullanicilariHashle(liste);
    expect(s.degisen).toBe(1);
    expect(s.kullanicilar[0]).not.toHaveProperty("sifre");
    expect(s.kullanicilar[1].sifreHash).toBe(h.sifreHash);
    expect(s.kullanicilar[2]).toEqual({ id: "u3", kullaniciAdi: "sifresiz" });
  });

  it("boş / tanımsız girdide çökmez", async () => {
    expect((await kullanicilariHashle([])).degisen).toBe(0);
    expect((await kullanicilariHashle(undefined as any)).kullanicilar).toEqual([]);
  });

  it("migration sonrası JSON'da hiçbir şifre düz metin kalmaz", async () => {
    const liste = [
      { id: "u1", adSoyad: "Ali", kullaniciAdi: "ali", sifre: "SifreAli1", rolId: "rol-yonetici" },
      { id: "u2", adSoyad: "Veli", kullaniciAdi: "veli", sifre: "SifreVeli1", rolId: "rol-satis" },
    ];
    const s = await kullanicilariHashle(liste);
    const json = JSON.stringify(s.kullanicilar);
    expect(json).not.toContain("SifreAli1");
    expect(json).not.toContain("SifreVeli1");
    // Aynı zamanda hiçbir nesnede `sifre` anahtarı yok
    for (const k of s.kullanicilar) expect(Object.keys(k)).not.toContain("sifre");
  });
});
