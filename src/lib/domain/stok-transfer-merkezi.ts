export type TransferDurumu="TALEP"|"ONAY_BEKLIYOR"|"HAZIRLANIYOR"|"YOLDA"|"TESLIM_ALINDI"|"TAMAMLANDI"|"REDDEDILDI"|"IPTAL";

export interface TransferKalemi{
 id:string;urunId:string;miktar:number;
 kaynakDepoId:string;kaynakRafKodu?:string;
 hedefDepoId:string;hedefRafKodu?:string;
 cikisMiktari:number;teslimMiktari:number;
}

export interface StokTransfer{
 id:string;transferNo:string;durum:TransferDurumu;
 kalemler:TransferKalemi[];talepEdenId:string;
 onaylayanId?:string;olusturmaTarihi:string;
 cikisTarihi?:string;teslimTarihi?:string;aciklama?:string;
}

export function transferEksigi(k:TransferKalemi){
 return Math.max(0,k.miktar-k.teslimMiktari);
}

export function transferTamMi(k:TransferKalemi){
 return k.teslimMiktari>=k.miktar;
}

export function transferIdempotency(transferNo:string,urunId:string){
 return `${transferNo}:${urunId}`;
}

export function transferBaslatilabilir(t:StokTransfer){
 return t.durum==="HAZIRLANIYOR" &&
   t.kalemler.length>0 &&
   t.kalemler.every(k=>k.miktar>0 && k.kaynakDepoId!==k.hedefDepoId);
}
