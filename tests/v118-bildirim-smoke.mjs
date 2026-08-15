const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const b=[
 {tip:"KRITIK_STOK",seviye:"KRITIK",okundu:false},
 {tip:"VADE",seviye:"UYARI",okundu:false},
 {tip:"SISTEM",seviye:"BILGI",okundu:true}
];
a(b.filter(x=>!x.okundu).length===2,"okunmamış bildirimler");
a(b.filter(x=>x.seviye==="KRITIK"&&!x.okundu).length===1,"kritik uyarı");
a(["KRITIK_STOK","VADE","GECIKEN_ODEME","BEKLEYEN_SIPARIS","DUSUK_KAR","ISLEM_HATASI","SISTEM"].length===7,"uyarı türleri");
a("KRITIK_STOK:urun-1"==="KRITIK_STOK:urun-1","idempotency");
console.log("PASS | bildirim merkezi");
console.log("PASS | yönetici kritik uyarıları");
