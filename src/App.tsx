/* Root App — orchestration only. Business/page modules are in src/modules. */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as R from "./core/akcan-runtime";
import { GirisEkrani, IlkKurulumEkrani } from "./modules/Giris";
import { AnaSayfaSayfasi, StokAnalizMerkeziSayfasi, YoneticiPaneliSayfasi } from "./modules/AnaSayfa";
import { MusteriSiparisiSayfasi, SatisSayfasi, TekliflerSayfasi } from "./modules/Satis";
import { AlisSayfasi, SatinAlmaSiparisiSayfasi, TedarikciKarsilastirmaSayfasi, TedarikciSayfasi } from "./modules/AlisTedarikci";
import { MusteriSayfasi } from "./modules/Musteri";
import { BankaPosSayfasi, GiderYonetimSayfasi, GunSonuSayfasi, HesapSayfasi, IadeSayfasi, TahsilatOdemeSayfasi, VadeTakipSayfasi } from "./modules/Finans";
import { EtiketSayfasi, KargoSayfasi, StokTransferSayfasi, YedekGuvenlikSayfasi } from "./modules/StokOperasyon";
import { HizliAramaSayfasi, SayimSayfasi, SiparisOnerisiSayfasi, StokSayfasi, TopluFiyatSayfasi } from "./modules/Stok";
import { RaporlarSayfasi } from "./modules/Raporlar";
import { AyarlarSayfasi, DisBildirimSayfasi, EntegrasyonlarSayfasi, IceDisaAktarmaSayfasi, KullaniciSayfasi } from "./modules/Yonetim";

