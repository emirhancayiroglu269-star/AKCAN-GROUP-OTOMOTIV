export type MaliyetYontemi="SON_ALIS"|"AGIRLIKLI_ORTALAMA"|"FIFO";
export interface MaliyetHareketi{
 id:string;urunId:string;miktar:number;birimMaliyet:number;
 tip:"ALIS"|"IADE_ALIS"|"DUZELTME";tarih:string;referansId?:string;
}
export interface KarlilikAnalizi{
 urunId:string;maliyet:number;satisFiyati:number;
 iskontoOrani:number;netSatisFiyati:number;karTutari:number;karMarji:number;
}
export interface MaliyetKurali{
 yontem:MaliyetYontemi;minimumKarMarji:number;
 maliyetAltinaSatisEngelle:boolean;
}
export function netSatisFiyati(satisFiyati:number,iskontoOrani:number){
 return satisFiyati*(1-iskontoOrani/100);
}
export function karTutari(net:number,maliyet:number){
 return net-maliyet;
}
export function karMarji(net:number,maliyet:number){
 if(net<=0)return -100;
 return ((net-maliyet)/net)*100;
}
export function maliyetAltinaSatis(net:number,maliyet:number){
 return net<maliyet;
}
export function maliyetHareketIdempotency(tip:string,referansId:string,urunId:string){
 return `${tip}:${referansId}:${urunId}`;
}
