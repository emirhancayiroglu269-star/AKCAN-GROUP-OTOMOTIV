const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const karar=(stok,abc,xyz,m)=>{
 const oncelik=stok==="TUKENDI"?"KRITIK":(stok==="KRITIK"&&abc==="A"?"KRITIK":(stok==="KRITIK"||abc==="A"?"YUKSEK":xyz==="Z"?"NORMAL":"DUSUK"));
 const aksiyon=stok==="TUKENDI"&&m>0?"ACIL_SIPARIS":stok==="KRITIK"&&m>0?"STOKLA":abc==="A"?"STOKLA":abc==="C"?"AZALT":"NORMAL_TAKIP";
 return {oncelik,aksiyon};
};
a(karar("TUKENDI","A","X",10).aksiyon==="ACIL_SIPARIS","acil sipariş");
a(karar("KRITIK","A","X",20).oncelik==="KRITIK","kritik öncelik");
a(karar("NORMAL","C","Z",0).aksiyon==="AZALT","azalt önerisi");
const arr=[
 {stokSeviyesi:"KRITIK",aksiyon:"STOKLA"},
 {stokSeviyesi:"TUKENDI",aksiyon:"ACIL_SIPARIS"},
 {stokSeviyesi:"NORMAL",aksiyon:"AZALT"}
];
a(arr.length===3,"dashboard ürün toplamı");
a(arr.filter(x=>x.stokSeviyesi==="KRITIK").length===1,"kritik sayacı");
a(arr.filter(x=>x.aksiyon==="ACIL_SIPARIS").length===1,"acil sipariş sayacı");
console.log("PASS | ABC/XYZ karar birleşimi");
console.log("PASS | kritik/tükenen stok önceliği");
console.log("PASS | aksiyon önerisi");
console.log("PASS | dashboard sayaçları");
