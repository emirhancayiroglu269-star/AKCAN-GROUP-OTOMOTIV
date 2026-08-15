export type ExportTipi="URUN"|"STOK"|"MUSTERI"|"TEDARIKCI"|"SATIS"|"ALIS"|"CARI"|"RAPOR";
export type SablonTipi="URUN_IMPORT"|"MUSTERI_IMPORT"|"TEDARIKCI_IMPORT";
export interface ExportFiltresi{baslangic?:string;bitis?:string;subeId?:string;depoId?:string;aktif?:boolean}
const S:Record<SablonTipi,string[]>={
 URUN_IMPORT:["stokKodu","urunAdi","marka","kategori","barkod","alisFiyati","satisFiyati","kdvOrani","minimumStok"],
 MUSTERI_IMPORT:["cariKodu","unvan","telefon","email","adres","vergiNo","vadeGunu","limit"],
 TEDARIKCI_IMPORT:["cariKodu","unvan","telefon","email","adres","vergiNo","vadeGunu","limit"]
};
export function sablonGetir(t:SablonTipi){return [...S[t]]}
export function exportFiltresiDogrula(f:ExportFiltresi){if(f.baslangic&&f.bitis&&f.baslangic>f.bitis)throw new Error("Tarih aralığı geçersiz.")}
export function exportDosyaAdi(t:ExportTipi,tarih:string){return `AKCAN-${t}-${tarih.replace(/[^0-9-]/g,"")}.csv`}
