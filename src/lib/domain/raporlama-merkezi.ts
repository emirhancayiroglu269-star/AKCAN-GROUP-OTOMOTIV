export interface RaporVerisi{
 ciro:number;alis:number;stokDegeri:number;brutKar:number;
 gider:number;netKar:number;cariRisk:number;kasa:number;banka:number;
}
export interface DonemKarsilastirma{
 onceki:number;mevcut:number;degisim:number;degisimYuzde:number;
}
export function netKarHesapla(brutKar:number,gider:number){
 return brutKar-gider;
}
export function donemKarsilastir(onceki:number,mevcut:number):DonemKarsilastirma{
 const degisim=mevcut-onceki;
 return {onceki,mevcut,degisim,degisimYuzde:onceki===0?0:(degisim/Math.abs(onceki))*100};
}
export function raporOzetle(v:RaporVerisi){
 return {
  toplamCiro:v.ciro,
  toplamAlis:v.alis,
  stokDegeri:v.stokDegeri,
  brutKar:v.brutKar,
  toplamGider:v.gider,
  netKar:netKarHesapla(v.brutKar,v.gider),
  cariRisk:v.cariRisk,
  likitBakiye:v.kasa+v.banka
 };
}
