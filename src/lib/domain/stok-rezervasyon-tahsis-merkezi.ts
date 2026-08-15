export type RezervasyonDurumu="BEKLIYOR"|"REZERVE"|"TAHSIS_EDILDI"|"SERBEST"|"IPTAL";
export interface StokRezervasyon{
 id:string;siparisId:string;urunId:string;depoId:string;
 istenenMiktar:number;rezerveMiktar:number;
 durum:RezervasyonDurumu;olusturmaTarihi:string;
 sonGecerlilikTarihi?:string;
}
export interface StokTahsis{
 id:string;rezervasyonId:string;rafKodu?:string;
 miktar:number;depoId:string;personelId?:string;
 tahsisTarihi:string;
}
export interface StokUyari{
 id:string;urunId:string;seviye:"UYARI"|"KRITIK";
 mesaj:string;tarih:string;okundu:boolean;
}
export function rezervasyonTamMi(r:StokRezervasyon){
 return r.rezerveMiktar>=r.istenenMiktar&&r.durum==="REZERVE";
}
export function tahsisEksigi(r:StokRezervasyon){
 return Math.max(0,r.istenenMiktar-r.rezerveMiktar);
}
export function rezervasyonIdempotency(siparisId:string,urunId:string,depoId:string){
 return `${siparisId}:${urunId}:${depoId}`;
}
export function stokSerbestBirakilabilir(r:StokRezervasyon){
 return r.durum==="REZERVE"||r.durum==="TAHSIS_EDILDI";
}
