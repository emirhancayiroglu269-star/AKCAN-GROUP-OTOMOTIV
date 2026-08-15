export type YetkiTipi="GOR"|"OLUSTUR"|"DUZENLE"|"SIL"|"ONAY"|"FIYAT_DEGISTIR";
export interface Rol{
 id:string;ad:string;aktif:boolean;yetkiler:string[];
}
export interface Personel{
 id:string;ad:string;soyad:string;rolId:string;aktif:boolean;
 satisHedefi:number;satisCirosu:number;
}
export interface Yetki{
 kaynak:string;islem:string;tip:YetkiTipi;
}
export interface IslemIzni{
 kullaniciId:string;kaynak:string;islem:string;
}
export function yetkiAnahtari(kaynak:string,islem:string,tip:YetkiTipi){
 return `${kaynak}:${islem}:${tip}`;
}
export function yetkiliMi(rol:Rol,kaynak:string,islem:string,tip:YetkiTipi){
 return rol.yetkiler.includes(yetkiAnahtari(kaynak,islem,tip));
}
export function personelPerformansYuzdesi(p:Personel){
 if(p.satisHedefi<=0) return 0;
 return (p.satisCirosu/p.satisHedefi)*100;
}
export function onayGerekiyor(kaynak:string,islem:string){
 return ["SATIS_ISKONTO","FIYAT_DEGISIKLIGI","IADE","SILME","ACIK_HESAP"].includes(`${kaynak}_${islem}`);
}
