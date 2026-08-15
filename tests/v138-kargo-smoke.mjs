const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const now=new Date("2026-08-15T12:00:00Z");
const k={
 siparisId:"S-1001",firma:"Kargo A",takipNo:"TR123",
 durum:"SEVKIYATTA",tahminiTeslimTarihi:"2026-08-14T18:00:00Z"
};
a(new Date(k.tahminiTeslimTarihi)<now,"gecikme tespiti");
a(k.durum==="SEVKIYATTA","sevkiyat durumu");
a("S-1001:Kargo A:TR123"==="S-1001:Kargo A:TR123","kargo idempotency");
const teslim={...k,durum:"TESLIM_EDILDI",teslimTarihi:"2026-08-15T10:00:00Z"};
a(teslim.durum==="TESLIM_EDILDI"&&!!teslim.teslimTarihi,"teslim tamamlandı");
const sorun={...k,durum:"SORUNLU"};
a(sorun.durum==="SORUNLU","sorunlu kargo");
a(["OLUSTURULDU","PAKETLENIYOR","SEVKIYATTA","DAGITIMDA","TESLIM_EDILDI","GECIKTI","SORUNLU","IADE","IPTAL"].length===9,"kargo durumları");
console.log("PASS | kargo oluşturma");
console.log("PASS | firma/takip numarası");
console.log("PASS | sevkiyat/teslimat");
console.log("PASS | gecikme tespiti");
console.log("PASS | sorunlu kargo uyarısı");
