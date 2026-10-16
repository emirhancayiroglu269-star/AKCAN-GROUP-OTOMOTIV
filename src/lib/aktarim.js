// BizimHesap → Analiz aktarımı. Kullanıcı BizimHesap'a kendisi giriş yapmışken, BizimHesap sayfasında çalışır.
// BizimHesap'ta hiçbir şeyi değiştirmez: yalnız rapor sorgular. Sonuçları analiz veritabanına RPC ile yazar.
// Değişkenler (çağıran verir): ANAHTAR (aktarım anahtarı), SUPA (Supabase adresi), ANON (herkese açık anahtar), GUN (kaç günlük; 0 = tüm geçmiş)
if (!/bizimhesap\.com$/.test(location.hostname)) throw new Error('Önce BizimHesap sayfasını açın (uygulama.bizimhesap.com).');
const kutu = document.createElement('div');
kutu.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#0f172a;color:#fff;padding:14px 18px;border-radius:10px;font:14px/1.4 system-ui;max-width:380px;box-shadow:0 6px 24px rgba(0,0,0,.3);white-space:pre-line';
document.body.appendChild(kutu);
const satirlar = [];
const yaz = (t, kalici) => { if (kalici) satirlar.push(t); kutu.textContent = 'Analize Aktar\n' + [...satirlar, kalici ? '' : t].filter(Boolean).join('\n'); };

const iki = (n) => String(n).padStart(2, '0');
const tr = (d) => iki(d.getDate()) + '.' + iki(d.getMonth() + 1) + '.' + d.getFullYear();
const iso = (d) => d.getFullYear() + '-' + iki(d.getMonth() + 1) + '-' + iki(d.getDate());
const trIso = (s) => { const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(s || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : null; };
const sayi = (s) => { if (s == null) return 0; const t = String(s).replace(/[^\d,.-]/g, ''); if (!t) return 0; return Number(t.replace(/\./g, '').replace(',', '.')) || 0; };
const coz = (s) => { const e = document.createElement('textarea'); e.innerHTML = s == null ? '' : String(s); return e.value; };

const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
const ILK = new Date(2026, 2, 16); // takip başlangıcı
const bas = GUN > 0 ? new Date(Math.max(ILK, bugun - GUN * 864e5)) : ILK;
const masrafBas = GUN > 0 ? bas : new Date(2026, 0, 1);

const rpc = async (ad, govde) => {
  const r = await fetch(SUPA + '/rest/v1/rpc/' + ad, { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_anahtar: ANAHTAR, ...govde }) });
  const m = await r.text();
  if (!r.ok) { let j = null; try { j = JSON.parse(m); } catch { /* */ } throw new Error((j && j.message) || m.slice(0, 200)); }
  return JSON.parse(m || 'null');
};

