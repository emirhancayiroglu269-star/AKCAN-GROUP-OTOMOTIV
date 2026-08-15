export interface DashboardOzet{
 ciro:number; brutKar:number; kritikStok:number; cariRisk:number;
 bekleyenSiparis:number; kasa:number; banka:number;
}
export interface SatisSepetSatiri{
 urunId:string; stokKodu:string; urunAdi:string; miktar:number;
 birimFiyat:number; maliyet:number; iskonto:number; kdvOrani:number;
}
export interface SatisSepeti{
 musteriId?:string; satirlar:SatisSepetSatiri[]; odemeTipi?:string;
}
export function satirNetTutar(s:SatisSepetSatiri){
 const brut=s.miktar*s.birimFiyat;
 const iskonto=Math.max(0,Math.min(brut,s.iskonto));
 return brut-iskonto;
}
export function sepetAraToplam(sepet:SatisSepeti){
 return sepet.satirlar.reduce((t,s)=>t+satirNetTutar(s),0);
}
export function sepetKdv(sepet:SatisSepeti){
 return sepet.satirlar.reduce((t,s)=>t+satirNetTutar(s)*s.kdvOrani/100,0);
}
export function sepetGenelToplam(sepet:SatisSepeti){
 return sepetAraToplam(sepet)+sepetKdv(sepet);
}
export function satisKaydiIcinDogrula(sepet:SatisSepeti){
 if(!sepet.satirlar.length) throw new Error("Sepet boş.");
 if(sepet.satirlar.some(s=>s.miktar<=0)) throw new Error("Miktar sıfır veya negatif olamaz.");
 if(sepet.satirlar.some(s=>s.birimFiyat<0)) throw new Error("Fiyat negatif olamaz.");
}
