/**
 * Şase numarası (VIN, 17 hane) çözme — sitede, internet gerektirmeden.
 *  - 1–3. hane (WMI): üretici / marka
 *  - 10. hane: model yılı (Avrupa üreticilerinde zorunlu değildir → "tahmini")
 *  - VW grubu (VW, Audi, Seat, Skoda): 7–8. hane model kodu (ör. 1K = Golf 5/6)
 *  - Mercedes-Benz: 4–6. hane kasa kodu (ör. 205 = W205 C serisi)
 * Ek bilgi (model, motor, yakıt) sunucudaki sase-coz fonksiyonu ile NHTSA'dan gelir.
 * Bu tablo kesin katalog değildir; parça seçiminde OEM / araç ruhsatı ile doğrulanmalıdır.
 */

export const VIN_DESEN = /^[A-HJ-NPR-Z0-9]{17}$/;
export const vinTemizle = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[IOQ]/g, (h) => (h === 'I' ? '1' : '0'));

/** WMI (ilk 3 hane, gerekirse ilk 2) → marka / üretim yeri */
const WMI: Record<string, [string, string?]> = {
  VF1: ['Renault', 'Fransa'], VF3: ['Peugeot', 'Fransa'], VF7: ['Citroën', 'Fransa'], VR3: ['Peugeot', 'Fransa'], VR7: ['Citroën', 'Fransa'], VR1: ['DS', 'Fransa'],
  VF6: ['Renault Trucks', 'Fransa'], VF8: ['Matra/Talbot', 'Fransa'], UU1: ['Dacia', 'Romanya'], UU6: ['Dacia', 'Romanya'], VGA: ['Renault', 'Fransa'],
  ZFA: ['Fiat', 'İtalya'], ZFC: ['Fiat', 'İtalya'], ZAR: ['Alfa Romeo', 'İtalya'], ZLA: ['Lancia', 'İtalya'], ZCF: ['Iveco', 'İtalya'], NM4: ['Fiat (Tofaş)', 'Türkiye'],
  ZFF: ['Ferrari', 'İtalya'], ZHW: ['Lamborghini', 'İtalya'], ZAM: ['Maserati', 'İtalya'], ZD4: ['Aprilia', 'İtalya'],
  WVW: ['Volkswagen', 'Almanya'], WV1: ['Volkswagen Ticari', 'Almanya'], WV2: ['Volkswagen Ticari', 'Almanya'], WV3: ['Volkswagen Ticari', 'Almanya'], WVG: ['Volkswagen SUV', 'Almanya'],
  '3VW': ['Volkswagen', 'Meksika'], '9BW': ['Volkswagen', 'Brezilya'], AAV: ['Volkswagen', 'Güney Afrika'],
  WAU: ['Audi', 'Almanya'], WA1: ['Audi SUV', 'Almanya'], WUA: ['Audi Sport', 'Almanya'], TRU: ['Audi', 'Macaristan'],
  TMB: ['Skoda', 'Çekya'], VSS: ['Seat', 'İspanya'], VS6: ['Ford', 'İspanya'], VSK: ['Nissan', 'İspanya'], VSX: ['Opel', 'İspanya'], VWV: ['Volkswagen', 'İspanya'],
  WDB: ['Mercedes-Benz', 'Almanya'], WDD: ['Mercedes-Benz', 'Almanya'], WDC: ['Mercedes-Benz SUV', 'Almanya'], WDF: ['Mercedes-Benz Ticari', 'Almanya'],
  WD3: ['Mercedes-Benz Ticari', 'Almanya'], WD4: ['Mercedes-Benz Ticari', 'Almanya'], W1K: ['Mercedes-Benz', 'Almanya'], W1N: ['Mercedes-Benz SUV', 'Almanya'], W1V: ['Mercedes-Benz Ticari', 'Almanya'],
  W1T: ['Mercedes-Benz Kamyon', 'Almanya'], NMB: ['Mercedes-Benz', 'Türkiye'],
  WBA: ['BMW', 'Almanya'], WBS: ['BMW M', 'Almanya'], WBX: ['BMW SUV', 'Almanya'], WBY: ['BMW i', 'Almanya'], WMW: ['Mini', 'İngiltere'], WP0: ['Porsche', 'Almanya'], WP1: ['Porsche SUV', 'Almanya'],
  W0L: ['Opel', 'Almanya'], W0V: ['Opel', 'Almanya'], VXK: ['Opel', 'Fransa/İspanya'], W0S: ['Opel', 'Almanya'],
  WF0: ['Ford', 'Almanya'], WF1: ['Ford', 'Almanya'], NM0: ['Ford (Otosan)', 'Türkiye'], SFA: ['Ford', 'İngiltere'], '1FA': ['Ford', 'ABD'], '1FT': ['Ford', 'ABD'],
  NMT: ['Toyota', 'Türkiye'], SB1: ['Toyota', 'İngiltere'], VNK: ['Toyota', 'Fransa'], JTD: ['Toyota', 'Japonya'], JTE: ['Toyota', 'Japonya'], JTN: ['Toyota', 'Japonya'], JTM: ['Toyota', 'Japonya'],
  JTF: ['Toyota', 'Japonya'], JTH: ['Lexus', 'Japonya'], AHT: ['Toyota', 'Güney Afrika'], MR0: ['Toyota', 'Tayland'], TW1: ['Toyota', 'Portekiz'],
  NLH: ['Hyundai (Assan)', 'Türkiye'], KMH: ['Hyundai', 'Kore'], TMA: ['Hyundai', 'Çekya'], MAL: ['Hyundai', 'Hindistan'], KMF: ['Hyundai Ticari', 'Kore'],
  KNA: ['Kia', 'Kore'], KNE: ['Kia', 'Kore'], KNC: ['Kia Ticari', 'Kore'], U5Y: ['Kia', 'Slovakya'], U6Y: ['Kia', 'Slovakya'],
  NLA: ['Honda', 'Türkiye'], JHM: ['Honda', 'Japonya'], SHH: ['Honda', 'İngiltere'], SHS: ['Honda', 'İngiltere'], JHL: ['Honda', 'Japonya'],
  SJN: ['Nissan', 'İngiltere'], JN1: ['Nissan', 'Japonya'], JN8: ['Nissan SUV', 'Japonya'], VNV: ['Nissan', 'Fransa'], MDH: ['Nissan', 'Hindistan'],
  JMZ: ['Mazda', 'Japonya'], JM1: ['Mazda', 'Japonya'], JS2: ['Suzuki', 'Japonya'], JSA: ['Suzuki', 'Japonya'], TSM: ['Suzuki', 'Macaristan'], MA3: ['Suzuki', 'Hindistan'],
  JMB: ['Mitsubishi', 'Japonya'], JMY: ['Mitsubishi', 'Japonya'], JA3: ['Mitsubishi', 'Japonya'], MMB: ['Mitsubishi', 'Tayland'], MMC: ['Mitsubishi', 'Tayland'],
  JAL: ['Isuzu', 'Japonya'], NNA: ['Isuzu (Anadolu)', 'Türkiye'], MPA: ['Isuzu', 'Tayland'], JF1: ['Subaru', 'Japonya'], JF2: ['Subaru', 'Japonya'],
  YV1: ['Volvo', 'İsveç'], YV4: ['Volvo SUV', 'İsveç'], YS3: ['Saab', 'İsveç'], SAL: ['Land Rover', 'İngiltere'], SAJ: ['Jaguar', 'İngiltere'], SCC: ['Lotus', 'İngiltere'],
  KL1: ['Chevrolet (Daewoo)', 'Kore'], KLA: ['Daewoo', 'Kore'], KLY: ['Daewoo', 'Kore'], XUU: ['Chevrolet', 'Rusya'], KPT: ['SsangYong', 'Kore'],
  LVV: ['Chery', 'Çin'], LGW: ['Great Wall', 'Çin'], LSG: ['SAIC/MG', 'Çin'], LSJ: ['MG', 'Çin'], LFV: ['FAW-VW', 'Çin'], LJ1: ['JAC', 'Çin'], LGX: ['BYD', 'Çin'], LC0: ['BYD', 'Çin'],
  LRW: ['Tesla', 'Çin'], '5YJ': ['Tesla', 'ABD'], XW8: ['Volkswagen', 'Rusya'], VLU: ['Scania', 'Hollanda'], XLR: ['DAF', 'Hollanda'], YS2: ['Scania', 'İsveç'],
  '1HG': ['Honda', 'ABD'], '2HG': ['Honda', 'Kanada'], '1G1': ['Chevrolet', 'ABD'], '2T1': ['Toyota', 'Kanada'], '4T1': ['Toyota', 'ABD'],
  NMH: ['Honda', 'Türkiye'], NMC: ['BMC', 'Türkiye'], NMA: ['Temsa', 'Türkiye'], NLN: ['Karsan', 'Türkiye'], NP8: ['Otokar', 'Türkiye'],
};