// ---------- Satış / alış faturaları (ürün bazında) ----------
const KOLON = '59,1,2,101,3,121,115,117,4,5,16,57,6,113,7,96,97,8,9,108,55,119,10,11,12,13,14,111,15,87,88,89,102,92,94,106,107';
const raporCek = async (url, docTypes, b, s) => {
  const p = new URLSearchParams({ product: '', identity: '', calendarType: '1', officialStatus: '0', projects: '', markets: '', fromDate: tr(b), toDate: tr(s), docNo: '', flRetailOnly: 'false', docStatuses: '3', docTypes, agents: '', categories: '', brands: '', codes1: '', codes2: '', whse: '', columns: KOLON, outputType: '1' });
  const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: p.toString() });
  if (!r.ok) throw new Error(url.split('/').pop() + ' HTTP ' + r.status + (r.status === 401 || r.status === 302 ? ' (oturum kapanmış olabilir)' : ''));
  const j = await r.json();
  if (!j || !Array.isArray(j.data)) throw new Error('Beklenmeyen rapor yanıtı');
  return j.data.map((x) => ({
    tarih: (x.DtTransaction || '').slice(0, 10), ad: coz(x.DsProduct), kod: x.DsProductNo || '', barkod: x.DsBarcode || '',
    kategori: x.DsCategory || '', marka: x.DsBrand || '', miktar: x.MtQuantity, birim: x.DsUnit || '',
    alis: x.MtPriceBuying, birim_fiyat: x.MtUnitPrice, tutar: x.MtGrossPrice, indirim: x.MtDiscount, net: x.MtNet, kdv: x.MtTax,
    kdv_orani: x.MtTaxRate, toplam: x.MtTotal, belge: x.DsDocGuid || '', cari_guid: x.DsIdentityGuid || '', cari: coz(x.DsIdentity),
    kullanici: x.DsUserIdentity || '', depo: x.DsWarehouse || '', saat: x.DtDispatch ? x.DtDispatch.slice(11, 19) : '', urun_bh_id: x.DsProductGuid || '',
  }));
};
const aylar = (b, s) => { const a = []; let c = new Date(b); while (c <= s) { const son = new Date(c.getFullYear(), c.getMonth() + 1, 0); a.push([new Date(c), son < s ? son : new Date(s)]); c = new Date(c.getFullYear(), c.getMonth() + 1, 1); } return a; };
const ozet = {};
for (const [tur, url, dt, ad] of [['satis', '/api/report/getsalesreport', '2, 3', 'Satış'], ['alis', '/api/report/GetPurchaseReport', '5,10', 'Alış']]) {
  let adet = 0, tutar = 0;
  for (const [b, s] of aylar(bas, bugun)) {
    yaz(ad + ' faturaları: ' + tr(b) + ' – ' + tr(s) + '…');
    const sat = await raporCek(url, dt, b, s);
    if (!sat.length && (s - b) > 7 * 864e5) { yaz('⚠ ' + ad + ' ' + tr(b) + ' – ' + tr(s) + ': BizimHesap boş döndü, bu dönem atlandı', true); continue; }
    adet += await rpc('bh_fatura_yukle', { p_tur: tur, p_bas: iso(b), p_bit: iso(s), p: sat });
    tutar += sat.reduce((t, x) => t + (Number(x.toplam) || 0), 0);
  }
  ozet[tur] = adet;
  yaz('✓ ' + ad + ': ' + adet.toLocaleString('tr-TR') + ' satır, ' + tutar.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL', true);
}

// ---------- ASP.NET rapor sayfaları (masraf, kasa, vadesi geçen) ----------
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');
const sayfaAl = async (yol) => parse(await (await fetch(yol, { credentials: 'include' })).text());
const postback = async (yol, d, degis) => {
  const f = d.querySelector('form'); const fd = new URLSearchParams();
  for (const e of f.querySelectorAll('input[name],select[name],textarea[name]')) {
    if (['submit', 'button', 'image', 'file'].includes(e.type)) continue;
    if ((e.type === 'checkbox' || e.type === 'radio') && !e.checked) continue;
    if (e.tagName === 'SELECT' && e.multiple) { for (const o of e.selectedOptions) fd.append(e.name, o.value); continue; }
    fd.append(e.name, e.value);
  }
  for (const [k, v] of Object.entries(degis)) fd.set(k, v);
  fd.set('__EVENTTARGET', 'm$cp$btnFilter'); fd.set('__EVENTARGUMENT', '');
  const r = await fetch(new URL(f.getAttribute('action') || yol, location.origin + yol).toString(), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd.toString() });
  const d2 = parse(await r.text());
  const t = d2.querySelector('#tblReport');
  if (!t) throw new Error(yol.split('/').pop() + ': rapor tablosu bulunamadı (oturum kapanmış olabilir)');
  const bas = [...t.querySelectorAll('thead th')].map((x) => x.textContent.trim());
  const rows = [...t.querySelectorAll('tbody tr')].filter((r) => r.cells.length >= bas.length - 1);
  return { bas, rows, d: d2 };
};
const kolon = (bas, ...adlar) => { for (const a of adlar) { const i = bas.findIndex((b) => b.toLocaleLowerCase('tr') === a.toLocaleLowerCase('tr')); if (i >= 0) return i; } return -1; };
const hucre = (r, i) => (i >= 0 && r.cells[i] ? r.cells[i].textContent.replace(/‎/g, '').trim() : '');

