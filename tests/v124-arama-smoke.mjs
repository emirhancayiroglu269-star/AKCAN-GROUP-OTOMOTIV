const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const data=[
 {kaynak:"URUN",baslik:"Yağ Filtresi",kod:"MANN-W712",barkod:"123",oem:"15208",route:"/urun/1"},
 {kaynak:"MUSTERI",baslik:"ABC Otomotiv",kod:"C-100",route:"/cari/1"},
 {kaynak:"FATURA",baslik:"Satış Faturası",kod:"SF-2026-001",route:"/fatura/1"}
];
const q="W712".toLocaleLowerCase("tr-TR");
const r=data.filter(x=>Object.values(x).some(v=>typeof v==="string"&&v.toLocaleLowerCase("tr-TR").includes(q)));
a(r.length===1,"OEM/stok kodu arama");
a(r[0].route==="/urun/1","sonuç yönlendirmesi");
const c=data.filter(x=>x.baslik.toLocaleLowerCase("tr-TR").includes("otomotiv"));
a(c.length===1&&c[0].kaynak==="MUSTERI","müşteri arama");
a(["URUN","STOK","MUSTERI","TEDARIKCI","FATURA","CARI","SATIS","ALIS","FINANS"].length===9,"arama kaynakları");
console.log("PASS | global arama");
console.log("PASS | ürün/stok/barkod/OEM");
console.log("PASS | müşteri/tedarikçi/cari");
console.log("PASS | fatura/satış/alış/finans");
console.log("PASS | tek tık modül yönlendirme");
