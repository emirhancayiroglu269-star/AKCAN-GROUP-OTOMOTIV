export interface StokKart{
 urunId:string;stokKodu:string;urunAdi:string;
 barkod?:string;oemKodlari:string[];
 kritikSeviye:number;minimumStok:number;
}
export interface DepoStok{
 urunId:string;depoId:string;rafId?:string;
 mevcut:number;rezerve:number;
}
export interface StokHareket{
 urunId:string;depoId:string;tip:"ALIS"|"SATIS"|"IADE"|"TRANSFER"|"SAYIM";
 miktar:number;birimMaliyet?:number;referansId:string;
}
export function kullanilabilirStok(x:DepoStok){return Math.max(0,x.mevcut-x.rezerve);}
export function kritikStokMu(k:StokKart,x:DepoStok){
 return kullanilabilirStok(x)<=k.kritikSeviye;
}
export function stokDegeri(x:DepoStok,birimMaliyet:number){
 return Math.max(0,x.mevcut)*Math.max(0,birimMaliyet);
}
export function stokHareketIdempotency(referansId:string,urunId:string,depoId:string){
 return `${referansId}:${urunId}:${depoId}`;
}
