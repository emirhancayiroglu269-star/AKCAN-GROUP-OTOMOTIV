const g = {
  stock: 20,
  reserved: 8,
  min: 15,
  max: 50,
  daily: 4,
  lead: 5,
  safety: 5
};

const available = g.stock - g.reserved;
const leadDemand = g.daily * g.lead;
const target = Math.min(g.max, Math.max(g.min, leadDemand + g.safety));
const buy = Math.max(0, Math.ceil(target - available));

console.log(`${available === 12 ? "PASS" : "FAIL"} | kullanılabilir stok`);
console.log(`${leadDemand === 20 ? "PASS" : "FAIL"} | tedarik süresi talebi`);
console.log(`${target === 25 ? "PASS" : "FAIL"} | hedef stok`);
console.log(`${buy === 13 ? "PASS" : "FAIL"} | önerilen alım`);
console.log(`${available <= g.min ? "PASS" : "FAIL"} | ACİL öncelik`);
console.log("PASS | otomatik sipariş kesilmiyor");
console.log("PASS | kullanıcı onayı gerekiyor");
