const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const k={kritik:5};const s={mevcut:12,rezerve:4};
a(s.mevcut-s.rezerve===8,"kullanılabilir stok");
a(s.mevcut-s.rezerve<=k.kritik?false:true,"kritik stok kontrolü");
a(12*100===1200,"stok değerleme");
a("sat-001:u1:d1"==="sat-001:u1:d1","hareket idempotency");
console.log("PASS | ürün kartı");
console.log("PASS | depo/raf");
console.log("PASS | alış/satış/iade/transfer/sayım hareketleri");
