// BizimHesap paneli: tedarikçide zamlanan ürünlerin KART ALIŞ FİYATINI, BizimHesap'ın kendi "Toplu Ürün Güncelleme" (Excel) özelliğiyle günceller.
// Akış: Akcan sunucusundan liste alınır → kullanıcı seçip "Yükle"ye basar → BizimHesap'tan güncel ürün listesi (urunler.xlsx) indirilir →
// yalnız seçili ürünlerin "Alış Fiyatı" hücresi değiştirilir (başka hiçbir hücreye dokunulmaz) → dosya BizimHesap'ın yükleme kutusuna konur.
// Güvenlik: Excel'deki mevcut alış fiyatı Akcan'daki kayıtla tutmuyorsa, döviz TL değilse ya da alış iskontosu varsa o satır atlanır.
(() => {
  const GUNCELLEME_SAYFASI = '/web/ngn/prd/ngnexcelpriceupdate';
  const TED_AD = { otomarmara: 'Otomarmara', neko: 'Neko', iron: 'Iron' };
  const tl = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // eklenti yenilenince açık sayfadaki eski kopyanın bağlantısı kopar ("Extension context invalidated"): o durumda sessizce dur
  const canli = () => { try { return !!chrome.runtime?.id; } catch { return false; } };
  const sor = (m) => new Promise((ok) => { if (!canli()) return ok({ ok: false, hata: 'Eklenti yenilendi — sayfayı yenileyin (F5)' }); try { chrome.runtime.sendMessage(m, (r) => ok(chrome.runtime.lastError ? null : r)); } catch { ok({ ok: false, hata: 'Eklenti yenilendi — sayfayı yenileyin (F5)' }); } });
  const depoAl = async (k) => { try { return canli() ? await chrome.storage.local.get(k) : {}; } catch { return {}; } };
  const depoYaz = async (o) => { try { if (canli()) await chrome.storage.local.set(o); } catch { /* yok say */ } };
  const depoSil = async (k) => { try { if (canli()) await chrome.storage.local.remove(k); } catch { /* yok say */ } };

  async function liste(zorla) {
    const { bhOnbellek } = await depoAl('bhOnbellek');
    if (!zorla && bhOnbellek && Date.now() - bhOnbellek.zaman < 10 * 60000) return bhOnbellek;
    const r = await sor({ tur: 'bh_liste' });
    if (!r?.ok) return { hata: r?.anahtarYok ? 'Eklenti anahtarı girilmemiş (eklenti simgesine tıklayın)' : (r?.hata || 'Akcan sunucusuna ulaşılamadı'), liste: [] };
    const v = { zaman: Date.now(), liste: r.liste || [] };
    await depoYaz({ bhOnbellek: v });
    return v;
  }

  // ---------- zip / xlsx ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const akis = async (u8, donusum) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(donusum)).arrayBuffer());
  function zipOku(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf); let e = -1;
    for (let i = u8.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Excel dosyası okunamadı');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const l = [];
    for (let k = 0; k < n; k++) {
      const meth = dv.getUint16(p + 10, true), saat = dv.getUint16(p + 12, true), tarih = dv.getUint16(p + 14, true), crc = dv.getUint32(p + 16, true), csz = dv.getUint32(p + 20, true), usz = dv.getUint32(p + 24, true);
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      const adB = u8.slice(p + 46, p + 46 + nl); const ad = new TextDecoder().decode(adB);
      const lnl = dv.getUint16(lho + 26, true), lxl = dv.getUint16(lho + 28, true); const bas = lho + 30 + lnl + lxl;
      l.push({ ad, adB, meth, saat, tarih, crc, csz, usz, veri: u8.slice(bas, bas + csz) }); p += 46 + nl + xl + cl;
    }
    return l;
  }
  const girdiMetni = async (g) => new TextDecoder().decode(g.meth === 0 ? g.veri : await akis(g.veri, new DecompressionStream('deflate-raw')));
  function zipYaz(l) {
    const parca = []; const merkez = []; let ofs = 0;
    for (const g of l) {
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0, true); h.setUint16(8, g.meth, true); h.setUint16(10, g.saat, true); h.setUint16(12, g.tarih, true);
      h.setUint32(14, g.crc, true); h.setUint32(18, g.csz, true); h.setUint32(22, g.usz, true); h.setUint16(26, g.adB.length, true); h.setUint16(28, 0, true);
      parca.push(new Uint8Array(h.buffer), g.adB, g.veri);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0, true); c.setUint16(10, g.meth, true); c.setUint16(12, g.saat, true); c.setUint16(14, g.tarih, true);
      c.setUint32(16, g.crc, true); c.setUint32(20, g.csz, true); c.setUint32(24, g.usz, true); c.setUint16(28, g.adB.length, true); c.setUint32(42, ofs, true);
      merkez.push(new Uint8Array(c.buffer), g.adB); ofs += 30 + g.adB.length + g.veri.length;
    }
    const mBoy = merkez.reduce((t, x) => t + x.length, 0); const son = new DataView(new ArrayBuffer(22));
    son.setUint32(0, 0x06054b50, true); son.setUint16(8, l.length, true); son.setUint16(10, l.length, true); son.setUint32(12, mBoy, true); son.setUint32(16, ofs, true);
    return new Blob([...parca, ...merkez, new Uint8Array(son.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const xmlCoz = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const kodNorm = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '');

  /** BizimHesap Excel'ini indirir, seçili ürünlerin alış fiyatını değiştirir; yeni dosyayı ve rapor döndürür */
  async function excelHazirla(secili, alan = 'alis') {
    const r = await fetch('ngnpricedownload', { credentials: 'include' });
    if (!r.ok) throw new Error('BizimHesap ürün listesi indirilemedi (' + r.status + ')');
    const girdiler = zipOku(await r.arrayBuffer());
    const sayfaG = girdiler.find((g) => /^xl\/worksheets\/[^/]+\.xml$/.test(g.ad)); const ssG = girdiler.find((g) => g.ad === 'xl/sharedStrings.xml');
    if (!sayfaG) throw new Error('Excel sayfası bulunamadı');
    const sayfa = await girdiMetni(sayfaG); const ss = ssG ? await girdiMetni(ssG) : '';
    const strs = [...ss.matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => xmlCoz([...m[1].matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((x) => x[1]).join('')));
    const hucre = (c) => { const t = (c.match(/\st="([^"]+)"/) || [])[1]; const v = (c.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/) || [])[1]; const is = (c.match(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/) || [])[1];
      return t === 's' ? (strs[+v] ?? '') : t === 'inlineStr' ? xmlCoz(is ?? '') : (v !== undefined ? xmlCoz(v) : ''); };
    // başlık satırından sütun harfleri (BizimHesap sırayı değiştirirse de çalışsın)
    const satirlar = [...sayfa.matchAll(/<(?:\w+:)?row[^>]*\sr="(\d+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)];
    const satirOku = (ic) => { const o = {}; for (const m of ic.matchAll(/<(?:\w+:)?c\s[^>]*?(?:\/>|>[\s\S]*?<\/(?:\w+:)?c>)/g)) { const col = (m[0].match(/\sr="([A-Z]+)\d+"/) || [])[1]; if (col) o[col] = hucre(m[0]); } return o; };
    const bas = satirOku(satirlar[0]?.[2] ?? ''); const sut = {}; for (const [k, v] of Object.entries(bas)) sut[v.trim()] = k;
    // alan = 'alis' → Alış Fiyatı sütunu, 'satis' → Satış Fiyatı sütunu (S.alis değişkeni o an değiştirilen fiyat sütunudur)
    const sat = alan === 'satis';
    const S = { kod: sut['Ürün Kodu'], alis: sut[sat ? 'Satış Fiyatı' : 'Alış Fiyatı'], kdv: sut[sat ? 'Satış KDV %' : 'Alış KDV %'], kdvDahil: sut[sat ? 'Satış KDV Dahil mi?' : 'Alış KDV Dahil mi?'], doviz: sut[sat ? 'Satış Döviz' : 'Alış Döviz'], iskonto: sat ? null : sut['Alış İskontosu(%)'], ad: sut['Ürün/Hizmet Adı'] };
    if (!S.kod || !S.alis) throw new Error('Excel başlıkları tanınmadı (Ürün Kodu / fiyat sütunu yok) — BizimHesap dosya biçimini değiştirmiş olabilir');
    const kodSatir = new Map(); const tekrar = new Set();
    for (const [, no, ic] of satirlar.slice(1)) { const o = satirOku(ic); const k = kodNorm(o[S.kod]); if (!k) continue; if (kodSatir.has(k)) tekrar.add(k); kodSatir.set(k, { no, o }); }
    const degis = new Map(); const yazilan = []; const atlanan = [];
    for (const x of secili) {
      const k = kodNorm(x.kod); const s = kodSatir.get(k);
      if (!s) { atlanan.push([x, 'BizimHesap listesinde yok (pasif olabilir)']); continue; }
      if (tekrar.has(k)) { atlanan.push([x, 'Bu stok kodu BizimHesap\'ta birden fazla üründe var']); continue; }
      const doviz = (s.o[S.doviz] || 'TL').trim().toUpperCase(); if (doviz && doviz !== 'TL' && doviz !== 'TRY') { atlanan.push([x, (sat ? 'Satış' : 'Alış') + ' dövizi ' + doviz]); continue; }
      const isk = S.iskonto ? Number(String(s.o[S.iskonto] ?? '0').replace(',', '.')) || 0 : 0; if (isk) { atlanan.push([x, 'Kartta alış iskontosu var (%' + isk + ')']); continue; }
      const mevcut = Number(String(s.o[S.alis] ?? '').replace(',', '.')) || 0;
      if (Math.abs(mevcut - Number(x.kart_ham || 0)) > Math.max(0.05, mevcut * 0.01)) { atlanan.push([x, `BizimHesap'taki ${sat ? 'satış' : 'alış'} fiyatı (${tl(mevcut)}) Akcan'daki kayıttan farklı — önce eşitlemenin bitmesini bekleyin`]); continue; }
      const dahil = String(s.o[S.kdvDahil] || 'H').trim().toUpperCase() === 'E'; const kdv = Number(s.o[S.kdv]) || 20;
      const yeni = x.ham ? Math.round(x.yeni * 100) / 100 : sat ? Math.round((dahil ? x.yeni : x.yeni / (1 + kdv / 100)) * 100) / 100 : Math.round((dahil ? x.yeni * (1 + kdv / 100) : x.yeni) * 100) / 100;
      degis.set(s.no, yeni); yazilan.push({ ...x, eskiHam: mevcut, yeniHam: yeni });
    }
    if (!degis.size) return { blob: null, yazilan, atlanan };
    const re = new RegExp(`<((?:\\w+:)?)c\\s([^>]*?)\\br="${S.alis}(\\d+)"([^>]*?)(\\/>|>[\\s\\S]*?<\\/(?:\\w+:)?c>)`, 'g');
    let adet = 0;
    const yeniSayfa = sayfa.replace(re, (m, on, a1, no, a2) => {
      if (!degis.has(no)) return m; adet++;
      const attr = (a1 + `r="${S.alis}${no}"` + a2).replace(/\st="[^"]*"/, '') + ' t="n"';
      return `<${on}c ${attr.trim()}><${on}v>${degis.get(no).toFixed(2)}</${on}v></${on}c>`;
    });
    if (adet !== degis.size) throw new Error(`Alış fiyatı hücreleri bulunamadı (${adet}/${degis.size}) — işlem durduruldu, hiçbir şey yüklenmedi`);
    const ham = new TextEncoder().encode(yeniSayfa); const sik = await akis(ham, new CompressionStream('deflate-raw'));
    Object.assign(sayfaG, { meth: 8, crc: crc32(ham), usz: ham.length, csz: sik.length, veri: sik });
    return { blob: zipYaz(girdiler), yazilan, atlanan };
  }

  // ---------- arayüz ----------
  const stil = 'position:fixed;z-index:2147483647;font:13px/1.4 system-ui,sans-serif;color:#0f172a;box-shadow:0 4px 16px rgba(0,0,0,.25);border-radius:10px;background:#fff';
  async function rozet() {
    const v = await liste(false); const n = (v.liste || []).filter((x) => !x.kontrol).length; if (!n && !(v.liste || []).length) return;
    const a = document.createElement('a'); a.href = GUNCELLEME_SAYFASI;
    a.style.cssText = stil + ';right:14px;bottom:14px;padding:8px 12px;background:#b45309;color:#fff;text-decoration:none';
    a.textContent = `Akcan: ${v.liste.length} ürünün alışı tedarikçide zamlı → BizimHesap'ı güncelle`;
    document.body.appendChild(a);
  }
  async function panel() {
    const kutu = document.createElement('div'); kutu.style.cssText = stil + ';right:14px;top:70px;width:560px;max-height:80vh;display:flex;flex-direction:column;border:2px solid #1d4ed8';
    kutu.innerHTML = '<div style="padding:10px 12px;border-bottom:1px solid #e2e8f0"><b>Akcan — BizimHesap alış fiyatları</b> <button data-k="yenile" style="float:right">Yenile</button><button data-k="gerial" style="float:right;margin-right:6px">Son yüklenenler / geri al</button><button data-k="satis" style="float:right;margin-right:6px">Satış fiyatı düşükler</button><div data-k="ust" style="color:#475569;margin-top:4px">Yükleniyor…</div></div><div data-k="govde" style="overflow:auto;flex:1"></div><div data-k="alt" style="padding:10px 12px;border-top:1px solid #e2e8f0"></div>';
    document.body.appendChild(kutu);
    const $ = (k) => kutu.querySelector(`[data-k="${k}"]`);
    const ciz = async (zorla) => {
      const v = await liste(zorla); const l = v.liste || [];
      if (v.hata) { $('ust').textContent = v.hata; $('govde').innerHTML = ''; $('alt').innerHTML = ''; return; }
      if (!l.length) { $('ust').textContent = 'Güncellenecek ürün yok: kart alış fiyatları tedarikçilerdeki güncel fiyatlarla uyumlu.'; $('govde').innerHTML = ''; $('alt').innerHTML = ''; return; }
      $('ust').innerHTML = `Tedarikçide <b>stokta</b> olup kart alışından %3'ten fazla pahalı ${l.length} ürün. Turuncu olanlarda fark %50'yi aşıyor; kontrol edip isterseniz işaretleyin.`;
      $('govde').innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:4px"><input type="checkbox" data-k="hepsi" title="Turuncu (kontrol) olanlar hariç hepsini seç"></th><th>Ürün</th><th style="text-align:right">Kart alış</th><th style="text-align:right">Yeni alış</th><th>Kaynak</th></tr></thead><tbody>' +
        l.map((x, i) => `<tr style="border-top:1px solid #f1f5f9;${x.kontrol ? 'background:#fff7ed' : ''}"><td style="padding:4px"><input type="checkbox" data-i="${i}" ${x.kontrol ? '' : 'checked'}></td><td><b>${esc(x.kod)}</b><div style="color:#64748b;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.ad)}</div></td><td style="text-align:right">${x.kart > 0 ? tl(x.kart) : '—'}</td><td style="text-align:right;color:${x.kontrol ? '#c2410c' : '#b91c1c'}"><b>${tl(x.yeni)}</b>${x.kart > 0 ? `<div>+%${Math.round((x.yeni / x.kart - 1) * 100)}</div>` : ''}</td><td>${esc(TED_AD[x.tedarikci] || x.tedarikci)}<div style="color:#94a3b8">${new Date(x.zaman).toLocaleDateString('tr-TR')}</div></td></tr>`).join('') + '</tbody></table>';
      $('hepsi').onchange = (e) => kutu.querySelectorAll('input[data-i]').forEach((c) => { if (!l[+c.dataset.i].kontrol || !e.target.checked) c.checked = e.target.checked; });
      const sec = () => [...kutu.querySelectorAll('input[data-i]:checked')].map((c) => l[+c.dataset.i]);
      $('alt').innerHTML = '<div style="color:#475569;margin-bottom:6px">Fiyatlar KDV hariç. Yalnız işaretli ürünlerin <b>alış fiyatı</b> değişir; satış fiyatı ve diğer bilgiler aynen kalır.</div><button data-k="yukle" style="background:#1d4ed8;color:#fff;border:0;border-radius:6px;padding:7px 12px;cursor:pointer">Seçilenleri BizimHesap\'a yükle</button> <span data-k="durum"></span>';
      let onay = false;
      $('yukle').onclick = async () => {
        const s = sec(); if (!s.length) { $('durum').textContent = 'Ürün seçilmedi'; return; }
        const kn = s.filter((x) => x.kontrol).length;
        if (!onay) { onay = true; $('yukle').textContent = `Eminim: ${s.length} ürünün alış fiyatını güncelle` + (kn ? ` (${kn} tanesi %50+ farklı!)` : ''); $('yukle').style.background = '#b91c1c'; $('durum').textContent = 'Onaylamak için tekrar basın'; return; }
        $('yukle').disabled = true; $('durum').textContent = 'BizimHesap ürün listesi indiriliyor…';
        try {
          const r = await excelHazirla(s);
          const atl = r.atlanan.map(([x, n]) => `<li>${esc(x.kod)}: ${esc(n)}</li>`).join('');
          if (!r.blob) { $('durum').innerHTML = 'Yüklenecek ürün kalmadı.' + (atl ? `<ul style="margin:4px 0 0 16px;color:#b45309">${atl}</ul>` : ''); $('yukle').disabled = false; onay = false; return; }
          await sor({ tur: 'bh_yazildi', kalemler: r.yazilan.map((x) => ({ urun_id: x.urun_id, kod: x.kod, ad: x.ad, eski: x.eskiHam, yeni: x.yeniHam, tedarikci: x.tedarikci })) });
          await depoSil('bhOnbellek');
          $('durum').innerHTML = `${r.yazilan.length} ürün BizimHesap'a yükleniyor…` + (atl ? `<ul style="margin:4px 0 0 16px;color:#b45309">Atlananlar:${atl}</ul>` : '');
          const giris = document.getElementById('fileUpload'); if (!giris) throw new Error('BizimHesap yükleme kutusu bulunamadı');
          const dt = new DataTransfer(); dt.items.add(new File([r.blob], 'urunler.xlsx', { type: r.blob.type })); giris.files = dt.files;
          giris.dispatchEvent(new Event('change', { bubbles: true })); // BizimHesap'ın kendi yükleme işlemi (UploadFile) başlar
        } catch (e) { $('durum').textContent = 'Olmadı: ' + (e?.message || e); $('yukle').disabled = false; onay = false; }
      };
    };
    const geriCiz = async () => {
      $('ust').textContent = 'Yükleniyor…'; $('govde').innerHTML = ''; $('alt').innerHTML = '';
      const r = await sor({ tur: 'bh_son' }); const l = r?.liste || [];
      if (!r?.ok) { $('ust').textContent = r?.hata || 'Akcan sunucusuna ulaşılamadı'; return; }
      if (!l.length) { $('ust').textContent = 'Son 48 saatte eklentiyle yüklenmiş (ve hâlâ o fiyatta duran) kart yok.'; return; }
      $('ust').innerHTML = `Son 48 saatte eklentiyle güncellenen ${l.length} kart. İşaretlediklerinizin alış fiyatı <b>eski değerine</b> döndürülür. Kırmızı olanlarda yeni fiyat eskinin %50'sinden fazla yukarıda (varsayılan seçili).`;
      $('govde').innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:4px"><input type="checkbox" data-k="ghepsi"></th><th>Ürün</th><th style="text-align:right">Eski alış</th><th style="text-align:right">Şu an</th><th>Kaynak</th></tr></thead><tbody>' +
        l.map((x, i) => `<tr style="border-top:1px solid #f1f5f9;${x.supheli ? 'background:#fef2f2' : ''}"><td style="padding:4px"><input type="checkbox" data-g="${i}" ${x.supheli ? 'checked' : ''}></td><td><b>${esc(x.kod)}</b><div style="color:#64748b;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.ad)}</div></td><td style="text-align:right">${tl(x.eski)}</td><td style="text-align:right;color:${x.supheli ? '#b91c1c' : '#0f172a'}"><b>${tl(x.yeni)}</b>${x.eski > 0 ? `<div>+%${Math.round((x.yeni / x.eski - 1) * 100)}</div>` : ''}</td><td>${esc(TED_AD[x.tedarikci] || x.tedarikci)}</td></tr>`).join('') + '</tbody></table>';
      $('ghepsi').onchange = (e) => kutu.querySelectorAll('input[data-g]').forEach((c) => { c.checked = e.target.checked; });
      $('alt').innerHTML = '<button data-k="geriyukle" style="background:#b91c1c;color:#fff;border:0;border-radius:6px;padding:7px 12px;cursor:pointer">Seçilenleri eski alış fiyatına döndür</button> <button data-k="geri">Listeye dön</button> <span data-k="gdurum"></span>';
      $('geri').onclick = () => ciz(false);
      let onay = false;
      $('geriyukle').onclick = async () => {
        const sec = [...kutu.querySelectorAll('input[data-g]:checked')].map((c) => l[+c.dataset.g]); if (!sec.length) { $('gdurum').textContent = 'Ürün seçilmedi'; return; }
        if (!onay) { onay = true; $('geriyukle').textContent = `Eminim: ${sec.length} kartı eski fiyata döndür`; $('gdurum').textContent = 'Onaylamak için tekrar basın'; return; }
        $('geriyukle').disabled = true; $('gdurum').textContent = 'BizimHesap ürün listesi indiriliyor…';
        try {
          // geri alma: Excel'deki mevcut değer = yüklenen değer (ham), hedef = eski değer (ham)
          const r2 = await excelHazirla(sec.map((x) => ({ ...x, kart_ham: x.yeni, yeni: x.eski, ham: true })));
          const atl = r2.atlanan.map(([x, n]) => `<li>${esc(x.kod)}: ${esc(n)}</li>`).join('');
          if (!r2.blob) { $('gdurum').innerHTML = 'Döndürülecek ürün kalmadı.' + (atl ? `<ul style="margin:4px 0 0 16px;color:#b45309">${atl}</ul>` : ''); $('geriyukle').disabled = false; onay = false; return; }
          await sor({ tur: 'bh_yazildi', kalemler: r2.yazilan.map((x) => ({ urun_id: x.urun_id, kod: x.kod, ad: x.ad, eski: x.eskiHam, yeni: x.yeniHam, tedarikci: 'geri_al' })) });
          await depoSil('bhOnbellek');
          $('gdurum').innerHTML = `${r2.yazilan.length} kart eski fiyatına döndürülüyor…` + (atl ? `<ul style="margin:4px 0 0 16px;color:#b45309">Atlananlar:${atl}</ul>` : '');
          const giris = document.getElementById('fileUpload'); if (!giris) throw new Error('BizimHesap yükleme kutusu bulunamadı');
          const dt = new DataTransfer(); dt.items.add(new File([r2.blob], 'urunler.xlsx', { type: r2.blob.type })); giris.files = dt.files;
          giris.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) { $('gdurum').textContent = 'Olmadı: ' + (e?.message || e); $('geriyukle').disabled = false; onay = false; }
      };
    };
    const satisCiz = async () => {
      $('ust').textContent = 'Yükleniyor…'; $('govde').innerHTML = ''; $('alt').innerHTML = '';
      const r = await sor({ tur: 'bh_satis_liste' }); const l = r?.liste || [];
      if (!r?.ok) { $('ust').textContent = r?.hata || 'Akcan sunucusuna ulaşılamadı'; return; }
      if (!l.length) { $('ust').innerHTML = 'Satış fiyatı hedef marjın altında kalan stoklu ürün yok. <button data-k="geri0">Listeye dön</button>'; $('geri0').onclick = () => ciz(false); return; }
      const h = l[0].hedef;
      $('ust').innerHTML = `Satış fiyatı %${h} hedef marjın altında kalan ${l.length} stoklu ürün (${l.filter((x) => x.zarar).length} tanesi zararına). İşaretlediklerinizin <b>satış fiyatı</b> %${h} kâr için önerilen fiyata (KDV dahil, 50 TL'ye yukarı yuvarlı) yükseltilir. <b style="color:#b45309">Turuncu olanların alışı son 48 saatte %50'den fazla artırıldı</b>; alış doğruysa işaretleyin, değilse önce "Son yüklenenler / geri al" ile düzeltin. <label style="margin-left:6px"><input type="checkbox" data-k="szarar"> sadece zararına olanlar</label>`;
      $('govde').innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:4px"><input type="checkbox" data-k="shepsi" title="Gri olanlar hariç hepsini seç"></th><th>Ürün</th><th style="text-align:right">Maliyet</th><th style="text-align:right">Şu anki satış</th><th style="text-align:right">Yeni satış</th></tr></thead><tbody>' +
        l.map((x, i) => `<tr data-z="${x.zarar ? 1 : 0}" style="border-top:1px solid #f1f5f9;${x.bekle ? 'background:#fff7ed' : ''}"><td style="padding:4px"><input type="checkbox" data-s="${i}" ${x.bekle ? '' : 'checked'}></td><td><b>${esc(x.kod)}</b><div style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.ad)}</div>${x.bekle ? '<div style="color:#b45309">alışı son 48 saatte %50+ arttı — alış doğru mu?</div>' : ''}</td><td style="text-align:right">${tl(x.alis)}<div style="color:#94a3b8">${x.kaynak ? `${esc(TED_AD[x.kaynak] || x.kaynak)} güncel (kart ${tl(x.kart)})` : 'KDV hariç'}</div></td><td style="text-align:right;color:${x.zarar ? '#b91c1c' : '#b45309'}">${tl(x.kart_ham)}<div>marj %${x.marj}</div></td><td style="text-align:right"><b>${tl(x.yeni)}</b><div style="color:#64748b">+%${Math.round((x.yeni / x.kart_ham - 1) * 100)}</div></td></tr>`).join('') + '</tbody></table>';
      $('shepsi').onchange = (e) => kutu.querySelectorAll('input[data-s]').forEach((c) => { if (c.closest('tr').style.display !== 'none' && (!l[+c.dataset.s].bekle || !e.target.checked)) c.checked = e.target.checked; });
      $('szarar').onchange = (e) => kutu.querySelectorAll('tr[data-z]').forEach((tr) => { const gizle = e.target.checked && tr.dataset.z !== '1'; tr.style.display = gizle ? 'none' : ''; if (gizle) tr.querySelector('input').checked = false; });
      $('alt').innerHTML = '<div style="color:#475569;margin-bottom:6px">Yalnız işaretli ürünlerin <b>satış fiyatı</b> değişir; alış fiyatı ve diğer bilgiler aynen kalır.</div><button data-k="satisyukle" style="background:#1d4ed8;color:#fff;border:0;border-radius:6px;padding:7px 12px;cursor:pointer">Seçilenlerin satış fiyatını güncelle</button> <button data-k="geri">Listeye dön</button> <span data-k="sdurum"></span>';
      $('geri').onclick = () => ciz(false);
      let onay = false;
      $('satisyukle').onclick = async () => {
        const sec = [...kutu.querySelectorAll('input[data-s]:checked')].map((c) => l[+c.dataset.s]); if (!sec.length) { $('sdurum').textContent = 'Ürün seçilmedi'; return; }
        const bk = sec.filter((x) => x.bekle).length;
        if (!onay) { onay = true; $('satisyukle').textContent = `Eminim: ${sec.length} ürünün satış fiyatını yükselt` + (bk ? ` (${bk} tanesinin alışı %50+ artmıştı!)` : ''); $('satisyukle').style.background = '#b91c1c'; $('sdurum').textContent = 'Onaylamak için tekrar basın'; return; }
        $('satisyukle').disabled = true; $('sdurum').textContent = 'BizimHesap ürün listesi indiriliyor…';
        try {
          const r2 = await excelHazirla(sec, 'satis');
          const atl = r2.atlanan.map(([x, n]) => `<li>${esc(x.kod)}: ${esc(n)}</li>`).join('');
          if (!r2.blob) { $('sdurum').innerHTML = 'Güncellenecek ürün kalmadı.' + (atl ? `<ul style="margin:4px 0 0 16px;color:#b45309">${atl}</ul>` : ''); $('satisyukle').disabled = false; onay = false; return; }
          await sor({ tur: 'bh_yazildi', kalemler: r2.yazilan.map((x) => ({ urun_id: x.urun_id, kod: x.kod, ad: x.ad, eski: x.eskiHam, yeni: x.yeniHam, tedarikci: 'zarar', alan: 'satis' })) });
          $('sdurum').innerHTML = `${r2.yazilan.length} ürünün satış fiyatı BizimHesap'a yükleniyor…` + (atl ? `<ul style="margin:4px 0 0 16px;color:#b45309">Atlananlar:${atl}</ul>` : '');
          const giris = document.getElementById('fileUpload'); if (!giris) throw new Error('BizimHesap yükleme kutusu bulunamadı');
          const dt = new DataTransfer(); dt.items.add(new File([r2.blob], 'urunler.xlsx', { type: r2.blob.type })); giris.files = dt.files;
          giris.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) { $('sdurum').textContent = 'Olmadı: ' + (e?.message || e); $('satisyukle').disabled = false; onay = false; }
      };
    };
    $('satis').onclick = satisCiz;
    $('gerial').onclick = geriCiz;
    $('yenile').onclick = () => ciz(true);
    ciz(false);
  }
  const bas = () => { if (!canli() || !document.body) return; (location.pathname.toLowerCase().startsWith(GUNCELLEME_SAYFASI) ? panel() : rozet()).catch(() => { /* panel açılamadı */ }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bas); else bas();
})();
