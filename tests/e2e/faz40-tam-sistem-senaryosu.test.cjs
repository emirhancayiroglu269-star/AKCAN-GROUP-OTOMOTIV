
const {stokHareketiUygula}=require("../../dist/lib/database.js");
const {hesapHareketiUygula,cariHareketiUygula}=require("../../dist/lib/cari-kasa.js");
const {satisFinansHareketleriniUygula,satisFinansHareketleriniTersineCevir}=require("../../dist/lib/satis-finans-motoru.js");
const {yetkiDenetimOzeti}=require("../../dist/lib/yetki-denetim.js");
const {ciftKayitDenetimOzeti}=require("../../dist/lib/cift-kayit-denetim.js");
const {tersIslemDenetimOzeti}=require("../../dist/lib/ters-islem-denetim.js");
const {VARSAYILAN_ROLLER}=require("../../dist/lib/constants.js");
function a(n,c,d=""){console.log((c?"PASS":"FAIL")+" | "+n+(d?" | "+d:""));if(!c)process.exitCode=1}

let db={
 ayarlar:{eksiStokIzni:false},
 parcalar:[{id:"p1",stok:20,ortalamaMaliyet:500}],
 stokHareketleri:[],satislar:[],malAlimlari:[],iadeler:[],posTahsilatlari:[],
 cariler:[{id:"c1",ad:"Test Müşteri",bakiye:0,hareketler:[]}],
 tedarikciler:[],
 hesaplar:[{id:"h1",ad:"Banka",aktif:true,bakiye:10000,hareketler:[]}],
 kasaIslemleri:[],depolar:[{id:"d1",ad:"Ana Depo"}],depoTransferleri:[],
 posCihazlari:[{id:"pos1",ad:"POS 1",aktif:true,hesapId:"h1",komisyonYuzde:2,komisyonSabit:0,odemeVadesiGun:1}],
 roller:VARSAYILAN_ROLLER(),
 kullanicilar:[{id:"u1",adSoyad:"Test Yönetici",rolId:"rol-yonetici",aktif:true}]
};

const start={stok:20,banka:10000,cari:0};

// 1) ALIŞ: +10 stok
db=stokHareketiUygula(db,{parcaId:"p1",tur:"Alış",giris:10,belgeNo:"AL-001",kullanici:"E2E"});
a("Alış sonrası stok 30",db.parcalar[0].stok===30);

// 2) SATIŞ: 5 adet; 4.000 banka + 2.000 açık hesap
const satis={id:"S1",belgeNo:"SAT-001",musteriId:"c1",musteriAdi:"Test Müşteri",durum:"Tamamlandı",genelToplam:6000,
 odemeler:[
  {yontem:"Kredi Kartı",tutar:4000,posId:"pos1"},
  {yontem:"Açık Hesap",tutar:2000}
 ],kalemler:[{parcaId:"p1",adet:5,birimFiyat:1200,maliyet:500}]};

db=stokHareketiUygula(db,{parcaId:"p1",tur:"Satış",cikis:5,belgeNo:"SAT-001",kullanici:"E2E"});
const sf=satisFinansHareketleriniUygula(db,{satis,belgeNo:"SAT-001",musteriAdi:"Test Müşteri",satisiYapan:"E2E",odemeler:satis.odemeler});
a("Satış finansı uygulandı",!!sf);
db=sf.db; db.satislar.push(satis);
a("Satış sonrası stok 25",db.parcalar[0].stok===25);
a("POS satışı bankaya hemen yazılmıyor",db.hesaplar[0].bakiye===10000,String(db.hesaplar[0].bakiye));
a("Müşteri cari +2000",db.cariler[0].bakiye===2000,String(db.cariler[0].bakiye));

// 3) Aynı satış finansı tekrar çağrılmamalı.
const tekrar=satisFinansHareketleriniUygula(db,{satis,belgeNo:"SAT-001",musteriAdi:"Test Müşteri",satisiYapan:"E2E",odemeler:satis.odemeler});
a("Aynı satış finansı ikinci kez oluşmuyor",tekrar===null);

