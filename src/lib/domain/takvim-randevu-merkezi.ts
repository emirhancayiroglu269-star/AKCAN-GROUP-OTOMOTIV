export type RandevuDurumu="PLANLANDI"|"ONAY_BEKLIYOR"|"ONAYLANDI"|"TAMAMLANDI"|"IPTAL"|"GELMEDI";
export type RandevuTipi="SERVIS"|"MUSTERI_GORUSMESI"|"TESLIMAT"|"TAHSILAT"|"ODEME"|"DIGER";
export interface Randevu{
 id:string;baslik:string;tipi:RandevuTipi;durum:RandevuDurumu;
 baslangic:string;bitis:string;sorumluId:string;
 musteriId?:string;aciklama?:string;lokasyon?:string;
 hatirlatmaDakika?:number;olusturmaTarihi:string;
}
export interface TakvimHatirlatma{
 id:string;randevuId:string;planlananZaman:string;
 kanal:"ERP"|"EPOSTA"|"SMS";gonderildi:boolean;
}
export function randevuSuresiDakika(r:Randevu){
 return Math.max(0,(new Date(r.bitis).getTime()-new Date(r.baslangic).getTime())/60000);
}
export function randevuCakismaVarMi(a:Randevu,b:Randevu){
 if(a.sorumluId!==b.sorumluId)return false;
 return new Date(a.baslangic)<new Date(b.bitis)&&new Date(b.baslangic)<new Date(a.bitis);
}
export function hatirlatmaZamani(r:Randevu){
 const dakika=r.hatirlatmaDakika??0;
 return new Date(new Date(r.baslangic).getTime()-dakika*60000);
}
export function randevuIdempotency(sorumluId:string,baslangic:string,tipi:RandevuTipi){
 return `${sorumluId}:${baslangic}:${tipi}`;
}
