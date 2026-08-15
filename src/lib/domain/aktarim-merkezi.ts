export type DosyaTipi="CSV"|"XLSX";
export type AktarimYonu="ICERI"|"DISARI";
export type AktarimTipi="URUN"|"MUSTERI"|"TEDARIKCI"|"STOK"|"FIYAT"|"CARI"|"SATIS"|"ALIS"|"FINANS"|"RAPOR";
export type AktarimDurumu="BEKLIYOR"|"ISLENIYOR"|"TAMAMLANDI"|"HATALI";
export interface AktarimKolonu{kaynak:string;hedef:string;zorunlu:boolean;}
export interface AktarimIslemi{
 id:string;yonu:AktarimYonu;tipi:AktarimTipi;dosyaTipi:DosyaTipi;
 dosyaAdi:string;toplamSatir:number;basariliSatir:number;hataliSatir:number;
 durum:AktarimDurumu;hataMesajlari:string[];
}
export function aktarimYuzdesi(x:AktarimIslemi){
 if(x.toplamSatir<=0) return 0;
 return Math.round((x.basariliSatir/x.toplamSatir)*10000)/100;
}
export function aktarimIdempotency(yonu:AktarimYonu,tipi:AktarimTipi,dosyaAdi:string){
 return `${yonu}:${tipi}:${dosyaAdi}`;
}
export function zorunluKolonlariKontrol(
 satir:Record<string,unknown>,kolonlar:AktarimKolonu[]
){
 return kolonlar.filter(k=>k.zorunlu).every(k=>{
  const v=satir[k.kaynak];
  return v!==undefined&&v!==null&&String(v).trim()!=="";
 });
}
