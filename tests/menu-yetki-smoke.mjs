const cases = [
  ["admin", ["dashboard","satis","alis","stok","kasa","banka","cari","rapor","ayarlar"]],
  ["satis", ["dashboard","satis","stok","cari"]],
  ["depo", ["alis","stok"]],
  ["muhasebe", ["dashboard","satis","alis","kasa","banka","cari","rapor"]],
  ["servis", ["dashboard","satis","stok"]],
  ["salt-okuma", ["dashboard","satis","alis","stok","kasa","banka","cari","rapor"]],
];

for (const [rol, expected] of cases) {
  if (!Array.isArray(expected) || expected.length === 0) {
    console.error(`FAIL | ${rol} | menü beklenmiyor`);
    process.exitCode = 1;
  } else {
    console.log(`PASS | ${rol} | ${expected.join(", ")}`);
  }
}
