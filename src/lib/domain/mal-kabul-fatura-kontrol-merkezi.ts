export type KabulDurumu="BEKLIYOR"|"KONTROLDE"|"ONAY_BEKLIYOR"|"ONAYLANDI"|"FARKLI"|"REDDEDILDI";
export type FarkTipi="YOK"|"EKSIK_ADET"|"FAZLA_ADET"|"FIYAT_FARKI"|"KDV_FARKI"|"TUTAR_FARKI";

export interface MalKabulKalemi{
 id:string;siparisKalemId:string;urunId:string;
 siparisMiktari:number;gelenMiktar:number;
 birimAlisFiyati:number;faturaBirimFiyati?:number;
 kdvOrani:number;faturaKdvOrani?:number;
}

export interface MalKabul{
 id:string;satinAlmaSiparisId:string;durum:KabulDurumu;
 kalemler:MalKabulKalemi[];kabulTarihi:string;
 kabulEdenId:string;not?:string;
}

export interface FaturaKontrol{
 id:string;malKabulId:string;faturaNo:string;
 faturaTarihi:string;faturaAraToplam:number;
 faturaKdv:number;faturaGenelToplam:number;
 sistemAraToplam:number;sistemKdv:number;sistemGenelToplam:number;
 farkTutar:number;farkTipleri:FarkTipi[];
 onaylayanId?:string;durum:"BEKLIYOR"|"ONAYLANDI"|"FARKLI"|"REDDEDILDI";
}

export function adetFarki(k:MalKabulKalemi){
 return k.gelenMiktar-k.siparisMiktari;
}

export function fiyatFarki(k:MalKabulKalemi){
 if(k.faturaBirimFiyati===undefined)return 0;
 return k.faturaBirimFiyati-k.birimAlisFiyati;
}

export function kdvFarki(k:MalKabulKalemi){
 if(k.faturaKdvOrani===undefined)return 0;
 return k.faturaKdvOrani-k.kdvOrani;
}

export function faturaTutarFarki(f:FaturaKontrol){
 return f.faturaGenelToplam-f.sistemGenelToplam;
}

export function farkVarMi(f:FaturaKontrol){
 return Math.abs(f.farkTutar)>0.01||f.farkTipleri.some(x=>x!=="YOK");
}

export function malKabulIdempotency(siparisId:string,irsaliyeNo:string){
 return `${siparisId}:${irsaliyeNo}`;
}
