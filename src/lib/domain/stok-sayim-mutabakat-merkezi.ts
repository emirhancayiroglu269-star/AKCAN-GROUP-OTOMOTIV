export type SayimDurumu="TASLAK"|"SAYIMDA"|"FARK_INCELEME"|"ONAY_BEKLIYOR"|"ONAYLANDI"|"KAPATILDI"|"IPTAL";
export type FarkTipi="EKSIK"|"FAZLA"|"ESIT";

export interface Sayim{
 id:string;depoId:string;rafKodu?:string;durum:SayimDurumu;
 baslatanId:string;baslangic:string;bitis?:string;
}

export interface SayimKalemi{
 id:string;sayimId:string;urunId:string;stokKodu?:string;
 sistemAdedi:number;fizikiAdedi?:number;fark?:number;
 farkTipi?:FarkTipi;sayanId?:string;sayimTarihi?:string;
}

export interface StokDuzeltme{
 id:string;sayimKalemId:string;urunId:string;
 eskiAdet:number;yeniAdet:number;fark:number;
 onaylayanId:string;tarih:string;aciklama?:string;
}

export function sayimFarki(sistem:number,fiziki:number){
 return fiziki-sistem;
}

export function farkTipi(fark:number):FarkTipi{
 if(fark<0)return "EKSIK";
 if(fark>0)return "FAZLA";
 return "ESIT";
}

export function stokDuzeltmeGerekir(k:SayimKalemi){
 return k.fizikiAdedi!==undefined && k.fizikiAdedi!==k.sistemAdedi;
}

export function sayimIdempotency(depoId:string,rafKodu:string,urunId:string){
 return `${depoId}:${rafKodu}:${urunId}`;
}
