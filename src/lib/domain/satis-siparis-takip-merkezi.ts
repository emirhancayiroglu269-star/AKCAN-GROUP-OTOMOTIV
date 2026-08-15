export type SiparisDurumu=
 "TASLAK"|"ONAY_BEKLIYOR"|"ONAYLANDI"|"HAZIRLANIYOR"|"SEVKIYATTA"|
 "TESLIM_EDILDI"|"TAMAMLANDI"|"IPTAL"|"IADE";

export type SiparisKaynak="SATIS"|"TEKLIF"|"B2B"|"TRENDYOL"|"DIGER";

export interface SiparisKalemi{
 id:string;urunId:string;stokKodu?:string;miktar:number;
 birimFiyat:number;iskontoOrani:number;kdvOrani:number;
}

export interface Siparis{
 id:string;siparisNo:string;musteriId:string;
 kaynak:SiparisKaynak;durum:SiparisDurumu;
 kalemler:SiparisKalemi[];toplam:number;
 olusturmaTarihi:string;teslimatTarihi?:string;
 kargoTakipNo?:string;referansId?:string;
}

export interface SiparisDurumGecmisi{
 id:string;siparisId:string;eskiDurum?:SiparisDurumu;
 yeniDurum:SiparisDurumu;kullaniciId:string;tarih:string;not?:string;
}

export function siparisNetTutar(k:SiparisKalemi){
 return k.miktar*k.birimFiyat*(1-k.iskontoOrani/100);
}

export function siparisToplam(s:Siparis){
 return s.kalemler.reduce((t,k)=>t+siparisNetTutar(k),0);
}

export function siparisIdempotency(kaynak:SiparisKaynak,referansId:string){
 return `${kaynak}:${referansId}`;
}

export function sevkiyatBaslatilabilir(s:Siparis){
 return s.durum==="HAZIRLANIYOR" && s.kalemler.length>0;
}

export function durumGecisi(
 mevcut:SiparisDurumu,yeni:SiparisDurumu
){
 if(mevcut==="TAMAMLANDI"||mevcut==="IPTAL") return false;
 return true;
}
