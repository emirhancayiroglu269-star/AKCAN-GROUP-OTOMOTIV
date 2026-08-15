export type KontrolSonucu="BASARILI"|"UYARI"|"KRITIK"|"HATA";
export type KontrolBileseni=
 "SUNUCU"|"VERITABANI"|"API"|"SUPABASE"|"INTERNET"|"OTURUM"|"ENTEGRASYON"|"YEDEKLEME";
export interface OtomatikKontrol{
 id:string;bilesen:KontrolBileseni;baslangic:string;
 bitis?:string;sonuc:KontrolSonucu;mesaj:string;referansId?:string;
}
export interface YoneticiUyarisi{
 id:string;bilesen:KontrolBileseni;seviye:"UYARI"|"KRITIK";
 baslik:string;mesaj:string;tarih:string;okundu:boolean;
 kontrolId:string;cozuldu:boolean;
}
export interface SistemKontrolKurali{
 bilesen:KontrolBileseni;aktif:boolean;
 esikDeger?:number;kontrolAraligiDakika:number;
}
export function yoneticiUyarisiGerekir(k:OtomatikKontrol){
 return k.sonuc==="UYARI"||k.sonuc==="KRITIK"||k.sonuc==="HATA";
}
export function uyariSeviyesi(k:OtomatikKontrol):"UYARI"|"KRITIK"|null{
 if(k.sonuc==="KRITIK"||k.sonuc==="HATA")return "KRITIK";
 if(k.sonuc==="UYARI")return "UYARI";
 return null;
}
export function sorunCozulduMu(k:OtomatikKontrol){
 return k.sonuc==="BASARILI";
}
export function kontrolIdempotency(bilesen:KontrolBileseni,referansId:string){
 return `${bilesen}:${referansId}`;
}
