const cases = [
  ["admin", "satis.olustur", true],
  ["admin", "satis.iptal", true],
  ["satis", "satis.olustur", true],
  ["satis", "satis.iptal", false],
  ["depo", "alis.olustur", true],
  ["depo", "stok.duzenle", true],
  ["depo", "kasa.islem", false],
  ["muhasebe", "kasa.islem", true],
  ["muhasebe", "cari.islem", true],
  ["salt-okuma", "satis.olustur", false],
];

const permissions = {
  admin: ["satis.olustur","satis.iptal","iade.olustur","alis.olustur","stok.duzenle","kasa.islem","cari.islem"],
  satis: ["satis.olustur","iade.olustur"],
  depo: ["alis.olustur","stok.duzenle"],
  muhasebe: ["kasa.islem","cari.islem"],
  "salt-okuma": []
};

for (const [role, op, expected] of cases) {
  const actual = permissions[role]?.includes(op) ?? false;
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${role} | ${op} | beklenen=${expected} gerçek=${actual}`);
  if (!ok) process.exitCode = 1;
}
