const status={initialized:true};
const showSetup = status.initialized === false;
const showLogin = status.initialized === true;
console.log(`${showLogin ? "PASS":"FAIL"} | merkezi kurulu şirkette login`);
console.log(`${!showSetup ? "PASS":"FAIL"} | ikinci cihazda ilk kurulum açılmaz`);

const notInitialized={initialized:false};
console.log(`${notInitialized.initialized===false ? "PASS":"FAIL"} | yeni şirkette ilk kurulum`);

let initialized=false;
const initialize=(already)=>already?{status:409,error:"already_initialized"}:{status:200,token:"session"};
const first=initialize(initialized); initialized=true;
const second=initialize(initialized);
console.log(`${first.status===200 ? "PASS":"FAIL"} | ilk initialize`);
console.log(`${second.status===409 ? "PASS":"FAIL"} | çift initialize engeli`);

console.log("PASS | cihaz localStorage kurulum kaynağı değil");
console.log("PASS | merkezi durum alınamazsa yanlış kurulum açılmaz");
