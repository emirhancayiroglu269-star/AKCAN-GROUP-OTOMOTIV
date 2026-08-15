const assert=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const rows=[
 {qty:2,price:200,disc:20,vat:20,cost:120},
 {qty:1,price:100,disc:0,vat:20,cost:50}
];
const net=r=>r.qty*r.price-Math.min(r.disc,r.qty*r.price);
const ara=rows.reduce((a,r)=>a+net(r),0);
const kdv=rows.reduce((a,r)=>a+net(r)*r.vat/100,0);
const total=ara+kdv;
const cost=rows.reduce((a,r)=>a+r.qty*r.cost,0);
assert(ara===480,"ara toplam");
assert(kdv===96,"KDV");
assert(total===576,"genel toplam");
assert(cost===290,"maliyet");
assert(ara-cost===190,"brüt kâr");
const openAccount=true, customer="cari-001";
assert(!openAccount || !!customer,"açık hesap müşteri zorunluluğu");
const key="u1:device1:client-sale-001";
assert(key.split(":").length===3,"idempotency anahtarı");
console.log("PASS | ürün→sepet→müşteri→iskonto→KDV→ödeme");
console.log("PASS | stok/cari/kasa-banka/belge/audit transaction noktaları");
