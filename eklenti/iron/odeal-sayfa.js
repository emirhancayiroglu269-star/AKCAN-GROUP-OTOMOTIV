// Ödeal e-Fatura portalı (fatura.odeal.com): sayfanın KENDİ yaptığı fatura listesi isteklerinin yanıtlarını okur
// (gelenfatura-dataTable = tedarikçiden gelen e-fatura, outgoing-dataTable = kestiğimiz e-fatura / e-arşiv).
// Hiçbir istek göndermez, hiçbir şeyi değiştirmez; yalnız listedeki fatura başlıklarını (no, karşı taraf, tarih, tutar, durum) içerik betiğine iletir.
(() => {
  const LISTE = /\/exec\/(gelenfatura|outgoing)-dataTable\.php(\?|$)/;
  const yazi = (html) => new DOMParser().parseFromString('<div>' + String(html ?? '') + '</div>', 'text/html').body; // etkisiz belge: betik/resim çalışmaz
  const metin = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const isle = (txt) => {
    let j; try { j = JSON.parse(txt); } catch { return; }
    if (!j || !Array.isArray(j.data) || !j.data.length) return;
    const gruplar = { gelen: [], giden: [], arsiv: [] };
    for (const r of j.data) {
      if (!r || typeof r !== 'object') continue;
      const kutu = yazi(r.checkbox || r.fatura_id); const ek = kutu.querySelector('[data-ettn]');
      const ettn = ek?.getAttribute('data-ettn'); if (!ettn) continue;
      const gelen = 'gonderici' in r;
      const karsiEl = yazi(gelen ? r.gonderici : r.alici); const sp = karsiEl.querySelectorAll('span');
      const senaryo = metin(yazi(r.senaryo));
      const yon = gelen ? 'gelen' : /EARSIV/i.test(senaryo) ? 'arsiv' : 'giden';
      const tutarYazi = metin(yazi(r.tutar)).replace(/[^\d,.-]/g, '');
      const tutar = tutarYazi ? Number(tutarYazi.replace(/\./g, '').replace(',', '.')) : null;
      gruplar[yon].push({
        ettn, no: ek.getAttribute('data-no') || metin(yazi(r.fatura_id)) || null,
        karsi: sp[0] ? metin(sp[0]) : metin(karsiEl) || null, vkn: sp[1] ? metin(sp[1]) : null,
        tarih: metin(yazi(r.duzenleme_tarihi)) || null, gelis: metin(yazi(gelen ? r.gelis_tarihi : r.gonderim_tarihi)) || null,
        senaryo: senaryo || null, tip: metin(yazi(r.tip)) || null, tutar: Number.isFinite(tutar) ? tutar : null,
        durum: metin(yazi(gelen ? r.cevap : r.durum)) || null,
        ham: { iptal: (ek.getAttribute('data-filigran') || '').toUpperCase().includes('IPTAL') },
      });
    }
    for (const [yon, faturalar] of Object.entries(gruplar)) if (faturalar.length) window.postMessage({ kaynak: 'akcan-odeal', yon, faturalar }, location.origin);
  };
  const X = XMLHttpRequest.prototype; const ac = X.open, gonder = X.send;
  X.open = function (m, u, ...r) { this.__akcanUrl = String(u || ''); return ac.call(this, m, u, ...r); };
  X.send = function (...a) {
    if (LISTE.test(this.__akcanUrl || '')) this.addEventListener('load', () => { try { if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) isle(this.responseText); } catch { /* yok say */ } });
    return gonder.apply(this, a);
  };
  const f0 = window.fetch;
  if (f0) window.fetch = async function (...a) {
    const r = await f0.apply(this, a);
    try { const u = typeof a[0] === 'string' ? a[0] : a[0]?.url; if (LISTE.test(String(u || '')) && r.ok) r.clone().text().then(isle).catch(() => {}); } catch { /* yok say */ }
    return r;
  };
})();
