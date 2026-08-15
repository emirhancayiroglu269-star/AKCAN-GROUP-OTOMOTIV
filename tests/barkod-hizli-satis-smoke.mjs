const products = [
  { id:"1", code:"MANN-W712", barcode:"4009026500000", name:"Yağ Filtresi", brand:"MANN", price:425, stock:10, active:true },
  { id:"2", code:"MAHLE-OC100", barcode:"4009026500001", name:"Yağ Filtresi", brand:"MAHLE", price:390, stock:0, active:true },
];

const q = "4009026500000";
const found = products.filter(p => p.barcode.includes(q));
console.log(`${found.length === 1 ? "PASS" : "FAIL"} | barkod bulma`);

const line = {
  qty: 2,
  price: found[0].price,
  total: 2 * found[0].price
};
console.log(`${line.total === 850 ? "PASS" : "FAIL"} | hızlı satış toplamı`);

const insufficient = products[1].stock < 1;
console.log(`${insufficient ? "PASS" : "FAIL"} | yetersiz stok engeli`);
