import { useMemo, useState } from 'react';
import { Car, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { aracAnalizi } from '../lib/analiz3';
import { para, sayi } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { YatayListe } from '../components/grafik';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

export default function AracAnalizi() {
  const { db, izin } = useStore(); const maliyet = izin('maliyet');
  const [d, setD] = useDonem();
  const a = useMemo(() => aracAnalizi(db, d), [db, d]);
  const [secili, setSecili] = useState<string | null>(null);
  const satan = a.markalar.filter((m) => m.ciro > 0);
  const m = a.markalar.find((x) => x.marka === secili) ?? satan[0] ?? null;
  const eslesen = a.toplam - a.bilinmeyen;
  const satisToplam = satan.reduce((t, x) => t + x.ciro, 0) || 1;

  return (
    <div>
      <SayfaBaslik baslik="Araç / Marka Analizi" alt="Hangi araç markalarına ve modellerine parça ve hizmet satıyorsunuz; stoğunuz bu dağılıma uyuyor mu?" />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Aracı tespit edilen satış" deger={`%${a.toplam ? ((eslesen / a.toplam) * 100).toFixed(0) : 0}`} alt={`${para(eslesen)} / ${para(a.toplam)}`} ikon={<Car size={16} />} renk="blue" />
        <Kpi etiket="En çok satılan marka" deger={satan[0]?.marka ?? '—'} alt={satan[0] ? `${para(satan[0].ciro)} · %${((satan[0].ciro / satisToplam) * 100).toFixed(0)}` : undefined} />
        <Kpi etiket="Marka sayısı" deger={sayi(satan.length)} alt={`${a.markalar.length} markaya ait stok/satış`} />
        <Kpi etiket="Stokta markası belli ürün" deger={`%${a.stokToplam ? ((a.stokEslesen / a.stokToplam) * 100).toFixed(0) : 0}`} alt={maliyet ? `${para(a.stokEslesen)} maliyet` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="border-b border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">Markalar <span className="font-normal text-slate-500">· satır seçince modeller açılır</span></div>
          <div className="max-h-[60vh] overflow-auto">
            {a.markalar.length === 0 ? <Bos metin="Ürün veya müşteri adlarında araç markası bulunamadı." /> : (
              <table className="tbl"><thead><tr><th>Marka</th><th className="text-right">Satış</th><th className="text-right">Satış payı</th>{maliyet && <th className="text-right">Kâr</th>}<th className="text-right">Fiş</th><th className="text-right">Müşteri</th>{maliyet && <th className="text-right">Stok (maliyet)</th>}{maliyet && <th className="text-right">Stok payı</th>}</tr></thead>
                <tbody>{a.markalar.map((x) => {
                  const sp = (x.ciro / satisToplam) * 100, kp = a.stokEslesen ? (x.stokDeger / a.stokEslesen) * 100 : 0;
                  return (
                    <tr key={x.marka} className={`cursor-pointer ${m?.marka === x.marka ? 'bg-marka-50 dark:bg-marka-500/10' : ''}`} onClick={() => setSecili(x.marka)}>
                      <td className="font-medium">{x.marka}</td><td className="text-right">{x.ciro ? para(x.ciro) : '—'}</td><td className="text-right">%{sp.toFixed(1)}</td>
                      {maliyet && <td className="text-right">{x.kar ? para(x.kar) : '—'}</td>}<td className="text-right">{sayi(x.fis)}</td><td className="text-right">{sayi(x.musteri)}</td>
                      {maliyet && <td className="text-right">{x.stokDeger ? para(x.stokDeger) : '—'}<div className="text-[11px] text-slate-500">{x.stokCesit ? `${sayi(x.stokCesit)} çeşit` : ''}</div></td>}
                      {maliyet && <td className={`text-right font-medium ${kp > sp * 2 && kp > 3 ? 'text-amber-600' : sp > kp * 2 && sp > 3 ? 'text-sky-600' : ''}`} title={kp > sp * 2 ? 'Stok payı satış payından çok yüksek' : sp > kp * 2 ? 'Satış payı stok payından çok yüksek' : ''}>%{kp.toFixed(1)}</td>}
                    </tr>);
                })}</tbody></table>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {m && <div className="card p-4">
            <h3 className="mb-3 font-semibold">{m.marka} — modeller</h3>
            <YatayListe veri={m.modeller.map((x) => ({ ad: x.model, deger: x.ciro, alt: `${sayi(x.adet)} adet` }))} bicim={para} limit={10} bos="Bu dönemde satış yok" />
            <h3 className="mb-3 mt-5 font-semibold">{m.marka} — kategoriler</h3>
            <YatayListe veri={m.kategoriler.map((x) => ({ ad: x.ad, deger: x.ciro }))} bicim={para} limit={8} renk="bg-sky-500" bos="—" />
          </div>}
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>Araç iki yerden bulunur: müşteri adında plaka ve araç yazıyorsa ("AD / 34 ABC 12 / TOYOTA COROLLA") oradan, yoksa ürün adındaki uyumlu araçtan (ör. "W205" → Mercedes). Ürün adında birden çok araç geçiyorsa ilki alınır. <b className="text-amber-700">Turuncu</b> stok payı: o markaya satıştan çok daha fazla stok bağlanmış. <b className="text-sky-700">Mavi</b>: satış payı stoktan çok yüksek; stok artırılabilir.</span>
      </div>
    </div>
  );
}