/** VW grubu 7–8. hane model kodları → model adı + Ürün Ara'da kullanılacak arama sözcükleri */
const VAG_MODEL: Record<string, Record<string, [string, string[]]>> = {
  VW: {
    '1H': ['Golf 3 / Vento', ['GOLF 3', 'VENTO']], '1J': ['Golf 4 / Bora', ['GOLF 4', 'BORA']], '1K': ['Golf 5 / Golf 6 / Jetta', ['GOLF 5', 'GOLF 6', 'JETTA']],
    '5K': ['Golf 6', ['GOLF 6']], '5M': ['Golf Plus', ['GOLF PLUS']], AU: ['Golf 7', ['GOLF 7']], '5G': ['Golf 7', ['GOLF 7']], BA: ['Golf 7 (2017+)', ['GOLF 7']], CD: ['Golf 8', ['GOLF 8']],
    '16': ['Jetta 6', ['JETTA']], BU: ['Jetta 7', ['JETTA']], '3B': ['Passat B5', ['PASSAT B5', 'PASSAT']], '3C': ['Passat B6 / B7 / CC', ['PASSAT B6', 'PASSAT B7', 'PASSAT CC']],
    '36': ['Passat B7', ['PASSAT B7']], '3G': ['Passat B8', ['PASSAT B8']], '35': ['Passat CC', ['PASSAT CC']], '9N': ['Polo 4', ['POLO']], '6R': ['Polo 5', ['POLO']], '6C': ['Polo 5 (2014+)', ['POLO']],
    AW: ['Polo 6', ['POLO']], '2K': ['Caddy 3 / 4', ['CADDY']], SA: ['Caddy 5', ['CADDY']], SB: ['Caddy 5', ['CADDY']], '7H': ['Transporter T5', ['TRANSPORTER', 'T5']],
    '7E': ['Transporter T5 / T6', ['TRANSPORTER', 'T5', 'T6']], SG: ['Transporter T6', ['TRANSPORTER', 'T6']], '2E': ['Crafter', ['CRAFTER']], SY: ['Crafter 2', ['CRAFTER']], SZ: ['Crafter 2', ['CRAFTER']],
    '1T': ['Touran', ['TOURAN']], '5T': ['Touran 2', ['TOURAN']], '5N': ['Tiguan', ['TIGUAN']], AD: ['Tiguan 2', ['TIGUAN']], BJ: ['Tiguan 2', ['TIGUAN']], '7L': ['Touareg', ['TOUAREG']],
    '7P': ['Touareg 2', ['TOUAREG']], '2H': ['Amarok', ['AMAROK']], '13': ['Scirocco', ['SCIROCCO']], '1Y': ['New Beetle Cabrio', ['BEETLE']], '9C': ['New Beetle', ['BEETLE']], '5C': ['Beetle', ['BEETLE']],
    A1: ['T-Roc', ['T-ROC', 'T ROC']], AC: ['T-Roc', ['T-ROC', 'T ROC']], C1: ['T-Cross', ['T-CROSS', 'T CROSS']], '7N': ['Sharan 2', ['SHARAN']], '7M': ['Sharan', ['SHARAN']], '1S': ['Up', ['UP']],
  },
  AUDI: {
    '8L': ['A3 (8L)', ['A3']], '8P': ['A3 (8P)', ['A3']], '8V': ['A3 (8V)', ['A3']], '8Y': ['A3 (8Y)', ['A3']], '8E': ['A4 B6 / B7', ['A4']], '8K': ['A4 B8', ['A4']], '8W': ['A4 B9', ['A4']],
    '8T': ['A5', ['A5']], F5: ['A5 (2017+)', ['A5']], '4B': ['A6 C5', ['A6']], '4F': ['A6 C6', ['A6']], '4G': ['A6 C7', ['A6']], '4K': ['A6 C8', ['A6']], '8X': ['A1', ['A1']], GB: ['A1 (2018+)', ['A1']],
    '8U': ['Q3', ['Q3']], F3: ['Q3 (2018+)', ['Q3']], '8R': ['Q5', ['Q5']], FY: ['Q5 (2017+)', ['Q5']], '4L': ['Q7', ['Q7']], '4M': ['Q7 (2015+)', ['Q7']], '8J': ['TT', ['TT']],
  },
  SKODA: {
    '1U': ['Octavia 1', ['OCTAVIA']], '1Z': ['Octavia 2', ['OCTAVIA 2', 'OCTAVIA']], '5E': ['Octavia 3', ['OCTAVIA 3', 'OCTAVIA']], NX: ['Octavia 4', ['OCTAVIA']],
    '6Y': ['Fabia 1', ['FABIA']], '5J': ['Fabia 2 / Roomster', ['FABIA', 'ROOMSTER']], NJ: ['Fabia 3', ['FABIA']], PJ: ['Fabia 4', ['FABIA']], '3U': ['Superb 1', ['SUPERB']],
    '3T': ['Superb 2', ['SUPERB']], '3V': ['Superb 3', ['SUPERB']], NH: ['Rapid', ['RAPID']], '5L': ['Yeti', ['YETI']], NS: ['Kodiaq', ['KODIAQ']], NU: ['Karoq', ['KAROQ']], NW: ['Scala / Kamiq', ['SCALA', 'KAMIQ']],
  },
  SEAT: {
    '1M': ['Leon 1 / Toledo 2', ['LEON', 'TOLEDO']], '1P': ['Leon 2', ['LEON']], '5F': ['Leon 3', ['LEON']], KL: ['Leon 4', ['LEON']], '6K': ['Ibiza 2 / Cordoba', ['IBIZA', 'CORDOBA']],
    '6L': ['Ibiza 3 / Cordoba', ['IBIZA', 'CORDOBA']], '6J': ['Ibiza 4', ['IBIZA']], KJ: ['Ibiza 5 / Arona', ['IBIZA', 'ARONA']], '5P': ['Altea / Toledo 3', ['ALTEA', 'TOLEDO']], NH: ['Toledo 4', ['TOLEDO']],
    KH: ['Ateca', ['ATECA']], '7N': ['Alhambra', ['ALHAMBRA']],
  },
};
const VAG_GRUP: Record<string, keyof typeof VAG_MODEL> = { WVW: 'VW', WV1: 'VW', WV2: 'VW', WV3: 'VW', WVG: 'VW', '3VW': 'VW', '9BW': 'VW', VWV: 'VW', AAV: 'VW', XW8: 'VW', WAU: 'AUDI', WA1: 'AUDI', TRU: 'AUDI', TMB: 'SKODA', VSS: 'SEAT' };

