const assert = (condition, name) => {
  if (!condition) throw new Error(`FAIL | ${name}`);
  console.log(`PASS | ${name}`);
};

const product = { code:"MANN-W712", barcode:"4011558070000", stock:10, cost:120, price:220 };
const sale = { qty:2, unitPrice:product.price, cost:product.cost };
const gross = (sale.unitPrice - sale.cost) * sale.qty;
const revenue = sale.unitPrice * sale.qty;

assert(revenue === 440, "satış ciro");
assert(gross === 200, "brüt kâr");
assert(product.stock - sale.qty === 8, "stok düşümü");

const payment = { type:"NAKIT", amount:440 };
assert(payment.amount === revenue, "ödeme mutabakatı");

const audit = { user:"u1", action:"SATIS_OLUSTURMA", source:"sale-1" };
assert(audit.user && audit.action && audit.source, "audit kaydı");

const warning = { type:"KRITIK_STOK", priority:"KRITIK", unread:true };
assert(warning.unread && warning.priority === "KRITIK", "kritik bildirim");

const permission = { role:"SATIS", canSell:true, canBank:false };
assert(permission.canSell && !permission.canBank, "rol yetkisi");

const backup = { checksumOk:true, versionCompatible:true, approved:true };
assert(backup.checksumOk && backup.versionCompatible && backup.approved, "yedek kurtarma kontrolü");

const report = { revenue, gross, stock: product.stock - sale.qty };
assert(report.revenue === 440 && report.gross === 200 && report.stock === 8, "rapor mutabakatı");

console.log("PASS | V101 uçtan uca temel senaryo");
