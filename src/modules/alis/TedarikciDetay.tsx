/* Alış/Tedarikçi ekranı — ayrıştırılmış bileşen.
 * Finans ve veri sözleşmeleri değiştirilmemiştir.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../../core/akcan-runtime";
import { OdemePlaniDuzenleyici } from "./OdemePlaniDuzenleyici";

export function TedarikciDetay({ db, updateDb, aktifKullanici, tedarikci, onDuzenle, onSil, onOdemeAc, belgeyeGit }) {
  const [ekstreAcik, setEkstreAcik] = R.useState(false);
  const [odemePlaniAcikId, setOdemePlaniAcikId] = R.useState(null);
  const [altSekme, setAltSekme] = R.useState("alislar");
  const bugunIso = R.isoGun(new Date());
  const faturalar = db.malAlimlari.filter((m) => m.tedarikci.toLowerCase() === tedarikci.ad.toLowerCase());
  const toplamAlis = faturalar.reduce((t, m) => t + (m.faturaGirilenToplam ?? m.hesaplananGenelToplam), 0);
  const toplamOdeme = tedarikci.hareketler.filter((h) => h.tur === "ödeme").reduce((t, h) => t + h.tutar, 0);
  const acikFaturalar = R.tedarikciAcikFaturalari(db, tedarikci.ad);
  const vadesiGecenBorc = acikFaturalar.filter((m) => m.vadeTarihi && m.vadeTarihi < bugunIso).reduce((s, m) => s + m.kalanBorc, 0);

  return (
    <div className="flex flex-col gap-4">
      <R.Kart className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-semibold text-base" style={{ color: R.T.ink900 }}>
              {tedarikci.ad}
            </div>
            <div className="text-xs mt-0.5" style={{ color: R.T.ink500 }}>
              {[tedarikci.yetkiliKisi, tedarikci.telefon, tedarikci.eposta].filter(Boolean).join(" · ") || "İletişim bilgisi girilmemiş"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setEkstreAcik(true)} title="Hesap Ekstresi" className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100, color: R.T.ink900 }}>
              Hesap Ekstresi
            </button>
            <button onClick={onOdemeAc} title="Ödeme kaydet" className="text-xs font-semibold px-2.5 py-1.5 rounded-md" style={{ background: R.T.green, color: "#fff" }}>
              Ödeme Kaydet
            </button>
            <button onClick={onDuzenle} title="Düzenle" style={{ color: R.T.ink500 }}>
              <R.Pencil size={15} />
            </button>
            <button onClick={onSil} title="Sil" style={{ color: R.T.red }}>
              <R.Trash2 size={15} />
            </button>
          </div>
        </div>
        {(tedarikci.vergiDairesi || tedarikci.vergiNo || tedarikci.adres) && (
          <p className="text-xs mb-3" style={{ color: R.T.ink500 }}>
            {[
              tedarikci.vergiDairesi && `${tedarikci.vergiDairesi} V.D.`,
              tedarikci.vergiNo && `VN: ${tedarikci.vergiNo}`,
              tedarikci.adres,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { etiket: "Toplam Alış", deger: R.tl(toplamAlis), ton: "graphite" },
            { etiket: "Toplam Ödeme", deger: R.tl(toplamOdeme), ton: "green" },
            { etiket: "Güncel Borç", deger: R.tl(tedarikci.bakiye || 0), ton: tedarikci.bakiye > 0 ? "red" : "green" },
            { etiket: "Vadesi Geçen", deger: R.tl(vadesiGecenBorc), ton: vadesiGecenBorc > 0 ? "red" : "green" },
            { etiket: "Açık Fatura", deger: acikFaturalar.length, ton: "yellow" },
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
        {tedarikci.borcLimiti > 0 && tedarikci.bakiye > tedarikci.borcLimiti && (
          <p className="text-xs font-semibold px-2.5 py-1.5 rounded-md mt-3 inline-flex items-center gap-1.5" style={{ background: "#F9DEDE", color: R.T.red }}>
            <R.AlertTriangle size={12} /> Borç limiti ({R.tl(tedarikci.borcLimiti)}) aşıldı.
          </p>
        )}
      </R.Kart>

      <div className="flex flex-wrap rounded-md overflow-hidden border" style={{ borderColor: R.T.steel300 }}>
        {[
          { id: "alislar", ad: "Alışlar" },
          { id: "odemeler", ad: "Ödemeler" },
          { id: "borc", ad: "Borç" },
          { id: "siparisler", ad: "Siparişler" },
          { id: "urunler", ad: "Ürünler" },
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

      {altSekme === "alislar" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Alışlar
          </h4>
          {faturalar.length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Bu tedarikçiden henüz alış yapılmadı.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
              {faturalar
                .slice()
                .sort((a, b) => new Date(b.faturaTarihi) - new Date(a.faturaTarihi))
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm px-2.5 py-2 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ color: R.T.ink900 }}>
                      {m.faturaNo} <span style={{ color: R.T.ink500 }}>· {R.tarihGoster(m.faturaTarihi)} · {m.kalemler?.length || 0} kalem</span>
                    </span>
                    <span className="font-semibold" style={R.MONO}>
                      {R.tl(m.faturaGirilenToplam ?? m.hesaplananGenelToplam)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </R.Kart>
      )}

      {altSekme === "odemeler" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Ödemeler
          </h4>
          {tedarikci.hareketler.filter((h) => h.tur === "ödeme").length === 0 ? (
            <p className="text-sm" style={{ color: R.T.ink500 }}>
              Henüz ödeme yapılmadı.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {tedarikci.hareketler
                .filter((h) => h.tur === "ödeme")
                .map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ color: R.T.ink900 }}>
                      {R.tarihGoster(h.tarih)} — {h.aciklama} {h.faturaNo && `· ${h.faturaNo}`}
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

      {altSekme === "borc" && (
        <div className="flex flex-col gap-4">
          {acikFaturalar.length > 0 && (
            <R.Kart className="p-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                Açık Faturalar
              </h4>
              <div className="flex flex-col gap-1.5">
                {acikFaturalar.map((m) => {
                  const gecmis = m.vadeTarihi && m.vadeTarihi < bugunIso;
                  const planAcik = odemePlaniAcikId === m.id;
                  return (
                    <div key={m.id} className="rounded-md" style={{ background: R.T.steel100 }}>
                      <div className="flex items-center justify-between text-sm px-2.5 py-2">
                        <span style={{ color: R.T.ink900 }}>
                          {m.faturaNo} <span style={{ color: R.T.ink500 }}>· {R.tarihGoster(m.faturaTarihi)}</span>
                          {m.vadeTarihi && <span style={{ color: gecmis ? R.T.red : R.T.ink500 }}> · Vade: {R.tarihGoster(m.vadeTarihi)}</span>}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold" style={{ ...R.MONO, color: gecmis ? R.T.red : R.T.ink900 }}>
                            {R.tl(m.kalanBorc)}
                          </span>
                          <button
                            onClick={() => setOdemePlaniAcikId(planAcik ? null : m.id)}
                            className="text-xs font-semibold underline"
                            style={{ color: R.T.orangeDark }}
                          >
                            Ödeme Planı {(m.odemePlani || []).length > 0 ? `(${m.odemePlani.length})` : ""}
                          </button>
                        </div>
                      </div>
                      {planAcik && <OdemePlaniDuzenleyici db={db} updateDb={updateDb} fatura={m} />}
                    </div>
                  );
                })}
              </div>
            </R.Kart>
          )}
          <R.Kart className="p-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
              Hareket Geçmişi
            </h4>
            {tedarikci.hareketler.length === 0 ? (
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
                      <th className="text-left font-semibold px-2 py-1.5">Fatura No</th>
                      <th className="text-right font-semibold px-2 py-1.5">Borç</th>
                      <th className="text-right font-semibold px-2 py-1.5">Ödeme</th>
                      <th className="text-right font-semibold px-2 py-1.5">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tedarikci.hareketler.map((h) => (
                      <tr key={h.id} style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                        <td className="px-2 py-1.5" style={{ color: R.T.ink500 }}>
                          {R.tarihGoster(h.tarih)}
                        </td>
                        <td className="px-2 py-1.5" style={{ color: R.T.ink900 }}>
                          {h.aciklama}
                        </td>
                        <td className="px-2 py-1.5" style={R.MONO}>
                          {h.faturaNo || "—"}
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
        </div>
      )}

      {altSekme === "siparisler" &&
        (() => {
          const siparisler = db.satinAlmaSiparisleri.filter((s) => s.tedarikci === tedarikci.ad).sort((a, b) => new Date(b.siparisTarihi) - new Date(a.siparisTarihi));
          const performans = R.tedarikciTeslimatPerformansi(db, tedarikci.ad);
          if (siparisler.length === 0) {
            return (
              <R.Kart className="p-4">
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Bu tedarikçiye henüz satın alma siparişi verilmedi.
                </p>
              </R.Kart>
            );
          }
          return (
            <div className="flex flex-col gap-4">
              {performans && (
                <R.Kart className="p-4">
                  <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
                    Teslimat Performansı
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        Ortalama Teslimat
                      </div>
                      <div className="font-semibold" style={R.MONO}>
                        {performans.ortalamaTeslimatGun !== null ? `${performans.ortalamaTeslimatGun} gün` : "—"}
                      </div>
                    </div>
                    <div className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        Zamanında Teslim
                      </div>
                      <div className="font-semibold" style={{ ...R.MONO, color: R.T.green }}>
                        {performans.zamanindaYuzde !== null ? `%${performans.zamanindaYuzde}` : "—"}
                      </div>
                    </div>
                    <div className="rounded-md p-2.5 text-center" style={{ background: R.T.steel100 }}>
                      <div className="text-xs" style={{ color: R.T.ink500 }}>
                        Eksik Teslim
                      </div>
                      <div className="font-semibold" style={{ ...R.MONO, color: performans.eksikYuzde > 0 ? R.T.red : R.T.ink900 }}>
                        %{performans.eksikYuzde}
                      </div>
                    </div>
                  </div>
                </R.Kart>
              )}
              <R.Kart className="overflow-hidden">
                <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${R.T.steel200}`, background: R.T.steel100 }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: R.T.ink500 }}>
                    Satın Alma Siparişi Geçmişi
                  </span>
                </div>
                {siparisler.map((s) => {
                  const ilkKabul = s.malKabulGecmisi[s.malKabulGecmisi.length - 1];
                  const sureGun = ilkKabul ? Math.round((new Date(ilkKabul.tarih) - new Date(s.siparisTarihi)) / 86400000) : null;
                  return (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm" style={{ borderTop: `1px solid ${R.T.steel200}` }}>
                      <div>
                        <div style={{ color: R.T.ink900 }}>
                          {R.tarihGoster(s.siparisTarihi)} · {s.kalemler.length} kalem · {R.siparisAlinanAdet(s)}/{R.siparisToplamAdet(s)} adet geldi
                        </div>
                        <div className="text-xs" style={{ color: R.T.ink500 }}>
                          {R.tl(R.siparisGenelToplam(s))} {sureGun !== null && `· ${sureGun} günde teslim edildi`}
                        </div>
                      </div>
                      <R.Rozet tone={R.siparisDurumGorseli[s.durum].ton}>
                        {R.siparisDurumGorseli[s.durum].emoji} {s.durum}
                      </R.Rozet>
                    </div>
                  );
                })}
              </R.Kart>
            </div>
          );
        })()}

      {altSekme === "urunler" && (
        <R.Kart className="p-4">
          <h4 className="font-semibold text-sm mb-2" style={{ color: R.T.ink900 }}>
            Bu Tedarikçiden Alınan Ürünler
          </h4>
          {(() => {
            const urunler = db.parcalar.filter((p) => (p.tedarikci || "").toLowerCase() === tedarikci.ad.toLowerCase());
            if (urunler.length === 0) {
              return (
                <p className="text-sm" style={{ color: R.T.ink500 }}>
                  Bu tedarikçiye bağlı ürün kartı yok.
                </p>
              );
            }
            return (
              <div className="flex flex-col gap-1">
                {urunler.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md" style={{ background: R.T.steel100 }}>
                    <span style={{ color: R.T.ink900 }}>
                      {p.ad} <span style={{ ...R.MONO, color: R.T.ink500 }}>· {p.stokKodu}</span>
                    </span>
                    <span style={{ color: R.T.ink500 }}>{p.stok} {p.birim}</span>
                  </div>
                ))}
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
            hedefId={tedarikci.id}
            notlar={db.tedarikciNotlari.filter((n) => n.hedefId === tedarikci.id)}
            koleksiyonAdi="tedarikciNotlari"
            aktifKullanici={aktifKullanici}
          />
        </R.Kart>
      )}
      {ekstreAcik && <R.EkstreModal db={db} hedefTuru="tedarikci" hedef={tedarikci} onKapat={() => setEkstreAcik(false)} belgeyeGit={belgeyeGit} />}
    </div>
  );
}
