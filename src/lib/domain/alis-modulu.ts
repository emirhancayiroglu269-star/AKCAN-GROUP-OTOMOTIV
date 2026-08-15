export type AlisOdemeTipi="NAKIT"|"KART"|"HAVALE"|"ACIK_HESAP";
export interface AlisSatiri{
 urunId:string;stokKodu:string;urunAdi:string;miktar:number;
 birimMaliyet:number;iskonto:number;kdvOrani:number;
}
export interface AlisTaslagi{
 tedarikciId?:string;faturaNo?:string;satirlar:AlisSatiri[];
 odemeTipi?:AlisOdemeTipi;
}
export interface AlisSonucu{
 araToplam:number;kdv:number;genelToplam:number;
 stokMaliyeti:number;tedarikciBorcu:number;
}
const net=(s:AlisSatiri)=>{
 const brut=s.miktar*s.birimMaliyet;
 return brut-Math.max(0,Math.min(brut,s.iskonto));
};
export function alisHesapla(a:AlisTaslagi):AlisSonucu{
 if(!a.satirlar.length)throw new Error("Alış sepeti boş.");
 if(a.satirlar.some(x=>x.miktar<=0))throw new Error("Miktar sıfırdan büyük olmalı.");
 if(a.satirlar.some(x=>x.birimMaliyet<0))throw new Error("Maliyet negatif olamaz.");
 const araToplam=a.satirlar.reduce((t,x)=>t+net(x),0);
 const kdv=a.satirlar.reduce((t,x)=>t+net(x)*x.kdvOrani/100,0);
 const genelToplam=araToplam+kdv;
 return {araToplam,kdv,genelToplam,stokMaliyeti:araToplam,tedarikciBorcu:a.odemeTipi==="ACIK_HESAP"?genelToplam:0};
}
export function alisKontrol(a:AlisTaslagi){
 alisHesapla(a);
 if(!a.tedarikciId)throw new Error("Tedarikçi seçilmelidir.");
 if(!a.odemeTipi)throw new Error("Ödeme tipi seçilmelidir.");
}
