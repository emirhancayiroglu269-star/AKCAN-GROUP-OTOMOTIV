export type EntegrasyonTipi="TRENDYOL"|"E_FATURA"|"KARGO"|"ODEME_POS"|"MUHASEBE"|"GENEL";
export type ApiYonu="GELEN"|"GIDEN";
export type ApiDurumu="AKTIF"|"PASIF"|"HATA";
export interface Entegrasyon{
 id:string;ad:string;tipi:EntegrasyonTipi;aktif:boolean;
 baseUrl?:string;webhookAktif:boolean;
}
export interface ApiIslem{
 id:string;entegrasyonId:string;yonu:ApiYonu;
 endpoint:string;method:"GET"|"POST"|"PUT"|"PATCH"|"DELETE";
 durum:number;baslangic:string;bitis?:string;
 referansId?:string;hata?:string;
}
export interface WebhookOlayi{
 id:string;entegrasyonId:string;olayTipi:string;
 payloadHash:string;tarih:string;islendi:boolean;
}
export function entegrasyonIdempotency(entegrasyonId:string,referansId:string,olayTipi:string){
 return `${entegrasyonId}:${referansId}:${olayTipi}`;
}
export function apiBasariliMi(status:number){
 return status>=200&&status<300;
}
export function entegrasyonAktifMi(x:Entegrasyon){
 return x.aktif;
}
export function webhookTekilMi(a:WebhookOlayi,b:WebhookOlayi){
 return a.entegrasyonId===b.entegrasyonId&&
   a.olayTipi===b.olayTipi&&a.payloadHash===b.payloadHash;
}
