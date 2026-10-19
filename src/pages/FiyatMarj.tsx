import { useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import { UrunLink } from '../components/DetayKart';
import { OtoparcasanLink } from '../components/DisLink';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { birimKar, netAlis, stokluMu } from '../lib/analiz';
import { onerilenFiyat, sonAlislar } from '../lib/analiz2';
import { ara, para, parse, sayi, tarih } from '../lib/format';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

type Filtre = 'hedefAlti' | 'maliyetArtti' | 'zarar' | 'maliyetsiz' | 'hepsi';

export default function FiyatMarj() {
  const { db, calistir } = useStore();
  const a = db.ayarlar;
  const [hedef, setHedef] = useState(String(a.hedef_marj ?? 35));
  const [filtre, setFiltre] = useState<Filtre>('hedefAlti');
  const [q, setQ] = useState('');
  const [sadeceStok, setSadeceStok] = useState(true);
  const h = parse(hedef) || 35;
  const sonAl = useMemo(() => sonAlislar(db), [db]);
  const satirlar = useMemo(() => db.urunler.filter((u) => u.aktif && u.satis_fiyati > 0 && stokluMu(u)).map((u) => {
    const bk = birimKar(u, a);
    const s = sonAl.get(u.id);
    // kullanıcı kararı: ürün sekmesinde genel hedef geçerli; kategori marjları yalnız "Kategori bazında" sekmesinde öneri
    const hedefU = h;
    const guncelMaliyet = Math.max(u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, a) : 0, s?.fiyat ?? 0);
    const oneri = onerilenFiyat(u, guncelMaliyet, hedefU);
    const marjGuncel = guncelMaliyet > 0 ? ((bk.satisNet - guncelMaliyet) / bk.satisNet) * 100 : null;
    return { u, bk, son: s, maliyetArtti: !!s && u.alis_fiyati > 0 && s.fiyat > netAlis(u.alis_fiyati, u.kdv, a) * 1.02, guncelMaliyet, oneri, marjGuncel, hedefU };
  }), [db, a, sonAl, h]);
  const liste = satirlar.filter((r) => (!sadeceStok || r.u.stok > 0) && ara(q, r.u.ad, r.u.kod, r.u.marka, r.u.kategori) && (
    filtre === 'hepsi' ? true : filtre === 'maliyetsiz' ? r.guncelMaliyet <= 0 : filtre === 'zarar' ? r.marjGuncel !== null && r.marjGuncel < 0
      : filtre === 'maliyetArtti' ? r.maliyetArtti : r.marjGuncel !== null && r.marjGuncel < r.hedefU - 0.5))
    .sort((x, y) => (x.marjGuncel ?? 999) - (y.marjGuncel ?? 999));
  const say = (f: Filtre) => satirlar.filter((r) => (!sadeceStok || r.u.stok > 0) && (f === 'maliyetsiz' ? r.guncelMaliyet <= 0 : f === 'zarar' ? r.marjGuncel !== null && r.marjGuncel < 0 : f === 'maliyetArtti' ? r.maliyetArtti : f === 'hedefAlti' ? r.marjGuncel !== null && r.marjGuncel < r.hedefU - 0.5 : true)).length;
  const kaydet = () => calistir(() => backend.ayarKaydet({ hedef_marj: h }), 'Hedef marj kaydedildi');
  const csv = () => {
    const s = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [s(['Stok kodu', 'Ürün', 'Marka', 'Stok', 'BH alış (KDV hariç)', 'Son fatura alışı', 'Tedarikçi', 'Satış (KDV dahil)', 'Güncel marj %', 'Önerilen satış', 'Fark']),
      ...liste.map((r) => s([r.u.kod, r.u.ad, r.u.marka, r.u.stok, r.bk.alisNet.toFixed(2), r.son?.fiyat.toFixed(2), r.son?.tedarikci, r.u.satis_fiyati, r.marjGuncel?.toFixed(1), r.oneri, r.oneri ? r.oneri - r.u.satis_fiyati : '']))].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = 'fiyat-onerileri.csv'; el.click();
  };
  const fBtn = (f: Filtre, ad: string) => <button key={f} onClick={() => setFiltre(f)} className={`rounded-full px-3 py-1.5 text-sm ${filtre === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{ad} <span className="opacity-60">{say(f)}</span></button>;

  return (
    <div>
      <SayfaBaslik baslik="Fiyat & Marj" alt="Hedef marjın altında kalan ürünler ve önerilen satış fiyatları">
        <button className="btn-ghost" onClick={csv}><Download size={16} /> Excel (CSV)</button>
      </SayfaBaslik>
      <div className="mb-4 grid gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500">Hedef brüt marj (KDV hariç)</div>
          <div className="mt-2 flex items-center gap-2"><span className="text-xl font-bold">%</span><input className="inp w-24 text-lg font-bold" value={hedef} onChange={(e) => setHedef(e.target.value)} /><button className="btn-ghost text-xs" onClick={kaydet}>Kaydet</button></div>
          <div className="mt-1 text-xs text-slate-500">Satış fiyatının yüzde kaçı kâr kalsın</div>
        </div>
        <Kpi etiket="Hedefin altında" deger={sayi(say('hedefAlti'))} alt={sadeceStok ? 'Stoktaki ürünler' : 'Tüm ürünler'} renk="amber" />
        <Kpi etiket="Son alış fiyatı arttı" deger={sayi(say('maliyetArtti'))} alt="Faturadaki alış > BizimHesap alış fiyatı" renk="red" />
        <Kpi etiket="Zararına fiyatlı" deger={sayi(say('zarar'))} alt="Güncel maliyetin altında" renk="red" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {fBtn('hedefAlti', `Hedef (%${h}) altında`)}{fBtn('maliyetArtti', 'Maliyeti artanlar')}{fBtn('zarar', 'Zararına')}{fBtn('maliyetsiz', 'Maliyet bilgisi yok')}{fBtn('hepsi', 'Tümü')}
        <label className="ml-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={sadeceStok} onChange={(e) => setSadeceStok(e.target.checked)} /> Sadece stoktakiler</label>
        <input className="inp ml-auto max-w-xs" placeholder="Ürün, kod, marka…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card">
        <div className="max-h-[62vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Bu filtrede ürün yok." /> : (
            <table className="tbl">
              <thead><tr><th>Ürün</th><th className="text-right">Stok</th><th className="text-right">BH alış</th><th className="text-right">Son fatura alışı</th><th className="text-right">Satış</th><th className="text-right">Güncel marj</th><th className="text-right">Önerilen satış</th><th className="text-right">Fark</th></tr></thead>
              <tbody>{liste.slice(0, 500).map((r) => (
                <tr key={r.u.id}>
                  <td><div className="font-medium"><UrunLink id={r.u.id}>{r.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[r.u.kod, r.u.marka].filter(Boolean).join(' · ')} <OtoparcasanLink u={r.u} kisa /></div></td>
                  <td className="text-right">{sayi(r.u.stok)}</td>
                  <td className="text-right text-slate-500">{r.u.alis_fiyati > 0 ? <>{para(r.bk.alisNet)}{r.u.kart_alis ? <div className="text-[10px] text-sky-700" title={`Kartta ${para(r.u.kart_alis)} yazıyor; ${r.u.alis_fatura?.tarih} tarihli faturanın net fiyatı kullanılıyor`}>fatura fiyatı</div> : null}</> : '—'}</td>
                  <td className={`text-right ${r.maliyetArtti ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{r.son ? <>{para(r.son.fiyat)}<div className="text-[10px] font-normal text-slate-400">{tarih(r.son.tarih + 'T12:00')}{r.son.tedarikci ? ` · ${r.son.tedarikci}` : ''}</div></> : '—'}</td>
                  <td className="text-right font-medium">{para(r.u.satis_fiyati)}</td>
                  <td className={`text-right ${r.marjGuncel === null ? 'text-slate-300' : r.marjGuncel < 0 ? 'text-red-600' : r.marjGuncel < r.hedefU - 0.5 ? 'text-amber-600' : 'text-emerald-700'}`}>{r.marjGuncel === null ? '—' : `%${r.marjGuncel.toFixed(0)}`}</td>
                  <td className="text-right font-semibold">{r.oneri ? para(r.oneri) : '—'}</td>
                  <td className={`text-right ${r.oneri && r.oneri > r.u.satis_fiyati ? 'text-amber-700' : 'text-slate-400'}`}>{r.oneri ? (r.oneri > r.u.satis_fiyati ? '+' : '') + para(r.oneri - r.u.satis_fiyati) : ''}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" /><span>Güncel maliyet = BizimHesap alış fiyatı ile son alış faturasındaki fiyatın büyüğü (KDV hariç). Bu sekmede genel hedef geçerlidir; "Kategori bazında" sekmesindeki marjlar yalnız öneridir. Önerilen satış = maliyet ÷ (1 − hedef marj), KDV eklenip 5 TL'ye yuvarlanır. İşçilik/hizmet kalemleri listelenmez. Fiyatları BizimHesap'ta güncelleyin; birkaç dakika içinde buraya yansır.</span>
      </div>
    </div>
  );
}
