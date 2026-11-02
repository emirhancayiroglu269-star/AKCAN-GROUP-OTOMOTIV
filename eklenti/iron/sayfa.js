// Sayfanın kendi bağlamında çalışır: Iron / Başbuğ / Özaş / Dinamik (Ada Oto) sitesinin (aynı B2B yazılımı) KENDİ yaptığı ürün arama isteklerinin yanıtlarını okur.
// Hiçbir istek göndermez, hiçbir şeyi değiştirmez; yalnız gelen sonuçları içerik betiğine iletir.
(() => {
  const TED = /(^|\.)b2bbasbug\.com$/.test(location.hostname) ? 'basbug' : /(^|\.)ozas\.com\.tr$/.test(location.hostname) ? 'ozas' : /(^|\.)adaoto\.com\.tr$/.test(location.hostname) ? 'dinamik' : 'iron';
  // PurchasedProductList: site girişte "Aldıklarım" listesini (daha önce alınan tüm ürünler, güncel fiyat+stok) kendisi çeker
  const ARAMA = /\/Service\/(?:[A-Za-z]+\.svc\/)?(ProductSearch[A-Za-z0-9]*|PurchasedProductList[A-Za-z0-9]*|SelectiveSearchItems|SearchProductBy[A-Za-z0-9]*|ProductDetails)(\?|$)/;
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
      if (ARAMA.test(url)) p.then((r) => { if (r && r.ok) r.clone().text().then((t) => isle(t, url), () => {}); else tani('fetch ' + url.split('/').pop() + ' durum ' + (r && r.status)); }, () => {});
    } catch { /* yok say */ }
    return p;
  };
  const ac = XMLHttpRequest.prototype.open, gonder = XMLHttpRequest.prototype.send;
  const gorulen = [];
  XMLHttpRequest.prototype.open = function (m, u) {
    this.__akcanUrl = String(u || '');
    if (TED === 'dinamik' && /\/Service\//.test(this.__akcanUrl) && !ARAMA.test(this.__akcanUrl)) { gorulen.push(this.__akcanUrl.split('?')[0].split('/').pop()); if (gorulen.length > 6) gorulen.shift(); tani('arama isteği yakalanmadı; son servis çağrıları: ' + gorulen.join(', ')); }
    return ac.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (ARAMA.test(this.__akcanUrl)) this.addEventListener('load', () => { try { if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) isle(this.responseText, this.__akcanUrl); else tani('xhr ' + this.__akcanUrl.split('/').pop() + ' durum ' + this.status + ' tür ' + this.responseType); } catch { /* yok say */ } });
    return gonder.apply(this, arguments);
  };
})();
