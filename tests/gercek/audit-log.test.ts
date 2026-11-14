/**
 * GERÇEK TEST — audit log hash zinciri (kurcalama tespiti)
 * Kaynak: src/lib/audit-log.ts
 *
 * Amaç: denetim izinin gerçekten kurcalanamaz olduğunu kanıtlamak.
 * Bir kaydın herhangi bir alanı değiştirilirse zincir kontrolü bunu
 * yakalamalı; doğru kurulmuş zincir ise temiz çıkmalı.
 */
import { describe, it, expect } from "vitest";
import {
  AUDIT_KATEGORILERI,
  auditKategoriBelirle,
  auditKaydiEkle,
  auditZincirKontrolu,
  kritikYetkiVarMi,
} from "../../src/lib/audit-log";

const bosDb = () => ({ auditGecmisi: [] });

/** n adet kayıt ekler; her ekleme öncekinin üstüne biner (en yeni başta). */
const zincirKur = (n: number, db: any = bosDb()) => {
  for (let i = 0; i < n; i++) {
    db = auditKaydiEkle(db, {
      kullaniciAdi: "emirhan",
      islemTuru: `Satış oluşturuldu #${i}`,
      aciklama: `kayıt ${i}`,
      hedefId: `s${i}`,
      islemId: `i${i}`,
    });
  }
  return db;
};

describe("auditKaydiEkle — kayıt yapısı", () => {
  it("kayıt tüm zorunlu alanlarla oluşur", () => {
    const db = auditKaydiEkle(bosDb(), { kullaniciAdi: "emirhan", islemTuru: "Satış oluşturuldu" });
    const k = db.auditGecmisi[0];
    expect(k).toMatchObject({
      kullaniciAdi: "emirhan",
      islemTuru: "Satış oluşturuldu",
      sonuc: "Başarılı",
      kategori: "Satış",
    });
    expect(k.id).toMatch(/^audit/);
    expect(k.hash).toMatch(/^[0-9a-f]{8}$/); // 8 haneli hex
  });

  it("ilk kaydın öncekiHash'i GENESIS olur", () => {
    const db = auditKaydiEkle(bosDb(), { islemTuru: "İlk" });
    expect(db.auditGecmisi[0].oncekiHash).toBe("GENESIS");
  });

  it("ikinci kayıt birincinin hash'ine bağlanır", () => {
    const db = zincirKur(2);
    expect(db.auditGecmisi[0].oncekiHash).toBe(db.auditGecmisi[1].hash);
  });

  it("kayıtlar en yeni başta olacak şekilde eklenir", () => {
    const db = zincirKur(3);
    expect(db.auditGecmisi.map((k: any) => k.aciklama)).toEqual(["kayıt 2", "kayıt 1", "kayıt 0"]);
  });

  it("girdi db'sini değiştirmez (immutable)", () => {
    const db = bosDb();
    auditKaydiEkle(db, { islemTuru: "Satış" });
    expect(db.auditGecmisi).toHaveLength(0);
  });

  it("5000 kayıt sınırını uygular (bellek koruması)", () => {
    let db: any = bosDb();
    db.auditGecmisi = Array.from({ length: 5000 }, (_, i) => ({ id: `eski${i}`, hash: "aaaaaaaa" }));
    const sonra = auditKaydiEkle(db, { islemTuru: "Yeni" });
    expect(sonra.auditGecmisi).toHaveLength(5000); // 5001 değil
    expect(sonra.auditGecmisi[0].islemTuru).toBe("Yeni");
  });

  it("nesne değerleri deterministik metne çevrilir", () => {
    const a = auditKaydiEkle(bosDb(), { islemTuru: "Ayar", eskiDeger: { x: 1, y: 2 } });
    const b = auditKaydiEkle(bosDb(), { islemTuru: "Ayar", eskiDeger: { x: 1, y: 2 } });
    expect(a.auditGecmisi[0].eskiDeger).toBe('{"x":1,"y":2}');
    // id/tarih farklı olduğu için hash farklı — ama alan metni aynı
    expect(a.auditGecmisi[0].eskiDeger).toBe(b.auditGecmisi[0].eskiDeger);
  });

  it("null değer tire (—) olur — kod `??` ile varsayılan veriyor, metin(null) değil", () => {
    // DİKKAT: `input.eskiDeger ?? "—"` — null da undefined da "—" verir.
    // `metin()` fonksiyonu "null"/"undefined" üretebilir ama buraya hiç
    // ulaşmıyor. Alanı null geçen çağıran "null" metni beklemesin.
    const db = auditKaydiEkle(bosDb(), { islemTuru: "Silme", eskiDeger: null, yeniDeger: undefined });
    expect(db.auditGecmisi[0].eskiDeger).toBe("—");
    expect(db.auditGecmisi[0].yeniDeger).toBe("—");
  });

  it("boş string '—' yerine boş kalır (?? null kontrolü yapar)", () => {
    const db = auditKaydiEkle(bosDb(), { islemTuru: "Silme", eskiDeger: "" });
    expect(db.auditGecmisi[0].eskiDeger).toBe("");
  });

  it("değer verilmezse '—' yazılır", () => {
    const db = auditKaydiEkle(bosDb(), { islemTuru: "Diğer" });
    expect(db.auditGecmisi[0].eskiDeger).toBe("—");
    expect(db.auditGecmisi[0].yeniDeger).toBe("—");
  });
});

