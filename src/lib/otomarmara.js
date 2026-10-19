// Otomarmara B4B → Analiz: OEM / eşdeğer bilgisi, yalnız İSTENEN ürünler için (ihtiyaç anında).
// Kullanıcı Otomarmara B4B'ye kendisi giriş yapmışken, Otomarmara sekmesinde çalışır. Otomarmara'da hiçbir şey değiştirmez
// (sepete eklemez, sipariş vermez): yalnız ürün arar, OEM ve eşdeğer listesini okur. Sonucu analiz veritabanına RPC ile yazar.
// Çağıran verir: ANAHTAR (Otomarmara anahtarı), SUPA (Supabase adresi), ANON (herkese açık anahtar)
if (!/otomarmara\.com\.tr$/.test(location.hostname)) throw new Error('Önce Otomarmara B4B sayfasını açın (b4b.otomarmara.com.tr) ve giriş yapın.');
if (window.__omMuadil) { window.__omMuadil.dur(); }

const kutu = document.createElement('div');
kutu.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:2147483647;background:#7c2d12;color:#fff;padding:12px 16px;border-radius:10px;font:13px/1.4 system-ui;max-width:360px;box-shadow:0 6px 24px rgba(0,0,0,.3);white-space:pre-line;cursor:pointer';
document.body.appendChild(kutu);
let durdu = false; let zaman = null; let islenen = 0; let son = '';
const yaz = (t) => { kutu.textContent = 'Otomarmara Muadil — açık\n' + t + '\n' + (son ? 'Son: ' + son + '\n' : '') + `Bu oturumda ${islenen} ürün işlendi · durdurmak için tıklayın`; };
const dur = () => { durdu = true; clearTimeout(zaman); kutu.remove(); window.__omMuadil = null; };
window.__omMuadil = { dur }; kutu.onclick = dur;

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const rpc = async (ad, govde) => {
  const r = await fetch(SUPA + '/rest/v1/rpc/' + ad, { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_anahtar: ANAHTAR, ...govde }) });
  const m = await r.text(); if (!r.ok) { let j = null; try { j = JSON.parse(m); } catch { /* */ } throw new Error((j && j.message) || m.slice(0, 200)); }
  return JSON.parse(m || 'null');
};
const html = (t) => new DOMParser().parseFromString(t, 'text/html');
// hücredeki metin parçalarını boşlukla birleştir ("SWAG" + "SWG-40936579" → "SWAG SWG-40936579")
const metin = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const l = []; let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t) l.push(t); } return l.join(' '); };
// marka adı da tire içerebildiği için (RENAULT-MAIS-ORJINAL REN-224019185R) son kod biçimli parça alınır
const kodBul = (t) => { const l = [...String(t).matchAll(/(?:^|\s)([A-Z0-9ÇĞİÖŞÜ]{2,6}-[A-Z0-9][A-Z0-9.\-/]*)/g)].map((m) => m[1]); return l.length ? l[l.length - 1] : null; };
class OturumYok extends Error {}
const getir = async (url, opt) => {
  const r = await fetch(url, { credentials: 'same-origin', ...opt });
  if (r.redirected && /hesap\/giris/i.test(r.url)) throw new OturumYok();
  if (!r.ok) throw new Error('Otomarmara ' + r.status);
  const t = await r.text(); if (/hesap\/giris|name="Password"/i.test(t) && !/GetOems|EŞDEĞER|OEMLER/i.test(t)) throw new OturumYok();
  return t;
};

// stok kodundaki marka ön ekini at: BOS-0241140537 → 0241140537
const terim = (kod) => { const m = String(kod || '').trim().match(/^[A-ZÇĞİÖŞÜ]{2,4}-(.+)$/i); return m && norm(m[1]).length >= 4 ? m[1].trim() : String(kod || '').trim(); };