/** Mercedes-Benz: 4–6. hane kasa kodu (W205 = C serisi). Dükkanda parçalar bu kodla aranır. */
const MB_KASA: Record<string, string> = {
  '168': 'A (W168)', '169': 'A (W169)', '176': 'A (W176)', '177': 'A (W177)', '245': 'B (W245)', '246': 'B (W246)', '247': 'B (W247)', '117': 'CLA (C117)', '118': 'CLA (C118)', '156': 'GLA (X156)',
  '202': 'C (W202)', '203': 'C (W203)', '204': 'C (W204)', '205': 'C (W205)', '206': 'C (W206)', '210': 'E (W210)', '211': 'E (W211)', '212': 'E (W212)', '213': 'E (W213)', '207': 'E Coupé (C207)',
  '220': 'S (W220)', '221': 'S (W221)', '222': 'S (W222)', '163': 'ML (W163)', '164': 'ML (W164)', '166': 'ML / GLE (W166)', '167': 'GLE (V167)', '204X': 'GLK', '253': 'GLC (X253)', '254': 'GLC (X254)',
  '209': 'CLK (C209)', '208': 'CLK (C208)', '219': 'CLS (C219)', '218': 'CLS (C218)', '171': 'SLK (R171)', '172': 'SLK (R172)', '414': 'Vaneo', '415': 'Citan', '420': 'Citan 2',
  '638': 'Vito (W638)', '639': 'Vito / Viano (W639)', '447': 'Vito / V (W447)', '901': 'Sprinter (T1N)', '902': 'Sprinter (T1N)', '903': 'Sprinter (T1N)', '904': 'Sprinter (T1N)',
  '906': 'Sprinter (906)', '907': 'Sprinter (907)', '910': 'Sprinter (910)', '970': 'Atego', '930': 'Actros', '934': 'Actros', '963': 'Actros (2012+)',
};
const MB_WMI = new Set(['WDB', 'WDD', 'WDC', 'WDF', 'WD3', 'WD4', 'W1K', 'W1N', 'W1V', 'W1T', 'NMB']);

