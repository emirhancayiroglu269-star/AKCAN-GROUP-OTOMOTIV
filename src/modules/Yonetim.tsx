/* Yonetim module — extracted from the V16 monolith. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

function SistemSagligiPanel({ db, setSekme }) {
  const mutabakat = R.ucUcaMutabakatOzeti(db);
  const finans = R.finansTutarlilikOzeti(db);
  const ciftKayit = R.ciftKayitDenetimOzeti(db);
  const tersIslem = R.tersIslemDenetimOzeti(db);
  const yetki = R.yetkiDenetimOzeti(db);

  const kategoriler = [
    {
      id: "stok",
      ad: "Stok",
      ikon: R.Package,
      bulgular: mutabakat.bulgular.filter((b) => b.tip === "stok"),
      aciklama: "Ürün kartı ile son stok hareketi bakiyesi",
    },
    {
      id: "satis",
      ad: "Satış / Ödeme",
      ikon: R.ShoppingCart,
      bulgular: mutabakat.bulgular.filter((b) => b.tip === "satis-odeme"),
      aciklama: "Satış toplamı ile ödeme satırları",
    },
    {
      id: "iade",
      ad: "İade",
      ikon: R.RotateCcw,
      bulgular: mutabakat.bulgular.filter((b) => b.tip === "iade"),
      aciklama: "İade tutarı ile iade kalemleri",
    },
    {
      id: "pos",
      ad: "POS",
      ikon: R.CreditCard,
      bulgular: mutabakat.bulgular.filter((b) => b.tip === "pos"),
      aciklama: "Satış + POS tahsilat tekilliği",
    },
    {
      id: "cift-kayit",
      ad: "Çift Kayıt",
      ikon: R.ShieldCheck,
      bulgular: ciftKayit.bulgular,
      aciklama: "Stok, kasa, cari, POS ve belge tekrarları",
    },
    {
      id: "ters-islem",
      ad: "Ters İşlem",
      ikon: R.RotateCcw,
      bulgular: tersIslem.bulgular,
      aciklama: "İptal, geri alma ve ters kayıt bütünlüğü",
    },
    {
      id: "yetki",
      ad: "Yetki / İşlem Kilidi",
      ikon: R.Lock,
      bulgular: yetki.bulgular,
      aciklama: "Rol matrisi ve kritik işlem yetkileri",
    },
    {
      id: "kasa",
      ad: "Kasa / Banka",
      ikon: R.Landmark,
      bulgular: finans.bulgular.filter((b) => b.tip === "hesap" || b.tip === "kasaIslemi"),
      aciklama: "Hesap bakiyesi ve finans işlem bütünlüğü",
    },
    {
      id: "cari",
      ad: "Cari",
      ikon: R.Users,
      bulgular: finans.bulgular.filter((b) => b.tip === "musteri" || b.tip === "tedarikci"),
      aciklama: "Müşteri ve tedarikçi bakiye mutabakatı",
    },
  ];

  const toplamBulgu = mutabakat.bulguSayisi + finans.toplamBulgu + ciftKayit.bulguSayisi + tersIslem.bulguSayisi + yetki.bulguSayisi;
  const kritik = mutabakat.kritik + finans.toplamBulgu + ciftKayit.kritik + tersIslem.kritik + yetki.kritik;
  const temiz = toplamBulgu === 0;
  const [seciliBulgu, setSeciliBulgu] = R.useState(null);

  const modulSekmesi = (tip) => {
    if (tip === "stok") return "stok";
    if (tip === "satis-odeme") return "belgeler";
    if (tip === "iade") return "iade";
    if (tip === "pos") return "bankapos";
    if (tip === "hesap" || tip === "kasaIslemi") return "kasayonetimi";
    if (tip === "cift-kayit" || tip === "cift-stok" || tip === "cift-tahsilat" || tip === "cift-pos") return "sistem";
    if (tip === "cift-cari" || tip === "cift-tedarikci-cari") return "cari";
    if (tip === "cift-ters-islem" || tip === "yetim-ters-islem" || tip === "eksik-iptal-durumu" || tip === "ters-link-kopuk" || tip === "ters-yon-hatasi" || tip === "satis-iptal-durum-uyumsuz") return "kasayonetimi";
    if (tip === "eksik-yetki" || tip === "rol-matrisi" || tip === "yetkisiz-rol" || tip === "yonetici-yetkisi") return "kullanicilar";
    return null;
  };

  const detayModulu = (tip) => {
    if (tip === "cift-stok") return "stok";
    if (tip === "cift-tahsilat") return "kasayonetimi";
    if (tip === "cift-pos") return "bankapos";
    if (tip === "cift-cari" || tip === "cift-tedarikci-cari") return "cari";
    return modulSekmesi(tip);
  };

  const bulguDetayi = (b) => {
    if (!b) return null;
    const kayit = b.tip === "stok"
      ? (db.parcalar || []).find((x) => x.id === b.id)
      : b.tip === "satis-odeme"
        ? (db.satislar || []).find((x) => x.id === b.id)
        : b.tip === "iade"
          ? (db.iadeler || []).find((x) => x.id === b.id)
          : b.tip === "hesap" || b.tip === "kasaIslemi"
            ? (db.hesaplar || []).find((x) => x.id === b.id) || (db.kasaIslemleri || []).find((x) => x.id === b.id)
            : b.tip === "musteri"
              ? (db.cariler || []).find((x) => x.id === b.id)
              : b.tip === "tedarikci"
                ? (db.tedarikciler || []).find((x) => x.id === b.id)
                : null;
    const refs = (b.referanslar || []).map((ref) => String(ref));
    return { ...b, kayit, refs };
  };

  const bulguyuIncele = (b) => setSeciliBulgu(bulguDetayi(b));

  const bulguyaGit = () => {
    const sekme = detayModulu(seciliBulgu?.tip);
    if (sekme && setSekme) {
      setSekme(sekme);
      setSeciliBulgu(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <R.Kart className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs uppercase font-semibold" style={{ color: R.T.ink500 }}>
              Yönetici Kontrolü
            </div>
            <div className="text-xl font-semibold mt-1" style={{ color: R.T.ink900 }}>
              Sistem Sağlığı
            </div>
            <div className="text-sm mt-1" style={{ color: R.T.ink500 }}>
              Stok, satış, iade, POS, kasa/banka ve cari zincirleri tek merkezden kontrol edilir.
            </div>
          </div>
          <div
            className="px-3 py-2 rounded-md text-sm font-semibold whitespace-nowrap"
            style={{
              background: temiz ? "#dcfce7" : "#fee2e2",
              color: temiz ? "#166534" : "#991b1b",
            }}
          >
            {temiz ? "✓ SİSTEM TEMİZ" : `⚠ ${toplamBulgu} BULGU · ${kritik} KRİTİK`}
          </div>
        </div>
      </R.Kart>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kategoriler.map((k) => {
          const Icon = k.ikon;
          const temizKategori = k.bulgular.length === 0;
          return (
            <R.Kart key={k.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon size={17} style={{ color: temizKategori ? R.T.green : R.T.red }} />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                      {k.ad}
                    </div>
                    <div className="text-[11px]" style={{ color: R.T.ink500 }}>
                      {k.aciklama}
                    </div>
                  </div>
                </div>
                <R.Rozet tone={temizKategori ? "green" : "red"}>
                  {temizKategori ? "Temiz" : `${k.bulgular.length} hata`}
                </R.Rozet>
              </div>

              {!temizKategori && (
                <div className="mt-3 flex flex-col gap-2">
                  {k.bulgular.slice(0, 4).map((b, i) => (
                    <button
                      type="button"
                      key={`${b.id}-${i}`}
                      onClick={() => bulguyuIncele(b)}
                      className="text-left rounded-md border p-2 hover:bg-gray-50 transition"
                      style={{ borderColor: R.T.steel300 }}
                    >
                      <div className="text-xs font-semibold" style={{ color: R.T.ink900 }}>
                        {b.id}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: R.T.ink500 }}>
                        {b.mesaj}
                      </div>
                      {(b.fark !== undefined && b.fark !== 0) && (
                        <div className="text-[11px] mt-1 font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                          Fark: {R.tl(b.fark)}
                        </div>
                      )}
                    </button>
                  ))}
                  {k.bulgular.length > 4 && (
                    <div className="text-[11px]" style={{ color: R.T.ink500 }}>
                      +{k.bulgular.length - 4} ek bulgu
                    </div>
                  )}
                </div>
              )}
            </R.Kart>
          );
        })}
      </div>

      {seciliBulgu && (
        <R.Kart className="p-5" style={{ border: `1px solid ${R.T.steel300}` }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase font-semibold" style={{ color: R.T.ink500 }}>
                Mutabakat Hata Detayı
              </div>
              <div className="text-lg font-semibold mt-1" style={{ color: R.T.ink900 }}>
                {seciliBulgu.id}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSeciliBulgu(null)}
              className="px-2 py-1 rounded border text-xs"
              style={{ borderColor: R.T.steel300, color: R.T.ink500 }}
            >
              Kapat
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md p-3" style={{ background: "#f8fafc" }}>
              <div className="text-[11px] uppercase font-semibold" style={{ color: R.T.ink500 }}>Sorun</div>
              <div className="text-sm mt-1" style={{ color: R.T.ink900 }}>{seciliBulgu.mesaj}</div>
            </div>
            <div className="rounded-md p-3" style={{ background: "#f8fafc" }}>
              <div className="text-[11px] uppercase font-semibold" style={{ color: R.T.ink500 }}>Fark</div>
              <div className="text-sm mt-1 font-semibold" style={{ ...R.MONO, color: seciliBulgu.fark ? R.T.red : R.T.ink900 }}>
                {seciliBulgu.fark !== undefined ? R.tl(seciliBulgu.fark) : "—"}
              </div>
            </div>
          </div>

          {seciliBulgu.refs?.length > 0 && (
            <div className="mt-3 rounded-md border p-3" style={{ borderColor: R.T.steel300 }}>
              <div className="text-[11px] uppercase font-semibold mb-2" style={{ color: R.T.ink500 }}>
                İlişkili Hareket / Kayıtlar
              </div>
              <div className="flex flex-wrap gap-1.5">
                {seciliBulgu.refs.slice(0, 12).map((ref, idx) => (
                  <span key={`${ref}-${idx}`} className="text-[11px] px-2 py-1 rounded" style={{ background: "#f8fafc", color: R.T.ink700 }}>
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}

          {seciliBulgu.kayit && (
            <div className="mt-3 rounded-md border p-3" style={{ borderColor: R.T.steel300 }}>
              <div className="text-[11px] uppercase font-semibold mb-2" style={{ color: R.T.ink500 }}>
                Kayıt
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div><b>Ad / Açıklama:</b> {seciliBulgu.kayit.ad || seciliBulgu.kayit.musteriAdi || seciliBulgu.kayit.belgeNo || "—"}</div>
                <div><b>ID:</b> {seciliBulgu.kayit.id || seciliBulgu.id}</div>
                {seciliBulgu.beklenen !== undefined && <div><b>Beklenen:</b> {R.tl(seciliBulgu.beklenen)}</div>}
                {seciliBulgu.kayitli !== undefined && <div><b>Kayıtlı:</b> {R.tl(seciliBulgu.kayitli)}</div>}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {modulSekmesi(seciliBulgu.tip) && (
              <R.Buton onClick={bulguyaGit}>
                İlgili Modüle Git
              </R.Buton>
            )}
            <button
              type="button"
              onClick={() => setSeciliBulgu(null)}
              className="px-3 py-2 rounded-md border text-sm"
              style={{ borderColor: R.T.steel300, color: R.T.ink700 }}
            >
              Detayı Kapat
            </button>
          </div>
        </R.Kart>
      )}

      <R.Kart className="p-4">
        <div className="text-xs font-semibold uppercase mb-2" style={{ color: R.T.ink500 }}>
          Kontrol Kapsamı
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" style={{ color: R.T.ink500 }}>
          <div>✓ Satış / ödeme</div>
          <div>✓ Stok hareketi</div>
          <div>✓ Kısmi iade</div>
          <div>✓ POS tekillik</div>
          <div>✓ Çift kayıt taraması</div>
          <div>✓ Ters işlem bütünlüğü</div>
          <div>✓ Yetki / işlem kilidi</div>
          <div>✓ Hesap bakiyesi</div>
          <div>✓ Cari bakiyesi</div>
        </div>
      </R.Kart>
    </div>
  );
}

export function KullaniciSayfasi({ db, updateDb, aktifKullanici, setSekme }) {
  const [altSekme, setAltSekme] = R.useState("kullanicilar"); // kullanicilar | roller | gecmis | sistem
  const [formAcik, setFormAcik] = R.useState(false);
  const [duzenlenenId, setDuzenlenenId] = R.useState(null);
  const [form, setForm] = R.useState(R.bosKullaniciForm);
  const [silinecek, setSilinecek] = R.useState(null);

  const [rolFormAcik, setRolFormAcik] = R.useState(false);
  const [duzenlenenRolId, setDuzenlenenRolId] = R.useState(null);
  const [rolForm, setRolForm] = R.useState(R.bosRolForm);
  const [silinecekRol, setSilinecekRol] = R.useState(null);

  const [gecmisArama, setGecmisArama] = R.useState("");

  // --- Kullanıcı CRUD --------------------------------------------------------
  const formuAc = (k) => {
    if (k) {
      setForm({ adSoyad: k.adSoyad, kullaniciAdi: k.kullaniciAdi, sifre: "", rolId: k.rolId, aktif: k.aktif !== false });
      setDuzenlenenId(k.id);
    } else {
      setForm(R.bosKullaniciForm);
      setDuzenlenenId("yeni");
    }
    setFormAcik(true);
  };
  const formuKapat = () => {
    setFormAcik(false);
    setDuzenlenenId(null);
    setForm(R.bosKullaniciForm);
  };

  const kaydet = () => {
    if (!form.adSoyad.trim() || !form.kullaniciAdi.trim()) {
      R.bildirimGoster("Ad Soyad ve Kullanıcı Adı zorunludur.", "hata");
      return;
    }
    if (duzenlenenId === "yeni" && !R.sifreGucluMu(form.sifre)) {
      R.bildirimGoster("Yeni kullanıcı şifresi en az 8 karakter olmalı ve en az 1 harf + 1 rakam içermeli.", "hata");
      return;
    }
    if (duzenlenenId !== "yeni" && form.sifre && !R.sifreGucluMu(form.sifre)) {
      R.bildirimGoster("Yeni şifre en az 8 karakter olmalı ve en az 1 harf + 1 rakam içermeli.", "hata");
      return;
    }
    const cakisan = db.kullanicilar.find((k) => k.id !== duzenlenenId && k.kullaniciAdi.toLowerCase() === form.kullaniciAdi.trim().toLowerCase());
    if (cakisan) {
      R.bildirimGoster("Bu kullanıcı adı zaten kullanılıyor.", "hata");
      return;
    }
    const mevcut = duzenlenenId !== "yeni" ? db.kullanicilar.find((k) => k.id === duzenlenenId) : null;
    const kayit = { adSoyad: form.adSoyad.trim(), kullaniciAdi: form.kullaniciAdi.trim(), ...(form.sifre ? { sifre: form.sifre } : (mevcut ? { sifre: mevcut.sifre } : {})), rolId: form.rolId, aktif: form.aktif };
    if (duzenlenenId === "yeni") {
      updateDb((prev) => ({ ...prev, kullanicilar: [{ id: R.yeniId("u"), ...kayit, sonGiris: null }, ...prev.kullanicilar] }));
      R.bildirimGoster("Kullanıcı oluşturuldu.", "basari");
    } else {
      updateDb((prev) => ({ ...prev, kullanicilar: prev.kullanicilar.map((k) => (k.id === duzenlenenId ? { ...k, ...kayit } : k)) }));
      R.bildirimGoster("Kullanıcı güncellendi.", "basari");
    }
    formuKapat();
  };

  const sil = (k) => {
    if (k.id === aktifKullanici?.id) {
      R.bildirimGoster("Kendi hesabınızı silemezsiniz.", "hata");
      setSilinecek(null);
      return;
    }
    updateDb((prev) => ({ ...prev, kullanicilar: prev.kullanicilar.filter((x) => x.id !== k.id) }));
    setSilinecek(null);
    R.bildirimGoster("Kullanıcı silindi.", "basari");
  };

  // --- Rol CRUD ---------------------------------------------------------------
  const rolFormuAc = (r) => {
    setRolForm({ ad: r.ad, yetkiler: { ...r.yetkiler }, maksimumIskontoYuzdesi: r.maksimumIskontoYuzdesi === null ? "" : String(r.maksimumIskontoYuzdesi) });
    setDuzenlenenRolId(r.id);
    setRolFormAcik(true);
  };
  const yeniRolFormuAc = () => {
    setRolForm(R.bosRolForm);
    setDuzenlenenRolId("yeni");
    setRolFormAcik(true);
  };
  const rolFormuKapat = () => {
    setRolFormAcik(false);
    setDuzenlenenRolId(null);
    setRolForm(R.bosRolForm);
  };

  const rolKaydet = () => {
    if (!rolForm.ad.trim()) {
      R.bildirimGoster("Rol adı zorunludur.", "hata");
      return;
    }
    const maksimumIskonto = rolForm.maksimumIskontoYuzdesi.trim() === "" ? null : parseFloat(rolForm.maksimumIskontoYuzdesi);
    if (duzenlenenRolId === "yeni") {
      updateDb((prev) => ({
        ...prev,
        roller: [...prev.roller, { id: R.yeniId("rol"), ad: rolForm.ad.trim(), sabit: false, yetkiler: rolForm.yetkiler, maksimumIskontoYuzdesi: maksimumIskonto }],
      }));
      R.bildirimGoster("Rol oluşturuldu.", "basari");
    } else {
      const eskiRol = db.roller.find((r) => r.id === duzenlenenRolId);
      const degisenYetkiler = R.YETKI_TANIMLARI.filter((y) => eskiRol.yetkiler[y.anahtar] !== rolForm.yetkiler[y.anahtar]);
      updateDb((prev) => {
        let sonuc = {
          ...prev,
          roller: prev.roller.map((r) =>
            r.id === duzenlenenRolId ? { ...r, ad: rolForm.ad.trim(), yetkiler: rolForm.yetkiler, maksimumIskontoYuzdesi: maksimumIskonto } : r
          ),
        };
        if (degisenYetkiler.length > 0 || eskiRol.maksimumIskontoYuzdesi !== maksimumIskonto) {
          const yetkiSatirlari = degisenYetkiler.map((y) => `${y.etiket}: ${eskiRol.yetkiler[y.anahtar] ? "Açık" : "Kapalı"} → ${rolForm.yetkiler[y.anahtar] ? "Açık" : "Kapalı"}`);
          sonuc = R.islemKaydet(sonuc, {
            kullaniciAdi: aktifKullanici?.adSoyad || "",
            islemTuru: "Rol yetkileri değiştirildi",
            aciklama: `${eskiRol.ad} rolü`,
            eskiDeger: `Maks. İskonto: ${eskiRol.maksimumIskontoYuzdesi ?? "Sınırsız"}`,
            yeniDeger: `Maks. İskonto: ${maksimumIskonto ?? "Sınırsız"}${yetkiSatirlari.length ? "; " + yetkiSatirlari.join(", ") : ""}`,
          });
        }
        return sonuc;
      });
      R.bildirimGoster("Rol güncellendi.", "basari");
    }
    rolFormuKapat();
  };

  const rolSil = (r) => {
    if (db.kullanicilar.some((k) => k.rolId === r.id)) {
      R.bildirimGoster("Bu rolü kullanan kullanıcılar var — önce onların rolünü değiştirin.", "hata");
      setSilinecekRol(null);
      return;
    }
    updateDb((prev) => ({ ...prev, roller: prev.roller.filter((x) => x.id !== r.id) }));
    setSilinecekRol(null);
    R.bildirimGoster("Rol silindi.", "basari");
  };

  const gecmisFiltreli = db.islemGecmisi.filter(
    (g) =>
      !gecmisArama.trim() ||
      g.kullaniciAdi.toLowerCase().includes(gecmisArama.toLowerCase()) ||
      g.islemTuru.toLowerCase().includes(gecmisArama.toLowerCase()) ||
      (g.aciklama || "").toLowerCase().includes(gecmisArama.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "kullanicilar", ad: "Kullanıcılar" },
          { id: "roller", ad: "Roller / Yetkiler" },
          { id: "gecmis", ad: "İşlem Geçmişi" },
          { id: "sistem", ad: "Sistem Sağlığı" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "kullanicilar" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <R.Buton onClick={() => formuAc(null)}>
              <R.Plus size={15} /> Yeni Kullanıcı
            </R.Buton>
          </div>
          {db.kullanicilar.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Users} baslik="Henüz kullanıcı yok" aciklama="İlk personel hesabınızı oluşturun." />
            </R.Kart>
          ) : (
            <R.Kart className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-3 py-2">Ad Soyad</th>
                      <th className="text-left font-semibold px-2 py-2">Kullanıcı Adı</th>
                      <th className="text-left font-semibold px-2 py-2">Rol</th>
                      <th className="text-left font-semibold px-2 py-2">Son Giriş</th>
                      <th className="text-center font-semibold px-2 py-2">Durum</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.kullanicilar.map((k) => {
                      const rol = db.roller.find((r) => r.id === k.rolId);
                      return (
                        <tr key={k.id} style={{ borderTop: `1px solid ${R.T.steel200}`, opacity: k.aktif === false ? 0.5 : 1 }}>
                          <td className="px-3 py-2.5" style={{ color: R.T.ink900 }}>
                            {k.adSoyad} {k.id === aktifKullanici?.id && <R.Rozet tone="orange">Siz</R.Rozet>}
                          </td>
                          <td className="px-2 py-2.5" style={R.MONO}>
                            {k.kullaniciAdi}
                          </td>
                          <td className="px-2 py-2.5">
                            <R.Rozet tone="steel">{rol?.ad || "—"}</R.Rozet>
                          </td>
                          <td className="px-2 py-2.5" style={{ color: R.T.ink500 }}>
                            {k.sonGiris ? new Date(k.sonGiris).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Hiç giriş yapmadı"}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <R.Rozet tone={k.aktif === false ? "steel" : "green"}>{k.aktif === false ? "Pasif" : "Aktif"}</R.Rozet>
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => formuAc(k)} style={{ color: R.T.ink500 }}>
                                <R.Pencil size={14} />
                              </button>
                              <button onClick={() => setSilinecek(k)} style={{ color: R.T.red }}>
                                <R.Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </R.Kart>
          )}
        </div>
      )}

      {altSekme === "roller" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <R.Buton onClick={yeniRolFormuAc}>
              <R.Plus size={15} /> Yeni Rol
            </R.Buton>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {db.roller.map((r) => {
              const acikSayisi = R.YETKI_TANIMLARI.filter((y) => r.yetkiler[y.anahtar]).length;
              return (
                <R.Kart key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                      {r.ad}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => rolFormuAc(r)} style={{ color: R.T.ink500 }}>
                        <R.Pencil size={14} />
                      </button>
                      {!r.sabit && (
                        <button onClick={() => setSilinecekRol(r)} style={{ color: R.T.red }}>
                          <R.Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: R.T.ink500 }}>
                    {acikSayisi} / {R.YETKI_TANIMLARI.length} yetki açık · {db.kullanicilar.filter((k) => k.rolId === r.id).length} kullanıcı · Maks. İskonto:{" "}
                    {r.maksimumIskontoYuzdesi === null || r.maksimumIskontoYuzdesi === undefined ? "Sınırsız" : `%${r.maksimumIskontoYuzdesi}`}
                  </p>
                </R.Kart>
              );
            })}
          </div>
        </div>
      )}

      {altSekme === "sistem" && (
        <SistemSagligiPanel db={db} setSekme={setSekme} />
      )}

      {altSekme === "gecmis" && (
        <div className="flex flex-col gap-3">
          <R.Girdi value={gecmisArama} onChange={(e) => setGecmisArama(e.target.value)} placeholder="Kullanıcı, işlem türü veya açıklamaya göre ara…" />
          <R.Kart className="overflow-hidden">
            {gecmisFiltreli.length === 0 ? (
              <R.Bos ikon={R.History} baslik="Kayıt yok" aciklama="Kritik işlemler (iskonto, stok düzeltme, fiyat değişikliği vb.) burada otomatik listelenir." />
            ) : (
              <div className="overflow-x-auto max-h-[36rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                      <th className="text-left font-semibold px-3 py-2">Kullanıcı</th>
                      <th className="text-left font-semibold px-2 py-2">İşlem</th>
                      <th className="text-left font-semibold px-2 py-2">Ne Zaman</th>
                      <th className="text-left font-semibold px-2 py-2">Eski Değer</th>
                      <th className="text-left font-semibold px-2 py-2">Yeni Değer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gecmisFiltreli.slice(0, 300).map((g) => (
                      <tr key={g.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                          {g.kullaniciAdi || "—"}
                        </td>
                        <td className="px-2 py-2">
                          <div style={{ color: R.T.ink900 }}>{g.islemTuru}</div>
                          <div className="text-xs" style={{ color: R.T.ink500 }}>
                            {g.aciklama}
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap" style={{ color: R.T.ink500 }}>
                          {new Date(g.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-2 py-2" style={R.MONO}>
                          {g.eskiDeger || "—"}
                        </td>
                        <td className="px-2 py-2 font-semibold" style={R.MONO}>
                          {g.yeniDeger || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </R.Kart>
        </div>
      )}

      {/* Kullanıcı formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={formuKapat}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {duzenlenenId === "yeni" ? "Yeni Kullanıcı" : "Kullanıcıyı Düzenle"}
              </h3>
              <button onClick={formuKapat} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <R.Girdi label="Ad Soyad *" value={form.adSoyad} onChange={(e) => setForm({ ...form, adSoyad: e.target.value })} />
              <R.Girdi label="Kullanıcı Adı *" value={form.kullaniciAdi} onChange={(e) => setForm({ ...form, kullaniciAdi: e.target.value })} />
              <R.Girdi label={duzenlenenId === "yeni" ? "Şifre *" : "Yeni Şifre (değiştirmek için)"} type="password" value={form.sifre} onChange={(e) => setForm({ ...form, sifre: e.target.value })} hint="Şifre ekranda açık gösterilmez. Yeni şifre en az 8 karakter ve en az 1 harf + 1 rakam içermelidir." />
              <R.Secim label="Rol" value={form.rolId} onChange={(e) => setForm({ ...form, rolId: e.target.value })}>
                {db.roller.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ad}
                  </option>
                ))}
              </R.Secim>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                <span style={{ color: R.T.ink900 }}>Aktif</span>
              </label>
              <R.Buton onClick={kaydet}>
                <R.Check size={15} /> Kaydet
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Rol formu — yetki matrisi */}
      {rolFormAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={rolFormuKapat}>
          <div className="w-full max-w-lg rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {duzenlenenRolId === "yeni" ? "Yeni Rol" : "Rolü Düzenle"}
              </h3>
              <button onClick={rolFormuKapat} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <R.Girdi label="Rol Adı *" value={rolForm.ad} onChange={(e) => setRolForm({ ...rolForm, ad: e.target.value })} className="mb-3" />
            <R.Girdi
              label="Maksimum İskonto (%) — boş bırakılırsa sınırsız"
              type="number"
              value={rolForm.maksimumIskontoYuzdesi}
              onChange={(e) => setRolForm({ ...rolForm, maksimumIskontoYuzdesi: e.target.value })}
              placeholder="ör. 10"
              className="mb-3"
            />
            <div className="flex flex-col gap-1.5 mt-3 mb-4 max-h-80 overflow-y-auto pr-1">
              {R.YETKI_TANIMLARI.map((y) => (
                <label key={y.anahtar} className="flex items-center gap-2.5 text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                  <input
                    type="checkbox"
                    checked={!!rolForm.yetkiler[y.anahtar]}
                    onChange={(e) => setRolForm({ ...rolForm, yetkiler: { ...rolForm.yetkiler, [y.anahtar]: e.target.checked } })}
                  />
                  <span style={{ color: R.T.ink900 }}>{y.etiket}</span>
                </label>
              ))}
            </div>
            <R.Buton onClick={rolKaydet}>
              <R.Check size={15} /> Kaydet
            </R.Buton>
          </div>
        </div>
      )}

      {/* Silme onayları */}
      {silinecek && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSilinecek(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              "{silinecek.adSoyad}" silinsin mi?
            </h3>
            <div className="flex gap-2 mt-3">
              <R.Buton variant="danger" onClick={() => sil(silinecek)}>
                <R.Trash2 size={14} /> Sil
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setSilinecek(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
      {silinecekRol && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSilinecekRol(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              "{silinecekRol.ad}" rolü silinsin mi?
            </h3>
            <div className="flex gap-2 mt-3">
              <R.Buton variant="danger" onClick={() => rolSil(silinecekRol)}>
                <R.Trash2 size={14} /> Sil
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setSilinecekRol(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AyarlarSayfasi({ db, updateDb, aktifKullanici, setSekme }) {
  const [altSekme, setAltSekme] = R.useState("firma");

  // Her ayar değişikliğini kalıcı olarak, "kim → hangi ayar → ne zaman →
  // neyden neye" formatında işlem geçmişine kaydederek uygular.
  const ayarKaydet = (alan, etiket, yeniDeger) => {
    updateDb((prev) => {
      const eskiDeger = prev.ayarlar[alan];
      if (eskiDeger === yeniDeger) return prev;
      const bicimle = (v) => (typeof v === "boolean" ? (v ? "Açık" : "Kapalı") : v === null || v === "" ? "(boş)" : String(v));
      return R.islemKaydet(
        { ...prev, ayarlar: { ...prev.ayarlar, [alan]: yeniDeger } },
        { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: `Ayar değiştirildi: ${etiket}`, aciklama: etiket, eskiDeger: bicimle(eskiDeger), yeniDeger: bicimle(yeniDeger) }
      );
    });
  };
  const alanGuncelle = (ustAlan, etiket, altAlan, deger) => {
    updateDb((prev) => {
      const eskiDeger = prev.ayarlar[ustAlan][altAlan];
      if (eskiDeger === deger) return prev;
      return R.islemKaydet(
        { ...prev, ayarlar: { ...prev.ayarlar, [ustAlan]: { ...prev.ayarlar[ustAlan], [altAlan]: deger } } },
        { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: `Ayar değiştirildi: ${etiket}`, aciklama: `${etiket} — ${altAlan}`, eskiDeger: String(eskiDeger), yeniDeger: String(deger) }
      );
    });
  };

  const ayarDegisiklikleri = db.islemGecmisi.filter((i) => i.islemTuru.startsWith("Ayar değiştirildi")).slice(0, 15);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "firma", ad: "Firma" },
          { id: "satis", ad: "Satış" },
          { id: "stok", ad: "Stok" },
          { id: "fiyat", ad: "Fiyat" },
          { id: "kasa", ad: "Kasa" },
          { id: "belge", ad: "Belge" },
          { id: "barkod", ad: "Barkod" },
          { id: "bildirim", ad: "Bildirim" },
          { id: "kullanici", ad: "Kullanıcı" },
          { id: "guvenlik", ad: "Güvenlik" },
          { id: "kisayollar", ad: "Kısayollar" },
          { id: "yedekleme", ad: "Yedekleme" },
          { id: "gecmis", ad: "Değişiklik Geçmişi" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2 px-2 text-xs font-semibold whitespace-nowrap"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "firma" && (
        <R.Kart className="p-4 max-w-md">
          <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
            Firma / Mağaza Bilgileri
          </h4>
          <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
            Logo, adres, telefon, vergi bilgileri gibi tüm firma bilgileri — satış belgelerinde otomatik kullanılır.
          </p>
          <R.Buton onClick={() => setSekme("yedekguvenlik")}>
            <R.Building2 size={14} /> Firma Bilgilerini Düzenle
          </R.Buton>
        </R.Kart>
      )}

      {altSekme === "satis" && (
        <R.Kart className="p-4 max-w-lg flex flex-col gap-3">
          <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Satış Ayarları
          </h4>
          <R.Girdi label="Varsayılan Müşteri Adı (boş bırakılırsa 'Perakende Müşteri')" value={db.ayarlar.varsayilanMusteriAdi} onChange={(e) => ayarKaydet("varsayilanMusteriAdi", "Varsayılan Müşteri", e.target.value)} />
          <R.Secim label="Varsayılan Fiyat Grubu" value={db.ayarlar.varsayilanFiyatGrubuId} onChange={(e) => ayarKaydet("varsayilanFiyatGrubuId", "Varsayılan Fiyat Grubu", e.target.value)}>
            <option value="">Yok (Normal Fiyat)</option>
            {db.musteriFiyatGruplari.map((g) => (
              <option key={g.id} value={g.id}>
                {g.ad}
              </option>
            ))}
          </R.Secim>
          <R.Secim label="Varsayılan Ödeme Yöntemi" value={db.ayarlar.varsayilanOdemeYontemi} onChange={(e) => ayarKaydet("varsayilanOdemeYontemi", "Varsayılan Ödeme Yöntemi", e.target.value)}>
            {R.ODEME_YONTEMLERI.filter((y) => db.ayarlar.odemeYontemleriDurumu[y] !== false).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </R.Secim>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={db.ayarlar.eksiStokIzni} onChange={(e) => ayarKaydet("eksiStokIzni", "Eksi Stok Satışına İzin Ver", e.target.checked)} />
            <span style={{ color: R.T.ink900 }}>Eksi stok satışına izin ver</span>
          </label>
          <p className="text-xs -mt-2" style={{ color: R.T.ink500 }}>
            Maliyet altı satış, minimum kâr kontrolü ve maksimum iskonto zaten <strong>Kullanıcılar → Roller</strong>{" "}
            altında kişi bazında yönetiliyor (satış personeli/kıdemli/yönetici gibi farklı limitler tanımlanabiliyor) —
            buradan tekrar tanımlamak çakışma yaratacağından o ekrana yönlendiriyoruz.
          </p>
          <R.Buton variant="ghost" onClick={() => setSekme("kullanicilar")}>
            <R.ShieldCheck size={14} /> Rol Bazlı İskonto/Yetki Limitlerine Git
          </R.Buton>
        </R.Kart>
      )}

      {altSekme === "stok" && (
        <R.Kart className="p-4 max-w-lg flex flex-col gap-3">
          <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Stok Ayarları
          </h4>
          <R.Girdi label="Varsayılan Minimum Stok (yeni ürün formunda ön dolu gelir)" type="number" value={db.ayarlar.varsayilanMinimumStok} onChange={(e) => ayarKaydet("varsayilanMinimumStok", "Varsayılan Minimum Stok", parseFloat(e.target.value) || 0)} />
          <R.Secim label="Varsayılan Depo" value={db.ayarlar.varsayilanDepoId} onChange={(e) => ayarKaydet("varsayilanDepoId", "Varsayılan Depo", e.target.value)}>
            {db.depolar.map((d) => (
              <option key={d.id} value={d.id}>
                {d.kod} — {d.ad}
              </option>
            ))}
          </R.Secim>
          <R.Girdi label="Varsayılan Raf" value={db.ayarlar.varsayilanRaf} onChange={(e) => ayarKaydet("varsayilanRaf", "Varsayılan Raf", e.target.value.toUpperCase())} placeholder="ör. A-01-01" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={db.ayarlar.eksiStokIzni} onChange={(e) => ayarKaydet("eksiStokIzni", "Negatif Stok İzni", e.target.checked)} />
            <span style={{ color: R.T.ink900 }}>Negatif stok izni (satış/çıkış işlemlerinde)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={db.ayarlar.otomatikSiparisOnerisi} onChange={(e) => ayarKaydet("otomatikSiparisOnerisi", "Otomatik Sipariş Önerisi", e.target.checked)} />
            <span style={{ color: R.T.ink900 }}>Kritik stoktaki ürünler için otomatik sipariş önerisi göster</span>
          </label>
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Sayım ayarları ve stok düzeltme yetkisi, <strong>Stok Sayımı</strong> ve <strong>Kullanıcılar → Roller</strong>{" "}
            ekranlarından yönetiliyor.
          </p>
        </R.Kart>
      )}

      {altSekme === "stok" && (
        <R.Kart className="p-4 max-w-lg flex flex-col gap-3">
          <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Ölü Stok / Satış Hızı Eşikleri
          </h4>
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Son 30 gündeki satış adedine göre ürünler sınıflandırılır — dükkânınızın satış hacmine göre ayarlayın.
          </p>
          {[
            { alan: "hizliEsigi", etiket: "🟢 Hızlı Dönen — En Az Kaç Satış (Son 30 Gün)" },
            { alan: "normalEsigiMin", etiket: "🟡 Normal Dönen — En Az Kaç Satış (Son 30 Gün)" },
            { alan: "yavasEsigiMin", etiket: "🟠 Yavaş Dönen — En Az Kaç Satış (Son 30 Gün)" },
          ].map((f) => (
            <R.Girdi
              key={f.alan}
              label={f.etiket}
              type="number"
              value={db.ayarlar.satisHiziEsikleri[f.alan]}
              onChange={(e) => alanGuncelle("satisHiziEsikleri", "Satış Hızı Eşikleri", f.alan, parseFloat(e.target.value) || 0)}
            />
          ))}
          <R.Girdi
            label="🔴 Ölü Stok — Kaç Gündür Satılmıyor"
            type="number"
            value={db.ayarlar.satisHiziEsikleri.oluStokGunEsigi}
            onChange={(e) => alanGuncelle("satisHiziEsikleri", "Satış Hızı Eşikleri", "oluStokGunEsigi", parseFloat(e.target.value) || 0)}
          />
        </R.Kart>
      )}

      {altSekme === "fiyat" && (
        <R.Kart className="p-4 max-w-lg flex flex-col gap-3">
          <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Para ve KDV Ayarları
          </h4>
          <R.Girdi label="Para Birimi" value={db.ayarlar.paraBirimi} onChange={(e) => ayarKaydet("paraBirimi", "Para Birimi", e.target.value)} />
          <R.Secim label="Varsayılan KDV Oranı (yeni ürün formunda ön dolu gelir)" value={db.ayarlar.varsayilanKdvOrani} onChange={(e) => ayarKaydet("varsayilanKdvOrani", "Varsayılan KDV Oranı", parseFloat(e.target.value))}>
            {R.KDV_ORANLARI.map((k) => (
              <option key={k} value={k}>
                %{k}
              </option>
            ))}
          </R.Secim>
          <R.Secim label="Fiyat Gösterim Tercihi" value={db.ayarlar.kdvGosterimTercihi} onChange={(e) => ayarKaydet("kdvGosterimTercihi", "KDV Gösterim Tercihi", e.target.value)}>
            <option value="dahil">KDV Dahil Göster</option>
            <option value="haric">KDV Hariç Göster</option>
          </R.Secim>
          <R.Secim label="Fiyat Yuvarlama Kuralı" value={db.ayarlar.fiyatYuvarlama} onChange={(e) => ayarKaydet("fiyatYuvarlama", "Fiyat Yuvarlama", parseFloat(e.target.value))}>
            {R.YUVARLAMA_SECENEKLERI.map((y) => (
              <option key={y.deger} value={y.deger}>
                {y.etiket}
              </option>
            ))}
          </R.Secim>
          <div className="pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
            <R.Secim label="Maliyet Yöntemi" value={db.ayarlar.maliyetYontemi} onChange={(e) => ayarKaydet("maliyetYontemi", "Maliyet Yöntemi", e.target.value)}>
              <option value="agirlikliOrtalama">Ağırlıklı Ortalama Maliyet (önerilen)</option>
              <option value="sonAlis">Son Alış Maliyeti</option>
            </R.Secim>
            <p className="text-xs mt-1.5" style={{ color: R.T.ink500 }}>
              Perakende yedek parça için ağırlıklı ortalama önerilir — ürünün son alış fiyatı her durumda ayrıca
              saklanır. Gerçek FIFO (parti bazlı maliyet katmanı) bu sistemde desteklenmiyor; stok hareketi mimarisinin
              baştan yeniden tasarlanmasını gerektirir.
            </p>
          </div>
        </R.Kart>
      )}

      {altSekme === "kasa" && (
        <R.Kart className="p-4 max-w-md">
          <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
            Ödeme Yöntemleri
          </h4>
          <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
            Kullanmadığınız ödeme yöntemlerini pasifleştirin — Satış ekranındaki ödeme seçicisinde artık görünmezler.
          </p>
          <div className="flex flex-col gap-2">
            {Object.keys(db.ayarlar.odemeYontemleriDurumu).map((y) => (
              <label key={y} className="flex items-center justify-between text-sm px-3 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                <span style={{ color: R.T.ink900 }}>{y}</span>
                <input type="checkbox" checked={db.ayarlar.odemeYontemleriDurumu[y] !== false} onChange={(e) => alanGuncelle("odemeYontemleriDurumu", `Ödeme Yöntemi — ${y}`, y, e.target.checked)} />
              </label>
            ))}
          </div>
        </R.Kart>
      )}

      {altSekme === "belge" && (
        <R.Kart className="p-4 max-w-lg flex flex-col gap-3">
          <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Belge Ayarları
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {R.BELGE_TURLERI.map((t) => (
              <R.Girdi
                key={t}
                label={`${t} Öneki`}
                value={db.ayarlar.belgeOnekleri[t]}
                onChange={(e) => alanGuncelle("belgeOnekleri", `Belge Öneki — ${t}`, t, e.target.value.toUpperCase().slice(0, 4))}
              />
            ))}
          </div>
          <p className="text-xs -mt-1" style={{ color: R.T.ink500 }}>
            ör. Satış Fişi öneki "ST" ise numaralar ST-2026-000001 şeklinde üretilir.
          </p>
          <R.Girdi label="Yazıcı Seçimi" value={db.ayarlar.yaziciAdi} onChange={(e) => ayarKaydet("yaziciAdi", "Belge Yazıcısı", e.target.value)} placeholder="ör. Epson TM-T20" />
          <R.Secim label="Kağıt Boyutu" value={db.ayarlar.kagitBoyutu} onChange={(e) => ayarKaydet("kagitBoyutu", "Kağıt Boyutu", e.target.value)}>
            <option>80mm (Termal Fiş)</option>
            <option>58mm (Termal Fiş)</option>
            <option>A4</option>
            <option>A5</option>
          </R.Secim>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium" style={{ color: R.T.ink500 }}>
              Belge Alt Yazısı
            </span>
            <textarea
              value={db.ayarlar.belgeAltYazisi}
              onChange={(e) => ayarKaydet("belgeAltYazisi", "Belge Alt Yazısı", e.target.value)}
              rows={2}
              placeholder="ör. Bizi tercih ettiğiniz için teşekkür ederiz."
              className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
              style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
            />
          </label>
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Logo, Belgeler → Yazdır ekranında zaten Firma bilgilerinden otomatik kullanılıyor. Belge tasarımı (satış
            fişi düzeni) sabit ve mağaza bilgileriyle otomatik oluşuyor.
          </p>
        </R.Kart>
      )}

      {altSekme === "barkod" && (
        <R.Kart className="p-4 max-w-md flex flex-col gap-3">
          <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Barkod / Etiket Ayarları
          </h4>
          <R.Secim label="Barkod Tipi" value={db.ayarlar.barkodTipi} onChange={(e) => ayarKaydet("barkodTipi", "Barkod Tipi", e.target.value)}>
            <option>EAN-13</option>
            <option>EAN-8</option>
          </R.Secim>
          <R.Secim label="Etiket Boyutu" value={db.ayarlar.etiketBoyutu} onChange={(e) => ayarKaydet("etiketBoyutu", "Etiket Boyutu", e.target.value)}>
            <option>40x30mm</option>
            <option>50x30mm</option>
            <option>58x40mm</option>
            <option>100x50mm</option>
          </R.Secim>
          <R.Girdi label="Etiket Yazıcısı" value={db.ayarlar.etiketYazici} onChange={(e) => ayarKaydet("etiketYazici", "Etiket Yazıcısı", e.target.value)} placeholder="ör. Zebra GK420t" />
          <div>
            <span className="text-xs font-semibold uppercase block mb-1.5" style={{ color: R.T.ink500 }}>
              Etiket Üzerinde Gösterilecek Alanlar
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                { anahtar: "fiyatGoster", etiket: "Fiyat Göster" },
                { anahtar: "oemGoster", etiket: "OEM Göster" },
                { anahtar: "muadilGoster", etiket: "Muadil Kod Göster" },
                { anahtar: "rafGoster", etiket: "Raf Adresi Göster" },
              ].map((a) => (
                <label key={a.anahtar} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={db.ayarlar.etiketAlanlari[a.anahtar]} onChange={(e) => alanGuncelle("etiketAlanlari", a.etiket, a.anahtar, e.target.checked)} />
                  <span style={{ color: R.T.ink900 }}>{a.etiket}</span>
                </label>
              ))}
            </div>
          </div>
          <R.Buton variant="ghost" onClick={() => setSekme("etiket")}>
            <R.ScanLine size={14} /> Etiket Yazdırma Ekranına Git
          </R.Buton>
        </R.Kart>
      )}

      {altSekme === "bildirim" && (
        <R.Kart className="p-4 max-w-md">
          <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
            Bildirim Ayarları
          </h4>
          <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
            Kritik stok, vadesi gelen borç, müşteri siparişi, rezerv süresi, kasa/POS farkı ve yedekleme gibi hangi
            durumlarda bildirim alacağınızı, sağ üstteki 🔔 simgesinden yönetebilirsiniz — kişisel tercihleriniz orada
            saklanır.
          </p>
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            🔔 simgesine tıklayıp <strong>Ayarlar</strong> (dişli) ikonuna basarak açabilirsiniz.
          </p>
        </R.Kart>
      )}

      {altSekme === "kullanici" && (
        <R.Kart className="p-4 max-w-md">
          <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
            Kullanıcı ve Yetkilendirme
          </h4>
          <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
            Kullanıcı hesapları, roller, yetkiler ve iskonto limitleri Kullanıcılar ekranından yönetilir.
          </p>
          <R.Buton onClick={() => setSekme("kullanicilar")}>
            <R.ShieldCheck size={14} /> Kullanıcılar Ekranına Git
          </R.Buton>
        </R.Kart>
      )}

      {altSekme === "guvenlik" && (
        <R.Kart className="p-4 max-w-lg flex flex-col gap-3">
          <h4 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
            Sistem ve Güvenlik Ayarları
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <R.Secim label="Dil" value={db.ayarlar.dil} onChange={(e) => ayarKaydet("dil", "Dil", e.target.value)}>
              <option>Türkçe</option>
            </R.Secim>
            <R.Secim label="Tarih Formatı" value={db.ayarlar.tarihFormati} onChange={(e) => ayarKaydet("tarihFormati", "Tarih Formatı", e.target.value)}>
              <option>GG.AA.YYYY</option>
              <option>YYYY-AA-GG</option>
            </R.Secim>
            <R.Secim label="Saat Formatı" value={db.ayarlar.saatFormati} onChange={(e) => ayarKaydet("saatFormati", "Saat Formatı", e.target.value)}>
              <option>24 Saat</option>
              <option>12 Saat (AM/PM)</option>
            </R.Secim>
            <R.Girdi label="Oturum Süresi (dakika)" type="number" value={db.ayarlar.oturumSuresiDakika} onChange={(e) => ayarKaydet("oturumSuresiDakika", "Oturum Süresi", parseInt(e.target.value) || 15)} />
            <R.Girdi label="Veri Saklama Süresi (gün, 0=süresiz)" type="number" value={db.ayarlar.veriSaklamaSuresiGun} onChange={(e) => ayarKaydet("veriSaklamaSuresiGun", "Veri Saklama Süresi", parseInt(e.target.value) || 0)} />
            <R.Girdi label="Log Saklama Süresi (gün, 0=süresiz)" type="number" value={db.ayarlar.logSaklamaSuresiGun} onChange={(e) => ayarKaydet("logSaklamaSuresiGun", "Log Saklama Süresi", parseInt(e.target.value) || 0)} />
          </div>
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Not: Otomatik ekran kilidi süresi şu an sabit 15 dakikadır; buradaki "Oturum Süresi" değeri ileride bu
            kilit süresine bağlanabilir. Şifre değiştirme ve giriş geçmişi <strong>Yedekleme / Güvenlik</strong>{" "}
            ekranındadır.
          </p>
          <R.Buton variant="ghost" onClick={() => setSekme("yedekguvenlik")}>
            <R.ShieldCheck size={14} /> Şifre / Giriş Geçmişine Git
          </R.Buton>
        </R.Kart>
      )}

      {altSekme === "kisayollar" && (
        <R.Kart className="p-4 max-w-lg">
          <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
            Klavye Kısayolları
          </h4>
          <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
            F1-F10 arası herhangi bir tuş atayabilirsiniz. F2/F8/F9, Satış ekranındayken zaten o ekrana özel (ürün
            arama alanına odaklanma, ödemeye kaydırma, satışı tamamlama) çalışır; buradaki atamalar Satış ekranı
            DIŞINDAYKEN devreye girer.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { anahtar: "yeniSatis", etiket: "Yeni Satış" },
              { anahtar: "urunAra", etiket: "Ürün Ara" },
              { anahtar: "musteriAra", etiket: "Müşteri Ara" },
              { anahtar: "yeniMusteri", etiket: "Yeni Müşteri" },
              { anahtar: "yeniUrun", etiket: "Yeni Ürün" },
              { anahtar: "tahsilat", etiket: "Tahsilat" },
              { anahtar: "alis", etiket: "Alış" },
              { anahtar: "odeme", etiket: "Ödeme" },
              { anahtar: "satisiTamamla", etiket: "Satışı Tamamla" },
              { anahtar: "kasa", etiket: "Kasa" },
            ].map((k) => (
              <div key={k.anahtar} className="flex items-center gap-2">
                <span className="text-xs flex-1" style={{ color: R.T.ink900 }}>
                  {k.etiket}
                </span>
                <select
                  value={db.ayarlar.klavyeKisayollari[k.anahtar]}
                  onChange={(e) => alanGuncelle("klavyeKisayollari", `Kısayol — ${k.etiket}`, k.anahtar, e.target.value)}
                  className="w-20 px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  {["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </R.Kart>
      )}

      {altSekme === "yedekleme" && (
        <R.Kart className="p-4 max-w-md">
          <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
            Yedekleme
          </h4>
          <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
            Otomatik yedekleme sıklığı/saati, manuel yedek alma ve geri yükleme Yedekleme / Güvenlik ekranından
            yönetilir.
          </p>
          <R.Buton onClick={() => setSekme("yedekguvenlik")}>
            <R.Download size={14} /> Yedekleme Ekranına Git
          </R.Buton>
        </R.Kart>
      )}

      {altSekme === "gecmis" && (
        <R.Kart className="overflow-hidden">
          <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
            <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
              Ayar Değişiklik Geçmişi
            </span>
          </div>
          {ayarDegisiklikleri.length === 0 ? (
            <R.Bos ikon={R.Settings} baslik="Henüz ayar değişikliği yok" aciklama="Bir ayar değiştirdiğinizde burada kim/ne zaman/neyden-neye görünecek." />
          ) : (
            ayarDegisiklikleri.map((i) => (
              <div key={i.id} className="px-4 py-2.5 text-sm" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                <div style={{ color: R.T.ink900 }}>
                  <strong>{i.kullaniciAdi || "—"}</strong> — {i.islemTuru.replace("Ayar değiştirildi: ", "")}
                </div>
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  {i.eskiDeger} → {i.yeniDeger} · {new Date(i.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))
          )}
        </R.Kart>
      )}
    </div>
  );
}

export function IceDisaAktarmaSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("urunIceAktar"); // urunIceAktar | oemIceAktar | disaAktar

  // ============================================================
  // ÜRÜN İÇE AKTARMA
  // ============================================================
  const [csvBasliklari, setCsvBasliklari] = R.useState([]);
  const [csvSatirlari, setCsvSatirlari] = R.useState([]);
  const [dosyaAdi, setDosyaAdi] = R.useState("");
  const [eslesmeler, setEslesmeler] = R.useState({});
  const [sablonAdi, setSablonAdi] = R.useState("");
  const [satirSonuclari, setSatirSonuclari] = R.useState(null);
  const dosyaInputRef = R.useRef(null);

  const dosyaYukle = (e) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => {
      const { basliklar, satirlar } = R.csvAyristir(ev.target.result);
      if (basliklar.length === 0) {
        R.bildirimGoster("Dosya okunamadı veya boş görünüyor.", "hata");
        return;
      }
      setCsvBasliklari(basliklar);
      setCsvSatirlari(satirlar);
      setDosyaAdi(dosya.name);
      setSatirSonuclari(null);
      const otomatik = {};
      R.ICE_AKTARMA_ALANLARI.forEach((a) => (otomatik[a.anahtar] = R.otomatikSutunOner(a.anahtar, basliklar)));
      setEslesmeler(otomatik);
    };
    okuyucu.readAsText(dosya, "UTF-8");
    e.target.value = "";
  };

  const sablonUygula = (sablonId) => {
    const sablon = db.iceAktarmaSablonlari.find((s) => s.id === sablonId);
    if (!sablon) return;
    setEslesmeler(sablon.alanEslesmeleri);
    R.bildirimGoster(`"${sablon.ad}" şablonu uygulandı.`, "basari");
  };

  const sablonKaydet = () => {
    if (!sablonAdi.trim()) {
      R.bildirimGoster("Şablon adı girin.", "hata");
      return;
    }
    updateDb((prev) => ({ ...prev, iceAktarmaSablonlari: [...prev.iceAktarmaSablonlari, { id: R.yeniId("sb"), ad: sablonAdi.trim(), alanEslesmeleri: eslesmeler }] }));
    setSablonAdi("");
    R.bildirimGoster("Eşleştirme şablonu kaydedildi.", "basari");
  };

  const analizEt = () => {
    const sonuclar = [];
    const gorulenStokKodlari = new Set();
    const degerAl = (satir, alan) => {
      const sutun = eslesmeler[alan];
      if (!sutun) return "";
      const idx = csvBasliklari.indexOf(sutun);
      return idx >= 0 ? (satir[idx] || "").trim() : "";
    };
    csvSatirlari.forEach((satir, i) => {
      const satirNo = i + 2; // 1. satır başlık, veri 2'den başlar
      const stokKodu = degerAl(satir, "stokKodu");
      if (!stokKodu) {
        sonuclar.push({ satirNo, tur: "hata", mesaj: "Stok kodu boş" });
        return;
      }
      const norm = R.kodNormalize(stokKodu);
      if (gorulenStokKodlari.has(norm)) {
        sonuclar.push({ satirNo, tur: "mukerrer", mesaj: `Stok kodu "${stokKodu}" bu dosyada birden fazla kez geçiyor` });
        return;
      }
      gorulenStokKodlari.add(norm);

      const kdvMetni = degerAl(satir, "kdvOrani");
      if (kdvMetni && (isNaN(parseFloat(kdvMetni.replace(",", "."))) || parseFloat(kdvMetni.replace(",", ".")) < 0)) {
        sonuclar.push({ satirNo, tur: "hata", mesaj: "KDV oranı geçersiz" });
        return;
      }

      const markaMetni = degerAl(satir, "marka");
      if (markaMetni && !db.markalar.some((m) => m.ad.toLowerCase() === markaMetni.toLowerCase())) {
        sonuclar.push({ satirNo, tur: "hata", mesaj: `Marka bulunamadı: "${markaMetni}"` });
        return;
      }

      const mevcutUrun = db.parcalar.find((p) => R.kodNormalize(p.stokKodu) === norm);
      const ad = degerAl(satir, "ad");
      if (!mevcutUrun && !ad) {
        sonuclar.push({ satirNo, tur: "hata", mesaj: "Yeni ürün için Ürün Adı zorunlu" });
        return;
      }

      const veriler = { stokKodu };
      R.ICE_AKTARMA_ALANLARI.forEach((alan) => {
        if (alan.anahtar === "stokKodu") return;
        const v = degerAl(satir, alan.anahtar);
        if (v !== "") veriler[alan.anahtar] = alan.tip === "sayi" ? parseFloat(v.replace(",", ".")) : v;
      });

      // Excel aktarımında da veri doğrulama — güncellenecek satırlarda fiyat
      // ve stok gerçekten değişiyor mu, önceden belli edilir.
      const fiyatDegisiyor = mevcutUrun && veriler.satisFiyati !== undefined && veriler.satisFiyati !== mevcutUrun.satisFiyati;
      const stokDegisiyor = mevcutUrun && veriler.stok !== undefined && veriler.stok !== mevcutUrun.stok;
      const barkodBaskaUrunde = veriler.barkod && R.barkodluParcaBul(db.parcalar, veriler.barkod) && R.barkodluParcaBul(db.parcalar, veriler.barkod).id !== mevcutUrun?.id;
      if (barkodBaskaUrunde) {
        sonuclar.push({ satirNo, tur: "hata", mesaj: `Barkod "${veriler.barkod}" başka bir ürüne kayıtlı` });
        return;
      }

      sonuclar.push({
        satirNo,
        tur: mevcutUrun ? "guncelleme" : "yeni",
        mesaj: mevcutUrun ? "Ürün zaten mevcut — güncellenecek" : null,
        veriler,
        mevcutUrunId: mevcutUrun?.id,
        fiyatDegisiyor,
        stokDegisiyor,
      });
    });
    setSatirSonuclari(sonuclar);
  };

  const ozet = satirSonuclari
    ? {
        toplam: satirSonuclari.length,
        eslesen: satirSonuclari.filter((s) => s.tur === "guncelleme").length,
        yeni: satirSonuclari.filter((s) => s.tur === "yeni").length,
        hatali: satirSonuclari.filter((s) => s.tur === "hata").length,
        fiyatDegisikligi: satirSonuclari.filter((s) => s.fiyatDegisiyor).length,
        stokDegisikligi: satirSonuclari.filter((s) => s.stokDegisiyor).length,
        mukerrer: satirSonuclari.filter((s) => s.tur === "mukerrer").length,
      }
    : null;

  const hataliSatirlariIndir = () => {
    const hatalar = satirSonuclari.filter((s) => s.tur === "hata" || s.tur === "mukerrer");
    R.csvIndir(
      `hatali-satirlar-${R.isoGun(new Date())}.csv`,
      ["Satır No", "Tür", "Mesaj"],
      hatalar.map((h) => [h.satirNo, h.tur === "hata" ? "Hata" : "Mükerrer", h.mesaj])
    );
  };

  const degisiklikleriOnayla = () => {
    const islenecekler = satirSonuclari.filter((s) => s.tur === "yeni" || s.tur === "guncelleme");
    if (islenecekler.length === 0) {
      R.bildirimGoster("Onaylanacak satır yok.", "hata");
      return;
    }
    updateDb((prev) => {
      let sonuc = prev;
      let yeniSayisi = 0;
      let guncellenenSayisi = 0;
      islenecekler.forEach((s) => {
        if (s.tur === "yeni") {
          const yeniParca = {
            id: R.yeniId("p"),
            stokKodu: s.veriler.stokKodu,
            ad: s.veriler.ad || s.veriler.stokKodu,
            marka: s.veriler.marka || "",
            ureticiKodu: s.veriler.ureticiKodu || "",
            barkod: s.veriler.barkod || "",
            kategori: s.veriler.kategori || "",
            anaKategori: s.veriler.kategori || "",
            birim: "Adet",
            kdvOrani: s.veriler.kdvOrani ?? 20,
            alisFiyati: s.veriler.alisFiyati || 0,
            satisFiyati: s.veriler.satisFiyati || 0,
            ortalamaMaliyet: s.veriler.alisFiyati || 0,
            sonAlisFiyati: s.veriler.alisFiyati || 0,
            stok: s.veriler.stok || 0,
            kritikSeviye: s.veriler.kritikSeviye || 0,
            rafAdresi: s.veriler.rafAdresi || "",
            tedarikci: s.veriler.tedarikci || "",
            aktif: true,
          };
          sonuc = { ...sonuc, parcalar: [...sonuc.parcalar, yeniParca] };
          if (s.veriler.oem) {
            sonuc = { ...sonuc, kodlar: [...sonuc.kodlar, { id: R.yeniId("k"), parcaId: yeniParca.id, tip: "OEM", kod: s.veriler.oem }] };
          }
          yeniSayisi++;
        } else {
          const eski = sonuc.parcalar.find((p) => p.id === s.mevcutUrunId);
          if (!eski) return;
          const fiyatDegisti = s.veriler.satisFiyati !== undefined && s.veriler.satisFiyati !== eski.satisFiyati;
          const guncel = { ...eski };
          Object.entries(s.veriler).forEach(([k, v]) => {
            if (k === "stokKodu" || k === "oem") return;
            if (v !== undefined && v !== "") guncel[k] = v;
          });
          if (s.veriler.alisFiyati !== undefined) {
            guncel.ortalamaMaliyet = s.veriler.alisFiyati;
            guncel.sonAlisFiyati = s.veriler.alisFiyati;
          }
          if (fiyatDegisti) {
            guncel.fiyatGecmisi = [
              { id: R.yeniId("f"), tarih: R.zamanDamgasi(), eskiFiyat: eski.satisFiyati, yeniFiyat: s.veriler.satisFiyati, kullanici: aktifKullanici?.adSoyad || "", degisiklikNedeni: `Excel/CSV toplu içe aktarma (${dosyaAdi})` },
              ...(eski.fiyatGecmisi || []),
            ];
          }
          sonuc = { ...sonuc, parcalar: sonuc.parcalar.map((p) => (p.id === eski.id ? guncel : p)) };
          if (s.veriler.oem && !sonuc.kodlar.some((k) => k.parcaId === eski.id && k.tip === "OEM" && k.kod === s.veriler.oem)) {
            sonuc = { ...sonuc, kodlar: [...sonuc.kodlar, { id: R.yeniId("k"), parcaId: eski.id, tip: "OEM", kod: s.veriler.oem }] };
          }
          guncellenenSayisi++;
        }
      });
      // Yeni oluşturulan parçalara eksik kalan tüm varsayılan alanları
      // (depoStoklari, fotograflar, setBilesenleri vb.) tek seferde,
      // veriyiOnar'ın kendi mantığıyla tamamlatır — kod tekrarı olmadan.
      sonuc = R.veriyiOnar(sonuc);
      return R.islemKaydet(sonuc, {
        kullaniciAdi: aktifKullanici?.adSoyad || "",
        islemTuru: "Excel/CSV toplu içe aktarma",
        aciklama: `${dosyaAdi} — ${yeniSayisi} yeni, ${guncellenenSayisi} güncellenen ürün`,
        eskiDeger: "—",
        yeniDeger: `${yeniSayisi + guncellenenSayisi} ürün işlendi`,
      });
    });
    R.bildirimGoster(`${islenecekler.length} ürün başarıyla işlendi.`, "basari");
    setCsvBasliklari([]);
    setCsvSatirlari([]);
    setSatirSonuclari(null);
    setDosyaAdi("");
  };

  // ============================================================
  // OEM / MUADİL TOPLU İÇE AKTARMA
  // ============================================================
  const [oemBasliklari, setOemBasliklari] = R.useState([]);
  const [oemSatirlari, setOemSatirlari] = R.useState([]);
  const [oemDosyaAdi, setOemDosyaAdi] = R.useState("");
  const [oemEslesmeler, setOemEslesmeler] = R.useState({ urunKodu: "", oem: "", muadilKod: "", marka: "" });
  const [oemSonuclari, setOemSonuclari] = R.useState(null);
  const oemInputRef = R.useRef(null);

  const oemDosyaYukle = (e) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => {
      const { basliklar, satirlar } = R.csvAyristir(ev.target.result);
      if (basliklar.length === 0) {
        R.bildirimGoster("Dosya okunamadı veya boş görünüyor.", "hata");
        return;
      }
      setOemBasliklari(basliklar);
      setOemSatirlari(satirlar);
      setOemDosyaAdi(dosya.name);
      setOemSonuclari(null);
      setOemEslesmeler({
        urunKodu: basliklar.find((b) => ["ürün kodu", "urun kodu", "stok kodu"].includes(b.trim().toLowerCase())) || "",
        oem: basliklar.find((b) => b.trim().toLowerCase() === "oem") || "",
        muadilKod: basliklar.find((b) => ["muadil kod", "muadil"].includes(b.trim().toLowerCase())) || "",
        marka: basliklar.find((b) => b.trim().toLowerCase() === "marka") || "",
      });
    };
    okuyucu.readAsText(dosya, "UTF-8");
    e.target.value = "";
  };

  const oemAnalizEt = () => {
    const sonuclar = [];
    oemSatirlari.forEach((satir, i) => {
      const satirNo = i + 2;
      const al = (alan) => {
        const idx = oemBasliklari.indexOf(oemEslesmeler[alan]);
        return idx >= 0 ? (satir[idx] || "").trim() : "";
      };
      const urunKodu = al("urunKodu");
      const oem = al("oem");
      const muadilKod = al("muadilKod");
      if (!urunKodu) {
        sonuclar.push({ satirNo, tur: "hata", mesaj: "Ürün Kodu boş" });
        return;
      }
      if (!oem && !muadilKod) {
        sonuclar.push({ satirNo, tur: "hata", mesaj: "OEM veya Muadil Kod boş" });
        return;
      }
      const parca = db.parcalar.find((p) => R.kodNormalize(p.stokKodu) === R.kodNormalize(urunKodu));
      if (!parca) {
        sonuclar.push({ satirNo, tur: "hata", mesaj: `Ürün Kodu bulunamadı: "${urunKodu}"` });
        return;
      }
      sonuclar.push({ satirNo, tur: "eslesti", parcaId: parca.id, ad: parca.ad, oem, muadilKod });
    });
    setOemSonuclari(sonuclar);
  };

  const oemOnayla = () => {
    const eslesenler = oemSonuclari.filter((s) => s.tur === "eslesti");
    updateDb((prev) => {
      let yeniKodlar = [...prev.kodlar];
      eslesenler.forEach((s) => {
        if (s.oem && !yeniKodlar.some((k) => k.parcaId === s.parcaId && k.tip === "OEM" && k.kod === s.oem)) {
          yeniKodlar.push({ id: R.yeniId("k"), parcaId: s.parcaId, tip: "OEM", kod: s.oem });
        }
        if (s.muadilKod && !yeniKodlar.some((k) => k.parcaId === s.parcaId && k.tip === "Muadil" && k.kod === s.muadilKod)) {
          yeniKodlar.push({ id: R.yeniId("k"), parcaId: s.parcaId, tip: "Muadil", kod: s.muadilKod });
        }
      });
      return R.islemKaydet(
        { ...prev, kodlar: yeniKodlar },
        { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: "OEM/Muadil toplu içe aktarma", aciklama: `${oemDosyaAdi} — ${eslesenler.length} eşleşme`, eskiDeger: "—", yeniDeger: `${eslesenler.length} kod eklendi` }
      );
    });
    R.bildirimGoster(`${eslesenler.length} OEM/Muadil kodu eklendi.`, "basari");
    setOemBasliklari([]);
    setOemSatirlari([]);
    setOemSonuclari(null);
  };

  // ============================================================
  // DIŞA AKTARMA
  // ============================================================
  const disaAktarSeti = (tur) => {
    const bugun = R.isoGun(new Date());
    if (tur === "urunler") {
      R.csvIndir(
        `urun-listesi-${bugun}.csv`,
        ["Stok Kodu", "Ürün Adı", "Marka", "Kategori", "Birim", "Alış Fiyatı", "Satış Fiyatı", "KDV", "Stok", "Raf", "Min. Stok", "Tedarikçi", "Aktif"],
        db.parcalar.map((p) => [p.stokKodu, p.ad, p.marka, p.kategori, p.birim, p.alisFiyati, p.satisFiyati, p.kdvOrani, p.stok, p.rafAdresi, p.kritikSeviye, p.tedarikci, p.aktif !== false ? "Evet" : "Hayır"])
      );
    } else if (tur === "stok") {
      R.csvIndir(
        `stok-listesi-${bugun}.csv`,
        ["Stok Kodu", "Ürün Adı", "Marka", "Stok", "Kritik Seviye", "Raf", "Durum"],
        db.parcalar.map((p) => [p.stokKodu, p.ad, p.marka, p.stok, p.kritikSeviye, p.rafAdresi, R.stokDurumuHesapla(p) === "yok" ? "Stokta Yok" : R.stokDurumuHesapla(p) === "kritik" ? "Kritik" : "Normal"])
      );
    } else if (tur === "fiyat") {
      R.csvIndir(
        `fiyat-listesi-${bugun}.csv`,
        ["Stok Kodu", "Ürün Adı", "Marka", "Maliyet", "Satış Fiyatı", "KDV"],
        db.parcalar.map((p) => [p.stokKodu, p.ad, p.marka, R.gecerliMaliyet(p), p.satisFiyati, p.kdvOrani])
      );
    } else if (tur === "satislar") {
      R.csvIndir(
        `satislar-${bugun}.csv`,
        ["Belge No", "Tarih", "Müşteri", "Satışı Yapan", "Genel Toplam", "Durum"],
        db.satislar.map((s) => [s.belgeNo || s.id.slice(-6).toUpperCase(), R.tarihGoster(s.tarih), s.musteriAdi, s.satisiYapan, s.genelToplam, s.durum])
      );
    } else if (tur === "alislar") {
      R.csvIndir(
        `alislar-${bugun}.csv`,
        ["Fatura No", "Tarih", "Tedarikçi", "Toplam", "Ödenen", "Ödeme Durumu"],
        db.malAlimlari.map((m) => [m.faturaNo, R.tarihGoster(m.faturaTarihi), m.tedarikci, m.faturaGirilenToplam ?? m.hesaplananGenelToplam, m.odenenTutar || 0, m.odemeDurumu])
      );
    } else if (tur === "musteriler") {
      R.csvIndir(
        `musteriler-${bugun}.csv`,
        ["Ad", "Telefon", "Müşteri Tipi", "Bakiye", "Borç Limiti", "Vade Günü"],
        db.cariler.map((c) => [c.ad, c.telefon, c.musteriTipi, c.bakiye || 0, c.borcLimiti || 0, c.vadeGunu || 0])
      );
    } else if (tur === "tedarikciler") {
      R.csvIndir(`tedarikciler-${bugun}.csv`, ["Ad", "Telefon", "Bakiye"], db.tedarikciler.map((t) => [t.ad, t.telefon, t.bakiye || 0]));
    } else if (tur === "cariHareketler") {
      R.csvIndir(
        `cari-hareketler-${bugun}.csv`,
        ["Müşteri", "Tarih", "Tür", "Tutar", "Bakiye Sonrası"],
        db.cariler.flatMap((c) => c.hareketler.map((h) => [c.ad, R.tarihGoster(h.tarih), h.tur, h.tutar, h.bakiyeSonrasi]))
      );
    } else if (tur === "kasaHareketleri") {
      R.csvIndir(
        `kasa-hareketleri-${bugun}.csv`,
        ["Hesap", "Tarih", "Tür", "Giriş", "Çıkış", "Bakiye Sonrası"],
        db.hesaplar.flatMap((h) => h.hareketler.map((hh) => [h.ad, R.tarihGoster(hh.tarih), hh.tur, hh.giris || 0, hh.cikis || 0, hh.bakiyeSonrasi]))
      );
    } else if (tur === "sayim") {
      R.csvIndir(
        `sayim-sonuclari-${bugun}.csv`,
        ["Sayım Tarihi", "Kapsam", "Toplam", "Eksik", "Fazla", "Doğru"],
        db.sayimlar.filter((s) => s.durum === "Onaylandı").map((s) => [R.tarihGoster(s.onayTarihi || s.tarih), s.kapsamTuru, s.ozet?.toplam || 0, s.ozet?.eksik || 0, s.ozet?.fazla || 0, s.ozet?.dogru || 0])
      );
    } else if (tur === "raporlar") {
      const ayBasiIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA");
      const buAySatislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= ayBasiIso);
      R.csvIndir(
        `rapor-satis-ozeti-${bugun}.csv`,
        ["Belge No", "Tarih", "Müşteri", "Ürün", "Adet", "Birim Fiyat", "Tutar"],
        buAySatislar.flatMap((s) => s.kalemler.map((k) => [s.belgeNo || s.id.slice(-6).toUpperCase(), R.tarihGoster(s.tarih), s.musteriAdi, k.ad, k.adet, k.birimFiyat, k.adet * k.birimFiyat]))
      );
    }
    R.bildirimGoster("Dosya indirildi.", "basari");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "urunIceAktar", ad: "Ürün İçe Aktar" },
          { id: "oemIceAktar", ad: "OEM/Muadil İçe Aktar" },
          { id: "disaAktar", ad: "Dışa Aktar" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold whitespace-nowrap"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "urunIceAktar" && (
        <div className="flex flex-col gap-4">
          <R.Kart className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <R.Buton onClick={() => dosyaInputRef.current?.click()}>
                <R.FileDown size={15} className="rotate-180" /> Excel/CSV Dosyası Seç
              </R.Buton>
              <input ref={dosyaInputRef} type="file" accept=".csv,.txt" onChange={dosyaYukle} className="hidden" />
              {dosyaAdi && (
                <span className="text-sm" style={{ color: R.T.ink500 }}>
                  {dosyaAdi} — {csvSatirlari.length} satır bulundu
                </span>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: R.T.ink500 }}>
              Excel'de dosyayı "CSV UTF-8 (Virgülle ayrılmış)" formatında kaydedip yükleyin. Sadece Stok Kodu + Alış/Satış
              Fiyatı gibi birkaç sütun içeren bir dosya yükleyerek de mevcut ürünleri toplu güncelleyebilirsiniz.
            </p>
          </R.Kart>

          {csvBasliklari.length > 0 && (
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-1" style={{ color: R.T.ink900 }}>
                Sütun Eşleştirme
              </h4>
              <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
                Excel sütunu → Program alanı. Otomatik önerilen eşleşmeleri dilediğiniz gibi değiştirebilirsiniz.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {R.ICE_AKTARMA_ALANLARI.map((alan) => (
                  <div key={alan.anahtar} className="flex items-center gap-2">
                    <span className="text-xs w-32 shrink-0" style={{ color: R.T.ink900 }}>
                      {alan.etiket} {alan.zorunlu && <span style={{ color: R.T.red }}>*</span>}
                    </span>
                    <select
                      value={eslesmeler[alan.anahtar] || ""}
                      onChange={(e) => setEslesmeler({ ...eslesmeler, [alan.anahtar]: e.target.value })}
                      className="flex-1 px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                      style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    >
                      <option value="">Yok</option>
                      {csvBasliklari.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-3" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                {db.iceAktarmaSablonlari.length > 0 && (
                  <select onChange={(e) => e.target.value && sablonUygula(e.target.value)} className="px-2 py-1.5 rounded-md border text-xs outline-none bg-white" style={{ borderColor: R.T.steel300, color: R.T.ink900 }} defaultValue="">
                    <option value="">Kayıtlı şablon uygula…</option>
                    {db.iceAktarmaSablonlari.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.ad}
                      </option>
                    ))}
                  </select>
                )}
                <input value={sablonAdi} onChange={(e) => setSablonAdi(e.target.value)} placeholder="Şablon adı" className="px-2 py-1.5 rounded-md border text-xs outline-none" style={{ borderColor: R.T.steel300 }} />
                <button onClick={sablonKaydet} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                  Eşleştirmeyi Şablon Olarak Kaydet
                </button>
                <R.Buton onClick={analizEt}>
                  <R.Search size={14} /> Analiz Et
                </R.Buton>
              </div>
            </R.Kart>
          )}

          {ozet && (
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                Analiz Sonucu
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                {[
                  { etiket: "Satır Bulundu", deger: ozet.toplam },
                  { etiket: "Eşleşen (Güncellenecek)", deger: ozet.eslesen, ton: "steel" },
                  { etiket: "Yeni Ürün", deger: ozet.yeni, ton: "green" },
                  { etiket: "Hatalı Satır", deger: ozet.hatali, ton: "red" },
                  { etiket: "Mükerrer", deger: ozet.mukerrer, ton: "red" },
                ].map((k) => (
                  <div key={k.etiket} className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      {k.etiket}
                    </div>
                    <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: k.ton === "red" ? R.T.red : k.ton === "green" ? R.T.green : R.T.ink900 }}>
                      {k.deger}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { etiket: "Fiyat Değişikliği Olan Satır", deger: ozet.fiyatDegisikligi },
                  { etiket: "Stok Değişikliği Olan Satır", deger: ozet.stokDegisikligi },
                ].map((k) => (
                  <div key={k.etiket} className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      {k.etiket}
                    </div>
                    <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: R.T.ink900 }}>
                      {k.deger}
                    </div>
                  </div>
                ))}
              </div>
              {(ozet.hatali > 0 || ozet.mukerrer > 0) && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                      Hata Raporu
                    </span>
                    <button onClick={hataliSatirlariIndir} className="text-xs font-semibold underline" style={{ color: R.T.orangeDark }}>
                      Hatalı Satırları İndir
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {satirSonuclari
                      .filter((s) => s.tur === "hata" || s.tur === "mukerrer")
                      .map((s, i) => (
                        <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: "#F9DEDE", color: R.T.red }}>
                          ❌ {s.satirNo}. satır — {s.mesaj}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {satirSonuclari.filter((s) => s.mesaj && s.tur === "guncelleme").length > 0 && (
                <div className="mb-3 flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {satirSonuclari
                    .filter((s) => s.mesaj && s.tur === "guncelleme")
                    .slice(0, 20)
                    .map((s, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: "#FDF1D6", color: "#8A6110" }}>
                        ⚠️ {s.satirNo}. satır — {s.mesaj}
                      </div>
                    ))}
                </div>
              )}
              <R.Buton onClick={degisiklikleriOnayla} disabled={ozet.yeni + ozet.eslesen === 0}>
                <R.Check size={15} /> Değişiklikleri Onayla ({ozet.yeni + ozet.eslesen} satır)
              </R.Buton>
            </R.Kart>
          )}
        </div>
      )}

      {altSekme === "oemIceAktar" && (
        <div className="flex flex-col gap-4">
          <R.Kart className="p-4">
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Sütunlar: <strong>OEM | Marka | Muadil Kod | Ürün Kodu</strong>. Ürün Kodu (Stok Kodu) ile eşleşen ürüne
              OEM ve/veya Muadil Kod eklenir.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <R.Buton onClick={() => oemInputRef.current?.click()}>
                <R.FileDown size={15} className="rotate-180" /> Excel/CSV Dosyası Seç
              </R.Buton>
              <input ref={oemInputRef} type="file" accept=".csv,.txt" onChange={oemDosyaYukle} className="hidden" />
              {oemDosyaAdi && (
                <span className="text-sm" style={{ color: R.T.ink500 }}>
                  {oemDosyaAdi} — {oemSatirlari.length} satır
                </span>
              )}
            </div>
          </R.Kart>

          {oemBasliklari.length > 0 && (
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                Sütun Eşleştirme
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { anahtar: "urunKodu", etiket: "Ürün Kodu (zorunlu)" },
                  { anahtar: "oem", etiket: "OEM" },
                  { anahtar: "muadilKod", etiket: "Muadil Kod" },
                  { anahtar: "marka", etiket: "Marka (bilgi amaçlı)" },
                ].map((alan) => (
                  <div key={alan.anahtar} className="flex items-center gap-2">
                    <span className="text-xs w-32 shrink-0" style={{ color: R.T.ink900 }}>
                      {alan.etiket}
                    </span>
                    <select
                      value={oemEslesmeler[alan.anahtar] || ""}
                      onChange={(e) => setOemEslesmeler({ ...oemEslesmeler, [alan.anahtar]: e.target.value })}
                      className="flex-1 px-2 py-1.5 rounded-md border text-xs outline-none bg-white"
                      style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                    >
                      <option value="">Yok</option>
                      {oemBasliklari.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <R.Buton onClick={oemAnalizEt}>
                <R.Search size={14} /> Analiz Et
              </R.Buton>
            </R.Kart>
          )}

          {oemSonuclari && (
            <R.Kart className="p-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Eşleşen
                  </div>
                  <div className="text-lg font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                    {oemSonuclari.filter((s) => s.tur === "eslesti").length}
                  </div>
                </div>
                <div className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    Hatalı
                  </div>
                  <div className="text-lg font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                    {oemSonuclari.filter((s) => s.tur === "hata").length}
                  </div>
                </div>
              </div>
              {oemSonuclari.filter((s) => s.tur === "hata").length > 0 && (
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-3">
                  {oemSonuclari
                    .filter((s) => s.tur === "hata")
                    .map((s, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded" style={{ background: "#F9DEDE", color: R.T.red }}>
                        ❌ {s.satirNo}. satır — {s.mesaj}
                      </div>
                    ))}
                </div>
              )}
              <R.Buton onClick={oemOnayla} disabled={oemSonuclari.filter((s) => s.tur === "eslesti").length === 0}>
                <R.Check size={15} /> Değişiklikleri Onayla
              </R.Buton>
            </R.Kart>
          )}
        </div>
      )}

      {altSekme === "disaAktar" && (
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-md text-xs" style={{ background: "#FDF1D6", color: "#8A6110" }}>
            <strong>Önemli:</strong> Excel/CSV dışa aktarma veritabanı yedeğinin YERİNE geçmez — yedekleme için
            "Yedekleme / Güvenlik" sekmesindeki tam veritabanı yedeğini kullanın. Bu araç toplu veri işlemi, analiz ve
            dışarıya aktarma amaçlıdır.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { tur: "urunler", ad: "Ürün Listesi" },
              { tur: "stok", ad: "Stok Listesi" },
              { tur: "fiyat", ad: "Fiyat Listesi" },
              { tur: "satislar", ad: "Satışlar" },
              { tur: "alislar", ad: "Alışlar" },
              { tur: "musteriler", ad: "Müşteriler" },
              { tur: "tedarikciler", ad: "Tedarikçiler" },
              { tur: "cariHareketler", ad: "Cari Hareketler" },
              { tur: "kasaHareketleri", ad: "Kasa Hareketleri" },
              { tur: "sayim", ad: "Sayım Sonuçları" },
              { tur: "raporlar", ad: "Raporlar (Bu Ay Satış)" },
            ].map((k) => (
              <button key={k.tur} onClick={() => disaAktarSeti(k.tur)} className="text-left">
                <R.Kart className="p-3.5 flex items-center gap-2">
                  <R.FileDown size={16} style={{ color: R.T.orange }} />
                  <span className="text-sm font-semibold" style={{ color: R.T.ink900 }}>
                    {k.ad}
                  </span>
                </R.Kart>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EntegrasyonlarSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("entegrasyonlar");
  const [formAcik, setFormAcik] = R.useState(false);
  const [form, setForm] = R.useState({ tur: "eTicaret", ad: "", apiKey: "", apiSecret: "" });
  const [gosterilenId, setGosterilenId] = R.useState(null);

  const entegrasyonEkle = () => {
    if (!form.ad.trim()) {
      R.bildirimGoster("Entegrasyon adı zorunludur.", "hata");
      return;
    }
    const yeni = {
      id: R.yeniId("ent"),
      tur: form.tur,
      ad: form.ad.trim(),
      aktif: false,
      apiKey: form.apiKey.trim(),
      apiSecret: form.apiSecret.trim(),
      ayarlar: {},
      sonSenkronizasyon: null,
      durum: "Pasif",
    };
    updateDb((prev) => R.islemKaydet({ ...prev, entegrasyonlar: [yeni, ...prev.entegrasyonlar] }, { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: "Entegrasyon eklendi", aciklama: yeni.ad, eskiDeger: "—", yeniDeger: "Pasif" }));
    setForm({ tur: "eTicaret", ad: "", apiKey: "", apiSecret: "" });
    setFormAcik(false);
    R.bildirimGoster("Entegrasyon eklendi — varsayılan olarak pasif.", "basari");
  };

  const aktifPasifDegistir = (ent) => {
    const yeniDurum = !ent.aktif;
    updateDb((prev) =>
      R.islemKaydet(
        { ...prev, entegrasyonlar: prev.entegrasyonlar.map((e) => (e.id === ent.id ? { ...e, aktif: yeniDurum, durum: yeniDurum ? "Bağlı" : "Pasif" } : e)) },
        { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: "Entegrasyon durumu değişti", aciklama: ent.ad, eskiDeger: ent.aktif ? "Aktif" : "Pasif", yeniDeger: yeniDurum ? "Aktif" : "Pasif" }
      )
    );
  };

  const entegrasyonSil = (ent) => {
    updateDb((prev) => ({ ...prev, entegrasyonlar: prev.entegrasyonlar.filter((e) => e.id !== ent.id) }));
    R.bildirimGoster("Entegrasyon silindi.", "basari");
  };

  // "Bağlantıyı Test Et" — GERÇEK bir ağ isteği ATMAZ (bu ortamda dış
  // sistemlere erişim yok); sadece log/kuyruk mekanizmasının nasıl
  // çalışacağını göstermek için BİLGİLENDİRME amaçlı bir log kaydı düşer.
  const baglantiTestEt = (ent) => {
    updateDb((prev) => ({
      ...prev,
      entegrasyonLoglari: [
        { id: R.yeniId("elog"), tarih: R.zamanDamgasi(), entegrasyonId: ent.id, sistem: ent.ad, islem: "Bağlantı Testi", basarili: null, hata: "Bu ortamda gerçek dış bağlantı desteklenmiyor — backend kurulduğunda burası gerçek isteği atacak." },
        ...prev.entegrasyonLoglari,
      ],
    }));
    R.bildirimGoster("Test kaydı log'a düşürüldü — gerçek bağlantı bu ortamda yapılamaz (bkz. not).", "bilgi");
  };

  const senkronOzet = {
    basarili: db.entegrasyonKuyrugu.filter((k) => k.durum === "Başarılı").length,
    hatali: db.entegrasyonKuyrugu.filter((k) => k.durum === "Hatalı").length,
    bekleyen: db.entegrasyonKuyrugu.filter((k) => k.durum === "Bekliyor" || k.durum === "Çalışıyor" || k.durum === "Tekrar Deneniyor").length,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="p-3 rounded-md text-sm" style={{ background: "#FDF1D6", color: "#8A6110" }}>
        ⚠️ Bu program sunucusuz, tarayıcı içinde çalışan tek dosyalık bir uygulamadır. Buradaki entegrasyonlar
        GERÇEK dış sistemlere (Trendyol, e-fatura, SMS vb.) bağlanmaz — ileride gerçek bir backend kurulduğunda
        kullanılacak ayar/log/kuyruk altyapısıdır.
      </div>

      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "entegrasyonlar", ad: "Entegrasyonlar" },
          { id: "senkron", ad: "Senkronizasyon Merkezi" },
          { id: "loglar", ad: "Loglar" },
          { id: "kuyruk", ad: "İşlem Kuyruğu" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold whitespace-nowrap px-2"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "entegrasyonlar" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <R.Buton onClick={() => setFormAcik(true)}>
              <R.Plus size={15} /> Entegrasyon Ekle
            </R.Buton>
          </div>
          {formAcik && (
            <R.Kart className="p-4 flex flex-col gap-2">
              <R.Secim label="Tür" value={form.tur} onChange={(e) => setForm({ ...form, tur: e.target.value })}>
                {R.ENTEGRASYON_TURLERI.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ad}
                  </option>
                ))}
              </R.Secim>
              <R.Girdi label="Entegrasyon Adı" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="ör. Trendyol Mağazam" />
              <R.Girdi label="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="(opsiyonel — ileride kullanılacak)" />
              <R.Girdi label="API Secret" type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder="(opsiyonel — ileride kullanılacak)" />
              <div className="flex gap-2 mt-1">
                <R.Buton onClick={entegrasyonEkle}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setFormAcik(false)}>
                  Vazgeç
                </R.Buton>
              </div>
            </R.Kart>
          )}

          {db.entegrasyonlar.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Zap} baslik="Henüz entegrasyon tanımlanmadı" aciklama="Trendyol, e-fatura, kargo veya tedarikçi B2B için altyapı burada hazırlanır." />
            </R.Kart>
          ) : (
            db.entegrasyonlar.map((ent) => {
              const durum = R.entegrasyonDurumGorseli[ent.durum];
              return (
                <R.Kart key={ent.id} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                          {ent.ad}
                        </span>
                        <R.Rozet tone={durum.ton}>
                          {durum.emoji} {ent.durum}
                        </R.Rozet>
                        <R.Rozet tone="steel">{R.ENTEGRASYON_TURLERI.find((t) => t.id === ent.tur)?.ad}</R.Rozet>
                      </div>
                      <div className="text-xs mt-0.5" style={{ ...R.MONO, color: R.T.ink500 }}>
                        Key: {gosterilenId === ent.id ? ent.apiKey || "—" : R.anahtarMaskele(ent.apiKey)} · Secret: {gosterilenId === ent.id ? ent.apiSecret || "—" : R.anahtarMaskele(ent.apiSecret)}
                        <button onClick={() => setGosterilenId(gosterilenId === ent.id ? null : ent.id)} className="ml-2 underline" style={{ color: R.T.orangeDark }}>
                          {gosterilenId === ent.id ? "Gizle" : "Göster"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => baglantiTestEt(ent)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                        Bağlantıyı Test Et
                      </button>
                      <button onClick={() => aktifPasifDegistir(ent)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: ent.aktif ? "#F9DEDE" : "#DEF0DF", color: ent.aktif ? R.T.red : R.T.green }}>
                        {ent.aktif ? "Pasif Yap" : "Aktif Yap"}
                      </button>
                      <button onClick={() => entegrasyonSil(ent)} style={{ color: R.T.red }}>
                        <R.Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </R.Kart>
              );
            })
          )}
        </div>
      )}

      {altSekme === "senkron" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <R.Kart className="p-4 text-center">
              <div className="text-2xl">🟢</div>
              <div className="text-lg font-semibold" style={R.MONO}>
                {senkronOzet.basarili}
              </div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                İşlem senkronize edildi
              </div>
            </R.Kart>
            <R.Kart className="p-4 text-center">
              <div className="text-2xl">🔴</div>
              <div className="text-lg font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                {senkronOzet.hatali}
              </div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                İşlem hata verdi
              </div>
            </R.Kart>
            <R.Kart className="p-4 text-center">
              <div className="text-2xl">🟡</div>
              <div className="text-lg font-semibold" style={{ ...R.MONO, color: "#8A6110" }}>
                {senkronOzet.bekleyen}
              </div>
              <div className="text-xs" style={{ color: R.T.ink500 }}>
                İşlem bekliyor
              </div>
            </R.Kart>
          </div>
          <div className="flex flex-col gap-2">
            {db.entegrasyonlar.filter((e) => e.aktif).map((ent) => (
              <div key={ent.id} className="flex items-center justify-between text-sm px-3 py-2.5 rounded-md" style={{ background: R.T.steel100 }}>
                <span style={{ color: R.T.ink900 }}>{ent.ad}</span>
                <span style={{ color: R.T.ink500 }}>{ent.sonSenkronizasyon ? `Son senkron: ${new Date(ent.sonSenkronizasyon).toLocaleString("tr-TR")}` : "Henüz senkronize edilmedi"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {altSekme === "loglar" && (
        <R.Kart className="overflow-hidden">
          {db.entegrasyonLoglari.length === 0 ? (
            <R.Bos ikon={R.FileText} baslik="Log kaydı yok" aciklama="Entegrasyon işlemleri burada kayıt altına alınır." />
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Tarih/Saat</th>
                    <th className="text-left font-semibold px-3 py-2">Sistem</th>
                    <th className="text-left font-semibold px-3 py-2">İşlem</th>
                    <th className="text-left font-semibold px-3 py-2">Durum</th>
                    <th className="text-left font-semibold px-3 py-2">Hata</th>
                  </tr>
                </thead>
                <tbody>
                  {db.entegrasyonLoglari.slice(0, 200).map((l) => (
                    <tr key={l.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                        {new Date(l.tarih).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                        {l.sistem}
                      </td>
                      <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                        {l.islem}
                      </td>
                      <td className="px-3 py-2">{l.basarili === null ? <R.Rozet tone="steel">ℹ️ Bilgi</R.Rozet> : l.basarili ? <R.Rozet tone="green">✅ Başarılı</R.Rozet> : <R.Rozet tone="red">🔴 Başarısız</R.Rozet>}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: R.T.ink500 }}>
                        {l.hata || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "kuyruk" && (
        <R.Kart className="overflow-hidden">
          {db.entegrasyonKuyrugu.length === 0 ? (
            <R.Bos ikon={R.ClipboardList} baslik="Kuyrukta işlem yok" aciklama="İnternet bağlantısı kesildiğinde biriken işlemler burada görünür ve bağlantı gelince otomatik gönderilir." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Tarih</th>
                    <th className="text-left font-semibold px-3 py-2">Sistem</th>
                    <th className="text-left font-semibold px-3 py-2">İşlem</th>
                    <th className="text-left font-semibold px-3 py-2">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {db.entegrasyonKuyrugu.map((k) => (
                    <tr key={k.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                        {new Date(k.tarih).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                        {k.sistem}
                      </td>
                      <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                        {k.islem}
                      </td>
                      <td className="px-3 py-2">
                        <R.Rozet tone={k.durum === "Başarılı" ? "green" : k.durum === "Hatalı" ? "red" : "yellow"}>{k.durum}</R.Rozet>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}
    </div>
  );
}

export function DisBildirimSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("sablonlar");
  const [formAcik, setFormAcik] = R.useState(false);
  const [form, setForm] = R.useState(R.bosSablonForm);
  const [onizlemeId, setOnizlemeId] = R.useState(null);

  const ORNEK_DEGERLER = { ürün_adi: "MANN HU719/7X", stok: "3", minimum_stok: "5", sipariş_miktarı: "12", musteri_adi: "ABC Otomotiv", tutar: "1.250,00₺", takip_no: "123456789", kargo_firmasi: "Yurtiçi Kargo" };

  const sablonKaydet = () => {
    if (!form.baslik.trim() && !form.govde.trim()) {
      R.bildirimGoster("Başlık veya gövde girin.", "hata");
      return;
    }
    const yeni = { id: R.yeniId("sbl"), ...form, baslik: form.baslik.trim(), govde: form.govde.trim(), aktif: true };
    updateDb((prev) => R.islemKaydet({ ...prev, bildirimSablonlari: [yeni, ...prev.bildirimSablonlari] }, { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: "Bildirim şablonu oluşturuldu", aciklama: `${yeni.olayTuru} — ${yeni.kanal}`, eskiDeger: "—", yeniDeger: yeni.tur }));
    setForm(R.bosSablonForm);
    setFormAcik(false);
    R.bildirimGoster("Şablon kaydedildi.", "basari");
  };

  const sablonAktifPasif = (s) => updateDb((prev) => ({ ...prev, bildirimSablonlari: prev.bildirimSablonlari.map((x) => (x.id === s.id ? { ...x, aktif: !x.aktif } : x)) }));
  const sablonSil = (s) => updateDb((prev) => ({ ...prev, bildirimSablonlari: prev.bildirimSablonlari.filter((x) => x.id !== s.id) }));

  // "Test Gönder" — GERÇEK bir mesaj göndermez; şablonu örnek değerlerle
  // doldurup önizleme gösterir ve gönderim geçmişine "Beklemede" (backend
  // bağlanana kadar) bir kayıt düşürür — akışın nasıl işleyeceğini gösterir.
  const testGonder = (s) => {
    updateDb((prev) => ({
      ...prev,
      disBildirimGecmisi: [
        {
          id: R.yeniId("dbg"),
          tarih: R.zamanDamgasi(),
          aliciTuru: "musteri",
          aliciAdi: "(test) " + ORNEK_DEGERLER.musteri_adi,
          kanal: s.kanal,
          mesajTuru: s.olayTuru,
          durum: "Beklemede",
          hata: "Gerçek gönderim backend bağlanana kadar desteklenmiyor — bu bir test kaydıdır.",
          denemeSayisi: 0,
        },
        ...prev.disBildirimGecmisi,
      ],
    }));
    R.bildirimGoster("Test kaydı gönderim geçmişine düşürüldü (gerçek mesaj gönderilmedi).", "bilgi");
  };

  const tekrarDene = (kayit) => {
    updateDb((prev) => ({
      ...prev,
      disBildirimGecmisi: prev.disBildirimGecmisi.map((k) => (k.id === kayit.id ? { ...k, denemeSayisi: (k.denemeSayisi || 0) + 1, durum: "Beklemede" } : k)),
    }));
    R.bildirimGoster("Tekrar deneme kuyruğa alındı (backend bağlanınca gerçek gönderim yapılacak).", "bilgi");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="p-3 rounded-md text-sm" style={{ background: "#FDF1D6", color: "#8A6110" }}>
        ⚠️ Bu sistem gerçek e-posta/SMS/WhatsApp göndermez (sunucusuz uygulamada teknik olarak mümkün değil) —
        ileride gerçek bir gönderim servisine bağlanmaya hazır şablon/tercih/geçmiş/izin altyapısıdır.
      </div>

      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "sablonlar", ad: "Bildirim Şablonları" },
          { id: "gecmis", ad: "Gönderim Geçmişi" },
          { id: "tercihler", ad: "Kullanıcı Tercihleri" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setAltSekme(s.id)}
            className="flex-1 py-2.5 text-sm font-semibold whitespace-nowrap px-2"
            style={{ background: altSekme === s.id ? R.T.graphite900 : "#fff", color: altSekme === s.id ? "#fff" : R.T.ink500 }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {altSekme === "sablonlar" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <R.Buton onClick={() => setFormAcik(true)}>
              <R.Plus size={15} /> Şablon Ekle
            </R.Buton>
          </div>
          {formAcik && (
            <R.Kart className="p-4 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <R.Secim
                  label="Kategori"
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value, olayTuru: R.BILDIRIM_OLAY_TURLERI.find((k) => k.kategori === e.target.value)?.olaylar[0] || "" })}
                >
                  {R.BILDIRIM_OLAY_TURLERI.map((k) => (
                    <option key={k.kategori}>{k.kategori}</option>
                  ))}
                </R.Secim>
                <R.Secim label="Olay" value={form.olayTuru} onChange={(e) => setForm({ ...form, olayTuru: e.target.value })}>
                  {(R.BILDIRIM_OLAY_TURLERI.find((k) => k.kategori === form.kategori)?.olaylar || []).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </R.Secim>
                <R.Secim label="Kanal" value={form.kanal} onChange={(e) => setForm({ ...form, kanal: e.target.value })}>
                  {R.BILDIRIM_KANALLARI.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </R.Secim>
                <R.Secim label="Tür" value={form.tur} onChange={(e) => setForm({ ...form, tur: e.target.value })}>
                  <option value="operasyonel">Operasyonel (izinsiz gönderilir)</option>
                  <option value="pazarlama">Pazarlama (sadece izinli müşteriye)</option>
                </R.Secim>
              </div>
              <R.Girdi label="Başlık" value={form.baslik} onChange={(e) => setForm({ ...form, baslik: e.target.value })} placeholder="ör. Kritik Stok Uyarısı" />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: R.T.ink500 }}>
                  Gövde — değişken için {"{değişken_adı}"} kullanın
                </span>
                <textarea
                  value={form.govde}
                  onChange={(e) => setForm({ ...form, govde: e.target.value })}
                  rows={4}
                  placeholder={"{ürün_adi}\nMevcut stok: {stok}\nMinimum stok: {minimum_stok}\nÖnerilen sipariş: {sipariş_miktarı}"}
                  className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900, ...R.MONO }}
                />
              </label>
              {form.govde.trim() && (
                <div className="text-xs px-2.5 py-2 rounded-md whitespace-pre-wrap" style={{ background: R.T.steel100, color: R.T.ink500 }}>
                  <strong style={{ color: R.T.ink900 }}>Önizleme (örnek verilerle):</strong>
                  {"\n"}
                  {R.sablonDoldur(form.govde, ORNEK_DEGERLER)}
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <R.Buton onClick={sablonKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setFormAcik(false)}>
                  Vazgeç
                </R.Buton>
              </div>
            </R.Kart>
          )}

          {db.bildirimSablonlari.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Bell} baslik="Henüz şablon yok" aciklama="Kritik stok, büyük satış, vadesi gelen alacak gibi olaylar için bildirim şablonu oluşturun." />
            </R.Kart>
          ) : (
            db.bildirimSablonlari.map((s) => (
              <R.Kart key={s.id} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                        {s.olayTuru}
                      </span>
                      <R.Rozet tone="steel">{s.kanal}</R.Rozet>
                      <R.Rozet tone={s.tur === "pazarlama" ? "yellow" : "green"}>{s.tur === "pazarlama" ? "📢 Pazarlama" : "⚙️ Operasyonel"}</R.Rozet>
                      {!s.aktif && <R.Rozet tone="steel">Pasif</R.Rozet>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
                      {s.kategori} · {s.baslik}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setOnizlemeId(onizlemeId === s.id ? null : s.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      Önizle
                    </button>
                    <button onClick={() => testGonder(s)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                      Test Gönder
                    </button>
                    <button onClick={() => sablonAktifPasif(s)} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: s.aktif ? "#F9DEDE" : "#DEF0DF", color: s.aktif ? R.T.red : R.T.green }}>
                      {s.aktif ? "Pasif Yap" : "Aktif Yap"}
                    </button>
                    <button onClick={() => sablonSil(s)} style={{ color: R.T.red }}>
                      <R.Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {onizlemeId === s.id && (
                  <div className="text-xs px-2.5 py-2 rounded-md whitespace-pre-wrap mt-2" style={{ background: R.T.steel100, color: R.T.ink900 }}>
                    {R.sablonDoldur(s.govde, ORNEK_DEGERLER)}
                  </div>
                )}
              </R.Kart>
            ))
          )}
        </div>
      )}

      {altSekme === "gecmis" && (
        <R.Kart className="overflow-hidden">
          {db.disBildirimGecmisi.length === 0 ? (
            <R.Bos ikon={R.FileText} baslik="Gönderim geçmişi yok" aciklama="Şablon test edildiğinde ya da ileride gerçek gönderim yapıldığında burada kayıt tutulur." />
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Alıcı</th>
                    <th className="text-left font-semibold px-3 py-2">Kanal</th>
                    <th className="text-left font-semibold px-3 py-2">Tarih</th>
                    <th className="text-left font-semibold px-3 py-2">Mesaj Türü</th>
                    <th className="text-left font-semibold px-3 py-2">Durum</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {db.disBildirimGecmisi.map((k) => (
                    <tr key={k.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                        {k.aliciAdi}
                      </td>
                      <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                        {k.kanal}
                      </td>
                      <td className="px-3 py-2" style={{ color: R.T.ink500 }}>
                        {new Date(k.tarih).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                        {k.mesajTuru}
                      </td>
                      <td className="px-3 py-2">
                        {k.durum === "Gönderildi" ? <R.Rozet tone="green">✅ Gönderildi</R.Rozet> : k.durum === "Gönderilemedi" ? <R.Rozet tone="red">🔴 Gönderilemedi</R.Rozet> : <R.Rozet tone="yellow">🟡 Beklemede</R.Rozet>}
                      </td>
                      <td className="px-3 py-2">
                        {k.durum === "Gönderilemedi" && (
                          <button onClick={() => tekrarDene(k)} className="text-xs font-semibold underline" style={{ color: R.T.orangeDark }}>
                            Tekrar Dene
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "tercihler" && (
        <R.Kart className="overflow-hidden">
          {db.kullanicilar.length === 0 ? (
            <R.Bos ikon={R.Users} baslik="Kullanıcı yok" aciklama="" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                    <th className="text-left font-semibold px-3 py-2">Kullanıcı</th>
                    {["E-posta", "SMS", "WhatsApp", "Push"].map((k) => (
                      <th key={k} className="text-center font-semibold px-2 py-2">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {db.kullanicilar.map((k) => (
                    <tr key={k.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <td className="px-3 py-2" style={{ color: R.T.ink900 }}>
                        {k.adSoyad}
                      </td>
                      {[
                        { alan: "epostaAktif", ad: "E-posta" },
                        { alan: "smsAktif", ad: "SMS" },
                        { alan: "whatsappAktif", ad: "WhatsApp" },
                        { alan: "pushAktif", ad: "Push" },
                      ].map((kanal) => (
                        <td key={kanal.alan} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={!!k.disKanalTercihleri?.[kanal.alan]}
                            onChange={() =>
                              updateDb((prev) => ({
                                ...prev,
                                kullanicilar: prev.kullanicilar.map((x) => (x.id === k.id ? { ...x, disKanalTercihleri: { ...x.disKanalTercihleri, [kanal.alan]: !x.disKanalTercihleri?.[kanal.alan] } } : x)),
                              }))
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs px-3 py-2" style={{ color: R.T.ink500 }}>
            Hangi olay kategorilerinin bildirim üreteceği zaten Bildirim Merkezi'nden (🔔 simgesi) kullanıcı bazında
            açılıp kapatılabiliyor — buradaki tercih, açık olan bildirimlerin hangi dış kanaldan iletileceğini belirler.
          </p>
        </R.Kart>
      )}
    </div>
  );
}
