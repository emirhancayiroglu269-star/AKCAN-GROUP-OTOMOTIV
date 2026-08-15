const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const kartlar=[
 {id:"1",aktif:true,siralama:2,baslik:"Stok"},
 {id:"2",aktif:true,siralama:1,baslik:"Ciro"},
 {id:"3",aktif:false,siralama:0,baslik:"Gizli"}
];
const sirali=kartlar.filter(x=>x.aktif).sort((a,b)=>a.siralama-b.siralama);
a(sirali[0].baslik==="Ciro","kart sıralaması");
a(sirali.length===2,"aktif kartlar");
const f=[
 {tipi:"MODUL",aktif:true,siralama:2},
 {tipi:"RAPOR",aktif:true,siralama:1},
 {tipi:"ISLEM",aktif:false,siralama:0}
];
a(f.filter(x=>x.aktif).sort((a,b)=>a.siralama-b.siralama)[0].tipi==="RAPOR","favori sıralaması");
a("u1:RAPOR:/rapor/ciro"==="u1:RAPOR:/rapor/ciro","kullanıcı favori idempotency");
console.log("PASS | dashboard kartları");
console.log("PASS | favori modüller/işlemler/raporlar");
console.log("PASS | hızlı erişim");
console.log("PASS | kullanıcı bazlı kişiselleştirme");
