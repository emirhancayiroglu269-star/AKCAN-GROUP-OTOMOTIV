// Sayfa betiğinden gelen arama sonuçlarını arka plana iletir, sonucu sayfanın köşesinde küçük bir rozetle gösterir.
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
window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin || e.data?.kaynak !== 'akcan-iron' || !Array.isArray(e.data.urunler)) return;
  let canli = false; try { canli = !!chrome.runtime?.id; } catch { /* eklenti yenilendi */ }
  if (!canli) { goster('Akcan: eklenti yenilendi — sayfayı yenileyin (F5)', '#b45309'); return; }
  try { chrome.runtime.sendMessage({ tur: 'kaydet', tedarikci: ['basbug', 'ozas'].includes(e.data.tedarikci) ? e.data.tedarikci : 'iron', urunler: e.data.urunler.slice(0, 500) }, (r) => {
    if (chrome.runtime.lastError) return;
    if (!r) return;
    if (r.anahtarYok) goster('Akcan: eklenti anahtarı girilmemiş (eklenti simgesine tıklayın)', '#b45309');
    else if (!r.ok) goster('Akcan: kaydedilemedi — ' + (r.hata || 'bağlantı hatası'), '#b91c1c');
    else goster(`Akcan: ${r.kaydedilen} ürün okundu` + (r.eslesen?.length ? ` · ${r.eslesen.length} tanesi bizde var, maliyeti güncellendi` : ''), '#047857');
  }); } catch { goster('Akcan: eklenti yenilendi — sayfayı yenileyin (F5)', '#b45309'); }
});
