import { olc } from './hataKayit';
import type { DB, StokAksiyonTur, TahsilatNot, Urun } from './types';
import { gunu } from './format';
import { netAlis } from './analiz';
import { gecisCarisi, sonSatislar } from './analiz2';

const buyuk = (s?: string | null) => (s ?? '').toLocaleUpperCase('tr').replace(/\s+/g, ' ').trim();
const gunFark = (a: string, b: string) => Math.round((new Date(a + 'T12:00').getTime() - new Date(b + 'T12:00').getTime()) / 864e5);
const gunOnce = (n: number) => gunu(new Date(Date.now() - n * 864e5));
/** Bu haftanın pazartesisi */
export const haftaBasi = () => { const d = new Date(); const g = (d.getDay() + 6) % 7; d.setDate(d.getDate() - g); return gunu(d); };
// cari adının ilk dolu parçası (ad yoksa plaka): "/ 34 EP 3064 / MEGANE" -> "34 EP 3064"
const anaAd = (s: string) => buyuk(s.replace(/…$/, '').split('/').map((x) => x.trim()).find((x) => x.length > 0) ?? '');
// BizimHesap raporu uzun adları "…" ile kısaltıyor; kısaltılmışsa başından eşleştir
const kisaltma = (s: string) => /…$/.test(s.trim()) ? buyuk(s.trim().slice(0, -1)) : null;

