export type CRMEtkinlikTipi=
 "ARAMA"|"WHATSAPP"|"NOT"|"TEKLIF"|"GORUSME"|"RANDEVU"|"SATIS"|"TAKIP";
export type CRMDurumu="ACIK"|"TAMAMLANDI"|"IPTAL"|"BEKLIYOR";
export interface CRMEtkinlik{
 id:string;musteriId:string;tipi:CRMEtkinlikTipi;
 baslik:string;icerik?:string;kullaniciId:string;
 tarih:string;durum:CRMDurumu;referansId?:string;
 sonrakiIslemTarihi?:string;
}
export interface MusteriCRM{
 musteriId:string;sonEtkinlikTarihi?:string;
 sonrakiIslemTarihi?:string;sonrakiIslem?:string;
 toplamEtkinlik:number;acikTakip:number;
}
export function crmEtkinlikIdempotency(musteriId:string,tipi:CRMEtkinlikTipi,tarih:string){
 return `${musteriId}:${tipi}:${tarih}`;
}
export function crmAcikTakiplar(etkinlikler:CRMEtkinlik[]){
 return etkinlikler.filter(x=>x.durum==="ACIK"||x.durum==="BEKLIYOR");
}
export function crmSonrakiIslem(etkinlikler:CRMEtkinlik[],musteriId:string){
 return etkinlikler
  .filter(x=>x.musteriId===musteriId&&x.sonrakiIslemTarihi&&x.durum!=="IPTAL")
  .sort((a,b)=>new Date(a.sonrakiIslemTarihi!).getTime()-new Date(b.sonrakiIslemTarihi!).getTime())[0];
}
