import { useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { ara, gunu, para, sayi, tarihSaat } from '../lib/format';
import { donemde, hareketTutar } from '../lib/analiz';
import type { Hareket } from '../lib/types';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';
import { MusteriLink, UrunLink } from '../components/DetayKart';

export default function Hareketler() {
  const { db, calistir } = useStore();
  const [d, setD] = useDonem();
  const [tur, setTur] = useState<'' | 'satis' | 'alis'>('');
  const [q, setQ] = useState('');
  const [yokSay, setYokSay] = useState(false);
  const [goster, setGoster] = useState(300);
  const urun = useMemo(() => new Map(db.urunler.map((u) => [u.id, u])), [db.urunler]);
  const a = db.ayarlar;

  // iade belgeleri (satış iadesi: müşteriden geri, alış iadesi: tedarikçiye) listede gösterilir, toplamlara katılmaz
  const iadeSet = useMemo(() => new Set<Hareket>(db.iadeler ?? []), [db.iadeler]);
  const tum = useMemo(() => [...db.hareketler, ...(db.iadeler ?? [])].sort((x, y) => y.tarih.localeCompare(x.tarih)), [db.hareketler, db.iadeler]);
  const liste = useMemo(() => tum.filter((h) => donemde(h.tarih, d) && (!tur || h.tur === tur) && (yokSay || !h.yok_say) &&
    (!q.trim() || (() => { const u = urun.get(h.urun_id); return ara(q, u?.ad ?? h.urun_ad, u?.kod, u?.barkod, u?.marka, u?.kategori); })())), [tum, d, tur, q, yokSay, urun]);
  const top = useMemo(() => {
    let ciro = 0, kar = 0, adet = 0, alis = 0, alAdet = 0, iadeSatis = 0, iadeAlis = 0, iadeSay = 0;
    for (const h of liste) {
      if (h.yok_say) continue;
      if (iadeSet.has(h)) { iadeSay++; if (h.tur === 'satis') iadeSatis += h.miktar * h.satis_fiyati; else iadeAlis += h.miktar * h.alis_fiyati; continue; }
      if (h.tur === 'satis') { const x = hareketTutar(h, a); ciro += x.ciro; kar += x.kar; adet += h.miktar; }
      else { alis += h.miktar * h.alis_fiyati; alAdet += h.miktar; }
    }
    return { ciro, kar, adet, alis, alAdet, iadeSatis, iadeAlis, iadeSay };
  }, [liste, a, iadeSet]);
  const yokSayilan = db.hareketler.filter((h) => h.yok_say && donemde(h.tarih, d)).length;

  const degistir = (h: Hareket) => calistir(() => backend.update<Hareket>('hareketler', h.id, { yok_say: !h.yok_say }), h.yok_say ? 'Hareket hesaba katıldı' : 'Hareket hesaplardan çıkarıldı');
  const csv = () => {
    const sat = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [sat(['Tarih', 'Tür', 'Stok kodu', 'Ürün', 'Marka', 'Miktar', 'Önceki stok', 'Sonraki stok', 'Satış fiyatı', 'Alış fiyatı', 'Tutar', 'Kâr (KDV hariç)', 'Hesap dışı']),
      ...liste.map((h) => { const u = urun.get(h.urun_id); const x = hareketTutar(h, a); return sat([tarihSaat(h.tarih), (iadeSet.has(h) ? (h.tur === 'satis' ? 'Satış iadesi' : 'Alış iadesi') : h.tur === 'satis' ? 'Satış' : 'Alış'), u?.kod, u?.ad, u?.marka, h.miktar, h.onceki, h.sonraki, h.satis_fiyati, h.alis_fiyati, h.tur === 'satis' ? x.ciro.toFixed(2) : (h.miktar * h.alis_fiyati).toFixed(2), h.tur === 'satis' ? x.kar.toFixed(2) : '', h.yok_say ? 'Evet' : '']); })].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = `hareketler-${d.bas}-${d.bit}.csv`; el.click();
  };

  return (
    <div>
      <SayfaBaslik baslik="Satışlar & Alışlar" alt={db.bh_durum?.rapor_son ? `${db.bh_durum.rapor_son.split('-').reverse().join('.')} tarihine kadar BizimHesap faturalarından (gerçek), sonrası stok değişiminden (tahmini)` : "BizimHesap'taki stok değişimlerinden otomatik çıkarılır"}>
        <button className="btn-ghost" onClick={csv} disabled={!liste.length}><Download size={16} /> Excel (CSV)</button>
      </SayfaBaslik>
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Satış tutarı (KDV dahil)" deger={para(top.ciro)} alt={`${sayi(top.adet)} adet`} renk="green" />
        <Kpi etiket="Brüt kâr (KDV hariç)" deger={para(top.kar)} renk={top.kar >= 0 ? 'green' : 'red'} />
        <Kpi etiket="Alış tutarı (KDV hariç)" deger={para(top.alis)} alt={`${sayi(top.alAdet)} adet giriş`} renk="blue" />
        <Kpi etiket="Hareket" deger={sayi(liste.length)} alt={[top.iadeSay ? `${top.iadeSay} iade (satış iadesi ${para(top.iadeSatis)}, alış iadesi ${para(top.iadeAlis)}) toplamlara katılmadı` : '', yokSayilan ? `${yokSayilan} hareket hesap dışı` : ''].filter(Boolean).join(' · ') || 'Tümü hesapta'} />
      </div>
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span><b>Fatura</b> etiketli satırlar BizimHesap'ın ürün alış-satış raporundan gelir: gerçek tutar, iskonto ve maliyet. <b>Tahmini</b> satırlar rapor aktarılmamış günlerde stok değişiminden çıkarılır: stok düşünce satış, artınca alış sayılır, tutar liste fiyatıdır. Tahmini satırlarda sayım ya da düzeltme varsa o satırdaki <b>"Hesap dışı"</b> kutusunu işaretleyin; raporlardan çıkarılır. <b>İade</b> belgeleri (satış iadesi ve tedarikçiye alış iadesi) turuncu etiketle listelenir, satış/alış toplamlarına katılmaz. Depolar arası transfer toplam stoğu değiştirmediği için hareket oluşturmaz.</span>
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-xs" placeholder="Ürün adı, kod, marka…" value={q} onChange={(e) => { setQ(e.target.value); setGoster(300); }} />
          <select className="inp w-36" value={tur} onChange={(e) => setTur(e.target.value as typeof tur)}><option value="">Tümü</option><option value="satis">Satışlar</option><option value="alis">Alışlar</option></select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={yokSay} onChange={(e) => setYokSay(e.target.checked)} /> Hesap dışı olanları da göster</label>
          <span className="ml-auto text-xs text-slate-500">{liste.length} hareket</span>
        </div>
        <div className="max-h-[62vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Bu dönemde hareket yok." /> : (
            <table className="tbl">
              <thead><tr><th>Tarih</th><th>Tür</th><th>Ürün</th><th className="text-right">Miktar</th><th className="text-right">Stok</th><th className="text-right">Birim fiyat</th><th className="text-right">Tutar</th><th className="text-right">Kâr</th><th className="text-center">Hesap dışı</th></tr></thead>
              <tbody>{liste.slice(0, goster).map((h) => {
                const u = urun.get(h.urun_id); const x = hareketTutar(h, a); const iade = iadeSet.has(h);
                return (
                  <tr key={h.id} className={h.yok_say ? 'opacity-40' : ''}>
                    <td className="whitespace-nowrap text-slate-500">{gunu(h.tarih) === gunu() ? 'Bugün ' + new Date(h.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : tarihSaat(h.tarih)}</td>
                    <td><span className={`rozet ${iade ? 'bg-amber-50 text-amber-700' : h.tur === 'satis' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{iade ? (h.tur === 'satis' ? 'Satış iadesi' : 'Alış iadesi') : h.tur === 'satis' ? 'Satış' : 'Alış'}</span><div className={`mt-0.5 text-[10px] ${h.kaynak === 'fatura' ? 'text-slate-500' : 'text-amber-600'}`}>{h.kaynak === 'fatura' ? 'Fatura' : 'Tahmini'}</div></td>
                    <td><div className="font-medium"><UrunLink id={h.urun_id}>{u?.ad ?? h.urun_ad ?? 'Bilinmeyen ürün'}</UrunLink></div><div className="text-xs text-slate-500">{[u?.kod, u?.marka].filter(Boolean).join(' · ')}{h.cari_ad && <> · {h.tur === 'satis' ? <MusteriLink guid={h.cari_guid} ad={h.cari_ad} /> : h.cari_ad}</>}</div></td>
                    <td className="text-right font-medium">{(h.tur === 'satis') !== iade ? '−' : '+'}{sayi(h.miktar)}</td>
                    <td className="whitespace-nowrap text-right text-xs text-slate-500">{h.onceki != null ? `${sayi(h.onceki)} → ${sayi(h.sonraki ?? 0)}` : ''}</td>
                    <td className="text-right">{para(h.tur === 'satis' ? h.satis_fiyati : h.alis_fiyati)}</td>
                    <td className={`text-right font-semibold ${iade ? 'text-amber-700' : ''}`}>{para(h.tur === 'satis' ? x.ciro : h.miktar * h.alis_fiyati)}</td>
                    <td className={`text-right ${h.tur !== 'satis' || iade ? '' : x.maliyetYok ? 'text-slate-400' : x.kar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{h.tur === 'satis' && !iade ? (x.maliyetYok ? 'maliyet yok' : para(x.kar)) : ''}</td>
                    <td className="text-center">{h.kaynak === 'fatura' ? <span className="text-slate-300">—</span> : <input type="checkbox" checked={h.yok_say} onChange={() => degistir(h)} title="Sayım, düzeltme veya iade ise işaretleyin" />}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
          {liste.length > goster && <div className="p-3 text-center"><button className="btn-ghost text-xs" onClick={() => setGoster((g) => g + 500)}>Daha fazla göster ({liste.length - goster})</button></div>}
        </div>
      </div>
    </div>
  );
}
