// Ödeal e-Fatura portalı: sayfa betiğinin okuduğu fatura başlıklarını arka plana iletir, sonucu köşede küçük bir rozetle gösterir.
let rozet = null, sure = null;
function goster(metin, renk) {
  if (!document.body) return;
  if (!rozet) {
    rozet = document.createElement('div');
    rozet.style.cssText = 'position:fixed;right:12px;bottom:40px;z-index:2147483647;padding:6px 10px;border-radius:8px;font:12px/1.3 system-ui,sans-serif;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);max-width:320px;pointer-events:none';
    document.body.appendChild(rozet);
  }
  rozet.textContent = metin; rozet.style.background = renk; rozet.style.display = 'block';
  clearTimeout(sure); sure = setTimeout(() => { rozet.style.display = 'none'; }, 6000);
}
const AD = { gelen: 'gelen e-fatura', giden: 'giden e-fatura', arsiv: 'e-arşiv' };
window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin || e.data?.kaynak !== 'akcan-odeal' || !Array.isArray(e.data.faturalar) || !AD[e.data.yon]) return;
  let canli = false; try { canli = !!chrome.runtime?.id; } catch { /* eklenti yenilendi */ }
  if (!canli) { goster('Akcan: eklenti yenilendi — sayfayı yenileyin (F5)', '#b45309'); return; }
  try {
    chrome.runtime.sendMessage({ tur: 'odeal', yon: e.data.yon, faturalar: e.data.faturalar.slice(0, 500) }, (r) => {
      if (chrome.runtime.lastError) return;
      if (!r) { goster('Akcan: eklentinin arka planı eski — chrome://extensions sayfasında eklentiyi yenileyin', '#b45309'); return; }
      if (r.anahtarYok) goster('Akcan: eklenti anahtarı girilmemiş (eklenti simgesine tıklayın)', '#b45309');
      else if (!r.ok) goster('Akcan: kaydedilemedi — ' + (r.hata || 'bağlantı hatası'), '#b91c1c');
      else goster(`Akcan: ${r.kaydedilen} ${AD[e.data.yon]} okundu` + (r.yeni ? ` · ${r.yeni} yeni` : ''), '#047857');
    });
  } catch { goster('Akcan: eklenti yenilendi — sayfayı yenileyin (F5)', '#b45309'); }
});
// "Tümünü aktar" düğmesi: yalnız fatura listesi sayfalarında; basınca sayfa betiği tablonun tüm sayfalarını sırayla yükletir
let dugme = null;
window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin || e.data?.kaynak !== 'akcan-odeal' || typeof e.data.ilerleme !== 'string') return;
  goster('Akcan: ' + e.data.ilerleme, e.data.bitti ? '#047857' : '#334155');
  if (dugme) { dugme.disabled = !e.data.bitti; dugme.textContent = e.data.bitti ? 'Akcan: tümünü aktar' : 'Akcan: aktarılıyor…'; }
});
const hazir = () => {
  goster('Akcan eklentisi açık — fatura listesini açtıkça faturalar okunur', '#334155');
  if (!/\/(gelenfatura|gonderilenfatura|arsivgonderilen|outgoinginvoice|archive)\b/i.test(location.pathname)) return;
  dugme = document.createElement('button'); dugme.type = 'button'; dugme.textContent = 'Akcan: tümünü aktar';
  dugme.title = 'Bu listedeki bu yılın ve geçen yılın tüm faturalarını 100\'er 100\'er okuyup Akcan\'a kaydeder (yalnız okuma)';
  dugme.style.cssText = 'position:fixed;left:12px;bottom:40px;z-index:2147483647;padding:8px 12px;border:0;border-radius:8px;font:600 12px system-ui,sans-serif;color:#fff;background:#0f766e;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer';
  dugme.addEventListener('click', () => { dugme.disabled = true; dugme.textContent = 'Akcan: aktarılıyor…'; window.postMessage({ kaynak: 'akcan-odeal-komut', islem: 'tumu' }, location.origin); });
  document.body.appendChild(dugme);
};
if (document.body) hazir(); else document.addEventListener('DOMContentLoaded', hazir);
