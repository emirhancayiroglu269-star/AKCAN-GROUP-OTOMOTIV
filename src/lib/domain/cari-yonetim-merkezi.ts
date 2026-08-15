export type CariTipi="MUSTERI"|"TEDARIKCI";
export type CariHareketTipi="SATIS"|"ALIS"|"TAHSILAT"|"ODEME"|"IADE"|"DEVIR";
export interface CariKart{
 id:string;tip:CariTipi;unvan:string;vergiNo?:string;
 telefon?:string;vadeGun:number;limit:number;aktif:boolean;
}
export interface CariHareket{
 id:string;cariId:string;tip:CariHareketTipi;tarih:string;
 borc:number;alacak:number;referansId:string;
}
export interface CariOzet{borc:number;alacak:number;bakiye:number;risk:number}
export function cariOzet(h:CariHareket[], limit=0):CariOzet{
 const borc=h.reduce((t,x)=>t+x.borc,0), alacak=h.reduce((t,x)=>t+x.alacak,0);
 const bakiye=borc-alacak;
 return {borc,alacak,bakiye,risk:Math.max(0,bakiye-limit)};
}
export function tahsilatUygula(h:CariHareket, tutar:number):CariHareket{
 if(tutar<=0) throw new Error("Tahsilat tutarı sıfırdan büyük olmalı.");
 if(tutar>h.borc) throw new Error("Tahsilat borç bakiyesini aşamaz.");
 return {...h,alacak:h.alacak+tutar};
}
export function vadeTarihi(tarih:string,vadeGun:number){
 const d=new Date(tarih); d.setDate(d.getDate()+Math.max(0,vadeGun));
 return d.toISOString().slice(0,10);
}
export function cariHareketIdempotency(cariId:string,referansId:string,tip:CariHareketTipi){
 return `${cariId}:${referansId}:${tip}`;
}
