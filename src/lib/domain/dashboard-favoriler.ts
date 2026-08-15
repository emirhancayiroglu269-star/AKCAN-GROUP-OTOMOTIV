export type FavoriTipi="MODUL"|"ISLEM"|"RAPOR"|"KISAYOL";
export interface DashboardKarti{
 id:string;baslik:string;tip:string;route:string;
 aktif:boolean;siralama:number;boyut:"S"|"M"|"L";
}
export interface Favori{
 id:string;kullaniciId:string;tipi:FavoriTipi;
 baslik:string;route:string;siralama:number;aktif:boolean;
}
export interface KullaniciDashboard{
 kullaniciId:string;kartlar:DashboardKarti[];favoriler:Favori[];
}
export function dashboardSirala(kartlar:DashboardKarti[]){
 return [...kartlar].filter(x=>x.aktif).sort((a,b)=>a.siralama-b.siralama);
}
export function favoriSirala(favoriler:Favori[]){
 return [...favoriler].filter(x=>x.aktif).sort((a,b)=>a.siralama-b.siralama);
}
export function favoriIdempotency(kullaniciId:string,tipi:FavoriTipi,route:string){
 return `${kullaniciId}:${tipi}:${route}`;
}
