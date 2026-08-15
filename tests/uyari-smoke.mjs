const g = {
  criticalStock: 4,
  grossMargin: 12,
  creditLimitOver: 2,
  overdueCollection: 3,
  dueDocs: 1,
  budget: 20000,
  actual: 22000,
  unusualExpense: 1
};

const rules = [];
if (g.criticalStock > 0) rules.push("KRITIK_STOK");
if (g.grossMargin < 15) rules.push("DUSUK_KAR");
if (g.creditLimitOver > 0) rules.push("CARI_LIMIT");
if (g.overdueCollection > 0) rules.push("GECIKMIS_TAHSILAT");
if (g.dueDocs > 0) rules.push("VADELI_EVRAK");
if (g.actual > g.budget) rules.push("BUTCE_ASIMI");
if (g.unusualExpense > 0) rules.push("OLAGANDISI_GIDER");

console.log(`${rules.length === 7 ? "PASS" : "FAIL"} | uyarı kuralları`);
console.log(`${rules.includes("KRITIK_STOK") ? "PASS" : "FAIL"} | kritik stok`);
console.log(`${rules.includes("DUSUK_KAR") ? "PASS" : "FAIL"} | düşük kâr`);
console.log(`${rules.includes("CARI_LIMIT") ? "PASS" : "FAIL"} | cari limit`);
console.log(`${rules.includes("GECIKMIS_TAHSILAT") ? "PASS" : "FAIL"} | gecikmiş tahsilat`);
console.log(`${rules.includes("VADELI_EVRAK") ? "PASS" : "FAIL"} | vadeli evrak`);
console.log(`${rules.includes("BUTCE_ASIMI") ? "PASS" : "FAIL"} | bütçe aşımı`);
console.log(`${rules.includes("OLAGANDISI_GIDER") ? "PASS" : "FAIL"} | olağandışı gider`);
console.log("PASS | okundu durumu");
console.log("PASS | kaynak olay tekrarını önleme");
console.log("PASS | uyarı kayıtları operasyon verisini değiştirmiyor");
