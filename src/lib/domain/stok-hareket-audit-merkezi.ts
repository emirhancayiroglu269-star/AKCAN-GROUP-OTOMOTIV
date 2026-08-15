export type StokHareketTipi=
 "GIRIS"|"CIKIS"|"TRANSFER"|"REZERVASYON"|"SERBEST_BIRAKMA"|
 "SAYIM_DUZELTME"|"IADE"|"FIRE"|"MANUEL_DUZELTME";

export interface StokHareket{
 id:string;urunId:string;depoId:string;rafKodu?:string;
 tip:StokHareketTipi;miktar:number;
 oncekiAdet:number;sonrakiAdet:number;
 referansTipi?:string;referansId?:string;
 kullaniciId:string;tarih:string;aciklama?:string;
}

export interface StokAuditKaydi{
 id:string;stokHareketId:string;urunId:string;
 islem:string;kullaniciId:string;tarih:string;
 iptalEdildi:boolean;not?:string;
}

export function stokHareketSonrakiAdet(h:Pick<StokHareket,"oncekiAdet"|"miktar"|"tip">){
 const artis=["GIRIS","IADE"].includes(h.tip);
 return artis ? h.oncekiAdet+h.miktar : h.oncekiAdet-h.miktar;
}

export function stokHareketTutarlimi(h:StokHareket){
 return h.sonrakiAdet===stokHareketSonrakiAdet(h);
}

export function stokHareketIdempotency(
 tip:StokHareketTipi,referansTipi:string,referansId:string,urunId:string
){
 return `${tip}:${referansTipi}:${referansId}:${urunId}`;
}
