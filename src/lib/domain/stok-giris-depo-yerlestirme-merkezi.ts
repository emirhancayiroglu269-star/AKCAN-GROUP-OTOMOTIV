export type YerlesimDurumu="BEKLIYOR"|"GIRIS_YAPILDI"|"RAF_ATANDI"|"YERLESTIRILDI"|"IPTAL";
export interface StokGirisKalemi{
 id:string;malKabulKalemId:string;urunId:string;
 miktar:number;depoId:string;rafKodu?:string;
 barkod?:string;durum:YerlesimDurumu;
 girisTarihi:string;personelId:string;
}
export interface DepoYerlesim{
 id:string;urunId:string;depoId:string;rafKodu:string;
 miktar:number;stokGirisKalemId:string;
 yerlesimTarihi:string;personelId:string;
}
export function rafAtandiMi(k:StokGirisKalemi){
 return !!k.rafKodu && k.durum==="RAF_ATANDI";
}
export function yerlesimTamMi(k:StokGirisKalemi){
 return !!k.rafKodu && k.miktar>0 && k.durum==="YERLESTIRILDI";
}
export function stokGirisIdempotency(malKabulId:string,urunId:string,depoId:string){
 return `${malKabulId}:${urunId}:${depoId}`;
}
