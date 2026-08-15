export type KargoDurumu=
 "OLUSTURULDU"|"PAKETLENIYOR"|"SEVKIYATTA"|"DAGITIMDA"|
 "TESLIM_EDILDI"|"GECIKTI"|"SORUNLU"|"IADE"|"IPTAL";

export interface Kargo{
 id:string;siparisId:string;firma:string;
 takipNo?:string;durum:KargoDurumu;
 olusturmaTarihi:string;sevkTarihi?:string;
 tahminiTeslimTarihi?:string;teslimTarihi?:string;
 sonKontrolTarihi?:string;aciklama?:string;
}

export interface KargoDurumGecmisi{
 id:string;kargoId:string;eskiDurum?:KargoDurumu;
 yeniDurum:KargoDurumu;tarih:string;kaynak:"ERP"|"ENTEGRASYON";
}

export interface KargoUyarisi{
 id:string;kargoId:string;seviye:"UYARI"|"KRITIK";
 baslik:string;mesaj:string;tarih:string;okundu:boolean;
}

export function kargoGecikti(k:Kargo,simdi=new Date()){
 if(k.teslimTarihi || !k.tahminiTeslimTarihi) return false;
 if(["TESLIM_EDILDI","IPTAL","IADE"].includes(k.durum)) return false;
 return new Date(k.tahminiTeslimTarihi).getTime()<simdi.getTime();
}

export function kargoSorunlu(k:Kargo){
 return k.durum==="SORUNLU";
}

export function kargoIdempotency(siparisId:string,firma:string,referans:string){
 return `${siparisId}:${firma}:${referans}`;
}

export function teslimatTamamlandi(k:Kargo){
 return k.durum==="TESLIM_EDILDI" && !!k.teslimTarihi;
}
