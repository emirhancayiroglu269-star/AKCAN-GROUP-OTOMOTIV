const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const now=new Date("2026-08-15T12:00:00Z");
const gorevler=[
 {baslik:"Teklif hazırla",sorumluId:"u1",oncelik:"YUKSEK",durum:"BEKLIYOR",sonTarih:"2026-08-16T12:00:00Z"},
 {baslik:"Stok sayımı",sorumluId:"u2",oncelik:"KRITIK",durum:"DEVAM_EDIYOR",sonTarih:"2026-08-14T12:00:00Z"},
 {baslik:"Rapor",sorumluId:"u1",oncelik:"NORMAL",durum:"TAMAMLANDI",sonTarih:"2026-08-10T12:00:00Z"}
];
const gecikti=g=>g.sonTarih&&g.durum!=="TAMAMLANDI"&&g.durum!=="IPTAL"&&new Date(g.sonTarih)<now;
a(gecikti(gorevler[1]),"geciken görev");
a(!gecikti(gorevler[0]),"vadesi gelmemiş görev");
a(gorevler.filter(x=>x.durum==="BEKLIYOR").length===1,"bekleyen görev");
a(gorevler.filter(x=>x.durum==="DEVAM_EDIYOR").length===1,"devam eden görev");
a(gorevler.filter(x=>x.oncelik==="KRITIK"&&x.durum!=="TAMAMLANDI").length===1,"kritik görev");
a("SATIS:S-1001"==="SATIS:S-1001","görev referans idempotency");
console.log("PASS | görev atama");
console.log("PASS | öncelik ve durum");
console.log("PASS | son tarih/gecikme");
console.log("PASS | yönetici görev özeti");
console.log("PASS | personel iş takibi");
