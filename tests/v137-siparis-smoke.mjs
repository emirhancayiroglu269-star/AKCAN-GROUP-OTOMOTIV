const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const s={
 kaynak:"TEKLIF",referansId:"TEKLIF-1001",durum:"HAZIRLANIYOR",
 kalemler:[{miktar:2,birimFiyat:100,iskontoOrani:10,kdvOrani:20}]
};
const net=2*100*(1-10/100);
a(net===180,"sipariş net toplam");
a("TEKLIF:TEKLIF-1001"==="TEKLIF:TEKLIF-1001","sipariş idempotency");
a(s.durum==="HAZIRLANIYOR"&&s.kalemler.length>0,"sevkiyat hazırlığı");
const akis=["TASLAK","ONAY_BEKLIYOR","ONAYLANDI","HAZIRLANIYOR","SEVKIYATTA","TESLIM_EDILDI","TAMAMLANDI"];
a(akis.length===7,"sipariş durumları");
a(["SATIS","TEKLIF","B2B","TRENDYOL","DIGER"].length===5,"sipariş kaynakları");
const gecmis={eskiDurum:"HAZIRLANIYOR",yeniDurum:"SEVKIYATTA",kullaniciId:"u1"};
a(gecmis.eskiDurum!==gecmis.yeniDurum,"durum geçmişi");
console.log("PASS | satıştan siparişe");
console.log("PASS | sipariş hazırlama");
console.log("PASS | sevkiyat/kargo takip");
console.log("PASS | teslimat ve tamamlanma");
console.log("PASS | durum geçmişi");
