// Ödeal e-Fatura portalı (fatura.odeal.com): sayfanın KENDİ yaptığı fatura listesi isteklerinin yanıtlarını okur
// (gelenfatura-dataTable = tedarikçiden gelen e-fatura, outgoing-dataTable = kestiğimiz e-fatura / e-arşiv).
// Hiçbir istek göndermez, hiçbir şeyi değiştirmez; yalnız listedeki fatura başlıklarını (no, karşı taraf, tarih, tutar, durum) içerik betiğine iletir.
(() => {
  const LISTE = /(^|\/)exec\/(gelenfatura|outgoing)-dataTable\.php(\?|$)/; // sayfa adresi göreli de olabilir ("exec/outgoing-…", "../exec/gelenfatura-…")
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
  // "Tümünü aktar" (kullanıcı eklentinin düğmesine basınca): sayfanın kendi fatura tablosuna bu yılın ve geçen yılın tüm sayfalarını
  // 100'er satır yükletir — kullanıcının sayfa sayfa gezmesiyle aynı istekler, aralarında bekleyerek. Yanıtlar yukarıdaki okuyucudan geçer.
  let calisiyor = false;
  const bildir = (ilerleme, bitti = false) => window.postMessage({ kaynak: 'akcan-odeal', ilerleme, bitti }, location.origin);
  async function tumunuAktar() {
    if (calisiyor) return; const $ = window.jQuery;
    if (!$ || !$.fn?.dataTable) { bildir('Fatura tablosu bulunamadı', true); return; }
    const tablo = [...$.fn.dataTable.tables()].find((t) => { const s = $(t).DataTable().settings()[0]; const u = typeof s.ajax === 'object' ? s.ajax?.url : s.ajax; return LISTE.test('/exec/' + String(u || '').split('/exec/').pop()); });
    if (!tablo) { bildir('Bu sayfada fatura listesi yok (Gelen / Gönderilen / e-Arşiv sayfasını açın)', true); return; }
    // Tabloyu yeniden çizdirmek yerine (100 satırlık tablo sayfayı donduruyordu) tablonun son isteğiyle aynı parametrelerle
    // aynı adrese istek atılır; yanıt aşağıdaki okuyucudan geçer, ekrandaki tablo değişmez.
    calisiyor = true; const dt = $(tablo).DataTable(); const st = dt.settings()[0];
    const adres = typeof st.ajax === 'object' ? st.ajax.url : st.ajax; const tip = (typeof st.ajax === 'object' && st.ajax.type) || 'POST';
    const temel = dt.ajax.params() || {};
    const yil = new Date().getFullYear(); let toplam = 0;
    // gönderilen / e-arşiv listesi sunucuda çok yavaş (10 satır ~15 sn): küçük sayfalar ve uzun bekleme
    const giden = /outgoing/.test(String(adres)); const BOY = giden ? 25 : 100;
    // yıl filtresi: gelen listesinde "gunAy", gönderilen listesinde "filter" (değeri yıl ise)
    const yilAlan = (y) => ({ ...('gunAy' in temel ? { gunAy: y } : {}), ...(/^20\d\d$/.test(String(temel.filter ?? '')) ? { filter: y } : {}) });
    const yukle = (gunAy, bas) => new Promise((r) => {
      $.ajax({ url: adres, type: tip, dataType: 'text', timeout: 240000, data: { ...temel, draw: (Number(temel.draw) || 1) + 1, start: bas, length: BOY, ...yilAlan(gunAy) } })
        .done((t) => { let j = null; try { j = JSON.parse(t); } catch { /* yok say */ } r(j); }).fail(() => r(null));
    });
    try {
      for (const y of [yil, yil - 1]) {
        for (let bas = 0; bas < 20000; bas += BOY) {
          const j = await yukle(String(y), bas); if (!j) { bildir(`${y}: istek yanıt vermedi, durduruldu`, true); return; }
          const n = Array.isArray(j.data) ? j.data.length : 0; toplam += n;
          bildir(`${y}: ${bas + n} fatura okundu…`);
          if (n < BOY) break;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
      bildir(`Bitti: ${toplam} fatura aktarıldı`, true);
    } catch (e) { bildir('Aktarım durdu: ' + (e?.message || e), true); }
    finally { calisiyor = false; }
  }
  window.addEventListener('message', (e) => { if (e.source === window && e.origin === location.origin && e.data?.kaynak === 'akcan-odeal-komut' && e.data.islem === 'tumu') tumunuAktar(); });
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
