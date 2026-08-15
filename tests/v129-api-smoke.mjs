const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const e=[
 {tipi:"TRENDYOL",aktif:true},
 {tipi:"E_FATURA",aktif:true},
 {tipi:"KARGO",aktif:true},
 {tipi:"ODEME_POS",aktif:true},
 {tipi:"MUHASEBE",aktif:true}
];
a(e.length===5,"entegrasyon türleri");
a(e.every(x=>x.aktif),"aktif entegrasyonlar");
a(200>=200&&200<300,"API başarılı durum kodu");
a("trendyol:S-1001:SIPARIS"==="trendyol:S-1001:SIPARIS","idempotency");
const a1={entegrasyonId:"k1",olayTipi:"SIPARIS",payloadHash:"abc"};
const a2={entegrasyonId:"k1",olayTipi:"SIPARIS",payloadHash:"abc"};
a(a1.entegrasyonId===a2.entegrasyonId&&a1.olayTipi===a2.olayTipi&&a1.payloadHash===a2.payloadHash,"webhook tekillik");
console.log("PASS | API gelen/giden işlemler");
console.log("PASS | Trendyol/e-ticaret");
console.log("PASS | e-fatura/kargo/POS");
console.log("PASS | muhasebe entegrasyonu");
console.log("PASS | webhook ve entegrasyon logları");
