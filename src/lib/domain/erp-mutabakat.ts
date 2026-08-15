import type {
  SatisKaydi,
  OdemeHareketi,
  StokHareketi,
  CariHareketi,
  KasaBankaHareketi,
} from "./erp-domain-models";
import type { AlisKaydi } from "./alis-tedarikci-zinciri";

const para = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export interface DonemMutabakatGirdisi {
  satislar: SatisKaydi[];
  alislar: AlisKaydi[];
  odemeler: OdemeHareketi[];
  stok: StokHareketi[];
  cari: CariHareketi[];
  hesap: KasaBankaHareketi[];
}

export interface DonemMutabakatSonucu {
  ok: boolean;
  satisCirosu: number;
  alisTutari: number;
  odemeTutari: number;
  stokNetHareketi: number;
  cariNetHareketi: number;
  hesapNetHareketi: number;
  farklar: {
    satisOdeme: number;
    alisOdeme: number;
  };
  hatalar: string[];
}

export function erpDonemMutabakat(
  input: DonemMutabakatGirdisi
): DonemMutabakatSonucu {
  const satisCirosu = para(input.satislar.reduce((t, s) => t + para(s.genelToplam), 0));
  const alisTutari = para(input.alislar.reduce((t, a) => t + para(a.genelToplam), 0));
  const odemeTutari = para(input.odemeler.reduce((t, o) => t + para(o.tutar), 0));
  const stokNetHareketi = para(input.stok.reduce((t, h) => t + para(h.miktar), 0));
  const cariNetHareketi = para(input.cari.reduce((t, h) => t + para(h.tutar), 0));
  const hesapNetHareketi = para(input.hesap.reduce((t, h) => t + para(h.tutar), 0));

  const satisOdeme = para(satisCirosu - odemeTutari);
  const alisOdeme = para(alisTutari - odemeTutari);
  const hatalar: string[] = [];

  // Bu iki fark tek başına muhasebe hatası değildir: açık hesap, vadeli alış
  // ve farklı ödeme dönemleri olabilir. Sadece mutabakat sinyali olarak raporlanır.
  if (Math.abs(satisOdeme) > 0.01) {
    hatalar.push("Satış toplamı ile ödeme toplamı arasında fark var; açık hesap/vade kontrol edilmeli.");
  }
  if (Math.abs(alisOdeme) > 0.01) {
    hatalar.push("Alış toplamı ile ödeme toplamı arasında fark var; tedarikçi borcu/vade kontrol edilmeli.");
  }

  return {
    ok: hatalar.length === 0,
    satisCirosu,
    alisTutari,
    odemeTutari,
    stokNetHareketi,
    cariNetHareketi,
    hesapNetHareketi,
    farklar: { satisOdeme, alisOdeme },
    hatalar,
  };
}
