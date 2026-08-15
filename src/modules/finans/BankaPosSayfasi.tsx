/* Extracted from Finans.tsx — kept intentionally self-contained. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";

export function BankaPosSayfasi({ db, updateDb, aktifKullanici }) {
  const [altSekme, setAltSekme] = R.useState("pos"); // pos | mutabakat | transfer | ozet

  // --- POS Cihazları -----------------------------------------------------------
  const [posFormAcik, setPosFormAcik] = R.useState(false);
  const [posForm, setPosForm] = R.useState(R.bosPosForm);
  const [duzenlenenPosId, setDuzenlenenPosId] = R.useState(null);

  const posFormuAc = (p) => {
    if (p) {
      setPosForm({
        ad: p.ad,
        banka: p.banka || "",
        cihaz: p.cihaz || "",
        komisyonYuzde: String(p.komisyonYuzde ?? 0),
        komisyonSabit: String(p.komisyonSabit ?? 0),
        odemeVadesiGun: String(p.odemeVadesiGun ?? 1),
        hesapId: p.hesapId || "",
      });
      setDuzenlenenPosId(p.id);
    } else {
      setPosForm(R.bosPosForm);
      setDuzenlenenPosId("yeni");
    }
    setPosFormAcik(true);
  };

  const posKaydet = () => {
    if (!posForm.ad.trim()) {
      R.bildirimGoster("POS adı zorunludur.", "hata");
      return;
    }
    const kayit = {
      ad: posForm.ad.trim(),
      banka: posForm.banka.trim(),
      cihaz: posForm.cihaz.trim(),
      komisyonYuzde: parseFloat(posForm.komisyonYuzde) || 0,
      komisyonSabit: parseFloat(posForm.komisyonSabit) || 0,
      odemeVadesiGun: parseInt(posForm.odemeVadesiGun) || 0,
      hesapId: posForm.hesapId || null,
    };
    if (duzenlenenPosId === "yeni") {
      updateDb((prev) => ({ ...prev, posCihazlari: [{ id: R.yeniId("pos"), ...kayit, aktif: true }, ...prev.posCihazlari] }));
      R.bildirimGoster("POS cihazı eklendi.", "basari");
    } else {
      updateDb((prev) => ({ ...prev, posCihazlari: prev.posCihazlari.map((p) => (p.id === duzenlenenPosId ? { ...p, ...kayit } : p)) }));
      R.bildirimGoster("POS cihazı güncellendi.", "basari");
    }
    setPosFormAcik(false);
  };

  const posPasifYap = (p) => updateDb((prev) => ({ ...prev, posCihazlari: prev.posCihazlari.map((x) => (x.id === p.id ? { ...x, aktif: false } : x)) }));
  const posSil = (p) => {
    if (db.posTahsilatlari.some((t) => t.posId === p.id)) {
      R.bildirimGoster("Bu POS'a bağlı tahsilat kayıtları var — silmek yerine Pasif yapın.", "hata");
      return;
    }
    updateDb((prev) => ({ ...prev, posCihazlari: prev.posCihazlari.filter((x) => x.id !== p.id) }));
  };

  // --- POS Mutabakatı ------------------------------------------------------------
  const [esleştirHedef, setEslestirHedef] = R.useState(null);
  const [gercekTutarMetin, setGercekTutarMetin] = R.useState("");

  const eslestirmeAc = (t) => {
    setEslestirHedef(t);
    setGercekTutarMetin(String(t.netTutar));
  };
  const eslestirmeOnayla = () => {
    const gercek = parseFloat(gercekTutarMetin);
    if (isNaN(gercek) || gercek <= 0) {
      R.bildirimGoster("Geçerli ve sıfırdan büyük bir banka geçiş tutarı girin.", "hata");
      return;
    }

    let mutabakatHatasi = "";
    let sonucKaydedildi = false;
    let fark = 0;

    updateDb((prev) => {
      const sonuc = R.posMutabakatUygula(prev, {
        tahsilatId: esleştirHedef?.id,
        gercekTutar: gercek,
        kullanici: aktifKullanici?.adSoyad || "",
      });

      if (!sonuc) {
        mutabakatHatasi = "Bu POS tahsilatı daha önce eşleştirilmiş, iptal edilmiş veya banka hareketi zaten oluşturulmuş olabilir.";
        return prev;
      }

      sonucKaydedildi = true;
      fark = sonuc.fark;
      return sonuc.db;
    });

    if (!sonucKaydedildi) {
      R.bildirimGoster(mutabakatHatasi, "hata");
      return;
    }

    if (Math.abs(fark) >= 0.5) {
      R.bildirimGoster(
        `⚠️ POS tahsilatı ile banka geçişi arasında ${R.tl(Math.abs(fark))} fark var. Bankaya ${R.tl(gercek)} işlendi.`,
        "hata"
      );
    } else {
      R.bildirimGoster(`✅ Eşleşti. Bankaya ${R.tl(gercek)} işlendi.`, "basari");
    }

    setEslestirHedef(null);
    setGercekTutarMetin("");
  };

  const komisyonuGiderKaydet = (t) => {
    if (!t || t.durum === "Bekliyor" || t.durum === "İptal") {
      R.bildirimGoster("Komisyon yalnızca mutabık hale gelmiş aktif POS tahsilatına kaydedilebilir.", "hata");
      return;
    }
    if (t.komisyonGiderKaydedildi) {
      R.bildirimGoster("Bu POS komisyonu daha önce gider olarak kaydedildi.", "hata");
      return;
    }
    const pos = db.posCihazlari.find((p) => p.id === t.posId);
    const gider = {
      id: R.yeniId("gd"),
      tarih: R.isoGun(new Date()),
      kategori: "Banka/POS Komisyonu",
      aciklama: `${pos?.ad || "POS"} komisyonu`,
      tutar: t.komisyonTutari,
      kdvOrani: 0,
      kdvTutari: 0,
      kdvHaricTutar: t.komisyonTutari,
      odemeYontemi: "Otomatik Kesinti",
      hesapId: pos?.hesapId || null,
      belgeNo: "",
      tedarikciFirma: pos?.banka || "",
      belgeDosyasi: "",
      vadeTarihi: "",
      odemeDurumu: "Ödendi",
      odenenTutar: t.komisyonTutari,
      kullanici: aktifKullanici?.adSoyad || "",
      durum: "Tamamlandı",
      tekrarlayanId: null,
      posTahsilatId: t.id,
    };
    const kategoriVarMi = db.giderKategorileri.some((k) => k.ad === "Banka/POS Komisyonu");
    updateDb((prev) => ({
      ...prev,
      giderler: [gider, ...prev.giderler],
      giderKategorileri: kategoriVarMi ? prev.giderKategorileri : [...prev.giderKategorileri, { id: R.yeniId("gk"), ad: "Banka/POS Komisyonu" }],
      posTahsilatlari: prev.posTahsilatlari.map((x) => (x.id === t.id ? { ...x, komisyonGiderKaydedildi: true } : x)),
    }));
    R.bildirimGoster("Komisyon, Gider Yönetimi'ne kaydedildi — net kâr hesabına dahil olacak.", "basari");
  };

  const bekleyenTahsilatlar = db.posTahsilatlari.filter((t) => t.durum === "Bekliyor").sort((a, b) => new Date(a.beklenenTarih) - new Date(b.beklenenTarih));
  const gecmisTahsilatlar = db.posTahsilatlari.filter((t) => t.durum !== "Bekliyor").sort((a, b) => new Date(b.tarih) - new Date(a.tarih)).slice(0, 30);
  const toplamPosBekleyen = bekleyenTahsilatlar.reduce((t, x) => t + x.netTutar, 0);

  // --- Para Transferi --------------------------------------------------------
  const [transferKaynakId, setTransferKaynakId] = R.useState("");
  const [transferHedefId, setTransferHedefId] = R.useState("");
  const [transferTutar, setTransferTutar] = R.useState("");
  const [transferAciklama, setTransferAciklama] = R.useState("");

  const transferYap = () => {
    const tutar = parseFloat(transferTutar);
    if (!transferKaynakId || !transferHedefId) {
      R.bildirimGoster("Kaynak ve hedef hesabı seçin.", "hata");
      return;
    }
    if (transferKaynakId === transferHedefId) {
      R.bildirimGoster("Kaynak ve hedef hesap aynı olamaz.", "hata");
      return;
    }
    if (!tutar || tutar <= 0) {
      R.bildirimGoster("Geçerli bir tutar girin.", "hata");
      return;
    }
    updateDb((prev) => {
      const sonuc = R.hesapTransferiUygula(prev, {
        kaynakHesapId: transferKaynakId,
        hedefHesapId: transferHedefId,
        tutar,
        aciklama: transferAciklama.trim() || "Hesaplar arası transfer",
        kullanici: aktifKullanici?.adSoyad || "",
      });
      if (!sonuc) {
        R.bildirimGoster("Kaynak hesapta yeterli bakiye yok.", "hata");
        return prev;
      }
      return R.islemKaydet(sonuc, {
        kullaniciAdi: aktifKullanici?.adSoyad || "",
        islemTuru: "Hesaplar arası transfer",
        aciklama: `${db.hesaplar.find((h) => h.id === transferKaynakId)?.ad} → ${db.hesaplar.find((h) => h.id === transferHedefId)?.ad}`,
        eskiDeger: "—",
        yeniDeger: R.tl(tutar),
      });
    });
    R.bildirimGoster("Transfer tamamlandı.", "basari");
    setTransferTutar("");
    setTransferAciklama("");
  };

  // --- Günlük finans özeti -----------------------------------------------------
  const nakitToplami = db.hesaplar.filter((h) => h.tip === "Nakit Kasa").reduce((t, h) => t + (h.bakiye || 0), 0);
  const bankaToplami = db.hesaplar.filter((h) => h.tip === "Banka Hesabı" || h.tip === "Havale / EFT").reduce((t, h) => t + (h.bakiye || 0), 0);
  const digerToplam = db.hesaplar.filter((h) => !["Nakit Kasa", "Banka Hesabı", "Havale / EFT"].includes(h.tip)).reduce((t, h) => t + (h.bakiye || 0), 0);
  const toplamKullanilabilir = nakitToplami + bankaToplami + digerToplam + toplamPosBekleyen;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "ozet", ad: "Günlük Finans Özeti" },
          { id: "pos", ad: "POS Cihazları" },
          { id: "mutabakat", ad: "POS Mutabakatı" },
          { id: "transfer", ad: "Para Transferi" },
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

      {altSekme === "ozet" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { etiket: "Nakit", deger: nakitToplami },
              { etiket: "POS Bekleyen", deger: toplamPosBekleyen, ton: "yellow" },
              { etiket: "Banka", deger: bankaToplami },
              { etiket: "Diğer", deger: digerToplam },
            ].map((k) => (
              <R.Kart key={k.etiket} className="p-4">
                <div className="text-xs" style={{ color: R.T.ink500 }}>
                  {k.etiket}
                </div>
                <div className="text-lg font-semibold mt-0.5" style={{ ...R.MONO, color: k.ton === "yellow" ? "#8A6110" : R.T.ink900 }}>
                  {R.tl(k.deger)}
                </div>
              </R.Kart>
            ))}
          </div>
          <R.Kart className="p-4">
            <div className="text-xs" style={{ color: R.T.ink500 }}>
              Toplam Kullanılabilir Para (POS bekleyen dahil)
            </div>
            <div className="text-2xl font-semibold mt-0.5" style={{ ...R.DISPLAY, color: R.T.ink900 }}>
              {R.tl(toplamKullanilabilir)}
            </div>
          </R.Kart>
        </div>
      )}

      {altSekme === "pos" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <R.Buton onClick={() => posFormuAc(null)}>
              <R.Plus size={15} /> Yeni POS
            </R.Buton>
          </div>
          {db.posCihazlari.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.CreditCard} baslik="POS cihazı yok" aciklama="ör. Garanti POS → %2,5 komisyon → 1 gün sonra hesaba geçer" />
            </R.Kart>
          ) : (
            db.posCihazlari.map((p) => (
              <R.Kart key={p.id} className="p-4 flex items-center justify-between flex-wrap gap-2" style={{ opacity: p.aktif === false ? 0.5 : 1 }}>
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2" style={{ color: R.T.ink900 }}>
                    {p.ad} {p.aktif === false && <R.Rozet tone="steel">Pasif</R.Rozet>}
                  </div>
                  <div className="text-xs" style={{ color: R.T.ink500 }}>
                    {[p.banka, p.cihaz].filter(Boolean).join(" · ")} · Komisyon: %{p.komisyonYuzde}
                    {p.komisyonSabit > 0 && ` + ${R.tl(p.komisyonSabit)}`} · Vade: {p.odemeVadesiGun} gün ·{" "}
                    {db.hesaplar.find((h) => h.id === p.hesapId)?.ad || "Hesap bağlı değil"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => posFormuAc(p)} style={{ color: R.T.ink500 }}>
                    <R.Pencil size={14} />
                  </button>
                  {p.aktif !== false && (
                    <button onClick={() => posPasifYap(p)} className="text-xs font-semibold" style={{ color: R.T.ink500 }}>
                      Pasif Yap
                    </button>
                  )}
                  <button onClick={() => posSil(p)} style={{ color: R.T.red }}>
                    <R.Trash2 size={14} />
                  </button>
                </div>
              </R.Kart>
            ))
          )}
        </div>
      )}

      {altSekme === "mutabakat" && (
        <div className="flex flex-col gap-4">
          <R.Kart className="overflow-hidden">
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Bekleyen POS Tahsilatları
              </span>
            </div>
            {bekleyenTahsilatlar.length === 0 ? (
              <R.Bos ikon={R.CreditCard} baslik="Bekleyen tahsilat yok" aciklama="Kartlı satışlarda POS seçildiğinde burada listelenir." />
            ) : (
              bekleyenTahsilatlar.map((t) => {
                const pos = db.posCihazlari.find((p) => p.id === t.posId);
                return (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                    <div>
                      <div style={{ color: R.T.ink900 }}>
                        {pos?.ad || "—"} · Satış: {R.tl(t.satisTutari)}
                      </div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        Komisyon: {R.tl(t.komisyonTutari)} · Beklenen: <strong>{R.tl(t.netTutar)}</strong> · Beklenen tarih: {R.tarihGoster(t.beklenenTarih)}
                      </div>
                    </div>
                    <R.Buton onClick={() => eslestirmeAc(t)}>Eşleştir</R.Buton>
                  </div>
                );
              })
            )}
          </R.Kart>

          <R.Kart className="overflow-hidden">
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
              <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                Geçmiş Mutabakatlar
              </span>
            </div>
            {gecmisTahsilatlar.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: R.T.ink500 }}>
                Henüz eşleştirme yapılmadı.
              </p>
            ) : (
              gecmisTahsilatlar.map((t) => {
                const pos = db.posCihazlari.find((p) => p.id === t.posId);
                return (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                    <div>
                      <div style={{ color: R.T.ink900 }}>
                        {pos?.ad || "—"} · Beklenen: {R.tl(t.netTutar)} · Gerçek: {R.tl(t.gercekTutar)}
                      </div>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        {t.eslesmeTarihi ? R.tarihGoster(t.eslesmeTarihi) : "—"}
                        {!t.komisyonGiderKaydedildi && t.durum !== "İptal" && (
                          <button onClick={() => komisyonuGiderKaydet(t)} className="ml-2 font-semibold underline" style={{ color: R.T.orangeDark }}>
                            Komisyonu Gidere Ekle
                          </button>
                        )}
                      </div>
                    </div>
                    {t.durum === "Eşleşti" ? <R.Rozet tone="green">✅ Eşleşti</R.Rozet> : <R.Rozet tone="red">⚠️ Fark Var</R.Rozet>}
                  </div>
                );
              })
            )}
          </R.Kart>
        </div>
      )}

      {altSekme === "transfer" && (
        <R.Kart className="p-4 max-w-md flex flex-col gap-3">
          <p className="text-xs" style={{ color: R.T.ink500 }}>
            Kendi hesaplarınız arasında para transferi — gelir veya gider olarak sayılmaz, sadece para yer değiştirir.
          </p>
          <R.Secim label="Kaynak Hesap" value={transferKaynakId} onChange={(e) => setTransferKaynakId(e.target.value)}>
            <option value="">Seçin…</option>
            {db.hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.ad} ({R.tl(h.bakiye || 0)})
              </option>
            ))}
          </R.Secim>
          <R.Secim label="Hedef Hesap" value={transferHedefId} onChange={(e) => setTransferHedefId(e.target.value)}>
            <option value="">Seçin…</option>
            {db.hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.ad}
              </option>
            ))}
          </R.Secim>
          <R.Girdi label="Tutar" type="number" value={transferTutar} onChange={(e) => setTransferTutar(e.target.value)} />
          <R.Girdi label="Açıklama (opsiyonel)" value={transferAciklama} onChange={(e) => setTransferAciklama(e.target.value)} placeholder="ör. Kasadan bankaya" />
          <R.Buton onClick={transferYap}>
            <R.ArrowUpDown size={14} /> Transfer Yap
          </R.Buton>
        </R.Kart>
      )}

      {/* POS ekle/düzenle formu */}
      {posFormAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setPosFormAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: R.T.ink900 }}>
              {duzenlenenPosId === "yeni" ? "Yeni POS" : "POS Düzenle"}
            </h3>
            <div className="flex flex-col gap-3">
              <R.Girdi label="POS Adı *" value={posForm.ad} onChange={(e) => setPosForm({ ...posForm, ad: e.target.value })} placeholder="ör. Garanti POS" />
              <R.Girdi label="Banka" value={posForm.banka} onChange={(e) => setPosForm({ ...posForm, banka: e.target.value })} />
              <R.Girdi label="POS Cihazı" value={posForm.cihaz} onChange={(e) => setPosForm({ ...posForm, cihaz: e.target.value })} placeholder="ör. Ingenico Move/5000" />
              <div className="grid grid-cols-2 gap-3">
                <R.Girdi label="Komisyon (%)" type="number" value={posForm.komisyonYuzde} onChange={(e) => setPosForm({ ...posForm, komisyonYuzde: e.target.value })} />
                <R.Girdi label="Sabit Komisyon (₺)" type="number" value={posForm.komisyonSabit} onChange={(e) => setPosForm({ ...posForm, komisyonSabit: e.target.value })} />
              </div>
              <R.Girdi label="Ödeme Vadesi (gün)" type="number" value={posForm.odemeVadesiGun} onChange={(e) => setPosForm({ ...posForm, odemeVadesiGun: e.target.value })} />
              <R.Secim label="Bağlı Banka Hesabı" value={posForm.hesapId} onChange={(e) => setPosForm({ ...posForm, hesapId: e.target.value })}>
                <option value="">Seçin…</option>
                {db.hesaplar.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.ad}
                  </option>
                ))}
              </R.Secim>
              <div className="flex gap-2">
                <R.Buton onClick={posKaydet}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setPosFormAcik(false)}>
                  Vazgeç
                </R.Buton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Eşleştirme modalı */}
      {esleştirHedef && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setEslestirHedef(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Banka Hareketiyle Eşleştir
            </h3>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Beklenen: {R.tl(esleştirHedef.netTutar)}
            </p>
            <R.Girdi label="Banka Ekstresindeki Gerçek Tutar" type="number" value={gercekTutarMetin} onChange={(e) => setGercekTutarMetin(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <R.Buton onClick={eslestirmeOnayla}>
                <R.Check size={14} /> Karşılaştır ve Kaydet
              </R.Buton>
              <R.Buton variant="ghost" onClick={() => setEslestirHedef(null)}>
                Vazgeç
              </R.Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
