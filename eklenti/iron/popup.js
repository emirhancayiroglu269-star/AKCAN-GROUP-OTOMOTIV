const $ = (id) => document.getElementById(id);
chrome.storage.local.get(['anahtar', 'say']).then(({ anahtar, say }) => {
  if (anahtar) $('anahtar').value = anahtar;
  const gun = new Date().toISOString().slice(0, 10);
  if (say && say.gun === gun) $('say').textContent = `Bugün ${say.okunan} ürün okundu, ${say.eslesen} tanesinin maliyeti güncellendi. Son: ${new Date(say.son).toLocaleTimeString('tr-TR')}`;
});
$('kaydet').onclick = async () => {
  const a = $('anahtar').value.trim(); $('durum').textContent = '…'; $('durum').className = '';
  let r = null; try { r = await chrome.runtime.sendMessage({ tur: 'test', anahtar: a }); } catch (e) { r = { ok: false, hata: String(e?.message || e) }; }
  if (r?.ok) { await chrome.storage.local.set({ anahtar: a }); $('durum').textContent = 'Kaydedildi ✓'; $('durum').className = 'ok'; }
  else { $('durum').textContent = r?.hata || 'Olmadı'; $('durum').className = 'hata'; }
};
