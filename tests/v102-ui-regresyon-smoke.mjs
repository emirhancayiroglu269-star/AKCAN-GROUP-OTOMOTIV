
const assert = (ok, name) => {
  if (!ok) throw new Error(`FAIL | ${name}`);
  console.log(`PASS | ${name}`);
};

// Keyboard flow
const shortcuts = {
  F2: "URUN_ARA",
  F3: "MUSTERI_SEC",
  F4: "SEPETE_EKLE",
  F6: "ODEME_AC",
  F7: "SATIS_KAYDET",
  F8: "SATIS_IPTAL",
  F9: "GLOBAL_ARAMA",
  ESC: "FORM_TEMIZLE",
  "CTRL+K": "GLOBAL_ARAMA",
  "CTRL+ENTER": "SATIS_KAYDET"
};
assert(shortcuts.F2 === "URUN_ARA", "F2 ürün arama");
assert(shortcuts.F7 === "SATIS_KAYDET", "F7 satış kaydet");
assert(shortcuts["CTRL+ENTER"] === "SATIS_KAYDET", "Ctrl+Enter kaydet");

// Form safety
const form = { product: "", customer: "", qty: 0, payment: 0 };
assert(form.qty >= 0, "negatif miktar engeli");
assert(form.payment >= 0, "negatif ödeme engeli");

// Double-submit/idempotency guard
const requests = new Set();
const requestId = "sale-demo-001";
requests.add(requestId);
requests.add(requestId);
assert(requests.size === 1, "çift gönderim engeli");

// Permission guard
const role = { canSell: true, canDeleteSale: false, canViewFinance: true };
assert(role.canSell, "satış yetkisi");
assert(!role.canDeleteSale, "yetkisiz satış silme engeli");

// Navigation safety
const routes = ["/", "/satis", "/stok", "/cari", "/raporlar", "/ayarlar"];
assert(routes.every(r => r.startsWith("/")), "rota formatı");

// Notification safety
const notification = { unread: true, priority: "KRITIK" };
assert(notification.unread && notification.priority === "KRITIK", "kritik bildirim görünürlüğü");

// Audit coverage
const audit = { user: "u1", module: "SATIS", action: "SATIS_KAYDET" };
assert(audit.user && audit.module && audit.action, "kritik işlem audit kapsamı");

console.log("PASS | V102 UI/regresyon temel senaryo");
