export type StokUyariSeviyesi="NORMAL"|"DUSUK"|"KRITIK"|"TUKENDI";
export interface StokPolitikasi{
 urunId:string;depoId:string;minStok:number;hedefStok:number;
 yenidenSiparisNoktasi:number;aktif:boolean;
}
export interface StokDurum{
 urunId:string;depoId:string;mevcut:number;rezerve:number;
 satilabilir:number;beklenenGiris:number;
}
export interface YenilemeOnerisi{
 urunId:string;depoId:string;mevcut:number;hedefStok:number;
 onerilenMiktar:number;seviye:StokUyariSeviyesi;
 tedarikciId?:string;olusturmaTarihi:string;
}
export function satilabilirStok(s:StokDurum){
 return Math.max(0,s.mevcut-s.rezerve);
}
export function stokSeviyesi(s:StokDurum,p:StokPolitikasi):StokUyariSeviyesi{
 const sat=satilabilirStok(s);
 if(sat<=0)return "TUKENDI";
 if(sat<=p.minStok)return "KRITIK";
 if(sat<=p.yenidenSiparisNoktasi)return "DUSUK";
 return "NORMAL";
}
export function yenilemeMiktari(s:StokDurum,p:StokPolitikasi){
 return Math.max(0,p.hedefStok-satilabilirStok(s)-s.beklenenGiris);
}
export function otomatikSiparisGerekir(s:StokDurum,p:StokPolitikasi){
 return p.aktif && stokSeviyesi(s,p)!=="NORMAL" && yenilemeMiktari(s,p)>0;
}
export function replenishmentIdempotency(urunId:string,depoId:string,tarih:string){
 return `${urunId}:${depoId}:${tarih}`;
}