/** 10. hane → model yılı (30 yıllık döngü: gelecekteki en yakın yıl seçilmez) */
const YIL_HARF = 'ABCDEFGHJKLMNPRSTVWXY123456789';
export function modelYili(h: string): number | null {
  const i = YIL_HARF.indexOf(h); if (i < 0) return null;
  const sinir = new Date().getFullYear() + 1;
  let y = 1980 + i; while (y + 30 <= sinir) y += 30;
  return y;
}

/** Kuzey Amerika kontrol hanesi (9. hane). Avrupa araçlarında genelde kullanılmaz; yalnız bilgi amaçlı. */
export function kontrolHanesi(vin: string): boolean {
  const deger = (c: string) => (/\d/.test(c) ? Number(c) : 'ABCDEFGH'.includes(c) ? 'ABCDEFGH'.indexOf(c) + 1 : 'JKLMN'.includes(c) ? 'JKLMN'.indexOf(c) + 1 : c === 'P' ? 7 : c === 'R' ? 9 : 'STUVWXYZ'.indexOf(c) + 2);
  const agirlik = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const t = [...vin].reduce((s, c, i) => s + deger(c) * agirlik[i], 0) % 11;
  return vin[8] === (t === 10 ? 'X' : String(t));
}

export interface VinCozum {
  vin: string; gecerli: boolean; hata?: string;
  wmi: string; marka: string | null; ulke: string | null;
  yil: number | null; yilKesin: boolean;
  model: string | null; modelKod: string | null; aramaSozcukleri: string[];
  seriNo: string;
}

