export interface YoneticiPanelVerisi{
 ciro:number;brutKar:number;netKar:number;stokDegeri:number;
 cariRisk:number;kasa:number;banka:number;kritikStok:number;
 bekleyenSiparis:number;gunlukSatis:number;gunlukAlis:number;
 personelPerformansi:PersonelPerformansi[];
}
export interface PersonelPerformansi{
 personelId:string;ad:string;satisCirosu:number;brutKar:number;satisAdedi:number;
}
export interface YoneticiPanelOzet{
 likitBakiye:number;karMarji:number;stokRiskli:boolean;
 finansRiskli:boolean;operasyonBekleyen:number;
}
export function yoneticiPanelOzetle(v:YoneticiPanelVerisi):YoneticiPanelOzet{
 return {
  likitBakiye:v.kasa+v.banka,
  karMarji:v.ciro===0?0:(v.brutKar/v.ciro)*100,
  stokRiskli:v.kritikStok>0,
  finansRiskli:v.cariRisk>0,
  operasyonBekleyen:v.bekleyenSiparis
 };
}
export function personelSiralama(p:PersonelPerformansi[]){
 return [...p].sort((a,b)=>b.satisCirosu-a.satisCirosu);
}
