// Sayfanın kendi bağlamında çalışır: Iron / Başbuğ / Özaş / Dinamik / Özçete / Martaş (aynı B2B yazılımı) ve Oto İsmail sitesinin KENDİ yaptığı ürün arama isteklerinin yanıtlarını okur.
// Hiçbir istek göndermez, hiçbir şeyi değiştirmez; yalnız gelen sonuçları içerik betiğine iletir.
(() => {
  const TED = /(^|\.)b2bbasbug\.com$/.test(location.hostname) ? 'basbug' : /(^|\.)ozas\.com\.tr$/.test(location.hostname) ? 'ozas' : /(^|\.)adaoto\.com\.tr$/.test(location.hostname) ? 'dinamik' : /(^|\.)ozcete\.com\.tr$/.test(location.hostname) ? 'ozcete' : /(^|\.)martas\.com\.tr$/.test(location.hostname) ? 'martas' : /(^|\.)otoismail\.com\.tr$/.test(location.hostname) ? 'otoismail' : /(^|\.)neko\.com\.tr$/.test(location.hostname) ? 'neko' : 'iron';
  // PurchasedProductList: site girişte "Aldıklarım" listesini (daha önce alınan tüm ürünler, güncel fiyat+stok) kendisi çeker
  const ARAMA = /\/Service\/(?:[A-Za-z]+\.svc\/)?(ProductSearch[A-Za-z0-9]*|PurchasedProductList[A-Za-z0-9]*|SelectiveSearchItems|SearchProductBy[A-Za-z0-9]*|ProductDetails)(\?|$)/;
  // Oto İsmail (başka B2B yazılımı): arama yanıtı {Sonuc, data: "<tr>…</tr>"} biçiminde HTML satırlar
  const OI_ARAMA = /\/Arama\/UrunArama(\?|$)/;
  // Neko B4B: arama b4bservice.neko.com.tr/b4b/search… (JSON dizi: ModelNumber, Producer, NetPrice KDV hariç, PriceTL, STOK)
  const NEKO_ARAMA = /b4bservice\.neko\.com\.tr\/b4b\/search(\/equivalentproducts)?\?/i;
  const isleNeko = (metin) => {
    let l; try { l = JSON.parse(metin); } catch { return; }
    if (!Array.isArray(l)) return;
    const n = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
    const urunler = l.map((x) => ({ kod: String(x.ModelNumber || '').trim(), marka: x.Producer || null, ad: x.Name || null, oem: null, fiyat: n(x.NetPrice), liste: n(x.PriceTL), stok: Math.max(n(x.STOK) || 0, n(x.ProductAvailable) || 0), depolar: null }))
      .filter((x) => x.kod.length >= 3 && x.fiyat > 0);
    if (urunler.length) window.postMessage({ kaynak: 'akcan-iron', tedarikci: TED, urunler }, location.origin);
  };
  const trSayi = (t) => { const m = String(t ?? '').replace(/[^\d,.-]/g, ''); if (!m) return null; const n = Number(m.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const isleOI = (metin) => {
    const t = (m) => window.postMessage({ kaynak: 'akcan-iron', tani: m }, location.origin);
    // yanıt iki kez kodlanmış JSON: önce metin, sonra nesne
    let j; try { j = JSON.parse(metin); if (typeof j === 'string') j = JSON.parse(j); } catch { t('Oto İsmail yanıtı okunamadı (JSON değil)'); return; }
    if (!j || typeof j.data !== 'string' || !j.data.includes('<tr')) { t('Oto İsmail yanıtında ürün satırı yok'); return; }
    const doc = new DOMParser().parseFromString('<table><tbody>' + j.data + '</tbody></table>', 'text/html');
    // depo sütunları: "KDV DAHİL" ile "İşlem" arası (satırın son 3 hücresi İşlem/Resim/Sepet). Adlar arama tablosunun başlığından, yoksa bilinen sıra.
    const bas = [...document.querySelectorAll('#aramaSonuc thead th')].map((th) => th.textContent.trim());
    const VARS = ['Gebze', 'İkitelli', 'Ankara', 'İzmir', 'Samsun', 'Gaziantep', 'D999'];
    const adlar = (n) => { const i0 = bas.indexOf('KDV DAHİL'); const b = i0 >= 0 ? bas.slice(i0 + 1, i0 + 1 + n) : []; return b.length === n ? b : Array.from({ length: n }, (_, k) => VARS[k] || 'Depo ' + (k + 1)); };
    const trs = [...doc.querySelectorAll('tr')];
    const urunler = trs.map((tr) => {
      const td = tr.children; const nDep = td.length - 13; if (nDep < 1) return null; const depoAd = adlar(nDep);
      const kod = td[3].textContent.replace(/\s+/g, ' ').trim(); if (kod.length < 3) return null;
      const adEl = td[4].querySelector('[data-content]');
      const ad = (adEl ? adEl.getAttribute('data-content') : td[4].textContent).replace(/\s+/g, ' ').trim() || null;
      // fiyat kutusu (sayfada üstüne gelince görünen): Liste Fiyatı (₺) ve Net Fiyat Kdv Hariç
      const kutu = {}; const pop = td[8].querySelector('[data-content]');
      if (pop) { const d = new DOMParser().parseFromString(pop.getAttribute('data-content'), 'text/html'); for (const r of d.querySelectorAll('.box-row')) { const b = r.querySelectorAll('div'); if (b.length >= 3) kutu[b[0].textContent.trim()] = trSayi(b[b.length - 1].textContent); } }
      const kdvDahil = trSayi(td[9].textContent);
      const fiyat = kutu['Net Fiyat Kdv Hariç'] ?? (kdvDahil ? Math.round((kdvDahil / 1.2) * 100) / 100 : null);
      const liste = kutu['Liste Fiyatı (₺)'] ?? trSayi(td[8].textContent);
      // depolar: yeşil tik = stokta (adet yazmıyor); D999 sanal depo sayılmaz
      // yeşil tik = stokta (adet yok, 1 sayılır); yeşil rozet "Son 3 ürün" = 3 adet; kamyon (yolda) ve çarpı = yok
      const depolar = depoAd.map((ad, k) => { const c = td[10 + k]; if (!c) return { ad, adet: 0 }; const rz = c.querySelector('.badge'); return { ad, adet: rz ? (trSayi(rz.textContent) || 0) : c.querySelector('.fa-check') ? 1 : 0 }; });
      const stok = depolar.filter((d) => !/^D\d+$/.test(d.ad)).reduce((t, d) => t + d.adet, 0);
      return { kod, marka: tr.getAttribute('Tedarikci') || null, ad, oem: td[5].textContent.trim() || null, fiyat, liste, stok, depolar };
    }).filter((x) => x && x.fiyat > 0);
    if (urunler.length) window.postMessage({ kaynak: 'akcan-iron', tedarikci: TED, urunler }, location.origin);
    else window.postMessage({ kaynak: 'akcan-iron', tani: 'Oto İsmail yanıtı geldi ama ürün çıkmadı (' + trs.length + ' satır, ' + (trs[0] ? trs[0].children.length : 0) + ' sütun)' }, location.origin);
  };
  // Iron stok kodunu sayfada şifreli tutar: her onaltılık rakam (ASCII) 0x72 ile XOR'lanmış, sonra yine onaltılık yazılmış
  const kodCoz = (s) => {
    if (typeof s !== 'string' || !/^[0-9A-Fa-f]+$/.test(s) || s.length % 4) return null;
    let hex = '';
    for (let i = 0; i < s.length; i += 2) hex += String.fromCharCode(parseInt(s.slice(i, i + 2), 16) ^ 0x72);
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
    let out = '';
    for (let i = 0; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    try { out = decodeURIComponent(out); } catch { /* kodlanmamış */ } // Başbuğ kodu URL kodlu tutar ("MANN%20HU%207032%20Z")
    return /^[\x20-\x7EÀ-ſ]+$/.test(out) ? out.trim() : null;
  };
  // tanılama kapalı (Dinamik bağlantısı doğrulandı, 2 Kasım 2026); açmak için gövdeyi sayfaya kutu yazan sürümle değiştirin
  const tani = () => {};
  const sayi = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const isle = (metin, url = '') => {
    let dis; try { dis = JSON.parse(metin); } catch { tani(url.split('/').pop() + ': JSON değil, ilk 80: ' + String(metin).slice(0, 80).replace(/[0-9]/g, '#')); return; }
    const ic0 = dis && typeof dis === 'object' ? Object.values(dis)[0] : null;
    let ic; try { ic = typeof ic0 === 'string' ? JSON.parse(ic0) : ic0; } catch { return; }
    const liste = Array.isArray(ic?.ResultDetailed) ? ic.ResultDetailed : Array.isArray(ic) ? ic : null;
    const anahtar = (o) => (o && typeof o === 'object' ? Object.keys(o).slice(0, 25).join(',') : typeof o);
    if (!liste || !liste.length) { tani(url.split('/').pop() + ': liste yok\ndış: ' + anahtar(dis) + '\niç tür: ' + typeof ic0 + '\niç: ' + anahtar(ic)); return; }
    const depoAd = new Map((ic.WarehouseList || []).map((w) => [w.WarehouseID, w.ColumnName]));
    // "Yolda" gibi sepete eklenemeyen depolar stok sayılmaz
    const yolda = new Set((ic.WarehouseList || []).filter((w) => w.ShowCartSummary === false || /^YOL/i.test(String(w.ColumnName || ''))).map((w) => w.WarehouseID));
    const urunler = liste.map((x) => {
      // Iron / Başbuğ / Özaş kodu şifreli tutar; Dinamik (Ada Oto) düz yazar ("MANN HU7032Z")
      const duz = (v) => (typeof v === 'string' && /^[\x20-\x7EÀ-ſ]{3,80}$/.test(v.trim()) && !/^[0-9A-Fa-f]{16,}$/.test(v.trim()) ? v.trim() : null);
      const kod = kodCoz(x.ProductCode) || duz(x.ProductCode) || duz(x.StockCode) || duz(x.Code); if (!kod) return null;
      const dep = (x.Availability || []).filter((a) => !yolda.has(a.WarehouseID)).map((a) => ({ ad: depoAd.get(a.WarehouseID) || String(a.WarehouseID), adet: sayi(a.Amount) }));
      const stok = dep.reduce((t, d) => t + (d.adet > 0 ? d.adet : 0), 0) || (sayi(x.StockAmount) > 0 ? sayi(x.StockAmount) : 0);
      return { kod, marka: x.Brand || null, ad: x.Name_PType || null, oem: x.OemNr || null, fiyat: sayi(x.NetPriceWoVat), liste: sayi(x.LocalListPriceWoVat ?? x.ListPriceWoVAT), stok, depolar: dep };
    }).filter(Boolean);
    const x0 = liste[0] || {}; const pc = x0.ProductCode;
    tani(url.split('/').pop() + ': ' + liste.length + ' satır, okunan ' + urunler.length + '\nProductCode: ' + (typeof pc) + ' uzunluk ' + String(pc ?? '').length + (typeof pc === 'string' ? ' örnek-biçim ' + pc.slice(0, 12).replace(/[0-9]/g, '#').replace(/[A-Za-z]/g, 'a') : '') + '\nalanlar: ' + anahtar(x0));
    if (urunler.length) window.postMessage({ kaynak: 'akcan-iron', tedarikci: TED, urunler }, location.origin);
  };
  // fetch ile gelen yanıtlar da okunur (yanıtın kopyası; sayfanın kendi isteğine dokunulmaz)
  const asilFetch = window.fetch;
  if (typeof asilFetch === 'function') window.fetch = function (girdi, ayar) {
    const p = asilFetch.apply(this, arguments);
    try {
      const url = String(typeof girdi === 'string' ? girdi : girdi && girdi.url || '');
      if (TED === 'neko' && NEKO_ARAMA.test(url)) p.then((r) => { if (r && r.ok) r.clone().text().then(isleNeko, () => {}); }, () => {});
      else if (TED === 'otoismail' && OI_ARAMA.test(url)) p.then((r) => { if (r && r.ok) r.clone().text().then(isleOI, () => {}); }, () => {});
      else if (ARAMA.test(url)) p.then((r) => { if (r && r.ok) r.clone().text().then((t) => isle(t, url), () => {}); else tani('fetch ' + url.split('/').pop() + ' durum ' + (r && r.status)); }, () => {});
    } catch { /* yok say */ }
    return p;
  };
  const ac = XMLHttpRequest.prototype.open, gonder = XMLHttpRequest.prototype.send;
  const gorulen = [];
  XMLHttpRequest.prototype.open = function (m, u) {
    this.__akcanUrl = String(u || '');
    if ((TED === 'dinamik' || TED === 'ozcete' || TED === 'martas') && /\/Service\//.test(this.__akcanUrl) && !ARAMA.test(this.__akcanUrl)) { gorulen.push(this.__akcanUrl.split('?')[0].split('/').pop()); if (gorulen.length > 6) gorulen.shift(); tani('arama isteği yakalanmadı; son servis çağrıları: ' + gorulen.join(', ')); }
    return ac.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (TED === 'neko' && NEKO_ARAMA.test(this.__akcanUrl)) this.addEventListener('load', () => { try { if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) isleNeko(this.responseText); } catch { /* yok say */ } });
    if (TED === 'otoismail' && OI_ARAMA.test(this.__akcanUrl)) this.addEventListener('load', () => { try { if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) isleOI(this.responseText); else window.postMessage({ kaynak: 'akcan-iron', tani: 'Oto İsmail arama yanıtı: durum ' + this.status + ' tür ' + this.responseType }, location.origin); } catch (e) { window.postMessage({ kaynak: 'akcan-iron', tani: 'Oto İsmail okuma hatası: ' + e.message }, location.origin); } });
    if (ARAMA.test(this.__akcanUrl)) this.addEventListener('load', () => { try { if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) isle(this.responseText, this.__akcanUrl); else tani('xhr ' + this.__akcanUrl.split('/').pop() + ' durum ' + this.status + ' tür ' + this.responseType); } catch { /* yok say */ } });
    return gonder.apply(this, arguments);
  };
})();
