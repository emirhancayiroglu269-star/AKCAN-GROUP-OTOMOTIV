export interface AlisKalemi {
  urunId: string;
  stokKodu?: string;
  miktar: number;
  birimFiyat: number;
  kdvOrani?: number;
  kdvTutari?: number;
  toplam?: number;
}

export interface AlisKaydi {
  id: string;
  tarih: string;
  tedarikciId?: string | null;
  kalemler: AlisKalemi[];
  araToplam?: number;
  kdv?: number;
  genelToplam: number;
  durum?: string;
}

export interface TedarikciHareketi {
  id: string;
  tedarikciId: string;
  tarih: string;
  tur: "borc" | "odeme" | "iade" | "duzeltme" | string;
  tutar: number;
  referansId: string;
}

export interface AlisHesapHareketi {
  id: string;
  hesapId: string;
  hesapTuru: "kasa" | "banka" | "pos" | string;
  tarih: string;
  tur: "odeme" | "iade" | "transfer" | string;
  tutar: number;
  referansId: string;
}

export interface AlisStokHareketi {
  id: string;
  urunId: string;
  tarih: string;
  miktar: number;
  birimMaliyet: number;
  referansId: string;
}

const para = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export function alisToplamiHesapla(kalemler: AlisKalemi[]) {
  return para(kalemler.reduce(
    (t, k) => t + Math.max(0, para(k.miktar)) * Math.max(0, para(k.birimFiyat)),
    0
  ));
}

export function alisStokHareketleri(alis: AlisKaydi): AlisStokHareketi[] {
  return alis.kalemler.map((k) => ({
    id: `${alis.id}:stok:${k.urunId}`,
    urunId: k.urunId,
    tarih: alis.tarih,
    miktar: Math.abs(k.miktar),
    birimMaliyet: para(k.birimFiyat),
    referansId: alis.id,
  }));
}

export function tedarikciBorcHareketi(
  alis: AlisKaydi
): TedarikciHareketi | null {
  if (!alis.tedarikciId || alis.genelToplam <= 0) return null;
  return {
    id: `${alis.id}:tedarikci:${alis.tedarikciId}`,
    tedarikciId: alis.tedarikciId,
    tarih: alis.tarih,
    tur: "borc",
    tutar: Math.abs(alis.genelToplam),
    referansId: alis.id,
  };
}

export function alisOdemeHareketi(
  alis: AlisKaydi,
  hesapId: string,
  hesapTuru: "kasa" | "banka" | "pos",
  tutar: number
): AlisHesapHareketi {
  return {
    id: `${alis.id}:odeme:${hesapId}`,
    hesapId,
    hesapTuru,
    tarih: alis.tarih,
    tur: "odeme",
    tutar: -Math.abs(para(tutar)),
    referansId: alis.id,
  };
}

export function alisZinciriKontrolu(
  alis: AlisKaydi,
  tedarikciHareketi: TedarikciHareketi | null,
  hesapHareketleri: AlisHesapHareketi[]
) {
  const kalemToplami = alisToplamiHesapla(alis.kalemler);
  const toplamOdeme = para(
    hesapHareketleri.reduce((t, h) => t + Math.abs(h.tutar), 0)
  );

  if (!alis.id) return { ok: false, hata: "Alış ID eksik." };
  if (alis.genelToplam < 0 || !Number.isFinite(alis.genelToplam)) {
    return { ok: false, hata: "Alış toplamı geçersiz." };
  }
  if (kalemToplami > alis.genelToplam + 0.01) {
    return { ok: false, hata: "Alış kalem toplamı belge toplamını aşıyor." };
  }
  if (tedarikciHareketi && Math.abs(tedarikciHareketi.tutar - alis.genelToplam) > 0.01) {
    return { ok: false, hata: "Tedarikçi borcu alış toplamıyla eşleşmiyor." };
  }
  if (toplamOdeme > alis.genelToplam + 0.01) {
    return { ok: false, hata: "Alış ödeme toplamı belge toplamını aşıyor." };
  }

  return { ok: true };
}
