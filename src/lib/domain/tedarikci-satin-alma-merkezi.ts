export type SatinAlmaDurumu=
 "TALEP"|"ONAY_BEKLIYOR"|"SIPARIS_VERILDI"|"KISMEN_GELDI"|
 "TAM_GELDI"|"FATURALANDI"|"ODEME_BEKLIYOR"|"TAMAMLANDI"|"IPTAL";

export interface Tedarikci{
 id:string;unvan:string;vergiNo?:string;telefon?:string;
 eposta?:string;adres?:string;aktif:boolean;
 vadeGun?:number;iskontoOrani?:number;
}

export interface SatinAlmaKalemi{
 id:string;urunId:string;tedarikciId:string;
 miktar:number;birimFiyat:number;iskontoOrani:number;kdvOrani:number;
 gelenMiktar:number;
}

export interface SatinAlmaSiparisi{
 id:string;siparisNo:string;tedarikciId:string;
 durum:SatinAlmaDurumu;kalemler:SatinAlmaKalemi[];
 araToplam:number;iskontoToplam:number;kdvToplam:number;genelToplam:number;
 olusturanId:string;onaylayanId?:string;olusturmaTarihi:string;
 faturaNo?:string;odemeTarihi?:string;
}

export function netAlisBirimFiyati(k:SatinAlmaKalemi){
 return k.birimFiyat*(1-k.iskontoOrani/100);
}

export function siparisKarsilamaOrani(s:SatinAlmaSiparisi){
 const istenen=s.kalemler.reduce((t,k)=>t+k.miktar,0);
 const gelen=s.kalemler.reduce((t,k)=>t+k.gelenMiktar,0);
 return istenen===0?0:(gelen/istenen)*100;
}

export function satinAlmaIdempotency(tedarikciId:string,referansId:string){
 return `${tedarikciId}:${referansId}`;
}

export function tamMalKabulMu(s:SatinAlmaSiparisi){
 return s.kalemler.length>0 && s.kalemler.every(k=>k.gelenMiktar>=k.miktar);
}
