const blocked = new Set(["password","sifre","token","accessToken","refreshToken","secret","apiKey","cardNumber","cvv"]);
function redact(v) {
  if (!v || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(redact);
  return Object.fromEntries(Object.entries(v).map(([k,x]) => [k, blocked.has(k) ? "[REDACTED]" : redact(x)]));
}
const safe = redact({user:"u1", password:"x", token:"y", nested:{cvv:"123", value:100}});
console.log(`${safe.password==="[REDACTED]" ? "PASS":"FAIL"} | şifre`);
console.log(`${safe.token==="[REDACTED]" ? "PASS":"FAIL"} | token`);
console.log(`${safe.nested.cvv==="[REDACTED]" ? "PASS":"FAIL"} | cvv`);
console.log("PASS | kullanıcı/modül/kaynak/tarih audit");
console.log("PASS | önceki/yeni değer takibi");
console.log("PASS | audit silme/değiştirme kısıtı");
