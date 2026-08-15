export type SatinAlmaOneriDurumu="TASLAK"|"ONAYA_GONDERILDI"|"ONAYLANDI"|"SIPARISE_DONUSTU"|"REDDEDILDI"|"IPTAL";
export interface TedarikciSecim{
 tedarikciId:string;urunId:string;birimFiyat:number;
 teslimGun?:number;minimumSiparisMiktari?:number;
 tercihPuani?:number;
}
export interface SatinAlmaOneriKalemi{
 id:string;urunId:string;tedarikciId:string;
 onerilenMiktar:number;birimFiyat:number;
 toplamTutar:number;gerekce:string;
}
export interface SatinAlmaOnerisi{
 id:string;depoId:string;durum:SatinAlmaOneriDurumu;
 kalemler:SatinAlmaOneriKalemi[];
 olusturmaTarihi:string;olusturanId:string;
 onaylayanId?:string;referansDonem?:string;
}
export function minimumMiktaraUygun(miktar:number,min?:number){
 return min===undefined || miktar>=min;
}
export function siparisMiktari(onerilen:number,min?:number){
 if(onerilen<=0)return 0;
 return Math.max(onerilen,min||0);
}
export function toplamKalemTutar(k:SatinAlmaOneriKalemi){
 return k.onerilenMiktar*k.birimFiyat;
}
export function satinAlmaOnerisiIdempotency(
 urunId:string,depoId:string,donem:string
){
 return `${urunId}:${depoId}:${donem}`;
}
export function onayaGonderilebilir(o:SatinAlmaOnerisi){
 return o.durum==="TASLAK" && o.kalemler.length>0 &&
   o.kalemler.every(k=>k.onerilenMiktar>0 && k.birimFiyat>=0);
}
