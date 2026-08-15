export type SaglikDurumu="SAGLIKLI"|"UYARI"|"KRITIK";
export type KontrolTipi="VERITABANI"|"AUTH"|"YETKI"|"YEDEKLEME"|"AUDIT"|"STOK"|"FINANS"|"SERVIS";
export interface SaglikKontrolu{id:string;tip:KontrolTipi;baslik:string;durum:SaglikDurumu;mesaj:string;sonKontrol:string;detayRota?:string;}
export interface SistemSagligi{durum:SaglikDurumu;kontroller:SaglikKontrolu[];sonKontrol:string;}
export function genelDurum(k:SaglikKontrolu[]):SaglikDurumu{
 if(k.some(x=>x.durum==="KRITIK"))return "KRITIK";
 if(k.some(x=>x.durum==="UYARI"))return "UYARI";
 return "SAGLIKLI";
}
export function saglikRaporu(k:SaglikKontrolu[],sonKontrol:string):SistemSagligi{
 return {durum:genelDurum(k),kontroller:k,sonKontrol};
}
