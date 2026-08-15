import type {
  SatisKaydi,
  OdemeHareketi,
  StokHareketi,
  CariHareketi,
  KasaBankaHareketi,
} from "./erp-domain-models";

export interface FinansZinciri {
  satis: SatisKaydi;
  odemeler: OdemeHareketi[];
  stokHareketleri: StokHareketi[];
  cariHareketleri: CariHareketi[];
  hesapHareketleri: KasaBankaHareketi[];
}

export function finansZinciriTemelKontrol(
  zincir: FinansZinciri
): { ok: boolean; hata?: string } {
  if (!zincir.satis.id) return { ok: false, hata: "Satış ID eksik." };
  if (!Number.isFinite(zincir.satis.genelToplam) || zincir.satis.genelToplam < 0) {
    return { ok: false, hata: "Satış toplamı geçersiz." };
  }

  const odemeToplami = zincir.odemeler.reduce(
    (t, o) => t + (Number.isFinite(o.tutar) ? o.tutar : 0),
    0
  );

  if (Math.abs(odemeToplami - zincir.satis.genelToplam) > 0.01) {
    return { ok: false, hata: "Ödeme toplamı satış toplamıyla eşleşmiyor." };
  }

  if (zincir.stokHareketleri.some((h) => !h.urunId || !Number.isFinite(h.miktar))) {
    return { ok: false, hata: "Geçersiz stok hareketi." };
  }

  if (zincir.cariHareketleri.some((h) => !h.cariId || !Number.isFinite(h.tutar))) {
    return { ok: false, hata: "Geçersiz cari hareketi." };
  }

  if (zincir.hesapHareketleri.some((h) => !h.hesapId || !Number.isFinite(h.tutar))) {
    return { ok: false, hata: "Geçersiz kasa/banka hareketi." };
  }

  return { ok: true };
}
