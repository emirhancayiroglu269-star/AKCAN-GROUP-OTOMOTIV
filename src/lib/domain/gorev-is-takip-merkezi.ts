export type GorevDurumu="BEKLIYOR"|"DEVAM_EDIYOR"|"BEKLEMEDE"|"TAMAMLANDI"|"IPTAL";
export type GorevOnceligi="DUSUK"|"NORMAL"|"YUKSEK"|"KRITIK";
export interface Gorev{
 id:string;baslik:string;aciklama?:string;
 atayanId:string;sorumluId:string;
 oncelik:GorevOnceligi;durum:GorevDurumu;
 baslangicTarihi?:string;sonTarih?:string;
 tamamlanmaTarihi?:string;olusturmaTarihi:string;
 referansTipi?:string;referansId?:string;
}
export interface GorevYorum{
 id:string;gorevId:string;kullaniciId:string;
 metin:string;tarih:string;
}
export interface GorevOzet{
 toplam:number;bekleyen:number;devamEden:number;
 tamamlanan:number;geciken:number;kritik:number;
}
export function gorevGecikti(g:Gorev, simdi=new Date()){
 if(!g.sonTarih||g.durum==="TAMAMLANDI"||g.durum==="IPTAL")return false;
 return new Date(g.sonTarih).getTime()<simdi.getTime();
}
export function gorevOzetle(gorevler:Gorev[],simdi=new Date()):GorevOzet{
 return {
  toplam:gorevler.length,
  bekleyen:gorevler.filter(x=>x.durum==="BEKLIYOR").length,
  devamEden:gorevler.filter(x=>x.durum==="DEVAM_EDIYOR").length,
  tamamlanan:gorevler.filter(x=>x.durum==="TAMAMLANDI").length,
  geciken:gorevler.filter(x=>gorevGecikti(x,simdi)).length,
  kritik:gorevler.filter(x=>x.oncelik==="KRITIK"&&x.durum!=="TAMAMLANDI"&&x.durum!=="IPTAL").length
 };
}
export function gorevIdempotency(referansTipi:string,referansId:string){
 return `${referansTipi}:${referansId}`;
}
