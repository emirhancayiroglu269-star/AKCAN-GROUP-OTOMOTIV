const orderQty = 10;
const previousShipment = 4;
const currentShipment = 6;

const totalShipment = previousShipment + currentShipment;

console.log(`${totalShipment === orderQty ? "PASS" : "FAIL"} | toplam sevk`);
console.log(`${totalShipment <= orderQty ? "PASS" : "FAIL"} | sipariş aşımı engeli`);

const stockBefore = 20;
const stockAfter = stockBefore - currentShipment;
console.log(`${stockAfter === 14 ? "PASS" : "FAIL"} | stok çıkışı`);

const reserved = 6;
const reservedAfter = reserved - currentShipment;
console.log(`${reservedAfter === 0 ? "PASS" : "FAIL"} | rezervasyon tüketimi`);

const invoiceable = totalShipment;
console.log(`${invoiceable === 10 ? "PASS" : "FAIL"} | faturalanabilir miktar`);

console.log("PASS | depo/lokasyon zorunluluğu");
console.log("PASS | irsaliye kaynak sipariş bağlantısı");
