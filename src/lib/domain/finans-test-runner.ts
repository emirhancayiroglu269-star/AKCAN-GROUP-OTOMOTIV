import {
  STANDART_SENARYOLAR,
  senaryoDogrula,
  type SenaryoBeklentisi,
  type SenaryoSonucu,
} from "./finans-senaryo-testleri";

export interface TestRaporu {
  toplam: number;
  basarili: number;
  basarisiz: number;
  sonuc: SenaryoSonucu[];
}

function ornekGercek(b: SenaryoBeklentisi) {
  // Runner'ın deterministik demo girdisidir.
  // Üretim verisine veya Supabase'e yazmaz.
  return {
    satis: b.satis,
    odeme: b.odeme,
    stokDelta: b.stokDelta,
    cariDelta: b.cariDelta,
    hesapDelta: b.hesapDelta,
    kdv: b.kdv,
    maliyet: b.maliyet,
    brutKar: b.brutKar,
    tekrarIslemEngellendi: b.tekrarIslemEngellenmeli === true,
  };
}

export function finansSenaryolariniCalistir(): TestRaporu {
  const sonuc = STANDART_SENARYOLAR.map((beklenen) =>
    senaryoDogrula(beklenen, ornekGercek(beklenen))
  );

  return {
    toplam: sonuc.length,
    basarili: sonuc.filter((x) => x.ok).length,
    basarisiz: sonuc.filter((x) => !x.ok).length,
    sonuc,
  };
}
