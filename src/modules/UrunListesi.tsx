/* Stok — ürün kartı ızgarası (Stok.tsx'ten bölündü).
   Salt sunum: veriyi ve eylemleri StokSayfasi prop olarak geçirir. */
import React from "react";
import * as R from "../core/akcan-runtime";

export function UrunListesi({
  db,
  aktifKullanici,
  filtreli,
  onDuzenle,
  onSil,
  onAktifPasif,
  onKod,
  onBarkod,
  onArac,
  onDetay,
  onDetaySekme,
  onTedarikciKarsilastirma,
  onAlisGecmisi,
  onFiyatGecmisi,
  onStokGirisi,
  onDuzeltme,
  onRaf,
  onHareketler,
}) {
  return (
    <>
      {filtreli.length === 0 ? (
        <R.Kart>
          <R.Bos
            ikon={R.Package}
            baslik={db.parcalar.length === 0 ? "Henüz ürün kartı yok" : "Sonuç bulunamadı"}
            aciklama={
              db.parcalar.length === 0
                ? "İlk ürün kartınızı oluşturarak başlayın."
                : "Arama veya filtre kriterlerinizi değiştirmeyi deneyin."
            }
          />
        </R.Kart>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtreli.map((p) => {
            const maliyet = R.gecerliMaliyet(p);
            const kar = R.karTutariHesapla(p);
            const marginYuzde = R.karOraniMargin(p);
            const kritik = p.stok <= p.kritikSeviye;
            return (
              <R.Kart key={p.id} className="p-4 flex flex-col gap-3" style={{ opacity: p.aktif === false ? 0.55 : 1 }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ background: R.T.steel100 }}
                  >
                    {p.fotograf ? (
                      <img src={p.fotograf} alt={p.ad} className="w-full h-full object-cover" />
                    ) : (
                      <R.ImageIcon size={18} style={{ color: R.T.ink500 }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate" style={{ color: R.T.ink900 }}>
                        {p.ad}
                      </span>
                      {p.aktif === false && <R.Rozet tone="steel">Pasif</R.Rozet>}
                      {kritik && p.aktif !== false && <R.Rozet tone="red">Kritik</R.Rozet>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ ...R.MONO, color: R.T.ink500 }}>
                      {p.stokKodu} {p.marka && `· ${p.marka}`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div style={{ color: R.T.ink500 }}>Stok</div>
                  <div className="text-right font-semibold" style={{ ...R.MONO, color: kritik ? R.T.red : R.T.ink900 }}>
                    {p.stok} {p.birim}
                  </div>
                  <div style={{ color: R.T.ink500 }}>Raf</div>
                  <div className="text-right font-semibold" style={{ ...R.MONO, color: R.T.ink900 }}>
                    {R.parcaRafListesi(p).length === 0
                      ? "—"
                      : R.parcaRafListesi(p).length === 1
                      ? `📍 ${R.parcaRafListesi(p)[0].kod}`
                      : `📍 ${R.parcaRafListesi(p).length} konum`}
                  </div>
                  {R.yetkiVarMi(db, aktifKullanici, "maliyetiGorebilir") && (
                    <>
                      <div style={{ color: R.T.ink500 }}>Ortalama Maliyet</div>
                      <div className="text-right" style={R.MONO}>
                        {R.tl(p.ortalamaMaliyet)}
                      </div>
                    </>
                  )}
                  <div style={{ color: R.T.ink500 }}>Satış Fiyatı</div>
                  <div className="text-right font-semibold" style={{ ...R.MONO, color: R.T.ink900 }}>
                    {R.tl(p.satisFiyati)}
                  </div>
                  {R.yetkiVarMi(db, aktifKullanici, "karOraniniGorebilir") && (
                    <>
                      <div style={{ color: R.T.ink500 }}>Kâr Marjı</div>
                      <div className="text-right font-semibold" style={{ ...R.MONO, color: kar >= 0 ? R.T.green : R.T.red }}>
                        {R.tl(kar)} {marginYuzde !== null && `(%${marginYuzde.toFixed(1)})`}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-2 mt-auto flex-wrap" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                  <button
                    onClick={() => onStokGirisi(p)}
                    title="Stok Girişi (Mal Alış — fiyat/maliyet güncelle)"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.green }}
                  >
                    <R.TrendingUp size={13} /> Stok Girişi
                  </button>
                  <button
                    onClick={() => onRaf(p)}
                    title="Raf Değiştir / Konumları Yönet"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.orangeDark }}
                  >
                    <R.MapPin size={13} /> Raf
                  </button>
                  <button
                    onClick={() => onDuzeltme(p)}
                    title="Stok Düzeltme (sayım, fire, iade, manuel giriş/çıkış)"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.orangeDark }}
                  >
                    <R.ArrowUpDown size={13} /> Düzeltme
                  </button>
                  {db.stokHareketleri.some((h) => h.parcaId === p.id) && (
                    <button
                      onClick={() => onHareketler(p.id)}
                      title="Tüm stok hareketleri"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ color: R.T.ink500 }}
                    >
                      <R.ListOrdered size={13} />
                    </button>
                  )}
                  {p.alisGecmisi?.some((g) => g.tedarikci) && (
                    <button
                      onClick={() => onTedarikciKarsilastirma(p.id)}
                      title="Bu ürünü kimlerden aldım?"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ color: R.T.ink500 }}
                    >
                      <R.Building2 size={13} />
                    </button>
                  )}
                  {p.alisGecmisi?.length > 0 && (
                    <button
                      onClick={() => onAlisGecmisi(p.id)}
                      title="Alış / maliyet geçmişi"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ color: R.T.ink500 }}
                    >
                      <R.History size={13} />
                    </button>
                  )}
                  {p.fiyatGecmisi?.length > 0 && (
                    <button
                      onClick={() => onFiyatGecmisi(p.id)}
                      title="Satış fiyatı geçmişi"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ color: R.T.ink500 }}
                    >
                      <R.Tag size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onKod(p.id);
                    }}
                    title="OEM / Muadil kodları yönet"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.ink500 }}
                  >
                    <R.GitCompare size={13} />
                    {db.kodlar.filter((k) => k.parcaId === p.id).length > 0 &&
                      `(${db.kodlar.filter((k) => k.parcaId === p.id).length})`}
                  </button>
                  <button
                    onClick={() => onBarkod(p.id)}
                    title="Barkodları yönet"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.parcaTumBarkodlari(p).length === 0 ? R.T.red : R.T.ink500 }}
                  >
                    <R.ScanLine size={13} />
                    {R.parcaTumBarkodlari(p).length > 0 ? `(${R.parcaTumBarkodlari(p).length})` : "Yok"}
                  </button>
                  <button
                    onClick={() => onArac(p.id)}
                    title="Uyumlu araçları yönet"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.ink500 }}
                  >
                    <R.Car size={13} />
                    {R.parcaUyumluAraclari(db, p.id).length > 0 && `(${R.parcaUyumluAraclari(db, p.id).length})`}
                  </button>
                  <button
                    onClick={() => {
                      onDetay(p.id);
                      onDetaySekme("fotograf");
                    }}
                    title="Fotoğraf, doküman ve tüm detaylar"
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ color: R.T.ink500 }}
                  >
                    <R.ImageIcon size={13} />
                    {(p.fotograflar?.length || 0) + (p.dokumanlar?.length || 0) > 0 && `(${(p.fotograflar?.length || 0) + (p.dokumanlar?.length || 0)})`}
                  </button>
                  {p.etiketSonYazdirmaFiyati !== null && Math.abs(p.etiketSonYazdirmaFiyati - p.satisFiyati) > 0.005 && (
                    <span title="Etiket fiyatı güncel değil" className="text-xs font-semibold" style={{ color: R.T.red }}>
                      ⚠️ Etiket eski
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => onAktifPasif(p)} title={p.aktif === false ? "Aktif yap" : "Pasif yap"} style={{ color: R.T.ink500 }}>
                      {p.aktif === false ? <R.Eye size={15} /> : <R.EyeOff size={15} />}
                    </button>
                    <button onClick={() => onDuzenle(p)} title="Düzenle" style={{ color: R.T.ink500 }}>
                      <R.Pencil size={15} />
                    </button>
                    <button onClick={() => onSil(p)} title="Sil" style={{ color: R.T.red }}>
                      <R.Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </R.Kart>
            );
          })}
        </div>
      )}
    </>
  );
}
