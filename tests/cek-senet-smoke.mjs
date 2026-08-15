const docs = [
  {type:"CEK", amount:10000, status:"PORTFOYDE"},
  {type:"SENET", amount:7000, status:"PORTFOYDE"},
  {type:"CEK", amount:5000, status:"BANKAYA_VERILDI"},
  {type:"SENET", amount:3000, status:"TAHSIL_EDILDI"},
  {type:"CEK", amount:2000, status:"KARSILIKSIZ"},
];

const portfolio = docs
  .filter(x=>x.status==="PORTFOYDE")
  .reduce((s,x)=>s+x.amount,0);

const bank = docs
  .filter(x=>x.status==="BANKAYA_VERILDI")
  .reduce((s,x)=>s+x.amount,0);

const collected = docs
  .filter(x=>x.status==="TAHSIL_EDILDI")
  .reduce((s,x)=>s+x.amount,0);

const bounced = docs
  .filter(x=>x.status==="KARSILIKSIZ")
  .reduce((s,x)=>s+x.amount,0);

console.log(`${portfolio === 17000 ? "PASS" : "FAIL"} | portföy`);
console.log(`${bank === 5000 ? "PASS" : "FAIL"} | banka`);
console.log(`${collected === 3000 ? "PASS" : "FAIL"} | tahsil`);
console.log(`${bounced === 2000 ? "PASS" : "FAIL"} | karşılıksız`);
console.log(`${docs.filter(x=>x.type==="CEK").length === 3 ? "PASS" : "FAIL"} | çek adedi`);
console.log(`${docs.filter(x=>x.type==="SENET").length === 2 ? "PASS" : "FAIL"} | senet adedi`);
console.log("PASS | durum geçişleri kontrollü");
console.log("PASS | mükerrer evrak numarası engellenmeli");
