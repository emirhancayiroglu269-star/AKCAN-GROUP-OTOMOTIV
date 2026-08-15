export type StokHareketTipi =
  | "ALIS"
  | "SATIS"
  | "ALIS_IADE"
  | "SATIS_IADE"
  | "TRANSFER_CIKIS"
  | "TRANSFER_GIRIS"
  | "SAYIM_DUZELTME"
  | "SEVK"
  | "MAL_KABUL"
  | "IPTAL";

export interface StokHareket {
  id: string;
  urunId: string;
  tip: StokHareketTipi;
  miktar: number;
  depoId?: string;
  lokasyonId?: string;
  kaynakDepoId?: string;
  kaynakLokasyonId?: string;
  hedefDepoId?: string;
  hedefLokasyonId?: string;
  kaynakBelgeId?: string;
  kullaniciId?: string;
  idempotencyKey: string;
  tarih: string;
  aciklama?: string;
}

export interface StokKartelaOzet {
  urunId: string;
  giris: number;
  cikis: number;
  netHareket: number;
  hareketSayisi: number;
}

const girisTipleri: StokHareketTipi[] = [
  "ALIS", "ALIS_IADE", "TRANSFER_GIRIS", "MAL_KABUL"
];

const cikisTipleri: StokHareketTipi[] = [
  "SATIS", "SATIS_IADE", "TRANSFER_CIKIS", "SEVK"
];

export function stokHareketDogrula(h: StokHareket): void {
  if (!h.urunId?.trim()) throw new Error("Ürün zorunlu.");
  if (!h.tip) throw new Error("Hareket tipi zorunlu.");
  if (!Number.isFinite(h.miktar) || h.miktar <= 0) {
    throw new Error("Hareket miktarı pozitif olmalı.");
  }
  if (!h.idempotencyKey?.trim()) {
    throw new Error("Idempotency key zorunlu.");
  }
}

export function hareketNetEtkisi(h: Pick<StokHareket, "tip" | "miktar">): number {
  if (girisTipleri.includes(h.tip)) return h.miktar;
  if (cikisTipleri.includes(h.tip)) return -h.miktar;
  if (h.tip === "SAYIM_DUZELTME") return h.miktar;
  if (h.tip === "IPTAL") return -h.miktar;
  return 0;
}

export function stokKartelaOzetle(
  hareketler: Array<Pick<StokHareket, "tip" | "miktar">>
): StokKartelaOzet {
  let giris = 0;
  let cikis = 0;
  let netHareket = 0;

  for (const h of hareketler) {
    const net = hareketNetEtkisi(h);
    netHareket += net;
    if (net > 0) giris += net;
    if (net < 0) cikis += Math.abs(net);
  }

  return {
    urunId: "",
    giris,
    cikis,
    netHareket,
    hareketSayisi: hareketler.length,
  };
}
