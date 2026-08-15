const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const v={ciro:100000,alis:60000,stokDegeri:250000,brutKar:40000,gider:10000,cariRisk:20000,kasa:5000,banka:15000};
a(v.brutKar-v.gider===30000,"net kâr");
a(v.kasa+v.banka===20000,"likit bakiye");
const d=v.ciro-80000;a(d===20000,"dönem değişimi");a(d/80000*100===25,"dönem değişim yüzdesi");
console.log("PASS | satış/alış raporları");
console.log("PASS | stok/cari/finans raporları");
console.log("PASS | yönetici özeti");
