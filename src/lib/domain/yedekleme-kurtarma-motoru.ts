export type YedekTipi="TAM"|"ARTIMSAL"|"MANUEL";
export interface YedekManifest{id:string;tip:YedekTipi;olusturmaTarihi:string;kaynakSurum:string;veriSurumu:number;dosyaAdi:string;checksum:string;boyutByte:number;sifreli:boolean;}
export function yedekManifestDogrula(m:YedekManifest){if(!m.id||!m.dosyaAdi||!m.checksum)throw new Error("Eksik manifest");if(m.boyutByte<0)throw new Error("Geçersiz boyut");if(Number.isNaN(new Date(m.olusturmaTarihi).getTime()))throw new Error("Geçersiz tarih");}
export function kurtarmaUygunMu(m:YedekManifest,checksum:boolean,mevcutSurum:number,onay:boolean){yedekManifestDogrula(m);return checksum&&m.veriSurumu<=mevcutSurum&&onay;}