describe("auditZincirKontrolu — temiz zincir", () => {
  it("boş db temiz çıkar", () => {
    expect(auditZincirKontrolu(bosDb())).toMatchObject({ uygun: true, toplamBulgu: 0 });
  });

  it("auditGecmisi olmayan db çökmez", () => {
    expect(auditZincirKontrolu({})).toMatchObject({ uygun: true, toplamBulgu: 0 });
    expect(auditZincirKontrolu(null)).toMatchObject({ uygun: true, toplamBulgu: 0 });
  });

  it("tek kayıt temiz", () => {
    expect(auditZincirKontrolu(zincirKur(1)).uygun).toBe(true);
  });

  it("50 kayıtlık zincir temiz", () => {
    const r = auditZincirKontrolu(zincirKur(50));
    expect(r.uygun).toBe(true);
    expect(r.toplamBulgu).toBe(0);
  });

  it("hash'siz (legacy) kayıtlar hata sayılmaz", () => {
    const db: any = bosDb();
    db.auditGecmisi = [{ id: "eski1", islemTuru: "Faz-5 öncesi", tarih: "2020-01-01" }];
    expect(auditZincirKontrolu(db).uygun).toBe(true);
  });
});

describe("auditZincirKontrolu — KURCALAMA TESPİTİ", () => {
  it("bir kaydın işlem türü değiştirilirse yakalanır", () => {
    const db = zincirKur(5);
    db.auditGecmisi[2].islemTuru = "SAHTE İŞLEM";
    const r = auditZincirKontrolu(db);
    expect(r.uygun).toBe(false);
    expect(r.bulgular.some((b: any) => b.tur === "Kayıt değiştirilmiş")).toBe(true);
  });

  it("tutar/değer alanı değiştirilirse yakalanır", () => {
    const db = zincirKur(3);
    db.auditGecmisi[1].yeniDeger = "999999";
    const r = auditZincirKontrolu(db);
    expect(r.uygun).toBe(false);
    expect(r.bulgular.some((b: any) => b.tur === "Kayıt değiştirilmiş")).toBe(true);
  });

  it("kullanıcı adı değiştirilirse yakalanır", () => {
    const db = zincirKur(3);
    db.auditGecmisi[0].kullaniciAdi = "baskasi";
    expect(auditZincirKontrolu(db).uygun).toBe(false);
  });

  it("tarih değiştirilirse yakalanır", () => {
    const db = zincirKur(3);
    db.auditGecmisi[1].tarih = "2020-01-01T00:00:00.000Z";
    expect(auditZincirKontrolu(db).uygun).toBe(false);
  });

  it("sonuç alanı (Başarılı → Reddedildi) değiştirilirse yakalanır", () => {
    const db = zincirKur(3);
    db.auditGecmisi[1].sonuc = "Reddedildi";
    expect(auditZincirKontrolu(db).uygun).toBe(false);
  });

  it("hash alanı doğrudan değiştirilirse yakalanır", () => {
    const db = zincirKur(3);
    db.auditGecmisi[1].hash = "deadbeef";
    expect(auditZincirKontrolu(db).uygun).toBe(false);
  });

  it("aradan bir kayıt SİLİNİRSE zincir bağlantısı kopar", () => {
    const db = zincirKur(5);
    db.auditGecmisi.splice(2, 1); // ortadaki kaydı sil
    const r = auditZincirKontrolu(db);
    expect(r.uygun).toBe(false);
    expect(r.bulgular.some((b: any) => b.tur === "Zincir bozuk")).toBe(true);
  });

  it("kayıtlar YER DEĞİŞTİRİRSE yakalanır", () => {
    const db = zincirKur(4);
    const t = db.auditGecmisi[0];
    db.auditGecmisi[0] = db.auditGecmisi[3];
    db.auditGecmisi[3] = t;
    expect(auditZincirKontrolu(db).uygun).toBe(false);
  });

  it("sondaki kaydın öncekiHash'i bozulursa yakalanır", () => {
    const db = zincirKur(3);
    db.auditGecmisi[2].oncekiHash = "00000000";
    // son kaydın kendi hash'i oncekiHash'i içerdiği için hash uyuşmaz
    expect(auditZincirKontrolu(db).uygun).toBe(false);
  });

  it("birden fazla kurcalama birden fazla bulgu üretir", () => {
    const db = zincirKur(6);
    db.auditGecmisi[0].aciklama = "değişti";
    db.auditGecmisi[4].aciklama = "değişti";
    const r = auditZincirKontrolu(db);
    expect(r.toplamBulgu).toBeGreaterThanOrEqual(2);
  });

  it("kurcalanan kaydın id'si bulguda raporlanır", () => {
    const db = zincirKur(4);
    const hedefId = db.auditGecmisi[1].id;
    db.auditGecmisi[1].aciklama = "kurcalandi";
    const r = auditZincirKontrolu(db);
    expect(r.bulgular.some((b: any) => b.id === hedefId)).toBe(true);
  });
});