// Masraflar
try {
  yaz('Masraflar…');
  const d = await sayfaAl('/web/ngn/rep/ngncostreport');
  const { bas: b, rows } = await postback('/web/ngn/rep/ngncostreport', d, { 'm$cp$txtDtFrom': tr(masrafBas), 'm$cp$txtDtTo': tr(bugun), 'm$cp$ddlCalendarType': '1', 'm$cp$ddlPaymentStatus': '1', 'm$cp$ddlAccount': '' });
  const k = { t: kolon(b, 'BelgeTarihi', 'Belge Tarihi'), o: kolon(b, 'ÖdemeTarihi', 'Ödeme Tarihi'), du: kolon(b, 'Durumu'), a: kolon(b, 'Ana Masraf'), al: kolon(b, 'Alt Masraf'), h: kolon(b, 'Hesap'), ac: kolon(b, 'Açıklama'), top: kolon(b, 'Toplam') };
  const p = rows.map((r) => ({ tarih: trIso(hucre(r, k.t)), odeme: trIso(hucre(r, k.o)) || '', durum: hucre(r, k.du), ana: hucre(r, k.a), alt: hucre(r, k.al), hesap: hucre(r, k.h), aciklama: hucre(r, k.ac), tutar: sayi(hucre(r, k.top)) })).filter((x) => x.tarih);
  if (!p.length) yaz('⚠ Masraf: BizimHesap boş döndü, atlandı', true);
  else { const n = await rpc('bh_masraf_yukle', { p_bas: iso(masrafBas), p_bit: iso(bugun), p }); ozet.masraf = n; yaz('✓ Masraf: ' + n + ' kayıt, ' + p.reduce((t, x) => t + x.tutar, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL', true); }
} catch (e) { yaz('✗ Masraf: ' + e.message, true); }

// Kasa ve banka hareketleri + hesap bakiyeleri
try {
  yaz('Kasa ve banka hareketleri…');
  const d = await sayfaAl('/web/ngn/rep/ngncashierreport');
  const sec = d.querySelector('select[name="m$cp$ddlCashiers"]');
  const hesaplar = sec ? [...sec.options].map((o) => ({ id: o.value, metin: o.textContent.trim() })).filter((o) => /^\d+$/.test(o.id)) : [];
  const bakiyeler = hesaplar.map((h) => { const m = /^(.*)\(([-\d.,]+)\s*TL\)\s*$/.exec(h.metin); return m ? { ad: m[1].trim(), bakiye: sayi(m[2]) } : null; }).filter(Boolean);
  const ids = hesaplar.map((h) => h.id).join(',');
  const { bas: b, rows } = await postback('/web/ngn/rep/ngncashierreport', d, {
    'm$cp$txtDtFrom': tr(bas), 'm$cp$txtDtTo': tr(bugun), 'm$cp$ddlCashiers': '', 'm$cp$ddlTurnoverIncluded': '2',
    'm$cp$ddlCashier$hdnMultiSelect': ids, 'm$cp$ddlCashier$hdnAllSelected': 'true', 'm$cp$ddlTransactionType': '',
  });
  const k = { t: kolon(b, 'Tarih'), tip: kolon(b, 'Tipi'), kasa: kolon(b, 'Kasa'), u: kolon(b, 'Kullanıcı'), h: kolon(b, 'Hesap'), ac: kolon(b, 'Açıklama'), bo: kolon(b, 'Borç'), al: kolon(b, 'Alacak') };
  let p = rows.map((r) => ({ tarih: trIso(hucre(r, k.t)), tip: hucre(r, k.tip), hesap: hucre(r, k.kasa), kullanici: hucre(r, k.u), karsi: hucre(r, k.h), aciklama: hucre(r, k.ac), giris: sayi(hucre(r, k.bo)), cikis: sayi(hucre(r, k.al)) })).filter((x) => x.tarih && !/devir/i.test(x.tip));
  // yön kontrolü: "Para Girişi" satırları girişte olmalı
  const ters = p.filter((x) => /giriş/i.test(x.tip) && x.cikis > 0 && !x.giris).length > p.filter((x) => /giriş/i.test(x.tip) && x.giris > 0).length;
  if (ters) p = p.map((x) => ({ ...x, giris: x.cikis, cikis: x.giris }));
  if (!p.length) yaz('⚠ Kasa: hareket bulunamadı, atlandı', true);
  else { const n = await rpc('bh_kasa_yukle', { p_bas: iso(bas), p_bit: iso(bugun), p, p_hesaplar: bakiyeler }); ozet.kasa = n; yaz('✓ Kasa/banka: ' + n + ' hareket, ' + bakiyeler.length + ' hesap bakiyesi', true); }
} catch (e) { yaz('✗ Kasa: ' + e.message, true); }

// Vadesi geçen alacaklar (müşteriler)
try {
  yaz('Vadesi geçen alacaklar…');
  const d = await sayfaAl('/web/ngn/rep/ngnoverduebasic');
  const { bas: b, rows } = await postback('/web/ngn/rep/ngnoverduebasic', d, { 'm$cp$ddlDebitType': '1', 'm$cp$ddlIdentityType': '3', 'm$cp$ddlCurrency': '' });
  const k = { ad: kolon(b, 'İsim / Unvan'), tel: kolon(b, 'Telefon'), v: kolon(b, 'Vadesi Geçen Tutar'), g: kolon(b, 'Geçen Gün Sayısı'), mv: kolon(b, 'Müşteri Vadesi') };
  const p = rows.map((r) => { const g = /([0-9A-F]{32})/i.exec(r.innerHTML); return { cari: hucre(r, k.ad), cari_guid: g ? g[1].toUpperCase() : '', telefon: hucre(r, k.tel), tutar: sayi(hucre(r, k.v)), vade: trIso(hucre(r, k.mv)) || '', gun: String(parseInt(hucre(r, k.g), 10) || '') }; }).filter((x) => x.cari && x.tutar);
  if (!p.length) yaz('⚠ Vadesi geçen: liste boş geldi, atlandı', true);
  else { const n = await rpc('bh_vadesi_gecen_yukle', { p }); ozet.vadesi = n; yaz('✓ Vadesi geçen: ' + n + ' müşteri, ' + p.reduce((t, x) => t + x.tutar, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL', true); }
} catch (e) { yaz('✗ Vadesi geçen: ' + e.message, true); }

yaz('Bitti. Analiz sitesi 30 sn içinde kendini yeniler.', true);
kutu.style.background = Object.keys(ozet).length >= 4 ? '#047857' : '#b45309';
kutu.style.cursor = 'pointer'; kutu.title = 'Kapatmak için tıklayın'; kutu.onclick = () => kutu.remove();
return ozet;
