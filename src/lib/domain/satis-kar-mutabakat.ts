import type { SatisKaydi } from "./erp-domain-models";
import { satisKarKdvHesapla } from "./kar-kdv-hesap";

export function satisKarMutabakat(satis: SatisKaydi) {
  const maliyet = satis.kalemler.reduce(
    (t, k) => t + Math.max(0, Number(k.maliyet || 0)) * Math.max(0, k.miktar),
    0
  );
  const sonuc = satisKarKdvHesapla({
    toplamSatis: satis.genelToplam,
    maliyet,
    kdvOrani: satis.kalemler[0]?.kdvOrani ?? 20,
    toplamSatisKdvDahil: true,
  });
  const ok = Math.abs(sonuc.toplamSatis - Number(satis.genelToplam || 0)) <= 0.01;
  return { ok, sonuc, ...(ok ? {} : { hata: "Satış toplamı ile hesap mutabık değil." }) };
}