describe("auditZincirKontrolu — sadece hash'siz kayıtlarda sessiz", () => {
  it("hash'siz legacy kayıt araya girerse zincir kontrolü onu atlar", () => {
    const db = zincirKur(3);
    db.auditGecmisi.splice(1, 0, { id: "legacy", islemTuru: "Eski kayıt" });
    // legacy kayıt atlanır ama ondan sonraki bağ da kopar → bulgu beklenir
    const r = auditZincirKontrolu(db);
    expect(r.uygun).toBe(false);
  });
});

describe("auditKategoriBelirle", () => {
  it.each([
    ["Kullanıcı girişi yapıldı", "Kullanıcı"],
    ["Satış oluşturuldu", "Satış"],
    ["Mal alışı kaydedildi", "Alış"],
    ["Tahsilat yapıldı", "Tahsilat"],
    ["Tedarikçi ödemesi", "Tedarikçi"],
    ["Kasa açılışı", "Kasa"],
    ["Banka havalesi", "Banka"],
    ["POS komisyonu", "POS"],
    // DÜZELTME: "iade" kontrolü "satış"tan önce → artık İade.
    ["Satış iadesi", "İade"],
    ["Satış iadesi alındı", "İade"],
    ["Müşteri iadesi alındı", "İade"],
    ["Alış iadesi yapıldı", "İade"],
    ["Alış İadesi", "İade"],
    // DÜZELTME: "stok" kontrolü "giriş"ten önce → artık Stok.
    ["Stok girişi", "Stok"],
    ["Manuel Stok Girişi", "Stok"],
    ["Stok düzeltmesi", "Stok"],
    ["Stok düzeltildi (Manuel Stok Girişi)", "Stok"],
    ["Sayım tamamlandı", "Sayım"],
    ["Depo transferi", "Transfer"],
    ["Müşteri eklendi", "Müşteri"],
    ["Tedarikçi silindi", "Tedarikçi"],
    ["Fiyat güncellendi", "Fiyat"],
    ["Personel eklendi", "Kullanıcı"],
    ["Rol yetkisi değişti", "Yetki"],
    ["Ayar kaydedildi", "Ayar"],
    ["Kayıt silindi", "Silme"],
    ["Bilinmeyen işlem", "Diğer"],
  ])("%s → %s", (girdi, beklenen) => {
    expect(auditKategoriBelirle(girdi)).toBe(beklenen);
  });

  it("büyük/küçük harf duyarsızdır (Türkçe locale)", () => {
    expect(auditKategoriBelirle("SATIŞ OLUŞTURULDU")).toBe("Satış");
    expect(auditKategoriBelirle("İADE YAPILDI")).toBe("İade");
  });

  it("boş girdi 'Diğer' döner", () => {
    expect(auditKategoriBelirle()).toBe("Diğer");
    expect(auditKategoriBelirle("")).toBe("Diğer");
  });

  it("döndürülen her kategori AUDIT_KATEGORILERI listesinde var", () => {
    for (const t of ["Satış", "Alış", "Kasa", "Bilinmeyen", "", "xyz"]) {
      expect(AUDIT_KATEGORILERI).toContain(auditKategoriBelirle(t));
    }
  });
});


