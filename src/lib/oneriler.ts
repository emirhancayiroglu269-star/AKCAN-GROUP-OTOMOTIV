import type { DB, ID, Urun } from './types';
import type { Sayfa } from '../App';
import { depoKisa, depoMuadil, muadilMetin, stoktakiMuadiller } from './muadil';
import { gunu, para, sayi } from './format';
import { GECIS_RE, abcSinifla, alinacakHesap, birimKar, gecerliHareketler, gelirTablosu, hareketTutar, hizmetMi, netAlis, netSatis, takipGunu, urunOzetleri, type Donem } from './analiz';
import { aylikSeri, gecisCarisi, musteriAnalizi, nakitAkisi, oncekiDonem, onerilenFiyat, sonAlislar, sonSatislar, zamanAnalizi } from './analiz2';

export type Alan = 'Fiyat & kâr' | 'Stok' | 'Satın alma' | 'Müşteri' | 'Nakit' | 'Gider' | 'Satış' | 'Veri';
export interface Oneri {
  id: string; alan: Alan; oncelik: 1 | 2 | 3; baslik: string; aciklama: string;
  /** tahmini aylık etki (TL) · kar: kâra eklenecek · nakit: nakde dönecek / bağlı para */
  etki?: number; etkiTur?: 'kar' | 'nakit';
  adimlar: string[]; sayfa?: Sayfa;
  /** tek tıkla uygulanabilir toplu kritik stok ataması */
  kritikUygula?: { id: string; kritik: number }[];
  tablo?: { basliklar: string[]; satirlar: (string | number)[][]; sag?: number[]; /** satır başına BizimHesap ürün kartı bağlantısı */ bh?: (string | null)[] };
}

const gunFark = (a: string, b: string) => Math.round((new Date(a + 'T12:00').getTime() - new Date(b + 'T12:00').getTime()) / 864e5);
const yuzde = (x: number) => `%${x.toFixed(0)}`;
const gun = (fark: number) => gunu(new Date(Date.now() - fark * 864e5));

