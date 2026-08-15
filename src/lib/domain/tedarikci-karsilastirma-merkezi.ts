export interface TedarikciTeklif{
 tedarikciId:string;urunId:string;birimFiyat:number;iskontoOrani:number;
 vadeGun:number;teslimGun:number;performansPuani:number;
 minimumSiparisMiktari?:number;
}
export interface TedarikciSkor{
 tedarikciId:string;netBirimFiyat:number;vadeSkoru:number;
 teslimSkoru:number;performansSkoru:number;toplamSkor:number;
 onerilen:boolean;
}
export interface KarsilastirmaAgirliklari{
 fiyat:number;vade:number;teslim:number;performans:number;
}
export function netBirimFiyat(t:TedarikciTeklif){
 return t.birimFiyat*(1-t.iskontoOrani/100);
}
export function normalize(value:number,min:number,max:number){
 if(max===min)return 100;
 return ((value-min)/(max-min))*100;
}
export function maliyetSkoru(net:number,minNet:number,maxNet:number){
 return 100-normalize(net,minNet,maxNet);
}
export function teslimSkoru(gun:number,minGun:number,maxGun:number){
 return 100-normalize(gun,minGun,maxGun);
}
export function tedarikciToplamSkor(
 fiyat:number,vade:number,teslim:number,performans:number,a:KarsilastirmaAgirliklari
){
 return fiyat*a.fiyat+vade*a.vade+teslim*a.teslim+performans*a.performans;
}
export function karsilastirmaIdempotency(urunId:string,donem:string){
 return `${urunId}:${donem}`;
}
