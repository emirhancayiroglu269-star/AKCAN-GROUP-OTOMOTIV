/* Alış/Tedarikçi ekranı — ayrıştırılmış bileşen.
 * Finans ve veri sözleşmeleri değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";
import { TedarikciDetay } from "./TedarikciDetay";

export function TedarikciSayfasi({ db, updateDb, aktifKullanici, belgeyeGit, hedefTedarikciId }) {
  const [ara, setAra] = R.useState("");
  const [durumFiltre, setDurumFiltre] = R.useState("aktif");
  const [formAcik, setFormAcik] = R.useState(false);
  const [duzenlenenId, setDuzenlenenId] = R.useState(null);
  const [form, setForm] = R.useState(R.bosTedarikciForm);
  const [detayId, setDetayId] = R.useState(null);
  R.useEffect(() => {
    if (hedefTedarikciId) setDetayId(hedefTedarikciId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedefTedarikciId]);
  const [odemeModalAcik, setOdemeModalAcik] = R.useState(false);
  const [odemeTutari, setOdemeTutari] = R.useState("");
  const [odemeAciklama, setOdemeAciklama] = R.useState("");
  const [odemeHesapId, setOdemeHesapId] = R.useState("");
  const [silinecek, setSilinecek] = R.useState(null);

  const formuAc = (t) => {
    if (t) {
      setForm({
        ad: t.ad,
        yetkiliKisi: t.yetkiliKisi || "",
        telefon: t.telefon || "",
        eposta: t.eposta || "",
        vergiDairesi: t.vergiDairesi || "",
        vergiNo: t.vergiNo || "",
        adres: t.adres || "",
        odemeVadesiGun: t.odemeVadesiGun ?? "",
        iskontoOrani: t.iskontoOrani ?? "",
        odemeYontemi: t.odemeYontemi || "",
        borcLimiti: t.borcLimiti ?? "",
        minimumSiparisAdedi: t.minimumSiparisAdedi ?? "",
        notlar: t.notlar || "",
        aktif: t.aktif !== false,
      });
      setDuzenlenenId(t.id);
    } else {
      setForm(R.bosTedarikciForm);
      setDuzenlenenId("yeni");
    }
    setFormAcik(true);
  };
  const formuKapat = () => {
    setFormAcik(false);
    setDuzenlenenId(null);
    setForm(R.bosTedarikciForm);
  };

  const kaydet = () => {
    if (!form.ad.trim()) {
      R.bildirimGoster("Firma / tedarikçi adı zorunludur.", "hata");
      return;
    }
    const cakisan = db.tedarikciler.find(
      (t) => t.id !== duzenlenenId && t.ad.trim().toLowerCase() === form.ad.trim().toLowerCase()
    );
    if (cakisan) {
      R.bildirimGoster("Bu isimde bir tedarikçi zaten kayıtlı.", "hata");
      return;
    }
    const kayit = {
      ad: form.ad.trim(),
      yetkiliKisi: form.yetkiliKisi.trim(),
      telefon: form.telefon.trim(),
      eposta: form.eposta.trim(),
      vergiDairesi: form.vergiDairesi.trim(),
      vergiNo: form.vergiNo.trim(),
      adres: form.adres.trim(),
      odemeVadesiGun: parseFloat(form.odemeVadesiGun) || 0,
      iskontoOrani: parseFloat(form.iskontoOrani) || 0,
      odemeYontemi: form.odemeYontemi.trim(),
      borcLimiti: parseFloat(form.borcLimiti) || 0,
      minimumSiparisAdedi: parseFloat(form.minimumSiparisAdedi) || 0,
      notlar: form.notlar.trim(),
      aktif: form.aktif,
    };
    if (duzenlenenId === "yeni") {
      updateDb((prev) => ({
        ...prev,
        tedarikciler: [{ id: R.yeniId("t"), ...kayit, bakiye: 0, hareketler: [] }, ...prev.tedarikciler],
      }));
      R.bildirimGoster("Tedarikçi kartı oluşturuldu.", "basari");
    } else {
      updateDb((prev) => ({
        ...prev,
        tedarikciler: prev.tedarikciler.map((t) => (t.id === duzenlenenId ? { ...t, ...kayit } : t)),
      }));
      R.bildirimGoster("Tedarikçi kartı güncellendi.", "basari");
    }
    formuKapat();
  };

  const sil = (t) => {
    if (t.bakiye > 0.01) {
      R.bildirimGoster("Bu tedarikçinin açık borcu var, önce borcu kapatmadan silemezsiniz.", "hata");
      setSilinecek(null);
      return;
    }
    // Önemli veriler gerçekten silinmez: geçmiş alış faturası varsa, silme
    // yerine otomatik olarak Pasif'e alınır.
    const gecmisiVar = db.malAlimlari.some((m) => m.tedarikci.toLowerCase() === t.ad.toLowerCase());
    if (gecmisiVar) {
      updateDb((prev) => {
        const sonuc = R.islemKaydet(prev, {
          kullaniciAdi: aktifKullanici?.adSoyad || "",
          islemTuru: "Tedarikçi pasifleştirildi (silme yerine)",
          aciklama: `${t.ad} — geçmiş alış faturası olduğu için gerçekten silinmedi`,
          eskiDeger: "Aktif",
          yeniDeger: "Pasif",
        });
        return { ...sonuc, tedarikciler: sonuc.tedarikciler.map((x) => (x.id === t.id ? { ...x, aktif: false } : x)) };
      });
      setSilinecek(null);
      if (detayId === t.id) setDetayId(null);
      R.bildirimGoster("Bu tedarikçinin geçmiş faturası olduğu için silinmedi, bunun yerine Pasif yapıldı.", "basari");
      return;
    }
    updateDb((prev) =>
      R.islemKaydet(
        { ...prev, tedarikciler: prev.tedarikciler.filter((x) => x.id !== t.id) },
        { kullaniciAdi: aktifKullanici?.adSoyad || "", islemTuru: "Tedarikçi kartı silindi", aciklama: t.ad, eskiDeger: t.ad, yeniDeger: "Silindi" }
      )
    );
    setSilinecek(null);
    if (detayId === t.id) setDetayId(null);
    R.bildirimGoster("Tedarikçi kartı silindi.", "basari");
  };

  const borcOde = () => {
    const tutar = parseFloat(odemeTutari);
    if (!tutar || tutar <= 0) {
      R.bildirimGoster("Geçerli bir tutar girin.", "hata");
      return;
    }
    if (!odemeHesapId) {
      R.bildirimGoster("Ödemenin çıkacağı kasa / banka hesabını seçin.", "hata");
      return;
    }
    const t = db.tedarikciler.find((x) => x.id === detayId);
    if (!t) {
      R.bildirimGoster("Tedarikçi bulunamadı.", "hata");
      return;
    }
    const guncelCari = R.tedarikciCariBakiyesiHesapla(t);
    if (guncelCari <= 0.01) {
      R.bildirimGoster("Bu tedarikçinin ödenecek cari borcu bulunmuyor.", "hata");
      return;
    }
    if (tutar - guncelCari > 0.01) {
      R.bildirimGoster(`Ödeme tutarı güncel cari borçtan fazla olamaz. Borç: ${R.tl(guncelCari)}`, "hata");
      return;
    }
    const hesap = db.hesaplar.find((h) => h.id === odemeHesapId && h.aktif !== false);
    if (!hesap) {
      R.bildirimGoster("Seçilen kasa / banka hesabı bulunamadı.", "hata");
      return;
    }
    if ((hesap.bakiye || 0) + 0.01 < tutar) {
      R.bildirimGoster(`${hesap.ad} hesabında yeterli bakiye yok. Mevcut bakiye: ${R.tl(hesap.bakiye || 0)}`, "hata");
      return;
    }

    const yuvarlanmisTutar = Math.round(tutar * 100) / 100;
    const islemId = R.yeniId("ki");

    // Tedarikçi ödemesi artık Tahsilat/Ödeme ekranıyla aynı merkezi finans
    // transaction motorundan geçer. Böylece cari + kasa/banka + finans işlem
    // günlüğü aynı doğrulama/idempotency kurallarını kullanır.
    let sonuc: any = null;
    updateDb((prev) => {
      const finans = R.finansIslemiUygula(
        prev,
        {
          yon: "odeme",
          tarafId: t.id,
          tarafAdi: t.ad,
          tutar: yuvarlanmisTutar,
          hesapSatirlari: [
            {
              hesapId: odemeHesapId,
              yontem: hesap.tip === "Nakit Kasa" ? "Nakit" : "Hesap",
              tutar: yuvarlanmisTutar,
            },
          ],
          aciklama: odemeAciklama.trim() || "Genel ödeme",
          kullanici: aktifKullanici?.adSoyad || "",
        },
        islemId
      );
      if (!finans) return prev;
      sonuc = finans;
      return finans.db;
    });

    if (!sonuc) {
      R.bildirimGoster("Tedarikçi ödemesi kaydedilemedi. Finans doğrulamasını kontrol edin.", "hata");
      return;
    }

    R.bildirimGoster(`${hesap.ad} hesabından ödeme kaydedildi.`, "basari");
    setOdemeModalAcik(false);
    setOdemeTutari("");
    setOdemeAciklama("");
    setOdemeHesapId("");
  };

  const filtreli = db.tedarikciler
    .filter((t) => {
      if (durumFiltre === "aktif") return t.aktif !== false;
      if (durumFiltre === "pasif") return t.aktif === false;
      return true;
    })
    .filter((t) => !ara.trim() || t.ad.toLowerCase().includes(ara.toLowerCase()))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  const detay = detayId ? db.tedarikciler.find((t) => t.id === detayId) : null;
  const bugunIso = R.isoGun(new Date());

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <R.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: R.T.ink500 }} />
          <input
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Tedarikçi ara…"
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
            <R.Plus size={15} /> Yeni Tedarikçi
          </R.Buton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Liste */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          {filtreli.length === 0 ? (
            <R.Kart>
              <R.Bos ikon={R.Truck} baslik="Tedarikçi yok" aciklama="Yeni tedarikçi ekleyin ya da Mal Alış'tan otomatik oluşturulmasını bekleyin." />
            </R.Kart>
          ) : (
            filtreli.map((t) => {
              const vadesiGecenBorc = R.tedarikciAcikFaturalari(db, t.ad)
                .filter((m) => m.vadeTarihi && m.vadeTarihi < bugunIso)
                .reduce((s, m) => s + m.kalanBorc, 0);
              return (
                <button
                  key={t.id}
                  onClick={() => setDetayId(t.id)}
                  className="text-left p-3.5 rounded-lg border transition-colors"
                  style={{
                    borderColor: detayId === t.id ? R.T.orange : R.T.steel200,
                    background: detayId === t.id ? "#FBE1D5" : "#fff",
                    opacity: t.aktif === false ? 0.55 : 1,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate" style={{ color: R.T.ink900 }}>
                      {t.ad}
                    </span>
                    {t.aktif === false && <R.Rozet tone="steel">Pasif</R.Rozet>}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: R.T.ink500 }}>
                      {t.telefon || "—"}
                    </span>
                    <span className="text-sm font-semibold" style={{ ...R.MONO, color: t.bakiye > 0 ? R.T.red : R.T.green }}>
                      {R.tl(t.bakiye || 0)}
                    </span>
                  </div>
                  {vadesiGecenBorc > 0 && (
                    <div className="text-xs font-semibold mt-1" style={{ color: R.T.red }}>
                      🔴 {R.tl(vadesiGecenBorc)} vadesi geçmiş
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Detay */}
        <div className="lg:col-span-2">
          {!detay ? (
            <R.Kart className="h-full flex items-center justify-center">
              <R.Bos ikon={R.Building2} baslik="Bir tedarikçi seçin" aciklama="Detayları, hareket geçmişini ve açık faturaları görmek için soldan bir tedarikçi seçin." />
            </R.Kart>
          ) : (
            <TedarikciDetay
              db={db}
              updateDb={updateDb}
              aktifKullanici={aktifKullanici}
              tedarikci={detay}
              onDuzenle={() => formuAc(detay)}
              onSil={() => setSilinecek(detay)}
              onOdemeAc={() => { setOdemeHesapId(""); setOdemeModalAcik(true); }}
              belgeyeGit={belgeyeGit}
            />
          )}
        </div>
      </div>

      {/* Tedarikçi kartı formu */}
      {formAcik && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={formuKapat}
        >
          <div className="w-full max-w-xl rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                {duzenlenenId === "yeni" ? "Yeni Tedarikçi" : "Tedarikçi Kartını Düzenle"}
              </h3>
              <button onClick={formuKapat} style={{ color: R.T.ink500 }}>
                <R.X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <R.Girdi label="Firma / Tedarikçi Adı *" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="ör. Eryaz Otomotiv" />
              </div>
              <R.Girdi label="Yetkili Kişi" value={form.yetkiliKisi} onChange={(e) => setForm({ ...form, yetkiliKisi: e.target.value })} />
              <R.Girdi label="Telefon" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} placeholder="05xx xxx xx xx" />
              <R.Girdi label="E-posta" value={form.eposta} onChange={(e) => setForm({ ...form, eposta: e.target.value })} />
              <R.Girdi label="Vergi Dairesi" value={form.vergiDairesi} onChange={(e) => setForm({ ...form, vergiDairesi: e.target.value })} />
              <R.Girdi label="Vergi / T.C. No" value={form.vergiNo} onChange={(e) => setForm({ ...form, vergiNo: e.target.value })} />
              <R.Girdi label="Ödeme Vadesi (gün)" type="number" value={form.odemeVadesiGun} onChange={(e) => setForm({ ...form, odemeVadesiGun: e.target.value })} placeholder="ör. 30" />
              <R.Girdi label="İskonto Oranı (%)" type="number" value={form.iskontoOrani} onChange={(e) => setForm({ ...form, iskontoOrani: e.target.value })} />
              <R.Girdi label="Ödeme Yöntemi" value={form.odemeYontemi} onChange={(e) => setForm({ ...form, odemeYontemi: e.target.value })} placeholder="ör. Havale/EFT" />
              <R.Girdi label="Borç Limiti" type="number" value={form.borcLimiti} onChange={(e) => setForm({ ...form, borcLimiti: e.target.value })} placeholder="0.00" />
              <R.Girdi
                label="Minimum Sipariş Adedi"
                type="number"
                value={form.minimumSiparisAdedi}
                onChange={(e) => setForm({ ...form, minimumSiparisAdedi: e.target.value })}
                placeholder="0"
                hint="Sipariş önerisi bu adedin altına düşmeyecek şekilde yuvarlar."
              />
              <div className="col-span-2">
                <R.Girdi label="Adres" value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium" style={{ color: R.T.ink500 }}>
                    Notlar
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

      {/* Borç ödeme modalı */}
      {odemeModalAcik && detay && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setOdemeModalAcik(false)}
        >
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: R.T.ink900 }}>
                Ödeme Kaydet — {detay.ad}
              </h3>
              <button onClick={() => setOdemeModalAcik(false)} style={{ color: R.T.ink500 }}>
                <R.X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
              Güncel borç: <strong>{R.tl(R.tedarikciCariBakiyesiHesapla(detay))}</strong>
            </p>
            <div className="flex flex-col gap-3">
              <R.Girdi label="Ödenen Tutar" type="number" value={odemeTutari} onChange={(e) => setOdemeTutari(e.target.value)} placeholder="0.00" autoFocus />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium" style={{ color: R.T.ink500 }}>
                  Ödeme Çıkışı — Kasa / Banka *
                </span>
                <select
                  value={odemeHesapId}
                  onChange={(e) => setOdemeHesapId(e.target.value)}
                  className="px-3 py-2 rounded-md border text-sm outline-none bg-white"
                  style={{ borderColor: R.T.steel300, color: R.T.ink900 }}
                >
                  <option value="">Kasa / banka seçin…</option>
                  {db.hesaplar.filter((h) => h.aktif !== false).map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.ad} — {R.tl(h.bakiye || 0)}
                    </option>
                  ))}
                </select>
                {odemeHesapId && (
                  <span className="text-xs" style={{ color: R.T.ink500 }}>
                    Mevcut bakiye: <strong>{R.tl(db.hesaplar.find((h) => h.id === odemeHesapId)?.bakiye || 0)}</strong>
                  </span>
                )}
              </label>
              <R.Girdi label="Açıklama (opsiyonel)" value={odemeAciklama} onChange={(e) => setOdemeAciklama(e.target.value)} placeholder="ör. Banka havalesi" />
              <div className="flex gap-2">
                <R.Buton onClick={borcOde}>
                  <R.Check size={14} /> Kaydet
                </R.Buton>
                <R.Buton variant="ghost" onClick={() => setOdemeModalAcik(false)}>
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
              Bu tedarikçi kartı silinsin mi?
            </h3>
            <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
              <strong>{silinecek.ad}</strong> kalıcı olarak silinecek. Geçmiş alış faturaları kayıtlarda kalmaya devam eder.
            </p>
            <div className="flex gap-2">
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
    </div>
  );
}
