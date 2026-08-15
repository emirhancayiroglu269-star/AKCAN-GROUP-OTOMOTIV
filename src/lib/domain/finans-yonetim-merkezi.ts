export type FinansHesabiTipi="KASA"|"BANKA"|"POS";
export type FinansHareketTipi="TAHSILAT"|"ODEME"|"GELIR"|"GIDER"|"TRANSFER";
export interface FinansHesabi{
 id:string;tip:FinansHesabiTipi;ad:string;paraBirimi:string;
 bakiye:number;aktif:boolean;
}
export interface FinansHareket{
 id:string;hesapId:string;tip:FinansHareketTipi;
 tutar:number;tarih:string;referansId:string;
}
export interface FinansOzet{toplamKasa:number;toplamBanka:number;toplamPos:number;net:number}
export function finansOzet(hesaplar:FinansHesabi[]):FinansOzet{
 const toplamKasa=hesaplar.filter(x=>x.tip==="KASA").reduce((t,x)=>t+x.bakiye,0);
 const toplamBanka=hesaplar.filter(x=>x.tip==="BANKA").reduce((t,x)=>t+x.bakiye,0);
 const toplamPos=hesaplar.filter(x=>x.tip==="POS").reduce((t,x)=>t+x.bakiye,0);
 return {toplamKasa,toplamBanka,toplamPos,net:toplamKasa+toplamBanka+toplamPos};
}
export function finansHareketKontrol(tutar:number){
 if(!Number.isFinite(tutar)||tutar<=0) throw new Error("Tutar sıfırdan büyük olmalı.");
}
export function finansIdempotency(hesapId:string,referansId:string,tip:FinansHareketTipi){
 return `${hesapId}:${referansId}:${tip}`;
}
