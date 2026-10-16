import { useState } from 'react';
import { Printer, Trash2 } from 'lucide-react';
import { toast } from '../lib/store';
import { para, parse, sayi } from '../lib/format';
import { barkodSvg } from '../lib/barkod';
import type { Urun } from '../lib/types';
import { Alan, Bos, Modal } from './ui';
import { UrunArama } from './UrunArama';
import { yazdir } from './Yazdir';

// ======================= BARKOD ETİKETİ =======================
type Boyut = 't50x30' | 't40x25' | 'a4';
const BOYUTLAR: Record<Boyut, { ad: string; w: number; h: number }> = {
  t50x30: { ad: 'Termal etiket 50 × 30 mm', w: 50, h: 30 },
  t40x25: { ad: 'Termal etiket 40 × 25 mm', w: 40, h: 25 },
  a4: { ad: 'A4 yaprak etiket 3 × 8 (70 × 37 mm)', w: 70, h: 37 },
};
export interface EtiketKalem { urun: Urun; adet: number }

function Etiket({ u, b, fiyat, raf }: { u: Urun; b: Boyut; fiyat: boolean; raf: boolean }) {
  const { w, h } = BOYUTLAR[b];
  const deger = u.barkod || u.kod || '';
  const kucuk = b === 't40x25';
  return (
    <div style={{ width: `${w}mm`, height: `${h}mm`, padding: kucuk ? '1.2mm 1.5mm' : '2mm 2.5mm', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif', color: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5mm' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: kucuk ? '7pt' : '8pt', fontWeight: 700, lineHeight: 1.15, maxHeight: kucuk ? '5mm' : '6.8mm', overflow: 'hidden' }}>{u.ad}</div>
          <div style={{ fontSize: '6pt', marginTop: '0.3mm', whiteSpace: 'nowrap', overflow: 'hidden' }}>{[u.marka, u.kod && u.kod !== deger ? u.kod : '', raf && u.raf ? 'Raf ' + u.raf : ''].filter(Boolean).join(' · ')}</div>
        </div>
        {fiyat && <div style={{ fontSize: kucuk ? '10pt' : '12pt', fontWeight: 800, whiteSpace: 'nowrap', lineHeight: 1 }}>{para(u.satis_fiyati)}</div>}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {deger ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div dangerouslySetInnerHTML={{ __html: barkodSvg(deger, w - (kucuk ? 3 : 5), kucuk ? 9 : (b === 'a4' ? 15 : 13)) }} />
            <div style={{ fontSize: '6.5pt', letterSpacing: '0.4pt', lineHeight: 1.1 }}>{deger}</div>
          </div>
        ) : <div style={{ fontSize: '6pt' }}>(barkod / stok kodu yok)</div>}
      </div>
    </div>
  );
}

function EtiketCikti({ kalemler, b, fiyat, raf }: { kalemler: EtiketKalem[]; b: Boyut; fiyat: boolean; raf: boolean }) {
  const liste = kalemler.flatMap((k) => Array.from({ length: Math.max(0, Math.floor(k.adet)) }, () => k.urun));
  if (b === 'a4') return (
    <div>
      <style>{'@page { size: A4; margin: 0 } body { margin: 0 }'}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 70mm)', gridAutoRows: '37mm', width: '210mm' }}>
        {liste.map((u, i) => <div key={i} style={{ breakInside: 'avoid' }}><Etiket u={u} b={b} fiyat={fiyat} raf={raf} /></div>)}
      </div>
    </div>
  );
  const { w, h } = BOYUTLAR[b];
  return (
    <div>
      <style>{`@page { size: ${w}mm ${h}mm; margin: 0 } body { margin: 0 }`}</style>
      {liste.map((u, i) => <div key={i} style={{ breakAfter: i < liste.length - 1 ? 'page' : 'auto' }}><Etiket u={u} b={b} fiyat={fiyat} raf={raf} /></div>)}
    </div>
  );
}

