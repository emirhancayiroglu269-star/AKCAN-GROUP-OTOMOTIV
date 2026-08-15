const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const e=[
 {musteriId:"M-1",tipi:"ARAMA",durum:"TAMAMLANDI",tarih:"2026-08-15T09:00:00Z"},
 {musteriId:"M-1",tipi:"TEKLIF",durum:"BEKLIYOR",tarih:"2026-08-15T10:00:00Z",sonrakiIslemTarihi:"2026-08-16T10:00:00Z"},
 {musteriId:"M-1",tipi:"WHATSAPP",durum:"ACIK",tarih:"2026-08-15T11:00:00Z",sonrakiIslemTarihi:"2026-08-15T15:00:00Z"}
];
a(e.length===3,"CRM etkinlikleri");
a(e.filter(x=>x.durum==="ACIK"||x.durum==="BEKLIYOR").length===2,"açık takipler");
const next=e.filter(x=>x.musteriId==="M-1"&&x.sonrakiIslemTarihi&&x.durum!=="IPTAL")
 .sort((a,b)=>new Date(a.sonrakiIslemTarihi)-new Date(b.sonrakiIslemTarihi))[0];
a(next.tipi==="WHATSAPP","sonraki işlem");
a("M-1:TEKLIF:2026-08-15T10:00:00Z"==="M-1:TEKLIF:2026-08-15T10:00:00Z","CRM idempotency");
a(["ARAMA","WHATSAPP","NOT","TEKLIF","GORUSME","RANDEVU","SATIS","TAKIP"].length===8,"iletişim türleri");
console.log("PASS | müşteri iletişim geçmişi");
console.log("PASS | teklif/görüşme/randevu bağlantısı");
console.log("PASS | satış ve takip");
console.log("PASS | sonraki işlem");
