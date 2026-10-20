import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { donemde, birimKar, gelirTablosu, gunlukSeri, hareketTutar, urunOzetleri } from '../lib/analiz';
import { aylikSeri } from '../lib/analiz2';
import { gunu } from '../lib/format';
import { para, sayi, tarih } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { CubukGrafik } from '../components/grafik';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

type Grup = 'kategori' | 'marka';

export default function KarZarar() {
  const { db, calistir } = useStore();
  const [d, setD] = useDonem();
  const [grup, setGrup] = useState<Grup>('kategori');
  const a = db.ayarlar;
  const g = useMemo(() => gelirTablosu(db, d), [db, d]);
  const ozet = useMemo(() => [...urunOzetleri(db, d).values()].filter((x) => x.satilan > 0), [db, d]);
  const seri = useMemo(() => gunlukSeri(db, d, (h) => hareketTutar(h, a).kar), [db, d, a]);

  const gruplu = useMemo(() => {
    const m = new Map<string, { ad: string; ciro: number; ciroNet: number; kar: number; adet: number; urun: number }>();
    for (const x of ozet) {
      if (x.maliyet === 0) continue;
      const k = (grup === 'kategori' ? x.urun.kategori : x.urun.marka) || (grup === 'kategori' ? 'Kategorisiz' : 'Markasız');
      const r = m.get(k) ?? { ad: k, ciro: 0, ciroNet: 0, kar: 0, adet: 0, urun: 0 };
      r.ciro += x.ciro; r.ciroNet += x.ciroNet; r.kar += x.kar; r.adet += x.satilan; r.urun++; m.set(k, r);
    }
    return [...m.values()].sort((x, y) => y.kar - x.kar);
  }, [ozet, grup]);

  const zararEden = ozet.filter((x) => x.kar < -0.01).sort((x, y) => x.kar - y.kar);
  const altinda = db.urunler.filter((u) => u.aktif && u.alis_fiyati > 0 && u.satis_fiyati > 0 && birimKar(u, a).kar < 0);
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const fiyat = db.fiyat_gecmisi.filter((f) => donemde(f.tarih, d) && f.alis_yeni > f.alis_eski && f.satis_yeni <= f.satis_eski);
  const marj = (kar: number, ciro: number) => (ciro > 0 ? `%${((kar / ciro) * 100).toFixed(1)}` : '—');
  const masrafHaric = (anahtar: string, haric: boolean) => {
    const l = new Set(a.haric_masraf ?? []); if (haric) l.add(anahtar); else l.delete(anahtar);
    calistir(() => backend.ayarKaydet({ haric_masraf: [...l] }));
  };
  const masrafVar = db.masraflar.length > 0;
  const aylar = useMemo(() => aylikSeri(db), [db]);
  const buAy = gunu().slice(0, 7);
  const tamAylar = aylar.filter((x) => x.ay < buAy && x.ciro > 0).slice(-3);
  const ortGider = tamAylar.length ? tamAylar.reduce((t, x) => t + x.masraf, 0) / tamAylar.length : 0;
  const ortCiro = tamAylar.length ? tamAylar.reduce((t, x) => t + x.ciro, 0) / tamAylar.length : 0;
  const ortKar = tamAylar.length ? tamAylar.reduce((t, x) => t + x.kar, 0) / tamAylar.length : 0;
  const karOrani = ortCiro > 0 ? ortKar / ortCiro : 0;
  const basabas = karOrani > 0 ? ortGider / karOrani : 0;
  const donemSatis = g.urunSatis + g.hizmetGeliri + g.maliyetsizUrun + g.gecis;
  const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  return (
    <div>
      <SayfaBaslik baslik="Kâr / Zarar" alt="Ürün kârı + hizmet kârı − işletme giderleri = net kâr (KDV hariç)" />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Ürün brüt kârı" deger={para(g.urunKar)} alt={`Satış ${para(g.urunSatis)} · marj ${marj(g.urunKar, g.urunSatis)}`} renk={g.urunKar >= 0 ? 'green' : 'red'} />
        <Kpi etiket="Hizmet kârı" deger={para(g.hizmetKar)} alt={`Gelir ${para(g.hizmetGeliri)} − dış hizmet ${para(g.disHizmet)}`} renk={g.hizmetKar >= 0 ? 'green' : 'red'} />
        <Kpi etiket="İşletme giderleri" deger={para(g.masraf)} alt={masrafVar ? `${g.masrafGruplari.filter((x) => !x.haric).length} gider kalemi${g.haricMasraf ? ` · ${para(g.haricMasraf)} hariç tutuldu` : ''}` : 'Masraf verisi aktarılmadı'} renk="red" />
        <Kpi etiket="Net kâr" deger={para(g.netKar)} alt={`Toplam satışın ${marj(g.netKar, donemSatis)}'i`} renk={g.netKar >= 0 ? 'green' : 'red'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Gelir tablosu</h3>
          <div className="space-y-1 text-sm">
            <Satir l="Ürün satışları (KDV hariç)" v={g.urunSatis} />
            <Satir l="− Satılan malın maliyeti" v={-g.urunMaliyet} soluk />
            <Satir l="= Ürün brüt kârı" v={g.urunKar} kalin />
            <div className="h-2" />
            <Satir l="Hizmet / işçilik gelirleri" v={g.hizmetGeliri} />
            <Satir l="− Dışarıdan alınan hizmet ve stok dışı alışlar" v={-g.disHizmet} soluk />
            <Satir l="= Hizmet kârı" v={g.hizmetKar} kalin />
            <div className="h-2" />
            <Satir l="Brüt kâr (ürün + hizmet)" v={g.brutKar} kalin />
            <Satir l="− İşletme giderleri (BizimHesap masrafları)" v={-g.masraf} soluk />
            <div className="border-t border-slate-200 pt-2 dark:border-slate-700"><Satir l="= Net kâr" v={g.netKar} kalin buyuk /></div>
          </div>
          <div className="mt-4 space-y-1 text-xs text-slate-500">
            {g.gecis > 0 && <div>• Araç alım/satım gibi geçiş satışları ({para(g.gecis)}: {g.gecisListe.slice(0, 3).map((x) => x.ad).join(', ')}) satış toplamında var ama hizmet gelirine ve kâra katılmadı.</div>}
            {g.maliyetsizUrun > 0 && <div>• Maliyeti girilmemiş ürün satışları ({para(g.maliyetsizUrun)}) kâra katılmadı; listesi aşağıda. BizimHesap'ta alış fiyatlarını girerseniz hesaba girer.</div>}
            {g.ciftKayit > 0 && <div>• {para(g.ciftKayit)} tutarındaki stok dışı alış, aynı tutarla masraf olarak da girildiği için iki kez sayılmadı.</div>}
            <div>• Masraf tutarları BizimHesap'taki toplamlardır. Ürün ve hizmet tutarları fatura raporundan, rapor aktarılmamış günlerde stok değişiminden gelir.</div>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="mb-1 font-semibold">İşletme giderleri</h3>
          <p className="mb-2 text-xs text-slate-500">Kuruluş, demirbaş gibi tek seferlik kalemleri işareti kaldırarak net kârdan çıkarabilirsiniz.</p>
          {!masrafVar ? <div className="text-sm text-slate-400">Masraf verisi henüz aktarılmadı.</div> : g.masrafGruplari.length === 0 ? <div className="text-sm text-slate-400">Bu dönemde masraf yok.</div> : (
            <div className="max-h-[380px] space-y-1 overflow-auto">
              {g.masrafGruplari.map((m) => (
                <label key={m.anahtar} className={`flex items-center gap-2 text-sm ${m.haric ? 'opacity-40' : ''}`}>
                  <input type="checkbox" checked={!m.haric} onChange={(e) => masrafHaric(m.anahtar, !e.target.checked)} />
                  <span className="min-w-0 flex-1 truncate" title={`${m.ana} / ${m.alt}`}>{m.alt} <span className="text-xs text-slate-400">· {m.ana} · {m.adet}</span></span>
                  <b className="shrink-0">{para(m.tutar)}</b>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-1 font-semibold">Başabaş noktası</h3>
          <p className="mb-3 text-xs text-slate-500">Son {tamAylar.length} tam ayın ortalamasıyla ({tamAylar.map((x) => AY[Number(x.ay.slice(5, 7)) - 1]).join(', ')}) · hariç tuttuğunuz gider kalemleri sayılmaz</p>
          {tamAylar.length === 0 ? <div className="text-sm text-slate-400">En az bir tam ay verisi gerekiyor.</div> : (
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500">Aylık ortalama gider</div><div className="text-lg font-bold">{para(ortGider)}</div></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500">Satışın kâra dönen payı</div><div className="text-lg font-bold">%{(karOrani * 100).toFixed(1)}</div><div className="text-[11px] text-slate-500">brüt kâr ÷ satış (KDV dahil)</div></div>
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10"><div className="text-xs text-slate-500">Başabaş için aylık satış</div><div className="text-lg font-bold">{para(basabas)}</div></div>
              <div className={`rounded-xl p-3 ${ortCiro >= basabas ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}><div className="text-xs text-slate-500">Şu anki aylık ortalama satış</div><div className="text-lg font-bold">{para(ortCiro)}</div><div className={`text-[11px] font-semibold ${ortCiro >= basabas ? 'text-emerald-700' : 'text-red-600'}`}>{ortCiro >= basabas ? `başabaşın %${(((ortCiro - basabas) / basabas) * 100).toFixed(0)} üstünde` : `başabaşa ${para(basabas - ortCiro)} eksik`}</div></div>
            </div>
          )}
          <h4 className="mb-1 mt-5 text-sm font-semibold">Aylık brüt kâr ve gider</h4>
          <div className="space-y-1.5">{aylar.filter((x) => x.ciro > 0 || x.masraf > 0).map((x) => {
            const max = Math.max(...aylar.map((y) => Math.max(y.kar, y.masraf)), 1);
            return <div key={x.ay} className="grid grid-cols-[60px_1fr_90px] items-center gap-2 text-xs">
              <span className="text-slate-500">{AY[Number(x.ay.slice(5, 7)) - 1]} {x.ay.slice(2, 4)}</span>
              <div className="space-y-0.5"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(Math.max(x.kar, 0) / max) * 100}%` }} title={`Brüt kâr ${para(x.kar)}`} /><div className="h-2 rounded-full bg-red-400" style={{ width: `${(x.masraf / max) * 100}%` }} title={`Gider ${para(x.masraf)}`} /></div>
              <span className={`text-right font-semibold ${x.kar - x.masraf < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{para(x.kar - x.masraf)}</span>
            </div>;
          })}</div>
          <div className="mt-2 flex gap-4 text-[11px] text-slate-500"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Brüt kâr</span><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />Gider</span><span>Sağdaki: net</span></div>
        </div>

        <div className="card p-4">
          <h3 className="mb-1 font-semibold">Giderlerin satışa oranı</h3>
          <p className="mb-2 text-xs text-slate-500">Seçili dönemde her gider kalemi satışın yüzde kaçı</p>
          {g.masrafGruplari.filter((m) => !m.haric).slice(0, 12).map((m) => (
            <div key={m.anahtar} className="flex justify-between gap-2 py-0.5 text-sm"><span className="truncate">{m.alt}</span><span><b>%{donemSatis > 0 ? ((m.tutar / donemSatis) * 100).toFixed(1) : '0'}</b> <span className="text-xs text-slate-400">{para(m.tutar)}</span></span></div>
          ))}
          {donemSatis > 0 && <div className="mt-2 border-t pt-1 text-sm font-semibold dark:border-slate-700">Toplam gider / satış: %{((g.masraf / donemSatis) * 100).toFixed(1)}</div>}
        </div>

        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Hizmet gelirleri</h3>
          <Liste l={g.hizmetListe} bos="Bu dönemde hizmet satışı yok" />
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Dışarıdan alınan hizmet / stok dışı alışlar</h3>
          <Liste l={g.disHizmetListe.map((x) => ({ ...x, adet: 0 }))} bos="Bu dönemde yok" />
        </div>
        <div className="card p-4">
          <h3 className="mb-1 font-semibold text-amber-700">Maliyeti girilmemiş ürün satışları</h3>
          <p className="mb-2 text-xs text-slate-500">BizimHesap'ta alış fiyatı 0 olan ürünler; kâr hesabına giremedi.</p>
          <Liste l={g.maliyetsizUrunListe} bos="Yok 👍" />
        </div>

        <div className="card p-4 lg:col-span-3">
          <h3 className="mb-2 font-semibold">Günlük ürün brüt kârı</h3>
          <CubukGrafik veri={seri.map((x) => ({ etiket: x.gun.slice(8, 10) + '.' + x.gun.slice(5, 7), deger: x.deger, alt: tarih(x.gun + 'T12:00') }))} bicim={para} bos="Bu dönemde satış yok" />
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="font-semibold">{grup === 'kategori' ? 'Kategori' : 'Marka'} bazında ürün kârlılığı</h3>
            <select className="inp w-36 py-1 text-sm" value={grup} onChange={(e) => setGrup(e.target.value as Grup)}><option value="kategori">Kategoriye göre</option><option value="marka">Markaya göre</option></select>
          </div>
          {gruplu.length === 0 ? <Bos metin="Bu dönemde satış yok." /> : (
            <div className="max-h-[420px] overflow-auto"><table className="tbl">
              <thead><tr><th>{grup === 'kategori' ? 'Kategori' : 'Marka'}</th><th className="text-right">Ürün</th><th className="text-right">Adet</th><th className="text-right">Satış</th><th className="text-right">Brüt kâr</th><th className="text-right">Marj</th></tr></thead>
              <tbody>{gruplu.map((r) => <tr key={r.ad}><td className="font-medium">{r.ad}</td><td className="text-right text-slate-500">{r.urun}</td><td className="text-right">{sayi(r.adet)}</td><td className="text-right">{para(r.ciro)}</td>
                <td className={`text-right font-semibold ${r.kar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{para(r.kar)}</td><td className="text-right text-slate-500">{marj(r.kar, r.ciroNet)}</td></tr>)}</tbody>
            </table></div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="mb-1 font-semibold text-red-700">Zararına satılanlar</h3>
            <p className="mb-2 text-xs text-slate-500">Bu dönemde maliyetinin altında satılan ürünler</p>
            {zararEden.length === 0 ? <div className="text-sm text-slate-400">Yok 👍</div> : zararEden.slice(0, 8).map((x) => (
              <div key={x.urun.id} className="flex justify-between gap-2 text-sm"><span className="truncate">{x.urun.ad}</span><b className="shrink-0 text-red-600">{para(x.kar)}</b></div>))}
          </div>
          <div className="card p-4">
            <h3 className="mb-1 font-semibold">Fiyat uyarıları (şu an)</h3>
            <div className="flex justify-between text-sm"><span>Satış fiyatı maliyetin altında</span><b className={altinda.length ? 'text-red-600' : ''}>{altinda.length}</b></div>
            {altinda.slice(0, 6).map((u) => <div key={u.id} className="mt-1 truncate text-xs text-slate-500">{u.ad}: alış {para(u.alis_fiyati)} · satış {para(u.satis_fiyati)}</div>)}
          </div>
          {fiyat.length > 0 && <div className="card p-4">
            <h3 className="mb-1 font-semibold text-amber-700">Maliyeti artan, satış fiyatı aynı kalanlar</h3>
            {fiyat.slice(0, 8).map((f) => <div key={f.id} className="truncate text-xs text-slate-600 dark:text-slate-300">{urun.get(f.urun_id)?.ad}: alış {para(f.alis_eski)} → <b>{para(f.alis_yeni)}</b>, satış {para(f.satis_yeni)}</div>)}
          </div>}
          <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Info size={15} className="mt-0.5 shrink-0" /><span>Parça / hizmet ayrımı: alış maliyeti olmayan satırlardan adı işçilik, ücret, tamir, değişim, torna, yıkama, ayar vb. olanlar hizmet sayılır; geri kalanlar (kategorisi boş olsa bile) parçadır ve maliyeti eksik kabul edilir. Tam liste: Fiyat & Marj → Eksik kart bilgisi.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Satir({ l, v, kalin, soluk, buyuk }: { l: string; v: number; kalin?: boolean; soluk?: boolean; buyuk?: boolean }) {
  return <div className={`flex justify-between ${kalin ? 'font-semibold' : ''} ${soluk ? 'text-slate-500' : ''} ${buyuk ? 'text-lg' : ''}`}><span>{l}</span><span className={v < 0 && kalin ? 'text-red-600' : ''}>{para(v)}</span></div>;
}
function Liste({ l, bos }: { l: { ad: string; tutar: number; adet: number }[]; bos: string }) {
  if (!l.length) return <div className="text-sm text-slate-400">{bos}</div>;
  return <div className="max-h-64 space-y-1 overflow-auto">{l.slice(0, 40).map((x) => (
    <div key={x.ad} className="flex justify-between gap-2 text-sm"><span className="truncate" title={x.ad}>{x.ad}{x.adet > 1 ? <span className="text-xs text-slate-400"> ×{sayi(x.adet)}</span> : null}</span><b className="shrink-0">{para(x.tutar)}</b></div>
  ))}</div>;
}