describe("auditKategoriBelirle — öncelik kuralları (düzeltilmiş sıra)", () => {
  it("iade, satıştan ve alıştan önce gelir", () => {
    expect(auditKategoriBelirle("Satış iadesi alındı")).toBe("İade");
    expect(auditKategoriBelirle("Alış iadesi yapıldı")).toBe("İade");
  });

  it("stok, girişten ve sayımdan önce gelir", () => {
    expect(auditKategoriBelirle("Stok girişi")).toBe("Stok");
    expect(auditKategoriBelirle("Sayım Fazlası")).toBe("Stok");
    expect(auditKategoriBelirle("Sayım Eksiği")).toBe("Stok");
    expect(auditKategoriBelirle("Hasarlı / Fire Ürün")).toBe("Stok");
  });

  it("satın alma ve mal kabul Alış sayılır (satış değil)", () => {
    expect(auditKategoriBelirle("Satın alma siparişi oluşturuldu")).toBe("Alış");
    expect(auditKategoriBelirle("Mal kabul yapıldı")).toBe("Alış");
  });

  it("kart silme işlemleri kendi kategorisini korur (Silme'ye düşmez)", () => {
    expect(auditKategoriBelirle("Müşteri kartı kalıcı olarak silindi")).toBe("Müşteri");
    expect(auditKategoriBelirle("Tedarikçi kartı silindi")).toBe("Tedarikçi");
    expect(auditKategoriBelirle("Ürün kartı silindi")).toBe("Silme"); // başka kategori yok
    expect(auditKategoriBelirle("Kayıt silindi")).toBe("Silme");
  });

  it("oturum açma işlemleri Kullanıcı sayılır (Giriş değil)", () => {
    expect(auditKategoriBelirle("Kullanıcı girişi yapıldı")).toBe("Kullanıcı");
    expect(auditKategoriBelirle("Giriş yapıldı")).toBe("Kullanıcı");
    expect(auditKategoriBelirle("Şifre değiştirildi")).toBe("Kullanıcı");
  });

  it("kasa açılışı Kasa, banka havalesi Banka", () => {
    expect(auditKategoriBelirle("Kasa açılışı")).toBe("Kasa");
    expect(auditKategoriBelirle("Banka havalesi")).toBe("Banka");
    expect(auditKategoriBelirle("Hesaplar arası transfer")).toBe("Transfer");
  });

  it("iskonto Fiyat kategorisinde", () => {
    expect(auditKategoriBelirle("İskonto uygulandı")).toBe("Fiyat");
    expect(auditKategoriBelirle("Fiyat grubu kuralı eklendi")).toBe("Fiyat");
  });
});

