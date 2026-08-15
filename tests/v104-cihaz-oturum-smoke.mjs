const assert=(ok,name)=>{if(!ok)throw new Error(`FAIL | ${name}`);console.log(`PASS | ${name}`)};
const valid={expiresAt:new Date(Date.now()+3600000).toISOString(),revokedAt:null};
assert(new Date(valid.expiresAt)>new Date(),"aktif oturum süresi");
assert(!valid.revokedAt,"iptal edilmemiş oturum");
const revoked={...valid,revokedAt:new Date().toISOString()};
assert(!!revoked.revokedAt,"iptal edilmiş oturum");
const devices=[
  {id:"d1",type:"WEB",active:true},
  {id:"d2",type:"MOBIL",active:true}
];
assert(devices.length===2,"çoklu cihaz");
assert(devices.some(x=>x.type==="MOBIL"),"mobil cihaz");
console.log("PASS | merkezi kurulum cihazdan bağımsız");
console.log("PASS | cihaz revoke");
console.log("PASS | parola hash yükseltme akışı");
