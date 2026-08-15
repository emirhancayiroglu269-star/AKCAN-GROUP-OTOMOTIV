export type KararOnceligi="KRITIK"|"YUKSEK"|"NORMAL"|"DUSUK";
export type KararAksiyonu="ACIL_SIPARIS"|"STOKLA"|"TRANSFER_ET"|"NORMAL_TAKIP"|"AZALT"|"ALMA";

export interface StokKarar{
 urunId:string;depoId:string;abc:string;xyz:string;
 stokSeviyesi:"NORMAL"|"DUSUK"|"KRITIK"|"TUKENDI";
 mevcut:number;rezerve:number;beklenenGiris:number;
 onerilenMiktar:number;oncelik:KararOnceligi;aksiyon:KararAksiyonu;
}

export interface DashboardOzet{
 toplamUrun:number;kritik:number;tukenen:number;
 acilSiparis:number;transferOnerisi:number;
 azaltOnerisi:number;almaOnerisi:number;
}

export function kararOnceligi(
 stokSeviyesi:StokKarar["stokSeviyesi"],abc:string,xyz:string
):KararOnceligi{
 if(stokSeviyesi==="TUKENDI")return "KRITIK";
 if(stokSeviyesi==="KRITIK" && abc==="A")return "KRITIK";
 if(stokSeviyesi==="KRITIK" || abc==="A")return "YUKSEK";
 if(xyz==="Z")return "NORMAL";
 return "DUSUK";
}

export function kararAksiyonu(
 stokSeviyesi:StokKarar["stokSeviyesi"],abc:string,onerilenMiktar:number
):KararAksiyonu{
 if(stokSeviyesi==="TUKENDI" && onerilenMiktar>0)return "ACIL_SIPARIS";
 if(stokSeviyesi==="KRITIK" && onerilenMiktar>0)return "STOKLA";
 if(abc==="A")return "STOKLA";
 if(abc==="C")return "AZALT";
 return "NORMAL_TAKIP";
}

export function dashboardOzet(kararlar:StokKarar[]):DashboardOzet{
 return {
  toplamUrun:kararlar.length,
  kritik:kararlar.filter(x=>x.stokSeviyesi==="KRITIK").length,
  tukenen:kararlar.filter(x=>x.stokSeviyesi==="TUKENDI").length,
  acilSiparis:kararlar.filter(x=>x.aksiyon==="ACIL_SIPARIS").length,
  transferOnerisi:kararlar.filter(x=>x.aksiyon==="TRANSFER_ET").length,
  azaltOnerisi:kararlar.filter(x=>x.aksiyon==="AZALT").length,
  almaOnerisi:kararlar.filter(x=>x.aksiyon==="ALMA").length
 };
}
