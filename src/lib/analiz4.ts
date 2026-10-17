// Kayıp-kaçak kontrolü ve birlikte satılan ürünler (sepet) analizi
import type { Ayarlar, DB, Hareket, Urun } from './types';
import { donemde, netAlis, netSatis, type Donem } from './analiz';
import { gunu } from './format';

const gercekUrun = (h: Hareket) => typeof h.urun_id === 'string' && !h.urun_id.startsWith('yok:');
const HIZMET = /işçilik|iscilik|torna|hizmet|montaj|tamir|değişim|degisim|bakım ücreti|kaporta|boya|rot balans|yıkama/i;

// ======================= KAYIP-KAÇAK =======================
export interface StokFarki { u: Urun; stokCikis: number; faturaSatis: number; stokGiris: number; faturaAlis: number; cikisFarki: number; girisFarki: number; deger: number }
export interface ZararliSatis { h: Hareket; u?: Urun; satisNet: number; maliyetNet: number; zarar: number }

/**
 * Stok değişimleriyle faturaları karşılaştırır. Stok değişimi takibi BizimHesap eşitlemesinin başladığı günden beri vardır;
 * karşılaştırma, takibin ilk tam gününden faturaların aktarıldığı son güne kadar yapılır.
 */
export function kayipAnalizi(db: DB, a: Ayarlar, d: Donem) {
  const bd = db.bh_durum;
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const takip = bd?.takip_baslangic ? new Date(bd.takip_baslangic) : null;
  const bas = takip ? gunu(new Date(takip.getFullYear(), takip.getMonth(), takip.getDate() + 1)) : null;
  const bit = bd?.rapor_son ?? null;
  const pencere = bas && bit && bas <= bit ? { bas, bit } : null;

  // 1) Stok değişimi ↔ fatura karşılaştırması
  const farklar: StokFarki[] = [];
  if (pencere) {
    const t = new Map<string, { sc: number; sg: number; fs: number; fa: number; fsO: number; faO: number }>();
    const al = (id: string) => { let x = t.get(id); if (!x) { x = { sc: 0, sg: 0, fs: 0, fa: 0, fsO: 0, faO: 0 }; t.set(id, x); } return x; };
    // Fatura tarihi, stoğa işlendiği günden birkaç gün önce olabilir (fatura 14'ünde, stok 15'inde girilmiş): pencereden önceki 10 günün faturaları yalnız açığı kapatmak için sayılır (geriye tarihli ya da sonradan düzenlenen faturalar)
    const once = { bas: gunu(new Date(new Date(pencere.bas + 'T12:00').getTime() - 10 * 864e5)), bit: gunu(new Date(new Date(pencere.bas + 'T12:00').getTime() - 864e5)) };
    for (const h of db.stok_degisim ?? []) {
      if (h.yok_say || !donemde(h.tarih, pencere)) continue;
      if (h.tur === 'satis') al(h.urun_id).sc += h.miktar; else al(h.urun_id).sg += h.miktar;
    }
    // Takipten sonra açılan ürün kartları: kartın ilk görüldüğü andaki stok (ör. alış girilmeden satılıp -1 ile açılan kart)
    // bir hareket olarak kaydedilmez. Bu ilk stok, şu anki stoktan sonraki hareketler geri alınarak bulunur ve hesaba katılır.
    if (takip) {
      const net = new Map<string, number>();
      for (const h of db.stok_degisim ?? []) if (!h.yok_say) net.set(h.urun_id, (net.get(h.urun_id) ?? 0) + (h.tur === 'alis' ? h.miktar : -h.miktar));
      for (const u of db.urunler) {
        if (!u.olusturma || new Date(u.olusturma) <= takip || !donemde(u.olusturma, pencere)) continue;
        const ilk = (u.bh_stok ?? u.stok) - (net.get(u.id) ?? 0);
        if (Math.abs(ilk) < 0.5) continue;
        if (ilk < 0) al(u.id).sc += -ilk; else al(u.id).sg += ilk;
      }
    }
    // İadeler: tedarikçiye iade stoktan faturalı çıkış, müşteriden iade faturalı giriş sayılır
    for (const h of db.iadeler ?? []) {
      const cikis = h.tur === 'alis';
      if (donemde(h.tarih, pencere)) { if (cikis) al(h.urun_id).fs += h.miktar; else al(h.urun_id).fa += h.miktar; }
      else if (donemde(h.tarih, once) && t.has(h.urun_id)) { if (cikis) al(h.urun_id).fsO += h.miktar; else al(h.urun_id).faO += h.miktar; }
    }
    for (const h of db.hareketler) {
      if (h.kaynak !== 'fatura' || !gercekUrun(h)) continue;
      if (donemde(h.tarih, pencere)) { if (h.tur === 'satis') al(h.urun_id).fs += h.miktar; else al(h.urun_id).fa += h.miktar; }
      else if (donemde(h.tarih, once) && t.has(h.urun_id)) { if (h.tur === 'satis') al(h.urun_id).fsO += h.miktar; else al(h.urun_id).faO += h.miktar; }
    }
    for (const [id, x] of t) {
      const u = urun.get(id); if (!u) continue;
      const ham = x.sc - x.fs, hamG = x.sg - x.fa;
      const cikisFarki = ham > 0 ? ham - Math.min(ham, x.fsO) : ham, girisFarki = hamG > 0 ? hamG - Math.min(hamG, x.faO) : hamG;
      if (Math.abs(cikisFarki) < 0.5 && Math.abs(girisFarki) < 0.5) continue;
      const maliyet = u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, a) : 0;
      farklar.push({ u, stokCikis: x.sc, faturaSatis: x.fs, stokGiris: x.sg, faturaAlis: x.fa, cikisFarki, girisFarki, deger: (cikisFarki - girisFarki) * maliyet });
    }
    farklar.sort((p, q) => Math.abs(q.deger) - Math.abs(p.deger));
  }
  // Elle düzeltilerek kapanmış: satış faturası stoktan düşmemiş, sonra aynı miktar faturasız stok girişiyle denkleştirilmiş (sayım düzeltmesi).
  // Stok doğru kabul edilir; iki listede de gösterilmez, sayfada yalnız sayısı belirtilir.
  const kapanmis = farklar.filter((f) => f.cikisFarki <= -0.5 && f.girisFarki >= 0.5 && Math.abs(f.cikisFarki + f.girisFarki) < 0.5);
  const kapali = new Set(kapanmis.map((f) => f.u.id));
  const faturasizCikis = farklar.filter((f) => f.cikisFarki >= 0.5 && f.cikisFarki - f.girisFarki >= 0.5);
  const faturasizGiris = farklar.filter((f) => !kapali.has(f.u.id) && f.girisFarki >= 0.5 && f.girisFarki - f.cikisFarki >= 0.5);
  // Stok takibi yapılmayan kartlar (işçilik, hizmet vb.): faturası kesilir ama stok hiç kıpırdamaz ve 0'da kalır. Bunlar listeye alınmaz.
  const stokluHareket = new Set((db.stok_degisim ?? []).map((h) => h.urun_id));
  const stokTakipsiz = (u: Urun) => HIZMET.test(u.ad) || (!stokluHareket.has(u.id) && (u.bh_stok ?? u.stok) === 0);
  const stoktanDusmeyen = farklar.filter((f) => !kapali.has(f.u.id) && f.cikisFarki <= -0.5 && f.girisFarki > -0.5 && !stokTakipsiz(f.u));

  // 2) Maliyetin altında satış (seçili dönem, fatura satırları)
  const zararli: ZararliSatis[] = [];
  for (const h of db.hareketler) {
    if (h.kaynak !== 'fatura' || h.tur !== 'satis' || !gercekUrun(h) || !donemde(h.tarih, d) || !(h.alis_fiyati > 0) || h.miktar <= 0) continue;
    const u = urun.get(h.urun_id);
    const satisNet = netSatis(h.satis_fiyati, h.kdv), maliyetNet = netAlis(h.alis_fiyati, h.kdv, a);
    if (satisNet < maliyetNet * 0.999) zararli.push({ h, u, satisNet, maliyetNet, zarar: (maliyetNet - satisNet) * h.miktar });
  }
  zararli.sort((p, q) => q.zarar - p.zarar);
  const kimeZarar = new Map<string, { ad: string; zarar: number; adet: number }>();
  for (const z of zararli) { const k = z.h.cari_ad || '—'; const x = kimeZarar.get(k) ?? { ad: k, zarar: 0, adet: 0 }; x.zarar += z.zarar; x.adet++; kimeZarar.set(k, x); }

  // 3) Yüksek indirimli satırlar (%20 ve üstü)
  const indirimli = db.hareketler.filter((h) => h.kaynak === 'fatura' && h.tur === 'satis' && donemde(h.tarih, d) && (h.brut ?? 0) > 0 && (h.indirim ?? 0) / (h.brut ?? 1) >= 0.2)
    .map((h) => ({ h, u: urun.get(h.urun_id), oran: (h.indirim ?? 0) / (h.brut ?? 1) })).sort((p, q) => (q.h.indirim ?? 0) - (p.h.indirim ?? 0));

  // 4) Eksi stok ve depo toplamı farkı
  const depoTop = new Map<string, number>();
  for (const s of db.urun_depo_stok) depoTop.set(s.urun_id, (depoTop.get(s.urun_id) ?? 0) + s.miktar);
  const eksiStok = db.urunler.filter((u) => u.aktif && u.stok < 0).sort((p, q) => p.stok - q.stok);
  const depoFarki = db.urun_depo_stok.length ? db.urunler.filter((u) => u.aktif && Math.abs((depoTop.get(u.id) ?? 0) - u.stok) >= 0.5).map((u) => ({ u, depo: depoTop.get(u.id) ?? 0 })) : [];

  return {
    pencere, farklar, faturasizCikis, faturasizGiris, stoktanDusmeyen, kapanmis,
    faturasizCikisDeger: faturasizCikis.reduce((t, f) => t + Math.max(0, f.deger), 0),
    zararli, zararToplam: zararli.reduce((t, z) => t + z.zarar, 0), kimeZarar: [...kimeZarar.values()].sort((p, q) => q.zarar - p.zarar),
    indirimli, indirimToplam: indirimli.reduce((t, x) => t + (x.h.indirim ?? 0), 0),
    eksiStok, depoFarki,
  };
}

