export type ImportTipi="URUN"|"MUSTERI"|"TEDARIKCI";
export interface ImportSatiri{satirNo:number;alanlar:Record<string,string>}
export interface ImportHatasi{satirNo:number;alan:string;mesaj:string}
const zorunlu:Record<ImportTipi,string[]>={
 URUN:["stokKodu","urunAdi"],MUSTERI:["cariKodu","unvan"],TEDARIKCI:["cariKodu","unvan"]
};
export function satirDogrula(t:ImportTipi,s:ImportSatiri):ImportHatasi[]{
 return zorunlu[t].filter(a=>!s.alanlar[a]?.trim()).map(a=>({satirNo:s.satirNo,alan:a,mesaj:"Zorunlu alan boş."}));
}
export function onIzleme(t:ImportTipi,satirlar:ImportSatiri[]){
 const hatalar=satirlar.flatMap(s=>satirDogrula(t,s));
 const hatali=new Set(hatalar.map(h=>h.satirNo));
 return {tip:t,toplam:satirlar.length,basarili:satirlar.length-hatali.size,hatali:hatali.size,hatalar};
}
export function duplicateAnahtari(t:ImportTipi,s:ImportSatiri){
 return t==="URUN"?`URUN:${s.alanlar.stokKodu?.trim()}`:`${t}:${s.alanlar.cariKodu?.trim()}`;
}
