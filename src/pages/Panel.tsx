import { useMemo } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, CalendarClock, Info, Lightbulb, Sun, TrendingUp, Users, Wallet } from 'lucide-react';
import type { Sayfa } from '../App';
import { useStore } from '../lib/store';
import { gunu, para, sayi, tarih, tarihSaat } from '../lib/format';
import { birimKar, gelirTablosu, gunlukSeri, hareketTutar, toplamlar, urunOzetleri, type Donem } from '../lib/analiz';
import { donemOzet, satirKar } from '../lib/analiz2';
import { aySonuTahmini, onerileriCikar } from '../lib/oneriler';
import type { DB } from '../lib/types';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { CubukGrafik, GrupluCubuk, PayCubugu, YatayListe } from '../components/grafik';
import { Degisim } from '../components/Degisim';
import { Kpi, SayfaBaslik } from '../components/ui';
import { tahsilatDisi } from '../lib/tahsilat';
import { gecisCarisi } from '../lib/analiz2';

const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const gunOnce = (n: number) => gunu(new Date(Date.now() - n * 864e5));

/** Bir günün satışı; saatSinir verilirse o saate kadarki kısım (bugünle adil karşılaştırma için) */
function gunSatis(db: DB, gun: string, saatSinir?: string) {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  let ciro = 0, kar = 0; const fis = new Set<string>();
  for (const h of db.hareketler) {
    if (h.yok_say || h.tur !== 'satis' || gunu(h.tarih) !== gun) continue;
    if (saatSinir && h.saat && h.saat.slice(0, 5) > saatSinir) continue;
    const s = satirKar(h, db, urun); ciro += s.ciro; kar += s.kar; fis.add(h.belge_guid ?? h.tarih);
  }
  return { ciro, kar, fis: fis.size };
}

