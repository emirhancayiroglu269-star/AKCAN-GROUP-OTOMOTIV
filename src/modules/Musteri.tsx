/* Musteri module — extracted from the V16 monolith. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

export function MusteriSayfasi({ db, updateDb, aktifKullanici, setSepet, setSekme, yeniFormSinyali, yeniMusteriOnDoldurAdi, belgeyeGit, hedefMusteriId }) {
  const [ara, setAra] = R.useState("");
  const [durumFiltre, setDurumFiltre] = R.useState("aktif");
  const [formAcik, setFormAcik] = R.useState(false);
  const [duzenlenenId, setDuzenlenenId] = R.useState(null);
  const [form, setForm] = R.useState(R.bosMusteriForm);
  const [detayId, setDetayId] = R.useState(null);
  R.useEffect(() => {
    if (hedefMusteriId) setDetayId(hedefMusteriId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedefMusteriId]);
  const [tahsilatModalAcik, setTahsilatModalAcik] = R.useState(false);
  const [tahsilatTutari, setTahsilatTutari] = R.useState("");
  const [tahsilatAciklama, setTahsilatAciklama] = R.useState("");
  const [silinecek, setSilinecek] = R.useState(null);

  const formuAc = (c) => {
    if (c) {
      setForm({
        ad: c.ad,
        musteriTipi: c.musteriTipi || "Bireysel",
        telefon: c.telefon || "",
        vergiTcNo: c.vergiTcNo || "",
        adres: c.adres || "",
        borcLimiti: c.borcLimiti ?? "",
        vadeGunu: c.vadeGunu ?? "",
        iskontoOrani: c.iskontoOrani ?? "",
        fiyatGrubuId: c.fiyatGrubuId || "",
        notlar: c.notlar || "",
        aktif: c.aktif !== false,
      });
      setDuzenlenenId(c.id);
    } else {
      setForm(R.bosMusteriForm);
      setDuzenlenenId("yeni");
    }
    setFormAcik(true);
  };
  R.useEffect(() => {
    if (yeniFormSinyali) {
      formuAc(null);
      if (yeniMusteriOnDoldurAdi) {
        const telefonMu = /^[\d\s()+-]+$/.test(yeniMusteriOnDoldurAdi.trim()) && yeniMusteriOnDoldurAdi.replace(/\D/g, "").length >= 5;
        setForm((f) => (telefonMu ? { ...f, telefon: yeniMusteriOnDoldurAdi.trim() } : { ...f, ad: yeniMusteriOnDoldurAdi.trim() }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yeniFormSinyali]);
  const formuKapat = () => {
    setFormAcik(false);
    setDuzenlenenId(null);
    setForm(R.bosMusteriForm);
  };

  const kaydet = () => {
    if (!form.ad.trim()) {
      R.bildirimGoster("Müşteri / firma adı zorunludur.", "hata");
      return;
    }
    const cakisan = db.cariler.find((c) => c.id !== duzenlenenId && c.aktif !== false && c.ad.trim().toLowerCase() === form.ad.trim().toLowerCase());
    if (cakisan) {
      R.bildirimGoster("Bu isimde bir müşteri zaten kayıtlı.", "hata");
      return;
    }
    const kayit = {
      ad: form.ad.trim(),
      musteriTipi: form.musteriTipi,
      telefon: form.telefon.trim(),
      vergiTcNo: form.vergiTcNo.trim(),
      adres: form.adres.trim(),
      borcLimiti: parseFloat(form.borcLimiti) || 0,
      vadeGunu: parseFloat(form.vadeGunu) || 0,
      iskontoOrani: parseFloat(form.iskontoOrani) || 0,
      fiyatGrubuId: form.fiyatGrubuId || "",
      notlar: form.notlar.trim(),
      aktif: form.aktif,
    };
    if (duzenlenenId === "yeni") {
      updateDb((prev) => ({ ...prev, cariler: [{ id: R.yeniId("c"), ...kayit, bakiye: 0, hareketler: [] }, ...prev.cariler] }));
      R.bildirimGoster("Müşteri kartı oluşturuldu.", "basari");
    } else {
      updateDb((prev) => ({ ...prev, cariler: prev.cariler.map((c) => (c.id === duzenlenenId ? { ...c, ...kayit } : c)) }));
      R.bildirimGoster("Müşteri kartı güncellendi.", "basari");
    }
    formuKapat();
  };

  const sil = (c) => {
    // Aktif müşteri silindiğinde önce PASİF yapılır. Böylece geçmiş cari/satış
    // kayıtları korunur ve müşteri tekrar aktif edilebilir. Pasif müşteri ikinci
    // kez silindiğinde ise, borcu yoksa kart kalıcı olarak kaldırılır.
    if (c.aktif !== false) {
      updateDb((prev) => {
        const cariler = prev.cariler.map((x) => (x.id === c.id ? { ...x, aktif: false } : x));
        return R.islemKaydet(
          { ...prev, cariler },
          {
            kullaniciAdi: aktifKullanici?.adSoyad || "",
            islemTuru: "Müşteri pasife alındı",
            aciklama: `${c.ad} — müşteri kartı pasife alındı`,
            eskiDeger: "Aktif",
            yeniDeger: "Pasif",
          }
        );
      });
      setSilinecek(null);
      R.bildirimGoster("Müşteri pasife alındı. Kalıcı silmek için Pasif müşterilerden tekrar Sil seçin.", "basari");
      return;
    }

    // Pasif müşteri kalıcı silinecekse açık bakiye bırakmıyoruz.
    if ((c.bakiye || 0) > 0.01) {
      R.bildirimGoster("Bu pasif müşterinin açık borcu var. Kalıcı silmeden önce borcu kapatmalısınız.", "hata");
      setSilinecek(null);
      return;
    }

    updateDb((prev) => {
      const musteriId = c.id;
      const cariler = prev.cariler.filter((x) => x.id !== musteriId);
      const satislar = (prev.satislar || []).map((s) =>
        s.musteriId === musteriId ? { ...s, musteriId: null, musteriAdi: s.musteriAdi || c.ad } : s
      );
      const musteriOzelFiyatlar = (prev.musteriOzelFiyatlar || []).filter((f) => f.musteriId !== musteriId);
      return R.islemKaydet(
        { ...prev, cariler, satislar, musteriOzelFiyatlar },
        {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Müşteri kartı kalıcı olarak silindi",
          aciklama: `${c.ad} — pasif müşteri kartı ve müşteriye özel fiyatları kalıcı olarak silindi; geçmiş satış bağlantıları ayrıştırıldı`,
          eskiDeger: "Pasif",
          yeniDeger: "Kalıcı olarak silindi",
        }
      );
    });
    setSilinecek(null);
    if (detayId === c.id) setDetayId(null);
    R.bildirimGoster("Pasif müşteri kartı kalıcı olarak silindi. Aynı isimle yeniden kayıt açabilirsiniz.", "basari");
  };

  const tahsilatKaydet = () => {
    const tutar = parseFloat(tahsilatTutari);
    if (!tutar || tutar <= 0) {
      R.bildirimGoster("Geçerli bir tutar girin.", "hata");
      return;
    }
    const c = db.cariler.find((x) => x.id === detayId);
    updateDb((prev) =>
      R.cariHareketiUygula(prev, { musteriId: c.id, musteriAdi: c.ad, tutar, tur: "ödeme", aciklama: tahsilatAciklama.trim() || "Genel tahsilat" })
    );
    R.bildirimGoster("Tahsilat kaydedildi.", "basari");
    setTahsilatModalAcik(false);
    setTahsilatTutari("");
    setTahsilatAciklama("");
  };

  const filtreli = db.cariler
    .filter((c) => {
      if (durumFiltre === "aktif") return c.aktif !== false;
      if (durumFiltre === "pasif") return c.aktif === false;
      return true;
    })
    .filter((c) => {
      const q = ara.trim().toLowerCase();
      if (!q) return true;
      return c.ad.toLowerCase().includes(q) || (c.telefon || "").replace(/\D/g, "").includes(ara.replace(/\D/g, ""));
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  const detay = detayId ? db.cariler.find((c) => c.id === detayId) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <R.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
          <input
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Ad veya telefon ile ara…"
            className="w-full pl-9 pr-3 py-2 rounded-md border text-sm outline-none"
            style={{ borderColor: R.T.steel300 }}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
            {[
              { id: "aktif", ad: "Aktif" },
              { id: "pasif", ad: "Pasif" },
              { id: "tumu", ad: "Tümü" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDurumFiltre(d.id)}
                className="px-3 py-1.5 text-xs font-semibold"
                style={{ background: durumFiltre === d.id ? R.T.graphite900 : "#fff", color: durumFiltre === d.id ? "#fff" : R.T.ink500 }}
              >
                {d.ad}
              </button>
            ))}
          </div>
          <R.Buton onClick={() => formuAc(null)}>
            <R.Plus size={15} /> Yeni Müşteri
          </R.Buton>
        </div>
      </div>
      <p className="text-xs -mt-3" style={{ color: R.T.ink500 }}>
        Not: Perakende satışta müşteri kartı açmak zorunlu değildir — Satış ekranında müşteri adı boş bırakılabilir veya serbestçe yazılabilir.
        Kayıtlı müşteriler burada, cari/borç takibi gerektiğinde tutulur.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 flex flex-col gap-2">
          {filtreli.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Users} baslik="Müşteri yok" aciklama="Yeni müşteri ekleyin ya da Açık Hesap satışından otomatik oluşturulmasını bekleyin." />
            </R.Kart>
          ) : (
            filtreli.map((c) => (
              <button
                key={c.id}
                onClick={() => setDetayId(c.id)}
                className="text-left p-3.5 rounded-lg border transition-colors"
                style={{
                  borderColor: detayId === c.id ? R.T.orange : R.T.steel200,
                  background: detayId === c.id ? "#FBE1D5" : "#fff",
                  opacity: c.aktif === false ? 0.55 : 1,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate" style={{ color: R.T.ink900 }}>
                    {c.ad}
                  </span>
                  <R.Rozet tone="steel">{c.musteriTipi || "Bireysel"}</R.Rozet>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs" style={{ ...R.MONO, color: R.T.ink500 }}>
                    {c.telefon || "—"}
                  </span>
                  <span className="text-sm font-semibold" style={{ ...R.MONO, color: c.bakiye > 0 ? R.T.red : R.T.green }}>
                    {R.tl(c.bakiye || 0)}
                  </span>
                </div>
                {c.borcLimiti > 0 && c.bakiye > c.borcLimiti && (
                  <div className="text-xs font-semibold mt-1" style={{ color: R.T.red }}>
                    ⚠️ Limit aşıldı
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {!detay ? (
            <R.Kart className="h-full flex items-center justify-center">
              <R.Bos ikon={R.Users} baslik="Bir müşteri seçin" aciklama="Cari özet, hareket ve satış geçmişini görmek için soldan bir müşteri seçin." />
            </R.Kart>
          ) : (
            <MusteriDetay
              db={db}
              updateDb={updateDb}
              aktifKullanici={aktifKullanici}
              musteri={detay}
              onDuzenle={() => formuAc(detay)}
              onSil={() => setSilinecek(detay)}
              onTahsilatAc={() => setTahsilatModalAcik(true)}
              setSepet={setSepet}
              setSekme={setSekme}
              belgeyeGit={belgeyeGit}
            />
          )}
        </div>
      </div>

      {/* Müşteri kartı formu */}
      {formAcik && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={formuKapat}
        >
          <div className="w-full max-w-xl rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {duzenlenenId === "yeni" ? "Yeni Müşteri" : "Müşteri Kartını Düzenle"}
              </h3>
              <button onClick={formuKapat} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <R.Girdi label="Müşteri / Firma Adı *" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="ör. Ahmet Yılmaz" />
              </div>
              <R.Secim label="Müşteri Tipi" value={form.musteriTipi} onChange={(e) => setForm({ ...form, musteriTipi: e.target.value })}>
                <option>Bireysel</option>
                <option>Kurumsal</option>
              </R.Secim>
              <R.Girdi label="Telefon" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} placeholder="05xx xxx xx xx" />
              <R.Girdi label="Vergi / T.C. No" value={form.vergiTcNo} onChange={(e) => setForm({ ...form, vergiTcNo: e.target.value })} />
              <R.Girdi label="Vade Günü" type="number" value={form.vadeGunu} onChange={(e) => setForm({ ...form, vadeGunu: e.target.value })} placeholder="ör. 30" />
              <R.Girdi label="Özel İskonto (%)" type="number" value={form.iskontoOrani} onChange={(e) => setForm({ ...form, iskontoOrani: e.target.value })} />
              <R.Secim label="Fiyat Grubu" value={form.fiyatGrubuId} onChange={(e) => setForm({ ...form, fiyatGrubuId: e.target.value })}>
                <option value="">Yok (Normal Fiyat)</option>
                {db.musteriFiyatGruplari.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.ad}
                  </option>
                ))}
              </R.Secim>
              <R.Girdi label="Borç Limiti" type="number" value={form.borcLimiti} onChange={(e) => setForm({ ...form, borcLimiti: e.target.value })} placeholder="0.00" />
              <div className="col-span-2">
                <R.Girdi label="Adres" value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium" style={{ color: R.T.ink500 }}>
                    Not
                  </span>
                  <textarea
                    value={form.notlar}
                    onChange={(e) => setForm({ ...form, notlar: e.target.value })}
                    rows={2}
                    className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                    style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                <span style={{ color: R.T.ink900 }}>Aktif</span>
              </label>
            </div>
            <div className="flex gap-2 pt-4 mt-4" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
              <R.Buton onClick={kaydet}>
                <R.Check size={15} /> Kaydet
              </R.Buton>
              <R.Buton variant="ghost" onClick={formuKapat}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Tahsilat modalı */}
      {tahsilatModalAcik && detay && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setTahsilatModalAcik(false)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Tahsilat Kaydet — {detay.ad}
              </h3>
              <button onClick={() => setTahsilatModalAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Güncel borç: <strong>{R.tl(detay.bakiye || 0)}</strong>
            </p>
            <div className="flex flex-col gap-3">
              <R.Girdi label="Tahsil Edilen Tutar" type="number" value={tahsilatTutari} onChange={(e) => setTahsilatTutari(e.target.value)} placeholder="0.00" autoFocus />
              <R.Girdi label="Açıklama (opsiyonel)" value={tahsilatAciklama} onChange={(e) => setTahsilatAciklama(e.target.value)} placeholder="ör. Elden nakit" />
              <div className="flex gap-2">
                <R.Buton onClick={tahsilatKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setTahsilatModalAcik(false)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {silinecek && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSilinecek(null)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Bu müşteri kartı silinsin mi?
            </h3>
            <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
              {silinecek.aktif !== false ? (
                <>
                  <strong>{silinecek.ad}</strong> pasif duruma alınacak. Geçmiş satış ve cari kayıtları korunacak; müşteri aktif listede görünmeyecek.
                </>
              ) : (
                <>
                  <strong>{silinecek.ad}</strong> kalıcı olarak silinecek. Geçmiş satışlar kayıtlarda kalmaya devam eder.
                </>
              )}
            </p>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={() => sil(silinecek)}>
                <R.Trash2 size={14} /> {silinecek.aktif !== false ? "Pasife Al" : "Kalıcı Sil"}
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setSilinecek(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MusteriDetay({ db, updateDb, aktifKullanici, musteri, onDuzenle, onSil, onTahsilatAc, setSepet, setSekme, belgeyeGit }) {
  const [ekstreAcik, setEkstreAcik] = R.useState(false);
  const [altSekme, setAltSekme] = R.useState("satislar");
  // Bu müşterinin geçmişteki bir satışını tek tıkla tekrar sepete kurar —
  // "Örneğin geçen ay aldığı 5 parçayı tekrar almak istediğinde tüm ürünler
  // sepete tek seferde eklenir."
  const tekrarSat = (satis) => {
    if (!setSepet || !setSekme) return;
    const eklenecekler = satis.kalemler
      .map((k) => {
        const parca = db.parcalar.find((p) => p.id === k.parcaId);
        if (!parca) return null;
        const { fiyat } = R.parcaFiyatiHesapla(db, parca, musteri);
        return { parcaId: k.parcaId, adet: k.adet, birimFiyat: fiyat, iskontoTuru: "tutar", iskontoDeger: 0, fiyatKaynagi: "Normal Fiyat" };
      })
      .filter(Boolean);
    if (eklenecekler.length === 0) {
      R.bildirimGoster("Bu satıştaki ürünler artık sistemde bulunamadı.", "hata");
      return;
    }
    setSepet((prev) => {
      let yeni = [...prev];
      eklenecekler.forEach((e) => {
        const mevcut = yeni.find((s) => s.parcaId === e.parcaId);
        yeni = mevcut ? yeni.map((s) => (s.parcaId === e.parcaId ? { ...s, adet: s.adet + e.adet } : s)) : [...yeni, e];
      });
      return yeni;
    });
    R.bildirimGoster(`${eklenecekler.length} ürün sepete eklendi.`, "basari");
    setSekme("satis");
  };

  const bugunIso = R.isoGun(new Date());
  const gecmisSatislar = db.satislar.filter(
    (s) => s.durum !== "İptal Edildi" && (musteri.id ? s.musteriId === musteri.id : s.musteriAdi.toLowerCase() === musteri.ad.toLowerCase())
  );
  const toplamSatis = gecmisSatislar.reduce((t, s) => t + s.genelToplam, 0);
  const hareketler = Array.isArray(musteri.hareketler) ? musteri.hareketler : [];
  const ticariIletiIzni = musteri.ticariIletiIzni || { izinVar: false, izinKanallari: [], izinTarihi: null, izinKaynagi: "" };
  const toplamTahsilat = hareketler.filter((h) => h.tur === "ödeme").reduce((t, h) => t + (Number(h.tutar) || 0), 0);
  // Vadesi geçen: müşterinin vade günü varsa, borcu oluşturan son borç
  // hareketinden bu yana geçen gün sayısı vade gününü aştıysa "geçmiş" sayılır.
  const sonBorcHareketi = hareketler.find((h) => h.tur === "borç");
  const vadesiGecmisMi =
    musteri.bakiye > 0 &&
    musteri.vadeGunu > 0 &&
    sonBorcHareketi &&
    Math.floor((new Date(bugunIso) - new Date(sonBorcHareketi.tarih)) / 86400000) > musteri.vadeGunu;
  const vadesiGecenBorc = vadesiGecmisMi ? musteri.bakiye : 0;
  const kullanilabilirLimit = musteri.borcLimiti > 0 ? Math.max(0, musteri.borcLimiti - (musteri.bakiye || 0)) : null;

  // Satış kalemlerini düzleştirip tek bir listede göster: Tarih → Marka →
  // Ürün Kodu → Ürün → Adet → O günkü satış fiyatı.
  const satisKalemleri = gecmisSatislar
    .flatMap((s) => s.kalemler.map((k) => ({ ...k, tarih: s.tarih, satisId: s.id })))
    .sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

  return (
    <div className="flex flex-col gap-4">
      <R.Kart className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-semibold text-base" style={{ color: R.T.ink900 }}>
              {musteri.ad}
            </div>
            <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
              {[musteri.musteriTipi, musteri.telefon, db.musteriFiyatGruplari.find((g) => g.id === musteri.fiyatGrubuId)?.ad]
                .filter(Boolean)
                .join(" · ") || "Ek bilgi girilmemiş"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setEkstreAcik(true)} title="Hesap Ekstresi" className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
              Hesap Ekstresi
            </button>
            <button onClick={onTahsilatAc} title="Tahsilat kaydet" className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.green, color: "#fff" }}>
              Tahsilat Kaydet
            </button>
            <button onClick={onDuzenle} title="Düzenle" style={{ color: R.T.ink500 }}>
              <R.Pencil size={15} />
            </button>
            <button onClick={onSil} title="Sil" style={{ color: R.T.red }}>
              <R.Trash2 size={15} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { etiket: "Toplam Satış", deger: R.tl(toplamSatis), ton: "graphite" },
            { etiket: "Toplam Tahsilat", deger: R.tl(toplamTahsilat), ton: "green" },
            { etiket: "Güncel Borç", deger: R.tl(musteri.bakiye || 0), ton: musteri.bakiye > 0 ? "red" : "green" },
            { etiket: "Vadesi Geçen", deger: R.tl(vadesiGecenBorc), ton: vadesiGecenBorc > 0 ? "red" : "green" },
            { etiket: "Kullanılabilir Limit", deger: kullanilabilirLimit !== null ? R.tl(kullanilabilirLimit) : "—", ton: "yellow" },
          ].map((k) => (
            <div key={k.etiket} className="rounded-md p-2.5" style={{ background: R.T.steel100 }}>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                {k.etiket}
              </div>
              <div
                className="text-sm font-semibold mt-0.5"
                style={{ ...R.MONO, color: k.ton === "red" ? R.T.red : k.ton === "green" ? R.T.green : k.ton === "yellow" ? "#8A6110" : R.T.ink900 }}
              >
                {k.deger}
              </div>
            </div>
          ))}
        </div>
      </R.Kart>

      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "satislar", ad: "Satışlar" },
          { id: "tahsilatlar", ad: "Tahsilatlar" },
          { id: "cari", ad: "Cari" },
          { id: "siparisler", ad: "Siparişler" },
          { id: "rezervler", ad: "Rezervler" },
          { id: "teklifler", ad: "Teklifler" },
          { id: "notlar", ad: "Notlar" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2 px-1 text-xs font-semibold whitespace-nowrap"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "cari" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Hareket Geçmişi (Cari)
          </h4>
          {musteri.hareketler.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Henüz hareket yok.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-2 py-1.5">Tarih</th>
                    <th className="text-left font-semibold px-2 py-1.5">İşlem</th>
                    <th className="text-left font-semibold px-2 py-1.5">Belge No</th>
                    <th className="text-right font-semibold px-2 py-1.5">Borç</th>
                    <th className="text-right font-semibold px-2 py-1.5">Tahsilat</th>
                    <th className="text-right font-semibold px-2 py-1.5">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {musteri.hareketler.map((h) => (
                    <tr key={h.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-2 py-1.5" style={{ color: R.T.ink500 }}>
                        {R.tarihGoster(h.tarih)}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: R.T.ink900 }}>
                        {h.aciklama}
                      </td>
                      <td className="px-2 py-1.5" style={R.MONO}>
                        {h.belgeNo || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right" style={{ ...R.MONO, color: R.T.red }}>
                        {h.tur === "borç" ? R.tl(h.tutar) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right" style={{ ...R.MONO, color: R.T.green }}>
                        {h.tur === "ödeme" ? R.tl(h.tutar) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold" style={R.MONO}>
                        {R.tl(h.bakiyeSonrasi ?? "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "tahsilatlar" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Tahsilatlar
          </h4>
          {musteri.hareketler.filter((h) => h.tur === "ödeme").length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Henüz tahsilat yapılmadı.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {musteri.hareketler
                .filter((h) => h.tur === "ödeme")
                .map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ color: R.T.ink900 }}>
                      {R.tarihGoster(h.tarih)} — {h.aciklama} {h.belgeNo && `· ${h.belgeNo}`}
                    </span>
                    <span className="font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                      {R.tl(h.tutar)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "satislar" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Satış Geçmişi
          </h4>
          {gecmisSatislar.length > 0 && setSepet && (
            <div className="flex flex-col gap-1 mb-3">
              {gecmisSatislar.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                  <span style={{ color: R.T.ink900 }}>
                    {R.tarihGoster(s.tarih)} — {s.kalemler.length} ürün — {R.tl(s.genelToplam)}
                  </span>
                  <button onClick={() => tekrarSat(s)} className="font-semibold px-2 py-1 rounded-md shrink-0" style={{ background: R.T.orange, color: "#fff" }}>
                    Tekrar Sat
                  </button>
                </div>
              ))}
            </div>
          )}
          {satisKalemleri.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Bu müşteriye henüz satış yapılmadı.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-2 py-1.5">Tarih</th>
                    <th className="text-left font-semibold px-2 py-1.5">Marka</th>
                    <th className="text-left font-semibold px-2 py-1.5">Ürün Kodu</th>
                    <th className="text-left font-semibold px-2 py-1.5">Ürün</th>
                    <th className="text-center font-semibold px-2 py-1.5">Adet</th>
                    <th className="text-right font-semibold px-2 py-1.5">O Günkü Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {satisKalemleri.map((k, i) => (
                    <tr key={`${k.satisId}-${i}`} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-2 py-1.5" style={{ color: R.T.ink500 }}>
                        {R.tarihGoster(k.tarih)}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: R.T.ink900 }}>
                        {k.marka || "—"}
                      </td>
                      <td className="px-2 py-1.5" style={R.MONO}>
                        {k.stokKodu}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: R.T.ink900 }}>
                        {k.ad}
                      </td>
                      <td className="px-2 py-1.5 text-center" style={R.MONO}>
                        {k.adet} {k.birim}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold" style={R.MONO}>
                        {R.tl(k.birimFiyat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "siparisler" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Müşteri Siparişleri
          </h4>
          {(() => {
            const siparisler = db.musteriSiparisleri.filter((s) => s.musteriAdi.toLowerCase() === musteri.ad.toLowerCase());
            if (siparisler.length === 0) {
              return (
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Bu müşterinin siparişi yok.
                </p>
              );
            }
            const gruplar = {
              Bekleyen: siparisler.filter((s) => s.durum === "Bekliyor" || s.durum === "Tedarikçiye Sipariş Verildi" || s.durum === "Ürün Geldi"),
              Tamamlanan: siparisler.filter((s) => s.durum === "Müşteriye Teslim Edildi"),
              "İptal Edilen": siparisler.filter((s) => s.durum === "İptal"),
            };
            return (
              <div className="flex flex-col gap-3">
                {Object.entries(gruplar).map(([baslik, liste]) =>
                  liste.length === 0 ? null : (
                    <div key={baslik}>
                      <div className="text-xs font-semibold uppercase mb-1" style={{ color: R.T.ink500 }}>
                        {baslik} ({liste.length})
                      </div>
                      <div className="flex flex-col gap-1">
                        {liste.map((s) => {
                          const parca = db.parcalar.find((p) => p.id === s.parcaId);
                          const durum = R.musteriSiparisDurumGorseli[s.durum];
                          return (
                            <div key={s.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                              <span style={{ color: R.T.ink900 }}>
                                {parca?.ad || "—"} · {s.adet} adet
                              </span>
                              <R.Rozet tone={durum.ton}>
                                {durum.emoji} {s.durum}
                              </R.Rozet>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })()}
        </R.Kart>
      )}

      {altSekme === "rezervler" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Rezervler
          </h4>
          {(() => {
            const rezervler = db.rezervler.filter((r) => r.musteriAdi.toLowerCase() === musteri.ad.toLowerCase()).sort((a, b) => new Date(b.rezervTarihi) - new Date(a.rezervTarihi));
            if (rezervler.length === 0) {
              return (
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Bu müşterinin rezervi yok.
                </p>
              );
            }
            return (
              <div className="flex flex-col gap-1">
                {rezervler.map((r) => {
                  const parca = db.parcalar.find((p) => p.id === r.parcaId);
                  const durum = R.rezervDurumGorseli[r.durum];
                  return (
                    <div key={r.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                      <span style={{ color: R.T.ink900 }}>
                        {parca?.ad || "—"} · {r.adet} adet · {R.tl(r.rezervFiyati)}
                      </span>
                      <R.Rozet tone={durum.ton}>
                        {durum.emoji} {r.durum}
                      </R.Rozet>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </R.Kart>
      )}

      {altSekme === "teklifler" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Teklifler
          </h4>
          {(() => {
            const teklifler = (db.teklifler || []).filter((t) => t.musteriAdi.toLowerCase() === musteri.ad.toLowerCase()).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
            if (teklifler.length === 0) {
              return (
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Bu müşteriye henüz teklif verilmedi.
                </p>
              );
            }
            const gruplar = {
              "Açık Teklifler": teklifler.filter((t) => t.durum === "Taslak" || t.durum === "Gönderildi"),
              Onaylananlar: teklifler.filter((t) => t.durum === "Onaylandı"),
              "Satışa Dönüşenler": teklifler.filter((t) => t.durum === "Satışa Dönüştü"),
              "Reddedilen / Süresi Dolan": teklifler.filter((t) => t.durum === "Reddedildi" || t.durum === "Süresi Doldu"),
            };
            return (
              <div className="flex flex-col gap-3">
                {Object.entries(gruplar).map(([baslik, liste]) =>
                  liste.length === 0 ? null : (
                    <div key={baslik}>
                      <div className="text-xs font-semibold uppercase mb-1" style={{ color: R.T.ink500 }}>
                        {baslik} ({liste.length})
                      </div>
                      <div className="flex flex-col gap-1">
                        {liste.map((t) => {
                          const durum = R.teklifDurumGorseli[t.durum];
                          return (
                            <div key={t.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                              <span style={{ color: R.T.ink900 }}>
                                {t.teklifNo} · {t.kalemler.length} ürün · {R.tl(R.teklifGenelToplam(t))}
                              </span>
                              <R.Rozet tone={durum.ton}>
                                {durum.emoji} {t.durum}
                              </R.Rozet>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })()}
        </R.Kart>
      )}

      {altSekme === "notlar" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Notlar
          </h4>
          <R.NotYoneticisi
            db={db}
            updateDb={updateDb}
            hedefId={musteri.id}
            notlar={(Array.isArray(db.musteriNotlari) ? db.musteriNotlari : []).filter((n) => n && n.hedefId === musteri.id)}
            koleksiyonAdi="musteriNotlari"
            aktifKullanici={aktifKullanici}
          />
          {/* Ticari İleti İzni (62. adım, 9. madde) — SADECE pazarlama
              bildirimleri için kontrol edilir, operasyonel bildirimleri
              etkilemez (10. madde). */}
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
            <h5 className="text-xs font-semibold uppercase mb-2" style={{ color: R.T.ink500 }}>
              Ticari İleti İzni (Pazarlama)
            </h5>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={ticariIletiIzni.izinVar}
                onChange={(e) =>
                  updateDb((prev) => ({
                    ...prev,
                    cariler: prev.cariler.map((c) =>
                      c.id === musteri.id
                        ? { ...c, ticariIletiIzni: { ...ticariIletiIzni, izinVar: e.target.checked, izinTarihi: e.target.checked ? R.isoGun(new Date()) : ticariIletiIzni.izinTarihi } }
                        : c
                    ),
                  }))
                }
              />
              <span style={{ color: R.T.ink900 }}>Pazarlama amaçlı SMS/e-posta/WhatsApp gönderimine izin veriyor</span>
            </label>
            {ticariIletiIzni.izinVar && (
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                İzin Tarihi: {ticariIletiIzni.izinTarihi ? R.tarihGoster(ticariIletiIzni.izinTarihi) : "—"}
                {ticariIletiIzni.izinKaynagi && ` · Kaynak: ${ticariIletiIzni.izinKaynagi}`}
              </div>
            )}
          </div>
        </R.Kart>
      )}
      {ekstreAcik && <R.EkstreModal db={db} hedefTuru="musteri" hedef={musteri} onKapat={() => setEkstreAcik(false)} belgeyeGit={belgeyeGit} />}
    </div>
  );
}
