import React, { useState, useEffect, useRef } from "react";
import { Building2, Check, EyeOff, Package, Pencil, Percent, Plus, Trash2, X } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { bildirimGoster } from "../lib/bildirim";
import { yeniId, tl } from "../lib/format";
import { MARKA_GRUPLARI, markaOzetHesapla } from "../lib/marka";
import { Kart, Buton, Girdi, Secim, Bos, Rozet } from "../components/ui";

const bosMarkaForm = { ad: "", kod: "", logo: "", aciklama: "", mensei: "", grup: "", not: "", aktif: true };

export function MarkaSayfasi({ db, updateDb, markaHedefineGit }) {
  const [ara, setAra] = useState("");
  const [seciliMarkaId, setSeciliMarkaId] = useState(null);
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [form, setForm] = useState(bosMarkaForm);
  const [silinecek, setSilinecek] = useState(null);
  const [kuralTaban, setKuralTaban] = useState("maliyet");
  const [kuralOran, setKuralOran] = useState("30");
  const logoInputRef = useRef(null);

  const filtreliMarkalar = db.markalar.filter((m) => !ara.trim() || m.ad.toLowerCase().includes(ara.toLowerCase())).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const seciliMarka = seciliMarkaId ? db.markalar.find((m) => m.id === seciliMarkaId) : null;
  const seciliOzet = seciliMarka ? markaOzetHesapla(db, seciliMarka) : null;

  useEffect(() => {
    if (seciliMarka?.fiyatKurali) {
      setKuralTaban(seciliMarka.fiyatKurali.taban);
      setKuralOran(String(seciliMarka.fiyatKurali.oran));
    } else {
      setKuralTaban("maliyet");
      setKuralOran("30");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seciliMarkaId]);

  const formuAc = (m) => {
    if (m) {
      setForm({ ad: m.ad, kod: m.kod || "", logo: m.logo || "", aciklama: m.aciklama || "", mensei: m.mensei || "", grup: m.grup || "", not: m.not || "", aktif: m.aktif !== false });
      setDuzenlenenId(m.id);
    } else {
      setForm(bosMarkaForm);
      setDuzenlenenId("yeni");
    }
    setFormAcik(true);
  };

  const logoSec = (e) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (dosya.size > 1024 * 1024) {
      bildirimGoster("Logo 1MB'tan küçük olmalı.", "hata");
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => setForm((f) => ({ ...f, logo: ev.target.result }));
    okuyucu.readAsDataURL(dosya);
    e.target.value = "";
  };

  const kaydet = () => {
    if (!form.ad.trim()) {
      bildirimGoster("Marka adı zorunludur.", "hata");
      return;
    }
    const cakisan = db.markalar.find((m) => m.id !== duzenlenenId && m.ad.trim().toLowerCase() === form.ad.trim().toLowerCase());
    if (cakisan) {
      bildirimGoster("Bu isimde bir marka zaten kayıtlı.", "hata");
      return;
    }
    const kayit = { ad: form.ad.trim(), kod: form.kod.trim(), logo: form.logo, aciklama: form.aciklama.trim(), mensei: form.mensei.trim(), grup: form.grup, not: form.not.trim(), aktif: form.aktif };
    if (duzenlenenId === "yeni") {
      updateDb((prev) => ({ ...prev, markalar: [{ id: yeniId("mrk"), ...kayit, fiyatKurali: null }, ...prev.markalar] }));
      bildirimGoster("Marka oluşturuldu.", "basari");
    } else {
      const eski = db.markalar.find((m) => m.id === duzenlenenId);
      updateDb((prev) => ({
        ...prev,
        markalar: prev.markalar.map((m) => (m.id === duzenlenenId ? { ...m, ...kayit } : m)),
        // Marka adı değişirse, ona atanmış ürünlerin p.marka alanı da birlikte güncellenir.
        parcalar: eski.ad !== kayit.ad ? prev.parcalar.map((p) => (p.marka === eski.ad ? { ...p, marka: kayit.ad } : p)) : prev.parcalar,
      }));
      bildirimGoster("Marka güncellendi.", "basari");
    }
    setFormAcik(false);
  };

  const pasifYap = (marka) => {
    updateDb((prev) => ({ ...prev, markalar: prev.markalar.map((m) => (m.id === marka.id ? { ...m, aktif: false } : m)) }));
    bildirimGoster("Marka pasif yapıldı.", "basari");
  };

  const markaSil = (marka) => {
    const ozet = markaOzetHesapla(db, marka);
    if (ozet.toplamUrun > 0) {
      bildirimGoster("Bu markada ürün var — önce ürünleri başka markaya taşıyın ya da markayı Pasif yapın.", "hata");
      setSilinecek(null);
      return;
    }
    updateDb((prev) => ({ ...prev, markalar: prev.markalar.filter((m) => m.id !== marka.id) }));
    setSilinecek(null);
    setSeciliMarkaId(null);
    bildirimGoster("Marka silindi.", "basari");
  };

  const kuraliKaydet = () => {
    const oran = parseFloat(kuralOran);
    if (isNaN(oran)) {
      bildirimGoster("Geçerli bir oran girin.", "hata");
      return;
    }
    updateDb((prev) => ({ ...prev, markalar: prev.markalar.map((m) => (m.id === seciliMarka.id ? { ...m, fiyatKurali: { taban: kuralTaban, oran } } : m)) }));
    bildirimGoster("Marka fiyat kuralı kaydedildi.", "basari");
  };

  const tabanEtiketi = { maliyet: "Ortalama Maliyet", sonAlisFiyati: "Son Alış Fiyatı", satisFiyati: "Mevcut Satış Fiyatı" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <input
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Marka ara…"
            className="flex-1 px-3 py-2 rounded-md border text-sm outline-none"
            style={{ borderColor: T.steel300 }}
          />
          <Buton onClick={() => formuAc(null)}>
            <Plus size={15} />
          </Buton>
        </div>
        <Kart className="overflow-hidden">
          {filtreliMarkalar.length === 0 ? (
            <Bos ikon={Building2} baslik="Marka yok" aciklama="Yeni marka ekleyin." />
          ) : (
            filtreliMarkalar.map((m) => {
              const ozet = markaOzetHesapla(db, m);
              return (
                <button
                  key={m.id}
                  onClick={() => setSeciliMarkaId(m.id)}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2"
                  style={{ borderTop: `1px solid ${T.steel200}`, background: seciliMarkaId === m.id ? "#FBE1D5" : "#fff", opacity: m.aktif === false ? 0.5 : 1 }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {m.logo ? (
                      <img src={m.logo} alt="" className="w-7 h-7 rounded object-contain shrink-0" style={{ background: T.steel100 }} />
                    ) : (
                      <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: T.steel100 }}>
                        <Building2 size={13} style={{ color: T.ink500 }} />
                      </div>
                    )}
                    <span className="text-sm truncate" style={{ color: T.ink900 }}>
                      {m.ad}
                    </span>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: T.ink500 }}>
                    {ozet.toplamUrun}
                  </span>
                </button>
              );
            })
          )}
        </Kart>
      </div>

      <div className="lg:col-span-2">
        {!seciliMarka ? (
          <Kart className="h-full flex items-center justify-center">
            <Bos ikon={Building2} baslik="Bir marka seçin" aciklama="Özet, fiyat kuralı ve ürünleri görmek için soldan bir marka seçin." />
          </Kart>
        ) : (
          <div className="flex flex-col gap-4">
            <Kart className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {seciliMarka.logo ? (
                    <img src={seciliMarka.logo} alt="" className="w-12 h-12 rounded object-contain" style={{ background: T.steel100 }} />
                  ) : (
                    <div className="w-12 h-12 rounded flex items-center justify-center" style={{ background: T.steel100 }}>
                      <Building2 size={20} style={{ color: T.ink500 }} />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-base" style={{ color: T.ink900 }}>
                      {seciliMarka.ad} {seciliMarka.aktif === false && <Rozet tone="steel">Pasif</Rozet>}
                    </div>
                    <div className="text-xs" style={{ color: T.ink500 }}>
                      {[seciliMarka.kod, seciliMarka.grup, seciliMarka.mensei].filter(Boolean).join(" · ") || "Ek bilgi girilmemiş"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => formuAc(seciliMarka)} style={{ color: T.ink500 }}>
                    <Pencil size={15} />
                  </button>
                  {seciliMarka.aktif !== false && (
                    <button onClick={() => pasifYap(seciliMarka)} title="Pasif Yap" style={{ color: T.ink500 }}>
                      <EyeOff size={15} />
                    </button>
                  )}
                  <button onClick={() => setSilinecek(seciliMarka)} title="Sil" style={{ color: T.red }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {seciliMarka.aciklama && (
                <p className="text-sm mb-3" style={{ color: T.ink500 }}>
                  {seciliMarka.aciklama}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { etiket: "Toplam Ürün", deger: seciliOzet.toplamUrun },
                  { etiket: "Toplam Stok", deger: seciliOzet.toplamStok },
                  { etiket: "Stok Maliyeti", deger: tl(seciliOzet.stokMaliyeti) },
                  { etiket: "Bu Ay Satış", deger: `${seciliOzet.aylikSatisAdedi} adet` },
                  { etiket: "Bu Ay Ciro", deger: tl(seciliOzet.aylikCiro) },
                  { etiket: "Bu Ay Kâr", deger: tl(seciliOzet.aylikKar), kar: true },
                ].map((k) => (
                  <div key={k.etiket} className="rounded-md p-2.5" style={{ background: T.steel100 }}>
                    <div className="text-xs" style={{ color: T.ink500 }}>
                      {k.etiket}
                    </div>
                    <div className="text-sm font-semibold mt-0.5" style={{ ...MONO, color: k.kar ? (seciliOzet.aylikKar >= 0 ? T.green : T.red) : T.ink900 }}>
                      {k.deger}
                    </div>
                  </div>
                ))}
              </div>
            </Kart>

            <Kart className="p-4">
              <h4 className="font-semibold text-sm mb-1" style={{ color: T.ink900 }}>
                Marka Bazlı Fiyatlandırma Kuralı
              </h4>
              <p className="text-xs mb-3" style={{ color: T.ink500 }}>
                ör. {seciliMarka.ad} ürünleri → {tabanEtiketi[kuralTaban]} + %{kuralOran}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <Secim label="Taban" value={kuralTaban} onChange={(e) => setKuralTaban(e.target.value)}>
                  <option value="maliyet">Ortalama Maliyet</option>
                  <option value="sonAlisFiyati">Son Alış Fiyatı</option>
                  <option value="satisFiyati">Mevcut Satış Fiyatı</option>
                </Secim>
                <Girdi label="Oran (%)" type="number" value={kuralOran} onChange={(e) => setKuralOran(e.target.value)} />
                <Buton variant="ghost" onClick={kuraliKaydet}>
                  <Check size={14} /> Kuralı Kaydet
                </Buton>
                <Buton onClick={() => markaHedefineGit(seciliMarka.ad, kuralTaban, kuralOran)}>
                  <Percent size={14} /> Şimdi Uygula
                </Buton>
              </div>
            </Kart>

            <Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
                Not
              </h4>
              <textarea
                value={seciliMarka.not}
                onChange={(e) => updateDb((prev) => ({ ...prev, markalar: prev.markalar.map((m) => (m.id === seciliMarka.id ? { ...m, not: e.target.value } : m)) }))}
                rows={2}
                placeholder="Bu marka hakkında serbest not…"
                className="w-full px-3 py-2 rounded-md border text-sm outline-none resize-none"
                style={{ borderColor: T.steel300, color: T.ink900 }}
              />
            </Kart>

            <Kart className="overflow-hidden">
              <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${T.steel200}`, background: T.steel100 }}>
                <span className="text-xs font-semibold uppercase" style={{ color: T.ink500 }}>
                  Bu Markadaki Ürünler
                </span>
              </div>
              {seciliOzet.urunler.length === 0 ? (
                <Bos ikon={Package} baslik="Ürün yok" aciklama="Bu markaya henüz ürün atanmadı." />
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {seciliOzet.urunler.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2 text-sm" style={{ borderTop: `1px solid ${T.steel200}` }}>
                      <span style={{ color: T.ink900 }}>{p.ad}</span>
                      <span style={MONO}>
                        {p.stok} {p.birim}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Kart>
          </div>
        )}
      </div>

      {/* Marka ekle/düzenle formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-md rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: T.ink900 }}>
                {duzenlenenId === "yeni" ? "Yeni Marka" : "Markayı Düzenle"}
              </h3>
              <button onClick={() => setFormAcik(false)} style={{ color: T.ink500 }}>
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded flex items-center justify-center shrink-0 overflow-hidden" style={{ background: T.steel100 }}>
                {form.logo ? <img src={form.logo} alt="" className="w-full h-full object-contain" /> : <Building2 size={20} style={{ color: T.ink500 }} />}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => logoInputRef.current?.click()} className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ border: `1px solid ${T.steel300}`, color: T.ink900 }}>
                  Logo Seç
                </button>
                {form.logo && (
                  <button onClick={() => setForm((f) => ({ ...f, logo: "" }))} className="text-xs" style={{ color: T.red }}>
                    Kaldır
                  </button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={logoSec} className="hidden" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Girdi label="Marka Adı *" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="ör. MANN-FILTER" />
              </div>
              <Girdi label="Marka Kodu (opsiyonel)" value={form.kod} onChange={(e) => setForm({ ...form, kod: e.target.value })} />
              <Girdi label="Menşei / Ülke" value={form.mensei} onChange={(e) => setForm({ ...form, mensei: e.target.value })} placeholder="ör. Almanya" />
              <Secim label="Marka Grubu" value={form.grup} onChange={(e) => setForm({ ...form, grup: e.target.value })}>
                <option value="">Seçin…</option>
                {MARKA_GRUPLARI.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Secim>
              <label className="flex items-center gap-2 text-sm mt-6">
                <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                <span style={{ color: T.ink900 }}>Aktif</span>
              </label>
              <div className="col-span-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium" style={{ color: T.ink500 }}>
                    Açıklama
                  </span>
                  <textarea
                    value={form.aciklama}
                    onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                    rows={2}
                    className="px-3 py-2 rounded-md border text-sm outline-none resize-none"
                    style={{ borderColor: T.steel300, color: T.ink900 }}
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-4 mt-4" style={{ borderTop: `1px solid ${T.steel200}` }}>
              <Buton onClick={kaydet}>
                <Check size={15} /> Kaydet
              </Buton>
              <Buton variant="ghost" onClick={() => setFormAcik(false)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {silinecek && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSilinecek(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
              "{silinecek.ad}" markası silinsin mi?
            </h3>
            <p className="text-sm mb-4" style={{ color: T.ink500 }}>
              İçinde ürün varsa silinemez — önce ürünleri taşıyın ya da markayı Pasif yapın.
            </p>
            <div className="flex gap-2">
              <Buton variant="danger" onClick={() => markaSil(silinecek)}>
                <Trash2 size={14} /> Sil
              </Buton>
              <Buton variant="ghost" onClick={() => setSilinecek(null)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