export default function App() {
  const [db, setDb] = R.useState(R.bosVeritabani());
  const [loaded, setLoaded] = R.useState(false);
  // İlk kurulum cihaz bazlı değildir; merkezi Supabase kurulum durumu otoritedir.
  const [merkeziKurulumDurumu, setMerkeziKurulumDurumu] = R.useState("kontrol");
  const [saving, setSaving] = R.useState(false);
  const [bildirimler, setBildirimler] = R.useState([]);
  const [sekme, setSekme] = R.useState("anasayfa");
  const [sepet, setSepet] = R.useState([]); // [{ parcaId, adet }] — Perakende Satış modülü eklenene kadar geçici sepet
  const [sepetAcik, setSepetAcik] = R.useState(false);
  const [oturumKullaniciId, setOturumKullaniciId] = R.useState(() => localStorage.getItem("akcan-oturum-kullanici") || null);
  const saveTimer = R.useRef(null);

  R.useEffect(() => {
    R.bildirimAboneAyarla((mesaj, tip) => {
      const id = Date.now() + Math.random();
      setBildirimler((prev) => [...prev, { id, mesaj, tip }]);
      setTimeout(() => setBildirimler((prev) => prev.filter((b) => b.id !== id)), 3500);
    });
    return () => {
      R.bildirimAboneAyarla(null);
    };
  }, []);

  const merkeziVersiyonRef = R.useRef(null);
  const dirtyRef = R.useRef(false);
  const remoteUpdateRef = R.useRef(false);
  const remoteSyncTimerRef = R.useRef(null);
  const ilkMerkeziYuklemeRef = R.useRef(false);
  const [veriCakismasi, setVeriCakismasi] = R.useState(null);
  const [veriCakismasiYukleniyor, setVeriCakismasiYukleniyor] = R.useState(false);

  R.useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const raw = localStorage.getItem(R.STORAGE_KEY);
        if (!iptal && raw) {
          const parsed = JSON.parse(raw);
          setDb(R.veriyiOnar({ ...R.bosVeritabani(), ...parsed }));
        }
      } catch (e) {
        console.warn("Yerel veri okunamadı", e);
      } finally {
        if (!iptal) setLoaded(true);
      }
    })();
    return () => { iptal = true; };
  }, []);

  // Merkezi kurulum kontrolü: başka PC/telefon bu şirketi daha önce kurduysa
  // bu cihazda localStorage boş olsa bile İlk Kurulum ekranı gösterilmez.
  R.useEffect(() => {
    if (!loaded) return;
    let iptal = false;
    (async () => {
      try {
        const sonuc = await R.merkeziIstek("status", { token: null });
        if (iptal) return;
        setMerkeziKurulumDurumu(sonuc?.initialized ? "kurulu" : "kurulmadi");
      } catch (e) {
        if (iptal) return;
        console.warn("Merkezi kurulum durumu alınamadı.", e);
        // Güvenlik gereği merkezi durum doğrulanmadan İlk Kurulum açılmaz.
        setMerkeziKurulumDurumu("hata");
      }
    })();
    return () => { iptal = true; };
  }, [loaded]);

  // Merkezi veri kaynağı artık otoritedir. Yerel localStorage yalnızca
  // çevrimdışı tampon/yedek olarak kullanılır; başka bilgisayarın verisi
  // açılışta yerel verinin üzerine yazılamaz.
  R.useEffect(() => {
    if (!loaded || ilkMerkeziYuklemeRef.current) return;
    ilkMerkeziYuklemeRef.current = true;
    let iptal = false;
    (async () => {
      const token = localStorage.getItem(R.OTURUM_KEY);
      if (!token) return;
      try {
        const sunucu = await R.merkeziIstek("load", { token });
        if (iptal) return;
        const sunucuDb = sunucu?.data || sunucu?.state || sunucu?.db || null;
        if (sunucuDb) {
          remoteUpdateRef.current = true;
          setDb(R.veriyiOnar({ ...R.bosVeritabani(), ...sunucuDb }));
          merkeziVersiyonRef.current = sunucu?.version ?? sunucu?.updatedAt ?? null;
        }
      } catch (e) {
        console.warn("Merkezi ilk yükleme yapılamadı; yerel tampon korunuyor.", e);
      }
    })();
    return () => { iptal = true; };
  }, [loaded, oturumKullaniciId]);

  // Her değişikliği merkezi sunucuya kaydet. localStorage yalnızca çevrimdışı tampon/yedek olarak kalır.
  R.useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(R.STORAGE_KEY, JSON.stringify(db)); } catch {}
    // Uzak bilgisayardan gelen state tekrar sunucuya geri yazılmasın.
    if (remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
      dirtyRef.current = false;
      setSaving(false);
      return;
    }
    const token = localStorage.getItem(R.OTURUM_KEY);
    if (!token || !oturumKullaniciId) return;
    dirtyRef.current = true;
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const sonuc = await R.merkeziIstek("save", { token, method: "POST", body: { data: db, userId: oturumKullaniciId, expectedVersion: merkeziVersiyonRef.current } });
        merkeziVersiyonRef.current = sonuc?.version ?? sonuc?.updatedAt ?? merkeziVersiyonRef.current;
        dirtyRef.current = false;
      } catch (e) {
        // Merkezi kaydetme başarısızsa çevrimdışı tampon kullanılmaya devam eder.
        if (e?.status === 409) {
          // Başka bir bilgisayar aynı sürümü bizden önce kaydetti. Yerel değişikliği
          // kaybetmeden ayrı bir acil yedek olarak sakla ve kullanıcıya açık seçim sun.
          try {
            const yedek = { tarih: new Date().toISOString(), kullaniciId: oturumKullaniciId, version: merkeziVersiyonRef.current, data: db };
            localStorage.setItem("akcan-veri-cakisma-yedegi", JSON.stringify(yedek));
          } catch {}
          try {
            const sunucu = await R.merkeziIstek("load", { token });
            const sunucuDb = sunucu?.data || sunucu?.state || sunucu?.db || null;
            const sunucuVersiyon = sunucu?.version ?? sunucu?.updatedAt ?? null;
            if (sunucuDb && sunucuVersiyon != null) {
              setVeriCakismasi({ serverDb: R.veriyiOnar({ ...R.bosVeritabani(), ...sunucuDb }), serverVersion: sunucuVersiyon });
              R.bildirimGoster("Başka bir bilgisayarda değişiklik yapıldı. Yerel değişikliğin güvenli yedeği oluşturuldu.", "uyari");
            } else {
              R.bildirimGoster("Başka bir bilgisayarda değişiklik yapıldı. Yerel değişiklik güvenli yedeğe alındı.", "hata");
            }
          } catch {
            R.bildirimGoster("Çakışma algılandı. Yerel değişiklik güvenli yedeğe alındı; merkezi veri yeniden okunamadı.", "hata");
          }
          dirtyRef.current = false;
        } else {
          R.bildirimGoster("Merkezi sunucuya kayıt yapılamadı. Yerel yedek korunuyor.", "hata");
        }
      } finally { setSaving(false); }
    }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [db, loaded, oturumKullaniciId]);

  // Çoklu bilgisayar senkronizasyonu: Realtime olayını dinle; yerel kayıt
  // henüz tamamlanıyorsa uzaktaki kaydı kaybetmemek için kayıt tamamlandıktan
  // hemen sonra yeniden yükle. Realtime koparsa 2 saniyelik güvenli fallback
  // kontrolü devam eder.
  R.useEffect(() => {
    if (!loaded || !oturumKullaniciId) return;
    let aktif = true;

    const merkeziYenile = async (eventVersion = null, force = false) => {
      if (!aktif) return;
      const token = localStorage.getItem(R.OTURUM_KEY);
      if (!token) return;

      if (dirtyRef.current && !force) {
        clearTimeout(remoteSyncTimerRef.current);
        remoteSyncTimerRef.current = setTimeout(() => merkeziYenile(eventVersion, true), 1400);
        return;
      }

      try {
        const sonuc = await R.merkeziIstek("load", { token });
        if (!aktif) return;
        const yeni = sonuc?.data || sonuc?.state || sonuc?.db;
        const versiyon = sonuc?.version ?? sonuc?.updatedAt ?? null;
        if (!yeni || versiyon === null) return;
        if (eventVersion != null && String(eventVersion) === String(merkeziVersiyonRef.current)) return;
        if (String(versiyon) !== String(merkeziVersiyonRef.current)) {
          remoteUpdateRef.current = true;
          setDb(R.veriyiOnar({ ...R.bosVeritabani(), ...yeni }));
          merkeziVersiyonRef.current = versiyon;
          try { localStorage.setItem(R.STORAGE_KEY, JSON.stringify(R.veriyiOnar({ ...R.bosVeritabani(), ...yeni }))); } catch {}
        }
      } catch (e) {
        if (e?.status === 401) console.warn("Merkezi veri yenilemede oturum doğrulaması başarısız.");
      }
    };

    // Supabase Realtime: app_events tablosundaki her app_state_changed
    // olayında merkezi state'i yeniden çeker. Kanal adı stabil tutulur;
    // böylece aynı tarayıcı sekmesinde gereksiz kanallar birikmez.
    const channel = R.supabaseRealtime
      .channel("akcan-app-state-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_events", filter: "event_type=eq.app_state_changed" },
        (payload) => {
          const version = payload?.new?.version;
          if (payload?.new?.event_type !== "app_state_changed" || version == null) return;
          clearTimeout(remoteSyncTimerRef.current);
          remoteSyncTimerRef.current = setTimeout(() => merkeziYenile(version), 50);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          R.bildirimGoster("Canlı veri bağlantısı aktif.", "bilgi");
          merkeziYenile(null, true);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          R.bildirimGoster("Canlı bağlantı geçici olarak kesildi. Güvenli otomatik kontrol devam ediyor.", "uyari");
        }
      });

    // İlk yükleme ve Realtime bağlantısı kurulmadan önceki değişiklikler için
    // kısa aralıklı güvenli fallback korunur.
    merkeziYenile(null, true);
    const fallbackTimer = setInterval(() => merkeziYenile(null), 2000);

    return () => {
      aktif = false;
      clearTimeout(remoteSyncTimerRef.current);
      clearInterval(fallbackTimer);
      R.supabaseRealtime.removeChannel(channel);
    };
  }, [loaded, oturumKullaniciId]);

  const updateDb = (fn) => setDb((prev) => fn(prev));

  // Vade takibi — tüm ekranlarda görünen tedarikçi ödeme uyarısı. "Bugün"
  // vadesi gelen/geçen ve önümüzdeki 7 gün içinde vadesi gelecek açık
  // fatura tutarları ayrı ayrı toplanır.
  const bugunIsoApp = R.isoGun(new Date());
  const yediGunSonraIso = R.isoGun(new Date(Date.now() + 7 * 86400000));
  let bugunVeGecmisToplam = 0;
  let yediGunToplam = 0;
  db.malAlimlari.forEach((m) => {
    if (!m.vadeTarihi) return;
    const kalan = (m.faturaGirilenToplam ?? m.hesaplananGenelToplam) - (m.odenenTutar || 0);
    if (kalan <= 0.01) return;
    if (m.vadeTarihi <= bugunIsoApp) bugunVeGecmisToplam += kalan;
    else if (m.vadeTarihi <= yediGunSonraIso) yediGunToplam += kalan;
  });
  const vadeUyariMetni =
    bugunVeGecmisToplam > 0.01 || yediGunToplam > 0.01 ? (
      <>
        {bugunVeGecmisToplam > 0.01 && <span>🔴 Bugün (veya daha önce) {R.tl(bugunVeGecmisToplam)} tedarikçi ödemesi var</span>}
        {yediGunToplam > 0.01 && <span>🟠 Önümüzdeki 7 gün içinde {R.tl(yediGunToplam)} ödeme var</span>}
      </>
    ) : null;

  const aktifKullanici = oturumKullaniciId ? db.kullanicilar.find((k) => k.id === oturumKullaniciId && k.aktif !== false) || null : null;
  const aktifRol = aktifKullanici ? db.roller.find((r) => r.id === aktifKullanici.rolId) : null;

  // Bildirim ve Uyarı Merkezi — tüm sinyaller merkezi olarak toplanıp
  // kullanıcının yetkisine ve kişisel bildirim ayarlarına göre süzülür.
  const [bildirimPaneliAcik, setBildirimPaneliAcik] = R.useState(false);
  const [bildirimAyarlariAcik, setBildirimAyarlariAcik] = R.useState(false);
  const gorunurBildirimler = R.bildirimleriYetkiyeGoreSuz(db, aktifKullanici, R.bildirimleriTopla(db), aktifKullanici?.bildirimAyarlari);
  const toplamBildirimSayisi = gorunurBildirimler.reduce((t, b) => t + b.sayi, 0);
  const bildirimeGit = (b) => {
    setSekme(b.hedefSekme);
    setBildirimPaneliAcik(false);
  };
  const bildirimKategoriAc = (kategori) => {
    updateDb((prev) => ({
      ...prev,
      kullanicilar: prev.kullanicilar.map((k) =>
        k.id === aktifKullanici?.id
          ? { ...k, bildirimAyarlari: { ...k.bildirimAyarlari, kapaliKategoriler: k.bildirimAyarlari.kapaliKategoriler.filter((x) => x !== kategori) } }
          : k
      ),
    }));
  };
  const bildirimKategoriKapat = (kategori) => {
    updateDb((prev) => ({
      ...prev,
      kullanicilar: prev.kullanicilar.map((k) =>
        k.id === aktifKullanici?.id ? { ...k, bildirimAyarlari: { ...k.bildirimAyarlari, kapaliKategoriler: [...k.bildirimAyarlari.kapaliKategoriler, kategori] } } : k
      ),
    }));
  };
  const bildirimAyarGuncelle = (alan, deger) => {
    updateDb((prev) => ({
      ...prev,
      kullanicilar: prev.kullanicilar.map((k) => (k.id === aktifKullanici?.id ? { ...k, bildirimAyarlari: { ...k.bildirimAyarlari, [alan]: deger } } : k)),
    }));
  };

  const cikisYap = () => {
    setOturumKullaniciId(null);
    localStorage.removeItem("akcan-oturum-kullanici");
    localStorage.removeItem(R.OTURUM_KEY);
  };

  // Otomatik ekran kilidi — kasada başıboş bırakılan bir oturumun yetkisiz
  // kullanılmasını engeller. Fare/klavye/tıklama hareketiyle süre sıfırlanır;
  // hiç veri kaybı olmaz, sadece oturum kapanıp giriş ekranına dönülür.
  const EKRAN_KILIDI_DAKIKA = 15;
  R.useEffect(() => {
    if (!aktifKullanici) return;
    let zamanlayici;
    const sifirla = () => {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(cikisYap, EKRAN_KILIDI_DAKIKA * 60 * 1000);
    };
    const olaylar = ["mousemove", "keydown", "click", "touchstart"];
    olaylar.forEach((o) => window.addEventListener(o, sifirla));
    sifirla();
    return () => {
      clearTimeout(zamanlayici);
      olaylar.forEach((o) => window.removeEventListener(o, sifirla));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktifKullanici?.id]);

  const girisYap = async (kullaniciAdi, sifre) => {
    const temizAd = String(kullaniciAdi || "").trim();
    const temizSifre = String(sifre || "");
    const kilit = R.girisKilidiDurumu(temizAd);
    if (kilit.kilitli) {
      R.bildirimGoster(`Bu kullanıcı için çok fazla başarısız giriş denemesi var. ${R.kalanKilitSuresiMetni(kilit.kalanMs)} sonra tekrar deneyin.`, "uyari");
      return false;
    }
    // Eski/bozuk bir token yeni girişin önüne geçmesin.
    localStorage.removeItem(R.OTURUM_KEY);
    localStorage.removeItem("akcan-oturum-kullanici");
    setOturumKullaniciId(null);

    // Önce merkezi giriş.
    try {
      const sonuc = await R.merkeziIstek("login", { method: "POST", token: null, body: { kullaniciAdi: temizAd, sifre: temizSifre } });
      if (sonuc?.token && sonuc?.userId) {
        R.girisBasarili(temizAd);
        localStorage.setItem(R.OTURUM_KEY, sonuc.token);
        localStorage.setItem("akcan-oturum-kullanici", sonuc.userId);
        setOturumKullaniciId(sonuc.userId);
        const sunucuDb = sonuc?.data || sonuc?.state || sonuc?.db;
        if (sunucuDb) {
          const temizDb = R.veriyiOnar({ ...R.bosVeritabani(), ...sunucuDb });
          const girisKaydi = { id: R.yeniId("gg"), tarih: R.zamanDamgasi(), kullaniciAdi: temizAd, basarili: true };
          setDb({ ...temizDb, girisGecmisi: [girisKaydi, ...(temizDb.girisGecmisi || [])].slice(0, 200) });
          merkeziVersiyonRef.current = sonuc?.version ?? sonuc?.updatedAt ?? null;
        } else {
          updateDb((prev) => ({ ...prev, girisGecmisi: [{ id: R.yeniId("gg"), tarih: R.zamanDamgasi(), kullaniciAdi: temizAd, basarili: true }, ...(prev.girisGecmisi || [])].slice(0, 200) }));
        }
        return true;
      }
    } catch (e) {
      console.warn("Merkezi giriş başarısız, yerel kullanıcı kontrol ediliyor.", e);
    }

    // Sunucu geçici olarak cevap vermese bile mevcut kullanıcıyla giriş mümkün.
    const bulunan = db.kullanicilar.find(
      (k) =>
        k.aktif !== false &&
        String(k.kullaniciAdi || "").trim().toLocaleLowerCase("tr-TR") === temizAd.toLocaleLowerCase("tr-TR") &&
        String(k.sifre || "") === temizSifre
    );
    if (!bulunan) {
      const sonuc = R.girisBasarisiz(temizAd);
      try {
        updateDb((prev) => ({ ...prev, girisGecmisi: [{ id: R.yeniId("gg"), tarih: R.zamanDamgasi(), kullaniciAdi: temizAd, basarili: false }, ...(prev.girisGecmisi || [])].slice(0, 200) }));
      } catch {}
      if (sonuc.kilitli) R.bildirimGoster(`Çok fazla başarısız deneme. ${R.kalanKilitSuresiMetni(sonuc.kalanMs)} boyunca bu kullanıcı kilitlendi.`, "uyari");
      return false;
    }

    R.girisBasarili(temizAd);
    updateDb((prev) => ({ ...prev, girisGecmisi: [{ id: R.yeniId("gg"), tarih: R.zamanDamgasi(), kullaniciAdi: bulunan.kullaniciAdi, basarili: true }, ...(prev.girisGecmisi || [])].slice(0, 200) }));
    setOturumKullaniciId(bulunan.id);
    localStorage.setItem("akcan-oturum-kullanici", bulunan.id);
    R.bildirimGoster("Merkezi giriş geçici olarak kullanılamadı; yerel oturum açıldı. Bağlantı gelince veri senkronize edilecek.", "uyari");
    return true;
  };

  const ilkYoneticiOlustur = async (adSoyad, kullaniciAdi, sifre) => {
    const id = R.yeniId("u");
    const yeniKullanici = {
      id,
      adSoyad,
      kullaniciAdi,
      sifre,
      rolId: "rol-yonetici",
      aktif: true,
      sonGiris: R.zamanDamgasi(),
    };
    const yeniDb = {
      ...db,
      kullanicilar: [yeniKullanici, ...(db.kullanicilar || [])],
    };

    // İlk kurulum artık yalnızca cihazın localStorage'ına yazılmaz.
    // Merkezi initialize endpoint'i şirket kurulumunu tekilleştirir.
    try {
      const sonuc = await R.merkeziIstek("initialize", {
        method: "POST",
        token: null,
        body: { data: yeniDb },
      });

      if (!sonuc?.token || !sonuc?.userId) {
        throw new Error("Merkezi ilk kurulum yanıtı geçersiz.");
      }

      setDb(R.veriyiOnar({ ...R.bosVeritabani(), ...(sonuc.data || yeniDb) }));
      merkeziVersiyonRef.current = sonuc?.version ?? sonuc?.updatedAt ?? null;
      localStorage.setItem(R.OTURUM_KEY, sonuc.token);
      localStorage.setItem("akcan-oturum-kullanici", sonuc.userId);
      setOturumKullaniciId(sonuc.userId);
      setMerkeziKurulumDurumu("kurulu");
      R.girisBasarili(kullaniciAdi);
      R.bildirimGoster("İlk kurulum merkezi olarak tamamlandı. Artık telefon ve diğer bilgisayarlardan aynı şirket hesabıyla giriş yapılabilir.", "basari");
    } catch (e) {
      // Başka bir cihaz aynı anda kurulumu tamamladıysa mevcut kullanıcıyla
      // yeniden login denenir; asla ikinci şirket kurulumu yapılmaz.
      if (e?.status === 409) {
        try {
          const sonuc = await R.merkeziIstek("login", {
            method: "POST",
            token: null,
            body: { kullaniciAdi: kullaniciAdi.trim(), sifre },
          });
          if (sonuc?.token && sonuc?.userId) {
            setDb(R.veriyiOnar({ ...R.bosVeritabani(), ...(sonuc.data || yeniDb) }));
            merkeziVersiyonRef.current = sonuc?.version ?? sonuc?.updatedAt ?? null;
            localStorage.setItem(R.OTURUM_KEY, sonuc.token);
            localStorage.setItem("akcan-oturum-kullanici", sonuc.userId);
            setOturumKullaniciId(sonuc.userId);
            setMerkeziKurulumDurumu("kurulu");
            R.girisBasarili(kullaniciAdi);
            return;
          }
        } catch {}
      }
      R.bildirimGoster("Merkezi ilk kurulum tamamlanamadı. Verileriniz bu cihazda şirket kurulumu olarak işaretlenmeden tutuldu; lütfen bağlantıyı kontrol edip tekrar deneyin.", "hata");
    }
  };

  // Yedek dosyasını indirir ve yedek geçmişine "Başarılı ✓" olarak işler.
  const yedekIndirVeKaydet = (tur) => {
    const veri = JSON.stringify(db, null, 2);
    const blob = new Blob([veri], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dosyaAdi = `akcan-grup-yedek-${R.isoGun(new Date())}-${Date.now()}.json`;
    const a = document.createElement("a");
    a.href = url;
    a.download = dosyaAdi;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    updateDb((prev) => ({
      ...prev,
      yedekGecmisi: [{ id: R.yeniId("yd"), tarih: R.zamanDamgasi(), tur, durum: "Başarılı", dosyaAdi }, ...prev.yedekGecmisi],
    }));
    R.bildirimGoster("Yedek indirildi.", "basari");
  };

  const yedekYukleRef = R.useRef(null);
  const yedekYukle = (e) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => {
      try {
        const yuklenenVeri = JSON.parse(ev.target.result);
        if (typeof yuklenenVeri !== "object" || yuklenenVeri === null) {
          R.bildirimGoster("Bu dosya geçerli bir AKCAN GROUP yedeği gibi görünmüyor.", "hata");
          return;
        }
        setDb(R.veriyiOnar({ ...R.bosVeritabani(), ...yuklenenVeri }));
        R.bildirimGoster("Yedek başarıyla geri yüklendi.", "basari");
      } catch (err) {
        R.bildirimGoster("Dosya okunamadı. Geçerli bir JSON yedek dosyası seçtiğinizden emin olun.", "hata");
      }
    };
    okuyucu.readAsText(dosya);
    e.target.value = "";
  };

  // Otomatik yedekleme hatırlatıcısı — uygulama açıkken belirlenen saat
  // geçtiyse ve o dönem için henüz yedek alınmadıysa köşede uyarır. Tarayıcı
  // sekmesi kapalıyken sessiz/arka planda çalışamaz; bu, o kısıtın içindeki
  // en yakın pratik çözümdür.
  const [yedekHatirlaticiGoster, setYedekHatirlaticiGoster] = R.useState(false);
  R.useEffect(() => {
    if (!loaded || !db.yedekAyarlari.aktif) return;
    const kontrolEt = () => {
      const simdi = new Date();
      const [saatH, saatM] = (db.yedekAyarlari.saat || "23:00").split(":").map(Number);
      if (simdi.getHours() < saatH || (simdi.getHours() === saatH && simdi.getMinutes() < saatM)) return;
      const sonYedek = db.yedekGecmisi[0];
      const esikGun = db.yedekAyarlari.sıklik === "aylik" ? 28 : db.yedekAyarlari.sıklik === "haftalik" ? 6 : 0;
      const gecmisGunSayisi = sonYedek ? Math.floor((Date.now() - new Date(sonYedek.tarih).getTime()) / 86400000) : Infinity;
      if (gecmisGunSayisi > esikGun) setYedekHatirlaticiGoster(true);
    };
    kontrolEt();
    const zamanlayici = setInterval(kontrolEt, 5 * 60 * 1000);
    return () => clearInterval(zamanlayici);
  }, [loaded, db.yedekAyarlari, db.yedekGecmisi]);

  // Süresi geçen rezervleri otomatik "Süresi Doldu"ya çevirir — ürün stoğu
  // bu sayede tekrar satılabilir hale döner. Uygulama açıldığında ve her 30
  // dakikada bir kontrol edilir; kaç rezervin süresinin dolduğu bir banner'da gösterilir.
  const [suresiDolanRezervSayisi, setSuresiDolanRezervSayisi] = R.useState(0);
  R.useEffect(() => {
    if (!loaded) return;
    const kontrolEt = () => {
      setDb((prev) => {
        const oncekiBekleyenler = prev.rezervler.filter((r) => r.durum === "Bekliyor").length;
        const sonuc = R.suresiGecenRezervleriGuncelle(prev);
        const sonrakiBekleyenler = sonuc.rezervler.filter((r) => r.durum === "Bekliyor").length;
        const yeniDolan = oncekiBekleyenler - sonrakiBekleyenler;
        if (yeniDolan > 0) setSuresiDolanRezervSayisi((s) => s + yeniDolan);
        return sonuc;
      });
    };
    kontrolEt();
    const zamanlayici = setInterval(kontrolEt, 30 * 60 * 1000);
    return () => clearInterval(zamanlayici);
  }, [loaded]);

  // Kategoriler sayfasındaki "Toplu Fiyat Güncelle / Sayım Başlat / Satış
  // Raporu / Kâr Raporu" kısayolları, seçilen kategoriyi ilgili sayfaya
  // önceden seçili olarak taşır — kullanıcı tekrar filtre seçmek zorunda kalmaz.
  const [kategoriHedefi, setKategoriHedefi] = R.useState(null);
  const kategoriHedefineGit = (kategoriAdi, hedef) => {
    if (hedef === "raporlar-satis") {
      setKategoriHedefi({ kategori: kategoriAdi, altSekme: "satis" });
      setSekme("raporlar");
    } else if (hedef === "raporlar-kar") {
      setKategoriHedefi({ kategori: kategoriAdi, altSekme: "kar" });
      setSekme("raporlar");
    } else {
      setKategoriHedefi({ kategori: kategoriAdi });
      setSekme(hedef);
    }
  };

  // Satış ekranında "Stokta yok — Müşteri siparişi oluştur?" tıklandığında
  // Müşteri Siparişi sayfasına, ürün önceden seçili olarak taşır.
  const [musteriSiparisiHedefUrun, setMusteriSiparisiHedefUrun] = R.useState(null);
  const musteriSiparisiBaslat = (parcaId) => {
    setMusteriSiparisiHedefUrun(parcaId);
    setSekme("musterisiparisi");
  };

  // Hızlı İşlem Merkezi / Klavye Kısayolları — her ekrandan çalışan genel
  // gezinme kısayolları. F2/F8/F9 gibi Satış ekranına özgü ince-taneli
  // davranışlar (odaklanma, satışı tamamlama) zaten SatisSayfasi içinde
  // yerel olarak yönetiliyor; buradaki genel kısayollar sadece SEKME
  // DEĞİŞTİRİR — o yüzden ikisi asla çakışmaz.
  const [yeniFormSinyali, setYeniFormSinyali] = R.useState(0);
  const [yeniMusteriOnDoldurAdi, setYeniMusteriOnDoldurAdi] = R.useState("");
  // Satış ekranında müşteri aranıp bulunamadığında "+ Yeni Müşteri" tıklanınca
  // — hızlı müşteri ekleme (3. madde): telefon/ad yazılan metin, yeni müşteri
  // formuna aktarılır.
  const yeniMusteriBaslat = (aranan) => {
    setYeniMusteriOnDoldurAdi(aranan);
    setSekme("musteri");
    setYeniFormSinyali((v) => v + 1);
  };

  // Ekstre ekranındaki "Belgeye Git" — ilgili satışın belge no'sunu tıklayınca
  // doğrudan Belgeler ekranına gidip o satışın detayını otomatik açar.
  const [belgeHedefiSatisId, setBelgeHedefiSatisId] = R.useState(null);
  const belgeyeGit = (satisId) => {
    setBelgeHedefiSatisId(satisId);
    setSekme("belgeler");
  };

  // Vade Takip ekranındaki "Müşteri → Açık faturalar → Tahsilat yap" /
  // "Tedarikçi → Açık faturalar → Ödeme yap" kısayolları.
  const [hedefMusteriId, setHedefMusteriId] = R.useState(null);
  const [hedefTedarikciId, setHedefTedarikciId] = R.useState(null);
  const musteriyeGit = (musteriId) => {
    setHedefMusteriId(musteriId);
    setSekme("musteri");
  };
  const tedarikciyeGit = (tedarikciId) => {
    setHedefTedarikciId(tedarikciId);
    setSekme("tedarikci");
  };

  R.useEffect(() => {
    const kis = db.ayarlar.klavyeKisayollari || R.VARSAYILAN_KISAYOLLAR;
    const dinleyici = (e) => {
      const etiket = document.activeElement?.tagName;
      const editableAlanda = etiket === "TEXTAREA" || document.activeElement?.isContentEditable;
      if (editableAlanda && e.key.length === 1) return; // normal yazı girişini engelleme
      switch (e.key) {
        case kis.yeniSatis:
          e.preventDefault();
          setSekme("satis");
          break;
        case kis.musteriAra:
          e.preventDefault();
          setSekme("musteri");
          break;
        case kis.yeniMusteri:
          e.preventDefault();
          setSekme("musteri");
          setYeniFormSinyali((v) => v + 1);
          break;
        case kis.yeniUrun:
          e.preventDefault();
          setSekme("stok");
          setYeniFormSinyali((v) => v + 1);
          break;
        case kis.tahsilat:
          e.preventDefault();
          setSekme("kasa");
          break;
        case kis.alis:
          e.preventDefault();
          setSekme("alis");
          break;
        case kis.kasa:
          e.preventDefault();
          setSekme("kasayonetimi");
          break;
        case kis.odeme:
        case kis.satisiTamamla:
          // Satış ekranındaysa bu tuşlar zaten SatisSayfasi içindeki yerel
          // dinleyici tarafından (odeme alanına kaydırma / satışı tamamlama
          // olarak) yönetiliyor — burada sadece BAŞKA bir sekmedeyken Satış
          // ekranına geçiş yaptırır, çakışma olmaz.
          if (sekme !== "satis") {
            e.preventDefault();
            setSekme("satis");
          }
          break;
        case "Escape":
          if (bildirimPaneliAcik) setBildirimPaneliAcik(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", dinleyici);
    return () => window.removeEventListener("keydown", dinleyici);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.ayarlar.klavyeKisayollari, bildirimPaneliAcik, sekme]);

  // Markalar sayfasındaki "Şimdi Uygula" — marka fiyat kuralını (taban+oran)
  // Toplu Fiyat Güncelle sayfasına önceden dolu olarak taşır.
  const [markaHedefi, setMarkaHedefi] = R.useState(null);
  const markaHedefineGit = (markaAdi, taban, oran) => {
    setMarkaHedefi({ marka: markaAdi, taban, oran });
    setSekme("topluFiyat");
  };

  const cakismaSunucuyuKullan = () => {
    if (!veriCakismasi) return;
    remoteUpdateRef.current = true;
    setDb(veriCakismasi.serverDb);
    merkeziVersiyonRef.current = veriCakismasi.serverVersion;
    dirtyRef.current = false;
    setVeriCakismasi(null);
    R.bildirimGoster("Merkezi sürüm yüklendi. Çakışan yerel değişiklik güvenli yedekte tutuluyor.", "basari");
  };

  const cakismaYereliKullan = async () => {
    if (!veriCakismasi) return;
    setVeriCakismasiYukleniyor(true);
    try {
      const token = localStorage.getItem(R.OTURUM_KEY);
      const sonuc = await R.merkeziIstek("save", {
        token,
        method: "POST",
        body: { data: db, userId: oturumKullaniciId, expectedVersion: veriCakismasi.serverVersion },
      });
      merkeziVersiyonRef.current = sonuc?.version ?? sonuc?.updatedAt ?? veriCakismasi.serverVersion;
      dirtyRef.current = false;
      setVeriCakismasi(null);
      try { localStorage.removeItem("akcan-veri-cakisma-yedegi"); } catch {}
      R.bildirimGoster("Yerel değişiklikler merkezi sürümün üzerine güvenli şekilde kaydedildi.", "basari");
    } catch (e) {
      R.bildirimGoster(e?.status === 409 ? "Sunucu sürümü yeniden değişti. Lütfen tekrar seçim yapın." : "Yerel değişiklikler merkezi sunucuya yazılamadı.", "hata");
      if (e?.status === 409) {
        setVeriCakismasiYukleniyor(false);
        return;
      }
    } finally { setVeriCakismasiYukleniyor(false); }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: R.T.steel100 }}>
        <style>{R.fontImport}</style>
        <div className="flex items-center gap-2" style={{ color: R.T.ink500 }}>
          <R.Loader2 className="animate-spin" size={18} />
          <span style={R.DISPLAY}>YÜKLENİYOR…</span>
        </div>
      </div>
    );
  }

  // İlk kurulum yalnızca merkezi sistem "kurulmadı" diyorsa açılır.
  // Böylece telefon/başka PC localStorage boş olsa bile yeniden kurulum istemez.
  if (merkeziKurulumDurumu === "kontrol" || merkeziKurulumDurumu === "hata") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: R.T.steel100 }}>
        <style>{R.fontImport}</style>
        <div className="flex items-center gap-2" style={{ color: R.T.ink500 }}>
          <R.Loader2 className="animate-spin" size={18} />
          <span style={R.DISPLAY}>MERKEZİ KURULUM DURUMU KONTROL EDİLİYOR…</span>
        </div>
      </div>
    );
  }

  if (merkeziKurulumDurumu === "kurulmadi") {
    return <IlkKurulumEkrani onOlustur={ilkYoneticiOlustur} />;
  }

  // Oturum yoksa (veya oturumdaki kullanıcı silinmiş/pasife alınmışsa) giriş ekranı gösterilir.
  if (!aktifKullanici) {
    return <GirisEkrani onGiris={girisYap} />;
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#F3F5F7", fontFamily: "'Inter', sans-serif" }}>
      <style>{R.fontImport}</style>
      {veriCakismasi && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,.58)" }}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FEF3C7", color: "#92400E" }}>
                <R.AlertTriangle size={20} />
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: R.T.graphite900 }}>Veri çakışması algılandı</div>
                <div className="text-sm mt-1" style={{ color: R.T.ink500 }}>Başka bir bilgisayar bu veriyi sizden önce değiştirdi. Yerel değişikliğiniz kaybolmaması için güvenli yedeğe alındı.</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <button onClick={cakismaSunucuyuKullan} className="w-full rounded-xl px-4 py-3 text-left border" style={{ borderColor: "#D1D5DB" }}>
                <div className="font-semibold">Merkezi sürümü kullan</div>
                <div className="text-xs mt-1" style={{ color: R.T.ink500 }}>Diğer bilgisayardaki güncel veriyi yükler. Yerel değişiklik yedeği korunur.</div>
              </button>
              <button onClick={cakismaYereliKullan} disabled={veriCakismasiYukleniyor} className="w-full rounded-xl px-4 py-3 text-left text-white" style={{ background: "#14532D", opacity: veriCakismasiYukleniyor ? .65 : 1 }}>
                <div className="font-semibold">Benim değişikliklerimi kullan</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,.78)" }}>{veriCakismasiYukleniyor ? "Merkezi sürüm doğrulanıyor…" : "Yerel değişiklikleri güncel merkezi sürümün üzerine kaydeder."}</div>
              </button>
            </div>
            <div className="mt-4 text-[11px]" style={{ color: R.T.ink500 }}>Güvenlik: Çakışan yerel kayıt <b>akcan-veri-cakisma-yedegi</b> anahtarında geçici yedek olarak tutulur.</div>
          </div>
        </div>
      )}

      <aside className="hidden md:flex flex-col w-72 shrink-0 shadow-xl" style={{ background: R.T.graphite900, color: "#fff" }}>
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: "#14532D" }}>
              <R.Car size={19} color="#fff" />
            </div>
            <div className="min-w-0">
              <div style={{ ...R.DISPLAY, fontSize: 17, letterSpacing: 0.8, lineHeight: 1.05 }}>AKCAN GROUP</div>
              <div style={{ ...R.DISPLAY, fontSize: 12, letterSpacing: 0.6, color: "#fff", marginTop: 2 }}>OTOMOTİV</div>
              <div className="text-[9px] uppercase tracking-[0.16em] mt-1" style={{ color: R.T.steel300 }}>
                Yedek Parça • Servis • Satış
              </div>
            </div>
          </div>
        </div>
        <R.TehlikeSeridi h={3} />
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {[
            { id: "anasayfa", ad: "Ana Sayfa", ikon: R.LayoutDashboard },
            { id: "yoneticipaneli", ad: "Yönetici Kontrol Paneli", ikon: R.BarChart3, yetki: "raporlariGorebilir" },
            { id: "satis", ad: "Satış / Kasa", ikon: R.ShoppingCart, yetki: "satisYapabilir" },
            { id: "alis", ad: "Mal Alış", ikon: R.Truck, yetki: "malAlisGirebilir" },
            { id: "tedarikci", ad: "Tedarikçiler", ikon: R.Building2, yetki: "cariHesapGorebilir" },
            { id: "musteri", ad: "Müşteriler", ikon: R.Users, yetki: "cariHesapGorebilir" },
            { id: "vadetakip", ad: "Vade Takip", ikon: R.Calendar, yetki: "cariHesapGorebilir" },
            { id: "gunsonu", ad: "Gün Sonu", ikon: R.Lock, yetki: "kasaGorebilir" },
            { id: "teklifler", ad: "Teklifler", ikon: R.FileText, yetki: "satisYapabilir" },
            { id: "kargo", ad: "Kargo / Teslimat", ikon: R.Truck, yetki: "satisYapabilir" },
            { id: "kasa", ad: "Tahsilat / Ödeme", ikon: R.Wallet, yetki: "tahsilatGirebilir" },
            { id: "kasayonetimi", ad: "Kasa Yönetimi", ikon: R.Landmark, yetki: "kasaGorebilir" },
            { id: "iade", ad: "İadeler", ikon: R.RotateCcw, yetki: "iadeAlabilir" },
            { id: "raf", ad: "Raf / Depo", ikon: R.MapPin },
            { id: "siparis", ad: "Sipariş Önerisi", ikon: R.ClipboardList },
            { id: "olustok", ad: "Ölü Stok / Yavaş Hareket", ikon: R.Package },
            { id: "devirhizi", ad: "Stok Devir Hızı", ikon: R.BarChart3 },
            { id: "stokanaliz", ad: "Stok Analiz Merkezi", ikon: R.Gauge },
            { id: "topluFiyat", ad: "Toplu Fiyat Güncelle", ikon: R.Percent, yetki: "fiyatDegistirebilir" },
            { id: "sayim", ad: "Stok Sayımı", ikon: R.ClipboardList, yetki: "stokDuzeltebilir" },
            { id: "raporlar", ad: "Raporlar", ikon: R.BarChart3, yetki: "raporlariGorebilir" },
            { id: "arama", ad: "Hızlı Arama", ikon: R.Zap },
            { id: "stok", ad: "Stok / Parça", ikon: R.Package },
            { id: "kategoriler", ad: "Kategoriler", ikon: R.ListOrdered },
            { id: "markalar", ad: "Markalar", ikon: R.Building2 },
            { id: "araclar", ad: "Araçlar", ikon: R.Car },
            { id: "rezervler", ad: "Rezervler", ikon: R.ClipboardList, yetki: "satisYapabilir" },
            { id: "musterisiparisi", ad: "Müşteri Siparişi", ikon: R.PackageSearch, yetki: "satisYapabilir" },
            { id: "fiyatkurallari", ad: "İskonto / Özel Fiyat", ikon: R.Percent, yetki: "fiyatDegistirebilir" },
            { id: "belgeler", ad: "Belgeler", ikon: R.FileDown },
            { id: "giderler", ad: "Gider Yönetimi", ikon: R.Wallet, yetki: "kasaCikisiYapabilir" },
            { id: "iceDisaAktar", ad: "İçe / Dışa Aktar", ikon: R.FileDown, yetki: "urunSilebilir" },
            { id: "bankapos", ad: "Banka / POS", ikon: R.CreditCard, yetki: "kasaGorebilir" },
            { id: "satinalma", ad: "Satın Alma Siparişi", ikon: R.ClipboardList, yetki: "malAlisGirebilir" },
            { id: "tedarikcikarsilastirma", ad: "Tedarikçi Karşılaştırma", ikon: R.Truck, yetki: "malAlisGirebilir" },
            { id: "transferler", ad: "Depolar / Transfer", ikon: R.Truck, yetki: "stokDuzeltebilir" },
            { id: "kullanicilar", ad: "Kullanıcılar", ikon: R.ShieldCheck, yetki: "kullaniciYonetebilir" },
            { id: "etiket", ad: "Barkod / Etiket", ikon: R.ScanLine },
            { id: "yedekguvenlik", ad: "Yedekleme / Güvenlik", ikon: R.ShieldCheck },
            { id: "entegrasyonlar", ad: "Entegrasyonlar", ikon: R.Zap },
            { id: "disbildirim", ad: "Dış Bildirimler", ikon: R.Bell },
            { id: "ayarlar", ad: "Ayarlar", ikon: R.Settings, yetki: "kullaniciYonetebilir" },
          ]
            .filter((m) => !m.yetki || R.yetkiVarMi(db, aktifKullanici, m.yetki))
            .map((m) => {
              const Ikon = m.ikon;
              const aktif = sekme === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSekme(m.id)}
                  className="akcan-nav w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all text-left"
                  style={{ background: aktif ? "#14532D" : "transparent", color: aktif ? "#fff" : R.T.steel300, boxShadow: aktif ? "0 6px 18px rgba(20,83,45,.28)" : "none" }}
                >
                  <Ikon size={17} />
                  {m.ad}
                </button>
              );
            })}
        </nav>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${R.T.graphite700}` }}>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "#fff" }}>
              {aktifKullanici.adSoyad}
            </div>
            <div className="text-[10px]" style={{ color: R.T.steel300 }}>
              {aktifRol?.ad || "—"}
            </div>
          </div>
          <button onClick={cikisYap} title="Çıkış Yap" className="shrink-0" style={{ color: R.T.steel300 }}>
            <R.LogOut size={15} />
          </button>
        </div>
        <div className="px-5 py-4 text-[11px]" style={{ color: R.T.steel300, borderTop: `1px solid ${R.T.graphite700}` }}>
          {saving ? "Kaydediliyor…" : "Tüm veriler kayıtlı"} · {R.bugun()}
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 px-5 md:px-8 py-4 md:py-5 bg-white/95 backdrop-blur" style={{ borderBottom: `1px solid ${R.T.steel200}`, boxShadow: "0 1px 10px rgba(20,23,26,.04)" }}>
          <div className="md:hidden mb-1" style={{ ...R.DISPLAY, fontSize: 13, color: "#14532D", letterSpacing: 0.5 }}>
            AKCAN GRUP
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 style={{ ...R.DISPLAY, fontSize: 22, color: R.T.ink900 }}>
              {sekme === "anasayfa"
                ? "Ana Sayfa"
                : sekme === "yoneticipaneli"
                ? "Yönetici Kontrol Paneli"
                : sekme === "arama"
                ? "Hızlı Arama"
                : sekme === "stok"
                ? "Stok / Parça"
                : sekme === "kategoriler"
                ? "Kategoriler"
                : sekme === "markalar"
                ? "Markalar"
                : sekme === "araclar"
                ? "Araçlar"
                : sekme === "rezervler"
                ? "Rezervler"
                : sekme === "musterisiparisi"
                ? "Müşteri Siparişi"
                : sekme === "fiyatkurallari"
                ? "İskonto / Özel Fiyat"
                : sekme === "belgeler"
                ? "Belgeler"
                : sekme === "giderler"
                ? "Gider Yönetimi"
                : sekme === "iceDisaAktar"
                ? "İçe / Dışa Aktar"
                : sekme === "bankapos"
                ? "Banka / POS"
                : sekme === "satinalma"
                ? "Satın Alma Siparişi"
                : sekme === "tedarikcikarsilastirma"
                ? "Tedarikçi Karşılaştırma"
                : sekme === "transferler"
                ? "Depolar / Transfer"
                : sekme === "alis"
                ? "Mal Alış"
                : sekme === "tedarikci"
                ? "Tedarikçiler"
                : sekme === "musteri"
                ? "Müşteriler"
                : sekme === "vadetakip"
                ? "Vade Takip"
                : sekme === "gunsonu"
                ? "Gün Sonu"
                : sekme === "teklifler"
                ? "Teklifler"
                : sekme === "kargo"
                ? "Kargo / Teslimat"
                : sekme === "kasa"
                ? "Tahsilat / Ödeme"
                : sekme === "kasayonetimi"
                ? "Kasa Yönetimi"
                : sekme === "iade"
                ? "İadeler"
                : sekme === "raf"
                ? "Raf / Depo"
                : sekme === "siparis"
                ? "Sipariş Önerisi"
                : sekme === "olustok"
                ? "Ölü Stok / Yavaş Hareket"
                : sekme === "devirhizi"
                ? "Stok Devir Hızı"
                : sekme === "stokanaliz"
                ? "Stok Analiz Merkezi"
                : sekme === "topluFiyat"
                ? "Toplu Fiyat Güncelle"
                : sekme === "sayim"
                ? "Stok Sayımı"
                : sekme === "raporlar"
                ? "Raporlar"
                : sekme === "kullanicilar"
                ? "Kullanıcılar / Yetkilendirme"
                : sekme === "etiket"
                ? "Barkod / Etiket"
                : sekme === "yedekguvenlik"
                ? "Yedekleme / Güvenlik"
                : sekme === "entegrasyonlar"
                ? "Entegrasyonlar"
                : sekme === "disbildirim"
                ? "Dış Bildirimler"
                : sekme === "ayarlar"
                ? "Ayarlar"
                : "Satış / Kasa"}
            </h1>
            <button
              onClick={() => setBildirimPaneliAcik((v) => !v)}
              className="relative flex items-center justify-center w-9 h-9 rounded-md shrink-0"
              style={{ border: `1px solid ${R.T.steel300}`, color: R.T.ink500 }}
              title="Bildirimler"
            >
              <R.Bell size={16} />
              {toplamBildirimSayisi > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: R.T.red, color: "#fff", minWidth: 17, height: 17, padding: "0 3px" }}
                >
                  {toplamBildirimSayisi > 99 ? "99+" : toplamBildirimSayisi}
                </span>
              )}
            </button>
            {sekme !== "satis" && (
              <button
                onClick={() => setSekme("satis")}
                className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold shrink-0"
                style={{ background: R.T.graphite900, color: "#fff" }}
              >
                <R.ShoppingCart size={15} />
                <span className="hidden sm:inline">Sepet</span>
                {sepet.length > 0 && (
                  <span
                    className="flex items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: R.T.orange, color: "#fff", minWidth: 18, height: 18, padding: "0 4px" }}
                  >
                    {sepet.reduce((t, s) => t + s.adet, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>
        {vadeUyariMetni && (
          <div
            className="mx-5 md:mx-8 mt-4 px-4 py-2.5 rounded-md text-sm font-semibold flex flex-wrap items-center gap-x-4 gap-y-1"
            style={{ background: "#F9DEDE", color: R.T.red }}
          >
            {vadeUyariMetni}
          </div>
        )}
        {yedekHatirlaticiGoster && (
          <div
            className="mx-5 md:mx-8 mt-4 px-4 py-2.5 rounded-md flex items-center justify-between gap-3 text-sm flex-wrap"
            style={{ background: "#FDF1D6", color: "#8A6110" }}
          >
            <span>⏰ Planlanan yedekleme zamanı geldi ama bugün henüz yedek alınmadı.</span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  yedekIndirVeKaydet(db.yedekAyarlari.sıklik);
                  setYedekHatirlaticiGoster(false);
                }}
                className="font-semibold underline"
              >
                Şimdi Yedek Al
              </button>
              <button onClick={() => setYedekHatirlaticiGoster(false)} style={{ color: "#8A6110" }}>
                <R.X size={14} />
              </button>
            </div>
          </div>
        )}
        {suresiDolanRezervSayisi > 0 && (
          <div
            className="mx-5 md:mx-8 mt-4 px-4 py-2.5 rounded-md flex items-center justify-between gap-3 text-sm flex-wrap"
            style={{ background: "#F9DEDE", color: R.T.red }}
          >
            <span>
              ⚠️ {suresiDolanRezervSayisi} rezervin süresi doldu — ilgili ürünler otomatik olarak tekrar satılabilir stoğa döndü.
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setSekme("rezervler");
                  setSuresiDolanRezervSayisi(0);
                }}
                className="font-semibold underline"
              >
                Rezervleri Gör
              </button>
              <button onClick={() => setSuresiDolanRezervSayisi(0)} style={{ color: R.T.red }}>
                <R.X size={14} />
              </button>
            </div>
          </div>
        )}
        <input ref={yedekYukleRef} type="file" accept=".json,application/json" onChange={yedekYukle} className="hidden" />
        <div className="px-5 md:px-8 py-6">
          {sekme === "anasayfa" && <AnaSayfaSayfasi db={db} setSekme={setSekme} />}
          {sekme === "yoneticipaneli" && <YoneticiPaneliSayfasi db={db} setSekme={setSekme} aktifKullanici={aktifKullanici} />}
          {sekme === "satis" && (
            <SatisSayfasi db={db} updateDb={updateDb} sepet={sepet} setSepet={setSepet} aktifKullanici={aktifKullanici} musteriSiparisiBaslat={musteriSiparisiBaslat} yeniMusteriBaslat={yeniMusteriBaslat} />
          )}
          {sekme === "alis" && <AlisSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "tedarikci" && <TedarikciSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} belgeyeGit={belgeyeGit} hedefTedarikciId={hedefTedarikciId} />}
          {sekme === "musteri" && (
            <MusteriSayfasi
              db={db}
              updateDb={updateDb}
              aktifKullanici={aktifKullanici}
              setSepet={setSepet}
              setSekme={setSekme}
              yeniFormSinyali={yeniFormSinyali}
              yeniMusteriOnDoldurAdi={yeniMusteriOnDoldurAdi}
              belgeyeGit={belgeyeGit}
              hedefMusteriId={hedefMusteriId}
            />
          )}
          {sekme === "vadetakip" && <VadeTakipSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} musteriyeGit={musteriyeGit} tedarikciyeGit={tedarikciyeGit} />}
          {sekme === "gunsonu" && <GunSonuSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "teklifler" && <TekliflerSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} setSekme={setSekme} setSepet={setSepet} />}
          {sekme === "kargo" && <KargoSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} belgeyeGit={belgeyeGit} />}
          {sekme === "kasa" && <TahsilatOdemeSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "kasayonetimi" && <HesapSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "iade" && <IadeSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "raf" && <R.RafSayfasi db={db} />}
          {sekme === "siparis" && <SiparisOnerisiSayfasi db={db} updateDb={updateDb} setSekme={setSekme} aktifKullanici={aktifKullanici} />}
          {sekme === "olustok" && <R.OluStokSayfasi db={db} updateDb={updateDb} setSekme={setSekme} />}
          {sekme === "devirhizi" && <R.StokDevirHiziSayfasi db={db} setSekme={setSekme} />}
          {sekme === "stokanaliz" && <StokAnalizMerkeziSayfasi db={db} setSekme={setSekme} />}
          {sekme === "topluFiyat" && <TopluFiyatSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} baslangicKategori={kategoriHedefi} baslangicMarka={markaHedefi} />}
          {sekme === "sayim" && <SayimSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} baslangicKategori={kategoriHedefi} baslangicMarka={markaHedefi} />}
          {sekme === "raporlar" && <RaporlarSayfasi db={db} baslangicKategori={kategoriHedefi} baslangicMarka={markaHedefi} />}
          {sekme === "arama" && <HizliAramaSayfasi db={db} updateDb={updateDb} sepet={sepet} setSepet={setSepet} aktifKullanici={aktifKullanici} />}
          {sekme === "stok" && <StokSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} yeniFormSinyali={yeniFormSinyali} />}
          {sekme === "kategoriler" && <R.KategoriSayfasi db={db} updateDb={updateDb} setSekme={setSekme} kategoriHedefineGit={kategoriHedefineGit} />}
          {sekme === "markalar" && <R.MarkaSayfasi db={db} updateDb={updateDb} markaHedefineGit={markaHedefineGit} />}
          {sekme === "araclar" && <R.AracSayfasi db={db} updateDb={updateDb} sepet={sepet} setSepet={setSepet} />}
          {sekme === "rezervler" && <R.RezervSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "musterisiparisi" && (
            <MusteriSiparisiSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} baslangicUrun={musteriSiparisiHedefUrun} />
          )}
          {sekme === "fiyatkurallari" && <R.FiyatKurallariSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "belgeler" && <R.BelgelerSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} setSekme={setSekme} belgeHedefiSatisId={belgeHedefiSatisId} />}
          {sekme === "giderler" && <GiderYonetimSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "iceDisaAktar" && <IceDisaAktarmaSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "bankapos" && <BankaPosSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "satinalma" && <SatinAlmaSiparisiSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "tedarikcikarsilastirma" && <TedarikciKarsilastirmaSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} setSekme={setSekme} />}
          {sekme === "transferler" && <StokTransferSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "kullanicilar" && <KullaniciSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} setSekme={setSekme} />}
          {sekme === "etiket" && <EtiketSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "yedekguvenlik" && (
            <YedekGuvenlikSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} yedekIndirVeKaydet={yedekIndirVeKaydet} yedekYukleRef={yedekYukleRef} />
          )}
          {sekme === "entegrasyonlar" && <EntegrasyonlarSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "disbildirim" && <DisBildirimSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} />}
          {sekme === "ayarlar" && <AyarlarSayfasi db={db} updateDb={updateDb} aktifKullanici={aktifKullanici} setSekme={setSekme} />}
        </div>
      </main>

      {bildirimler.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
          {bildirimler.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs"
              style={{
                background: b.tip === "hata" ? "#F9DEDE" : b.tip === "basari" ? "#DEF0DF" : "#fff",
                color: b.tip === "hata" ? R.T.red : b.tip === "basari" ? R.T.green : R.T.ink900,
                border: `1px solid ${R.T.steel200}`,
              }}
            >
              {b.tip === "basari" && <R.Check size={15} className="shrink-0" />}
              {b.tip === "hata" && <R.AlertTriangle size={15} className="shrink-0" />}
              <span>{b.mesaj}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bildirim ve Uyarı Merkezi paneli */}
      {bildirimPaneliAcik && (
        <div className="fixed inset-0 z-[90]" onClick={() => setBildirimPaneliAcik(false)}>
          <div
            className="absolute right-4 md:right-8 top-16 w-full max-w-sm rounded-lg shadow-xl overflow-hidden"
            style={{ background: "#fff", border: `1px solid ${R.T.steel200}`, maxHeight: "75vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${R.T.steel200}` }}>
              <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                🔔 {toplamBildirimSayisi} Bildirim
              </span>
              <button onClick={() => setBildirimAyarlariAcik(true)} title="Bildirim Ayarları" style={{ color: R.T.ink500 }}>
                <R.Settings size={16} />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {gorunurBildirimler.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: R.T.ink500 }}>
                  Şu an gösterilecek bildirim yok.
                </p>
              ) : (
                ["kritik", "onemli", "uyari", "bilgi"].map((oncelik) => {
                  const grup = gorunurBildirimler.filter((b) => b.oncelik === oncelik);
                  if (grup.length === 0) return null;
                  return (
                    <div key={oncelik}>
                      <div className="px-4 py-1.5 text-xs font-semibold uppercase" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                        {R.BILDIRIM_ONCELIK_GORSEL[oncelik].emoji} {R.BILDIRIM_ONCELIK_GORSEL[oncelik].etiket}
                      </div>
                      {grup.map((b, i) => (
                        <button
                          key={`${b.kategori}-${i}`}
                          onClick={() => bildirimeGit(b)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-start gap-2"
                          style={{ borderTop: `1px solid ${R.T.steel200}` }}
                        >
                          <span>{R.BILDIRIM_ONCELIK_GORSEL[b.oncelik].emoji}</span>
                          <span style={{ color: R.T.ink900 }}>{b.mesaj}</span>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bildirim Ayarları */}
      {bildirimAyarlariAcik && aktifKullanici && (
        <div className="fixed inset-0 z-[95] flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setBildirimAyarlariAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Bildirim Ayarları
              </h3>
              <button onClick={() => setBildirimAyarlariAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={aktifKullanici.bildirimAyarlari.sesliUyari} onChange={(e) => bildirimAyarGuncelle("sesliUyari", e.target.checked)} />
                <span style={{ color: R.T.ink900 }}>Sesli uyarı</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={aktifKullanici.bildirimAyarlari.masaustuBildirimi}
                  onChange={(e) => {
                    bildirimAyarGuncelle("masaustuBildirimi", e.target.checked);
                    if (e.target.checked && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
                  }}
                />
                <span style={{ color: R.T.ink900 }}>Masaüstü bildirimi (tarayıcı izni gerekir)</span>
              </label>
              <p className="text-xs" style={{ color: R.T.ink500 }}>
                E-posta ve SMS/WhatsApp bildirimleri, gerçek bir entegratör/sunucu bileşeni gerektirdiğinden bu
                tarayıcı-içi uygulamada henüz desteklenmiyor.
              </p>
            </div>
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: R.T.ink500 }}>
              Hangi Olaylarda Bildirim Alayım
            </div>
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {R.BILDIRIM_KATEGORILERI.map((kategori) => {
                const acik = !aktifKullanici.bildirimAyarlari.kapaliKategoriler.includes(kategori);
                return (
                  <label key={kategori} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={acik} onChange={() => (acik ? bildirimKategoriKapat(kategori) : bildirimKategoriAc(kategori))} />
                    <span style={{ color: R.T.ink900 }}>{kategori}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
