export type TeklifDurumu="TASLAK"|"ONAY_BEKLIYOR"|"ONAYLANDI"|"GONDERILDI"|"KABUL_EDILDI"|"REDDEDILDI"|"SATISA_DONUSTU"|"IPTAL";
export interface TeklifKalemi{
 id:string;urunId:string;aciklama:string;miktar:number;
 maliyet:number;birimFiyat:number;iskontoOrani:number;kdvOrani:number;
}
export interface Teklif{
 id:string;musteriId:string;durum:TeklifDurumu;
 kalemler:TeklifKalemi[];gecerlilikTarihi?:string;
 toplamAra:number;toplamIskonto:number;toplamKdv:number;genelToplam:number;
 olusturanId:string;onaylayanId?:string;
}
export interface FiyatKontrolKurali{
 minimumKarMarji:number;maliyetAltiSatisEngelle:boolean;
 onayGerekenIskontoOrani?:number;
}
export function kalemNetBirimFiyat(k:TeklifKalemi){
 return k.birimFiyat*(1-k.iskontoOrani/100);
}
export function kalemKarMarji(k:TeklifKalemi){
 const net=kalemNetBirimFiyat(k);
 if(net<=0)return -100;
 return ((net-k.maliyet)/net)*100;
}
export function fiyatKontrol(k:TeklifKalemi,r:FiyatKontrolKurali){
 const net=kalemNetBirimFiyat(k);
 const marj=kalemKarMarji(k);
 return {
  maliyetAlti:r.maliyetAltiSatisEngelle && net<k.maliyet,
  minimumMarjIhlali:marj<r.minimumKarMarji,
  onayGerekli:r.onayGerekenIskontoOrani!==undefined &&
    k.iskontoOrani>=r.onayGerekenIskontoOrani
 };
}
export function teklifIdempotency(musteriId:string,referans:string){
 return `${musteriId}:${referans}`;
}
