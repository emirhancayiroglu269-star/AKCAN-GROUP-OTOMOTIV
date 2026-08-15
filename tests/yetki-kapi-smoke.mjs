const cases = [
  ["admin", "satis.olustur", true],
  ["satis", "satis.olustur", true],
  ["satis", "kasa.islem", false],
  ["depo", "stok.duzenle", true],
  ["depo", "satis.iptal", false],
  ["muhasebe", "cari.islem", true],
  ["salt-okuma", "ayarlar.duzenle", false],
];

for (const [rol, yetki, beklenen] of cases) {
  // Smoke seviyesinde beklenen politika matrisi.
  const sonuc =
    rol === "admin" ||
    (rol === "satis" && ["satis.gor", "satis.olustur", "iade.olustur", "stok.gor", "cari.gor"].includes(yetki)) ||
    (rol === "depo" && ["stok.gor", "stok.duzenle", "alis.gor", "alis.olustur"].includes(yetki)) ||
    (rol === "muhasebe" && ["satis.gor", "alis.gor", "kasa.gor", "kasa.islem", "banka.gor", "cari.gor", "cari.islem", "rapor.gor"].includes(yetki)) ||
    (rol === "salt-okuma" && ["satis.gor", "alis.gor", "stok.gor", "kasa.gor", "banka.gor", "cari.gor", "rapor.gor"].includes(yetki));

  const ok = sonuc === beklenen;
  console.log(`${ok ? "PASS" : "FAIL"} | ${rol} | ${yetki} | beklenen=${beklenen} gerçek=${sonuc}`);
  if (!ok) process.exitCode = 1;
}
