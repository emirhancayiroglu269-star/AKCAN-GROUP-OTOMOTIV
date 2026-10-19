import { useMemo, useState } from 'react';
import { Download, MessageCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { donemde } from '../lib/analiz';
import { gecisCarisi } from '../lib/analiz2';
import { ara, para, sayi, tarih, tarihSaat, telLink } from '../lib/format';
import type { Cari } from '../lib/types';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { Bos, Kpi, Modal, SayfaBaslik } from '../components/ui';

export default function Cariler() {
  const { db } = useStore();
  const [tur, setTur] = useState<Cari['tur'] | 'vadesi'>('musteri');
  const [q, setQ] = useState('');
  const [sadece, setSadece] = useState(true);
  const [d, setD] = useDonem();
  const [secili, setSecili] = useState<Cari | null>(null);

  const degisim = useMemo(() => {
    const m = new Map<string, { artis: number; azalis: number; son?: string }>();
    for (const h of db.cari_hareketler) {
      const x = m.get(h.cari_id) ?? { artis: 0, azalis: 0 };
      if (!x.son || h.tarih > x.son) x.son = h.tarih;
      if (donemde(h.tarih, d)) { if (h.fark > 0) x.artis += h.fark; else x.azalis += -h.fark; }
      m.set(h.cari_id, x);
    }
    return m;
  }, [db.cari_hareketler, d]);

  const hepsi = db.cariler.filter((c) => c.tur === tur);
  // araç alım/satım (proje) carileri müşteri toplamlarına katılmaz
  const gecis = tur === 'musteri' ? hepsi.filter((c) => gecisCarisi(db, c.bh_id) || gecisCarisi(db, c.ad)) : [];
  const sayilan = hepsi.filter((c) => !gecis.includes(c));
  const takipBas = db.cari_hareketler.reduce((m, h) => (!m || h.tarih < m ? h.tarih : m), '' as string);
  const takipNot = takipBas && takipBas.slice(0, 10) > d.bas ? ` · takip ${tarih(takipBas)} tarihinden beri` : '';
  const liste = hepsi.filter((c) => (!sadece || Math.abs(c.bakiye) > 0.009) && ara(q, c.ad, c.telefon, c.kod, c.vergi_no))
    .sort((a, b) => Math.abs(b.bakiye) - Math.abs(a.bakiye));
  const arti = sayilan.filter((c) => c.bakiye > 0).reduce((t, c) => t + c.bakiye, 0);
  const eksi = sayilan.filter((c) => c.bakiye < 0).reduce((t, c) => t + c.bakiye, 0);
  const donemArtis = sayilan.reduce((t, c) => t + (degisim.get(c.id)?.artis ?? 0), 0);
  const donemAzalis = sayilan.reduce((t, c) => t + (degisim.get(c.id)?.azalis ?? 0), 0);
  const csv = () => {
    const sat = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [sat(['Cari', 'Kod', 'Telefon', 'Vergi no', 'Bakiye', 'Çek/Senet']), ...liste.map((c) => sat([c.ad, c.kod, c.telefon, c.vergi_no, c.bakiye.toFixed(2), c.cek_senet.toFixed(2)]))].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = `${tur === 'musteri' ? 'musteri' : 'tedarikci'}-bakiyeleri.csv`; el.click();
  };

  return (
    <div>
      <SayfaBaslik baslik="Cari Bakiyeler" alt="BizimHesap'taki müşteri ve tedarikçi bakiyeleri; değişimleri otomatik izlenir">
        <button className="btn-ghost" onClick={csv}><Download size={16} /> Excel (CSV)</button>
      </SayfaBaslik>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['musteri', 'tedarikci'] as const).map((x) => (
          <button key={x} onClick={() => setTur(x)} className={`rounded-full px-4 py-1.5 text-sm ${tur === x ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>
            {x === 'musteri' ? 'Müşteriler' : 'Tedarikçiler'} <span className="opacity-60">{db.cariler.filter((c) => c.tur === x).length}</span>
          </button>
        ))}
      </div>
      {tur === 'vadesi' ? <VadesiGecenler /> : <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tur === 'musteri' ? <>
          <Kpi etiket="Müşterilerden alacağınız" deger={para(arti)} alt={`${sayilan.filter((c) => c.bakiye > 0).length} cari${gecis.length ? ` · ${gecis.map((c) => c.ad.replace(/\s*\/\s*$/, '')).join(', ')} (${para(gecis.reduce((t, c) => t + c.bakiye, 0))}) proje carisi, hariç` : ''}`} renk="amber" />
          <Kpi etiket="Müşteri carilerinde sizin borcunuz" deger={para(-eksi)} alt={`${sayilan.filter((c) => c.bakiye < 0).length} cari · avans, size yapılan iş veya borç para`} />
          <Kpi etiket="Dönemde alacak artışı" deger={para(donemArtis)} alt={`Veresiye satışlar${takipNot}`} renk="blue" />
          <Kpi etiket="Dönemde alacak azalışı" deger={para(donemAzalis)} alt={`Tahsilatlar${takipNot}`} renk="green" />
        </> : <>
          <Kpi etiket="Tedarikçilere borcunuz" deger={para(-eksi)} alt={`${hepsi.filter((c) => c.bakiye < 0).length} cari`} renk="red" />
          <Kpi etiket="Tedarikçide alacağınız" deger={para(arti)} alt={`${hepsi.filter((c) => c.bakiye > 0).length} cari · fazla ödeme veya iade`} />
          <Kpi etiket="Dönemde yeni borç" deger={para(donemAzalis)} alt={`Alış faturaları${takipNot}`} renk="blue" />
          <Kpi etiket="Dönemde ödenen" deger={para(donemArtis)} alt={`Tedarikçi ödemeleri${takipNot}`} renk="green" />
        </>}
      </div>
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-sm" placeholder="Cari adı, telefon, vergi no…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sadece} onChange={(e) => setSadece(e.target.checked)} /> Sadece bakiyesi olanlar</label>
          <span className="ml-auto text-xs text-slate-500">{liste.length} cari · {tur === 'musteri' ? 'artı bakiye = müşteri size borçlu, eksi = siz borçlusunuz' : 'eksi bakiye = siz borçlusunuz, artı = tedarikçide alacağınız var'}</span>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {liste.length === 0 ? <Bos metin={db.cariler.length ? 'Cari bulunamadı.' : 'Cari bilgisi henüz gelmedi; ilk eşitlemeden sonra burada görünür.'} /> : (
            <table className="tbl">
              <thead><tr><th>Cari</th><th>Telefon</th><th className="text-right">{tur === 'musteri' ? 'Dönemde satış' : 'Dönemde ödenen'}</th><th className="text-right">{tur === 'musteri' ? 'Dönemde tahsilat' : 'Dönemde alış'}</th><th>Son değişim</th><th className="text-right">Çek/Senet</th><th className="text-right">Bakiye</th><th className="w-10" /></tr></thead>
              <tbody>{liste.map((c) => {
                const g = degisim.get(c.id); const tel = telLink(c.telefon);
                return (
                  <tr key={c.id} className="cursor-pointer" onClick={() => setSecili(c)}>
                    <td><div className="font-medium">{c.ad}{gecis.includes(c) && <span className="rozet ml-1.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">proje carisi</span>}</div>{c.vergi_no && <div className="text-xs text-slate-500">VN {c.vergi_no}</div>}</td>
                    <td className="text-slate-500">{c.telefon}</td>
                    <td className={`text-right ${tur === 'musteri' ? 'text-slate-600' : 'text-emerald-700'}`}>{g?.artis ? para(g.artis) : ''}</td>
                    <td className={`text-right ${tur === 'musteri' ? 'text-emerald-700' : 'text-slate-600'}`}>{g?.azalis ? para(g.azalis) : ''}</td>
                    <td className="text-slate-500">{g?.son ? tarihSaat(g.son) : '—'}</td>
                    <td className="text-right text-slate-500">{c.cek_senet ? para(c.cek_senet) : ''}</td>
                    <td className={`text-right font-semibold ${(tur === 'musteri' ? c.bakiye > 0 : c.bakiye < 0) ? 'text-amber-700' : c.bakiye !== 0 ? 'text-sky-700' : 'text-slate-400'}`}>{para(c.bakiye)}</td>
                    <td onClick={(e) => e.stopPropagation()}>{tur === 'musteri' && tel && c.bakiye > 0 && !gecis.includes(c) && <a className="text-slate-400 hover:text-emerald-600" title="WhatsApp ile hatırlat" target="_blank" rel="noreferrer"
                      href={`https://wa.me/${tel}?text=${encodeURIComponent(`Merhaba ${c.ad}, ${db.ayarlar.firma_adi} cari hesabınızda ${para(c.bakiye)} bakiye bulunmaktadır. Bilginize sunarız.`)}`}><MessageCircle size={16} /></a>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      </div>
      </>}
      {secili && <CariDetay c={secili} kapat={() => setSecili(null)} />}
    </div>
  );
}

function CariDetay({ c, kapat }: { c: Cari; kapat: () => void }) {
  const { db } = useStore();
  const h = db.cari_hareketler.filter((x) => x.cari_id === c.id);
  return (
    <Modal acik kapat={kapat} baslik={c.ad} genis="lg">
      <div className="mb-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500">Bakiye</div><div className="text-xl font-bold">{para(c.bakiye)}</div></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500">Çek / senet</div><div className="text-xl font-bold">{para(c.cek_senet)}</div></div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800">{[c.telefon, c.eposta, c.vergi_dairesi && `${c.vergi_dairesi} VD`, c.vergi_no, c.adres].filter(Boolean).map((x, i) => <div key={i}>{x}</div>)}</div>
      </div>
      <h4 className="mb-2 text-sm font-semibold">Bakiye değişimleri ({sayi(h.length)})</h4>
      {h.length === 0 ? <Bos metin="Takip başladığından beri bakiye değişmedi." /> : (
        <table className="tbl"><thead><tr><th>Tarih</th><th className="text-right">Önceki</th><th className="text-right">Değişim</th><th className="text-right">Yeni bakiye</th></tr></thead>
          <tbody>{h.map((x) => <tr key={x.id}><td>{tarihSaat(x.tarih)}</td><td className="text-right text-slate-500">{para(x.onceki)}</td>
            <td className={`text-right font-medium ${x.fark > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{x.fark > 0 ? '+' : ''}{para(x.fark)}</td><td className="text-right">{para(x.sonraki)}</td></tr>)}</tbody></table>
      )}
      <p className="mt-3 text-xs text-slate-500">Fatura/tahsilat ayrıntısı BizimHesap'ın dış bağlantısında yok; burada bakiyedeki değişimler izlenir.</p>
    </Modal>
  );
}

function VadesiGecenler() {
  const { db } = useStore();
  const l = [...db.vadesi_gecen].sort((a, b) => b.tutar - a.tutar);
  const kova = [{ ad: '0–30 gün', min: 0, max: 30 }, { ad: '31–60 gün', min: 31, max: 60 }, { ad: '61–90 gün', min: 61, max: 90 }, { ad: '90+ gün', min: 91, max: 99999 }]
    .map((k) => { const x = l.filter((v) => (v.gun ?? 0) >= k.min && (v.gun ?? 0) <= k.max); return { ...k, adet: x.length, tutar: x.reduce((t, v) => t + v.tutar, 0) }; });
  const toplam = l.reduce((t, v) => t + v.tutar, 0);
  const tahsilat30 = db.kasa_akisi.filter((k) => k.tip === 'Tahsilat' && k.tarih >= new Date(Date.now() - 30 * 864e5).toLocaleDateString('sv')).reduce((t, k) => t + k.giris, 0);
  const cari = new Map(db.cariler.map((c) => [c.ad, c]));
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi etiket="Vadesi geçen toplam" deger={para(toplam)} alt={`${l.length} müşteri`} renk="amber" />
        {kova.map((k) => <Kpi key={k.ad} etiket={k.ad} deger={para(k.tutar)} alt={`${k.adet} müşteri`} renk={k.min > 60 ? 'red' : 'slate'} />)}
      </div>
      <div className="mb-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">Son 30 günde tahsilat: <b>{para(tahsilat30)}</b>{tahsilat30 > 0 ? ` · bu hızla vadesi geçenlerin tahsili yaklaşık ${Math.ceil(toplam / (tahsilat30 / 30))} gün sürer` : ''}. Liste BizimHesap "Vadesi Geçen Alacaklar" raporundan, son aktarım {tarih(l[0]?.yuklendi)}.</div>
      <div className="card"><div className="max-h-[60vh] overflow-auto">
        {l.length === 0 ? <Bos metin="Vadesi geçen alacak yok." /> : (
          <table className="tbl"><thead><tr><th>Müşteri</th><th>Telefon</th><th className="text-right">Geçen gün</th><th className="text-right">Vadesi geçen</th><th className="w-10" /></tr></thead>
            <tbody>{l.map((v) => { const tel = telLink(v.telefon || cari.get(v.cari)?.telefon); return (
              <tr key={v.id}><td className="font-medium">{v.cari}</td><td className="text-slate-500">{v.telefon || cari.get(v.cari)?.telefon}</td>
                <td className={`text-right ${(v.gun ?? 0) > 60 ? 'text-red-600' : (v.gun ?? 0) > 30 ? 'text-amber-600' : 'text-slate-500'}`}>{v.gun ?? '—'} gün</td>
                <td className="text-right font-semibold text-amber-700">{para(v.tutar)}</td>
                <td>{tel && <a className="text-slate-400 hover:text-emerald-600" target="_blank" rel="noreferrer" href={`https://wa.me/${tel}?text=${encodeURIComponent(`Merhaba ${v.cari.split('/')[0].trim()}, ${db.ayarlar.firma_adi} hesabınızda vadesi geçmiş ${para(v.tutar)} bakiye bulunmaktadır. Ödemenizi bekler, iyi günler dileriz.`)}`}><MessageCircle size={16} /></a>}</td></tr>
            ); })}</tbody></table>
        )}
      </div></div>
    </>
  );
}
