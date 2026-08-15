import React, { useState } from "react";
import { ArrowUpDown, BarChart3, Check, ChevronRight, ClipboardList, EyeOff, Package, Pencil, Percent, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { T, MONO } from "../lib/theme";
import { bildirimGoster } from "../lib/bildirim";
import { yeniId, tl } from "../lib/format";
import { anaKategoriler, altKategoriler, kategoriUrunleriBul, kategoriOzetHesapla } from "../lib/kategori";
import { Kart, Buton, Girdi, Secim, Bos } from "../components/ui";

export function KategoriSayfasi({ db, updateDb, setSekme, kategoriHedefineGit }) {
  const [genisletilmis, setGenisletilmis] = useState({}); // { anaKategoriId: true }
  const [seciliKategoriId, setSeciliKategoriId] = useState(null);
  const [formAcik, setFormAcik] = useState(false);
  const [formTur, setFormTur] = useState("ana"); // "ana" | "alt"
  const [formAd, setFormAd] = useState("");
  const [formUstId, setFormUstId] = useState("");
  const [duzenlenenKategoriId, setDuzenlenenKategoriId] = useState(null);
  const [yeniAlanAdi, setYeniAlanAdi] = useState("");
  const [yeniAlanTipi, setYeniAlanTipi] = useState("metin");
  const [tasimaAcik, setTasimaAcik] = useState(false);
  const [tasimaSecili, setTasimaSecili] = useState({});
  const [tasimaHedefId, setTasimaHedefId] = useState("");
  const [silinecek, setSilinecek] = useState(null);

  const seciliKategori = seciliKategoriId ? db.kategoriler.find((k) => k.id === seciliKategoriId) : null;
  const seciliOzet = seciliKategori ? kategoriOzetHesapla(db, seciliKategori) : null;

  const formuAc = (tur, ustId, duzenlenen) => {
    setFormTur(tur);
    setFormUstId(ustId || "");
    if (duzenlenen) {
      setFormAd(duzenlenen.ad);
      setDuzenlenenKategoriId(duzenlenen.id);
    } else {
      setFormAd("");
      setDuzenlenenKategoriId(null);
    }
    setFormAcik(true);
  };

  const kategoriKaydet = () => {
    if (!formAd.trim()) {
      bildirimGoster("Kategori adı zorunludur.", "hata");
      return;
    }
    const cakisan = db.kategoriler.find(
      (k) => k.id !== duzenlenenKategoriId && k.ad.toLowerCase() === formAd.trim().toLowerCase() && (k.ustKategoriId || "") === (formUstId || "")
    );
    if (cakisan) {
      bildirimGoster("Bu isimde bir kategori zaten var.", "hata");
      return;
    }
    if (duzenlenenKategoriId) {
      // Kategori adı değişirse, ona atanmış ürünlerin p.kategori/p.anaKategori
      // alanları da (isim eşleşmesi bozulmasın diye) birlikte güncellenir.
      const eski = db.kategoriler.find((k) => k.id === duzenlenenKategoriId);
      updateDb((prev) => ({
        ...prev,
        kategoriler: prev.kategoriler.map((k) => (k.id === duzenlenenKategoriId ? { ...k, ad: formAd.trim() } : k)),
        parcalar: prev.parcalar.map((p) => {
          if (formTur === "ana" && p.anaKategori === eski.ad) {
            return { ...p, anaKategori: formAd.trim(), kategori: p.kategori === eski.ad ? formAd.trim() : p.kategori };
          }
          if (formTur === "alt" && p.kategori === eski.ad) {
            return { ...p, kategori: formAd.trim() };
          }
          return p;
        }),
      }));
      bildirimGoster("Kategori güncellendi.", "basari");
    } else {
      updateDb((prev) => ({
        ...prev,
        kategoriler: [...prev.kategoriler, { id: yeniId("kat"), ad: formAd.trim(), ustKategoriId: formUstId || null, aktif: true, ozelAlanlar: [] }],
      }));
      bildirimGoster("Kategori oluşturuldu.", "basari");
    }
    setFormAcik(false);
  };

  const ozelAlanEkle = () => {
    if (!yeniAlanAdi.trim() || !seciliKategori) return;
    updateDb((prev) => ({
      ...prev,
      kategoriler: prev.kategoriler.map((k) =>
        k.id === seciliKategori.id ? { ...k, ozelAlanlar: [...(k.ozelAlanlar || []), { id: yeniId("oa"), ad: yeniAlanAdi.trim(), tip: yeniAlanTipi }] } : k
      ),
    }));
    setYeniAlanAdi("");
  };
  const ozelAlanSil = (alanId) => {
    updateDb((prev) => ({
      ...prev,
      kategoriler: prev.kategoriler.map((k) => (k.id === seciliKategori.id ? { ...k, ozelAlanlar: k.ozelAlanlar.filter((a) => a.id !== alanId) } : k)),
    }));
  };

  const pasifYap = (kategori) => {
    updateDb((prev) => ({ ...prev, kategoriler: prev.kategoriler.map((k) => (k.id === kategori.id ? { ...k, aktif: false } : k)) }));
    bildirimGoster("Kategori pasif yapıldı.", "basari");
  };

  const kategoriSil = (kategori) => {
    const ozet = kategoriOzetHesapla(db, kategori);
    const altlariVar = altKategoriler(db, kategori.id).length > 0;
    if (ozet.toplamUrun > 0 || altlariVar) {
      bildirimGoster(
        ozet.toplamUrun > 0
          ? "Bu kategoride ürün var — önce ürünleri başka kategoriye taşıyın ya da kategoriyi Pasif yapın."
          : "Bu kategorinin alt kategorileri var — önce onları silin/taşıyın.",
        "hata"
      );
      setSilinecek(null);
      return;
    }
    updateDb((prev) => ({ ...prev, kategoriler: prev.kategoriler.filter((k) => k.id !== kategori.id) }));
    setSilinecek(null);
    setSeciliKategoriId(null);
    bildirimGoster("Kategori silindi.", "basari");
  };

  const tasimaToggle = (id) => setTasimaSecili((prev) => ({ ...prev, [id]: !prev[id] }));
  const tasimaUygula = () => {
    const hedef = db.kategoriler.find((k) => k.id === tasimaHedefId);
    if (!hedef) {
      bildirimGoster("Hedef kategori seçin.", "hata");
      return;
    }
    const secilenIdler = Object.keys(tasimaSecili).filter((id) => tasimaSecili[id]);
    if (secilenIdler.length === 0) {
      bildirimGoster("Taşınacak ürün seçin.", "hata");
      return;
    }
    const hedefAnaAdi = hedef.ustKategoriId ? db.kategoriler.find((k) => k.id === hedef.ustKategoriId)?.ad : hedef.ad;
    updateDb((prev) => ({
      ...prev,
      parcalar: prev.parcalar.map((p) => (secilenIdler.includes(p.id) ? { ...p, anaKategori: hedefAnaAdi, kategori: hedef.ad } : p)),
    }));
    bildirimGoster(`${secilenIdler.length} ürün "${hedef.ad}" kategorisine taşındı.`, "basari");
    setTasimaAcik(false);
    setTasimaSecili({});
    setTasimaHedefId("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 flex flex-col gap-2">
        <Buton onClick={() => formuAc("ana", null, null)}>
          <Plus size={15} /> Yeni Ana Kategori
        </Buton>
        <Kart className="overflow-hidden">
          {anaKategoriler(db).map((ana) => {
            const altlar = altKategoriler(db, ana.id);
            const acik = genisletilmis[ana.id];
            const anaOzet = kategoriOzetHesapla(db, ana);
            return (
              <div key={ana.id} style={{ borderTop: `1px solid ${T.steel200}` }}>
                <div className="flex items-center" style={{ opacity: ana.aktif === false ? 0.5 : 1 }}>
                  <button onClick={() => setGenisletilmis((p) => ({ ...p, [ana.id]: !p[ana.id] }))} className="px-2 py-2.5">
                    <ChevronRight size={14} style={{ color: T.ink500, transform: acik ? "rotate(90deg)" : "none" }} />
                  </button>
                  <button
                    onClick={() => setSeciliKategoriId(ana.id)}
                    className="flex-1 text-left py-2.5 pr-3 flex items-center justify-between text-sm"
                    style={{ color: seciliKategoriId === ana.id ? T.orangeDark : T.ink900, fontWeight: 600 }}
                  >
                    <span>{ana.ad}</span>
                    <span className="text-xs" style={{ color: T.ink500 }}>
                      {anaOzet.toplamUrun} ürün
                    </span>
                  </button>
                </div>
                {acik &&
                  altlar.map((alt) => {
                    const altOzet = kategoriOzetHesapla(db, alt);
                    return (
                      <button
                        key={alt.id}
                        onClick={() => setSeciliKategoriId(alt.id)}
                        className="w-full text-left pl-9 pr-3 py-2 text-sm flex items-center justify-between"
                        style={{
                          borderTop: `1px solid ${T.steel200}`,
                          background: seciliKategoriId === alt.id ? "#FBE1D5" : "#fff",
                          color: T.ink900,
                          opacity: alt.aktif === false ? 0.5 : 1,
                        }}
                      >
                        <span>{alt.ad}</span>
                        <span className="text-xs" style={{ color: T.ink500 }}>
                          {altOzet.toplamUrun}
                        </span>
                      </button>
                    );
                  })}
                {acik && (
                  <button onClick={() => formuAc("alt", ana.id, null)} className="w-full text-left pl-9 pr-3 py-1.5 text-xs font-semibold" style={{ color: T.orangeDark }}>
                    <Plus size={11} className="inline mr-1" /> Alt Kategori Ekle
                  </button>
                )}
              </div>
            );
          })}
        </Kart>
      </div>

      <div className="lg:col-span-2">
        {!seciliKategori ? (
          <Kart className="h-full flex items-center justify-center">
            <Bos ikon={Package} baslik="Bir kategori seçin" aciklama="Özet, özel alanlar ve toplu işlemleri görmek için soldan bir kategori seçin." />
          </Kart>
        ) : (
          <div className="flex flex-col gap-4">
            <Kart className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-base" style={{ color: T.ink900 }}>
                    {seciliKategori.ad}
                  </div>
                  <div className="text-xs" style={{ color: T.ink500 }}>
                    {seciliKategori.ustKategoriId ? `Alt kategori — ${db.kategoriler.find((k) => k.id === seciliKategori.ustKategoriId)?.ad}` : "Ana kategori"}
                    {seciliKategori.aktif === false && " · Pasif"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => formuAc(seciliKategori.ustKategoriId ? "alt" : "ana", seciliKategori.ustKategoriId, seciliKategori)} style={{ color: T.ink500 }}>
                    <Pencil size={15} />
                  </button>
                  {seciliKategori.aktif !== false && (
                    <button onClick={() => pasifYap(seciliKategori)} title="Pasif Yap" style={{ color: T.ink500 }}>
                      <EyeOff size={15} />
                    </button>
                  )}
                  <button onClick={() => setSilinecek(seciliKategori)} title="Sil" style={{ color: T.red }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { etiket: "Toplam Ürün", deger: seciliOzet.toplamUrun },
                  { etiket: "Toplam Stok", deger: seciliOzet.toplamStok },
                  { etiket: "Stok Maliyeti", deger: tl(seciliOzet.stokMaliyeti) },
                  { etiket: "Satış Değeri", deger: tl(seciliOzet.satisDegeri) },
                  { etiket: "Kâr", deger: tl(seciliOzet.kar), kar: true },
                ].map((k) => (
                  <div key={k.etiket} className="rounded-md p-2.5" style={{ background: T.steel100 }}>
                    <div className="text-xs" style={{ color: T.ink500 }}>
                      {k.etiket}
                    </div>
                    <div className="text-sm font-semibold mt-0.5" style={{ ...MONO, color: k.kar ? (seciliOzet.kar >= 0 ? T.green : T.red) : T.ink900 }}>
                      {k.deger}
                    </div>
                  </div>
                ))}
              </div>
            </Kart>

            <Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
                Toplu İşlemler
              </h4>
              <div className="flex flex-wrap gap-2">
                <Buton variant="ghost" onClick={() => kategoriHedefineGit(seciliKategori.ad, "topluFiyat")}>
                  <Percent size={14} /> Toplu Fiyat Güncelle
                </Buton>
                <Buton variant="ghost" onClick={() => kategoriHedefineGit(seciliKategori.ad, "sayim")}>
                  <ClipboardList size={14} /> Stok Sayımı Başlat
                </Buton>
                <Buton variant="ghost" onClick={() => kategoriHedefineGit(seciliKategori.ad, "raporlar-satis")}>
                  <BarChart3 size={14} /> Satış Raporu
                </Buton>
                <Buton variant="ghost" onClick={() => kategoriHedefineGit(seciliKategori.ad, "raporlar-kar")}>
                  <TrendingUp size={14} /> Kâr Raporu
                </Buton>
                <Buton variant="ghost" onClick={() => setTasimaAcik(true)}>
                  <ArrowUpDown size={14} /> Toplu Ürün Aktarımı
                </Buton>
              </div>
            </Kart>

            <Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
                Kategoriye Özel Alanlar
              </h4>
              <p className="text-xs mb-2" style={{ color: T.ink500 }}>
                Bu kategorideki ürünlerin kartında otomatik olarak bu ek alanlar görünür (ör. Filtre için Çap/Uzunluk, Balata için Ön/Arka).
              </p>
              <div className="flex flex-col gap-1.5 mb-3">
                {(seciliKategori.ozelAlanlar || []).length === 0 ? (
                  <p className="text-sm" style={{ color: T.ink500 }}>
                    Henüz özel alan tanımlanmadı.
                  </p>
                ) : (
                  seciliKategori.ozelAlanlar.map((oa) => (
                    <div key={oa.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: T.steel100 }}>
                      <span style={{ color: T.ink900 }}>
                        {oa.ad} <span className="text-xs" style={{ color: T.ink500 }}>({oa.tip === "sayi" ? "sayı" : "metin"})</span>
                      </span>
                      <button onClick={() => ozelAlanSil(oa.id)} style={{ color: T.red }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={yeniAlanAdi}
                  onChange={(e) => setYeniAlanAdi(e.target.value)}
                  placeholder="ör. Çap (mm)"
                  className="flex-1 px-3 py-2 rounded-md border text-sm outline-none"
                  style={{ borderColor: T.steel300 }}
                />
                <select value={yeniAlanTipi} onChange={(e) => setYeniAlanTipi(e.target.value)} className="px-2 py-2 rounded-md border text-sm outline-none bg-white" style={{ borderColor: T.steel300, color: T.ink900 }}>
                  <option value="metin">Metin</option>
                  <option value="sayi">Sayı</option>
                </select>
                <button onClick={ozelAlanEkle} className="px-3 py-2 rounded-md" style={{ background: T.orange, color: "#fff" }}>
                  <Plus size={15} />
                </button>
              </div>
            </Kart>

            <Kart className="overflow-hidden">
              <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${T.steel200}`, background: T.steel100 }}>
                <span className="text-xs font-semibold uppercase" style={{ color: T.ink500 }}>
                  Bu Kategorideki Ürünler
                </span>
              </div>
              {seciliOzet.urunler.length === 0 ? (
                <Bos ikon={Package} baslik="Ürün yok" aciklama="Bu kategoriye henüz ürün atanmadı." />
              ) : (
                <div className="max-h-80 overflow-y-auto">
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

      {/* Ana/Alt kategori ekle-düzenle formu */}
      {formAcik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormAcik(false)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: T.ink900 }}>
              {duzenlenenKategoriId ? "Kategoriyi Düzenle" : formTur === "ana" ? "Yeni Ana Kategori" : "Yeni Alt Kategori"}
            </h3>
            <Girdi label="Kategori Adı" value={formAd} onChange={(e) => setFormAd(e.target.value)} autoFocus />
            <div className="flex gap-2 mt-3">
              <Buton onClick={kategoriKaydet}>
                <Check size={14} /> Kaydet
              </Buton>
              <Buton variant="ghost" onClick={() => setFormAcik(false)}>
                Vazgeç
              </Buton>
            </div>
          </div>
        </div>
      )}

      {/* Toplu ürün aktarımı */}
      {tasimaAcik && seciliKategori && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 pb-8" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setTasimaAcik(false)}>
          <div className="w-full max-w-md rounded-lg p-5 overflow-y-auto" style={{ background: "#fff", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{ color: T.ink900 }}>
                Toplu Ürün Aktarımı
              </h3>
              <button onClick={() => setTasimaAcik(false)} style={{ color: T.ink500 }}>
                <X size={16} />
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: T.ink500 }}>
              "{seciliKategori.ad}" kategorisinden taşınacak ürünleri seçin.
            </p>
            <div className="flex flex-col gap-1 mb-3 max-h-60 overflow-y-auto">
              {seciliOzet.urunler.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-md" style={{ background: tasimaSecili[p.id] ? "#FBE1D5" : T.steel100 }}>
                  <input type="checkbox" checked={!!tasimaSecili[p.id]} onChange={() => tasimaToggle(p.id)} />
                  <span style={{ color: T.ink900 }}>{p.ad}</span>
                </label>
              ))}
            </div>
            <Secim label="Hedef Kategori" value={tasimaHedefId} onChange={(e) => setTasimaHedefId(e.target.value)} className="mb-3">
              <option value="">Seçin…</option>
              {db.kategoriler
                .filter((k) => k.id !== seciliKategori.id)
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ustKategoriId ? `${db.kategoriler.find((u) => u.id === k.ustKategoriId)?.ad} › ${k.ad}` : k.ad}
                  </option>
                ))}
            </Secim>
            <Buton onClick={tasimaUygula}>
              <ArrowUpDown size={14} /> Seçilenleri Taşı
            </Buton>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {silinecek && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSilinecek(null)}>
          <div className="w-full max-w-sm rounded-lg p-5" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: T.ink900 }}>
              "{silinecek.ad}" kategorisi silinsin mi?
            </h3>
            <p className="text-sm mb-4" style={{ color: T.ink500 }}>
              İçinde ürün veya alt kategorisi varsa silinemez — önce ürünleri taşıyın ya da kategoriyi Pasif yapın.
            </p>
            <div className="flex gap-2">
              <Buton variant="danger" onClick={() => kategoriSil(silinecek)}>
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
