export type AuditSonuc="BASARILI"|"HATA"|"REDDEDILDI";
export type AuditIslem=
 "GIRIS"|"CIKIS"|"OLUSTUR"|"GUNCELLE"|"SIL"|"ONAY"|"IADE"|"TAHSILAT"|"ODEME"|"FIYAT_DEGISIKLIGI";
export interface AuditKaydi{
 id:string;kullaniciId:string;kullaniciAdi:string;
 islem:AuditIslem;modul:string;ekran:string;
 kayitTipi?:string;kayitId?:string;
 eskiDeger?:unknown;yeniDeger?:unknown;
 tarih:string;cihazId?:string;ip?:string;
 sonuc:AuditSonuc;mesaj?:string;referansId?:string;
}
export function auditIdempotency(referansId:string,islem:AuditIslem){
 return `${referansId}:${islem}`;
}
export function auditAra(kayitlar:AuditKaydi[],q:string){
 const s=q.trim().toLocaleLowerCase("tr-TR");
 if(!s) return kayitlar;
 return kayitlar.filter(x=>
  x.kullaniciAdi.toLocaleLowerCase("tr-TR").includes(s) ||
  x.modul.toLocaleLowerCase("tr-TR").includes(s) ||
  x.ekran.toLocaleLowerCase("tr-TR").includes(s) ||
  x.kayitId?.toLocaleLowerCase("tr-TR").includes(s) ||
  x.referansId?.toLocaleLowerCase("tr-TR").includes(s)
 );
}
export function auditDegisimVarMi(x:AuditKaydi){
 return JSON.stringify(x.eskiDeger)!==JSON.stringify(x.yeniDeger);
}
