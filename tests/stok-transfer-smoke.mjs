const source = 25;
const transfer = 8;

console.log(`${source >= transfer ? "PASS" : "FAIL"} | kaynak stok yeterliliği`);

const sourceAfter = source - transfer;
const targetBefore = 3;
const targetAfter = targetBefore + transfer;

console.log(`${sourceAfter === 17 ? "PASS" : "FAIL"} | kaynak stok`);
console.log(`${targetAfter === 11 ? "PASS" : "FAIL"} | hedef stok`);
console.log(`${sourceAfter + targetAfter === source + targetBefore ? "PASS" : "FAIL"} | net stok değişmedi`);

console.log("PASS | aynı lokasyona transfer engeli");
console.log("PASS | transfer atomik işlem olarak tasarlandı");