export function vinCoz(girdi: string): VinCozum {
  const vin = vinTemizle(girdi);
  const bos: VinCozum = { vin, gecerli: false, wmi: vin.slice(0, 3), marka: null, ulke: null, yil: null, yilKesin: false, model: null, modelKod: null, aramaSozcukleri: [], seriNo: vin.slice(11) };
  if (vin.length !== 17) return { ...bos, hata: `Şase numarası 17 hane olmalı (${vin.length} hane girildi)` };
  if (!VIN_DESEN.test(vin)) return { ...bos, hata: 'Geçersiz karakter var' };
  const wmi = vin.slice(0, 3);
  const w = WMI[wmi] ?? null;
  const yil = modelYili(vin[9]);
  // Kuzey Amerika (1-5) araçlarında kontrol hanesi tutuyorsa yıl kesindir; VW grubu 10. haneyi düzenli kullanır
  const kuzeyAmerika = /^[1-5]/.test(vin);
  const yilKesin = (kuzeyAmerika && kontrolHanesi(vin)) || !!VAG_GRUP[wmi];
  let model: string | null = null, modelKod: string | null = null, arama: string[] = [];
  const grup = VAG_GRUP[wmi];
  if (grup) { modelKod = vin.slice(6, 8); const m = VAG_MODEL[grup][modelKod]; if (m) { model = m[0]; arama = m[1]; } }
  else if (MB_WMI.has(wmi)) {
    modelKod = vin.slice(3, 6); const m = MB_KASA[modelKod];
    if (m) { model = m; const w = /\(([A-Z]?)(\d{3})\)/.exec(m); arama = [`W${modelKod}`, ...(w && w[1] && w[1] !== 'W' ? [`${w[1]}${w[2]}`] : []), ...(/sprinter/i.test(m) ? ['SPRINTER'] : /vito/i.test(m) ? ['VITO'] : [])]; }
  }
  return { ...bos, gecerli: true, wmi, marka: w?.[0] ?? null, ulke: w?.[1] ?? null, yil, yilKesin, model, modelKod, aramaSozcukleri: arama };
}

/** Markanın Ürün Ara'da geçen yaygın yazımı (ürün adlarında "VW", "MERCEDES", "FIAT" gibi) */
export function markaArama(marka: string | null): string | null {
  if (!marka) return null;
  const m = marka.toLocaleUpperCase('tr').replace(/\s*\(.*\)/, '');
  if (m.startsWith('VOLKSWAGEN')) return 'VW';
  if (m.startsWith('MERCEDES')) return 'MERCEDES';
  if (m.startsWith('AUDI')) return 'AUDI';
  return m.split(/[\s-]/)[0];
}