// ======================= BİRLİKTE SATILANLAR =======================
export interface Ikili { a: string; b: string; n: number; guvenAB: number; guvenBA: number; lift: number }

export function sepetAnalizi(db: DB, d: Donem, hizmetHaric: boolean) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const belgeler = new Map<string, { urunler: Set<string>; kategoriler: Set<string>; tarih: string; cari: string }>();
  const katTutar = new Map<string, { tutar: number; satir: number }>();
  for (const h of db.hareketler) {
    if (h.kaynak !== 'fatura' || h.tur !== 'satis' || !h.belge_guid || !gercekUrun(h) || !donemde(h.tarih, d)) continue;
    const u = urun.get(h.urun_id); if (!u) continue;
    if (hizmetHaric && HIZMET.test(u.ad)) continue;
    let b = belgeler.get(h.belge_guid);
    if (!b) { b = { urunler: new Set(), kategoriler: new Set(), tarih: h.tarih, cari: h.cari_ad ?? '' }; belgeler.set(h.belge_guid, b); }
    b.urunler.add(u.id);
    if (u.kategori) {
      b.kategoriler.add(u.kategori);
      const k = katTutar.get(u.kategori) ?? { tutar: 0, satir: 0 }; k.tutar += h.satis_fiyati * h.miktar; k.satir++; katTutar.set(u.kategori, k);
    }
  }
  const fisler = [...belgeler.values()];
  const N = fisler.length;

  const say = (setler: Set<string>[]) => {
    const tek = new Map<string, number>(); const cift = new Map<string, number>();
    for (const s of setler) {
      const l = [...s].sort().slice(0, 30);
      for (const x of l) tek.set(x, (tek.get(x) ?? 0) + 1);
      for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) { const k = l[i] + '\u0001' + l[j]; cift.set(k, (cift.get(k) ?? 0) + 1); }
    }
    const ikililer: Ikili[] = [];
    for (const [k, n] of cift) {
      const [a, b] = k.split('\u0001'); const na = tek.get(a)!, nb = tek.get(b)!;
      ikililer.push({ a, b, n, guvenAB: n / na, guvenBA: n / nb, lift: (n * N) / (na * nb) });
    }
    return { tek, ikililer };
  };
  const ur = say(fisler.map((f) => f.urunler));
  const kat = say(fisler.map((f) => f.kategoriler));
  const urunIkili = ur.ikililer.filter((x) => x.n >= 3 && x.lift > 1.2).sort((p, q) => q.n - p.n || q.lift - p.lift);
  const katIkili = kat.ikililer.filter((x) => x.n >= 5 && x.lift > 1.2).sort((p, q) => q.n - p.n || q.lift - p.lift);

  // Kategori kuralları (A alınca B de alınıyor) ve son 30 günde kaçırılan ek satış
  const son30 = gunu(new Date(Date.now() - 30 * 864e5));
  const kurallar = katIkili.flatMap((x) => [
    { a: x.a, b: x.b, n: x.n, guven: x.guvenAB, nA: kat.tek.get(x.a)! },
    { a: x.b, b: x.a, n: x.n, guven: x.guvenBA, nA: kat.tek.get(x.b)! },
  ]).filter((r) => r.guven >= 0.3 && r.n >= 8).map((r) => {
    const eksik = fisler.filter((f) => gunu(f.tarih) >= son30 && f.kategoriler.has(r.a) && !f.kategoriler.has(r.b)).length;
    const kt = katTutar.get(r.b); const ort = kt && kt.satir ? kt.tutar / kt.satir : 0;
    return { ...r, eksik, ortTutar: ort, potansiyel: eksik * r.guven * ort };
  }).sort((p, q) => q.potansiyel - p.potansiyel);

  // Stokta biri var biri yok: sık birlikte satılan ikililerde tamamlayıcısı tükenmiş ürünler
  const eksikTamamlayici = urunIkili.flatMap((x) => {
    const ua = urun.get(x.a)!, ub = urun.get(x.b)!;
    const r: { var: Urun; yok: Urun; n: number; guven: number }[] = [];
    if (ua.stok > 0 && ub.stok <= 0) r.push({ var: ua, yok: ub, n: x.n, guven: x.guvenAB });
    if (ub.stok > 0 && ua.stok <= 0) r.push({ var: ub, yok: ua, n: x.n, guven: x.guvenBA });
    return r;
  }).sort((p, q) => q.n - p.n);

  const urunIcin = (id: string) => {
    const nA = ur.tek.get(id) ?? 0;
    return {
      nA,
      liste: ur.ikililer.filter((x) => x.a === id || x.b === id).map((x) => ({ diger: urun.get(x.a === id ? x.b : x.a)!, n: x.n, guven: x.a === id ? x.guvenAB : x.guvenBA, lift: x.lift }))
        .filter((x) => x.diger).sort((p, q) => q.n - p.n).slice(0, 25),
    };
  };

  const cokKalem = fisler.filter((f) => f.urunler.size >= 2).length;
  return { N, cokKalem, ortKalem: N ? fisler.reduce((t, f) => t + f.urunler.size, 0) / N : 0, urunIkili, katIkili, kurallar, eksikTamamlayici, urunIcin, urunSatis: ur.tek, urun };
}
