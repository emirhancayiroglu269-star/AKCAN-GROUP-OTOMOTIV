import type {
  SatisKaydi,
  OdemeHareketi,
  StokHareketi,
  CariHareketi,
  KasaBankaHareketi,
} from "./erp-domain-models";
import { idempotencyKey, idempotentHareketId } from "./idempotency";

export interface FinansZinciriPlan {
  satis: SatisKaydi;
  odemeler: OdemeHareketi[];
  stok: StokHareketi[];
  cari: CariHareketi[];
  hesap: KasaBankaHareketi[];
}

export function finansZinciriIdempotency(
  plan: FinansZinciriPlan
): {
  key: string;
  hareketIdleri: string[];
} {
  const key = idempotencyKey("satis-finans-zinciri", plan.satis.id);

  const hareketIdleri = [
    ...plan.odemeler.map((x) =>
      idempotentHareketId("odeme", plan.satis.id, x.id || x.yontem)
    ),
    ...plan.stok.map((x) =>
      idempotentHareketId("stok", plan.satis.id, x.urunId)
    ),
    ...plan.cari.map((x) =>
      idempotentHareketId("cari", plan.satis.id, x.cariId)
    ),
    ...plan.hesap.map((x) =>
      idempotentHareketId("hesap", plan.satis.id, x.hesapId)
    ),
  ];

  return { key, hareketIdleri };
}