export default function Panel({ git }: { git: (s: Sayfa) => void }) {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const a = db.ayarlar;

  const stok = useMemo(() => {
    let maliyet = 0, satis = 0, kar = 0, kalem = 0, biten = 0, kritik = 0, eksi = 0, maliyetsiz = 0;
    const kat = new Map<string, number>();
    for (const u of db.urunler) {
      if (!u.aktif) continue;
      if (u.stok > 0) {
        kalem++; satis += u.stok * u.satis_fiyati;
        if (u.alis_fiyati > 0) { maliyet += u.stok * u.alis_fiyati; kar += u.stok * birimKar(u, a).kar; } else maliyetsiz++;
        const k = u.kategori || 'Kategorisiz'; kat.set(k, (kat.get(k) ?? 0) + u.stok * (u.alis_fiyati || 0));
      }
      if (u.stok === 0) biten++;
      if (u.stok < 0) eksi++;
      if (u.kritik_stok > 0 && u.stok <= u.kritik_stok) kritik++;
    }
    return { maliyet, satis, kar, kalem, biten, kritik, eksi, maliyetsiz, kat: [...kat.entries()].sort((x, y) => y[1] - x[1]) };
  }, [db.urunler, a]);

  const t = useMemo(() => toplamlar(db, d), [db, d]);
  const g = useMemo(() => gelirTablosu(db, d), [db, d]);
  const dz = useMemo(() => donemOzet(db, d), [db, d]);
  const seri = useMemo(() => gunlukSeri(db, d, (h) => h.miktar * h.satis_fiyati), [db, d]);
  const enKarli = useMemo(() => [...urunOzetleri(db, d).values()].filter((x) => x.satilan > 0).sort((x, y) => y.kar - x.kar), [db, d]);
  const oneriler = useMemo(() => onerileriCikar(db), [db]);
  const ay = useMemo(() => aySonuTahmini(db), [db]);

  // bugün / dün / geçen hafta aynı gün (aynı saate kadar)
  const bugun = useMemo(() => {
    const saat = new Date().toTimeString().slice(0, 5);
    return { b: gunSatis(db, gunu()), dun: gunSatis(db, gunOnce(1), saat), hafta: gunSatis(db, gunOnce(7), saat), dunTum: gunSatis(db, gunOnce(1)), saat };
  }, [db]);

  // aylık trend: son 8 ay, KDV hariç satış / brüt kâr / gider
  const aylik = useMemo(() => {
    const ilk = db.bh_durum?.rapor_ilk; const l: { etiket: string; alt: string; degerler: number[] }[] = [];
    const simdi = new Date();
    for (let i = 7; i >= 0; i--) {
      const bas = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1); const bit = new Date(simdi.getFullYear(), simdi.getMonth() - i + 1, 0);
      const dd: Donem = { bas: gunu(bas), bit: gunu(bit) < gunu() ? gunu(bit) : gunu() };
      if (ilk && dd.bit < ilk) continue;
      const x = gelirTablosu(db, dd);
      l.push({ etiket: AY[bas.getMonth()], alt: `${AY[bas.getMonth()]} ${bas.getFullYear()}${i === 0 ? ' (devam ediyor)' : ''}`, degerler: [x.urunSatis + x.hizmetGeliri + x.maliyetsizUrun + x.gecis, x.brutKar, x.masraf] });
    }
    while (l.length > 1 && l[0].degerler.every((v) => v === 0)) l.shift();
    return l;
  }, [db]);

  const alacak = db.cariler.filter((c) => c.tur === 'musteri' && c.bakiye > 0 && !gecisCarisi(db, c.bh_id) && !gecisCarisi(db, c.ad)).reduce((s, c) => s + c.bakiye, 0);
  const tedarikciBakiye = db.cariler.filter((c) => c.tur === 'tedarikci').reduce((s, c) => s + c.bakiye, 0);
  const vadesiGecen = db.vadesi_gecen.reduce((s, v) => s + (v.tutar > 0 && !tahsilatDisi(db, v.cari) ? v.tutar : 0), 0);
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const son = db.hareketler.filter((h) => !h.yok_say).slice(0, 10);
  const zararli = db.urunler.filter((u) => u.aktif && u.alis_fiyati > 0 && u.satis_fiyati > 0 && birimKar(u, a).kar < 0).length;
  const takip = db.bh_durum?.takip_baslangic;
  const takipGun = takip ? Math.floor((Date.now() - new Date(takip).getTime()) / 864e5) : null;
  const marj = g.urunSatis > 0 ? (g.urunKar / g.urunSatis) * 100 : 0;
  const hedef = a.hedef_ciro || 0;
  const enCokSatan = [...dz.urn.values()].sort((x, y) => y.ciro - x.ciro);
  const kategoriSatis = [...dz.kat.entries()].sort((x, y) => y[1] - x[1]);
  const onemli = oneriler.filter((x) => x.oncelik <= 2).slice(0, 5);

  const kucukKiyas = (etiket: string, simdi: number, once: number) => (
    <div className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-500">{etiket}</span>{once ? <Degisim simdi={simdi} once={once} etiket="" /> : <span className="text-slate-400">veri yok</span>}</div>
  );

  return (
    <div>
      <SayfaBaslik baslik="Genel Bakış" alt={db.bh_durum?.son_esitleme ? `BizimHesap ile son eşitleme: ${tarihSaat(db.bh_durum.son_esitleme)}` : 'BizimHesap verileriyle canlı analiz'} />
      {!db.bh_durum?.rapor_son && takipGun !== null && takipGun < 14 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-200">
          <Info size={18} className="mt-0.5 shrink-0" />
          <div>Satış/alış takibi <b>{tarih(takip)}</b> tarihinde başladı. Satış, kâr ve ABC analizleri günler geçtikçe dolacak.</div>
        </div>
      )}

      {/* ---------- BUGÜN · AY SONU · UYARILAR ---------- */}
      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sun size={16} className="text-amber-500" /> Bugün <span className="font-normal text-slate-500">· saat {bugun.saat}</span></div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
            <div className="min-w-0"><div className="text-xs text-slate-500">Satış</div><div className="truncate text-lg font-bold">{para(bugun.b.ciro)}</div></div>
            <div className="min-w-0"><div className="text-xs text-slate-500">Brüt kâr</div><div className="truncate text-lg font-bold">{para(bugun.b.kar)}</div></div>
            <div><div className="text-xs text-slate-500">Fiş</div><div className="truncate text-lg font-bold">{sayi(bugun.b.fis)}</div><div className="text-[11px] text-slate-500">ort. {para(bugun.b.fis ? bugun.b.ciro / bugun.b.fis : 0)}</div></div>
          </div>
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
            {kucukKiyas('Dünün aynı saatine göre', bugun.b.ciro, bugun.dun.ciro)}
            {kucukKiyas('Geçen haftanın aynı günü, aynı saate göre', bugun.b.ciro, bugun.hafta.ciro)}
            <div className="flex justify-between text-xs text-slate-500"><span>Dün gün sonu</span><span>{para(bugun.dunTum.ciro)} · {bugun.dunTum.fis} fiş</span></div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Fatura satırları "faturaları güncelle" ile gelir; arada stok değişiminden tahmin edilir.</p>
        </div>

        <button className="card flex flex-col justify-start p-4 text-left transition hover:border-marka-500" onClick={() => git('aysonu')}>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} className="text-sky-600" /> Bu ay <span className="font-normal text-slate-500">· {ay.gecen}. gün, {ay.kalan} gün kaldı</span><ArrowRight size={14} className="ml-auto text-slate-400" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-xs text-slate-500">Satış (şu ana kadar)</div><div className="text-xl font-bold">{para(ay.ciro)}</div>{ay.gecenAyAyni != null && <Degisim simdi={ay.ciro} once={ay.gecenAyAyni} etiket="geçen aya göre" />}</div>
            <div><div className="text-xs text-slate-500">Ay sonu tahmini</div><div className="text-xl font-bold">{para(ay.tahminCiro)}</div></div>
          </div>
          {hedef > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Hedef {para(hedef)}</span><b>%{((ay.ciro / hedef) * 100).toFixed(0)}</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-marka-500" style={{ width: `${Math.min(100, (ay.ciro / hedef) * 100)}%` }} /></div>
            </div>
          )}
          <div className={`mt-3 rounded-lg px-2.5 py-1.5 text-xs font-medium ${ay.tahminNet >= 0 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200'}`}>
            {ay.tahminNet >= 0 ? `Bu hızla ay ≈ ${para(ay.tahminNet)} kârla kapanır` : `Bu hızla ay ≈ ${para(-ay.tahminNet)} zararla kapanır`}
          </div>
        </button>

        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Lightbulb size={16} className="text-amber-500" /> Uyarılar & öneriler
            <button className="ml-auto text-xs font-normal text-marka-600 hover:underline" onClick={() => git('oneriler')}>Tümü ({oneriler.length}) →</button></div>
          <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
            {stok.kritik > 0 && <button onClick={() => git('alinacaklar')} className="rozet bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">⚠ {stok.kritik} kritik stok</button>}
            {vadesiGecen > 0 && <button onClick={() => git('tahsilat')} className="rozet bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">⏰ {para(vadesiGecen)} vadesi geçmiş</button>}
            {stok.eksi > 0 && <button onClick={() => git('urunler')} className="rozet bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{stok.eksi} eksi stok</button>}
            {zararli > 0 && <button onClick={() => git('fiyat')} className="rozet bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">{zararli} maliyet altı fiyat</button>}
          </div>
          {onemli.length === 0 ? <div className="py-4 text-center text-sm text-slate-400">Şu an önemli bir uyarı yok.</div> : (
            <ul className="space-y-1">{onemli.map((o) => (
              <li key={o.id}><button onClick={() => git(o.sayfa ?? 'oneriler')} className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${o.oncelik === 1 ? 'bg-red-500' : 'bg-amber-500'}`} title={o.oncelik === 1 ? 'Önemli' : 'Orta'} />
                <span className="min-w-0 flex-1 leading-snug">{o.baslik}</span>
                {o.etki ? <span className={`shrink-0 text-xs font-semibold ${o.etkiTur === 'kar' ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'}`}>{para(o.etki)}</span> : null}
              </button></li>
            ))}</ul>
          )}
        </div>
      </div>

      {/* ---------- STOK ---------- */}
      <h2 className="mb-2 text-sm font-semibold text-slate-500">Stok durumu (şu an)</h2>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket={`Stok maliyeti (${a.alis_kdv_haric ? 'KDV hariç' : 'KDV dahil'})`} deger={para(stok.maliyet)} alt={`${sayi(stok.kalem)} çeşit ürün stokta${stok.maliyetsiz ? ` · ${stok.maliyetsiz} üründe alış fiyatı yok` : ''}`} ikon={<Boxes size={16} />} />
        <Kpi etiket="Stoğun satış değeri" deger={para(stok.satis)} alt="KDV dahil liste fiyatıyla" renk="blue" />
        <Kpi etiket="Stoktaki potansiyel kâr (KDV hariç)" deger={para(stok.kar)} alt={stok.maliyet > 0 ? `Stok hepsi satılırsa · maliyetin %${((stok.kar / stok.maliyet) * 100).toFixed(0)} üstü` : undefined} renk="green" ikon={<TrendingUp size={16} />} />
        <button className="text-left" onClick={() => git('alinacaklar')}><Kpi etiket="Biten / kritik stok" deger={`${sayi(stok.biten)} / ${sayi(stok.kritik)}`} alt={`${stok.eksi ? `${stok.eksi} üründe eksi stok · ` : ''}${zararli ? `${zararli} ürün maliyetinin altında fiyatlı` : 'Listelemek için tıklayın'}`} renk={stok.kritik || zararli ? 'amber' : 'slate'} ikon={<AlertTriangle size={16} />} /></button>
      </div>

      {/* ---------- AYLIK TREND ---------- */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-1 flex items-center justify-between"><h3 className="font-semibold">Aylık satış, brüt kâr ve gider</h3><span className="text-xs text-slate-500">KDV hariç · gider hesap dışı bırakılanlar hariç</span></div>
          <GrupluCubuk veri={aylik} seriler={[{ ad: 'Satış', renk: 'var(--seri-1)' }, { ad: 'Brüt kâr', renk: 'var(--seri-2)' }, { ad: 'Gider', renk: 'var(--seri-3)' }]} bicim={para} yukseklik={240} bos="Henüz aylık veri yok" />
          {aylik.length > 0 && (() => { const x = aylik[aylik.length - 1].degerler; const o = aylik.length > 1 ? aylik[aylik.length - 2].degerler : null;
            return <p className="mt-2 text-xs text-slate-500">Bu ay şu ana kadar brüt kâr − gider = <b className={x[1] - x[2] >= 0 ? 'text-emerald-700' : 'text-red-600'}>{para(x[1] - x[2])}</b>{o ? <> · geçen ay <b className={o[1] - o[2] >= 0 ? 'text-emerald-700' : 'text-red-600'}>{para(o[1] - o[2])}</b></> : null}</p>; })()}
        </div>
        <div className="card p-4">
          <h3 className="mb-1 font-semibold">Brüt kâr nereden geliyor?</h3>
          <p className="mb-3 text-xs text-slate-500">Seçili dönem · KDV hariç</p>
          <PayCubugu bicim={para} parcalar={[{ ad: 'Ürün satışı', deger: g.urunKar, renk: 'var(--seri-1)' }, { ad: 'Hizmet / işçilik', deger: g.hizmetKar, renk: 'var(--seri-2)' }]} />
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <div><div className="text-slate-500">Ürün marjı</div><div className="text-base font-bold">%{marj.toFixed(1)}</div></div>
            <div><div className="text-slate-500">Ortalama fiş</div><div className="text-base font-bold">{para(dz.ortSepet)}</div></div>
            <div><div className="text-slate-500">Fiş sayısı</div><div className="text-base font-bold">{sayi(dz.belge)}</div></div>
            <div><div className="text-slate-500">Cari müşteri</div><div className="text-base font-bold">{sayi(dz.musteri)}</div></div>
          </div>
        </div>
      </div>

      {/* ---------- DÖNEM ---------- */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-500">Seçili dönem</h2>
        <DonemSecici d={d} sec={setD} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button className="text-left" onClick={() => git('hareketler')}><Kpi etiket="Satış tutarı (KDV dahil)" deger={para(t.ciro)} alt={`${sayi(t.satilanAdet)} adet · ${dz.belge} fiş`} renk="green" ikon={<ArrowUpRight size={16} />} /></button>
        <button className="text-left" onClick={() => git('karzarar')}><Kpi etiket="Brüt kâr (ürün + hizmet)" deger={para(g.brutKar)} alt={`Ürün ${para(g.urunKar)} · hizmet ${para(g.hizmetKar)}`} renk={g.brutKar >= 0 ? 'green' : 'red'} ikon={<TrendingUp size={16} />} /></button>
        <button className="text-left" onClick={() => git('karzarar')}><Kpi etiket="Net kâr (gider sonrası)" deger={para(g.netKar)} alt={`Giderler ${para(g.masraf)} · alış ${para(t.alisTutar)}`} renk={g.netKar >= 0 ? 'green' : 'red'} ikon={<ArrowDownRight size={16} />} /></button>
        <button className="text-left" onClick={() => git('cariler')}><Kpi etiket="Müşteri alacakları" deger={para(alacak)} alt={`Tedarikçilere borç: ${para(-tedarikciBakiye)} · proje carisi hariç`} renk="amber" ikon={<Users size={16} />} /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Günlük satış tutarı</h3><span className="text-xs text-slate-500">KDV dahil</span></div>
          <CubukGrafik veri={seri.map((x) => ({ etiket: x.gun.slice(8, 10) + '.' + x.gun.slice(5, 7), deger: x.deger, alt: tarih(x.gun + 'T12:00') }))} bicim={para} yukseklik={260} bos="Bu dönemde satış hareketi yok" />
        </div>
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">Kategorilere göre satış</h3>
          <YatayListe veri={kategoriSatis.map(([ad, v]) => ({ ad, deger: v }))} bicim={para} limit={8} bos="Bu dönemde satış yok" />
          {kategoriSatis.length > 0 && <button className="mt-3 text-xs text-marka-600 hover:underline" onClick={() => git('satisanaliz')}>Satış analizi →</button>}
        </div>
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">En çok satan 10 ürün</h3>
          <YatayListe veri={enCokSatan.map((x) => ({ ad: x.ad, deger: x.ciro, alt: `${sayi(x.adet)} adet` }))} bicim={para} limit={10} renk="bg-sky-500" bos="Bu dönemde satış yok" />
        </div>
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">En çok kâr bırakanlar</h3>
          <YatayListe veri={enKarli.map((x) => ({ ad: x.urun.ad, deger: x.kar, alt: `${sayi(x.satilan)} adet · ${para(x.ciro)}` }))} bicim={para} limit={10} bos="Bu dönemde satış yok" />
          {enKarli.length > 0 && <button className="mt-3 text-xs text-marka-600 hover:underline" onClick={() => git('analiz')}>Tüm ürün analizi →</button>}
        </div>
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">Stok maliyeti — kategoriler</h3>
          <YatayListe veri={stok.kat.map(([ad, v]) => ({ ad, deger: v }))} bicim={para} limit={10} renk="bg-slate-400" />
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Wallet size={13} /> Toplam {para(stok.maliyet)}</div>
        </div>
        <div className="card p-4 lg:col-span-3">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Son hareketler</h3><button className="text-xs text-marka-600 hover:underline" onClick={() => git('hareketler')}>Tümü →</button></div>
          {son.length === 0 ? <div className="py-6 text-center text-sm text-slate-400">Henüz hareket yok.</div> : (
            <div className="overflow-x-auto"><table className="tbl"><tbody>{son.map((h) => {
              const u = urun.get(h.urun_id); const x = hareketTutar(h, a);
              return <tr key={h.id}>
                <td className="whitespace-nowrap text-slate-500">{gunu(h.tarih) === gunu() ? (h.saat?.slice(0, 5) ?? new Date(h.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })) : tarih(h.tarih)}</td>
                <td><span className={`rozet ${h.tur === 'satis' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{h.tur === 'satis' ? 'Satış' : 'Alış'}</span></td>
                <td className="max-w-xs truncate">{u?.ad ?? h.urun_ad ?? '—'}</td>
                <td className="max-w-[180px] truncate text-slate-500">{h.cari_ad ?? ''}</td>
                <td className="text-right">{sayi(h.miktar)}</td>
                <td className="text-right font-medium">{para(h.tur === 'satis' ? x.ciro : h.miktar * h.alis_fiyati)}</td>
              </tr>;
            })}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
