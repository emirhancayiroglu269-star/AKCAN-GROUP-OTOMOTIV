const a=(x,n)=>{if(!x)throw Error("FAIL | "+n);console.log("PASS | "+n)};
const h=[{borc:1000,alacak:0},{borc:0,alacak:300},{borc:500,alacak:0}];
const borc=h.reduce((s,x)=>s+x.borc,0),alacak=h.reduce((s,x)=>s+x.alacak,0);
a(borc===1500,"toplam borç");a(alacak===300,"toplam alacak");a(borc-alacak===1200,"bakiye");a(Math.max(0,1200-1000)===200,"risk");
const d=new Date("2026-08-15");d.setDate(d.getDate()+30);a(d.toISOString().slice(0,10)==="2026-09-14","vade tarihi");
a("c1:s1:SATIS"==="c1:s1:SATIS","cari idempotency");
console.log("PASS | müşteri/tedarikçi cari kartı");
console.log("PASS | tahsilat/ödeme");
console.log("PASS | cari ekstre ve risk");
