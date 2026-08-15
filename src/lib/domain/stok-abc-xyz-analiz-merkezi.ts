export type AbcSinifi="A"|"B"|"C";
export type XyzSinifi="X"|"Y"|"Z";
export type StokHareketlilik="HIZLI"|"NORMAL"|"YAVAS"|"OLUM_STOK";

export interface UrunDonemAnalizi{
 urunId:string;donem:string;ciro:number;satisAdedi:number;
 karTutari:number;stokDegeri:number;stokDevir?:number;
 talepSapmasi?:number;sonSatisTarihi?:string;
}

export interface AbcXyzSonuc{
 urunId:string;abc:AbcSinifi;xyz:XyzSinifi;
 hareketlilik:StokHareketlilik;oncelikSkoru:number;
 onerilenAksiyon:"STOKLA"|"NORMAL_TAKIP"|"AZALT"|"ALMA";
}

export function abcSinifi(kumulatifCiroYuzdesi:number):AbcSinifi{
 if(kumulatifCiroYuzdesi<=80)return "A";
 if(kumulatifCiroYuzdesi<=95)return "B";
 return "C";
}

export function xyzSinifi(talepSapmasi:number):XyzSinifi{
 if(talepSapmasi<=0.20)return "X";
 if(talepSapmasi<=0.50)return "Y";
 return "Z";
}

export function hareketlilik(satisAdedi:number,sonSatisGunSayisi:number):StokHareketlilik{
 if(satisAdedi<=0 && sonSatisGunSayisi>=180)return "OLUM_STOK";
 if(sonSatisGunSayisi<=30)return "HIZLI";
 if(sonSatisGunSayisi<=90)return "NORMAL";
 return "YAVAS";
}

export function aksiyon(abc:AbcSinifi,xyz:XyzSinifi,h:Hareketlilik):AbcXyzSonuc["onerilenAksiyon"]{
 if(h==="OLUM_STOK")return "ALMA";
 if(abc==="A" && xyz==="X")return "STOKLA";
 if(abc==="A" && xyz==="Y")return "NORMAL_TAKIP";
 if(abc==="C" && (xyz==="Z" || h==="YAVAS"))return "AZALT";
 return "NORMAL_TAKIP";
}

type Hareketlilik=StokHareketlilik;

export function analizIdempotency(urunId:string,donem:string){
 return `${urunId}:${donem}`;
}
