export type HareketTipi="STOK"|"CARI"|"KASA"|"BANKA"|"BELGE"|"AUDIT"|"BILDIRIM";
export interface SatisHareket{tip:HareketTipi;referansId:string;durum:"BEKLIYOR"|"TAMAM"|"HATA";mesaj?:string}
export interface SatisZincirSonucu{basarili:boolean;hareketler:SatisHareket[];hata?:string}
export function satisZinciriniDogrula(h:SatisHareket[]):SatisZincirSonucu{
 const gerekli:HareketTipi[]=["STOK","CARI","BELGE","AUDIT"];
 for(const tip of gerekli){
  if(!h.some(x=>x.tip===tip&&x.durum==="TAMAM"))
   return {basarili:false,hareketler:h,hata:`Eksik hareket: ${tip}`};
 }
 return {basarili:true,hareketler:h};
}
export function idempotencyAnahtari(satisId:string,tip:HareketTipi){return `${satisId}:${tip}`}
