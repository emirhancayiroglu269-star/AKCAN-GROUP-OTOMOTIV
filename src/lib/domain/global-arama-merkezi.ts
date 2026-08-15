export type AramaKaynak=
 "URUN"|"STOK"|"MUSTERI"|"TEDARIKCI"|"FATURA"|"CARI"|"SATIS"|"ALIS"|"FINANS";
export interface AramaKaydi{
 id:string;kaynak:AramaKaynak;baslik:string;
 kod?:string;barkod?:string;oem?:string;
 aciklama?:string;route:string;
}
export interface AramaSonucu extends AramaKaydi{eslesme:string}
const alanlar=["baslik","kod","barkod","oem","aciklama"] as const;
export function globalAra(kayitlar:AramaKaydi[],sorgu:string){
 const q=sorgu.trim().toLocaleLowerCase("tr-TR");
 if(!q) return [];
 return kayitlar.flatMap(x=>{
  for(const alan of alanlar){
   const v=x[alan];
   if(v && String(v).toLocaleLowerCase("tr-TR").includes(q))
     return [{...x,eslesme:alan}];
  }
  return [];
 });
}
export function aramaKaynakSirala(s:AramaSonucu[]){
 const oncelik:Record<AramaKaynak,number>={
  URUN:1,STOK:2,MUSTERI:3,TEDARIKCI:4,FATURA:5,CARI:6,SATIS:7,ALIS:8,FINANS:9
 };
 return [...s].sort((a,b)=>oncelik[a.kaynak]-oncelik[b.kaynak]);
}
