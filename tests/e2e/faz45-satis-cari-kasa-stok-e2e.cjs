
const {bosVeritabani,stokHareketiUygula}=require("./src/lib/database.js");
const {satisFinansHareketleriniUygula,satisFinansHareketleriniTersineCevir}=require("./src/lib/satis-finans-motoru.js");
const {cariHareketiUygula,hesapHareketiUygula}=require("./src/lib/cari-kasa.js");
const {finansTutarlilikOzeti}=require("./src/lib/finans-islem.js");
const {tersIslemDenetimOzeti}=require("./src/lib/ters-islem-denetim.js");
function ok(n,c,d=""){console.log((c?"PASS":"FAIL")+" | "+n+(d?" | "+d:""));if(!c)process.exitCode=1}
let db=bosVeritabani();
db.ayarlar={...(db.ayarlar||{}),eksiStokIzni:false};
db.depolar=[{id:"depo-ana",ad:"Ana Depo"}];
db.parcalar=[{id:"P1",kod:"FILTRE-001",ad:"Test Filtre",stok:10,aktif:true,depoStoklari:[{depoId:"depo-ana",adet:10}],ortalamaMaliyet:100,satisFiyati:500,urunTipi:"Normal"}];
db.hesaplar=[{id:"K1",ad:"Merkez Kasa",tip:"Nakit Kasa",aktif:true,bakiye:1000,hareketler:[]}];
db.cariler=[{id:"C1",ad:"Test Müşteri",aktif:true,bakiye:0,hareketler:[]}];
db.posCihazlari=[{id:"POS1",ad:"POS 1",aktif:true,hesapId:"K1",komisyonYuzdesi:2,odemeVadesiGun:1}];
db.posTahsilatlari=[];
db.satislar=[]; db.stokHareketleri=[]; db.kasaIslemleri=[];

const s1={id:"S1",durum:"Tamamlandı",tarih:"2026-08-12",musteriId:"C1",musteriAdi:"Test Müşteri",genelToplam:500,kalemler:[{parcaId:"P1",adet:1,birimFiyat:500,maliyet:100}],odemeler:[{yontem:"Nakit",hesapId:"K1",tutar:500}]};
let st=stokHareketiUygula(db,{parcaId:"P1",tur:"Satış",cikis:1,belgeNo:"S1",kullanici:"Test",aciklama:"S1"});
ok("Satış stok düşüşü",st?.parcalar.find(p=>p.id==="P1")?.stok===9);
let f=satisFinansHareketleriniUygula(st,{satis:s1,odemeler:s1.odemeler,belgeNo:"S1",musteriAdi:"Test Müşteri",satisiYapan:"Test",tarih:"2026-08-12"});
db=f.db; db.satislar=[s1];
ok("Nakit satış finansı uygulandı",!!f.applied || !!f.uygulandi);
ok("Kasa 1.500",db.hesaplar.find(h=>h.id==="K1")?.bakiye===1500);
ok("Stok 9",db.parcalar.find(p=>p.id==="P1")?.stok===9);

const s2={id:"S2",durum:"Tamamlandı",tarih:"2026-08-12",musteriId:"C1",musteriAdi:"Test Müşteri",genelToplam:1000,kalemler:[{parcaId:"P1",adet:2,birimFiyat:500,maliyet:100}],odemeler:[
 {yontem:"Açık Hesap",tutar:400},
 {yontem:"Kredi Kartı",posId:"POS1",tutar:600}
]};
st=stokHareketiUygula(db,{parcaId:"P1",tur:"Satış",cikis:2,belgeNo:"S2",kullanici:"Test"});
ok("Karma satış stok düşüşü",st?.parcalar.find(p=>p.id==="P1")?.stok===7);
f=satisFinansHareketleriniUygula(st,{satis:s2,odemeler:s2.odemeler,belgeNo:"S2",musteriAdi:"Test Müşteri",satisiYapan:"Test",tarih:"2026-08-12"});
ok("Karma satış finansı uygulandı",!!f?.uygulandi);
db=f.db; db.satislar=[...db.satislar,s2];
ok("Cari 400",db.cariler.find(c=>c.id==="C1")?.bakiye===400);
ok("POS bekleyen 600",db.posTahsilatlari.some(p=>p.kaynakSatisId==="S2"&&p.satisTutari===600&&p.durum==="Bekliyor"));

const dup=satisFinansHareketleriniUygula(db,{satis:s2,odemeler:s2.odemeler,belgeNo:"S2",musteriAdi:"Test Müşteri",satisiYapan:"Test",tarih:"2026-08-12"});
ok("Aynı satış finansı ikinci kez yazılmıyor",dup===null);

db=satisFinansHareketleriniTersineCevir(db,s2,"S2-IPTAL","Test");
db.parcalar; // stok tersini çağıran işlem ayrıca uygular
db=stokHareketiUygula(db,{parcaId:"P1",tur:"Satış İptali",giris:2,belgeNo:"S2-IPTAL",kullanici:"Test"});
ok("Satış iptalinde cari 0",db.cariler.find(c=>c.id==="C1")?.bakiye===0);
ok("POS bekleyen iptal",db.posTahsilatlari.find(p=>p.kaynakSatisId==="S2")?.durum==="İptal");
ok("Satış iptalinde stok 9",db.parcalar.find(p=>p.id==="P1")?.stok===9);

db=satisFinansHareketleriniTersineCevir(db,s1,"S1-IPTAL","Test");
db=stokHareketiUygula(db,{parcaId:"P1",tur:"Satış İptali",giris:1,belgeNo:"S1-IPTAL",kullanici:"Test"});
ok("Tüm satışlar terslenince stok 10",db.parcalar.find(p=>p.id==="P1")?.stok===10);
ok("Tüm satışlar terslenince kasa 1000",db.hesaplar.find(h=>h.id==="K1")?.bakiye===1000);

const fin=finansTutarlilikOzeti(db);
ok("Finans tutarlılık temiz",fin.uygun,JSON.stringify(fin.bulgular));
const ters=tersIslemDenetimOzeti(db);
ok("Ters işlem denetimi temiz",ters.temiz,JSON.stringify(ters.bulgular));
