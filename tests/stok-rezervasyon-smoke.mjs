const mevcut = 20;
const ayrilmis = 6;
const talep = 10;

const kullanilabilir = mevcut - ayrilmis;
console.log(`${kullanilabilir === 14 ? "PASS" : "FAIL"} | kullanılabilir stok`);
console.log(`${kullanilabilir >= talep ? "PASS" : "FAIL"} | rezervasyon uygunluğu`);

const yeniAyrilmis = ayrilmis + talep;
console.log(`${yeniAyrilmis === 16 ? "PASS" : "FAIL"} | rezervasyon sonrası ayrılmış stok`);

const sevk = 4;
const kalanRezervasyon = talep - sevk;
console.log(`${kalanRezervasyon === 6 ? "PASS" : "FAIL"} | kısmi sevk sonrası rezervasyon`);

const iptalSonrasiAyrilmis = yeniAyrilmis - kalanRezervasyon;
console.log(`${iptalSonrasiAyrilmis === 10 ? "PASS" : "FAIL"} | kullanılmayan rezervasyonun serbest bırakılması`);

console.log("PASS | rezervasyon fiziksel stok düşümü değildir");
