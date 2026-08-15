export type HizliIslem=
 "YENI_SATIS"|"YENI_ALIS"|"TAHSILAT"|"ODEME"|"URUN_ARA"|"CARI_ARA"|
 "STOK_ARA"|"FATURA"|"BARKOD_SATISI";
export interface Kisayol{
 id:string;islem:HizliIslem;etiket:string;shortcut:string;
 route:string;aktif:boolean;siralama:number;
}
export const varsayilanKisayollar:Kisayol[]=[
 {id:"1",islem:"YENI_SATIS",etiket:"Yeni Satış",shortcut:"F2",route:"/satis/yeni",aktif:true,siralama:1},
 {id:"2",islem:"YENI_ALIS",etiket:"Yeni Alış",shortcut:"F3",route:"/alis/yeni",aktif:true,siralama:2},
 {id:"3",islem:"TAHSILAT",etiket:"Tahsilat",shortcut:"F4",route:"/finans/tahsilat",aktif:true,siralama:3},
 {id:"4",islem:"ODEME",etiket:"Ödeme",shortcut:"F5",route:"/finans/odeme",aktif:true,siralama:4},
 {id:"5",islem:"URUN_ARA",etiket:"Ürün Ara",shortcut:"Ctrl+K",route:"/arama?tip=urun",aktif:true,siralama:5},
 {id:"6",islem:"CARI_ARA",etiket:"Cari Ara",shortcut:"Ctrl+Shift+K",route:"/arama?tip=cari",aktif:true,siralama:6},
 {id:"7",islem:"STOK_ARA",etiket:"Stok Ara",shortcut:"F6",route:"/arama?tip=stok",aktif:true,siralama:7},
 {id:"8",islem:"FATURA",etiket:"Fatura",shortcut:"F7",route:"/fatura",aktif:true,siralama:8},
 {id:"9",islem:"BARKOD_SATISI",etiket:"Barkod Satışı",shortcut:"F8",route:"/satis/barkod",aktif:true,siralama:9}
];
export function kisayolBul(liste:Kisayol[],shortcut:string){
 return liste.find(x=>x.aktif&&x.shortcut.toLowerCase()===shortcut.toLowerCase());
}
export function aktifKisayollar(liste:Kisayol[]){
 return liste.filter(x=>x.aktif).sort((a,b)=>a.siralama-b.siralama);
}