// 4) KISMİ İADE: 2 adet +2 stok, 1.000 TL banka çıkışı, 1.000 TL cari alacak azaltımı
db=stokHareketiUygula(db,{parcaId:"p1",tur:"Satış İadesi",giris:2,belgeNo:"IAD-001",kullanici:"E2E"});
a("Kısmi iade sonrası stok 27",db.parcalar[0].stok===27);
db=hesapHareketiUygula(db,{hesapId:"h1",tur:"Satış İadesi — Nakit",cikis:1000,belgeNo:"IAD-001",kullanici:"E2E",kaynakId:"IAD-001"});
db=cariHareketiUygula(db,{musteriId:"c1",musteriAdi:"Test Müşteri",tutar:1000,tur:"ödeme",aciklama:"İade: SAT-001",belgeNo:"IAD-001",kaynakSatisId:"S1"});
a("İade sonrası banka 9000",db.hesaplar[0].bakiye===9000,String(db.hesaplar[0].bakiye));
a("İade sonrası cari 1000",db.cariler[0].bakiye===1000,String(db.cariler[0].bakiye));

// 5) SATIŞ İPTALİ: satış finansı geri, stok +5; satış belgesini iptal olarak işaretle
const rev=satisFinansHareketleriniTersineCevir(db,satis,"SAT-001","E2E");
a("Satış finans ters işlemi oluştu",!!rev);
db=rev;
db.satislar=db.satislar.map(s=>s.id==="S1"?{...s,durum:"İptal Edildi"}:s);
db=stokHareketiUygula(db,{parcaId:"p1",tur:"Satış İptali",giris:5,belgeNo:"SAT-001-iptal",kullanici:"E2E"});
a("Satış iptali sonrası stok 32",db.parcalar[0].stok===32);
a("Satış iptali sonrası banka 9000",db.hesaplar[0].bakiye===9000,String(db.hesaplar[0].bakiye));
a("Bekleyen POS tahsilatı iptal",db.posTahsilatlari.length===1 && db.posTahsilatlari[0].durum==="İptal");
a("Satış iptali sonrası cari -1000",db.cariler[0].bakiye===-1000,String(db.cariler[0].bakiye));

// 6) İADEYİ TERSİNE ÇEVİR: -2 stok, +1000 banka, +1000 cari borç
db=stokHareketiUygula(db,{parcaId:"p1",tur:"İade İptali",cikis:2,belgeNo:"IAD-001-iptal",kullanici:"E2E"});
db=hesapHareketiUygula(db,{hesapId:"h1",tur:"İade İptali",giris:1000,belgeNo:"IAD-001-iptal",kullanici:"E2E",kaynakId:"IAD-001-iptal"});
db=cariHareketiUygula(db,{musteriId:"c1",musteriAdi:"Test Müşteri",tutar:1000,tur:"borç",aciklama:"İade iptali: SAT-001",belgeNo:"IAD-001-iptal",kaynakSatisId:"S1"});
a("İade iptali sonrası stok 30",db.parcalar[0].stok===30);
a("İade iptali sonrası banka 10000",db.hesaplar[0].bakiye===10000,String(db.hesaplar[0].bakiye));
a("İade iptali sonrası cari 0",db.cariler[0].bakiye===0,String(db.cariler[0].bakiye));

// 7) Tam zincir sonucu başlangıç durumuna dönmeli (alış stoğu hariç).
a("Tam zincir sonrası cari başlangıca döndü",db.cariler[0].bakiye===0,String(db.cariler[0].bakiye));
a("Tam zincir sonrası stok alış etkisinde 30",db.parcalar[0].stok===30);
a("Tam zincir sonrası banka başlangıca döndü",db.hesaplar[0].bakiye===10000);

// 8) Denetimler
const y=yetkiDenetimOzeti(db); a("Yetki matrisi temiz",y.temiz,JSON.stringify(y.bulgular));
const c=ciftKayitDenetimOzeti(db); a("Çift kayıt denetimi temiz",c.temiz,JSON.stringify(c.bulgular));
const t=tersIslemDenetimOzeti(db); a("Ters işlem denetimi temiz",t.temiz,JSON.stringify(t.bulgular));
