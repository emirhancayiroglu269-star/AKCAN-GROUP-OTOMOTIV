import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, Info, MessageCircle, PackageCheck, Printer, Snowflake, Sun, Truck, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { alinacakHesap, birimKar, gecerliHareketler, stokluMu, takipGunu, urunOzetleri, type Donem, kritikAltinda } from '../lib/analiz';
import { PERAKENDE_RE } from '../lib/analiz2';
import { ara, gunu, para, parse, sayi, tarih } from '../lib/format';
import type { StokAksiyon, Urun } from '../lib/types';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';
import { yazdir } from '../components/Yazdir';
import { depoSiparisleri, mevsim, urunTedarikcileri, type DepoSiparisSatir } from '../lib/analiz3';
import { UrunLink } from '../components/DetayKart';
import { muadilMetin, stoktakiMuadiller } from '../lib/muadil';
import { OmIsteDugme } from '../components/OmIsteDugme';
import { PahaliRozet } from '../components/PahaliRozet';

interface Satir {
  u: Urun; satilan: number; satilan90: number; hiz: number; yeter: number; oneri: number; yolda: number;
  neden: 'kritik' | 'bitti' | 'azaliyor'; olu: boolean; puan: number; birimKar: number;
  mevsim: { ad: string; katsayi: number } | null;
  /** düzenli satılıyor: kesin rafta olmalı */ kesin: boolean; duzen: Duzen | null;
}
/** son 6 ayın satış düzeni: kaç ayda, kaç ayrı faturada, kaç ayrı müşteriye satıldı */
interface Duzen { ay: number; ay3: number; belge: number; musteri: number; son60: boolean }
interface AcikSiparis { kayitlar: StokAksiyon[]; adet: number; gelen: number; kalan: number; ilk: string }

/** Tarayıcıda kişiye özel küçük ayarlar (bütçe, kritik gün); okunamazsa varsayılan */
const yerel = { al: (k: string, v: string) => { try { return localStorage.getItem(k) ?? v; } catch { return v; } }, yaz: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* yok */ } } };
const gunFark = (s: string) => Math.floor((Date.now() - new Date(s).getTime()) / 864e5);