// ======================= TAHSİLAT =======================
export type TahsilatDurum = 'soz_gecti' | 'soz_bugun' | 'aranacak' | 'soz_bekleniyor' | 'yeni_arandi';
export interface TahsilatSatir {
  cari: string; cari_guid?: string | null; telefon?: string | null; tutar: number; gun: number | null; bakiye?: number;
  notlar: TahsilatNot[]; acikSoz: TahsilatNot | null; sonTemas: string | null; sonTahsilat: { tarih: string; tutar: number } | null;
  son90Tahsilat: number; son14Satis: number; durum: TahsilatDurum; puan: number; tutulmayanSoz: number;
}
const tahsilatOnbellek = new WeakMap<DB, TahsilatSatir[]>();
export function tahsilatListesi(db: DB): TahsilatSatir[] { let l = tahsilatOnbellek.get(db); if (!l) { l = olc('tahsilat', () => tahsilatHesapla(db)); tahsilatOnbellek.set(db, l); } return l; }
function tahsilatHesapla(db: DB): TahsilatSatir[] {
  const bugun = gunu();
  const musteri = db.cariler.filter((c) => c.tur === 'musteri');
  const cari = new Map(musteri.map((c) => [buyuk(c.ad), c]));
  const cariBul = (ad: string) => { const k = kisaltma(ad); if (!k) return cari.get(buyuk(ad)); const l = musteri.filter((c) => buyuk(c.ad).startsWith(k)); return l.length === 1 ? l[0] : undefined; };
  const notlar = new Map<string, TahsilatNot[]>();
  for (const n of db.tahsilat_notlari) { const k = buyuk(n.cari); notlar.set(k, [...(notlar.get(k) ?? []), n]); }
  const tah = db.kasa_akisi.filter((k) => k.giris > 0 && k.tip === 'Tahsilat' && k.karsi && !/PERAKENDE/i.test(k.karsi));
  const sinir14 = gunOnce(13), sinir90 = gunOnce(89);
  // cari başına satışlar bir kez gruplanır (her borçlu için tüm hareketleri baştan taramamak için)
  const satislar = new Map<string, { gun: string; tutar: number }[]>();
  for (const h of db.hareketler) if (h.tur === 'satis' && !h.yok_say && h.cari_ad) { const kk = buyuk(h.cari_ad); const l = satislar.get(kk); const x = { gun: gunu(h.tarih), tutar: h.miktar * h.satis_fiyati }; if (l) l.push(x); else satislar.set(kk, [x]); }
  return db.vadesi_gecen.filter((v) => v.tutar > 0 && !tahsilatDisi(db, v.cari)).map((v) => {
    const c = cariBul(v.cari); const k = buyuk(c?.ad ?? v.cari); const ana = anaAd(v.cari);
    const nl = [...(notlar.get(k) ?? []), ...(c && buyuk(v.cari) !== k ? notlar.get(buyuk(v.cari)) ?? [] : [])].sort((a, b) => (b.olusturma ?? '').localeCompare(a.olusturma ?? ''));
    const acikSoz = nl.find((n) => n.tur === 'soz' && (n.durum ?? 'acik') === 'acik') ?? null;
    const sonTemas = nl.find((n) => n.tur === 'arama' || n.tur === 'mesaj' || n.tur === 'soz')?.olusturma ?? null;
    const t = tah.filter((x) => ana.length > 3 && buyuk(x.karsi).includes(ana)).sort((a, b) => b.tarih.localeCompare(a.tarih));
    // vade tarihinden SONRA yapılan satışlar (borcu oluşturan fatura sayılmaz)
    const vadeSonra = v.gun != null ? gunOnce(v.gun - 1) : sinir14; const sinirS = vadeSonra > sinir14 ? vadeSonra : sinir14;
    const son14Satis = (satislar.get(k) ?? []).filter((x) => x.gun >= sinirS).reduce((s, x) => s + x.tutar, 0);
    let durum: TahsilatDurum = 'aranacak';
    if (acikSoz?.soz_tarih) durum = acikSoz.soz_tarih < bugun ? 'soz_gecti' : acikSoz.soz_tarih === bugun ? 'soz_bugun' : 'soz_bekleniyor';
    else if (sonTemas && gunFark(bugun, gunu(sonTemas)) < 3) durum = 'yeni_arandi';
    const tutulmayanSoz = nl.filter((n) => n.tur === 'soz' && n.durum === 'tutulmadi').length;
    const puan = v.tutar * (1 + Math.min(v.gun ?? 0, 180) / 30) * (durum === 'soz_gecti' ? 3 : durum === 'soz_bugun' ? 2.5 : durum === 'aranacak' ? 1 : 0.2) * (1 + tutulmayanSoz * 0.3);
    return { cari: v.cari, cari_guid: c?.bh_id ?? null, telefon: v.telefon || c?.telefon, tutar: v.tutar, gun: v.gun ?? null, bakiye: c?.bakiye, notlar: nl, acikSoz, sonTemas,
      sonTahsilat: t[0] ? { tarih: t[0].tarih, tutar: t[0].giris } : null, son90Tahsilat: t.filter((x) => x.tarih >= sinir90).reduce((s, x) => s + x.giris, 0), son14Satis, durum, puan, tutulmayanSoz };
  }).sort((a, b) => b.puan - a.puan);
}
/** Araç alım/satım (geçiş) carileri tahsilat listesine girmez: bu bir proje hesabı, müşteri borcu değil */
export const tahsilatDisi = (db: DB, ad: string) => gecisCarisi(db, ad);
export const tahsilatDisiListe = (db: DB) => db.vadesi_gecen.filter((v) => v.tutar > 0 && tahsilatDisi(db, v.cari));
/** Bu haftaki cari tahsilatlar (kasa/banka "Tahsilat" hareketleri, perakende hariç) */
export function haftalikTahsilat(db: DB) {
  const bas = haftaBasi();
  const l = db.kasa_akisi.filter((k) => k.tip === 'Tahsilat' && k.giris > 0 && k.tarih >= bas && !/PERAKENDE/i.test(k.karsi ?? ''));
  return { bas, toplam: l.reduce((s, k) => s + k.giris, 0), adet: l.length, sonKasa: db.kasa_akisi.reduce((m, k) => (k.tarih > m ? k.tarih : m), '') };
}
export const MESAJLAR = {
  kibar: (ad: string, tutar: string, firma: string) => `Merhaba ${ad}, ${firma} olarak yazıyoruz. Hesabınızda vadesi geçmiş ${tutar} bakiye görünüyor. Uygun olduğunuzda ödemenizi rica ederiz. Teşekkürler, iyi çalışmalar.`,
  ikinci: (ad: string, tutar: string, firma: string) => `Merhaba ${ad}, ${firma}. Daha önce hatırlattığımız ${tutar} tutarındaki vadesi geçmiş bakiyeniz hâlâ açık görünüyor. Bu hafta içinde ödeme yapabilir misiniz? Ödeme günü için dönüş yaparsanız sevinirim.`,
  plan: (ad: string, tutar: string, firma: string) => `Merhaba ${ad}, ${firma}. ${tutar} tutarındaki bakiyeniz için size kolaylık olsun diye ödeme planı yapabiliriz (örneğin 2–3 eşit taksit). Size uygun tarihleri yazarsanız planı hemen oluşturalım.`,
};

