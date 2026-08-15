import type {
  SatisKaydi,
  OdemeHareketi,
  StokHareketi,
  CariHareketi,
  KasaBankaHareketi,
} from "./erp-domain-models";
import { satisKarKdvHesapla } from "./kar-kdv-hesap";
import { idempotencyKey } from "./idempotency";

export interface TamSatisZinciri {
  satis: SatisKaydi;
  odemeler: OdemeHareketi[];
  stok: StokHareketi[];
  cari: CariHareketi[];
  hesap: KasaBankaHareketi[];
  maliyet: number;
  kdvOrani?: number;
  kdvDahil?: boolean;
}

export interface TamZincirSonucu {
  ok: boolean;
  idempotencyKey: string;
  toplamOdeme: number;
  toplamStokMiktari: number;
  toplamCari: number;
  toplamHesap: number;
  kdv: number;
  netSatis: number;
  maliyet: number;
  brutKar: number;
  hata?: string;
}

export function tamSatisZinciriKontrol(
  z: TamSatisZinciri
): TamZincirSonucu {
  const satisToplami = Number(z.satis.genelToplam);
  const toplamOdeme = z.odemeler.reduce((t, x) => t + Number(x.tutar || 0), 0);
  const toplamCari = z.cari.reduce((t, x) => t + Number(x.tutar || 0), 0);
  const toplamHesap = z.hesap.reduce((t, x) => t + Number(x.tutar || 0), 0);
  const toplamStokMiktari = z.stok.reduce((t, x) => t + Number(x.miktar || 0), 0);

  const kar = satisKarKdvHesapla({
    toplamSatis: satisToplami,
    maliyet: z.maliyet,
    kdvOrani: z.kdvOrani ?? 20,
    toplamSatisKdvDahil: z.kdvDahil ?? true,
  });

  const hata = (msg: string): TamZincirSonucu => ({
    ok: false,
    idempotencyKey: idempotencyKey("satis-finans-zinciri", z.satis.id),
    toplamOdeme,
    toplamStokMiktari,
    toplamCari,
    toplamHesap,
    kdv: kar.kdv,
    netSatis: kar.netSatis,
    maliyet: kar.maliyet,
    brutKar: kar.brutKar,
    hata: msg,
  });

  if (!z.satis.id) return hata("Satış ID eksik.");
  if (!Number.isFinite(satisToplami) || satisToplami < 0) {
    return hata("Satış toplamı geçersiz.");
  }
  if (Math.abs(toplamOdeme - satisToplami) > 0.01) {
    return hata("Ödeme toplamı satış toplamıyla eşleşmiyor.");
  }
  if (Math.abs(toplamHesap - toplamOdeme) > 0.01) {
    return hata("Kasa/banka/POS toplamı ödeme toplamıyla eşleşmiyor.");
  }

  // Açık hesap yoksa cari hareketi olmamalı; açık hesap varsa tutarı ayrıca
  // ödeme toplamıyla birlikte kontrol eden üst katman karar verir.
  if (z.odemeler.every(x => x.yontem !== "Açık Hesap") && Math.abs(toplamCari) > 0.01) {
    return hata("Peşin/kart satışında beklenmeyen cari hareketi var.");
  }

  if (z.stok.some(x => !x.urunId || !Number.isFinite(x.miktar) || x.miktar >= 0)) {
    return hata("Satış stok hareketlerinde negatif miktar bekleniyor.");
  }

  return {
    ok: true,
    idempotencyKey: idempotencyKey("satis-finans-zinciri", z.satis.id),
    toplamOdeme,
    toplamStokMiktari,
    toplamCari,
    toplamHesap,
    kdv: kar.kdv,
    netSatis: kar.netSatis,
    maliyet: kar.maliyet,
    brutKar: kar.brutKar,
  };
}