export function EtiketModal({ baslangic, kapat }: { baslangic: EtiketKalem[]; kapat: () => void }) {
  const [kalemler, setKalemler] = useState<EtiketKalem[]>(baslangic);
  const [b, setB] = useState<Boyut>(() => { try { return (localStorage.getItem('etiket-boyut') as Boyut) || 't50x30'; } catch { return 't50x30'; } });
  const [fiyat, setFiyat] = useState(true);
  const [raf, setRaf] = useState(true);
  const toplam = kalemler.reduce((t, k) => t + Math.max(0, Math.floor(k.adet)), 0);
  const boyutSec = (x: Boyut) => { setB(x); try { localStorage.setItem('etiket-boyut', x); } catch { /* yok */ } };
  const ekle = (u: Urun) => setKalemler((ks) => ks.some((k) => k.urun.id === u.id) ? ks.map((k) => k.urun.id === u.id ? { ...k, adet: k.adet + 1 } : k) : [...ks, { urun: u, adet: 1 }]);
  const bas = () => {
    if (!toplam) return toast('Etiket adedi girin', 'hata');
    if (toplam > 500 && !window.confirm(`${toplam} etiket yazdırılacak. Devam edilsin mi?`)) return;
    yazdir(<EtiketCikti kalemler={kalemler} b={b} fiyat={fiyat} raf={raf} />);
  };
  return (
    <Modal acik kapat={kapat} genis="xl" baslik="Barkod etiketi yazdır"
      alt={<><button className="btn-ghost" onClick={kapat}>Kapat</button><button className="btn-primary" onClick={bas}><Printer size={16} /> {toplam} etiket yazdır</button></>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <UrunArama sec={ekle} placeholder="Etikete ürün ekle (barkod okutabilirsiniz)…" otoOdak />
          {kalemler.length === 0 ? <Bos metin="Ürün ekleyin." /> : (
            <div className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800"><table className="tbl">
              <thead><tr><th>Ürün</th><th>Barkod</th><th className="text-right">Fiyat</th><th className="w-24">Adet</th><th className="w-8" /></tr></thead>
              <tbody>{kalemler.map((k, i) => (
                <tr key={k.urun.id}>
                  <td>{k.urun.ad}<div className="text-xs text-slate-500">Stok: {sayi(k.urun.stok)}</div></td>
                  <td className="font-mono text-xs">{k.urun.barkod || k.urun.kod || <span className="text-red-500">yok</span>}</td>
                  <td className="text-right">{para(k.urun.satis_fiyati)}</td>
                  <td><input className="inp px-1 text-center" value={k.adet} onChange={(e) => setKalemler(kalemler.map((x, j) => j === i ? { ...x, adet: parse(e.target.value) } : x))} onFocus={(e) => e.target.select()} /></td>
                  <td><button className="text-slate-400 hover:text-red-600" onClick={() => setKalemler(kalemler.filter((_, j) => j !== i))}><Trash2 size={15} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          {kalemler.length > 1 && <div className="flex gap-2 text-xs">
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setKalemler(kalemler.map((k) => ({ ...k, adet: 1 })))}>Hepsi 1 adet</button>
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setKalemler(kalemler.map((k) => ({ ...k, adet: Math.max(0, Math.floor(k.urun.stok)) })))}>Stok adedi kadar</button>
          </div>}
        </div>
        <div className="space-y-3">
          <Alan etiket="Etiket boyutu"><select className="inp" value={b} onChange={(e) => boyutSec(e.target.value as Boyut)}>{(Object.keys(BOYUTLAR) as Boyut[]).map((x) => <option key={x} value={x}>{BOYUTLAR[x].ad}</option>)}</select></Alan>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fiyat} onChange={(e) => setFiyat(e.target.checked)} /> Fiyatı yazdır</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={raf} onChange={(e) => setRaf(e.target.checked)} /> Raf bilgisini yazdır</label>
          <div className="text-xs font-semibold text-slate-500">Önizleme</div>
          <div className="inline-block rounded border border-dashed border-slate-300 bg-white">{kalemler[0] ? <Etiket u={kalemler[0].urun} b={b} fiyat={fiyat} raf={raf} /> : <div className="p-6 text-xs text-slate-400">Ürün seçin</div>}</div>
          <p className="text-xs text-slate-500">Termal yazıcıda yazdır penceresinde kağıt boyutunu etiket boyutuna, kenar boşluğunu "Yok" olarak ayarlayın. Barkod yoksa stok kodu basılır.</p>
        </div>
      </div>
    </Modal>
  );
}

