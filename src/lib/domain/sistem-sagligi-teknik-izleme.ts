export type SaglikDurumu="SAGLIKLI"|"UYARI"|"KRITIK"|"BILINMIYOR";
export type Bilesen=
 "SUNUCU"|"VERITABANI"|"API"|"SUPABASE"|"INTERNET"|"OTURUMLAR"|"ENTEGRASYON"|"YEDEKLEME";
export interface SistemBileseni{
 id:string;tipi:Bilesen;ad:string;durum:SaglikDurumu;
 gecikmeMs?:number;sonKontrol:string;mesaj?:string;
}
export interface SistemMetrikleri{
 aktifOturum:number;hataSayisi:number;apiBasariOrani:number;
 ortalamaGecikmeMs:number;sonYedekTarihi?:string;
}
export interface TeknikUyari{
 id:string;bilesen:Bilesen;seviye:"UYARI"|"KRITIK";
 baslik:string;mesaj:string;tarih:string;okundu:boolean;
}
export function sistemGenelDurum(bilesenler:SistemBileseni[]):SaglikDurumu{
 if(!bilesenler.length)return "BILINMIYOR";
 if(bilesenler.some(x=>x.durum==="KRITIK"))return "KRITIK";
 if(bilesenler.some(x=>x.durum==="UYARI"||x.durum==="BILINMIYOR"))return "UYARI";
 return "SAGLIKLI";
}
export function apiBasariOrani(basarili:number,toplam:number){
 if(toplam<=0)return 100;
 return (basarili/toplam)*100;
}
export function teknikUyariSayisi(uyarilar:TeknikUyari[]){
 return uyarilar.filter(x=>!x.okundu).length;
}
