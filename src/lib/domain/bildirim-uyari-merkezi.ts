export type UyariSeviyesi="BILGI"|"UYARI"|"KRITIK";
export type UyariTipi="KRITIK_STOK"|"VADE"|"GECIKEN_ODEME"|"BEKLEYEN_SIPARIS"|"DUSUK_KAR"|"ISLEM_HATASI"|"SISTEM";
export interface Bildirim{
 id:string;tip:UyariTipi;seviye:UyariSeviyesi;baslik:string;
 mesaj:string;referansId?:string;okundu:boolean;tarih:string;
}
export function bildirimOlustur(
 tip:UyariTipi,seviye:UyariSeviyesi,baslik:string,mesaj:string,referansId?:string
):Bildirim{
 return {id:crypto.randomUUID(),tip,seviye,baslik,mesaj,referansId,okundu:false,tarih:new Date().toISOString()};
}
export function okunmamis(bildirimler:Bildirim[]){
 return bildirimler.filter(x=>!x.okundu);
}
export function kritikSayisi(bildirimler:Bildirim[]){
 return bildirimler.filter(x=>x.seviye==="KRITIK"&&!x.okundu).length;
}
export function bildirimIdempotency(tip:UyariTipi,referansId:string){
 return `${tip}:${referansId}`;
}
