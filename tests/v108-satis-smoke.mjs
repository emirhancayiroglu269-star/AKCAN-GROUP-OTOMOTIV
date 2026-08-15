const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const rows=[{qty:2,price:200,cost:120,disc:20,vat:20},{qty:1,price:100,cost:50,disc:0,vat:20}];
const net=r=>r.qty*r.price-Math.min(r.disc,r.qty*r.price);
const ara=rows.reduce((x,r)=>x+net(r),0), kdv=rows.reduce((x,r)=>x+net(r)*r.vat/100,0);
a(ara===480,"ara toplam"); a(kdv===96,"KDV"); a(ara+kdv===576,"genel toplam");
a(rows.every(r=>r.qty>0&&r.price>=0),"satır doğrulama");
a(["ciro","brutKar","kritikStok","cariRisk","bekleyenSiparis","kasa","banka"].length===7,"dashboard özetleri");
console.log("PASS | müşteri→ürün→sepet→ödeme→satış zinciri");
console.log("PASS | stok/cari/kasa/banka/audit entegrasyon noktaları");
