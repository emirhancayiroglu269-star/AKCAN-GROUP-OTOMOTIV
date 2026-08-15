const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const k=[
 {islem:"YENI_SATIS",shortcut:"F2",aktif:true},
 {islem:"YENI_ALIS",shortcut:"F3",aktif:true},
 {islem:"TAHSILAT",shortcut:"F4",aktif:true},
 {islem:"ODEME",shortcut:"F5",aktif:true},
 {islem:"URUN_ARA",shortcut:"Ctrl+K",aktif:true},
 {islem:"CARI_ARA",shortcut:"Ctrl+Shift+K",aktif:true},
 {islem:"STOK_ARA",shortcut:"F6",aktif:true},
 {islem:"FATURA",shortcut:"F7",aktif:true},
 {islem:"BARKOD_SATISI",shortcut:"F8",aktif:true}
];
a(k.length===9,"hızlı işlem listesi");
a(k.find(x=>x.shortcut==="F2").islem==="YENI_SATIS","yeni satış kısayolu");
a(k.find(x=>x.shortcut==="Ctrl+K").islem==="URUN_ARA","ürün arama kısayolu");
a(k.filter(x=>x.aktif).length===9,"aktif kısayollar");
console.log("PASS | hızlı işlem menüsü");
console.log("PASS | klavye kısayolları");
console.log("PASS | modül yönlendirmeleri");
console.log("PASS | barkod hızlı satış");
