// Keşif: BizimHesap rapor sayfalarının yapısını okur ve analiz veritabanına (bh_kesif) yazar. Hiçbir şeyi değiştirmez.
const kutu = document.createElement('div');
kutu.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#0f172a;color:#fff;padding:14px 18px;border-radius:10px;font:14px system-ui;max-width:360px;box-shadow:0 6px 24px rgba(0,0,0,.3)';
document.body.appendChild(kutu);
const yaz = (t) => { kutu.textContent = 'Analize Aktar — ' + t; };
yaz('BizimHesap sayfaları inceleniyor…');
const sonuc = { surum: 'kesif1', adres: location.href, zaman: new Date().toISOString() };
const linkler = [...document.querySelectorAll('a[href]')].map((a) => [a.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), a.getAttribute('href')]);
sonuc.linkler = linkler.filter(([t, h]) => h && !h.startsWith('#')).slice(0, 400);
sonuc.kaynaklar = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\/api\//i.test(n)).slice(0, 80);
const ozetle = (html) => {
  const d = new DOMParser().parseFromString(html, 'text/html');
  return {
    baslik: d.title, form: d.querySelector('form') && d.querySelector('form').getAttribute('action'),
    alanlar: [...d.querySelectorAll('input,select,textarea')].filter((e) => !/__VIEWSTATE$|__EVENTVALIDATION/.test(e.name || ''))
      .map((e) => ({ n: e.name, id: e.id, t: e.type || e.tagName, v: (e.value || '').slice(0, 60), sec: e.tagName === 'SELECT' ? [...e.options].slice(0, 40).map((o) => [o.value, o.text.trim().slice(0, 40), o.selected]) : undefined })).slice(0, 200),
    butonlar: [...d.querySelectorAll('button,input[type=submit],input[type=button],a[onclick],a[href^="javascript"]')]
      .map((b) => [b.id || b.name || '', (b.textContent || b.value || '').trim().slice(0, 40), (b.getAttribute('onclick') || b.getAttribute('href') || '').slice(0, 200)]).slice(0, 80),
    tablolar: [...d.querySelectorAll('table')].map((t) => ({ id: t.id, sinif: t.className, basliklar: [...t.querySelectorAll('th')].map((x) => x.textContent.trim()).slice(0, 40), satir: t.rows.length, ornek: [...t.rows].slice(0, 4).map((r) => [...r.cells].map((c) => c.textContent.trim().slice(0, 40))) })).slice(0, 12),
    scriptler: [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).slice(0, 40),
    satiriciScript: [...d.querySelectorAll('script:not([src])')].map((s) => s.textContent).filter((t) => /ajax|fetch|api\/|__doPostBack|postback/i.test(t)).map((t) => t.slice(0, 3000)).slice(0, 6),
    api: [...new Set([...html.matchAll(/api\/[A-Za-z0-9_\/]+/g)].map((m) => m[0]))].slice(0, 60),
  };
};
const getir = async (yol) => { const r = await fetch(yol, { credentials: 'include' }); return { durum: r.status, adres: r.url, html: await r.text() }; };
sonuc.sayfalar = {};
for (const yol of ['/web/ngn/rep/ngncostreport', '/web/ngn/rep/ngncashierreport', '/web/ngn/rep/ngnoverduebasic']) {
  yaz('İnceleniyor: ' + yol.split('/').pop());
  try { const g = await getir(yol); sonuc.sayfalar[yol] = { durum: g.durum, adres: g.adres, ...ozetle(g.html) }; } catch (e) { sonuc.sayfalar[yol] = { hata: String(e) }; }
}
const adaylar = [...new Set(sonuc.linkler.map((l) => l[1]).filter((h) => /rep|report|rapor/i.test(h) && !/^javascript/i.test(h)))].slice(0, 25);
sonuc.adaylar = {};
const parcalar = [];
const ara = (metin, kaynak) => {
  for (const m of metin.matchAll(/getsalesreport|getpurchasereport/gi)) {
    parcalar.push({ kaynak, p: metin.slice(Math.max(0, m.index - 2500), m.index + 2500) });
    if (parcalar.length > 8) return;
  }
};
const bakilanJs = new Set();
for (const yol of adaylar) {
  yaz('İnceleniyor: ' + yol.split('/').pop());
  try {
    const g = await getir(yol); const o = ozetle(g.html);
    ara(g.html, yol);
    for (const s of o.scriptler.filter((s) => s && !/jquery|bootstrap|analytics|google|gtm|facebook|hotjar/i.test(s))) {
      if (bakilanJs.has(s) || bakilanJs.size > 25) continue; bakilanJs.add(s);
      try { ara(await (await fetch(s)).text(), s); } catch { /* geç */ }
    }
    sonuc.adaylar[yol] = { durum: g.durum, baslik: o.baslik, api: o.api, alanlar: o.alanlar.slice(0, 60), tablolar: o.tablolar.slice(0, 3) };
  } catch (e) { sonuc.adaylar[yol] = { hata: String(e) }; }
}
sonuc.parcalar = parcalar;
yaz('Sonuç gönderiliyor…');
const r = await fetch(SUPA + '/rest/v1/rpc/bh_kesif_yukle', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_anahtar: ANAHTAR, p: sonuc }) });
if (!r.ok) throw new Error('Gönderilemedi: ' + (await r.text()).slice(0, 200));
yaz('Hazırlık tamam ✓ Claude\'a "tıkladım" yazın. (Bu ilk tıklama yalnız rapor sayfalarının yapısını okudu.)');
kutu.style.background = '#047857';
setTimeout(() => kutu.remove(), 20000);
