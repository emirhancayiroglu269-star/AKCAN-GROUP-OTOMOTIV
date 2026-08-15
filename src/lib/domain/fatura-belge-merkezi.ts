export type BelgeTipi="SATIS_FATURASI"|"ALIS_FATURASI"|"E_FATURA"|"E_ARSIV"|"IRSALIYE";
export type BelgeDurumu="TASLAK"|"ONAYLANDI"|"GONDERILDI"|"IPTAL";
export interface Belge{
 id:string;tip:BelgeTipi;serino:string;sirano:number;
 tarih:string;cariId:string;toplam:number;kdv:number;
 durum:BelgeDurumu;referansId:string;
}
export function belgeNumarasi(seri:string,sira:number){
 if(!seri.trim()) throw new Error("Belge serisi zorunludur.");
 if(!Number.isInteger(sira)||sira<=0) throw new Error("Belge sıra numarası geçersiz.");
 return `${seri.trim()}${String(sira).padStart(9,"0")}`;
}
export function belgeKontrol(b:Belge){
 if(!b.id||!b.cariId||!b.referansId) throw new Error("Belge kimlik alanları eksik.");
 if(b.toplam<0||b.kdv<0) throw new Error("Belge tutarı negatif olamaz.");
 if(b.tip==="E_FATURA" && !b.cariId) throw new Error("E-Fatura için cari zorunludur.");
}
export function belgeIdempotency(referansId:string,tip:BelgeTipi){
 return `${referansId}:${tip}`;
}
export function belgeYazdirilebilir(b:Belge){
 return b.durum==="ONAYLANDI"||b.durum==="GONDERILDI";
}