describe("auditKategoriBelirle — uygulamadaki gerçek işlem türleri", () => {
  // Bu metinler src/ içindeki gerçek `islemTuru:` değerlerinden alındı.
  it.each([
    ["Kullanıcı girişi yapıldı", "Kullanıcı"],
    ["Satış oluşturuldu", "Satış"],
    ["Satış Fişi oluşturuldu", "Satış"],
    ["Satış iptal edildi", "Satış"],
    ["Satış iadesi alındı", "İade"],
    ["Alış iadesi yapıldı", "İade"],
    ["Mal alışı kaydedildi", "Alış"],
    ["Mal kabul yapıldı", "Alış"],
    ["Satın alma siparişi oluşturuldu", "Alış"],
    ["Tahsilat yapıldı", "Tahsilat"],
    ["Tedarikçi ödemesi", "Tedarikçi"],
    ["Kasa açılışı", "Kasa"],
    ["Banka havalesi", "Banka"],
    ["POS komisyonu", "POS"],
    ["Stok girişi", "Stok"],
    ["Stok düzeltildi (Manuel Stok Girişi)", "Stok"],
    ["Sayım tamamlandı", "Sayım"],
    ["Transfer gönderildi", "Transfer"],
    ["Hesaplar arası transfer", "Transfer"],
    ["Müşteri siparişi oluşturuldu", "Müşteri"],
    ["Müşteri pasife alındı", "Müşteri"],
    ["Tedarikçi pasifleştirildi (silme yerine)", "Tedarikçi"],
    ["Fiyat güncellendi", "Fiyat"],
    ["Satış fiyatı değiştirildi", "Satış"], // "satış" önce geldiği için
    ["Personel eklendi", "Kullanıcı"],
    ["Rol yetkileri değiştirildi", "Yetki"],
    ["Ayar kaydedildi", "Ayar"],
    ["Ürün kartı silindi", "Silme"],
    ["Kayıt silindi", "Silme"],
    ["Bilinmeyen işlem", "Diğer"],
  ])("%s → %s", (girdi, beklenen) => {
    expect(auditKategoriBelirle(girdi)).toBe(beklenen);
  });

  it("her örnek AUDIT_KATEGORILERI listesinde geçerli bir kategori döner", () => {
    const ornekler = [
      "Satış iadesi", "Stok girişi", "Mal kabul yapıldı", "İskonto uygulandı",
      "Kullanıcı girişi yapıldı", "Ürün kartı silindi", "xyz", "",
    ];
    for (const o of ornekler) {
      expect(AUDIT_KATEGORILERI).toContain(auditKategoriBelirle(o));
    }
  });
});

describe("kritikYetkiVarMi", () => {
  const db = () => ({
    kullanicilar: [
      { id: "u1", ad: "Emirhan", rolId: "r1", aktif: true },
      { id: "u2", ad: "Pasif", rolId: "r1", aktif: false },
      { id: "u3", ad: "Yetkisiz", rolId: "r2", aktif: true },
    ],
    roller: [
      { id: "r1", yetkiler: { "finans.iptal": true } },
      { id: "r2", yetkiler: { "finans.iptal": false } },
    ],
  });

  it("yetkili aktif kullanıcı için true", () => {
    expect(kritikYetkiVarMi(db(), { id: "u1" }, "finans.iptal")).toBe(true);
  });

  it("yetkisiz kullanıcı için false", () => {
    expect(kritikYetkiVarMi(db(), { id: "u3" }, "finans.iptal")).toBe(false);
  });

  it("pasif kullanıcı için false", () => {
    expect(kritikYetkiVarMi(db(), { id: "u2" }, "finans.iptal")).toBe(false);
  });

  it("oturum yoksa false", () => {
    expect(kritikYetkiVarMi(db(), null, "finans.iptal")).toBe(false);
    expect(kritikYetkiVarMi(db(), {}, "finans.iptal")).toBe(false);
  });

  it("tanımsız yetki anahtarı false", () => {
    expect(kritikYetkiVarMi(db(), { id: "u1" }, "olmayan.yetki")).toBe(false);
  });
});

describe("uçtan uca — 100 kayıtlık zincir", () => {
  it("100 kayıt eklenir, temiz çıkar; ortadaki bir kayıt bozulunca yakalanır", () => {
    let db: any = bosDb();
    for (let i = 0; i < 100; i++) {
      db = auditKaydiEkle(db, { kullaniciAdi: "emirhan", islemTuru: `İşlem ${i}`, aciklama: `açıklama ${i}` });
    }
    expect(db.auditGecmisi).toHaveLength(100);
    expect(auditZincirKontrolu(db).uygun).toBe(true);

    db.auditGecmisi[50].aciklama = "değiştirildi";
    const r = auditZincirKontrolu(db);
    expect(r.uygun).toBe(false);
    expect(r.bulgular.some((b: any) => b.id === db.auditGecmisi[50].id)).toBe(true);
  });
});