async function ara(t) {
  const sd = JSON.stringify({ sparepartbrands: '', models: '', categories: '', searchtext: t, searchType: 'all', specialOfferId: 0, wellcomePopupId: 0 });
  const h = await getir('/_ClientSummaryData', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: new URLSearchParams({ sortOrder: 'ascending', searchString: sd, firstItem: '0' }) });
  const d = html('<table><tbody>' + h + '</tbody></table>');
  return [...d.querySelectorAll('tr')].map((r) => {
    const td = r.querySelectorAll('td'); const id = (r.innerHTML.match(/GetOems\((\d+)\)/) || [])[1];
    return { id, kod: kodBul(td[0] ? metin(td[0]) : ''), ad: td[1] ? metin(td[1]) : '' };
  }).filter((x) => x.id && x.kod);
}
async function oemler(id) {
  const d = html(await getir('/musteri/anasayfa/getoems/' + id));
  d.querySelectorAll('h4,h5,h6,button,script,style').forEach((e) => e.remove());
  return [...new Set(metin(d.body).split(/\s+/).map((x) => x.trim()).filter((x) => /\d/.test(x) && norm(x).length >= 4 && !/TL$/i.test(x) && !/:$/.test(x)))];
}
async function esdegerler(id) {
  const d = html(await getir('/musteri/anasayfa/getsimilargroupids/' + id));
  return [...d.querySelectorAll('tbody tr')].map((r) => { const td = r.querySelectorAll('td'); return { kod: kodBul(td[0] ? metin(td[0]) : ''), ad: td[1] ? metin(td[1]).slice(0, 160) : null }; }).filter((x) => x.kod);
}

async function isle(u) {
  const t = terim(u.kod); const n = norm(u.kod), nt = norm(t);
  const l = await ara(t);
  const sec = l.find((x) => norm(x.kod) === n) || l.find((x) => norm(x.kod).endsWith(nt)) || l.find((x) => norm(x.kod).includes(nt));
  if (!sec) return { urun_id: u.urun_id, durum: 'bulunamadi', hata: `Otomarmara'da "${t}" araması bu ürünü bulamadı` };
  await bekle(1500);
  const o = await oemler(sec.id);
  await bekle(1500);
  const e = (await esdegerler(sec.id)).filter((x) => norm(x.kod) !== norm(sec.kod));
  return { urun_id: u.urun_id, durum: 'tamam', om_kod: sec.kod, om_ad: sec.ad.slice(0, 200), oemler: o.filter((x) => norm(x) !== norm(sec.kod)), esdegerler: e };
}

async function tur() {
  if (durdu) return;
  try {
    const l = await rpc('om_bekleyen', {});
    if (!l.length) { yaz('İstek bekleniyor (sitede "Otomarmara\'dan getir" denince işlenir)'); }
    for (const u of l) {
      if (durdu) return;
      yaz(`İşleniyor: ${u.kod}`);
      let s; try { s = await isle(u); } catch (e) { if (e instanceof OturumYok) throw e; s = { urun_id: u.urun_id, durum: 'hata', hata: String(e.message || e).slice(0, 200) }; }
      await rpc('om_sonuc', { p: s }); islenen++;
      son = `${u.kod} → ${s.durum === 'tamam' ? `${s.oemler.length} OEM, ${s.esdegerler.length} eşdeğer` : s.durum === 'bulunamadi' ? 'bulunamadı' : 'hata'}`;
      await bekle(2500);
    }
  } catch (e) {
    if (e instanceof OturumYok) { kutu.style.background = '#b91c1c'; kutu.textContent = 'Otomarmara oturumu kapandı. Yeniden giriş yapıp yer imine tekrar tıklayın.\n(kapatmak için tıklayın)'; return; }
    yaz('Hata: ' + (e.message || e) + ' — 1 dakika sonra tekrar denenecek');
    zaman = setTimeout(tur, 60000); return;
  }
  zaman = setTimeout(tur, 15000);
}
yaz('Başlıyor…');
tur();
