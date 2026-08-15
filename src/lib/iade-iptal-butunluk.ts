export interface IadeIptalButunluk {
  satisToplami: number;
  iadeToplami: number;
  stokGeriGiris: number;
  finansGeriDonus: number;
  tolerans?: number;
}

function para(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/**
 * İade/iptal sonrası satışın ters kaydının temel tutarlılık kontrolü.
 * Bu fonksiyon muhasebe kaydı oluşturmaz; yalnızca yan etki öncesi invariant kontrolü yapar.
 */
export function iadeIptalButunlukKontrolu(input: IadeIptalButunluk): {
  ok: boolean;
  farklar: { satis: number; stok: number; finans: number };
  mesaj?: string;
} {
  const satis = para(input.satisToplami);
  const iade = para(input.iadeToplami);
  const stok = para(input.stokGeriGiris);
  const finans = para(input.finansGeriDonus);
  const tolerans = Math.max(0.01, para(input.tolerans ?? 0.01));

  if (iade < 0 || stok < 0 || finans < 0) {
    return {
      ok: false,
      farklar: { satis: 0, stok: 0, finans: 0 },
      mesaj: "İade, stok geri giriş veya finans geri dönüş tutarı negatif olamaz.",
    };
  }

  const satisFarki = Math.abs(iade - satis);
  const stokFarki = Math.abs(stok - iade);
  const finansFarki = Math.abs(finans - iade);

  const ok = satisFarki <= tolerans &&
    stokFarki <= tolerans &&
    finansFarki <= tolerans;

  return {
    ok,
    farklar: {
      satis: Math.round(satisFarki * 100) / 100,
      stok: Math.round(stokFarki * 100) / 100,
      finans: Math.round(finansFarki * 100) / 100,
    },
    ...(ok ? {} : {
      mesaj: "İade/iptal tutarı ile stok ve finans ters hareketleri eşleşmiyor.",
    }),
  };
}
