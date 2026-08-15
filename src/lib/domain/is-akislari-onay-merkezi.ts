export type IsAkisiDurumu="TALEP"|"ONAY_BEKLIYOR"|"ONAYLANDI"|"REDDEDILDI"|"DUZELTME"|"TAMAMLANDI"|"IPTAL";
export type IslemTipi="YUKSEK_TUTARLI_SATIS"|"YUKSEK_ISKONTO"|"ACIK_HESAP"|"IADE"|"ODEME"|"FIYAT_DEGISIKLIGI"|"KRITIK_SILME";
export interface IsAkisi{
 id:string;tipi:IslemTipi;durum:IsAkisiDurumu;talepEdenId:string;
 onaylayanId?:string;referansId:string;talepTarihi:string;
 sonIslemTarihi?:string;aciklama?:string;
}
export interface OnayKurali{
 id:string;tipi:IslemTipi;aktif:boolean;
 esikTutar?:number;esikOran?:number;onayRolId:string;
}
export interface OnayAdimi{
 id:string;isAkisiId:string;rolId:string;
 karar:"BEKLIYOR"|"ONAY"|"RED"|"DUZELTME";
 kararVerenId?:string;tarih?:string;not?:string;
}
export function onayGerekiyor(k:OnayKurali, tutar?:number, oran?:number){
 if(!k.aktif)return false;
 if(k.esikTutar!==undefined && (tutar??0)>=k.esikTutar)return true;
 if(k.esikOran!==undefined && (oran??0)>=k.esikOran)return true;
 return true;
}
export function sonrakiDurum(
 mevcut:IsAkisiDurumu,karar:"ONAY"|"RED"|"DUZELTME"|"TAMAMLA"
):IsAkisiDurumu{
 if(karar==="ONAY")return mevcut==="ONAY_BEKLIYOR"?"ONAYLANDI":mevcut;
 if(karar==="RED")return "REDDEDILDI";
 if(karar==="DUZELTME")return "DUZELTME";
 if(karar==="TAMAMLA")return "TAMAMLANDI";
 return mevcut;
}
export function isAkisiIdempotency(tipi:IslemTipi,referansId:string){
 return `${tipi}:${referansId}`;
}
