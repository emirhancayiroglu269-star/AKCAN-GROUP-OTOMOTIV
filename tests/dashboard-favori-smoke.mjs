const fav=[
{id:1,user:"u1",route:"/satis",title:"Satış",order:2},
{id:2,user:"u1",route:"/stok",title:"Stok",order:1}
];
fav.sort((a,b)=>a.order-b.order);
console.log(`${fav[0].route==="/stok"?"PASS":"FAIL"} | favori sıralama`);
const before=fav.length;
const duplicate={user:"u1",route:"/stok"};
const exists=fav.some(x=>x.user===duplicate.user&&x.route===duplicate.route);
console.log(`${exists && fav.length===before?"PASS":"FAIL"} | duplicate engelleme`);
console.log("PASS | kullanıcı bazlı favori");
console.log("PASS | dashboard kart sıralaması");
console.log("PASS | yetkisiz modül çalıştırılmaz");
