/* Stok — sayfa iş mantığı (Stok.tsx'ten bölündü).

   StokSayfasi'nın ~50 handler'ı burada. Hook, sayfanın kendi state'lerini
   (setter'larıyla birlikte) dışarıdan alır ve üzerinde iş kuralı çalıştırır:

     · Ürün kaydetme (zorunlu alan, mükerrer/benzer/fiyat uyarısı, fiyat yetkisi,
       pasifleştirme, hedef kâr ayarı)
     · Ürün silme — geçmişi olan ürün silinmez, Pasif yapılır
     · Fotoğraf / doküman / toplu fotoğraf yükleme
     · Stok girişi · stok düzeltme · raf taşıma açma-kapama
     · Aktif/Pasif değiştirme

   Modal içi form state'i (adet, fiyat, hata …) artık burada DEĞİL: her modal
   kendi state'ini kendisi taşıyor (bkz. StokGirisiModal, StokDuzeltmeModal …).
   Burada yalnızca "hangi ürün için açıldı" bilgisi ve kaydetme akışı var. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function useStokIslemleri({
  db,
  updateDb,
  aktifKullanici,
  // --- ürün formu ---
  form,
  setForm,
  duzenlenenId,
  setDuzenlenenId,
  setFormAcik,
  uyariModal,
  setUyariModal,
  hedefTuru,
  hedefDeger,
  // --- modal kimlikleri ---
  girisModalId,
  setGirisModalId,
  setGirisFiyat,
  duzeltmeModalId,
  setDuzeltmeModalId,
  setDuzeltmeYon,
  setDuzeltmeTur,
  setDuzeltmeAdet,
  setDuzeltmeBelgeNo,
  setDuzeltmeKullanici,
  setDuzeltmeAciklama,
  rafModalId,
  setRafModalId,
  setRafTransferKaynak,
  setRafTransferHedef,
  setRafTransferAdet,
  setRafTransferKullanici,
  // --- silme onayı ---
  setSilinecek,
  // --- fotoğraf / doküman ---
  detayModalId,
  setFotoYukleniyor,
  yeniFotoTuru,
  yeniDokumanTuru,
  setTopluFotoSonuc,
}): any {

  const formuAc = (p) => {
    if (p) {
      const anaKAdi = p.anaKategori || p.kategori || "";
      const anaK = db.kategoriler.find((k) => !k.ustKategoriId && k.ad === anaKAdi);
      const altK = anaK && p.kategori && p.kategori !== anaK.ad ? db.kategoriler.find((k) => k.ustKategoriId === anaK.id && k.ad === p.kategori) : null;
      setForm({
        ...R.bosForm,
        stokKodu: p.stokKodu || "",
        ad: p.ad || "",
        marka: p.marka || "",
        ureticiKodu: p.ureticiKodu || "",
        barkod: p.barkod || "",
        anaKategoriId: anaK?.id || "",
        altKategoriId: altK?.id || "",
        kategoriOzelDegerler: p.kategoriOzelDegerler || {},
        birim: p.birim || "Adet",
        kdvOrani: p.kdvOrani != null ? String(p.kdvOrani) : "20",
        alisFiyati: p.alisFiyati ?? "",
        satisFiyati: p.satisFiyati ?? "",
        minimumSatisFiyati: p.minimumSatisFiyati ?? "",
        stok: p.stok ?? "",
        kritikSeviye: p.kritikSeviye ?? "",
        hedefStok: p.hedefStok ?? "",
        guvenlikStogu: p.guvenlikStogu ?? "",
        siparisteAdet: p.siparisteAdet ?? "",
        rafAdresi: p.rafAdresi || "",
        tedarikci: p.tedarikci || "",
        aciklama: p.aciklama || "",
        fotograf: p.fotograf || "",
        aktif: p.aktif !== false,
        urunTipi: p.urunTipi || "Basit",
        setBilesenleri: p.setBilesenleri || [],
        paketBirimleri: p.paketBirimleri || [],
        satisBirimSekli: p.satisBirimSekli || "sadeceTemel",
      });
      setDuzenlenenId(p.id);
    } else {
      setForm(R.bosForm);
      setDuzenlenenId("yeni");
    }
    setFormAcik(true);
  };

  const formuKapat = () => {
    setFormAcik(false);
    setDuzenlenenId(null);
    setForm(R.bosForm);
  };

  const fotografSec = (e) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (dosya.size > 3 * 1024 * 1024) {
      R.bildirimGoster("Fotoğraf 3MB'tan küçük olmalı.", "hata");
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => setForm((f) => ({ ...f, fotograf: String(ev.target.result ?? "") }));
    okuyucu.readAsDataURL(dosya);
    e.target.value = "";
  };

  const kaydet = (zorla = false) => {
    if (!form.ad.trim()) {
      R.bildirimGoster("Ürün adı zorunludur.", "hata");
      return;
    }
    if (!form.stokKodu.trim()) {
      R.bildirimGoster("Stok kodu zorunludur.", "hata");
      return;
    }
    if (!form.marka.trim()) {
      R.bildirimGoster("Marka zorunludur.", "hata");
      return;
    }
    if (!form.birim) {
      R.bildirimGoster("Birim zorunludur.", "hata");
      return;
    }
    if (form.kdvOrani === "" || form.kdvOrani === null || isNaN(parseFloat(form.kdvOrani))) {
      R.bildirimGoster("KDV oranı zorunludur.", "hata");
      return;
    }
    // --- Sayısal veri kontrolü — mantıksız değerler engellenir -----------------
    const kdvSayi = parseFloat(form.kdvOrani);
    if (kdvSayi < 0 || kdvSayi > 100) {
      R.bildirimGoster("KDV oranı %0 ile %100 arasında olmalıdır.", "hata");
      return;
    }
    if (form.alisFiyati !== "" && parseFloat(form.alisFiyati) < 0) {
      R.bildirimGoster("Alış fiyatı negatif olamaz.", "hata");
      return;
    }
    if (form.satisFiyati !== "" && parseFloat(form.satisFiyati) < 0) {
      R.bildirimGoster("Satış fiyatı negatif olamaz.", "hata");
      return;
    }
    if (duzenlenenId === "yeni" && form.stok !== "" && parseFloat(form.stok) < 0) {
      R.bildirimGoster("Başlangıç stoğu negatif olamaz.", "hata");
      return;
    }

    // --- 1) Mükerrer ürün kontrolü — Stok Kodu / Üretici Kodu+Marka / Barkod --
    // ve 6) Fiyat kontrolü uyarıları — hepsi "zorla" onaylanmadıysa burada durur.
    if (!zorla) {
      const mukerrer = R.mukerrerUrunBul(db, { stokKodu: form.stokKodu, ureticiKodu: form.ureticiKodu, marka: form.marka, barkod: form.barkod }, duzenlenenId === "yeni" ? null : duzenlenenId);
      const benzerler = duzenlenenId === "yeni" ? R.benzerUrunleriBul(db, form.ad, null) : [];
      const fiyatUyarilari = [];
      const satisF = parseFloat(form.satisFiyati) || 0;
      const alisF = parseFloat(form.alisFiyati) || 0;
      if (satisF === 0) fiyatUyarilari.push("⚠️ Satış fiyatı 0₺.");
      else if (alisF > 0 && satisF < alisF) fiyatUyarilari.push("⚠️ Satış fiyatı maliyetin altında.");

      if (mukerrer || benzerler.length > 0 || fiyatUyarilari.length > 0) {
        setUyariModal({ mukerrerParca: mukerrer, benzerler, fiyatUyarilari });
        return;
      }
    }
    setUyariModal(null);

    if (duzenlenenId !== "yeni") {
      const mevcutParca = db.parcalar.find((p) => p.id === duzenlenenId);
      const fiyatDegisiyor = mevcutParca && parseFloat(form.satisFiyati) !== mevcutParca.satisFiyati;
      if (fiyatDegisiyor && !R.yetkiVarMi(db, aktifKullanici, "fiyatDegistirebilir")) {
        R.bildirimGoster("Satış fiyatını değiştirme yetkiniz yok.", "hata");
        return;
      }
    }
    const anaKSecili = form.anaKategoriId ? db.kategoriler.find((k) => k.id === form.anaKategoriId) : null;
    const altKSecili = form.altKategoriId ? db.kategoriler.find((k) => k.id === form.altKategoriId) : null;
    const kayit = {
      stokKodu: form.stokKodu.trim(),
      ad: form.ad.trim(),
      marka: form.marka.trim(),
      ureticiKodu: form.ureticiKodu.trim(),
      barkod: form.barkod.trim(),
      // p.kategori (geriye dönük uyumlu) alt kategori seçiliyse onun adını,
      // yoksa ana kategori adını taşır — Toplu Fiyat/Sayım/Raporlar gibi
      // modüller bu alana bakarak çalışmaya aynen devam eder.
      anaKategori: anaKSecili?.ad || "",
      kategori: altKSecili?.ad || anaKSecili?.ad || "",
      kategoriOzelDegerler: form.kategoriOzelDegerler,
      birim: form.birim,
      kdvOrani: parseFloat(form.kdvOrani) || 0,
      alisFiyati: parseFloat(form.alisFiyati) || 0,
      satisFiyati: parseFloat(form.satisFiyati) || 0,
      minimumSatisFiyati: parseFloat(form.minimumSatisFiyati) || 0,
      kritikSeviye: parseFloat(form.kritikSeviye) || 0,
      hedefStok: parseFloat(form.hedefStok) || 0,
      guvenlikStogu: parseFloat(form.guvenlikStogu) || 0,
      siparisteAdet: parseFloat(form.siparisteAdet) || 0,
      rafAdresi: form.rafAdresi.trim(),
      tedarikci: form.tedarikci.trim(),
      aciklama: form.aciklama.trim(),
      fotograf: form.fotograf,
      aktif: form.aktif,
      urunTipi: form.urunTipi,
      setBilesenleri: form.urunTipi === "Set" ? form.setBilesenleri : [],
      paketBirimleri: form.urunTipi === "Basit" ? form.paketBirimleri : [],
      satisBirimSekli: form.urunTipi === "Basit" ? form.satisBirimSekli : "sadeceTemel",
    };
    if (duzenlenenId === "yeni") {
      const baslangicStok = parseFloat(form.stok) || 0;
      const yeniParca = {
        id: R.yeniId("p"),
        ...kayit,
        stok: baslangicStok,
        // Kart ilk oluşturulurken girilen "Alış Fiyatı" ve mevcut stok, aynı
        // zamanda ilk maliyet girişi olarak kaydedilir — böylece ortalama
        // maliyet en baştan doğru başlar.
        sonAlisFiyati: kayit.alisFiyati,
        ortalamaMaliyet: kayit.alisFiyati,
        alisGecmisi:
          baslangicStok > 0 && kayit.alisFiyati > 0
            ? [{ id: R.yeniId("g"), tarih: R.zamanDamgasi(), adet: baslangicStok, birimFiyat: kayit.alisFiyati }]
            : [],
        // Satış fiyatı geçmişi de ilk kayıtla başlar — "ne zaman değişti"
        // sorusuna baştan itibaren cevap verebilmek için.
        fiyatGecmisi:
          kayit.satisFiyati > 0 ? [{ id: R.yeniId("f"), tarih: R.zamanDamgasi(), eskiFiyat: null, yeniFiyat: kayit.satisFiyati }] : [],
      };
      updateDb((prev) => ({ ...prev, parcalar: [yeniParca, ...prev.parcalar] }));
      // Başlangıç stoğu, "Devir / Açılış Stoğu" olarak stok hareket
      // geçmişine de işlenir — hareketler tablosu ürünün ilk gününden
      // itibaren eksiksiz olsun diye.
      if (baslangicStok > 0) {
        updateDb((prev) =>
          R.stokHareketiUygula(prev, {
            parcaId: yeniParca.id,
            tur: "Devir / Açılış Stoğu",
            giris: baslangicStok,
            kullanici: R.sonKullaniciAdi(),
            aciklama: "Ürün kartı oluşturulurken girilen başlangıç stoğu",
          }).db
        );
      }
      R.bildirimGoster("Ürün kartı oluşturuldu.", "basari");
    } else {
      updateDb((prev) => {
        const sonuc = {
          ...prev,
          parcalar: prev.parcalar.map((p) => {
            if (p.id !== duzenlenenId) return p;
            // Satış fiyatı değiştiyse, fiyat geçmişine (kim/ne zaman/neden) yeni bir satır eklenir.
            const fiyatDegisti = kayit.satisFiyati !== p.satisFiyati;
            const fiyatGecmisi = fiyatDegisti
              ? [
                  { id: R.yeniId("f"), tarih: R.zamanDamgasi(), eskiFiyat: p.satisFiyati, yeniFiyat: kayit.satisFiyati, kullanici: aktifKullanici?.adSoyad || "", degisiklikNedeni: form.fiyatDegisimNedeni || "" },
                  ...(p.fiyatGecmisi || []),
                ]
              : p.fiyatGecmisi || [];
            // Marka değiştiyse: "Eski marka → Yeni marka → Kullanıcı → Tarih" kalıcı olarak saklanır.
            const markaDegisti = kayit.marka && kayit.marka !== p.marka;
            const markaGecmisi = markaDegisti
              ? [
                  { id: R.yeniId("mg"), tarih: R.zamanDamgasi(), eskiMarka: p.marka, yeniMarka: kayit.marka, kullanici: aktifKullanici?.adSoyad || "" },
                  ...(p.markaGecmisi || []),
                ]
              : p.markaGecmisi || [];
            return { ...p, ...kayit, fiyatGecmisi, markaGecmisi };
          }),
        };
        const eskiParca = prev.parcalar.find((p) => p.id === duzenlenenId);
        let gecmisli = sonuc;
        if (eskiParca && kayit.satisFiyati !== eskiParca.satisFiyati) {
          gecmisli = R.islemKaydet(gecmisli, {
            kullaniciAdi: aktifKullanici?.adSoyad || "",
            islemTuru: "Satış fiyatı değiştirildi",
            aciklama: eskiParca.ad,
            eskiDeger: R.tl(eskiParca.satisFiyati),
            yeniDeger: R.tl(kayit.satisFiyati),
          });
        }
        if (eskiParca && kayit.marka && kayit.marka !== eskiParca.marka) {
          gecmisli = R.islemKaydet(gecmisli, {
            kullaniciAdi: aktifKullanici?.adSoyad || "",
            islemTuru: "Ürün markası değiştirildi",
            aciklama: eskiParca.ad,
            eskiDeger: eskiParca.marka || "(boş)",
            yeniDeger: kayit.marka,
          });
        }
        return gecmisli;
      });
      R.bildirimGoster("Ürün kartı güncellendi.", "basari");
    }
    updateDb((prev) => ({ ...prev, hedefKarAyari: { tur: hedefTuru, deger: parseFloat(hedefDeger) || 0 } }));
    formuKapat();
  };

  const sil = (id) => {
    if (!R.yetkiVarMi(db, aktifKullanici, "urunSilebilir")) {
      R.bildirimGoster("Ürün silme yetkiniz yok.", "hata");
      setSilinecek(null);
      return;
    }
    const parca = db.parcalar.find((p) => p.id === id);
    // Önemli veriler gerçekten silinmez: bu ürüne bağlı herhangi bir geçmiş
    // (stok hareketi, satış veya alış kaydı) varsa, silme yerine otomatik
    // olarak Pasif'e alınır — geçmiş raporlar ve kayıtlar bozulmasın diye.
    const gecmisiVar =
      db.stokHareketleri.some((h) => h.parcaId === id) ||
      db.satislar.some((s) => s.kalemler.some((k) => k.parcaId === id)) ||
      db.malAlimlari.some((m) => m.kalemler.some((k) => k.parcaId === id));
    if (gecmisiVar) {
      updateDb((prev) => {
        const sonuc = R.islemKaydet(prev, {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Ürün pasifleştirildi (silme yerine)",
          aciklama: `${parca?.ad || id} — geçmiş kaydı olduğu için gerçekten silinmedi`,
          eskiDeger: "Aktif",
          yeniDeger: "Pasif",
        });
        return { ...sonuc, parcalar: sonuc.parcalar.map((p) => (p.id === id ? { ...p, aktif: false } : p)) };
      });
      setSilinecek(null);
      R.bildirimGoster("Bu ürünün geçmiş kaydı olduğu için silinmedi, bunun yerine Pasif yapıldı.", "basari");
      return;
    }
    updateDb((prev) => {
      const sonuc = R.islemKaydet(prev, {
        kullaniciAdi: aktifKullanici?.adSoyad || "",
        islemTuru: "Ürün kartı silindi",
        aciklama: parca ? `${parca.ad} (${parca.stokKodu})` : id,
        eskiDeger: parca?.ad || "",
        yeniDeger: "Silindi",
      });
      return {
        ...sonuc,
        parcalar: sonuc.parcalar.filter((p) => p.id !== id),
        // Ürün silinince ona bağlı OEM/Muadil kod kayıtları da (yetim kalmasın diye) silinir.
        kodlar: sonuc.kodlar.filter((k) => k.parcaId !== id),
        stokHareketleri: sonuc.stokHareketleri.filter((h) => h.parcaId !== id),
      };
    });
    setSilinecek(null);
    R.bildirimGoster("Ürün kartı silindi.", "basari");
  };


  const fotograflarGuncelle = (parcaId, yeniListe) => {
    updateDb((prev) => ({ ...prev, parcalar: prev.parcalar.map((p) => (p.id === parcaId ? { ...p, fotograflar: yeniListe } : p)) }));
  };

  const fotografEkle = async (e) => {
    const dosyalar = Array.from<File>(e.target.files || []);
    if (dosyalar.length === 0) return;
    setFotoYukleniyor(true);
    try {
      const parca = db.parcalar.find((p) => p.id === detayModalId);
      let mevcutListe = [...(parca.fotograflar || [])];
      for (const dosya of dosyalar) {
        if (!dosya.type.startsWith("image/")) {
          R.bildirimGoster(`${dosya.name} bir görsel değil, atlandı.`, "hata");
          continue;
        }
        const sikistirilmis = await R.fotografSikistir(dosya);
        mevcutListe.push({
          id: R.yeniId("fo"),
          url: sikistirilmis,
          tur: yeniFotoTuru,
          dosyaAdi: dosya.name,
          boyutKb: Math.round((sikistirilmis.length * 0.75) / 1024),
          tarih: R.zamanDamgasi(),
        });
      }
      fotograflarGuncelle(detayModalId, mevcutListe);
      R.bildirimGoster(`${dosyalar.length} fotoğraf eklendi (otomatik sıkıştırıldı).`, "basari");
    } catch {
      R.bildirimGoster("Fotoğraf yüklenirken bir sorun oluştu.", "hata");
    }
    setFotoYukleniyor(false);
    e.target.value = "";
  };

  const fotografSil = (parcaId, fotoId) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    fotograflarGuncelle(parcaId, parca.fotograflar.filter((f) => f.id !== fotoId));
  };
  const fotografAnaYap = (parcaId, fotoId) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    const secilen = parca.fotograflar.find((f) => f.id === fotoId);
    fotograflarGuncelle(parcaId, [secilen, ...parca.fotograflar.filter((f) => f.id !== fotoId)]);
  };
  const fotografSiraDegistir = (parcaId, index, yon) => {
    const parca = db.parcalar.find((p) => p.id === parcaId);
    const liste = [...parca.fotograflar];
    const hedef = index + yon;
    if (hedef < 0 || hedef >= liste.length) return;
    [liste[index], liste[hedef]] = [liste[hedef], liste[index]];
    fotograflarGuncelle(parcaId, liste);
  };

  // --- Doküman yönetimi --------------------------------------------------------
  const dokumanEkle = (e) => {
    const dosyalar = Array.from<File>(e.target.files || []);
    if (dosyalar.length === 0) return;
    const parca = db.parcalar.find((p) => p.id === detayModalId);
    let mevcutListe = [...(parca.dokumanlar || [])];
    let atlandi = 0;
    let islemler = dosyalar.map((dosya) => {
      if (dosya.size > 8 * 1024 * 1024) {
        atlandi++;
        return null;
      }
      return new Promise((resolve) => {
        const okuyucu = new FileReader();
        okuyucu.onload = (ev) =>
          resolve({ id: R.yeniId("dk"), url: String(ev.target.result ?? ""), ad: dosya.name, tur: yeniDokumanTuru, dosyaAdi: dosya.name, boyutKb: Math.round(dosya.size / 1024), tarih: R.zamanDamgasi() });
        okuyucu.readAsDataURL(dosya);
      });
    });
    Promise.all(islemler).then((sonuclar) => {
      const gecerliler = sonuclar.filter(Boolean);
      updateDb((prev) => ({ ...prev, parcalar: prev.parcalar.map((p) => (p.id === detayModalId ? { ...p, dokumanlar: [...mevcutListe, ...gecerliler] } : p)) }));
      if (atlandi > 0) R.bildirimGoster(`${atlandi} dosya 8MB sınırını aştığı için eklenmedi.`, "hata");
      else R.bildirimGoster("Doküman(lar) eklendi.", "basari");
    });
    e.target.value = "";
  };
  const dokumanSil = (parcaId, dokumanId) => {
    updateDb((prev) => ({ ...prev, parcalar: prev.parcalar.map((p) => (p.id === parcaId ? { ...p, dokumanlar: p.dokumanlar.filter((d) => d.id !== dokumanId) } : p)) }));
  };

  // --- Toplu fotoğraf yükleme (dosya adından ürün kodu eşleştirme) -----------
  const topluFotoYukle = async (e) => {
    const dosyalar = Array.from<File>(e.target.files || []);
    if (dosyalar.length === 0) return;
    const eslesenler = [];
    const eslesmeyenler = [];
    for (const dosya of dosyalar) {
      const adKodu = R.kodNormalize(dosya.name.replace(/\.[^.]+$/, ""));
      const bulunan = db.parcalar.find((p) => adKodu.includes(R.kodNormalize(p.stokKodu)) && p.stokKodu.trim());
      if (bulunan && dosya.type.startsWith("image/")) {
        const sikistirilmis = await R.fotografSikistir(dosya);
        eslesenler.push({ parcaId: bulunan.id, ad: bulunan.ad, dosya: sikistirilmis, dosyaAdi: dosya.name });
      } else {
        eslesmeyenler.push(dosya.name);
      }
    }
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => {
        const e2 = eslesenler.find((x) => x.parcaId === p.id);
        if (!e2) return p;
        return {
          ...p,
          fotograflar: [
            { id: R.yeniId("fo"), url: e2.dosya, tur: "Ana Ürün", dosyaAdi: e2.dosyaAdi, boyutKb: Math.round((e2.dosya.length * 0.75) / 1024), tarih: R.zamanDamgasi() },
            ...(p.fotograflar || []),
          ],
        };
      }),
    }));
    setTopluFotoSonuc({ eslesen: eslesenler.map((x) => ({ ad: x.ad, dosyaAdi: x.dosyaAdi })), eslesmeyen: eslesmeyenler });
    e.target.value = "";
  };


  const aktifPasifDegistir = (p) => {
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((x) => (x.id === p.id ? { ...x, aktif: !x.aktif } : x)),
    }));
  };


  const girisModaliAc = (p) => {
    setGirisModalId(p.id);
    setGirisFiyat(String(p.sonAlisFiyati || p.alisFiyati || ""));
  };

  // NOT: Stok girişinin kaydetme mantığı (ağırlıklı ortalama maliyet + stok
  // hareketi sırası) artık StokGirisiModal'ın içinde — kullanıldığı yerin
  // hemen yanında. Burada yalnızca modalı açan handler kalır.
  // --- Stok Düzeltme (sayım, fire, manuel giriş/çıkış, alış iadesi) -------
  // Stok adedi HİÇBİR yerde doğrudan yazılamaz; her düzeltme burada bir
  // sebep seçilerek ve zorunlu bir açıklama girilerek hareket olarak kaydedilir.

  const duzeltmeModaliAc = (p) => {
    setDuzeltmeModalId(p.id);
    setDuzeltmeYon("giris");
    setDuzeltmeTur(R.STOK_GIRIS_TURLERI[0]);
    setDuzeltmeAdet("");
    setDuzeltmeBelgeNo("");
    setDuzeltmeKullanici(R.sonKullaniciAdi());
    setDuzeltmeAciklama("");
  };

  // NOT: Stok düzeltmenin kaydetme mantığı (yetki, zorunlu açıklama, eksi stok
  // guard'ı) artık StokDuzeltmeModal'ın içinde.
  const rafModaliAc = (p) => {
    setRafModalId(p.id);
    const konumlar = R.parcaRafListesi(p);
    setRafTransferKaynak(konumlar[0]?.kod || "");
    setRafTransferHedef("");
    setRafTransferAdet("");
    setRafTransferKullanici(R.sonKullaniciAdi());
  };

  // NOT: Raf taşımanın kaydetme mantığı artık RafTasimaModal'ın içinde.


  return {
    formuAc,
    formuKapat,
    fotografSec,
    kaydet,
    sil,
    fotograflarGuncelle,
    fotografEkle,
    fotografSil,
    fotografAnaYap,
    fotografSiraDegistir,
    dokumanEkle,
    dokumanSil,
    topluFotoYukle,
    aktifPasifDegistir,
    girisModaliAc,
    duzeltmeModaliAc,
    rafModaliAc,
  };
}