/** Son 90 günün verisinden kurala dayalı öneriler (en önemli → en az önemli) */
export function onerileriCikar(db: DB): Oneri[] {
  const o: Oneri[] = [];
  const a = db.ayarlar;
  const hedef = a.hedef_marj ?? 35;
  const ilk = db.bh_durum?.rapor_ilk ?? gun(90);
  const d: Donem = { bas: gun(89) > ilk ? gun(89) : ilk, bit: gunu() };
  const d30: Donem = { bas: gun(29) > ilk ? gun(29) : ilk, bit: gunu() };
  const gunSay = takipGunu(db, d), ay = 30 / gunSay;
  const ozet = [...urunOzetleri(db, d).values()];
  const ozetMap = new Map(ozet.map((x) => [x.urun.id, x]));
  const abc = abcSinifla(ozet, (x) => x.kar);
  const sinif = new Map(ozet.map((x) => [x.urun.id, abc.get(x) ?? 'C']));
  const aktif = db.urunler.filter((u) => u.aktif);
  const g = gelirTablosu(db, d);
  const kisaAd = (u: Urun) => u.ad.length > 60 ? u.ad.slice(0, 58) + '…' : u.ad;
  // tablolarda ürünün yanında stok kodu da görünsün
  const urunAd = (u: Urun) => (u.kod ? `${u.kod} · ` : '') + kisaAd(u);

  // ---------- FİYAT & KÂR ----------
  const altinda = aktif.filter((u) => u.alis_fiyati > 0 && u.satis_fiyati > 0 && birimKar(u, a).kar < 0)
    .map((u) => ({ u, k: birimKar(u, a), s: ozetMap.get(u.id)?.satilan ?? 0 })).sort((x, y) => y.s - x.s || x.k.kar - y.k.kar);
  if (altinda.length) {
    const kayip = altinda.reduce((t, x) => t + -x.k.kar * x.s, 0) * ay;
    o.push({ id: 'altinda', alan: 'Fiyat & kâr', oncelik: altinda.some((x) => x.s > 0) ? 1 : 2, etki: kayip || undefined, etkiTur: 'kar',
      baslik: `${altinda.length} ürünün satış fiyatı maliyetinin altında`,
      aciklama: `Bu ürünler kartta yazan fiyattan satıldığında zarar ediyor (KDV hariç karşılaştırma).${kayip > 0 ? ` Son 90 günün satış hızıyla ayda yaklaşık ${para(kayip)} zarar.` : ''}`,
      adimlar: ['BizimHesap\'ta bu ürünlerin satış fiyatını önerilen fiyata çekin', 'Alış fiyatı yanlış girilmişse kartı düzeltin'], sayfa: 'fiyat',
      tablo: { basliklar: ['Ürün', 'Alış (KDV hariç)', 'Satış (KDV dahil)', 'Önerilen satış', '90 günde satılan'], sag: [1, 2, 3, 4],
        satirlar: altinda.slice(0, 15).map((x) => [urunAd(x.u), para(x.k.alisNet), para(x.u.satis_fiyati), para(onerilenFiyat(x.u, x.k.alisNet, hedef) ?? 0), sayi(x.s)]) } });
  }

  // düşük marj: bedelsiz (0 TL) satırlar ve araç alım/satım gibi geçiş faturalarındaki parçalar (maliyetine aktarılan) sayılmaz
  const urunMapD = new Map(db.urunler.map((u) => [u.id, u]));
  const gecisBelge = new Set<string>(); const satirlar90 = gecerliHareketler(db, d).filter((h) => h.tur === 'satis');
  for (const h of satirlar90) if (h.belge_guid && GECIS_RE.test(urunMapD.get(h.urun_id)?.ad ?? h.urun_ad ?? '')) gecisBelge.add(h.belge_guid);
  const sonAlisDm = sonAlislar(db); const sinir6 = gunu(new Date(Date.now() - 180 * 864e5));
  const dm = new Map<ID, { urun: Urun; satilan: number; ciroNet: number; maliyet: number; kar: number }>();
  for (const h of satirlar90) {
    const u = urunMapD.get(h.urun_id); if (!u || !(h.satis_fiyati > 0) || (h.belge_guid && gecisBelge.has(h.belge_guid))) continue;
    const t = hareketTutar(h, a); if (t.maliyetYok) continue;
    // satış satırındaki maliyet kartın iskontosuz liste fiyatıysa (son 6 ayın faturasından %30+ yüksek) fatura net fiyatı kullanılır
    const sf = sonAlisDm.get(u.id); const birimMal = t.maliyet / h.miktar;
    const maliyet = sf && sf.tarih >= sinir6 && birimMal > sf.fiyat * 1.3 ? sf.fiyat * h.miktar : t.maliyet;
    const x = dm.get(u.id) ?? { urun: u, satilan: 0, ciroNet: 0, maliyet: 0, kar: 0 }; x.satilan += h.miktar; x.ciroNet += t.ciroNet; x.maliyet += maliyet; x.kar += t.ciroNet - maliyet; dm.set(u.id, x);
  }
  const dusuk = [...dm.values()].filter((x) => x.maliyet > 0 && x.ciroNet > 500 && x.kar / x.ciroNet * 100 < Math.min(12, hedef / 2))
    .map((x) => ({ ...x, marj: (x.kar / x.ciroNet) * 100, fark: x.ciroNet * (hedef / 100) - x.kar })).sort((x, y) => y.fark - x.fark);
  if (dusuk.length) {
    const ek = dusuk.reduce((t, x) => t + x.fark, 0) * ay * 0.5; // hedefin yarısı kadar iyileşme varsayımı
    o.push({ id: 'dusuk-marj', alan: 'Fiyat & kâr', oncelik: ek > 5000 ? 1 : 2, etki: ek, etkiTur: 'kar',
      baslik: `${dusuk.length} ürün çok düşük marjla satılıyor`,
      aciklama: `Son 90 günde bu ürünlerin gerçek satış marjı %${Math.min(12, hedef / 2).toFixed(0)}'nin altında kaldı (indirim ya da eski fiyat). Marjları hedefinize (%${hedef}) doğru yarı yarıya yaklaşsa ayda yaklaşık ${para(ek)} ek kâr.`,
      adimlar: ['Bu ürünlerde indirim yapmayı bırakın veya fiyatı güncelleyin', 'Rekabet nedeniyle düşükse, yanında satılan yüksek marjlı ürünle paketleyin'], sayfa: 'fiyat',
      tablo: { basliklar: ['Ürün', 'Satılan', 'Satış (KDV hariç)', 'Kâr', 'Marj'], sag: [1, 2, 3, 4],
        satirlar: dusuk.slice(0, 15).map((x) => [urunAd(x.urun), sayi(x.satilan), para(x.ciroNet), para(x.kar), `%${x.marj.toFixed(1)}`]) } });
  }

  const sonAlis = sonAlislar(db);
  const guncelle = aktif.map((u) => {
    // kartta alış hiç yoksa "alış arttı" denemez (o ürünler alış fiyatı girilmemiş sayılır)
    const s = sonAlis.get(u.id); if (!s || !(s.fiyat > 0) || !(u.satis_fiyati > 0) || !(u.alis_fiyati > 0)) return null;
    const net = netSatis(u.satis_fiyati, u.kdv); const marj = ((net - s.fiyat) / net) * 100;
    const kartAlis = netAlis(u.alis_fiyati, u.kdv, a);
    if (!(s.fiyat > kartAlis * 1.03) || marj >= hedef * 0.6) return null;
    const oner = onerilenFiyat(u, s.fiyat, hedef) ?? 0; const adet = (ozetMap.get(u.id)?.satilan ?? 0) * ay;
    return { u, s, marj, oner, ek: Math.max(0, (netSatis(oner, u.kdv) - net) * adet) };
  }).filter((x): x is NonNullable<typeof x> => !!x).sort((x, y) => y.ek - x.ek);
  if (guncelle.length) {
    const ek = guncelle.reduce((t, x) => t + x.ek, 0);
    o.push({ id: 'fiyat-guncelle', alan: 'Fiyat & kâr', oncelik: ek > 3000 ? 1 : 2, etki: ek || undefined, etkiTur: 'kar',
      baslik: `${guncelle.length} üründe alış fiyatı arttı, satış fiyatı güncellenmemiş`,
      aciklama: `Son faturadaki alış fiyatı kartta yazan alıştan yüksek ve bu fiyatla marj hedefinizin çok altına düşüyor. ${ek > 0 ? `Önerilen fiyata geçilirse mevcut satış hızıyla ayda yaklaşık ${para(ek)} ek kâr.` : 'Bu ürünler son dönemde satılmadığı için ek kâr hesaplanmadı; bir sonraki satıştan önce fiyatı güncelleyin.'}`,
      adimlar: ['Önerilen satış fiyatını BizimHesap\'a girin', 'Alış fiyatını da son fatura fiyatıyla güncelleyin'], sayfa: 'fiyat',
      tablo: { basliklar: ['Ürün', 'Kartta alış', 'Son fatura alışı', 'Satış', 'Marj (son alışla)', 'Önerilen'], sag: [1, 2, 3, 4, 5],
        satirlar: guncelle.slice(0, 15).map((x) => [urunAd(x.u), para(x.u.alis_fiyati), para(x.s.fiyat), para(x.u.satis_fiyati), `%${x.marj.toFixed(0)}`, para(x.oner)]),
        bh: guncelle.slice(0, 15).map((x) => x.u.bh_id ? `https://uygulama.bizimhesap.com/web/ngn/prd/ngnproduct?rc=1&guid=${x.u.bh_id}` : null) } });
  }

  // ---------- STOK ----------
  const sonSat = sonSatislar(db); const bugun = gunu();
  const olu = aktif.filter((u) => u.stok > 0 && u.alis_fiyati > 0).map((u) => {
    const s = sonSat.get(u.id); const gecen = s ? gunFark(bugun, s) : gunFark(bugun, ilk);
    return { u, s, gecen, deger: u.stok * netAlis(u.alis_fiyati, u.kdv, a) };
  }).filter((x) => x.gecen > 90).sort((x, y) => y.deger - x.deger);
  if (olu.length) {
    const deger = olu.reduce((t, x) => t + x.deger, 0);
    o.push({ id: 'olu-stok', alan: 'Stok', oncelik: deger > 50000 ? 1 : 2, etki: deger, etkiTur: 'nakit',
      baslik: `${para(deger)} değerinde ürün 90 günden uzun süredir satılmıyor`,
      aciklama: `${sayi(olu.length)} çeşit ürün rafta bekliyor. Bu para başka ürüne dönse devir hızı artar. En değerli 15'i aşağıda.`,
      adimlar: ['Bu ürünleri tekrar sipariş etmeyin', 'Maliyetine yakın fiyatla kampanya veya usta/servis indirimi yapın', 'Tedarikçiye iade/değişim imkânı varsa sorun'], sayfa: 'stoksagligi',
      tablo: { basliklar: ['Ürün', 'Stok', 'Son satış', 'Bağlı para'], sag: [1, 3],
        satirlar: olu.slice(0, 15).map((x) => [urunAd(x.u), sayi(x.u.stok), x.s ? `${x.gecen} gün önce` : 'hiç satılmadı', para(x.deger)]) } });
  }

  const s30 = urunOzetleri(db, d30); const gun30 = takipGunu(db, d30);
  // işçilik/hizmet kalemleri stok tutulmaz; kategorisi olmayan kartlar da genelde hizmettir
  const stokluMu = (u: Urun) => !!u.kategori && !/işçilik|iscilik|İŞÇİLİK|IŞÇİLİK|hizmet|HİZMET|revizyon|REVİZYON|prim\b|PRİMİ|montaj|MONTAJ|tamir|TAMİR|torna|TORNA|kaporta|KAPORTA|ücret|ÜCRET/i.test(u.ad);
  const bitmis = aktif.filter((u) => u.stok <= 0 && stokluMu(u)).map((u) => ({ u, x: s30.get(u.id), x90: ozetMap.get(u.id) }))
    .filter((r) => (r.x?.satisSayisi ?? 0) >= 2).map((r) => ({ ...r, aylikKar: (r.x!.kar / gun30) * 30 })).sort((x, y) => y.aylikKar - x.aylikKar);
  // muadili (etiketteki OEM kodlarına göre) stokta olanlar acil sipariş sayılmaz, ayrıca gösterilir
  const bitmisM = bitmis.map((r) => ({ ...r, muadil: stoktakiMuadiller(db, r.u) })).sort((x, y) => (x.muadil.length ? 1 : 0) - (y.muadil.length ? 1 : 0) || y.aylikKar - x.aylikKar);
  const acil = bitmisM.filter((r) => !r.muadil.length);
  if (bitmisM.length) {
    const kayip = acil.reduce((t, r) => t + Math.max(0, r.aylikKar), 0); const muadilli = bitmisM.length - acil.length;
    o.push({ id: 'bitmis', alan: 'Satın alma', oncelik: acil.length ? 1 : 3, etki: kayip || undefined, etkiTur: 'kar',
      baslik: acil.length ? `Son 30 günde düzenli satılan ${acil.length} ürün stokta kalmadı` : `Biten ${muadilli} ürünün muadili stokta var`,
      aciklama: `${acil.length ? `Müşteri gelip bulamazsa satış kaçar ve müşteri başka dükkâna alışır. Muadili de olmayan bu ürünlerin son 30 gündeki kârı ayda yaklaşık ${para(kayip)}.` : ''}${muadilli ? ` ${muadilli} ürünün BizimHesap etiketindeki OEM kodlarına göre muadili depoda var; müşteriye muadili verilebilir, siparişte acele etmeyin.` : ''}`.trim(),
      adimlar: [...(acil.length ? ['Muadili olmayanları bugün sipariş edin'] : []), ...(muadilli ? ['Muadili stokta olanlarda satışta muadili önerin'] : []), 'Sık bitenlere Ürünler sayfasından kritik stok seviyesi girin'], sayfa: 'alinacaklar',
      tablo: { basliklar: ['Ürün', '30 günde satılan', '30 günde kâr', 'Depo durumu (muadil / sipariş)'], sag: [1, 2],
        satirlar: bitmisM.slice(0, 20).map((r) => {
          // her depo için: son 30 günde o depodan kaç satıldı, o depoda stokta muadil var mı
          const sat = new Map<string, number>(); for (const h of gecerliHareketler(db, d30)) if (h.tur === 'satis' && h.urun_id === r.u.id && h.depo) sat.set(depoKisa(h.depo).toLocaleUpperCase('tr'), (sat.get(depoKisa(h.depo).toLocaleUpperCase('tr')) ?? 0) + h.miktar);
          const durum = depoMuadil(db, r.u).map(({ depo, muadil }) => { const ad = depoKisa(depo.ad); const n = sat.get(ad.toLocaleUpperCase('tr')) ?? 0;
            return `${ad}${n ? ` (${sayi(n)} satış)` : ''}: ${muadil.length ? 'muadil ' + muadil.slice(0, 2).map((x) => `${x.v.kod || x.v.ad.slice(0, 18)} (${sayi(x.adet)})`).join(', ') : 'sipariş gerekli'}`; });
          return [urunAd(r.u), sayi(r.x!.satilan), para(r.x!.kar), durum.join(' · ') || (r.muadil.length ? muadilMetin(r.muadil.slice(0, 3)) : '— sipariş gerekli')];
        }) } });
  }

  const azalan = aktif.filter((u) => u.stok > 0 && sinif.get(u.id) !== 'C').map((u) => ({ u, h: alinacakHesap(u, ozetMap.get(u.id)?.satilan ?? 0, gunSay, a.hedef_gun ?? 30) }))
    .filter((r) => r.h.hiz > 0 && r.h.yeterGun < 10).sort((x, y) => x.h.yeterGun - y.h.yeterGun);
  if (azalan.length) o.push({ id: 'azalan', alan: 'Satın alma', oncelik: 2,
    baslik: `Çok satan ${azalan.length} ürünün stoğu 10 günden az yetecek`,
    aciklama: 'Kârın büyük kısmını getiren (A ve B sınıfı) ürünler. Satış hızına göre birkaç gün içinde bitecekler.',
    adimlar: ['Bir sonraki siparişe ekleyin', `Önerilen adet: ${a.hedef_gun ?? 30} günlük satış hızına göre`], sayfa: 'alinacaklar',
    tablo: { basliklar: ['Ürün', 'Stok', 'Günde satış', 'Kaç gün yeter', 'Önerilen alış'], sag: [1, 2, 3, 4],
      satirlar: azalan.slice(0, 20).map((r) => [urunAd(r.u), sayi(r.u.stok), r.h.hiz.toFixed(2), Math.round(r.h.yeterGun), sayi(r.h.alinacak)]) } });

  const fazla = aktif.filter((u) => u.stok > 0 && u.alis_fiyati > 0).map((u) => {
    const x = ozetMap.get(u.id); const hiz = (x?.satilan ?? 0) / gunSay; if (!(hiz > 0)) return null;
    const stokGun = u.stok / hiz; const fazlaAdet = Math.max(0, u.stok - hiz * 90);
    return { u, hiz, stokGun, fazlaDeger: fazlaAdet * netAlis(u.alis_fiyati, u.kdv, a) };
  }).filter((x): x is NonNullable<typeof x> => !!x && x.stokGun > 180 && x.fazlaDeger > 1000).sort((x, y) => y.fazlaDeger - x.fazlaDeger);
  if (fazla.length) {
    const deger = fazla.reduce((t, x) => t + x.fazlaDeger, 0);
    o.push({ id: 'fazla-stok', alan: 'Stok', oncelik: deger > 30000 ? 2 : 3, etki: deger, etkiTur: 'nakit',
      baslik: `${fazla.length} üründe 6 aydan fazla yetecek stok var`,
      aciklama: `Satılıyorlar ama elde çok fazla var. 90 günlük ihtiyacın üstündeki kısım ${para(deger)} bağlı para demek.`,
      adimlar: ['Bu ürünlerden stok bitene kadar alım yapmayın', 'Toplu alım indirimi için fazla almışsanız, indirimin bağlı paraya değip değmediğine bakın'], sayfa: 'stoksagligi',
      tablo: { basliklar: ['Ürün', 'Stok', 'Günde satış', 'Kaç gün yeter', 'Fazla stok değeri'], sag: [1, 2, 3, 4],
        satirlar: fazla.slice(0, 15).map((x) => [urunAd(x.u), sayi(x.u.stok), x.hiz.toFixed(2), Math.round(x.stokGun), para(x.fazlaDeger)]) } });
  }

  // ---------- SATIN ALMA: tedarikçi fiyat farkı ----------
  const d180: Donem = { bas: gun(179) > ilk ? gun(179) : ilk, bit: gunu() };
  // alımlar satır satır; her alım, ±45 gün içinde BAŞKA tedarikçiden yapılan en ucuz alımla karşılaştırılır
  // (aylar arası karşılaştırma fiyat artışını "pahalı tedarikçi" sanır; aynı tedarikçinin zaman içindeki zammı sayılmaz)
  type Alim = { tk: string; ad: string; tarih: string; fiyat: number; adet: number };
  const alim = new Map<ID, Alim[]>();
  for (const h of gecerliHareketler(db, d180)) {
    if (h.tur !== 'alis' || h.kaynak !== 'fatura' || !h.cari_guid || !(h.alis_fiyati > 0) || !(h.miktar > 0)) continue;
    const tk = (h.cari_ad ?? h.cari_guid).toLocaleUpperCase('tr').replace(/\s+/g, ' ').trim();
    const l = alim.get(h.urun_id) ?? []; l.push({ tk, ad: h.cari_ad ?? '—', tarih: gunu(h.tarih), fiyat: h.alis_fiyati, adet: h.miktar }); alim.set(h.urun_id, l);
  }
  const urunMap = new Map(db.urunler.map((u) => [u.id, u]));
  const tarihK = (t: string) => `${t.slice(8, 10)}.${t.slice(5, 7)}`;
  // işçilik/nakliye gibi stoksuz kalemler her iş için farklı fiyatlanır; %200'den büyük farklar da genelde birim (metre/top, adet/koli) farkıdır
  const tasarruf = [...alim.entries()].filter(([id, l]) => new Set(l.map((x) => x.tk)).size > 1 && urunMap.has(id) && stokluMu(urunMap.get(id)!)).flatMap(([id, l]) => {
    let fazlaOdenen = 0; let enIyi: { ucuz: Alim; pahali: Alim; yuzde: number; fazla: number } | null = null;
    for (const p of l) {
      const yakin = l.filter((q) => q.tk !== p.tk && Math.abs(gunFark(q.tarih, p.tarih)) <= 45).sort((x, y) => x.fiyat - y.fiyat)[0];
      if (!yakin || !(p.fiyat > yakin.fiyat * 1.05) || p.fiyat > yakin.fiyat * 3) continue;
      const fazla = (p.fiyat - yakin.fiyat) * p.adet; fazlaOdenen += fazla;
      if (!enIyi || fazla > enIyi.fazla) enIyi = { ucuz: yakin, pahali: p, yuzde: (p.fiyat / yakin.fiyat - 1) * 100, fazla };
    }
    const son = [...l].sort((x, y) => y.tarih.localeCompare(x.tarih))[0];
    return enIyi && fazlaOdenen > 100 ? [{ u: urunMap.get(id)!, ...enIyi, fazlaOdenen, sonUcuzdan: son.tk === enIyi.ucuz.tk }] : [];
  }).sort((x, y) => y.fazlaOdenen - x.fazlaOdenen);
  if (tasarruf.length) {
    const toplam = tasarruf.reduce((t, x) => t + x.fazlaOdenen, 0); const aylik = toplam * 30 / takipGunu(db, d180);
    o.push({ id: 'tedarikci-fark', alan: 'Satın alma', oncelik: aylik > 3000 ? 1 : 2, etki: aylik, etkiTur: 'kar',
      baslik: `Aynı ürünü aynı dönemde farklı tedarikçilerden farklı fiyata almışsınız`,
      aciklama: `Son 6 ayda ${tasarruf.length} üründe, aynı ürün birbirine yakın tarihlerde (45 gün içinde) başka tedarikçiden daha ucuza alınabiliyorken pahalıdan alınmış; yaklaşık ${para(toplam)} fazla ödendi (ayda ${para(aylik)}). Aylar arası zamlar sayılmadı.`,
      adimlar: ['Sipariş vermeden önce bu ürünlerde ucuz tedarikçiyi tercih edin', 'Pahalı tedarikçiden diğerinin fiyatını söyleyerek indirim isteyin', '"Son alış ucuzdan" yazanlarda zaten ucuz tedarikçiye geçmişsiniz'], sayfa: 'tedarikci',
      tablo: { basliklar: ['Ürün', 'Ucuz alım', 'Pahalı alım', 'Fark', 'Fazla ödenen', 'Durum'], sag: [3, 4],
        satirlar: tasarruf.slice(0, 20).map((x) => [urunAd(x.u), `${x.ucuz.ad} · ${para(x.ucuz.fiyat)} (${tarihK(x.ucuz.tarih)})`, `${x.pahali.ad} · ${para(x.pahali.fiyat)} (${tarihK(x.pahali.tarih)})`, yuzde(x.yuzde), para(x.fazlaOdenen), x.sonUcuzdan ? 'Son alış ucuzdan ✓' : 'Dikkat']) } });
  }

  // ---------- MÜŞTERİ ----------
  const tumDonem: Donem = { bas: ilk, bit: gunu() };
  const mus = musteriAnalizi(db, tumDonem).filter((m) => m.segment !== 'Perakende');
  const kaybolan = mus.filter((m) => m.segment === 'Riskte' || m.segment === 'Kaybedilen').sort((x, y) => y.ciro - x.ciro);
  // düzenli müşteri: en az 3 farklı günde ve en az 30 günlük bir zamana yayılmış alış (aynı aracın tek tamiri için kesilen 2 fatura düzenlilik değildir)
  const degerli = kaybolan.filter((m) => (m.gunSay ?? m.belge) >= 3 && gunFark(m.son, m.ilk) >= 30).slice(0, 20);
  if (degerli.length) {
    // aylık tutar: müşterinin aktif olduğu süreye (en az 90 gün) yayılır; kısa sürede yapılan büyük işler aylığı şişirmesin
    const aylikCiro = degerli.reduce((t, m) => t + m.ciro / Math.max(90, gunFark(m.son, m.ilk)) * 30, 0);
    const aylikKar = degerli.reduce((t, m) => t + m.kar / Math.max(90, gunFark(m.son, m.ilk)) * 30, 0);
    o.push({ id: 'kaybolan-musteri', alan: 'Müşteri', oncelik: aylikKar > 5000 ? 1 : 2, etki: aylikKar, etkiTur: 'kar',
      baslik: `${degerli.length} düzenli müşteri gelmeyi bıraktı ya da gecikiyor`,
      aciklama: `Bu müşteriler eskiden düzenli alışveriş yapıyordu; her zamanki aralıklarının çok üstünde süredir gelmediler. Geri kazanılırlarsa ayda yaklaşık ${para(aylikCiro)} satış, ${para(aylikKar)} kâr.`,
      adimlar: ['En değerli olanları bu hafta arayın, neden gelmediklerini sorun', 'Usta/filo müşterilerine özel fiyat veya vade teklif edin'], sayfa: 'musteri',
      tablo: { basliklar: ['Müşteri', 'Durum', 'Geldiği gün', 'Son alış', 'Toplam satış', 'Telefon'], sag: [2, 4],
        satirlar: degerli.map((m) => [m.ad, m.segment, sayi(m.gunSay ?? m.belge), `${m.sonGecen} gün önce`, para(m.ciro), m.telefon ?? '']) } });
  }

  const sadik = mus.filter((m) => m.segment === 'Sadık').sort((x, y) => y.ciro - x.ciro);
  const topCiro = mus.reduce((t, m) => t + m.ciro, 0);
  const ilk10 = [...mus].sort((x, y) => y.ciro - x.ciro).slice(0, 10); const ilk10Pay = topCiro > 0 ? ilk10.reduce((t, m) => t + m.ciro, 0) / topCiro * 100 : 0;
  if (ilk10Pay > 40 && mus.length > 20) o.push({ id: 'musteri-yogunlasma', alan: 'Müşteri', oncelik: 3,
    baslik: `Cari satışların ${yuzde(ilk10Pay)}'si sadece 10 müşteriden geliyor`,
    aciklama: `Bu müşterilerden biri giderse ciro ciddi düşer. ${sadik.length} sadık müşteriniz var. Tek fişlik büyük işler (kaporta, motor) düzenli müşteri değildir; "Not" sütununa bakın.`,
    adimlar: ['Bu 10 müşteriyle ilişkiyi koruyun: öncelikli servis, özel fiyat', 'Yeni usta/filo müşterisi kazanmaya çalışın (çevre servisler, taksi durakları, filo şirketleri)'], sayfa: 'musteri',
    tablo: { basliklar: ['Müşteri', 'Satış', 'Pay', 'Fiş', 'Son alış', 'Not'], sag: [1, 2, 3], satirlar: ilk10.map((m) => [m.ad, para(m.ciro), yuzde(m.ciro / topCiro * 100), sayi(m.belge), `${m.sonGecen} gün önce`, m.belge <= 1 ? 'Tek seferlik iş' : m.sonGecen > 90 ? 'Uzun süredir gelmiyor' : m.belge >= 5 ? 'Düzenli' : '']) } });

  // ---------- NAKİT ----------
  // araç alım/satım faturası olan cariler (ör. L200) tahsilat analizine katılmaz: işletmenin normal veresiye alacağı değil
  const gecisAlacak = db.cariler.filter((c) => c.tur === 'musteri' && c.bakiye > 0 && (gecisCarisi(db, c.bh_id) || gecisCarisi(db, c.ad)));
  const vg = db.vadesi_gecen.filter((v) => v.tutar > 0 && !gecisCarisi(db, v.cari)).sort((x, y) => y.tutar - x.tutar);
  const vgToplam = vg.reduce((t, v) => t + v.tutar, 0);
  const aylar = aylikSeri(db); const buAy = gunu().slice(0, 7);
  const tamAylar = aylar.filter((x) => x.ay < buAy && x.ciro > 0).slice(-3);
  const ortCiro = tamAylar.length ? tamAylar.reduce((t, x) => t + x.ciro, 0) / tamAylar.length : g.urunSatis * ay;
  if (vg.length) o.push({ id: 'vadesi-gecen', alan: 'Nakit', oncelik: vgToplam > ortCiro * 0.1 ? 1 : 2, etki: vgToplam, etkiTur: 'nakit',
    baslik: `${para(vgToplam)} vadesi geçmiş alacak var`,
    aciklama: `${vg.length} müşterinin ödemesi gecikmiş${ortCiro > 0 ? ` (aylık satışın ${yuzde(vgToplam / ortCiro * 100)}'si)` : ''}. En büyük 5 borçlu toplamın ${yuzde(vg.slice(0, 5).reduce((t, v) => t + v.tutar, 0) / vgToplam * 100)}'ini oluşturuyor.`,
    adimlar: ['En büyük borçluları bu hafta arayın', '60 günü geçenlere ödeme planı yapın; yeni veresiye satışı durdurun', 'Güncel listeyi almak için BizimHesap\'a giriş yapıp "faturaları güncelle" deyin'], sayfa: 'cariler',
    tablo: { basliklar: ['Müşteri', 'Tutar', 'Gecikme', 'Telefon'], sag: [1, 2], satirlar: vg.slice(0, 15).map((v) => [v.cari, para(v.tutar), v.gun != null ? `${v.gun} gün` : '', v.telefon ?? '']) } });

  const alacak = db.cariler.filter((c) => c.tur === 'musteri' && c.bakiye > 0 && !gecisAlacak.includes(c)).reduce((t, c) => t + c.bakiye, 0);
  const borc = -db.cariler.filter((c) => c.tur === 'tedarikci' && c.bakiye < 0).reduce((t, c) => t + c.bakiye, 0);
  const gunlukCiro = ortCiro / 30;
  if (alacak > 0 && gunlukCiro > 0) {
    const dso = alacak / gunlukCiro;
    if (dso > 20) o.push({ id: 'tahsilat-suresi', alan: 'Nakit', oncelik: dso > 45 ? 1 : 2, etki: Math.max(0, alacak - gunlukCiro * 15), etkiTur: 'nakit',
      baslik: `Müşterilerdeki alacak ${Math.round(dso)} günlük satışa eşit`,
      aciklama: `Müşterilerin size borcu ${para(alacak)}, sizin tedarikçilere borcunuz ${para(borc)}. Satışın parası ortalama ${Math.round(dso)} günde tahsil ediliyor. Bu süre 15 güne inse yaklaşık ${para(Math.max(0, alacak - gunlukCiro * 15))} nakde döner.${gecisAlacak.length ? ` Araç alım/satım faturası olan ${gecisAlacak.map((c) => c.ad).join(', ')} carisi (${para(gecisAlacak.reduce((t, c) => t + c.bakiye, 0))}) bu hesaba katılmadı.` : ''}`,
      adimlar: ['Cari müşterilere vade sınırı koyun (örn. 30 gün) ve aşanlara yeni veresiye vermeyin', 'Peşin/kartla ödemeye küçük indirim düşünün', 'Haftalık tahsilat günü belirleyin'], sayfa: 'cariler' });
  }

  const n30 = nakitAkisi(db, d30);
  if (n30.giris > 0 && n30.cikis > n30.giris * 1.05) o.push({ id: 'nakit-acik', alan: 'Nakit', oncelik: 1, etki: n30.cikis - n30.giris, etkiTur: 'nakit',
    baslik: `Son 30 günde kasadan çıkan para girenden ${para(n30.cikis - n30.giris)} fazla`,
    aciklama: `Kasa/banka girişi ${para(n30.giris)}, çıkışı ${para(n30.cikis)} (virmanlar hariç). Bu devam ederse nakit sıkışır.`,
    adimlar: ['Tedarikçi ödemelerini tahsilatlarla eşleştirin', 'Büyük alımları erteleyin, ölü stoğu nakde çevirin'], sayfa: 'nakit' });

  // ---------- GİDER ----------
  const once = oncekiDonem(d);
  const masrafGrup = (dd: Donem) => { const m = new Map<string, { t: number; n: number; enb: number }>(); const haric = new Set(a.haric_masraf ?? []);
    for (const x of db.masraflar) { if (x.tarih < dd.bas || x.tarih > dd.bit) continue; const k = `${x.ana ?? ''}/${x.alt ?? ''}`; if (haric.has(k)) continue; const g = m.get(k) ?? { t: 0, n: 0, enb: 0 }; g.t += x.tutar; g.n++; g.enb = Math.max(g.enb, x.tutar); m.set(k, g); } return m; };
  if (once.bas >= ilk) {
    const simdi = masrafGrup(d), onceki = masrafGrup(once);
    const artan = [...simdi.entries()].map(([k, g]) => { const og = onceki.get(k); return { k, v: g.t, n: g.n, enb: g.enb, o: og?.t ?? 0, on: og?.n ?? 0, oenb: og?.enb ?? 0 }; })
      .filter((x) => x.o > 0 && x.v > x.o * 1.3 && x.v - x.o > 5000).sort((x, y) => (y.v - y.o) - (x.v - x.o));
    // bir defalık: son dönemin en büyük kaydı önceki dönemin en büyük kaydının 2 katından fazla ve artışın yarısından çoğunu oluşturuyor
    const tek = (x: (typeof artan)[number]) => x.enb > x.oenb * 2 && x.enb > (x.v - x.o) * 0.5;
    if (artan.length) o.push({ id: 'masraf-artis', alan: 'Gider', oncelik: 2,
      baslik: `${artan.length} gider kalemi önceki 90 güne göre belirgin arttı`,
      aciklama: `Son 90 günde bu kalemlere önceki 90 güne göre toplam ${para(artan.reduce((t, x) => t + x.v - x.o, 0))} fazla gider yazılmış. Bir kısmı ödeme zamanlamasından (bir dönemde 2, diğerinde 3 kira gibi) ya da tek seferlik harcamalardan olabilir; "Not" sütununa bakın.`,
      adimlar: ['Her kalemin nedenini kontrol edin (bir defalık mı, kalıcı mı)', 'Kalıcı artışlar (maaş, kira zammı) fiyatlara yansıtılmalı', 'Bir defalık olanları Kâr / Zarar sayfasında hesaptan çıkarabilirsiniz'], sayfa: 'karzarar',
      tablo: { basliklar: ['Gider', 'Önceki 90 gün', 'Son 90 gün', 'Artış', 'Not'], sag: [1, 2, 3],
        satirlar: artan.slice(0, 10).map((x) => [x.k.replace('/', ' › '), `${para(x.o)} (${x.on} kayıt)`, `${para(x.v)} (${x.n} kayıt)`, yuzde((x.v - x.o) / x.o * 100), tek(x) ? `Alışılmadık büyük kayıt ${para(x.enb)} (önceki en büyük ${para(x.oenb)}): bir defalık olabilir` : x.n > x.on ? 'Kayıt sayısı arttı' : 'Tutarlar arttı']) } });
  }

  const ortGider = tamAylar.length ? tamAylar.reduce((t, x) => t + x.masraf, 0) / tamAylar.length : 0;
  const ortKar = tamAylar.length ? tamAylar.reduce((t, x) => t + x.kar, 0) / tamAylar.length : 0;
  const karOrani = ortCiro > 0 ? ortKar / ortCiro : 0;
  if (ortGider > 0 && karOrani > 0) {
    const basabas = ortGider / karOrani;
    if (ortCiro < basabas) o.push({ id: 'basabas', alan: 'Gider', oncelik: 1, etki: (basabas - ortCiro) * karOrani, etkiTur: 'kar',
      baslik: `Son aylarda satışlar giderleri karşılamıyor`,
      aciklama: `Aylık ortalama gider ${para(ortGider)}. Brüt kâr oranı %${(karOrani * 100).toFixed(0)} ile başabaş için ayda ${para(basabas)} satış gerekiyor; ortalama ${para(ortCiro)} yapılıyor (ayda ${para(basabas - ortCiro)} eksik, günde yaklaşık ${para((basabas - ortCiro) / 26)}).`,
      adimlar: ['Önce bir defalık giderleri (kuruluş, demirbaş) Kâr / Zarar sayfasında hesap dışı bırakıp tabloya tekrar bakın', 'Ya satışı artırın (hizmet, kayıp müşteriler) ya da marjı yükseltin', 'Sabit giderleri gözden geçirin'], sayfa: 'karzarar' });
  }

  // ---------- SATIŞ ----------
  const brut = g.urunKar + g.hizmetKar;
  if (brut > 0 && g.hizmetKar / brut > 0.3) o.push({ id: 'hizmet', alan: 'Satış', oncelik: 3,
    baslik: `Brüt kârın ${yuzde(g.hizmetKar / brut * 100)}'si hizmet/işçilikten geliyor`,
    aciklama: `Son 90 günde hizmet geliri ${para(g.hizmetGeliri)}, dışarıya yaptırılan iş ve stok dışı alışlar ${para(g.disHizmet)}.${g.gecis > 0 ? ` Araç alım/satım gibi geçiş satışları (${para(g.gecis)}) hizmete sayılmadı.` : ''} Hizmet, parça satışını da beraberinde getiriyor.`,
    adimlar: ['Servis kapasitesini (usta, lift, randevu) artırmak kârı en hızlı büyütecek alan olabilir', 'Dışarıya yaptırılan işlerden sık olanları içeride yapmayı değerlendirin', 'Her servis işine bakım parçası (filtre, yağ, silecek) önerin'], sayfa: 'karzarar' });

  if (g.maliyetsizUrun > 0) o.push({ id: 'maliyetsiz', alan: 'Veri', oncelik: 2,
    baslik: `${para(g.maliyetsizUrun)} satışta ürünün alış fiyatı girilmemiş`,
    aciklama: `${g.maliyetsizUrunListe.length} üründe BizimHesap kartında alış fiyatı yok; bu satışların kârı hesaplanamıyor ve kâr eksik görünüyor.`,
    adimlar: ['Satırdaki "BizimHesap\'ta aç" bağlantısıyla kartı açıp alış fiyatını girin; geçmiş satışların kârı da bu fiyatla hesaplanır ve ürün listeden düşer', 'Aslında hizmetse kategorisini boş bırakın veya adına "işçilik" yazın'], sayfa: 'karzarar',
    tablo: (() => { const um = new Map(db.urunler.map((u) => [String(u.id), u])); const l = g.maliyetsizUrunListe; return { basliklar: ['Stok kodu', 'Ürün', 'Satış (KDV hariç)', 'Adet'], sag: [2, 3], satirlar: l.map((x) => [(x.id && um.get(x.id)?.kod) || '—', x.ad, para(x.tutar), sayi(x.adet)]), bh: l.map((x) => { const b = x.id ? um.get(x.id)?.bh_id : null; return b ? `https://uygulama.bizimhesap.com/web/ngn/prd/ngnproduct?rc=1&guid=${b}` : null; }) }; })() });

  const kartFark = aktif.map((u) => { const s = sonAlis.get(u.id); const kart = netAlis(u.kart_alis ?? u.alis_fiyati, u.kdv, a);
    return s && kart > 0 && s.fiyat > 0 && kart > s.fiyat * 1.3 ? { u, kart, son: s.fiyat, otomatik: !!u.kart_alis } : null; }).filter((x): x is NonNullable<typeof x> => !!x).sort((x, y) => (y.kart - y.son) - (x.kart - x.son));
  if (kartFark.length) o.push({ id: 'kart-alis', alan: 'Veri', oncelik: 3,
    baslik: `${kartFark.length} üründe kartta yazan alış fiyatı son faturadan çok yüksek`,
    aciklama: `Kartta genelde iskontosuz liste fiyatı yazıyor. ${kartFark.filter((x) => x.otomatik).length} üründe son 6 ayda fatura olduğu için marj ve fiyat hesaplarında artık faturanın net fiyatı kullanılıyor (ürün listesinde "fatura fiyatı" notu). Diğerlerinin faturası 6 aydan eski, kart fiyatı kullanılmaya devam ediyor.`,
    adimlar: ['Bir şey yapmanız gerekmiyor; site fatura fiyatını kendiliğinden kullanıyor', 'BizimHesap\'ta düzeltmek için satırdaki "BizimHesap\'ta aç" bağlantısıyla kartı açın, alış fiyatına "Karta girilecek" sütunundaki tutarı yazıp kaydedin; düzelen ürün birkaç dakika içinde listeden düşer', 'Kalıcı düzeltme için isterseniz BizimHesap\'ta kart alış fiyatını faturadaki net fiyatla güncelleyin; site o zaman yeniden kart fiyatına döner'], sayfa: 'fiyat',
    tablo: { basliklar: ['Stok kodu', 'Ürün', 'Kartta alış', 'Son fatura alışı', `Karta girilecek (${a.alis_kdv_haric ? 'KDV hariç' : 'KDV dahil'})`], sag: [2, 3, 4],
      satirlar: kartFark.map((x) => [x.u.kod || '—', kisaAd(x.u), para(x.kart), para(x.son) + (x.otomatik ? ' ✓' : ''), para(a.alis_kdv_haric ? x.son : x.son * (1 + (Number(x.u.kdv) || 0) / 100))]),
      bh: kartFark.map((x) => x.u.bh_id ? `https://uygulama.bizimhesap.com/web/ngn/prd/ngnproduct?rc=1&guid=${x.u.bh_id}` : null) } });

  const HIZMET_K = /işçilik|iscilik|İŞÇİLİK|hizmet|HİZMET|montaj|tamir|torna|kaporta|rot balans|yıkama|ücret/i;
  const kritiksiz = ozet.filter((x) => sinif.get(x.urun.id) === 'A' && x.urun.aktif && !(x.urun.kritik_stok > 0) && !!x.urun.kategori && !HIZMET_K.test(x.urun.ad));
  const kritikOneri = (x: (typeof ozet)[number]) => Math.max(1, Math.ceil((x.satilan / gunSay) * 10));
  if (kritiksiz.length >= 3) o.push({ id: 'kritik-tanimsiz', alan: 'Veri', oncelik: 3,
    baslik: `Kârın çoğunu getiren ${kritiksiz.length} üründe kritik stok seviyesi tanımlı değil`,
    aciklama: 'Kritik stok girilirse bu ürünler azaldığında Kritik Stok sayfası ve günlük özet sizi uyarır.',
    adimlar: ['Aşağıdaki "Önerilen kritik stokları kaydet" düğmesiyle hepsine yaklaşık 10 günlük satış kadar kritik stok atanır', 'İsterseniz sonra Ürünler veya Alınacaklar sayfasından tek tek değiştirebilirsiniz'], sayfa: 'urunler',
    kritikUygula: kritiksiz.map((x) => ({ id: x.urun.id, kritik: kritikOneri(x) })),
    tablo: { basliklar: ['Ürün', '90 günde satılan', 'Önerilen kritik stok'], sag: [1, 2], satirlar: kritiksiz.slice(0, 20).map((x) => [urunAd(x.urun), sayi(x.satilan), kritikOneri(x)]) } });

  // zayıf gün
  const z = zamanAnalizi(db, d);
  const acikGunler = z.gunler.filter((x) => x.belge >= gunSay / 7 * 0.5);
  if (acikGunler.length >= 4) {
    // ortanca (tipik gün) kullanılır: araç satışı gibi tek seferlik büyük faturalar bir günü olduğundan iyi göstermesin
    const ort = acikGunler.reduce((t, x) => t + x.medyan, 0) / acikGunler.length;
    const zayif = [...acikGunler].sort((x, y) => x.medyan - y.medyan)[0]; const guclu = [...acikGunler].sort((x, y) => y.medyan - x.medyan)[0];
    if (zayif.medyan < ort * 0.7) o.push({ id: 'zayif-gun', alan: 'Satış', oncelik: 3,
      baslik: `${zayif.ad} günleri satış diğer günlerin ${yuzde((1 - zayif.medyan / ort) * 100)} altında`,
      aciklama: `Tipik bir ${zayif.ad} günü ${para(zayif.medyan)}, en iyi gün ${guclu.ad} ${para(guclu.medyan)} (son ${zayif.gunSayisi} ${zayif.ad}; tek seferlik büyük satışlar hesabı şişirmesin diye ortanca gün alınır).`,
      adimlar: [`${zayif.ad} günleri için servis randevusu/bakım kampanyası verin (örn. yağ değişimine işçilik indirimi)`, 'Personel izinlerini ve mal kabulünü zayıf güne kaydırın'], sayfa: 'satisanaliz' });
  }

  // çapraz satış: aynı fişte birlikte satılan ürünler
  const fis = new Map<string, Set<ID>>();
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis' || !h.belge_guid) continue; const u = urunMap.get(h.urun_id); if (!u || hizmetMi(h, u)) continue;
    const s = fis.get(h.belge_guid) ?? new Set(); s.add(h.urun_id); fis.set(h.belge_guid, s);
  }
  const tek = new Map<ID, number>(), cift = new Map<string, number>();
  for (const s of fis.values()) { const l = [...s]; for (const x of l) tek.set(x, (tek.get(x) ?? 0) + 1);
    if (l.length > 1 && l.length < 15) for (let i = 0; i < l.length; i++) for (let j = 0; j < l.length; j++) if (i !== j) { const k = `${l[i]}|${l[j]}`; cift.set(k, (cift.get(k) ?? 0) + 1); } }
  const birimKarOrt = (id: ID) => { const x = ozetMap.get(id); return x && x.satilan > 0 ? x.kar / x.satilan : 0; };
  const capraz = [...cift.entries()].map(([k, n]) => { const [aa, bb] = k.split('|'); const na = tek.get(aa) ?? 0; return { a: aa, b: bb, n, na, oran: na ? n / na : 0 }; })
    .filter((x) => x.n >= 4 && x.oran >= 0.2 && x.oran <= 0.75 && birimKarOrt(x.b) > 0)
    .map((x) => ({ ...x, firsat: (x.na - x.n) * 0.25 * birimKarOrt(x.b) * ay })).sort((x, y) => y.firsat - x.firsat);
  const goruldu = new Set<string>(); const caprazTek = capraz.filter((x) => { const k = [x.a, x.b].sort().join(); if (goruldu.has(k)) return false; goruldu.add(k); return true; });
  const ekCapraz = caprazTek.slice(0, 10).reduce((t, x) => t + x.firsat, 0);
  // aylık etkisi küçükse kart gösterilmez; ayrıntılı analiz Birlikte Satılanlar sayfasında
  if (caprazTek.length && ekCapraz >= 500) {
    const ek = ekCapraz;
    o.push({ id: 'capraz', alan: 'Satış', oncelik: ek >= 2000 ? 2 : 3, etki: ek, etkiTur: 'kar',
      baslik: 'Birlikte satılan ürünlerde çapraz satış fırsatı',
      aciklama: `Bu ürünler sık sık aynı fişte satılıyor, ama çoğu zaman biri tek başına çıkıyor. Kalan fişlerin dörtte birinde ikinci ürün de satılsa ayda yaklaşık ${para(ek)} ek kâr.`,
      adimlar: ['Tezgâhta ilk ürünü alana ikinciyi mutlaka sorun', 'Bu ikilileri rafta yan yana koyun veya paket fiyat yapın'], sayfa: 'sepet',
      tablo: { basliklar: ['Bunu alanlar', 'Şunu da alıyor', 'Birlikte', 'Oran', 'Tek başına satılan'], sag: [2, 3, 4],
        satirlar: caprazTek.slice(0, 12).map((x) => [urunAd(urunMap.get(x.a)!), urunAd(urunMap.get(x.b)!), `${x.n} fiş`, yuzde(x.oran * 100), `${x.na - x.n} fiş`]) } });
  }

  // düşen kategori
  if (once.bas >= ilk) {
    const kat = (dd: Donem) => { const m = new Map<string, { t: number; n: number; enb: number }>(); for (const h of gecerliHareketler(db, dd)) { if (h.tur !== 'satis') continue; const u = urunMap.get(h.urun_id); if (!u?.kategori) continue; const c = hareketTutar(h, a).ciro; const x = m.get(u.kategori) ?? { t: 0, n: 0, enb: 0 }; x.t += c; x.n++; x.enb = Math.max(x.enb, c); m.set(u.kategori, x); } return m; };
    const s = kat(d), p = kat(once);
    // seyrek satılan kategoriler ve tek büyük satışın şişirdiği dönemler yanıltmasın: önceki dönemde en az 5 satış, en büyük tek satış hariç karşılaştırma
    const dusen = [...p.entries()].map(([k, v]) => { const sn = s.get(k); return { k, o: v.t, on: v.n, o2: v.t - v.enb, s: sn?.t ?? 0, sn: sn?.n ?? 0 }; })
      .filter((x) => x.on >= 5 && x.o2 > 10000 && x.s < x.o2 * 0.7).sort((x, y) => (y.o2 - y.s) - (x.o2 - x.s));
    const urunSay = (dd: Donem) => { const m = new Map<ID, number>(); for (const h of gecerliHareketler(db, dd)) if (h.tur === 'satis') m.set(h.urun_id, (m.get(h.urun_id) ?? 0) + h.miktar); return m; };
    const us = urunSay(d), up = urunSay(once); const dusenSet = new Set(dusen.slice(0, 15).map((x) => x.k));
    const urunDusen = [...up.entries()].flatMap(([id, n]) => { const u = urunMap.get(id); const m = us.get(id) ?? 0; return u?.kategori && dusenSet.has(u.kategori) && m < n ? [{ u, n, m }] : []; })
      .sort((x, y) => (x.u.kategori ?? '').localeCompare(y.u.kategori ?? '', 'tr') || (y.n - y.m) - (x.n - x.m));
    if (dusen.length) o.push({ id: 'dusen-kategori', alan: 'Satış', oncelik: 2,
      baslik: `${dusen.length} kategoride satış önceki 90 güne göre %30'dan fazla düştü`,
      aciklama: 'Yalnız düzenli satılan kategoriler (önceki dönemde en az 5 satış) alındı; tek seferlik büyük bir satış düşüş gibi görünmesin diye önceki dönemin en büyük satışı karşılaştırmadan çıkarıldı. Stok bitmiş, fiyat yükselmiş ya da rakip ucuzlamış olabilir.',
      adimlar: ['Bu kategorilerde çok satan ürünlerin stokta olup olmadığına bakın', 'Fiyatlarınızı tedarikçi/rakip fiyatlarıyla karşılaştırın'], sayfa: 'satisanaliz',
      tablo: { basliklar: ['Kategori / Stok kodu', 'Ürün', 'Önceki 90 gün', 'Son 90 gün', 'Stok'], sag: [2, 3, 4],
        satirlar: dusen.slice(0, 15).flatMap((x) => [
          [`▸ ${x.k}`, `Kategori toplamı · -${yuzde((1 - x.s / x.o2) * 100)}`, `${para(x.o)} (${x.on} satış)`, `${para(x.s)} (${x.sn} satış)`, ''],
          ...urunDusen.filter((y) => y.u.kategori === x.k).map((y) => [y.u.kod || '—', kisaAd(y.u), `${sayi(y.n)} adet`, `${sayi(y.m)} adet`, sayi(y.u.stok)]),
        ]) } });
  }

  return o.sort((x, y) => x.oncelik - y.oncelik || (y.etki ?? 0) - (x.etki ?? 0));
}

