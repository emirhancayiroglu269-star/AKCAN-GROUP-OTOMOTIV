/* Extracted from Finans.tsx — kept intentionally self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function HesapSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("hesaplar"); // hesaplar | gunluk | gider
  const [hesapFormAcik, setHesapFormAcik] = R.useState(false);
  const [hesapForm, setHesapForm] = R.useState(R.bosHesapForm);
  const [duzenlenenHesapId, setDuzenlenenHesapId] = R.useState(null);
  const [detayHesapId, setDetayHesapId] = R.useState(null);
  const [tersIslem, setTersIslem] = R.useState(null); // { hesapId, hareket }
  const [tersSebep, setTersSebep] = R.useState("");
  const [onaylayan, setOnaylayan] = R.useState(() => R.sonKullaniciAdi());
  const [finansKontrol, setFinansKontrol] = R.useState(null);

  const [giderForm, setGiderForm] = R.useState(R.bosGiderForm);
  const [giderIptal, setGiderIptal] = R.useState(null);
  const [giderIptalNedeni, setGiderIptalNedeni] = R.useState("");

  const [gunlukHesapId, setGunlukHesapId] = R.useState(null);
  const [acilisTutari, setAcilisTutari] = R.useState("");
  const [sayilanTutar, setSayilanTutar] = R.useState("");
  const [gunKapatOnayAcik, setGunKapatOnayAcik] = R.useState(false);

  // --- Hesap CRUD ----------------------------------------------------------
  const hesapFormuAc = (h) => {
    if (h) {
      setHesapForm({ ad: h.ad, tip: h.tip, aciklama: h.aciklama || "", iban: h.iban || "" });
      setDuzenlenenHesapId(h.id);
    } else {
      setHesapForm(R.bosHesapForm);
      setDuzenlenenHesapId("yeni");
    }
    setHesapFormAcik(true);
  };
  const hesapKaydet = () => {
    if (!hesapForm.ad.trim()) {
      R.bildirimGoster("Hesap adı zorunludur.", "hata");
      return;
    }
    if (duzenlenenHesapId === "yeni") {
      updateDb((prev) => ({
        ...prev,
        hesaplar: [...prev.hesaplar, { id: R.yeniId("h"), ad: hesapForm.ad.trim(), tip: hesapForm.tip, aciklama: hesapForm.aciklama.trim(), iban: hesapForm.iban.trim(), bakiye: 0, aktif: true, hareketler: [] }],
      }));
      R.bildirimGoster("Hesap oluşturuldu.", "basari");
    } else {
      updateDb((prev) => ({
        ...prev,
        hesaplar: prev.hesaplar.map((h) => (h.id === duzenlenenHesapId ? { ...h, ad: hesapForm.ad.trim(), tip: hesapForm.tip, aciklama: hesapForm.aciklama.trim(), iban: hesapForm.iban.trim() } : h)),
      }));
      R.bildirimGoster("Hesap güncellendi.", "basari");
    }
    setHesapFormAcik(false);
    setDuzenlenenHesapId(null);
    setHesapForm(R.bosHesapForm);
  };

  // --- Genel Ters İşlem (herhangi bir hesap hareketi için) -----------------
  // Kritik güvenlik: hiçbir hareket silinmez/değiştirilmez. Yanlış bir hareket
  // varsa eşit ve ters yönlü YENİ bir hareket oluşturulur; sebep + onaylayan +
  // tarih/saat kalıcı olarak saklanır.
  const tersIslemUygula = () => {
    if (!tersSebep.trim()) {
      R.bildirimGoster("Ters işlem sebebi zorunludur.", "hata");
      return;
    }
    const { hesapId, hareket } = tersIslem;
    updateDb((prev) =>
      R.hesapHareketiUygula(prev, {
        hesapId,
        tur: "Ters İşlem / İptal",
        giris: hareket.cikis > 0 ? hareket.cikis : 0,
        cikis: hareket.giris > 0 ? hareket.giris : 0,
        aciklama: `Ters işlem: "${hareket.aciklama}" (${tersSebep.trim()})`,
        kullanici: onaylayan.trim(),
        kaynakId: hareket.id,
      })
    );
    R.bildirimGoster("Ters işlem uygulandı.", "basari");
    setTersIslem(null);
    setTersSebep("");
  };

  // --- Gider girişi ----------------------------------------------------------
  const giderKaydet = () => {
    const tutar = parseFloat(giderForm.tutar);
    if (!tutar || tutar <= 0) {
      R.bildirimGoster("Geçerli bir tutar girin.", "hata");
      return;
    }
    if (!giderForm.hesapId) {
      R.bildirimGoster("Giderin çıkacağı hesabı seçin.", "hata");
      return;
    }
    if (R.gunKapaliMi(db, R.isoGun(new Date()))) {
      const onay = R.yoneticiOnayiAl(db, "Bugünün günü kapatılmış — yeni gider eklemek için yönetici onayı gerekiyor.");
      if (!onay) {
        R.bildirimGoster("Gider eklenmedi — gün kapalı.", "hata");
        return;
      }
    }
    const giderId = R.yeniId("gd");
    const gider = {
      id: giderId,
      tarih: R.zamanDamgasi(),
      kategori: giderForm.kategori,
      tutar,
      aciklama: giderForm.aciklama.trim(),
      belgeNo: giderForm.belgeNo.trim(),
      hesapId: giderForm.hesapId,
      kullanici: onaylayan.trim(),
      durum: "Tamamlandı",
    };
    updateDb((prev) => {
      const sonuc = R.hesapHareketiUygula(prev, {
        hesapId: giderForm.hesapId,
        tur: `Kasa Gideri — ${giderForm.kategori}`,
        cikis: tutar,
        aciklama: giderForm.aciklama.trim() || giderForm.kategori,
        belgeNo: giderForm.belgeNo.trim(),
        kullanici: onaylayan.trim(),
        kaynakId: giderId,
      });
      return { ...sonuc, giderler: [gider, ...sonuc.giderler] };
    });
    R.sonKullaniciAdiKaydet(onaylayan);
    R.bildirimGoster("Gider kaydedildi.", "basari");
    setGiderForm({ ...R.bosGiderForm, hesapId: giderForm.hesapId });
  };

  const giderIptalOnayla = () => {
    if (!giderIptalNedeni.trim()) {
      R.bildirimGoster("İptal nedeni zorunludur.", "hata");
      return;
    }
    const g = giderIptal;
    updateDb((prev) => {
      const sonuc = R.hesapHareketiUygula(prev, {
        hesapId: g.hesapId,
        tur: "Gider İptali",
        giris: g.tutar,
        aciklama: `İptal: ${g.aciklama || g.kategori} (${giderIptalNedeni.trim()})`,
        kullanici: onaylayan.trim(),
        kaynakId: g.id,
      });
      return {
        ...sonuc,
        giderler: sonuc.giderler.map((x) =>
          x.id === g.id ? { ...x, durum: "İptal Edildi", iptalNedeni: giderIptalNedeni.trim(), iptalEden: onaylayan.trim(), iptalTarihi: R.zamanDamgasi() } : x
        ),
      };
    });
    R.bildirimGoster("Gider iptal edildi.", "basari");
    setGiderIptal(null);
    setGiderIptalNedeni("");
  };

  // --- Günlük kasa açılış/kapanış -------------------------------------------
  const bugunIso = R.isoGun(new Date());
  const gunlukHesap = gunlukHesapId ? db.hesaplar.find((h) => h.id === gunlukHesapId) : null;
  const acikGun = gunlukHesap ? db.kasaGunleri.find((g) => g.hesapId === gunlukHesap.id && g.durum === "Açık") : null;
  const buGuneAitHareketler =
    gunlukHesap && acikGun ? gunlukHesap.hareketler.filter((h) => new Date(h.tarih) >= new Date(acikGun.acilisTarihi)) : [];
  const gunGirisToplam = buGuneAitHareketler.reduce((t, h) => t + h.giris, 0);
  const gunCikisToplam = buGuneAitHareketler.reduce((t, h) => t + h.cikis, 0);
  const beklenenKasa = acikGun ? Math.round((acikGun.acilisTutari + gunGirisToplam - gunCikisToplam) * 100) / 100 : 0;

  const kasaAc = () => {
    const tutar = parseFloat(acilisTutari) || 0;
    updateDb((prev) => ({
      ...prev,
      kasaGunleri: [
        { id: R.yeniId("kg"), hesapId: gunlukHesap.id, tarih: bugunIso, acilisTutari: tutar, acanKullanici: onaylayan.trim(), acilisTarihi: R.zamanDamgasi(), durum: "Açık" },
        ...prev.kasaGunleri,
      ],
    }));
    R.sonKullaniciAdiKaydet(onaylayan);
    R.bildirimGoster("Kasa açıldı.", "basari");
    setAcilisTutari("");
  };

  const kasaKapat = () => {
    const sayilan = parseFloat(sayilanTutar);
    if (isNaN(sayilan)) {
      R.bildirimGoster("Sayılan tutarı girin.", "hata");
      return;
    }
    updateDb((prev) => ({
      ...prev,
      kasaGunleri: prev.kasaGunleri.map((g) =>
        g.id === acikGun.id
          ? { ...g, durum: "Kapalı", sayilanTutar: sayilan, beklenenTutar: beklenenKasa, kapatanKullanici: onaylayan.trim(), kapanisTarihi: R.zamanDamgasi() }
          : g
      ),
    }));
    R.bildirimGoster("Kasa kapatıldı.", "basari");
    setSayilanTutar("");
    setGunKapatOnayAcik(false);
  };

  const gecmisGunler = gunlukHesap ? db.kasaGunleri.filter((g) => g.hesapId === gunlukHesap.id).slice(0, 10) : [];

  const detayHesap = detayHesapId ? db.hesaplar.find((h) => h.id === detayHesapId) : null;
  const toplamBakiye = db.hesaplar.reduce((t, h) => t + (h.bakiye || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <R.Kart className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <R.ShieldCheck size={17} style={{ color: "#15803D" }} />
              <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Merkezi Güvenlik ve Yetki</h3>
            </div>
            <p className="text-[11px] mt-1" style={{ color: R.T.ink500 }}>Personel yetkileri ve kritik işlem kayıtları merkezi sistemde korunuyor.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <R.Rozet tone="green">Oturum Aktif</R.Rozet>
            <R.Rozet tone="green">Rol Kontrolü Aktif</R.Rozet>
            <R.Rozet tone="green">İşlem Geçmişi Aktif</R.Rozet>
            <R.Rozet tone="green">Merkezi Kayıt Aktif</R.Rozet>
            <R.Buton
              variant="ghost"
              onClick={() => setFinansKontrol(R.finansTutarlilikOzeti(db))}
            >
              <R.ShieldCheck size={14} /> Finans Tutarlılık Kontrolü
            </R.Buton>
          </div>
        </div>
      </R.Kart>

      {finansKontrol && (
        <R.Kart className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Finans Veri Tutarlılığı</h3>
              <p className="text-[11px] mt-1" style={{ color: R.T.ink500 }}>Cari ve kasa/banka kayıtları, son hareket bakiyeleri ve finans işlem bağlantıları kontrol edildi.</p>
            </div>
            <R.Buton variant="ghost" onClick={() => setFinansKontrol(R.finansTutarlilikOzeti(db))}>Tekrar Kontrol Et</R.Buton>
          </div>
          {finansKontrol.uygun ? (
            <div className="rounded-md p-3 text-sm" style={{ background: "#DEF0DF", color: R.T.green }}>
              <R.Check size={15} className="inline mr-1" /> Finans kayıtlarında tutarsızlık bulunmadı.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="rounded-md p-3 text-sm" style={{ background: "#F9DEDE", color: R.T.red }}>
                <R.AlertTriangle size={15} className="inline mr-1" /> {finansKontrol.toplamBulgu} tutarsızlık bulundu. Otomatik düzeltme yapılmadı.
              </div>
              <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5">
                {finansKontrol.bulgular.slice(0, 20).map((b) => (
                  <div key={`${b.tip}-${b.id}`} className="text-xs rounded border p-2" style={{ borderColor: R.T.steel200, color: R.T.ink700 }}>
                    <strong>{b.ad}</strong> — {b.mesaj}
                    {b.tip !== "kasaIslemi" && <span className="ml-2" style={R.MONO}>Kayıtlı: {R.tl(b.kayitli)} / Beklenen: {R.tl(b.beklenen)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </R.Kart>
      )}
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "hesaplar", ad: "Hesaplar" },
          { id: "gunluk", ad: "Günlük Kasa" },
          { id: "gider", ad: "Gider Girişi" },
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

      {altSekme === "hesaplar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: R.T.ink900 }}>
                Toplam Bakiye: <span style={R.MONO}>{R.tl(toplamBakiye)}</span>
              </span>
              <R.Buton onClick={() => hesapFormuAc(null)}>
                <R.Plus size={14} /> Yeni Hesap
              </R.Buton>
            </div>
            {db.hesaplar.length === 0 ? (
              <R.Kart>
                <R.Bos ikon={R.Wallet} baslik="Hesap yok" aciklama="Nakit Kasa, POS veya banka hesabı ekleyin." />
              </R.Kart>
            ) : (
              db.hesaplar.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setDetayHesapId(h.id)}
                  className="text-left p-3.5 rounded-lg border transition-colors"
                  style={{ borderColor: detayHesapId === h.id ? R.T.orange : R.T.steel200, background: detayHesapId === h.id ? "#FBE1D5" : "#fff" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate" style={{ color: R.T.ink900 }}>
                      {h.ad}
                    </span>
                    <R.Rozet tone="steel">{h.tip}</R.Rozet>
                  </div>
                  <div className="text-sm font-semibold mt-1" style={R.MONO}>
                    {R.tl(h.bakiye || 0)}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-2">
            {!detayHesap ? (
              <R.Kart className="h-full flex items-center justify-center">
                <R.Bos ikon={R.Wallet} baslik="Bir hesap seçin" aciklama="Hareket geçmişini görmek için soldan bir hesap seçin." />
              </R.Kart>
            ) : (
              <R.Kart className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-base" style={{ color: R.T.ink900 }}>
                      {detayHesap.ad}
                    </div>
                    <div className="text-xs" style={{ color: R.T.ink500 }}>
                      {detayHesap.tip} · Bakiye: <strong style={R.MONO}>{R.tl(detayHesap.bakiye || 0)}</strong>
                    </div>
                    {detayHesap.iban && (
                      <div className="text-xs mt-0.5" style={R.MONO}>
                        IBAN:{" "}
                        {R.yetkiVarMi(db, aktifKullanici, "kasaCikisiYapabilir")
                          ? detayHesap.iban
                          : `${detayHesap.iban.slice(0, 6)}${"•".repeat(Math.max(0, detayHesap.iban.replace(/\s/g, "").length - 10))}${detayHesap.iban.slice(-4)}`}
                      </div>
                    )}
                  </div>
                  <button onClick={() => hesapFormuAc(detayHesap)} title="Düzenle" style={{ color: R.T.ink500 }}>
                    <R.Pencil size={15} />
                  </button>
                </div>
                {detayHesap.hareketler.length === 0 ? (
                  <p className="text-sm" style={{ color: R.T.ink500 }}>
                    Henüz hareket yok.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: R.T.steel100, color: R.T.ink500 }}>
                          <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">Tarih/Saat</th>
                          <th className="text-left font-semibold px-2 py-1.5">İşlem Türü</th>
                          <th className="text-left font-semibold px-2 py-1.5">Açıklama</th>
                          <th className="text-right font-semibold px-2 py-1.5">Giriş</th>
                          <th className="text-right font-semibold px-2 py-1.5">Çıkış</th>
                          <th className="text-right font-semibold px-2 py-1.5">Bakiye</th>
                          <th className="text-left font-semibold px-2 py-1.5">Kullanıcı</th>
                          <th className="px-2 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detayHesap.hareketler.map((h) => (
                          <tr key={h.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                            <td className="px-2 py-1.5 whitespace-nowrap" style={{ color: R.T.ink500 }}>
                              {new Date(h.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-2 py-1.5" style={{ color: R.T.ink900 }}>
                              {h.tur}
                            </td>
                            <td className="px-2 py-1.5" style={{ color: R.T.ink500 }}>
                              {h.aciklama}
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                              {h.giris > 0 ? `+${R.tl(h.giris)}` : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                              {h.cikis > 0 ? `−${R.tl(h.cikis)}` : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold" style={R.MONO}>
                              {R.tl(h.bakiyeSonrasi)}
                            </td>
                            <td className="px-2 py-1.5" style={{ color: R.T.ink500 }}>
                              {h.kullanici || "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <button onClick={() => setTersIslem({ hesapId: detayHesap.id, hareket: h })} title="Ters İşlem / İptal" style={{ color: R.T.red }}>
                                <R.RotateCcw size={13} />
                              </button>
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
        </div>
      )}

      {altSekme === "gunluk" && (
        <div className="flex flex-col gap-4">
          <R.Secim label="Hesap" value={gunlukHesapId || ""} onChange={(e) => setGunlukHesapId(e.target.value || null)}>
            <option value="">Hesap seçin…</option>
            {db.hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.ad}
              </option>
            ))}
          </R.Secim>

          {gunlukHesap && (
            <>
              {!acikGun ? (
                <R.Kart className="p-4 flex flex-col gap-3">
                  <p className="text-sm" style={{ color: R.T.ink500 }}>
                    {gunlukHesap.ad} için bugün henüz kasa açılmadı.
                  </p>
                  <R.Girdi label="Açılış Tutarı" type="number" value={acilisTutari} onChange={(e) => setAcilisTutari(e.target.value)} placeholder="0.00" />
                  <R.Girdi label="Açan Kullanıcı" value={onaylayan} onChange={(e) => setOnaylayan(e.target.value)} />
                  <R.Buton onClick={kasaAc}>
                    <R.Check size={15} /> Kasa Aç
                  </R.Buton>
                </R.Kart>
              ) : (
                <R.Kart className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: R.T.ink500 }}>Açılış</span>
                    <span style={R.MONO}>{R.tl(acikGun.acilisTutari)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: R.T.ink500 }}>Giriş (satış/tahsilat vb.)</span>
                    <span style={{ ...R.MONO, color: R.T.green }}>+{R.tl(gunGirisToplam)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: R.T.ink500 }}>Çıkış (gider/ödeme vb.)</span>
                    <span style={{ ...R.MONO, color: R.T.red }}>−{R.tl(gunCikisToplam)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                    <span className="font-semibold" style={{ color: R.T.ink900 }}>
                      Beklenen Kasa
                    </span>
                    <span className="text-lg font-semibold" style={R.MONO}>
                      {R.tl(beklenenKasa)}
                    </span>
                  </div>

                  {!gunKapatOnayAcik ? (
                    <R.Buton variant="dark" onClick={() => setGunKapatOnayAcik(true)} className="mt-2">
                      <R.RotateCcw size={15} /> Kasa Sayımı / Kapat
                    </R.Buton>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2 pt-3" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <R.Girdi label="Sayılan Tutar" type="number" value={sayilanTutar} onChange={(e) => setSayilanTutar(e.target.value)} placeholder="0.00" autoFocus />
                      {sayilanTutar !== "" && (
                        <p
                          className="text-sm font-semibold px-2.5 py-2 rounded-md"
                          style={{
                            background: Math.abs((parseFloat(sayilanTutar) || 0) - beklenenKasa) < 0.01 ? "#DEF0DF" : "#F9DEDE",
                            color: Math.abs((parseFloat(sayilanTutar) || 0) - beklenenKasa) < 0.01 ? R.T.green : R.T.red,
                          }}
                        >
                          {Math.abs((parseFloat(sayilanTutar) || 0) - beklenenKasa) < 0.01
                            ? "✅ Kasa tam."
                            : `🔴 Kasa farkı: ${R.tl((parseFloat(sayilanTutar) || 0) - beklenenKasa)}`}
                        </p>
                      )}
                      <R.Girdi label="Kapatan Kullanıcı" value={onaylayan} onChange={(e) => setOnaylayan(e.target.value)} />
                      <div className="flex gap-2">
                        <R.Buton onClick={kasaKapat}>
                          <R.Check size={14} /> Kapat
                        </R.Buton>
                        <R.Buton variant="ghost" onClick={() => setGunKapatOnayAcik(false)}>
                          Vazgeç
                        </R.Buton>
                      </div>
                    </div>
                  )}
                </R.Kart>
              )}

              {gecmisGunler.length > 0 && (
                <R.Kart className="p-4">
                  <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                    Geçmiş Günler
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {gecmisGunler.map((g) => {
                      const fark = g.durum === "Kapalı" ? Math.round(((g.sayilanTutar || 0) - (g.beklenenTutar || 0)) * 100) / 100 : null;
                      return (
                        <div key={g.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                          <span style={{ color: R.T.ink900 }}>
                            {R.tarihGoster(g.tarih)} <R.Rozet tone={g.durum === "Açık" ? "yellow" : "steel"}>{g.durum}</R.Rozet>
                          </span>
                          {g.durum === "Kapalı" && (
                            <span className="font-semibold" style={{ ...R.MONO, color: fark === 0 ? R.T.green : Math.abs(fark) < 0.01 ? R.T.green : R.T.red }}>
                              {Math.abs(fark) < 0.01 ? "Tam" : `Fark: ${R.tl(fark)}`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </R.Kart>
              )}
            </>
          )}
        </div>
      )}

      {altSekme === "gider" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <R.Kart className="p-4 flex flex-col gap-3">
              <R.Secim label="Kategori" value={giderForm.kategori} onChange={(e) => setGiderForm({ ...giderForm, kategori: e.target.value })}>
                {R.GIDER_KATEGORILERI.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </R.Secim>
              <R.Girdi label="Tutar" type="number" value={giderForm.tutar} onChange={(e) => setGiderForm({ ...giderForm, tutar: e.target.value })} placeholder="0.00" />
              <R.Secim label="Hesap (nereden çıkacak)" value={giderForm.hesapId} onChange={(e) => setGiderForm({ ...giderForm, hesapId: e.target.value })}>
                <option value="">Seçin…</option>
                {db.hesaplar.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.ad}
                  </option>
                ))}
              </R.Secim>
              <R.Girdi label="Belge No (opsiyonel)" value={giderForm.belgeNo} onChange={(e) => setGiderForm({ ...giderForm, belgeNo: e.target.value })} />
              <R.Girdi label="Açıklama" value={giderForm.aciklama} onChange={(e) => setGiderForm({ ...giderForm, aciklama: e.target.value })} placeholder="ör. Kargo ücreti" />
              <R.Girdi label="Kullanıcı" value={onaylayan} onChange={(e) => setOnaylayan(e.target.value)} />
              <R.Buton onClick={giderKaydet}>
                <R.Check size={15} /> Gideri Kaydet
              </R.Buton>
            </R.Kart>
          </div>
          <div className="lg:col-span-2">
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                Giderler
              </h4>
              {db.giderler.length === 0 ? (
                <R.Bos ikon={R.Wallet} baslik="Henüz gider yok" aciklama="Soldaki formdan ilk gideri kaydedin." />
              ) : (
                <div className="flex flex-col gap-1.5">
                  {db.giderler.slice(0, 20).map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm" style={{ background: R.T.steel100, opacity: g.durum === "İptal Edildi" ? 0.5 : 1 }}>
                      <div className="min-w-0">
                        <div style={{ color: R.T.ink900 }}>
                          {g.kategori} {g.durum === "İptal Edildi" && <R.Rozet tone="red">İptal</R.Rozet>}
                        </div>
                        <div className="text-xs" style={{ color: R.T.ink500 }}>
                          {R.tarihGoster(g.tarih)} · {g.aciklama || "—"} · {g.kullanici || "—"}
                          {g.iptalNedeni && ` · İptal nedeni: ${g.iptalNedeni}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold" style={{ ...R.MONO, color: R.T.red }}>
                          −{R.tl(g.tutar)}
                        </span>
                        {g.durum !== "İptal Edildi" && (
                          <button onClick={() => setGiderIptal(g)} title="İptal Et" style={{ color: R.T.red }}>
                            <R.RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </R.Kart>
          </div>
        </div>
      )}

      {/* Hesap ekle/düzenle formu */}
      {hesapFormAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setHesapFormAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {duzenlenenHesapId === "yeni" ? "Yeni Hesap" : "Hesabı Düzenle"}
              </h3>
              <button onClick={() => setHesapFormAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <R.Girdi label="Hesap Adı *" value={hesapForm.ad} onChange={(e) => setHesapForm({ ...hesapForm, ad: e.target.value })} placeholder="ör. Nakit Kasa" />
              <R.Secim label="Tip" value={hesapForm.tip} onChange={(e) => setHesapForm({ ...hesapForm, tip: e.target.value })}>
                {R.HESAP_TIPLERI.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </R.Secim>
              <R.Girdi label="Açıklama (opsiyonel)" value={hesapForm.aciklama} onChange={(e) => setHesapForm({ ...hesapForm, aciklama: e.target.value })} placeholder="ör. Ziraat Bankası Vadesiz" />
              {(hesapForm.tip === "Banka Hesabı" || hesapForm.tip === "Havale / EFT") && (
                <R.Girdi label="IBAN" value={hesapForm.iban} onChange={(e) => setHesapForm({ ...hesapForm, iban: e.target.value.toUpperCase() })} placeholder="TR00 0000 0000 0000 0000 0000 00" />
              )}
              <div className="flex gap-2">
                <R.Buton onClick={hesapKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setHesapFormAcik(false)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ters işlem modalı */}
      {tersIslem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setTersIslem(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Ters İşlem / İptal
            </h3>
            <p className="text-sm mb-3" style={{ color: R.T.ink500 }}>
              <strong>{tersIslem.hareket.aciklama}</strong> ({R.tl(tersIslem.hareket.giris || tersIslem.hareket.cikis)}) hareketi ters yönlü yeni bir kayıtla düzeltilecek. Orijinal
              hareket silinmez.
            </p>
            <label className="flex flex-col gap-1 text-sm mb-2">
              <span className="font-medium" style={{ color: R.T.ink500 }}>
                Sebep *
              </span>
              <textarea
                value={tersSebep}
                onChange={(e) => setTersSebep(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                placeholder="ör. Yanlış hesaba işlendi"
                autoFocus
              />
            </label>
            <R.Girdi label="Onaylayan Kullanıcı" value={onaylayan} onChange={(e) => setOnaylayan(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <R.Buton variant="danger" onClick={tersIslemUygula}>
                <R.RotateCcw size={14} /> Uygula
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setTersIslem(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}

      {/* Gider iptal modalı */}
      {giderIptal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setGiderIptal(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Gideri İptal Et
            </h3>
            <p className="text-sm mb-3" style={{ color: R.T.ink500 }}>
              <strong>{R.tl(giderIptal.tutar)}</strong> tutarındaki "{giderIptal.kategori}" gideri iptal edilecek, tutar hesaba geri eklenecek.
            </p>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium" style={{ color: R.T.ink500 }}>
                İptal Nedeni *
              </span>
              <textarea
                value={giderIptalNedeni}
                onChange={(e) => setGiderIptalNedeni(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <R.Buton variant="danger" onClick={giderIptalOnayla}>
                <R.RotateCcw size={14} /> İptal Et
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setGiderIptal(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
