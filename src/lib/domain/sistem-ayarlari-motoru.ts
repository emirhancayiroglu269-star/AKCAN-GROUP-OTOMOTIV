export type ParaBirimi="TRY"|"USD"|"EUR";
export type NumaraTipi="SATIS"|"ALIS"|"TAHSILAT"|"ODEME"|"IADE"|"IRSALIYE"|"CEK"|"SENET";
export interface Sirket{id:string;unvan:string;vergiNo?:string;vergiDairesi?:string;telefon?:string;email?:string;adres?:string;paraBirimi:ParaBirimi;aktif:boolean}
export interface Sube{id:string;sirketId:string;kod:string;ad:string;adres?:string;aktif:boolean}
export interface Depo{id:string;subeId:string;kod:string;ad:string;aktif:boolean}
export interface NumaraSerisi{id:string;subeId:string;tip:NumaraTipi;prefix:string;sonrakiNumara:number;basamak:number;aktif:boolean}
export function sirketDogrula(s:Sirket){if(!s.unvan?.trim())throw new Error("Şirket unvanı zorunlu.");if(!s.paraBirimi)throw new Error("Para birimi zorunlu.")}
export function belgeNumarasiUret(s:NumaraSerisi){if(!/^[A-Z0-9_-]+$/.test(s.prefix))throw new Error("Geçersiz prefix.");if(s.sonrakiNumara<0||s.basamak<1)throw new Error("Geçersiz seri.");return `${s.prefix}${String(s.sonrakiNumara).padStart(s.basamak,"0")}`}
