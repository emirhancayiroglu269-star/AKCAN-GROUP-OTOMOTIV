import { useMemo, useState } from 'react';
import { Download, Info, MessageCircle, Printer, Save, Wrench } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { netAlis, netSatis, stokluMu } from '../lib/analiz';
import { sonAlislar } from '../lib/analiz2';
import { ara, para, parse, sayi, tarih } from '../lib/format';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';
import { yazdir } from '../components/Yazdir';

const yukari5 = (x: number) => Math.ceil(x / 5) * 5;

export default function UstaFiyat() {
  const { db, calistir } = useStore();
  const k = db.ayarlar.usta_liste;
  const [indirim, setIndirim] = useState(String(k?.indirim ?? 15));
  const [taban, setTaban] = useState(String(k?.taban ?? 5));
  const [secili, setSecili] = useState<Set<string>>(new Set(k?.kategoriler ?? []));
  const [sadeceStok, setSadeceStok] = useState(k?.sadeceStok ?? true);
  const [q, setQ] = useState('');
  const [katAra, setKatAra] = useState('');
  const ind = Math.min(90, Math.max(0, parse(indirim))), tb = Math.max(0, parse(taban));

  const kategoriler = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of db.urunler) if (u.aktif && u.kategori && (!sadeceStok || u.stok > 0)) m.set(u.kategori, (m.get(u.kategori) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [db.urunler, sadeceStok]);

  const sonAl = useMemo(() => sonAlislar(db), [db]);
  const satirlar = useMemo(() => db.urunler.filter((u) => u.aktif && u.satis_fiyati > 0 && u.alis_fiyati > 0 && u.kategori && secili.has(u.kategori) && stokluMu(u) && (!sadeceStok || u.stok > 0)).map((u) => {
    // maliyet: kart alışı ile son alış faturasının büyüğü (fiyat arttıysa yeni maliyetin altına inilmesin)
    const kart = netAlis(u.alis_fiyati, u.kdv, db.ayarlar); const fat = sonAl.get(u.id)?.fiyat ?? 0;
    const maliyet = Math.max(kart, fat);
    const tabanFiyat = yukari5(maliyet * (1 + tb / 100) * (1 + u.kdv / 100));
    const hedef = yukari5(u.satis_fiyati * (1 - ind / 100));
    const usta = Math.min(u.satis_fiyati, Math.max(hedef, tabanFiyat));
    const n = netSatis(usta, u.kdv);
    return { u, maliyet, usta, tabanda: usta > hedef, gercekInd: ((u.satis_fiyati - usta) / u.satis_fiyati) * 100, marj: ((n - maliyet) / n) * 100 };
  }).sort((a, b) => (a.u.kategori ?? '').localeCompare(b.u.kategori ?? '', 'tr') || a.u.ad.localeCompare(b.u.ad, 'tr')), [db, sonAl, secili, sadeceStok, ind, tb]);
  const liste = satirlar.filter((x) => ara(q, x.u.ad, x.u.kod, x.u.marka, x.u.kategori));
  const tabanSay = satirlar.filter((x) => x.tabanda).length;
  const medyanMarj = (() => { const l = satirlar.map((x) => (netSatis(x.u.satis_fiyati, x.u.kdv) / x.maliyet - 1) * 100).filter(Number.isFinite).sort((p, r) => p - r); return l.length ? l[Math.floor(l.length / 2)] : null; })();
  const ortMarj = satirlar.length ? satirlar.reduce((t, x) => t + x.marj, 0) / satirlar.length : 0;

  const kaydet = () => calistir(() => backend.ayarKaydet({ usta_liste: { indirim: ind, taban: tb, kategoriler: [...secili], sadeceStok } }), 'Usta listesi ayarları kaydedildi');
  const katDegis = (kat: string) => { const s = new Set(secili); if (s.has(kat)) s.delete(kat); else s.add(kat); setSecili(s); };
  const metin = () => [`${db.ayarlar.firma_adi} — USTA / SERVİS FİYAT LİSTESİ (${tarih(new Date().toISOString())})`, 'Fiyatlar KDV dahildir.', '',
    ...liste.slice(0, 120).map((x) => `• ${x.u.ad}${x.u.marka ? ` (${x.u.marka})` : ''}: ${para(x.usta)}`), liste.length > 120 ? `… ve ${liste.length - 120} ürün daha` : '', db.ayarlar.telefon ?? ''].filter((x) => x !== '').join('\n');
  const csv = () => {
    const s = (a: (string | number | null | undefined)[]) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [s(['Kategori', 'Stok kodu', 'Barkod', 'Ürün', 'Marka', 'Stok', 'Perakende fiyat', 'Usta fiyatı', 'İndirim %', 'Maliyet (KDV hariç)', 'Marj %']),
      ...liste.map((x) => s([x.u.kategori, x.u.kod, x.u.barkod, x.u.ad, x.u.marka, x.u.stok, x.u.satis_fiyati, x.usta, x.gercekInd.toFixed(1), x.maliyet.toFixed(2), x.marj.toFixed(1)]))].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = 'usta-fiyat-listesi.csv'; el.click();
  };
  const bas = () => yazdir(
    <div className="p-4 text-[10.5px]">
      <div className="mb-3 flex justify-between border-b-2 border-black pb-2"><div><b className="text-base">{db.ayarlar.firma_adi}</b><div>{db.ayarlar.telefon}</div></div><div className="text-right"><b>USTA / SERVİS FİYAT LİSTESİ</b><div>{tarih(new Date().toISOString())} · Fiyatlar KDV dahil</div></div></div>
      <table className="w-full border-collapse"><thead><tr className="border-b border-black text-left"><th>Kategori</th><th>Kod</th><th>Ürün</th><th>Marka</th><th className="text-right">Liste</th><th className="text-right">Usta fiyatı</th></tr></thead>
        <tbody>{liste.map((x) => <tr key={x.u.id} className="border-b border-slate-300"><td>{x.u.kategori}</td><td>{x.u.kod}</td><td>{x.u.ad}</td><td>{x.u.marka}</td><td className="text-right text-slate-500 line-through">{para(x.u.satis_fiyati)}</td><td className="text-right font-bold">{para(x.usta)}</td></tr>)}</tbody></table>
      <div className="mt-2 text-right">{liste.length} ürün</div>
    </div>,
  );

  return (
    <div>
      <SayfaBaslik baslik="Usta / Servis Fiyat Listesi" alt="Seçtiğiniz kategorilerde ustalara ve servislere özel indirimli fiyat; maliyetin altına hiç inmez">
        <button className="btn-ghost" disabled={!liste.length} onClick={bas}><Printer size={16} /> Yazdır</button>
        <button className="btn-ghost" disabled={!liste.length} onClick={csv}><Download size={16} /> CSV</button>
        <a className={`btn-ghost ${liste.length ? '' : 'pointer-events-none opacity-50'}`} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(metin())}`}><MessageCircle size={16} /> WhatsApp</a>
      </SayfaBaslik>
      <div className="mb-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card space-y-4 p-4">
          <div className="flex items-center gap-2 font-semibold"><Wrench size={18} /> Ayarlar</div>
          <label className="block text-sm">Perakende fiyattan indirim<div className="mt-1 flex items-center gap-2"><span>%</span><input className="inp w-24" inputMode="decimal" value={indirim} onChange={(e) => setIndirim(e.target.value)} /></div></label>
          <label className="block text-sm">Alt sınır: maliyet +<div className="mt-1 flex items-center gap-2"><span>%</span><input className="inp w-24" inputMode="decimal" value={taban} onChange={(e) => setTaban(e.target.value)} /></div><span className="text-xs text-slate-500">İndirimli fiyat bunun altına düşerse bu fiyat kullanılır.</span></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sadeceStok} onChange={(e) => setSadeceStok(e.target.checked)} /> Sadece stokta olanlar</label>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm font-medium"><span>Kategoriler ({secili.size} seçili)</span>
              <span className="flex gap-2 text-xs"><button className="text-marka-600 hover:underline" onClick={() => setSecili(new Set(kategoriler.map(([x]) => x)))}>Tümü</button><button className="text-slate-500 hover:underline" onClick={() => setSecili(new Set())}>Temizle</button></span></div>
            <input className="inp mb-2 py-1 text-sm" placeholder="Kategori ara…" value={katAra} onChange={(e) => setKatAra(e.target.value)} />
            <div className="max-h-72 space-y-0.5 overflow-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-800">
              {kategoriler.filter(([x]) => ara(katAra, x)).map(([x, n]) => <label key={x} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={secili.has(x)} onChange={() => katDegis(x)} /><span className="flex-1 truncate">{x}</span><span className="text-xs text-slate-400">{n}</span></label>)}
            </div>
          </div>
          <button className="btn-primary w-full" onClick={kaydet}><Save size={16} /> Ayarları kaydet</button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi etiket="Listedeki ürün" deger={sayi(satirlar.length)} alt={`${secili.size} kategori`} />
            <Kpi etiket="İndirim" deger={`%${ind}`} alt={`alt sınır maliyet + %${tb}`} renk="blue" />
            <Kpi etiket="Alt sınıra takılan" deger={sayi(tabanSay)} alt="Bu ürünlerde indirim daha az uygulandı" renk="amber" />
            <Kpi etiket="Usta fiyatıyla ortalama marj" deger={`%${ortMarj.toFixed(0)}`} alt="KDV hariç" renk="green" />
          </div>
          <div className="card">
            <div className="flex items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800"><input className="inp max-w-xs" placeholder="Ürün, kod, marka…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="ml-auto text-xs text-slate-500">{liste.length} ürün</span></div>
            <div className="max-h-[60vh] overflow-auto">
              {secili.size === 0 ? <Bos metin="Soldan usta listesine girecek kategorileri seçin." /> : liste.length === 0 ? <Bos metin="Seçili kategorilerde ürün yok." /> : (
                <table className="tbl"><thead><tr><th>Ürün</th><th className="text-right">Stok</th><th className="text-right">Perakende</th><th className="text-right">Usta fiyatı</th><th className="text-right">İndirim</th><th className="text-right">Marj</th></tr></thead>
                  <tbody>{liste.slice(0, 1000).map((x) => (
                    <tr key={x.u.id}><td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[x.u.kategori, x.u.kod, x.u.marka].filter(Boolean).join(' · ')}</div></td>
                      <td className="text-right">{sayi(x.u.stok)}</td><td className="text-right text-slate-500">{para(x.u.satis_fiyati)}</td>
                      <td className="text-right font-bold">{para(x.usta)}{x.tabanda && <div className="text-[10px] font-normal text-amber-600">alt sınır</div>}</td>
                      <td className="text-right">%{x.gercekInd.toFixed(0)}</td><td className={`text-right ${x.marj < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>%{x.marj.toFixed(0)}</td></tr>
                  ))}</tbody></table>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" /><span>Usta fiyatı = perakende fiyat − indirim; ama "maliyet + alt sınır" fiyatının altına inmez ve perakende fiyatın üstüne çıkmaz (KDV dahil, 5 TL'ye yuvarlanır). Maliyet, BizimHesap kartındaki alış fiyatı ile son alış faturasındaki fiyatın büyüğüdür (KDV hariç).{medyanMarj != null && <> Seçili ürünlerde perakende fiyat ortalama maliyetin %{medyanMarj.toFixed(0)} üstünde; alt sınır maliyet + %{tb} olduğu için en fazla yaklaşık %{Math.max(0, (1 - (1 + tb / 100) / (1 + medyanMarj / 100)) * 100).toFixed(0)} indirim uygulanabilir, fazlası alt sınıra takılır.</>} Bu liste BizimHesap'a yazılmaz; ustaya satarken bu fiyatı faturaya siz girersiniz.</span>
      </div>
    </div>
  );
}
