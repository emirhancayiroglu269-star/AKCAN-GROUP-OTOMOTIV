import { tedarikciHareketiUygula, hesapHareketiUygula } from "./cari-kasa";
import { zamanDamgasi } from "./format";

export type AlisFinansGirdisi = {
  alisId: string;
  tedarikci: string;
  faturaNo: string;
  faturaTutari: number;
  odenenTutar: number;
  hesapId?: string | null;
  odemeYontemi?: string;
  kullanici?: string;
  tarih?: string;
};

/** Mal alışın tedarikçi cari + kasa/banka ayağını tek noktadan uygular. */
export const alisFinansHareketleriniUygula = (prev: any, input: AlisFinansGirdisi): any | null => {
  if (!input.alisId || !input.tedarikci || input.faturaTutari <= 0) return null;
  if ((prev.malAlimlari || []).some((m: any) => m.id === input.alisId)) return null;

  const faturaTutari = Math.round(input.faturaTutari * 100) / 100;
  const odenenTutar = Math.round(Math.max(0, input.odenenTutar || 0) * 100) / 100;
  if (odenenTutar > faturaTutari + 0.01) return null;
  if (odenenTutar > 0) {
    const hesap = (prev.hesaplar || []).find((h: any) => h.id === input.hesapId && h.aktif !== false);
    if (!hesap) return null;
    if (Number(hesap.bakiye || 0) + 0.01 < odenenTutar) return null;
  }

  const tarih = input.tarih || zamanDamgasi();
  let sonuc = tedarikciHareketiUygula(prev, {
    tedarikciAdi: input.tedarikci,
    tutar: faturaTutari,
    tur: "borç",
    aciklama: "Alış faturası",
    faturaNo: input.faturaNo,
    kaynakAlisId: input.alisId,
    tarih,
  });

  if (odenenTutar > 0) {
    sonuc = tedarikciHareketiUygula(sonuc, {
      tedarikciAdi: input.tedarikci,
      tutar: odenenTutar,
      tur: "ödeme",
      aciklama: "Alış faturası ilk ödeme",
      faturaNo: input.faturaNo,
      kaynakAlisId: input.alisId,
      tarih,
    });
    sonuc = hesapHareketiUygula(sonuc, {
      hesapId: input.hesapId,
      tur: `Mal Alış — ${input.odemeYontemi || "Nakit"}`,
      giris: 0,
      cikis: odenenTutar,
      belgeNo: input.faturaNo,
      aciklama: `${input.tedarikci} — Alış faturası ${input.faturaNo}`,
      kullanici: input.kullanici || "",
      kaynakId: `${input.alisId}:odeme:${input.hesapId}`,
      tarih,
    });
  }

  return sonuc;
};