// ======================= ÖLÜ STOK ERİTME =======================
export interface EritmeSatir {
  u: Urun; stok: number; maliyet: number; deger: number; sonSatis?: string; gecen: number | null; hicSatilmadi: boolean;
  oneri: StokAksiyonTur; neden: string; fiyat: number | null; tedarikci?: string | null; alisTarih?: string | null; alinan?: number;
}
const yukari5 = (x: number) => Math.ceil(x / 5) * 5;
/** N günden uzun süredir satılmayan stok ve her ürün için önerilen aksiyon */
export function eritmeListesi(db: DB, esik = 90, kampanyaOran = 10): EritmeSatir[] {
  const son = sonSatislar(db); const bugun = gunu();
  // satış verisinin gerçekten başladığı gün (ilk satış faturası); rapor_ilk bundan erken olabilir
  const ilkSatis = db.hareketler.reduce((m, h) => (h.tur === 'satis' && h.kaynak === 'fatura' && gunu(h.tarih) < m ? gunu(h.tarih) : m), bugun);
  const ilk = [db.bh_durum?.rapor_ilk ?? gunOnce(esik), ilkSatis].sort().pop()!;
  const alis = new Map<string, { tarih: string; ted: string; adet: number }>();
  for (const h of db.hareketler) {
    if (h.tur !== 'alis' || h.kaynak !== 'fatura' || !h.cari_ad) continue; const g = gunu(h.tarih); const o = alis.get(h.urun_id);
    if (!o || g >= o.tarih) alis.set(h.urun_id, { tarih: g, ted: h.cari_ad, adet: (o && o.tarih === g ? o.adet : 0) + h.miktar });
  }
  const satildiMi = new Set(db.hareketler.filter((h) => h.tur === 'satis').map((h) => h.urun_id));
  return db.urunler.filter((u) => u.aktif && u.stok > 0 && u.alis_fiyati > 0).flatMap((u) => {
    const s = son.get(u.id); const gecen = s ? gunFark(bugun, s) : null;
    const veriGun = gunFark(bugun, ilk);
    if (s ? gecen! < esik : veriGun < Math.min(esik, 30)) return [];
    const maliyet = netAlis(u.alis_fiyati, u.kdv, db.ayarlar); const deger = u.stok * maliyet;
    const a = alis.get(u.id); const alisGun = a ? gunFark(bugun, a.tarih) : null;
    // eşikten yeni alınmış ürün henüz satılmamış olabilir; ölü sayılmaz
    if (alisGun !== null && alisGun < esik) return [];
    let oneri: StokAksiyonTur, neden: string, fiyat: number | null = null;
    if (deger < 300) { oneri = 'beklet'; neden = 'Bağlı para küçük; uğraşmaya değmez, rafta kalsın.'; }
    else if (a && alisGun !== null && alisGun <= 150) { oneri = 'iade'; neden = `${alisGun} gün önce ${a.ted}'den alındı ve satılmadı; iade/değişim isteyin.`; fiyat = maliyet; }
    else if (satildiMi.has(u.id)) { oneri = 'kampanya'; fiyat = Math.min(u.satis_fiyati, yukari5(maliyet * (1 + kampanyaOran / 100) * (1 + u.kdv / 100))); neden = `Daha önce satılmış ama durdu; ${kampanyaOran ? `maliyetin %${kampanyaOran} üstüne` : 'maliyetine'} kampanya.`; }
    else { oneri = 'toplu'; fiyat = yukari5(maliyet * (1 + u.kdv / 100)); neden = `${ilk.slice(8, 10)}.${ilk.slice(5, 7)}'ten (satış kayıtlarının başladığı gün) beri hiç satılmadı; diğer dükkânlara/ustalara maliyetine toplu satış.`; }
    return [{ u, stok: u.stok, maliyet, deger, sonSatis: s, gecen, hicSatilmadi: !s, oneri, neden, fiyat, tedarikci: a?.ted, alisTarih: a?.tarih, alinan: a?.adet }];
  }).sort((x, y) => y.deger - x.deger);
}
/** Planlanan aksiyonların ilerlemesi: başlangıç stoğundan bu yana azalan adet × maliyet */
export function eritmeIlerleme(db: DB) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const aktif = db.stok_aksiyon.filter((a) => a.durum !== 'vazgecildi' && a.aksiyon !== 'siparis');
  let plan = 0, eriyen = 0;
  const satirlar = aktif.map((a) => {
    const u = urun.get(a.urun_id); const m = u && u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, db.ayarlar) : 0;
    const bas = a.baslangic_stok ?? u?.stok ?? 0; const simdi = Math.max(0, u?.stok ?? 0); const azalan = Math.max(0, bas - simdi);
    plan += a.baslangic_deger ?? bas * m; eriyen += azalan * m;
    return { a, u, bas, simdi, azalan, eriyenDeger: azalan * m };
  });
  const hb = haftaBasi();
  return { satirlar, plan, eriyen, buHafta: satirlar.filter((x) => (x.a.olusturma ?? '') >= hb).length };
}
