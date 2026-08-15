export type BildirimTipi="KRITIK_STOK"|"TAHSILAT_VADESI"|"ODEME_VADESI"|"BEKLEYEN_ONAY"|"SISTEM"|"GENEL";
export type BildirimOnceligi="DUSUK"|"NORMAL"|"YUKSEK"|"KRITIK";
export interface Bildirim{id:string;kullaniciId:string;tip:BildirimTipi;oncelik:BildirimOnceligi;baslik:string;mesaj:string;okundu:boolean;olusturmaTarihi:string;aksiyonRota?:string;}
export interface UyariKural{id:string;tip:BildirimTipi;aktif:boolean;esik?:number;rol?:string;}
export function bildirimDogrula(b:Bildirim){if(!b.id||!b.kullaniciId||!b.baslik||!b.mesaj)throw new Error("Eksik bildirim alanı.");if(Number.isNaN(new Date(b.olusturmaTarihi).getTime()))throw new Error("Geçersiz tarih.");}
export function okunmamisSayisi(b:Bildirim[],kullaniciId:string){return b.filter(x=>x.kullaniciId===kullaniciId&&!x.okundu).length}
export function kritikUyarilariGetir(b:Bildirim[],kullaniciId:string){return b.filter(x=>x.kullaniciId===kullaniciId&&!x.okundu&&(x.oncelik==="KRITIK"||x.oncelik==="YUKSEK"))}
