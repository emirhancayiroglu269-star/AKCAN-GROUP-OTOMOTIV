import { useMemo, useState } from 'react';
import { Download, Info, Save, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { ara, para, parse, sayi, tarih } from '../lib/format';
import { kategoriFiyatlama, type Durum, type KatOzet } from '../lib/kategoriFiyat';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

const DURUM: Record<Durum, { ad: string; cls: string }> = {
  artir: { ad: 'Fiyatı artır', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  indir: { ad: 'İndirim düşün', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  uygun: { ad: 'Uygun', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  maliyetsiz: { ad: 'Maliyet yok', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
};
const yz = (x: number | null) => (x === null ? '—' : `%${x.toFixed(0)}`);

export default function KategoriFiyat() {
  const { db, calistir } = useStore();
  const [taslak, setTaslak] = useState<Record<string, string>>({});
  const [secili, setSecili] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [uq, setUq] = useState('');
  const [durum, setDurum] = useState<Durum | ''>('artir');
  const [sadeceSatan, setSadeceSatan] = useState(false);
  const taslakSayi = useMemo(() => Object.fromEntries(Object.entries(taslak).filter(([, v]) => v.trim() !== '' && parse(v) > 0).map(([k, v]) => [k, Math.min(90, parse(v))])), [taslak]);
  const katlar = useMemo(() => kategoriFiyatlama(db, taslakSayi), [db, taslakSayi]);
  const kat = katlar.find((k) => k.ad === secili) ?? null;
  const liste = katlar.filter((k) => ara(q, k.ad) && (!sadeceSatan || k.satisSatir > 0));
  const degisti = Object.keys(taslakSayi).length > 0;
  const top = katlar.reduce((t, k) => ({ artir: t.artir + k.artir, indir: t.indir + k.indir, etki: t.etki + k.aylikEtki, indirDeger: t.indirDeger + k.indirDeger }), { artir: 0, indir: 0, etki: 0, indirDeger: 0 });

  const kaydet = () => calistir(async () => { await backend.ayarKaydet({ kategori_marj: { ...(db.ayarlar.kategori_marj ?? {}), ...taslakSayi } }); setTaslak({}); }, 'Kategori marjları kaydedildi');
  const onerilenleriUygula = () => setTaslak(Object.fromEntries(katlar.map((k) => [k.ad, String(k.onerilen)])));
  const csv = (kaynak: KatOzet[]) => {
    const s = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const satir = kaynak.flatMap((k) => k.urunler.filter((x) => x.durum === 'artir' || x.durum === 'indir').map((x) => s([k.ad, x.u.kod, x.u.barkod, x.u.ad, x.u.marka, x.u.stok, x.maliyet.toFixed(2), x.u.satis_fiyati, x.marj?.toFixed(1), k.hedef, x.oneri, DURUM[x.durum].ad])));
    const icerik = [s(['Kategori', 'Stok kodu', 'Barkod', 'Ürün', 'Marka', 'Stok', 'Maliyet (KDV hariç)', 'Mevcut satış (KDV dahil)', 'Mevcut marj %', 'Kategori hedef marj %', 'Önerilen satış (KDV dahil)', 'Öneri']), ...satir].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = 'kategori-fiyat-onerileri.csv'; el.click();
  };
  const urunler = kat ? kat.urunler.filter((x) => (!durum || x.durum === durum) && ara(uq, x.u.ad, x.u.kod, x.u.marka)).sort((x, y) => y.aylikEtki - x.aylikEtki || y.u.stok * y.maliyet - x.u.stok * x.maliyet) : [];

  return (
    <div>
      <SayfaBaslik baslik="Kategori Fiyatlama" alt="Her kategori için gerçek satışlardan hedef marj önerisi ve bu marja göre ürün satış fiyatları (KDV hariç marj, KDV dahil fiyat)">
        <button className="btn-ghost" onClick={() => csv(katlar)}><Download size={16} /> Tüm fiyat önerileri (CSV)</button>
      </SayfaBaslik>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Fiyatı artırılacak ürün" deger={sayi(top.artir)} alt="Kategori hedef marjının altında" renk="green" />
        <Kpi etiket="Aylık ek kâr (tahmini)" deger={para(top.etki)} alt="Son 6 ayın satış adediyle" renk="green" />
        <Kpi etiket="İndirim düşünülecek ürün" deger={sayi(top.indir)} alt={`90 gündür satılmayan, hedefin çok üstünde fiyatlı · ${para(top.indirDeger)} stok`} renk="blue" />
        <Kpi etiket="Kategori" deger={sayi(katlar.length)} alt={`${katlar.filter((k) => k.kayitli).length} kategoride kayıtlı hedef var`} />
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <b className="text-sm">Kategoriler</b>
          <input className="inp max-w-[200px]" placeholder="Kategori ara…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sadeceSatan} onChange={(e) => setSadeceSatan(e.target.checked)} /> Sadece satış olanlar</label>
          <div className="ml-auto flex gap-2">
            <button className="btn-ghost" onClick={onerilenleriUygula}><Sparkles size={16} /> Önerilen marjları doldur</button>
            {degisti && <button className="btn-ghost" onClick={() => setTaslak({})}>Vazgeç</button>}
            <button className="btn-primary" disabled={!degisti} onClick={kaydet}><Save size={16} /> Kaydet</button>
          </div>
        </div>
        <div className="max-h-[55vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Kategori yok." /> : (
            <table className="tbl"><thead><tr>
              <th>Kategori</th><th className="text-right">Satış (6 ay, KDV hariç)</th><th className="text-right">Gerçekleşen marj</th><th className="text-right">Liste marjı</th>
              <th className="text-right">Önerilen</th><th className="w-28 text-right">Hedef marj %</th><th className="text-right">Artır</th><th className="text-right">İndir</th><th className="text-right">Aylık etki</th>
            </tr></thead>
              <tbody>{liste.map((k) => (
                <tr key={k.ad} className={`cursor-pointer ${secili === k.ad ? 'bg-marka-50 dark:bg-marka-500/10' : ''}`} onClick={() => setSecili(k.ad)}>
                  <td><div className="font-medium">{k.ad}</div><div className="text-xs text-slate-500">{sayi(k.urunSay)} ürün · stok {para(k.stokDeger)}</div></td>
                  <td className="text-right">{k.ciroNet ? para(k.ciroNet) : <span className="text-slate-400">—</span>}<div className="text-xs text-slate-500">{k.satisSatir ? `${sayi(k.satilan)} adet` : ''}</div></td>
                  <td className={`text-right font-medium ${k.gerceklesenMarj !== null && k.gerceklesenMarj < k.hedef ? 'text-amber-600' : ''}`}>{yz(k.gerceklesenMarj)}</td>
                  <td className="text-right text-slate-500">{yz(k.listeMarj)}</td>
                  <td className="text-right" title={k.neden}>%{k.onerilen}</td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <input className={`inp w-20 px-2 py-1 text-right ${k.ad in taslak ? 'border-marka-500' : ''}`} value={taslak[k.ad] ?? String(k.hedef)} onFocus={(e) => e.target.select()}
                      onChange={(e) => setTaslak({ ...taslak, [k.ad]: e.target.value })} />
                  </td>
                  <td className="text-right">{k.artir ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">{sayi(k.artir)}</span> : <span className="text-slate-400">0</span>}</td>
                  <td className="text-right">{k.indir ? <span className="font-semibold text-sky-700 dark:text-sky-400">{sayi(k.indir)}</span> : <span className="text-slate-400">0</span>}</td>
                  <td className="text-right font-semibold">{k.aylikEtki > 0 ? para(k.aylikEtki) : <span className="font-normal text-slate-400">—</span>}</td>
                </tr>
              ))}</tbody></table>
          )}
        </div>
      </div>

      {kat ? (
        <div className="card">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{kat.ad}</h3>
                <p className="text-sm text-slate-500">Hedef marj <b>%{kat.hedef}</b>{kat.kayitli ? ' (kayıtlı)' : ' (öneri)'} · {kat.neden}</p>
              </div>
              <button className="btn-ghost" onClick={() => csv([kat])}><Download size={16} /> Bu kategori (CSV)</button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {(['artir', 'indir', 'uygun', 'maliyetsiz', ''] as const).map((x) => (
                <button key={x || 'hepsi'} onClick={() => setDurum(x)} className={`rounded-full px-3 py-1 text-xs ${durum === x ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {x ? DURUM[x].ad : 'Tümü'} ({x ? kat.urunler.filter((u) => u.durum === x).length : kat.urunler.length})
                </button>
              ))}
              <input className="inp ml-auto max-w-[220px]" placeholder="Ürün ara…" value={uq} onChange={(e) => setUq(e.target.value)} />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {urunler.length === 0 ? <Bos metin="Bu filtrede ürün yok." /> : (
              <table className="tbl"><thead><tr><th>Ürün</th><th className="text-right">Stok</th><th className="text-right">Maliyet</th><th className="text-right">Mevcut satış</th><th className="text-right">Marj</th><th className="text-right">Önerilen satış</th><th className="text-right">90 günde satılan</th><th>Durum</th><th className="text-right">Aylık etki</th></tr></thead>
                <tbody>{urunler.slice(0, 500).map((x) => (
                  <tr key={x.u.id}>
                    <td><div className="font-medium">{x.u.ad}</div><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka].filter(Boolean).join(' · ')}</div></td>
                    <td className="text-right">{sayi(x.u.stok)}</td>
                    <td className="text-right">{x.maliyet > 0 ? para(x.maliyet) : '—'}<div className="text-[10px] text-slate-400">{x.maliyetKaynak === 'fatura' ? 'son fatura' : x.maliyetKaynak === 'kart' ? 'kart' : ''}</div></td>
                    <td className="text-right">{para(x.u.satis_fiyati)}</td>
                    <td className={`text-right ${x.marj !== null && x.marj < 0 ? 'font-semibold text-red-600' : ''}`}>{yz(x.marj)}</td>
                    <td className="text-right font-semibold">{x.oneri ? para(x.oneri) : '—'}{x.oneri && x.durum !== 'uygun' ? <div className={`text-[10px] ${x.oneri > x.u.satis_fiyati ? 'text-emerald-600' : 'text-sky-600'}`}>{x.oneri > x.u.satis_fiyati ? '+' : ''}{para(x.oneri - x.u.satis_fiyati)}</div> : null}</td>
                    <td className="text-right text-slate-500">{sayi(x.satilan90)}<div className="text-[10px]">{x.sonSatis ? `son ${tarih(x.sonSatis + 'T12:00')}` : 'hiç'}</div></td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DURUM[x.durum].cls}`}>{DURUM[x.durum].ad}</span></td>
                    <td className="text-right">{x.aylikEtki > 0 ? para(x.aylikEtki) : '—'}</td>
                  </tr>
                ))}</tbody></table>
            )}
          </div>
        </div>
      ) : <div className="card"><Bos metin="Ürünlerini ve fiyat önerilerini görmek için yukarıdan bir kategori seçin." /></div>}

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span><b>Önerilen marj nasıl bulunur?</b> Son 6 ayda o kategoride yapılan satışların dörtte biri hangi marjla ve üstünde yapıldıysa o marj önerilir (müşterinin kabul ettiği kanıtlanmış seviye). Çok satılan kategorilerde (yağ, filtre gibi fiyatı karşılaştırılan ürünler) ortalamanın en fazla 5 puan üstü önerilir. Satışı olmayan kategorilerde kartlardaki fiyatların ortanca marjı kullanılır. Öneri %15–60 arasında tutulur. Maliyet olarak kart alışı ile son fatura alışından yüksek olanı alınır. Fiyatlar 5 TL'ye yuvarlanır. Program BizimHesap'a yazmaz; CSV listesindeki fiyatları BizimHesap'a siz girersiniz.</span>
      </div>
    </div>
  );
}
