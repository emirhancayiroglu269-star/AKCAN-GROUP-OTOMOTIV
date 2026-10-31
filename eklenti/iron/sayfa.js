// Sayfanın kendi bağlamında çalışır: Iron / Başbuğ sitesinin (aynı B2B yazılımı) KENDİ yaptığı ürün arama isteklerinin yanıtlarını okur.
// Hiçbir istek göndermez, hiçbir şeyi değiştirmez; yalnız gelen sonuçları içerik betiğine iletir.
(() => {
  const TED = /(^|\.)b2bbasbug\.com$/.test(location.hostname) ? 'basbug' : 'iron';
  // PurchasedProductList: site girişte "Aldıklarım" listesini (daha önce alınan tüm ürünler, güncel fiyat+stok) kendisi çeker
  const ARAMA = /\/Service\/(ProductSearch[A-Za-z]*|PurchasedProductList|SelectiveSearchItems|SearchProductBy[A-Za-z]*|ProductDetails)(\?|$)/;
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
  const sayi = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const isle = (metin) => {
    let dis; try { dis = JSON.parse(metin); } catch { return; }
    const ic0 = dis && typeof dis === 'object' ? Object.values(dis)[0] : null;
    let ic; try { ic = typeof ic0 === 'string' ? JSON.parse(ic0) : ic0; } catch { return; }
    const liste = Array.isArray(ic?.ResultDetailed) ? ic.ResultDetailed : Array.isArray(ic) ? ic : null;
    if (!liste || !liste.length) return;
    const depoAd = new Map((ic.WarehouseList || []).map((w) => [w.WarehouseID, w.ColumnName]));
    // "Yolda" gibi sepete eklenemeyen depolar stok sayılmaz
    const yolda = new Set((ic.WarehouseList || []).filter((w) => w.ShowCartSummary === false || /^YOL/i.test(String(w.ColumnName || ''))).map((w) => w.WarehouseID));
    const urunler = liste.map((x) => {
      const kod = kodCoz(x.ProductCode); if (!kod) return null;
      const dep = (x.Availability || []).filter((a) => !yolda.has(a.WarehouseID)).map((a) => ({ ad: depoAd.get(a.WarehouseID) || String(a.WarehouseID), adet: sayi(a.Amount) }));
      const stok = dep.reduce((t, d) => t + (d.adet > 0 ? d.adet : 0), 0) || (sayi(x.StockAmount) > 0 ? sayi(x.StockAmount) : 0);
      return { kod, marka: x.Brand || null, ad: x.Name_PType || null, oem: x.OemNr || null, fiyat: sayi(x.NetPriceWoVat), liste: sayi(x.LocalListPriceWoVat ?? x.ListPriceWoVAT), stok, depolar: dep };
    }).filter(Boolean);
    if (urunler.length) window.postMessage({ kaynak: 'akcan-iron', tedarikci: TED, urunler }, location.origin);
  };
  const ac = XMLHttpRequest.prototype.open, gonder = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__akcanUrl = String(u || ''); return ac.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    if (ARAMA.test(this.__akcanUrl)) this.addEventListener('load', () => { try { if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) isle(this.responseText); } catch { /* yok say */ } });
    return gonder.apply(this, arguments);
  };
})();
