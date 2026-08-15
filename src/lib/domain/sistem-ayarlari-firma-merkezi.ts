export interface FirmaBilgisi{
 id:string;unvan:string;vergiNo?:string;vergiDairesi?:string;
 adres?:string;telefon?:string;eposta?:string;
}
export interface Sube{
 id:string;firmaId:string;ad:string;aktif:boolean;
}
export interface Depo{
 id:string;subeId:string;ad:string;aktif:boolean;
}
export interface SistemAyari{
 anahtar:string;deger:string;tip:"METIN"|"SAYI"|"BOOLEAN"|"JSON";aktif:boolean;
}
export interface BelgeSerisi{
 tip:"SATIS_FATURASI"|"ALIS_FATURASI"|"IRSALIYE"|"E_FATURA"|"E_ARSIV";
 seri:string;sonSira:number;aktif:boolean;
}
export interface FiyatlandirmaKurali{
 ad:string;minKarMarji:number;varsayilanIskonto:number;
}
export function ayarAnahtari(kategori:string,anahtar:string){
 return `${kategori}:${anahtar}`;
}
export function belgeSerisiDogrula(s:BelgeSerisi){
 if(!s.seri.trim()) throw new Error("Belge serisi boş olamaz.");
 if(!Number.isInteger(s.sonSira)||s.sonSira<0) throw new Error("Belge sıra numarası geçersiz.");
 return true;
}
export function fiyatKuraliDogrula(k:FiyatlandirmaKurali){
 if(k.minKarMarji<0||k.minKarMarji>100) throw new Error("Kâr marjı 0-100 arasında olmalı.");
 if(k.varsayilanIskonto<0||k.varsayilanIskonto>100) throw new Error("İskonto 0-100 arasında olmalı.");
 return true;
}
