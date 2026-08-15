export type CihazTipi="MOBIL"|"TABLET"|"LAPTOP"|"PC";
export type Yon="Dikey"|"Yatay";
export interface ResponsiveBreakpoint{
 cihaz:CihazTipi;minWidth:number;maxWidth?:number;
}
export interface MobilModul{
 id:string;ad:string;route:string;aktif:boolean;
 mobilGoster:boolean;altMenu:boolean;siralama:number;
}
export interface MobilDashboard{
 kullaniciId:string;cihaz:CihazTipi;yon:Yon;
 kartSutun:number;menuAcik:boolean;
}
export const varsayilanBreakpointler:ResponsiveBreakpoint[]=[
 {cihaz:"MOBIL",minWidth:0,maxWidth:767},
 {cihaz:"TABLET",minWidth:768,maxWidth:1023},
 {cihaz:"LAPTOP",minWidth:1024,maxWidth:1439},
 {cihaz:"PC",minWidth:1440}
];
export function cihazBelirle(width:number):CihazTipi{
 if(width<768)return "MOBIL";
 if(width<1024)return "TABLET";
 if(width<1440)return "LAPTOP";
 return "PC";
}
export function mobilModulleriSirala(moduller:MobilModul[]){
 return [...moduller].filter(x=>x.aktif&&x.mobilGoster).sort((a,b)=>a.siralama-b.siralama);
}
export function dashboardSutunSayisi(cihaz:CihazTipi){
 if(cihaz==="MOBIL")return 1;
 if(cihaz==="TABLET")return 2;
 if(cihaz==="LAPTOP")return 3;
 return 4;
}
