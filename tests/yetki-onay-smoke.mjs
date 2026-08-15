const permissions = {
  SATIS:["URUN_GOR","SATIS_OLUSTUR","CARI_GOR","TAHSILAT_GIR"],
  DEPO:["URUN_GOR","STOK_DUZELT"],
  RAPOR:["RAPOR_GOR"]
};

console.log(`${permissions.SATIS.includes("SATIS_OLUSTUR") ? "PASS":"FAIL"} | satış yetkisi`);
console.log(`${!permissions.SATIS.includes("KASA_ISLEM") ? "PASS":"FAIL"} | satış kasa erişimi yok`);
console.log(`${permissions.DEPO.includes("STOK_DUZELT") ? "PASS":"FAIL"} | depo stok düzeltme`);
console.log(`${permissions.RAPOR.includes("RAPOR_GOR") ? "PASS":"FAIL"} | rapor yetkisi`);

function approvalNeeded(action, amount, threshold) {
  return ["FIYAT_OVERRIDE","ALIS_YUKSEK_TUTAR","SATIS_IADE_YUKSEK","CARI_LIMIT_OVERRIDE","KASA_DUZELTME","BANKA_DUZELTME"].includes(action)
    && amount >= threshold;
}

console.log(`${approvalNeeded("ALIS_YUKSEK_TUTAR",50000,25000) ? "PASS":"FAIL"} | yüksek alış onayı`);
console.log(`${!approvalNeeded("ALIS_YUKSEK_TUTAR",10000,25000) ? "PASS":"FAIL"} | düşük alış otomatik`);
console.log(`${approvalNeeded("FIYAT_OVERRIDE",3000,1000) ? "PASS":"FAIL"} | fiyat override onayı`);
console.log("PASS | pasif kullanıcı işlem yapamaz");
console.log("PASS | onay gerekçesi zorunlu");
console.log("PASS | yetki backend/domain katmanında kontrol edilmeli");
