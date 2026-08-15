export type Kisayol="F2"|"F3"|"F4"|"F6"|"F7"|"F8"|"F9"|"ESC"|"CTRL_K"|"CTRL_ENTER";
export type HizliIslem="URUN_ARA"|"MUSTERI_SEC"|"SEPETE_EKLE"|"SATIS_KAYDET"|"ODEME_AC"|"SATIS_IPTAL"|"GLOBAL_ARAMA"|"FORM_TEMIZLE";
export const KISAYOLLAR=[
["F2","URUN_ARA","Ürün/stok ara"],["F3","MUSTERI_SEC","Müşteri seç"],
["F4","SEPETE_EKLE","Ürünü sepete ekle"],["F6","ODEME_AC","Ödeme ekranı"],
["F7","SATIS_KAYDET","Satışı kaydet"],["F8","SATIS_IPTAL","Satışı iptal et"],
["F9","GLOBAL_ARAMA","Global arama"],["ESC","FORM_TEMIZLE","Formu temizle"],
["CTRL_K","GLOBAL_ARAMA","Global arama"],["CTRL_ENTER","SATIS_KAYDET","Formu kaydet"]
] as const;
const IZIN:Record<HizliIslem,string>={URUN_ARA:"URUN_GOR",MUSTERI_SEC:"CARI_GOR",SEPETE_EKLE:"SATIS_OLUSTUR",SATIS_KAYDET:"SATIS_OLUSTUR",ODEME_AC:"SATIS_OLUSTUR",SATIS_IPTAL:"SATIS_IPTAL",GLOBAL_ARAMA:"RAPOR_GOR",FORM_TEMIZLE:"URUN_GOR"};
export function yetkiliMi(islem:HizliIslem,izinler:string[]){return izinler.includes(IZIN[islem])}
