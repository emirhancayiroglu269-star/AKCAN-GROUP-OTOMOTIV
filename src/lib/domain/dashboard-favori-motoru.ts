export type DashboardKartTipi =
  | "CIRO"
  | "KAR"
  | "STOK"
  | "CARI_RISK"
  | "KASA"
  | "BANKA"
  | "BEKLEYEN_SIPARIS"
  | "KRITIK_STOK";

export interface FavoriMenu {
  id: string;
  kullaniciId: string;
  modul: string;
  baslik: string;
  rota: string;
  sira: number;
  sabitlenmis: boolean;
}

export interface DashboardKart {
  id: string;
  tip: DashboardKartTipi;
  baslik: string;
  gorunur: boolean;
  sira: number;
}

export function favoriSirala(favoriler: FavoriMenu[]): FavoriMenu[] {
  return [...favoriler].sort((a, b) =>
    a.sira - b.sira || a.baslik.localeCompare(b.baslik, "tr-TR")
  );
}

export function favoriEkle(
  favoriler: FavoriMenu[],
  yeni: FavoriMenu
): FavoriMenu[] {
  if (favoriler.some(x => x.kullaniciId === yeni.kullaniciId && x.rota === yeni.rota)) {
    return favoriler;
  }
  return favoriSirala([...favoriler, yeni]);
}

export function favoriSil(
  favoriler: FavoriMenu[],
  kullaniciId: string,
  rota: string
): FavoriMenu[] {
  return favoriler.filter(x => !(x.kullaniciId === kullaniciId && x.rota === rota));
}

export function dashboardKartlariniSirala(kartlar: DashboardKart[]): DashboardKart[] {
  return [...kartlar].sort((a, b) => a.sira - b.sira);
}
