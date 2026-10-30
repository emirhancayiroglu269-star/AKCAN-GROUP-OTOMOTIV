// Arka plan: okunan ürünleri Akcan sunucusuna (eklenti-kaydet) gönderir. Yalnız bu adrese bağlanır.
const ADRES = 'https://qmafuyuocmcobrstnmbx.supabase.co/functions/v1/eklenti-kaydet';
async function gonder(govde) {
  const r = await fetch(ADRES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
  const j = await r.json().catch(() => ({ ok: false, hata: 'HTTP ' + r.status }));
  return j;
}
chrome.runtime.onMessage.addListener((m, _g, cevap) => {
  (async () => {
    const { anahtar } = await chrome.storage.local.get('anahtar');
    if (m.tur === 'test') { if (!m.anahtar) return cevap({ ok: false, hata: 'anahtar boş' }); return cevap(await gonder({ anahtar: m.anahtar, tedarikci: 'iron', islem: 'test' }).catch((e) => ({ ok: false, hata: String(e) }))); }
    if (m.tur === 'bh_liste' || m.tur === 'bh_yazildi' || m.tur === 'bh_son') {
      if (!anahtar) return cevap({ ok: false, anahtarYok: true });
      try { return cevap(await gonder({ anahtar, islem: m.tur, kalemler: m.kalemler })); } catch (e) { return cevap({ ok: false, hata: String(e?.message || e) }); }
    }
    if (m.tur !== 'kaydet') return cevap(null);
    if (!anahtar) return cevap({ ok: false, anahtarYok: true });
    try {
      const r = await gonder({ anahtar, tedarikci: 'iron', urunler: m.urunler });
      if (r.ok) {
        const gun = new Date().toISOString().slice(0, 10);
        const { say = {} } = await chrome.storage.local.get('say');
        const s = say.gun === gun ? say : { gun, okunan: 0, eslesen: 0 };
        s.okunan += r.kaydedilen || 0; s.eslesen += r.eslesen?.length || 0; s.son = new Date().toISOString();
        await chrome.storage.local.set({ say: s });
      }
      cevap(r);
    } catch (e) { cevap({ ok: false, hata: String(e?.message || e) }); }
  })();
  return true;
});