// ======================= AY SONU TAHMİNİ =======================
export function aySonuTahmini(db: DB) {
  const bugun = gunu(); const ayBas = bugun.slice(0, 8) + '01';
  const sonGun = new Date(Number(bugun.slice(0, 4)), Number(bugun.slice(5, 7)), 0).getDate();
  const ayBit = bugun.slice(0, 8) + String(sonGun).padStart(2, '0');
  const gecen = Number(bugun.slice(8, 10)); const kalan = sonGun - gecen;
  const d: Donem = { bas: ayBas, bit: bugun };
  const g = gelirTablosu(db, d);
  let ciro = 0; const gunluk = new Map<number, number>();
  for (const h of gecerliHareketler(db, d)) if (h.tur === 'satis') { const t = hareketTutar(h, db.ayarlar).ciro; ciro += t; const gn = Number(gunu(h.tarih).slice(8, 10)); gunluk.set(gn, (gunluk.get(gn) ?? 0) + t); }
  // geçen ayın aynı günlerine kadar
  const gAy = new Date(Number(bugun.slice(0, 4)), Number(bugun.slice(5, 7)) - 2, 1);
  const gAyBas = gunu(gAy); const gAySon = new Date(gAy.getFullYear(), gAy.getMonth() + 1, 0).getDate();
  const gAyAyni = gunu(new Date(gAy.getFullYear(), gAy.getMonth(), Math.min(gecen, gAySon)));
  let gecenAyAyni = 0, gecenAyTum = 0;
  for (const h of db.hareketler) { if (h.yok_say || h.tur !== 'satis') continue; const t = gunu(h.tarih); if (t < gAyBas || t.slice(0, 7) !== gAyBas.slice(0, 7)) continue;
    const c = hareketTutar(h, db.ayarlar).ciro; gecenAyTum += c; if (t <= gAyAyni) gecenAyAyni += c; }
  const gecenAyVar = (db.bh_durum?.rapor_ilk ?? '9999') <= gAyBas;
  const satisNet = g.urunSatis + g.hizmetGeliri + g.maliyetsizUrun + g.gecis;
  const brut = g.urunKar + g.hizmetKar;
  const hiz = gecen > 0 ? 1 / gecen * sonGun : 1;
  const tahminCiro = ciro * hiz, tahminBrut = brut * hiz;
  const aylar = aylikSeri(db).filter((x) => x.ay < bugun.slice(0, 7) && x.ciro > 0).slice(-3);
  const ortGider = aylar.length ? aylar.reduce((t, x) => t + x.masraf, 0) / aylar.length : 0;
  const tahminGider = Math.max(g.masraf, ortGider || g.masraf * hiz);
  const brutOran = ciro > 0 ? brut / ciro : 0;
  const basabasCiro = brutOran > 0 ? tahminGider / brutOran : 0;
  return { ayBas, ayBit, gecen, kalan, sonGun, ciro, satisNet, brut, masraf: g.masraf, tahminCiro, tahminBrut, tahminGider, tahminNet: tahminBrut - tahminGider,
    basabasCiro, brutOran, gecenAyAyni: gecenAyVar ? gecenAyAyni : null, gecenAyTum: gecenAyVar ? gecenAyTum : null,
    gunluk: Array.from({ length: sonGun }, (_, i) => ({ gun: i + 1, ciro: gunluk.get(i + 1) ?? 0 })), ortGider };
}
