export type ToplamaDurumu="BEKLIYOR"|"TOPLANIYOR"|"TOPLANDI"|"EKSIK"|"KONTROLDE"|"ONAYLANDI"|"IPTAL";
export type PaketDurumu="BEKLIYOR"|"PAKETLENIYOR"|"PAKETLENDI"|"ETIKETLENDI"|"SEVKIYATA_HAZIR"|"IPTAL";
export interface ToplamaKalemi{
 id:string;siparisId:string;urunId:string;stokKodu?:string;
 rafKodu?:string;istenenMiktar:number;toplananMiktar:number;
 durum:ToplamaDurumu;toplayanId?:string;
}
export interface Paket{
 id:string;siparisId:string;paketNo:string;durum:PaketDurumu;
 barkod?:string;agirlikKg?:number;paketlemeNotu?:string;
 paketleyenId?:string;etiketBasilmaTarihi?:string;
}
export interface SevkiyatHazirlik{
 siparisId:string;toplamaTamam:boolean;kontrolTamam:boolean;
 paketlemeTamam:boolean;etiketTamam:boolean;hazir:boolean;
}
export function toplamaTamamMi(k:ToplamaKalemi){
 return k.toplananMiktar===k.istenenMiktar && k.durum==="TOPLANDI";
}
export function sevkiyataHazirMi(x:SevkiyatHazirlik){
 return x.toplamaTamam&&x.kontrolTamam&&x.paketlemeTamam&&x.etiketTamam;
}
export function toplamaEksikMi(k:ToplamaKalemi){
 return k.toplananMiktar<k.istenenMiktar;
}
export function toplamaIdempotency(siparisId:string,urunId:string,rafKodu:string){
 return `${siparisId}:${urunId}:${rafKodu}`;
}
