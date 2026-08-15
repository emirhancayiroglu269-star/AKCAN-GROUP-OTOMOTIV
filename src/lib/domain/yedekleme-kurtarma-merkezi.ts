export type YedekTuru="OTOMATIK"|"MANUEL";
export type YedekDurumu="HAZIR"|"KONTROL_EDILIYOR"|"BASARILI"|"HATALI"|"GERI_YUKLENDI";
export interface YedekKaydi{
 id:string;tarih:string;turu:YedekTuru;boyut:number;
 checksum:string;durum:YedekDurumu;konum:string;
}
export interface KurtarmaKaydi{
 id:string;yedekId:string;baslangic:string;bitis?:string;
 durum:"BASARILI"|"HATALI";mesaj?:string;
}
export function yedekChecksumAnahtari(yedekId:string,checksum:string){
 return `${yedekId}:${checksum}`;
}
export function yedekGeriYuklemeKontrol(y:YedekKaydi){
 if(y.durum!=="BASARILI" && y.durum!=="GERI_YUKLENDI")
   throw new Error("Sadece başarılı yedek geri yüklenebilir.");
 if(!y.checksum) throw new Error("Yedek bütünlük özeti eksik.");
 return true;
}
export function yedekGecerlilik(y:YedekKaydi){
 return y.boyut>0 && !!y.checksum && !!y.konum;
}
