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
  if (e.source === window && e.origin === location.origin && e.data?.kaynak === 'akcan-iron' && typeof e.data.tani === 'string') { goster('Akcan: ' + e.data.tani.slice(0, 200), '#b45309'); return; }
  if (e.source !== window || e.origin !== location.origin || e.data?.kaynak !== 'akcan-iron' || !Array.isArray(e.data.urunler)) return;
  let canli = false; try { canli = !!chrome.runtime?.id; } catch { /* eklenti yenilendi */ }
  if (!canli) { goster('Akcan: eklenti yenilendi — sayfayı yenileyin (F5)', '#b45309'); return; }
  try { chrome.runtime.sendMessage({ tur: 'kaydet', tedarikci: ['basbug', 'ozas', 'dinamik', 'ozcete', 'martas', 'otoismail'].includes(e.data.tedarikci) ? e.data.tedarikci : 'iron', urunler: e.data.urunler.slice(0, 500) }, (r) => {
    if (chrome.runtime.lastError) return;
    if (!r) return;
    if (r.anahtarYok) goster('Akcan: eklenti anahtarı girilmemiş (eklenti simgesine tıklayın)', '#b45309');
    else if (!r.ok) goster('Akcan: kaydedilemedi — ' + (r.hata || 'bağlantı hatası'), '#b91c1c');
    else goster(`Akcan: ${r.kaydedilen} ürün okundu` + (r.eslesen?.length ? ` · ${r.eslesen.length} tanesi bizde var, maliyeti güncellendi` : ''), '#047857');
    if (r.ok && Array.isArray(r.eslesen) && r.eslesen.length) bizdeEkle(r.eslesen);
  }); } catch { goster('Akcan: eklenti yenilendi — sayfayı yenileyin (F5)', '#b45309'); }
});

// Oto İsmail: eklentinin bu sayfada çalıştığını göster (okuma sorunlarını ayırt etmek için)
if (/(^|\.)otoismail\.com\.tr$/.test(location.hostname)) {
  const hazir = () => goster('Akcan eklentisi bu sayfada açık — arama yaptıkça fiyatlar okunur', '#334155');
  if (document.body) hazir(); else document.addEventListener('DOMContentLoaded', hazir);
}

// "Bizde var" rozeti: tedarikçi sayfasındaki ürün kodunun yanına bizdeki stok kodu, stok ve satış fiyatını yazar (maliyet yazmaz) (yalnız görüntü; siteye hiçbir şey göndermez)
const bizdeHarita = new Map(); let bizdeZaman = null, gozcu = null;
const kn = (x) => String(x || '').toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/[^A-Z0-9]/g, '');
const govdeAl = (k) => { const t = String(k || '').trim(); const m = t.match(/^([A-Za-zÇĞİÖŞÜçğıöşü]{2,12})[\s-]+(.+)$/); return m ? kn(m[2]) : ''; };
const tl = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function bizdeEkle(liste) {
  for (const e of liste) { const a = kn(e.kod); if (a.length >= 5) bizdeHarita.set(a, e); const g = govdeAl(e.kod); if (g.length >= 5 && !bizdeHarita.has(g)) bizdeHarita.set(g, e); }
  bizdeUygula(); [600, 1500, 3000].forEach((ms) => setTimeout(bizdeUygula, ms));
  if (!gozcu && document.body) { gozcu = new MutationObserver((ml) => { if (ml.every((m) => [...m.addedNodes].every((n) => n.nodeType === 1 && n.hasAttribute?.('data-akcan')))) return; clearTimeout(bizdeZaman); bizdeZaman = setTimeout(bizdeUygula, 400); }); gozcu.observe(document.body, { childList: true, subtree: true }); }
}
function rozetYap(e) {
  const b = document.createElement('span'); b.setAttribute('data-akcan', '1');
  const stok = Number(e.stok) || 0; const satis = Number(e.satis) || 0;
  b.textContent = `Bizde: ${e.bizim} · ${stok > 0 ? stok + ' adet' : 'stok yok'}${satis > 0 ? ' · satış ' + tl(satis) + ' ₺' : ''}`;
  b.title = `Akcan stok kodu: ${e.bizim}\nBizdeki stok: ${stok}\nSatış fiyatımız (KDV dahil): ${tl(satis)} ₺`;
  b.style.cssText = `display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;font:600 11px/1.5 system-ui,sans-serif;white-space:nowrap;vertical-align:middle;color:#fff;background:${stok > 0 ? '#15803d' : '#64748b'}`;
  return b;
}
// hücrenin metni kodla birebir aynı olmalı (önünde yalnız marka adı olabilir): "FDO3017-R" ile "FDO3017" karışmasın
const kodUyar = (t, k) => t === k || (t.endsWith(k) && /^[A-Z]{2,15}$/.test(t.slice(0, -k.length)));
const metinRozetsiz = (el) => { let x = ''; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('[data-akcan]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) }); let n; while ((n = w.nextNode())) x += n.textContent + ' '; return x; };
function bizdeUygula() {
  if (!bizdeHarita.size || !document.body) return;
  const anahtarlar = [...bizdeHarita.keys()];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && !n.parentElement.closest('[data-akcan],script,style,textarea,select,option') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const adaylar = new Set(); let n;
  while ((n = w.nextNode())) {
    const t = kn(n.textContent); if (t.length < 5 || t.length > 40) continue;
    if (anahtarlar.some((k) => t.includes(k))) adaylar.add(n.parentElement.closest('td,th,[role=gridcell],[role=cell]') || n.parentElement);
  }
  for (const hucre of adaylar) {
    const satir = hucre.closest('tr,li,[role=row]') || hucre;
    if (satir.querySelector('[data-akcan]')) continue;
    const t = kn(metinRozetsiz(hucre)); if (t.length > 60) continue;
    const k = anahtarlar.find((x) => kodUyar(t, x)); if (!k) continue;
    try { hucre.appendChild(rozetYap(bizdeHarita.get(k))); } catch { /* yok say */ }
  }
}
