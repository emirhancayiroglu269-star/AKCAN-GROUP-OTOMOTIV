// Keşif 2: raporları kısa bir tarih aralığı için deneme amaçlı çalıştırır, örnek satırları bh_kesif'e yazar. Analiz verilerine dokunmaz.
const kutu = document.createElement('div');
kutu.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#0f172a;color:#fff;padding:14px 18px;border-radius:10px;font:14px system-ui;max-width:360px;box-shadow:0 6px 24px rgba(0,0,0,.3)';
document.body.appendChild(kutu);
const yaz = (t) => { kutu.textContent = 'Analize Aktar — ' + t; };
const g2 = (d) => String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
const bugun = new Date(); const once = new Date(Date.now() - 6 * 864e5);
const sonuc = { surum: 'kesif2', bas: g2(once), bit: g2(bugun) };
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');
const tablo = (d) => {
  const t = d.querySelector('#tblReport'); if (!t) return null;
  const bas = [...t.querySelectorAll('thead th')].map((x) => x.textContent.trim());
  const sat = [...t.querySelectorAll('tbody tr')].map((r) => [...r.cells].map((c) => c.textContent.trim()));
  const alt = [...t.querySelectorAll('tfoot tr')].map((r) => [...r.cells].map((c) => c.textContent.trim()));
  return { bas, adet: sat.length, ornek: sat.slice(0, 4), son: sat.slice(-2), alt };
};
const postback = async (yol, degis) => {
  const h = await (await fetch(yol, { credentials: 'include' })).text();
  const d = parse(h); const f = d.querySelector('form');
  const fd = new URLSearchParams();
  for (const e of f.querySelectorAll('input[name],select[name],textarea[name]')) {
    if (['submit', 'button', 'image', 'file'].includes(e.type)) continue;
    if ((e.type === 'checkbox' || e.type === 'radio') && !e.checked) continue;
    if (e.tagName === 'SELECT' && e.multiple) { for (const o of e.selectedOptions) fd.append(e.name, o.value); continue; }
    fd.append(e.name, e.value);
  }
  for (const [k, v] of Object.entries(degis)) fd.set(k, v);
  fd.set('__EVENTTARGET', 'm$cp$btnFilter'); fd.set('__EVENTARGUMENT', '');
  const adres = new URL(f.getAttribute('action') || yol, location.origin + yol).toString();
  const r = await fetch(adres, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd.toString() });
  const d2 = parse(await r.text());
  return { durum: r.status, tablo: tablo(d2), uyari: [...d2.querySelectorAll('.alert,.notification,#lblNotifyMessage')].map((x) => x.textContent.trim()).filter(Boolean).slice(0, 3) };
};
const dene = async (ad, f) => { yaz('Deneniyor: ' + ad); try { sonuc[ad] = await f(); } catch (e) { sonuc[ad] = { hata: String(e).slice(0, 300) }; } };

await dene('masraf', () => postback('/web/ngn/rep/ngncostreport', { 'm$cp$txtDtFrom': sonuc.bas, 'm$cp$txtDtTo': sonuc.bit, 'm$cp$ddlCalendarType': '1', 'm$cp$ddlPaymentStatus': '1' }));
await dene('kasa', () => postback('/web/ngn/rep/ngncashierreport', { 'm$cp$txtDtFrom': sonuc.bas, 'm$cp$txtDtTo': sonuc.bit, 'm$cp$ddlCashiers': '', 'm$cp$ddlTurnoverIncluded': '2' }));
await dene('vadesi', () => postback('/web/ngn/rep/ngnoverduebasic', { 'm$cp$ddlDebitType': '1', 'm$cp$ddlIdentityType': '3' }));

const kolonlar = '59,1,2,101,3,121,115,117,4,5,16,57,6,113,7,96,97,8,9,108,55,119,10,11,12,13,14,111,15,87,88,89,102,92,94,106,107';
const rapor = async (url, docTypes, ek) => {
  const p = new URLSearchParams({ product: '', identity: '', calendarType: '1', officialStatus: '0', projects: '', markets: '', fromDate: sonuc.bas, toDate: sonuc.bit, docNo: '', flRetailOnly: 'false', docStatuses: '3', docTypes, agents: '', categories: '', brands: '', codes1: '', codes2: '', whse: '', columns: kolonlar, outputType: '1', ...(ek || {}) });
  const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: p.toString() });
  const metin = await r.text(); let j = null; try { j = JSON.parse(metin); } catch { /* */ }
  return { durum: r.status, anahtarlar: j && typeof j === 'object' ? Object.keys(j) : null, adet: j && j.data ? j.data.length : null, ornek: j && j.data ? j.data.slice(0, 3) : metin.slice(0, 800) };
};
await dene('satis', () => rapor('/api/report/getsalesreport', '2, 3'));

// alış raporu sayfasını bul ve parametrelerini oku
await dene('alisSayfa', async () => {
  const h = await (await fetch('/web/ngn/rep/ngndocumentreports', { credentials: 'include' })).text();
  const linkler = [...parse(h).querySelectorAll('a[href]')].map((a) => [a.textContent.trim().replace(/\s+/g, ' ').slice(0, 50), a.getAttribute('href')]).filter((l) => /rep\//.test(l[1]));
  const aday = linkler.find((l) => /purchase/i.test(l[1])) || linkler.find((l) => /alış/i.test(l[0]));
  let parca = null;
  if (aday) {
    const h2 = await (await fetch(aday[1], { credentials: 'include' })).text();
    const i = h2.search(/getpurchasereport/i);
    if (i >= 0) { const b = h2.lastIndexOf('var param', i); parca = h2.slice(b >= 0 ? b : i - 2500, i + 200); }
  }
  return { linkler: linkler.slice(0, 40), aday, parca };
});
await dene('alis', () => rapor('/api/report/GetPurchaseReport', '5,10'));

yaz('Sonuç gönderiliyor…');
const r = await fetch(SUPA + '/rest/v1/rpc/bh_kesif_yukle', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_anahtar: ANAHTAR, p: sonuc }) });
if (!r.ok) throw new Error('Gönderilemedi: ' + (await r.text()).slice(0, 200));
yaz('2. adım tamam ✓ Claude\'a "tıkladım" yazın.');
kutu.style.background = '#047857';
setTimeout(() => kutu.remove(), 20000);
