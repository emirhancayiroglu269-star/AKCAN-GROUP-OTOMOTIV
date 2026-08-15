export interface TedarikciPerformans{
 tedarikciId:string;donem:string;toplamSiparis:number;
 zamanindaTeslim:number;gecTeslim:number;eksikTeslim:number;
 fiyatSapmasiToplam:number;kaliteSorunu:number;
 toplamAlimTutari:number;puan:number;
}
export interface TedarikciKriterleri{
 zamanindaAgirlik:number;eksikTeslimAgirlik:number;
 fiyatAgirlik:number;kaliteAgirlik:number;
}
export function zamanindaOrani(p:TedarikciPerformans){
 return p.toplamSiparis<=0?0:(p.zamanindaTeslim/p.toplamSiparis)*100;
}
export function eksikTeslimOrani(p:TedarikciPerformans){
 return p.toplamSiparis<=0?0:(p.eksikTeslim/p.toplamSiparis)*100;
}
export function kaliteSorunOrani(p:TedarikciPerformans){
 return p.toplamSiparis<=0?0:(p.kaliteSorunu/p.toplamSiparis)*100;
}
export function tedarikciPuan(
 zamaninda:number,eksik:number,fiyat:number,kalite:number,k:TedarikciKriterleri
){
 return zamaninda*k.zamanindaAgirlik +
   (100-eksik)*k.eksikTeslimAgirlik +
   (100-fiyat)*k.fiyatAgirlik +
   (100-kalite)*k.kaliteAgirlik;
}
export function performansIdempotency(tedarikciId:string,donem:string){
 return `${tedarikciId}:${donem}`;
}
