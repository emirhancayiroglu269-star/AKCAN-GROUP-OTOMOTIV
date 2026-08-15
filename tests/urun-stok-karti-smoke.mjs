const product = {
  stokKodu: "MANN-W712",
  barkod: "4009026500000",
  marka: "MANN-FILTER",
  kategori: "YAĞ FİLTRESİ",
  oem: ["W712/95", "HU 719/7 x"],
  maliyet: 250,
  satis: 425,
  min: 3,
  max: 15,
  mevcut: 2
};

const checks = [
  ["stok kodu", Boolean(product.stokKodu), true],
  ["OEM", product.oem.length > 0, true],
  ["kritik stok", product.mevcut <= product.min, true],
  ["fiyat", product.satis > product.maliyet, true],
];

for (const [name, actual, expected] of checks) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}`);
  if (!ok) process.exitCode = 1;
}

const search = [
  product.stokKodu, product.barkod, product.marka,
  product.kategori, product.oem.join(" ")
].join(" ").toLocaleLowerCase("tr-TR");

console.log(`${search.includes("w712") ? "PASS" : "FAIL"} | OEM/stok arama`);
