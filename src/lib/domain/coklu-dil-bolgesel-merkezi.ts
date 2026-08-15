export type Dil="tr-TR"|"en-US"|"ar-SA";
export type ParaBirimi="TRY"|"USD"|"EUR"|"GBP";
export type TarihFormati="DD.MM.YYYY"|"MM/DD/YYYY"|"YYYY-MM-DD";
export type SaatFormati="24H"|"12H";
export interface BolgeselAyar{
 dil:Dil;ulke:string;bolge:string;paraBirimi:ParaBirimi;
 tarihFormati:TarihFormati;saatFormati:SaatFormati;
 zamanDilimi:string;vergiSistemi:string;
}
export interface Ceviri{
 anahtar:string;deger:string;dil:Dil;
}
export function bolgeselAyarDogrula(a:BolgeselAyar){
 if(!a.dil||!a.ulke||!a.paraBirimi||!a.zamanDilimi)
  throw new Error("Bölgesel ayar alanları eksik.");
 return true;
}
export function ceviriBul(liste:Ceviri[],anahtar:string,dil:Dil){
 return liste.find(x=>x.anahtar===anahtar&&x.dil===dil)?.deger ?? anahtar;
}
export function paraBirimiSembol(p:ParaBirimi){
 return {TRY:"₺",USD:"$",EUR:"€",GBP:"£"}[p];
}
