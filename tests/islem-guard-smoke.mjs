const cases = [
  ["admin", "satis.iptal", true],
  ["satis", "satis.olustur", true],
  ["satis", "satis.iptal", false],
  ["depo", "stok.duzenle", true],
  ["depo", "kasa.islem", false],
  ["muhasebe", "cari.islem", true],
  ["salt-okuma", "ayarlar.duzenle", false],
];

const permissions = {
  admin: ["satis.iptal","satis.olustur","stok.duzenle","kasa.islem","cari.islem","ayarlar.duzenle"],
  satis: ["satis.olustur"],
  depo: ["stok.duzenle"],
  muhasebe: ["cari.islem"],
  "salt-okuma": []
};

for (const [role, permission, expected] of cases) {
  const actual = permissions[role]?.includes(permission) ?? false;
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${role} | ${permission} | beklenen=${expected} gerçek=${actual}`);
  if (!ok) process.exitCode = 1;
}
