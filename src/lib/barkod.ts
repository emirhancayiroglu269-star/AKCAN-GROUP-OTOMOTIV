/** Bağımsız Code 128 barkod üretici (ek paket gerektirmez). Sadece rakamlardan oluşan kodlar Code C ile sıkıştırılır. */
const W = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
  '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
  '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
  '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
  '114131 311141 411131 211412 211214 211232 2331112').split(' ');
const START_B = 104, START_C = 105, CODE_C = 99, STOP = 106;

/** Barkod değerini kod listesine çevirir (checksum dahil, stop hariç) */
function kodla(deger: string): number[] {
  const s = [...deger].filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).join('');
  const kodlar: number[] = [];
  if (/^\d{4,}$/.test(s)) {
    let i = 0;
    if (s.length % 2) { kodlar.push(START_B, s.charCodeAt(0) - 32, CODE_C); i = 1; } else kodlar.push(START_C);
    for (; i < s.length; i += 2) kodlar.push(Number(s.slice(i, i + 2)));
  } else {
    kodlar.push(START_B, ...[...s].map((c) => c.charCodeAt(0) - 32));
  }
  const toplam = kodlar.reduce((t, k, i) => t + k * (i === 0 ? 1 : i), 0);
  kodlar.push(toplam % 103);
  return kodlar;
}

/** Modül dizisi: "1" siyah, "0" beyaz */
export function code128(deger: string): string {
  return [...kodla(deger), STOP].map((k) => W[k].split('').map((w, i) => (i % 2 ? '0' : '1').repeat(Number(w))).join('')).join('');
}

/** SVG çizimi; genislik/yukseklik mm cinsinden, sessiz bölge dahil */
export function barkodSvg(deger: string, genislikMm: number, yukseklikMm: number) {
  const m = code128(deger);
  const sessiz = 10;
  const toplam = m.length + sessiz * 2;
  let d = '';
  for (let i = 0; i < m.length; ) {
    if (m[i] === '1') { let j = i; while (m[j] === '1') j++; d += `M${i + sessiz} 0h${j - i}v1h-${j - i}z`; i = j; } else i++;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${toplam} 1" preserveAspectRatio="none" width="${genislikMm}mm" height="${yukseklikMm}mm" shape-rendering="crispEdges"><path d="${d}" fill="#000"/></svg>`;
}