export default function Alinacaklar() {
  const { db, izin, calistir, personel } = useStore();
  const maliyetGor = izin('maliyet'), duzenle = izin('urun');
  const [gunSec, setGunSec] = useState(30);
  const [q, setQ] = useState('');
  const [marka, setMarka] = useState('');
  const [kat, setKat] = useState('');
  const [miktar, setMiktar] = useState<Record<string, string>>({});
  const [cikar, setCikar] = useState<Set<string>>(new Set());
  const [grupla, setGrupla] = useState(false);
  const [mevsimAcik, setMevsimAcik] = useState(true);
  const [sirala, setSirala] = useState<'oncelik' | 'yeter'>('oncelik');
  const [butce, setButce] = useState(() => yerel.al('siparis_butce', ''));
  const [kritikGun, setKritikGun] = useState(() => Number(yerel.al('kritik_gun', '10')) || 10);
  const [panel, setPanel] = useState<'' | 'yolda' | 'kritik'>('');
  const [gorunum, setGorunum] = useState<'depo' | 'toplam'>(() => (yerel.al('alinacak_gorunum', 'depo') as 'depo' | 'toplam'));
  const [guven, setGuven] = useState<'kesin' | 'kontrol' | 'hepsi'>(() => (yerel.al('alinacak_guven', 'kesin') as 'kesin' | 'kontrol' | 'hepsi'));
  const ted = useMemo(() => urunTedarikcileri(db), [db]);
  const hedefGun = db.ayarlar.hedef_gun || 30;
  const d: Donem = { bas: gunu(new Date(Date.now() - (gunSec - 1) * 864e5)), bit: gunu() };
  const d90: Donem = { bas: gunu(new Date(Date.now() - 89 * 864e5)), bit: gunu() };
  const gun = takipGunu(db, d), gun90 = takipGunu(db, d90);
  const urunMap = useMemo(() => new Map(db.urunler.map((u) => [u.id, u])), [db.urunler]);

  // ---------- açık siparişler: verildiği günden bu yana gelen alış (fatura/stok artışı) düşülür ----------
  const acik = useMemo(() => {
    const m = new Map<string, AcikSiparis>();
    for (const a of db.stok_aksiyon) if (a.aksiyon === 'siparis' && a.durum === 'planlandi') {
      const x = m.get(a.urun_id) ?? { kayitlar: [], adet: 0, gelen: 0, kalan: 0, ilk: a.olusturma ?? new Date().toISOString() };
      x.kayitlar.push(a); x.adet += a.baslangic_deger ?? 0; if ((a.olusturma ?? '') < x.ilk) x.ilk = a.olusturma ?? x.ilk; m.set(a.urun_id, x);
    }
    if (!m.size) return m;
    for (const h of db.hareketler) {
      if (h.tur !== 'alis' || h.yok_say) continue;
      const x = m.get(h.urun_id); if (!x) continue;
      // sipariş günü: yalnız siparişten sonraki saatte gelen sayılır (önceki alış sayılmasın)
      const g = gunu(h.tarih), gi = gunu(x.ilk);
      if (g > gi || (g === gi && new Date(h.tarih).getTime() > new Date(x.ilk).getTime())) x.gelen += h.miktar;
    }
    for (const [id, x] of m) {
      const u = urunMap.get(id); const bas = Math.min(...x.kayitlar.map((k) => k.baslangic_stok ?? Infinity));
      const stokArtisi = u && Number.isFinite(bas) ? Math.max(0, u.stok - bas) : 0;
      x.gelen = Math.max(x.gelen, stokArtisi); x.kalan = Math.max(0, x.adet - x.gelen);
    }
    return m;
  }, [db.stok_aksiyon, db.hareketler, urunMap]);

  // tamamı gelen siparişler kendiliğinden "geldi" olur (bir kez)
  const kapatilan = useRef(new Set<string>());
  useEffect(() => {
    if (!duzenle) return;
    const kapat = [...acik.values()].filter((x) => x.adet > 0 && x.kalan <= 0).flatMap((x) => x.kayitlar).filter((k) => !kapatilan.current.has(String(k.id)));
    if (!kapat.length) return;
    kapat.forEach((k) => kapatilan.current.add(String(k.id)));
    Promise.all(kapat.map((k) => backend.update<StokAksiyon>('stok_aksiyon', k.id, { durum: 'yapildi', guncelleme: new Date().toISOString() }))).catch(() => undefined);
  }, [acik, duzenle]);

  // ---------- satış düzeni (son 180 gün): "kesin alınacak" kararı için ----------
  const duzenler = useMemo(() => {
    const simdi = Date.now(); const d180: Donem = { bas: gunu(new Date(simdi - 179 * 864e5)), bit: gunu() };
    const m = new Map<string, { aylar: Set<number>; belge: Set<string>; musteri: Set<string>; son: number }>();
    for (const h of gecerliHareketler(db, d180)) {
      if (h.tur !== 'satis' || h.miktar <= 0) continue;
      let x = m.get(h.urun_id); if (!x) { x = { aylar: new Set(), belge: new Set(), musteri: new Set(), son: 0 }; m.set(h.urun_id, x); }
      const t = new Date(h.tarih).getTime(); const belge = h.belge_guid ?? h.tarih.slice(0, 10);
      x.aylar.add(Math.min(5, Math.floor((simdi - t) / (30 * 864e5)))); x.belge.add(belge);
      // perakende satışlarda her fatura ayrı müşteri sayılır
      const cari = h.cari_guid || h.cari_ad || ''; x.musteri.add(!cari || PERAKENDE_RE.test(h.cari_ad ?? '') ? `b:${belge}` : `c:${cari}`);
      if (t > x.son) x.son = t;
    }
    const r = new Map<string, Duzen>();
    for (const [id, x] of m) r.set(id, { ay: x.aylar.size, ay3: [0, 1, 2].filter((i) => x.aylar.has(i)).length, belge: x.belge.size, musteri: x.musteri.size, son60: simdi - x.son <= 60 * 864e5 });
    return r;
  }, [db]);
  // kesin: son 60 günde satılmış, en az 3 ayrı faturada ve 2 ayrı müşteriye, son 6 ayın en az 3'ünde (ya da son 3 ayın 2'sinde) satılmış
  const kesinMi = (z: Duzen | undefined) => !!z && z.son60 && z.belge >= 3 && z.musteri >= 2 && (z.ay >= 3 || z.ay3 >= 2);

  const satirlar = useMemo<Satir[]>(() => {
    const oz = urunOzetleri(db, d), oz90 = urunOzetleri(db, d90);
    return db.urunler.filter((u) => u.aktif && stokluMu(u)).flatMap((u) => {
      const satilan = oz.get(u.id)?.satilan ?? 0; const satisSay = oz.get(u.id)?.satisSayisi ?? 0;
      const satilan90 = oz90.get(u.id)?.satilan ?? 0;
      const ms = mevsimAcik ? mevsim(u) : null;
      const h = alinacakHesap(u, satilan * (ms?.katsayi ?? 1), gun, hedefGun);
      const kritik = kritikAltinda(u);
      // dönemde tek kez satılan ürün (kritik stok tanımlı değilse) "bitti" listesine girmez: bir kerelik parça yeniden alınmaz
      const bitti = u.stok <= 0 && satisSay >= 2;
      if (!kritik && u.stok <= 0 && satisSay < 2) return [];
      if (!kritik && !bitti && h.alinacak <= 0) return [];
      const ham = Math.max(h.alinacak, kritik ? Math.max(1, Math.ceil(u.kritik_stok) - Math.max(0, u.stok)) : 1);
      const yolda = acik.get(u.id)?.kalan ?? 0;
      // ölü sipariş: kritik seviyesi var ama 90 gündür hiç satılmadı → almak para bağlamak olur
      const olu = kritik && satilan90 === 0;
      const bk = birimKar(u, db.ayarlar); const birimKarNet = bk.maliyetYok ? 0 : Math.max(0, bk.kar);
      const aciliyet = u.stok <= 0 ? 3 : h.yeterGun < 7 ? 2 : h.yeterGun < 15 ? 1.5 : 1;
      const puan = olu ? 0 : (h.hiz * 30) * Math.max(birimKarNet, 1) * aciliyet;
      return [{ u, satilan, satilan90, hiz: h.hiz, yeter: h.yeterGun, oneri: Math.max(0, ham - yolda), yolda, olu, puan, birimKar: birimKarNet,
        neden: kritik ? 'kritik' as const : bitti ? 'bitti' as const : 'azaliyor' as const, mevsim: ms && ms.katsayi !== 1 ? ms : null,
        kesin: !olu && kesinMi(duzenler.get(u.id)), duzen: duzenler.get(u.id) ?? null }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, gunSec, gun, hedefGun, mevsimAcik, acik, duzenler]);

  const muadilStokHesap = useMemo(() => { const m = new Map<string, number>(); for (const x of satirlar) if (x.u.stok <= 0) { const t = stoktakiMuadiller(db, x.u).reduce((a, v) => a + v.stok, 0); if (t > 0) m.set(x.u.id, t); } return m; }, [db, satirlar]);
  const kesinSay = satirlar.filter((x) => x.kesin && x.oneri > 0 && !((muadilStokHesap.get(x.u.id) ?? 0) >= x.oneri)).length;
  // ---------- kesin alınacaklar depo bazında: her deponun kendi satışı ve stoğu; diğer depoda fazlası varsa transfer ----------
  const kesinUrun = useMemo(() => new Set(db.urunler.filter((u) => u.aktif && kesinMi(duzenler.get(u.id))).map((u) => u.id)),
    [db, duzenler]);
  const depoKesin = useMemo(() => guven !== 'kesin' ? [] : depoSiparisleri(db, 60, hedefGun, mevsimAcik).map((dp) => ({ ...dp, satirlar: dp.satirlar.filter((x) => kesinUrun.has(x.u.id) && (x.siparis > 0 || x.transfer > 0)) })),
    [db, guven, hedefGun, mevsimAcik, kesinUrun]);
  const markalar = useMemo(() => Array.from(new Set(satirlar.map((x) => x.u.marka).filter(Boolean))).sort() as string[], [satirlar]);
  const kategoriler = useMemo(() => Array.from(new Set(satirlar.map((x) => x.u.kategori).filter(Boolean))).sort() as string[], [satirlar]);
  const muadilYeter = (x: Satir) => (muadilStokHesap.get(x.u.id) ?? 0) >= x.oneri;
  const guvenUygun = (x: Satir) => guven === 'hepsi' ? true : guven === 'kesin' ? x.kesin && x.oneri > 0 && !muadilYeter(x) : !(x.kesin && x.oneri > 0 && !muadilYeter(x));
  const liste = satirlar.filter((x) => guvenUygun(x) && (!marka || x.u.marka === marka) && (!kat || x.u.kategori === kat) && ara(q, x.u.ad, x.u.kod, x.u.marka))
    .sort((a, b) => (sirala === 'oncelik' ? b.puan - a.puan : 0) || (a.yeter - b.yeter) || a.u.ad.localeCompare(b.u.ad, 'tr'));
  // stokta muadili (etiketteki OEM kodlarına göre) yeterince olan bitmiş ürünün sipariş varsayılanı 0
  const muadilStok = muadilStokHesap;
  const varsayilan = (x: Satir) => (x.olu || (muadilStok.get(x.u.id) ?? 0) >= x.oneri ? 0 : x.oneri);
  const adet = (x: Satir) => (miktar[x.u.id] !== undefined ? parse(miktar[x.u.id]) : varsayilan(x));

  // ---------- bütçe: öncelik sırasıyla, bütçeye sığanlar seçilir ----------
  const butceN = maliyetGor ? parse(butce) : 0;
  const butceDisi = useMemo(() => {
    const s = new Set<string>(); if (!butceN) return s;
    let kalan = butceN;
    for (const x of [...liste].sort((a, b) => b.puan - a.puan)) {
      if (cikar.has(x.u.id) || adet(x) <= 0) continue;
      const t = adet(x) * x.u.alis_fiyati;
      if (t <= kalan) kalan -= t; else s.add(x.u.id);
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste, butceN, cikar, miktar]);
  const secili = liste.filter((x) => !cikar.has(x.u.id) && !butceDisi.has(x.u.id) && adet(x) > 0);
  const tutar = secili.reduce((t, x) => t + adet(x) * x.u.alis_fiyati, 0);

  const kritikKaydet = (u: Urun, v: string) => { const n = parse(v); if (n !== u.kritik_stok) calistir(() => backend.update<Urun>('urunler', u.id, { kritik_stok: n }), 'Kritik seviye kaydedildi'); };
  const tedAd = (x: Satir) => ted.get(x.u.id)?.ucuz.ad ?? 'Tedarikçi bilinmiyor';
  const siparisVer = (l: Satir[]) => calistir(async () => {
    for (const x of l) await backend.insert<Partial<StokAksiyon>>('stok_aksiyon', { urun_id: x.u.id, aksiyon: 'siparis', baslangic_deger: adet(x), baslangic_stok: x.u.stok, fiyat: ted.get(x.u.id)?.ucuz.fiyat ?? x.u.alis_fiyati, tedarikci: tedAd(x) === 'Tedarikçi bilinmiyor' ? null : tedAd(x), durum: 'planlandi', kullanici: personel });
    setMiktar({});
  }, `${l.length} kalem "sipariş verildi" olarak işaretlendi`);
  const siparisDurum = (k: StokAksiyon[], durum: StokAksiyon['durum']) => calistir(async () => { for (const a of k) await backend.update<StokAksiyon>('stok_aksiyon', a.id, { durum, guncelleme: new Date().toISOString() }); }, durum === 'yapildi' ? 'Geldi olarak işaretlendi' : 'Sipariş iptal edildi');

  const metin = () => [`${db.ayarlar.firma_adi} — Sipariş listesi (${tarih(new Date().toISOString())})`, '',
    ...secili.map((x) => `• ${x.u.ad}${x.u.marka ? ` (${x.u.marka})` : ''}${x.u.kod ? ` [${x.u.kod}]` : ''} — ${sayi(adet(x))} ${x.u.birim}`), '', `Toplam ${secili.length} kalem`].join('\n');
  const gruplar = (() => { const m = new Map<string, Satir[]>(); for (const x of secili) { const k = tedAd(x); m.set(k, [...(m.get(k) ?? []), x]); } return [...m.entries()].sort((a, b) => Number(a[0] === 'Tedarikçi bilinmiyor') - Number(b[0] === 'Tedarikçi bilinmiyor') || b[1].length - a[1].length); })();
  const tedMetin = (ad: string, l: Satir[]) => [`Merhaba ${ad === "Tedarikçi bilinmiyor" ? "" : ad + ", "}${db.ayarlar.firma_adi} sipariş listesi (${tarih(new Date().toISOString())}):`, '', ...l.map((x) => `• ${x.u.ad}${x.u.marka ? ` (${x.u.marka})` : ''}${x.u.kod ? ` [${x.u.kod}]` : ''} — ${sayi(adet(x))} ${x.u.birim}`), '', `Toplam ${l.length} kalem. Teşekkürler.`].join('\n');
  const csv = () => {
    const sat = (a: (string | number | null | undefined)[]) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [sat(['Tedarikçi (en ucuz)', 'Stok kodu', 'Barkod', 'Ürün', 'Marka', 'Kategori', 'Stok', 'Yolda', 'Kritik', `Son ${gunSec} gün satış`, 'Sipariş adedi', 'Birim', ...(maliyetGor ? ['Alış fiyatı', 'Tutar'] : [])]),
      ...[...secili].sort((a, b) => tedAd(a).localeCompare(tedAd(b), 'tr')).map((x) => sat([tedAd(x), x.u.kod, x.u.barkod, x.u.ad, x.u.marka, x.u.kategori, x.u.stok, x.yolda || '', x.u.kritik_stok, x.satilan, adet(x), x.u.birim, ...(maliyetGor ? [x.u.alis_fiyati, (adet(x) * x.u.alis_fiyati).toFixed(2)] : [])]))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); a.download = `siparis-${gunu()}.csv`; a.click();
  };
  const yazdirListe = () => yazdir(
    <div className="p-4 text-[11px]">
      <div className="mb-3 flex justify-between border-b-2 border-black pb-2"><b className="text-base">{db.ayarlar.firma_adi}</b><div className="text-right"><b>SİPARİŞ LİSTESİ</b><div>{tarih(new Date().toISOString())}</div></div></div>
      <table className="w-full border-collapse"><thead><tr className="border-b border-black text-left"><th>Kod</th><th>Ürün</th><th>Marka</th><th className="text-right">Stok</th><th className="text-right">Sipariş</th></tr></thead>
        <tbody>{secili.map((x) => <tr key={x.u.id} className="border-b"><td>{x.u.kod}</td><td>{x.u.ad}</td><td>{x.u.marka}</td><td className="text-right">{sayi(x.u.stok)}</td><td className="text-right font-bold">{sayi(adet(x))} {x.u.birim}</td></tr>)}</tbody></table>
      <div className="mt-2 text-right">{secili.length} kalem</div>
    </div>,
  );

  // ---------- kritik seviye önerisi: 90 günlük satış hızı × kritik gün (mevsim katsayısıyla) ----------
  const kritikOneri = (u: Urun, satilan90: number) => {
    // 90 günde hiç satılmadıysa kritik gereksiz; bir kez bile satıldıysa en az 1 (rafta bir tane dursun)
    if (satilan90 <= 0) return 0;
    const k = mevsimAcik ? mevsim(u)?.katsayi ?? 1 : 1;
    return Math.max(1, Math.ceil((satilan90 / Math.max(1, gun90)) * kritikGun * k));
  };
  const kritikListe = useMemo(() => {
    if (panel !== 'kritik') return [];
    const oz90 = urunOzetleri(db, d90);
    return db.urunler.filter((u) => u.aktif && stokluMu(u)).flatMap((u) => {
      const s = oz90.get(u.id)?.satilan ?? 0; const o = kritikOneri(u, s); const m = u.kritik_stok || 0;
      if (o === m) return [];
      if (m === 0 && s < 2) return []; // bir kerelik satış için yeni kritik seviye önerilmez
      const fark = Math.abs(o - m);
      if (m > 0 && o > 0 && fark < Math.max(1, m * 0.3)) return []; // küçük farklar gürültü
      const tip = m === 0 ? 'tanimsiz' as const : o === 0 ? 'gereksiz' as const : o > m ? 'dusuk' as const : 'yuksek' as const;
      return [{ u, s, o, m, tip }];
    }).filter((x) => ara(q, x.u.ad, x.u.kod, x.u.marka) && (!kat || x.u.kategori === kat) && (!marka || x.u.marka === marka))
      .sort((a, b) => ({ gereksiz: 0, dusuk: 1, tanimsiz: 2, yuksek: 3 }[a.tip] - { gereksiz: 0, dusuk: 1, tanimsiz: 2, yuksek: 3 }[b.tip]) || b.s - a.s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, panel, kritikGun, mevsimAcik, gun90, q, kat, marka]);
  const [kritikSec, setKritikSec] = useState<Set<string>>(new Set());
  const kritikUygula = (l: typeof kritikListe) => calistir(async () => { for (const x of l) await backend.update<Urun>('urunler', x.u.id, { kritik_stok: x.o }); setKritikSec(new Set()); }, `${l.length} ürünün kritik seviyesi güncellendi`);
  const TIP = { gereksiz: ['90 gündür satılmıyor', 'bg-red-50 text-red-700'], dusuk: ['Düşük kalmış', 'bg-amber-50 text-amber-800'], tanimsiz: ['Tanımlı değil', 'bg-sky-50 text-sky-700'], yuksek: ['Fazla yüksek', 'bg-slate-100 text-slate-600'] } as const;

  const acikListe = [...acik.entries()].filter(([, x]) => x.kalan > 0).map(([id, x]) => ({ id, u: urunMap.get(id), ...x })).sort((a, b) => a.ilk.localeCompare(b.ilk));
  const yoldaTutar = acikListe.reduce((t, x) => t + x.kalan * (x.kayitlar[0]?.fiyat ?? x.u?.alis_fiyati ?? 0), 0);
  const oluSay = satirlar.filter((x) => x.olu).length;
  const sekmeBtn = (id: '' | 'yolda' | 'kritik', ad: string, n?: number) => <button onClick={() => setPanel(panel === id ? '' : id)} className={`rounded-full px-3 py-1.5 text-sm ${panel === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{ad}{n !== undefined && <span className="ml-1 opacity-60">{n}</span>}</button>;

  return (
    <div>
      <SayfaBaslik baslik="Kritik Stok & Alınacaklar" alt={`Satış hızına göre kaç adet almanız gerektiği · hedef: ${hedefGun} günlük stok`}>
        <OmIsteDugme urunler={liste.filter((x) => x.u.stok <= 0).map((x) => x.u)} />
        <button className="btn-ghost" disabled={!secili.length} onClick={yazdirListe}><Printer size={16} /> Yazdır</button>
        <button className="btn-ghost" disabled={!secili.length} onClick={csv}><Download size={16} /> Excel (CSV)</button>
        <a className={`btn-ghost ${secili.length ? '' : 'pointer-events-none opacity-50'}`} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(secili.length ? metin() : '')}`}><MessageCircle size={16} /> WhatsApp</a>
        {duzenle && <button className="btn-primary" disabled={!secili.length} onClick={() => siparisVer(secili)} title="Seçili kalemleri yolda olarak kaydeder; mal gelene kadar öneriden düşer"><PackageCheck size={16} /> Sipariş verildi</button>}
      </SayfaBaslik>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi etiket="Kritik seviyenin altında" deger={sayi(satirlar.filter((x) => x.neden === 'kritik').length)} renk="amber" />
        <Kpi etiket="Satılıp stoğu biten" deger={sayi(satirlar.filter((x) => x.neden === 'bitti').length)} renk="red" />
        <Kpi etiket={`${hedefGun} günden az yetecek`} deger={sayi(satirlar.filter((x) => x.neden === 'azaliyor').length)} />
        <button className="text-left" onClick={() => setPanel('yolda')}><Kpi etiket="Yoldaki sipariş" deger={`${sayi(acikListe.length)} kalem`} alt={maliyetGor && yoldaTutar ? `≈ ${para(yoldaTutar)}` : 'Listelemek için tıklayın'} renk="blue" /></button>
        <Kpi etiket="Ölü sipariş riski" deger={sayi(oluSay)} alt="Kritik seviyesi var, 90 gündür satılmadı" renk={oluSay ? 'red' : 'slate'} />
        <Kpi etiket="Seçili sipariş" deger={`${secili.length} kalem`} alt={maliyetGor ? `Tahmini alış ${para(tutar)}${butceN ? ` / bütçe ${para(butceN)}` : ''}` : undefined} renk="green" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {([['kesin', 'Kesin alınacaklar', kesinSay], ['kontrol', 'Kontrol edilecekler', satirlar.length - kesinSay], ['hepsi', 'Tümü', satirlar.length]] as const).map(([k, ad, n]) => (
          <button key={k} onClick={() => { setGuven(k); yerel.yaz('alinacak_guven', k); }} title={k === 'kesin' ? 'Düzenli satılan, şu an stoğu yetmeyen ürünler: rafta mutlaka olmalı' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${guven === k ? (k === 'kesin' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900') : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{ad} <span className="opacity-70">{n}</span></button>))}
        {guven === 'kesin' && <div className="ml-1 flex rounded-full bg-white p-0.5 text-xs dark:bg-slate-900">{([['depo', 'Depo bazında'], ['toplam', 'Toplam']] as const).map(([k, ad]) => (
          <button key={k} onClick={() => { setGorunum(k); yerel.yaz('alinacak_gorunum', k); }} className={`rounded-full px-2.5 py-1 ${gorunum === k ? 'bg-emerald-100 font-semibold text-emerald-800' : 'text-slate-500'}`}>{ad}</button>))}</div>}
        <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" />
        {sekmeBtn('yolda', 'Yoldaki siparişler', acikListe.length)}
        {duzenle && sekmeBtn('kritik', 'Kritik seviye önerileri')}
        {maliyetGor && <label className="ml-auto flex items-center gap-2 text-sm">Sipariş bütçesi
          <input className="inp w-32 py-1 text-right" placeholder="sınırsız" value={butce} onChange={(e) => { setButce(e.target.value); yerel.yaz('siparis_butce', e.target.value); }} /> TL</label>}
      </div>

      {panel === 'yolda' && (
        <div className="card mb-4">
          <div className="border-b border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">Yoldaki siparişler <span className="font-normal text-slate-500">· mal geldikçe (alış faturası veya stok artışı) kendiliğinden kapanır</span></div>
          <div className="max-h-[40vh] overflow-auto">
            {acikListe.length === 0 ? <Bos metin={'Yolda sipariş yok. Listeden kalemleri seçip "Sipariş verildi" deyin.'} /> : (
              <table className="tbl">
                <thead><tr><th>Ürün</th><th>Tedarikçi</th><th className="text-right">Sipariş</th><th className="text-right">Gelen</th><th className="text-right">Bekleyen</th><th className="text-right">Verildi</th>{duzenle && <th></th>}</tr></thead>
                <tbody>{acikListe.map((x) => { const g = gunFark(x.ilk); return (
                  <tr key={x.id}>
                    <td><div className="font-medium">{x.u ? <UrunLink id={x.id}>{x.u.ad}</UrunLink> : '—'}</div><div className="text-xs text-slate-500">{[x.u?.kod, x.u?.marka].filter(Boolean).join(' · ')} · stok {sayi(x.u?.stok ?? 0)}</div></td>
                    <td className="text-slate-500">{x.kayitlar[0]?.tedarikci ?? '—'}</td>
                    <td className="text-right">{sayi(x.adet)}</td>
                    <td className="text-right text-emerald-700">{x.gelen ? sayi(x.gelen) : '—'}</td>
                    <td className="text-right font-semibold">{sayi(x.kalan)}</td>
                    <td className="text-right">{tarih(x.ilk)}{g >= 7 && <div className="rozet bg-red-50 text-red-700">{g} gündür gelmedi</div>}</td>
                    {duzenle && <td className="whitespace-nowrap text-right"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => siparisDurum(x.kayitlar, 'yapildi')}><Check size={13} /> Geldi</button> <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={() => siparisDurum(x.kayitlar, 'vazgecildi')}><X size={13} /> İptal</button></td>}
                  </tr>); })}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {panel === 'kritik' && (
        <div className="card mb-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 text-sm dark:border-slate-800">
            <b>Kritik seviye önerileri</b>
            <span className="text-slate-500">Öneri = son 90 günün günlük satışı ×</span>
            <input className="inp w-16 py-1 text-right" value={kritikGun} onChange={(e) => { const n = parse(e.target.value) || 1; setKritikGun(n); yerel.yaz('kritik_gun', String(n)); }} />
            <span className="text-slate-500">gün{mevsimAcik ? ' (mevsim katsayısıyla)' : ''}</span>
            <button className="btn-primary ml-auto" disabled={!kritikSec.size} onClick={() => kritikUygula(kritikListe.filter((x) => kritikSec.has(x.u.id)))}>Seçilenleri uygula ({kritikSec.size})</button>
          </div>
          <div className="max-h-[45vh] overflow-auto">
            {kritikListe.length === 0 ? <Bos metin="Kritik seviyeler satış hızıyla uyumlu 👍" /> : (
              <table className="tbl">
                <thead><tr><th className="w-8"><input type="checkbox" checked={kritikSec.size > 0 && kritikSec.size === kritikListe.length} onChange={(e) => setKritikSec(e.target.checked ? new Set(kritikListe.map((x) => x.u.id)) : new Set())} /></th><th>Ürün</th><th>Durum</th><th className="text-right">90 gün satış</th><th className="text-right">Stok</th><th className="text-right">Mevcut kritik</th><th className="text-right">Önerilen</th><th></th></tr></thead>
                <tbody>{kritikListe.slice(0, 400).map((x) => (
                  <tr key={x.u.id}>
                    <td><input type="checkbox" checked={kritikSec.has(x.u.id)} onChange={() => { const s = new Set(kritikSec); if (s.has(x.u.id)) s.delete(x.u.id); else s.add(x.u.id); setKritikSec(s); }} /></td>
                    <td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka, x.u.kategori].filter(Boolean).join(' · ')}</div></td>
                    <td><span className={`rozet ${TIP[x.tip][1]}`}>{TIP[x.tip][0]}</span></td>
                    <td className="text-right">{sayi(x.s)}</td>
                    <td className="text-right text-slate-500">{sayi(x.u.stok)}</td>
                    <td className="text-right">{x.m || '—'}</td>
                    <td className="text-right font-semibold">{x.o || '0 (kaldır)'}</td>
                    <td className="text-right"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => kritikUygula([x])}>Uygula</button></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div className="mb-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span><b>Kesin alınacak</b>: son 60 günde satılmış, son 6 ayda en az 3 ayrı faturada ve 2 farklı müşteriye, en az 3 ayda (ya da son 3 ayın 2'sinde) satılmış ve stoğu hedefe yetmeyen ürün; stokta yeterli muadili varsa ve ölü siparişler bu listeye girmez. Tek seferlik, tek müşterilik satışlar "Kontrol edilecekler"de kalır. Önerilen adet = son {gunSec} günün günlük satışı × {hedefGun} gün − mevcut stok − yoldaki sipariş ({gun} günlük veriyle). <b>Öncelik</b> = aylık satış adedi × birim kâr × aciliyet (stok bittiyse ×3, 7 günden az yetiyorsa ×2); bütçe girilirse önceliği yüksek kalemler bütçe dolana kadar seçilir, kalanlar "bütçe dışı" görünür. <b>Ölü sipariş</b>: kritik seviyesi tanımlı ama 90 gündür hiç satılmamış ürünler; sipariş adedi 0 gelir. "Sipariş verildi" ile kaydedilen kalemler mal gelene kadar "yolda" görünür ve tekrar önerilmez. Mevsime göre ayar açıkken akü, antifriz, klima, silecek gibi ürünlerde satış hızı gelecek ayın talebine göre artırılır/azaltılır. Tedarikçi: son 6 ayda en ucuza alınan firma. Kritik seviye "rafta en az bu kadar olsun" demektir (BizimHesap'a yazılmaz). Dönemde tek kez satılanlar (kritik seviyesi yoksa) ve işçilik kalemleri önerilmez; stokta muadili yeterince olan bitmiş ürünlerin adedi 0 gelir.</span>
      </div>
      {grupla && secili.length > 0 && (
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gruplar.map(([ad, l]) => (
            <div key={ad} className="card p-4">
              <div className="mb-2 flex items-center justify-between gap-2"><b className="truncate">{ad}</b><span className="text-xs text-slate-500">{l.length} kalem{maliyetGor ? ` · ${para(l.reduce((t, x) => t + adet(x) * (ted.get(x.u.id)?.ucuz.fiyat ?? x.u.alis_fiyati), 0))}` : ''}</span></div>
              <ul className="mb-3 max-h-40 space-y-0.5 overflow-auto text-xs">{l.map((x) => <li key={x.u.id} className="flex justify-between gap-2"><span className="truncate">{x.u.ad}</span><b className="shrink-0">{sayi(adet(x))}</b></li>)}</ul>
              <div className="flex gap-2">
                <a className="btn-ghost flex-1" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(tedMetin(ad, l))}`}><MessageCircle size={15} /> WhatsApp</a>
                {duzenle && <button className="btn-ghost flex-1" onClick={() => siparisVer(l)}><PackageCheck size={15} /> Sipariş verildi</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {guven === 'kesin' && gorunum === 'depo' ? <DepoKesinListe depolar={depoKesin} q={q} setQ={setQ} acik={acik} firma={db.ayarlar.firma_adi} maliyetGor={maliyetGor} tedAd={(u) => ted.get(u.id)?.ucuz.ad ?? null} ted={ted} /> :
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-xs" placeholder="Ürün, kod, marka…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="inp w-40" value={marka} onChange={(e) => setMarka(e.target.value)}><option value="">Tüm markalar</option>{markalar.map((m) => <option key={m}>{m}</option>)}</select>
          <select className="inp w-40" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Tüm kategoriler</option>{kategoriler.map((m) => <option key={m}>{m}</option>)}</select>
          <select className="inp w-44" value={gunSec} onChange={(e) => setGunSec(Number(e.target.value))}><option value={30}>Satış hızı: son 30 gün</option><option value={90}>Satış hızı: son 90 gün</option><option value={7}>Satış hızı: son 7 gün</option></select>
          <select className="inp w-40" value={sirala} onChange={(e) => setSirala(e.target.value as 'oncelik' | 'yeter')}><option value="oncelik">Sıra: önceliğe göre</option><option value="yeter">Sıra: kaç gün yeter</option></select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={mevsimAcik} onChange={(e) => setMevsimAcik(e.target.checked)} /> Mevsime göre</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={grupla} onChange={(e) => setGrupla(e.target.checked)} /> <Truck size={14} /> Tedarikçiye göre grupla</label>
          <span className="ml-auto text-xs text-slate-500">{liste.length} ürün</span>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Alınması gereken ürün görünmüyor. Satış verisi biriktikçe veya kritik seviye tanımladıkça liste dolar." /> : (
            <table className="tbl">
              <thead><tr><th className="w-8"><input type="checkbox" checked={cikar.size === 0} onChange={(e) => setCikar(e.target.checked ? new Set() : new Set(liste.map((x) => x.u.id)))} /></th><th>Ürün</th><th className="text-right">Stok</th><th className="w-24 text-right">Kritik</th><th className="text-right">Son {gunSec} gün</th><th className="text-right">Yeter</th>{maliyetGor && <th className="text-right">Alış</th>}<th className="w-28 text-right">Sipariş</th></tr></thead>
              <tbody>{liste.map((x) => { const disari = cikar.has(x.u.id) || butceDisi.has(x.u.id); const ko = kritikOneri(x.u, x.satilan90); return (
                <tr key={x.u.id} className={disari ? 'opacity-40' : ''}>
                  <td><input type="checkbox" checked={!cikar.has(x.u.id)} onChange={() => { const s = new Set(cikar); if (s.has(x.u.id)) s.delete(x.u.id); else s.add(x.u.id); setCikar(s); }} /></td>
                  <td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka].filter(Boolean).join(' · ')}
                    {x.mevsim && <span className={`ml-1.5 rozet ${x.mevsim.katsayi > 1 ? 'bg-sky-50 text-sky-700' : 'bg-orange-50 text-orange-700'}`} title={`${x.mevsim.ad}: gelecek ay talep bu aya göre ×${x.mevsim.katsayi}`}>{x.mevsim.katsayi > 1 ? <Snowflake size={11} className="mr-0.5" /> : <Sun size={11} className="mr-0.5" />}{x.mevsim.ad} {x.mevsim.katsayi > 1 ? '↑' : '↓'}%{Math.round(Math.abs(x.mevsim.katsayi - 1) * 100)}</span>}
                    {ted.get(x.u.id) && <span className="ml-1.5 text-slate-400">· {ted.get(x.u.id)!.ucuz.ad}{maliyetGor ? ` ${para(ted.get(x.u.id)!.ucuz.fiyat)}` : ''}{ted.get(x.u.id)!.secenek > 1 ? ` (${ted.get(x.u.id)!.secenek} tedarikçi)` : ''}</span>}
                    <PahaliRozet t={ted.get(x.u.id)} maliyet={maliyetGor} />
                    {x.u.stok <= 0 && (() => { const m = stoktakiMuadiller(db, x.u); return m.length ? <span className="ml-1.5 rozet bg-emerald-50 text-emerald-700" title="BizimHesap etiketindeki OEM kodlarına göre">muadili stokta: {muadilMetin(m.slice(0, 2))}</span> : null; })()}
                    {x.kesin && x.duzen && <span className="ml-1.5 rozet bg-emerald-600 text-white" title={`Son 6 ayın ${x.duzen.ay}'${x.duzen.ay === 1 ? 'in' : 'sı'}nda, ${x.duzen.belge} ayrı faturada, ${x.duzen.musteri} farklı müşteriye satıldı`}>KESİN · {x.duzen.ay}/6 ay · {x.duzen.musteri} müşteri</span>}
                    {!x.kesin && x.duzen && guven !== 'kesin' && <span className="ml-1.5 text-[11px] text-slate-400" title="Son 6 ayda">{x.duzen.belge} fatura · {x.duzen.musteri} müşteri · {x.duzen.ay}/6 ay</span>}
                    <span className={`ml-1.5 rozet ${x.neden === 'kritik' ? 'bg-amber-100 text-amber-800' : x.neden === 'bitti' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{x.neden === 'kritik' ? 'kritik seviye' : x.neden === 'bitti' ? 'stok bitti' : 'azalıyor'}</span>
                    {x.yolda > 0 && <span className="ml-1.5 rozet bg-sky-100 text-sky-800" title={`Verildi: ${tarih(acik.get(x.u.id)?.ilk)}`}><Truck size={11} className="mr-0.5" />yolda {sayi(x.yolda)}</span>}
                    {x.olu && <span className="ml-1.5 rozet bg-red-100 text-red-700" title="Kritik seviyesi tanımlı ama 90 gündür hiç satılmadı">90 gündür satılmadı</span>}
                    {butceDisi.has(x.u.id) && <span className="ml-1.5 rozet bg-slate-200 text-slate-600">bütçe dışı</span>}
                  </div></td>
                  <td className={`text-right font-medium ${x.u.stok <= 0 ? 'text-red-600' : 'text-amber-700'}`}>{sayi(x.u.stok)}</td>
                  <td>{duzenle ? <input className="inp py-1 text-right" defaultValue={x.u.kritik_stok || ''} placeholder="—" key={x.u.kritik_stok} onBlur={(e) => kritikKaydet(x.u, e.target.value)} /> : <div className="text-right">{x.u.kritik_stok || '—'}</div>}
                    {duzenle && ko !== (x.u.kritik_stok || 0) && <button className="mt-0.5 block w-full text-right text-[10px] text-marka-600 hover:underline" title="90 günlük satış hızına göre; uygulamak için tıklayın" onClick={() => kritikKaydet(x.u, String(ko))}>öneri: {ko || 'kaldır'}</button>}</td>
                  <td className="text-right text-slate-500">{sayi(x.satilan)}</td>
                  <td className={`text-right ${x.yeter < 7 ? 'text-red-600' : 'text-slate-500'}`}>{Number.isFinite(x.yeter) ? `${Math.round(x.yeter)} gün` : '—'}</td>
                  {maliyetGor && <td className="text-right text-slate-500">{para(x.u.alis_fiyati)}</td>}
                  <td><input className="inp py-1 text-right" value={miktar[x.u.id] ?? String(varsayilan(x))} onChange={(e) => setMiktar({ ...miktar, [x.u.id]: e.target.value })} onFocus={(e) => e.target.select()} /></td>
                </tr>); })}</tbody>
            </table>
          )}
        </div>
      </div>}
    </div>
  );
}

const kisaDepo = (s: string) => s.replace(/ DEPO(SU)?$/i, '');

/** Kesin alınacaklar, her depo için ayrı: o deponun 60 günlük satışına göre ihtiyaç; diğer depodaki fazlası transfer olarak ayrılır */
function DepoKesinListe({ depolar, q, setQ, acik, firma, maliyetGor, tedAd, ted }: {
  depolar: { anahtar: string; ad: string; satirlar: DepoSiparisSatir[] }[]; q: string; setQ: (s: string) => void; acik: Map<string, AcikSiparis>;
  firma: string; maliyetGor: boolean; tedAd: (u: Urun) => string | null; ted: ReturnType<typeof urunTedarikcileri>;
}) {
  const filtre = (l: DepoSiparisSatir[]) => l.filter((x) => ara(q, x.u.ad, x.u.kod, x.u.marka));
  const metin = (ad: string, l: DepoSiparisSatir[]) => {
    const sip = l.filter((x) => x.siparis > 0), tr = l.filter((x) => x.transfer > 0);
    return [`${firma} — ${kisaDepo(ad)} kesin alınacaklar (${tarih(new Date().toISOString())})`, '',
      ...(sip.length ? ['SİPARİŞ:', ...sip.map((x) => `• ${x.u.ad}${x.u.marka ? ` (${x.u.marka})` : ''}${x.u.kod ? ` [${x.u.kod}]` : ''} — ${sayi(x.siparis)} ${x.u.birim}`), ''] : []),
      ...(tr.length ? ['DİĞER DEPODAN TRANSFER:', ...tr.map((x) => `• ${x.u.ad}${x.u.kod ? ` [${x.u.kod}]` : ''} — ${sayi(x.transfer)} ${x.u.birim} ← ${x.digerStok.filter((o) => o.fazla > 0).map((o) => kisaDepo(o.ad)).join(', ')}`)] : [])].join('\n');
  };
  const bas = (ad: string, l: DepoSiparisSatir[]) => yazdir(
    <div className="p-4 text-[11px]">
      <div className="mb-3 flex justify-between border-b-2 border-black pb-2"><b className="text-base">{firma}</b><div className="text-right"><b>{kisaDepo(ad)} — KESİN ALINACAKLAR</b><div>{tarih(new Date().toISOString())}</div></div></div>
      <table className="w-full border-collapse"><thead><tr className="border-b border-black text-left"><th>Kod</th><th>Ürün</th><th>Marka</th><th className="text-right">Depo stok</th><th className="text-right">Sipariş</th><th className="text-right">Transfer</th></tr></thead>
        <tbody>{l.map((x) => <tr key={x.u.id} className="border-b"><td>{x.u.kod}</td><td>{x.u.ad}</td><td>{x.u.marka}</td><td className="text-right">{sayi(x.stok)}</td><td className="text-right font-bold">{x.siparis ? `${sayi(x.siparis)} ${x.u.birim}` : ''}</td><td className="text-right">{x.transfer ? sayi(x.transfer) : ''}</td></tr>)}</tbody></table>
    </div>);
  if (!depolar.length || depolar.every((d) => !d.satirlar.length)) return <div className="card"><Bos metin="Şu an hiçbir depoda kesin alınacak ürün yok 👍" /></div>;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2"><input className="inp max-w-xs" placeholder="Ürün, kod, marka…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-xs text-slate-500">Her deponun kendi son 60 günlük satışına göre · diğer depoda fazlası olan kısım transfer olarak ayrılır</span></div>
      <div className="grid gap-4 xl:grid-cols-2">
        {depolar.map((dp) => { const l = filtre(dp.satirlar); const sipSay = l.filter((x) => x.siparis > 0).length; const trSay = l.filter((x) => x.transfer > 0).length;
          const tutar = l.reduce((t, x) => t + x.siparis * x.u.alis_fiyati, 0);
          return (
            <div key={dp.anahtar} className="card">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
                <b className="text-base">{kisaDepo(dp.ad)}</b>
                <span className="rozet bg-emerald-600 text-white">{sipSay} sipariş</span>
                {trSay > 0 && <span className="rozet bg-sky-100 text-sky-800">{trSay} transfer</span>}
                {maliyetGor && tutar > 0 && <span className="text-xs text-slate-500">≈ {para(tutar)}</span>}
                <div className="ml-auto flex gap-1">
                  <button className="btn-ghost px-2 py-1 text-xs" disabled={!l.length} onClick={() => bas(dp.ad, l)}><Printer size={14} /> Yazdır</button>
                  <a className={`btn-ghost px-2 py-1 text-xs ${l.length ? '' : 'pointer-events-none opacity-50'}`} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(metin(dp.ad, l))}`}><MessageCircle size={14} /> WhatsApp</a>
                </div>
              </div>
              {l.length === 0 ? <Bos metin="Bu depoda kesin alınacak yok." /> : (
                <div className="max-h-[60vh] overflow-auto">
                  <table className="tbl">
                    <thead><tr><th>Ürün</th><th className="text-right">Depo stok</th><th className="text-right">60 gün satış</th><th className="text-right">Sipariş</th><th className="text-right">Transfer</th></tr></thead>
                    <tbody>{l.map((x) => { const yolda = acik.get(x.u.id)?.kalan ?? 0; const t = tedAd(x.u); return (
                      <tr key={x.u.id}>
                        <td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div>
                          <div className="text-xs text-slate-500">{[x.u.kod, x.u.marka, t].filter(Boolean).join(' · ')}
                            {x.stok <= 0 && <span className="ml-1.5 rozet bg-red-50 text-red-600">bu depoda bitti</span>}
                            {yolda > 0 && <span className="ml-1.5 rozet bg-sky-100 text-sky-800"><Truck size={11} className="mr-0.5" />yolda {sayi(yolda)}</span>}<PahaliRozet t={ted.get(x.u.id)} maliyet={maliyetGor} /></div></td>
                        <td className={`text-right font-medium ${x.stok <= 0 ? 'text-red-600' : 'text-amber-700'}`}>{sayi(x.stok)}</td>
                        <td className="text-right text-slate-500">{sayi(x.satilan)}</td>
                        <td className="text-right text-base font-bold text-emerald-700">{x.siparis ? sayi(x.siparis) : <span className="text-sm font-normal text-slate-300">—</span>}</td>
                        <td className="text-right text-xs text-sky-700" title={x.digerStok.map((o) => `${kisaDepo(o.ad)}: stok ${sayi(o.stok)}, fazla ${sayi(o.fazla)}`).join(' · ')}>{x.transfer ? <>{sayi(x.transfer)} ← {x.digerStok.filter((o) => o.fazla > 0).map((o) => kisaDepo(o.ad)).join(', ')}</> : ''}</td>
                      </tr>); })}</tbody>
                  </table>
                </div>)}
            </div>); })}
      </div>
    </div>
  );
}
