import { useMemo, useState } from 'react';
import { Check, Download, Info, MessageCircle, PackageMinus, Plus, Target, Undo2, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { ilkSatisGunu } from '../lib/analiz';
import { backend } from '../lib/backend';
import { ara, para, parse, sayi, tarih } from '../lib/format';
import { eritmeIlerleme, eritmeListesi, haftaBasi, type EritmeSatir } from '../lib/tahsilat';
import type { StokAksiyon, StokAksiyonTur } from '../lib/types';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

const AKSIYON: Record<StokAksiyonTur, { ad: string; aciklama: string; cls: string }> = {
  iade: { ad: 'Tedarikçiye iade', aciklama: '90–150 gün önce alınıp hiç satılmayanlar — iade/değişim isteyin', cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  kampanya: { ad: 'Kampanya', aciklama: 'Daha önce satılmış ama durmuş — maliyetine yakın fiyatla kampanya (oranı sağdan seçin)', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  toplu: { ad: 'Toplu satış', aciklama: 'Hiç satılmamış — diğer dükkânlara/ustalara maliyetine', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  siparis: { ad: 'Sipariş', aciklama: 'Alınacaklar sayfasından verilen sipariş (burada listelenmez)', cls: 'bg-sky-50 text-sky-700' },
  alma: { ad: 'Şimdilik alma', aciklama: 'Alınacaklar sayfasında gizlenen biten ürün (burada listelenmez)', cls: 'bg-slate-100 text-slate-600' },
  beklet: { ad: 'Beklet', aciklama: 'Bağlı para küçük — uğraşmaya değmez', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};
type Sekme = StokAksiyonTur | 'plan';

export default function StokEritme() {
  const { db, personel, calistir } = useStore();
  const [esik, setEsik] = useState(90);
  const [sekme, setSekme] = useState<Sekme>('iade');
  const [q, setQ] = useState('');
  const [hedefGir, setHedefGir] = useState(String(db.ayarlar.stok_eritme_hedef || ''));
  const [oran, setOran] = useState(db.ayarlar.kampanya_oran ?? 10);
  const oranKaydet = (v: number) => { setOran(v); if (v !== db.ayarlar.kampanya_oran) calistir(() => backend.ayarKaydet({ kampanya_oran: v })); };
  const liste = useMemo(() => eritmeListesi(db, esik, oran), [db, esik, oran]);
  const ilerleme = useMemo(() => eritmeIlerleme(db), [db]);
  const planli = useMemo(() => new Map(db.stok_aksiyon.filter((a) => a.durum !== 'vazgecildi' && a.aksiyon !== 'siparis' && a.aksiyon !== 'alma').map((a) => [a.urun_id, a])), [db.stok_aksiyon]);
  const toplam = liste.reduce((t, x) => t + x.deger, 0);
  const tumStok = db.urunler.filter((u) => u.aktif && u.stok > 0 && u.alis_fiyati > 0).reduce((t, u) => t + u.stok * (db.ayarlar.alis_kdv_haric ? u.alis_fiyati : u.alis_fiyati / (1 + u.kdv / 100)), 0);
  const grup = (t: StokAksiyonTur) => liste.filter((x) => x.oneri === t);
  const gorunen = sekme === 'plan' ? [] : grup(sekme).filter((x) => ara(q, x.u.ad, x.u.kod, x.u.marka, x.u.kategori, x.tedarikci));
  const hedef = db.ayarlar.stok_eritme_hedef || 0;
  const hb = haftaBasi();
  const buHaftaEriyen = ilerleme.satirlar.filter((x) => (x.a.guncelleme ?? x.a.olusturma ?? '') >= hb || x.azalan > 0).reduce((t, x) => t + x.eriyenDeger, 0);

  const planla = (x: EritmeSatir) => calistir(() => backend.insert<Partial<StokAksiyon>>('stok_aksiyon', { urun_id: x.u.id, aksiyon: x.oneri, fiyat: x.fiyat, tedarikci: x.tedarikci ?? null, durum: 'planlandi', baslangic_stok: x.stok, baslangic_deger: x.deger, kullanici: personel }), 'Plana eklendi');
  const topluPlanla = (l: EritmeSatir[]) => calistir(async () => { for (const x of l.filter((y) => !planli.has(y.u.id))) await backend.insert<Partial<StokAksiyon>>('stok_aksiyon', { urun_id: x.u.id, aksiyon: x.oneri, fiyat: x.fiyat, tedarikci: x.tedarikci ?? null, durum: 'planlandi', baslangic_stok: x.stok, baslangic_deger: x.deger, kullanici: personel }); }, 'Hepsi plana eklendi');
  const durumYap = (a: StokAksiyon, durum: StokAksiyon['durum']) => calistir(() => backend.update<StokAksiyon>('stok_aksiyon', a.id, { durum, guncelleme: new Date().toISOString() }), durum === 'yapildi' ? 'Yapıldı olarak işaretlendi' : durum === 'vazgecildi' ? 'Plandan çıkarıldı' : 'Güncellendi');

  const metin = (t: StokAksiyonTur, l: EritmeSatir[], ted?: string) => {
    if (t === 'iade') return [`Merhaba${ted ? ' ' + ted : ''}, ${db.ayarlar.firma_adi}. Aşağıdaki ürünler satılmadı; iade veya değişim yapabilir miyiz?`, '', ...l.map((x) => `• ${x.u.ad}${x.u.kod ? ` [${x.u.kod}]` : ''} — ${sayi(Math.min(x.stok, x.alinan ?? x.stok))} ${x.u.birim}${x.alisTarih ? ` (alış ${tarih(x.alisTarih + 'T12:00')})` : ''}`)].join('\n');
    if (t === 'kampanya') return [`${db.ayarlar.firma_adi} — KAMPANYALI ÜRÜNLER (stoklarla sınırlı)`, '', ...l.map((x) => `• ${x.u.ad}${x.u.marka ? ` (${x.u.marka})` : ''}: ${para(x.u.satis_fiyati)} yerine ${para(x.fiyat ?? 0)}`), '', db.ayarlar.telefon ?? ''].join('\n');
    return [`${db.ayarlar.firma_adi} — toplu satış listesi (maliyetine)`, '', ...l.map((x) => `• ${x.u.ad}${x.u.kod ? ` [${x.u.kod}]` : ''}${x.u.marka ? ` ${x.u.marka}` : ''} — ${sayi(x.stok)} adet × ${para(x.fiyat ?? 0)}`), '', 'İlgilenirseniz dönüş yapın.'].join('\n');
  };
  const csv = (l: EritmeSatir[]) => {
    const s = (a: (string | number | null | undefined)[]) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [s(['Öneri', 'Ürün', 'Stok kodu', 'Marka', 'Kategori', 'Stok', 'Maliyet (KDV hariç)', 'Bağlı para', 'Son satış', 'Mevcut satış fiyatı', 'Önerilen fiyat (KDV dahil)', 'Tedarikçi', 'Son alış']),
      ...l.map((x) => s([AKSIYON[x.oneri].ad, x.u.ad, x.u.kod, x.u.marka, x.u.kategori, x.stok, x.maliyet.toFixed(2), x.deger.toFixed(2), x.sonSatis ?? 'hiç', x.u.satis_fiyati, x.fiyat?.toFixed(2), x.tedarikci, x.alisTarih]))].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = `olu-stok-${sekme}.csv`; el.click();
  };
  const tedGruplar = useMemo(() => { const m = new Map<string, EritmeSatir[]>(); for (const x of grup('iade')) { const k = x.tedarikci ?? '—'; m.set(k, [...(m.get(k) ?? []), x]); } return [...m.entries()].map(([ad, l]) => ({ ad, l, deger: l.reduce((t, x) => t + x.deger, 0) })).sort((a, b) => b.deger - a.deger); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liste]);
  const tab = (s: Sekme, ad: string, n: number, deger?: number) => (
    <button key={s} onClick={() => setSekme(s)} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${sekme === s ? 'border-marka-500 bg-marka-50 ring-1 ring-marka-500 dark:bg-marka-500/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
      <div className="font-semibold">{ad}</div><div className="text-xs text-slate-500">{sayi(n)} ürün{deger != null ? ` · ${para(deger)}` : ''}</div>
    </button>
  );

  return (
    <div>
      <SayfaBaslik baslik="Ölü Stok Eritme" alt="Satılmayan stoğu paraya çevirmek için ürün bazında öneri: iade, kampanya, toplu satış — ve ilerleme takibi">
        <label className="flex items-center gap-1.5 text-sm">Kampanya fiyatı: maliyet +<select className="inp w-auto py-1.5" value={oran} onChange={(e) => oranKaydet(Number(e.target.value))}>{[0, 5, 10, 15, 20, 25].map((x) => <option key={x} value={x}>%{x}</option>)}</select></label>
        <select className="inp w-auto" value={esik} onChange={(e) => setEsik(Number(e.target.value))}><option value={60}>60 günden uzun satılmayan</option><option value={90}>90 günden uzun satılmayan</option><option value={180}>180 günden uzun satılmayan</option></select>
      </SayfaBaslik>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Satılmayan stok (maliyet)" deger={para(toplam)} alt={`${sayi(liste.length)} çeşit · tüm stoğun %${tumStok ? ((toplam / tumStok) * 100).toFixed(0) : 0}'i`} ikon={<PackageMinus size={16} />} renk="red" />
        <Kpi etiket="Plana alınan" deger={para(ilerleme.plan)} alt={`${sayi(ilerleme.satirlar.length)} ürün`} renk="blue" />
        <Kpi etiket="Paraya dönen (plandakilerden)" deger={para(ilerleme.eriyen)} alt={ilerleme.plan ? `planın %${((ilerleme.eriyen / ilerleme.plan) * 100).toFixed(0)}'i · stok azalmasına göre` : 'Ürünleri plana ekleyince ölçülür'} renk="green" />
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>Haftalık eritme hedefi</span><Target size={16} /></div>
          <div className="mt-2 text-2xl font-bold">{para(buHaftaEriyen)}</div>
          {hedef > 0 && <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (buHaftaEriyen / hedef) * 100)}%` }} /></div>}
          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">Hedef <input className="inp w-24 px-1.5 py-0.5 text-xs" inputMode="decimal" value={hedefGir} onChange={(e) => setHedefGir(e.target.value)} onBlur={() => parse(hedefGir) !== hedef && calistir(() => backend.ayarKaydet({ stok_eritme_hedef: parse(hedefGir) }), 'Hedef kaydedildi')} placeholder="₺" /></div>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        {(['iade', 'kampanya', 'toplu', 'beklet'] as StokAksiyonTur[]).map((t) => tab(t, AKSIYON[t].ad, grup(t).length, grup(t).reduce((s, x) => s + x.deger, 0)))}
        {tab('plan', 'Planım', ilerleme.satirlar.length, ilerleme.plan)}
      </div>

      {sekme === 'plan' ? (
        <div className="card">
          {ilerleme.satirlar.length === 0 ? <Bos metin="Henüz plana ürün eklenmedi. Diğer sekmelerden 'Plana ekle' ile başlayın." /> : (
            <div className="max-h-[65vh] overflow-auto"><table className="tbl"><thead><tr><th>Ürün</th><th>Aksiyon</th><th className="text-right">Fiyat</th><th className="text-right">Başlangıç → şimdi</th><th className="text-right">Paraya dönen</th><th>Durum</th><th /></tr></thead>
              <tbody>{ilerleme.satirlar.map(({ a, u, bas, simdi, eriyenDeger }) => (
                <tr key={a.id}><td><div className="font-medium">{u ? <UrunLink id={u.id}>{u.ad}</UrunLink> : 'Silinmiş ürün'}</div><div className="text-xs text-slate-500">{a.tedarikci ?? ''} · {tarih(a.olusturma)}{a.kullanici ? ` · ${a.kullanici}` : ''}</div></td>
                  <td><span className={`rozet ${AKSIYON[a.aksiyon].cls}`}>{AKSIYON[a.aksiyon].ad}</span></td><td className="text-right">{a.fiyat ? para(a.fiyat) : '—'}</td>
                  <td className="text-right">{sayi(bas)} → <b>{sayi(simdi)}</b></td><td className="text-right font-semibold text-emerald-700">{eriyenDeger ? para(eriyenDeger) : '—'}</td>
                  <td>{a.durum === 'yapildi' ? <span className="text-xs font-medium text-emerald-700">Yapıldı</span> : <span className="text-xs text-slate-500">Planlandı</span>}</td>
                  <td className="whitespace-nowrap text-right">{a.durum !== 'yapildi' && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => durumYap(a, 'yapildi')}><Check size={13} /> Yapıldı</button>} <button className="btn-ghost px-2 py-1 text-xs" onClick={() => durumYap(a, 'vazgecildi')} title="Plandan çıkar"><X size={13} /></button></td></tr>
              ))}</tbody></table></div>
          )}
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-500">{AKSIYON[sekme].aciklama}</p>
          {sekme === 'iade' && tedGruplar.length > 0 && (
            <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tedGruplar.slice(0, 9).map((g) => (
              <div key={g.ad} className="card p-3">
                <div className="mb-1 flex justify-between gap-2"><b className="truncate">{g.ad}</b><span className="shrink-0 text-xs text-slate-500">{g.l.length} ürün · {para(g.deger)}</span></div>
                <a className="btn-ghost mt-2 w-full text-xs" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(metin('iade', g.l, g.ad))}`}><MessageCircle size={14} /> İade talebi mesajı</a>
              </div>
            ))}</div>
          )}
          <div className="card">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
              <input className="inp max-w-xs" placeholder="Ürün, kod, marka, tedarikçi…" value={q} onChange={(e) => setQ(e.target.value)} />
              <span className="text-xs text-slate-500">{gorunen.length} ürün · {para(gorunen.reduce((t, x) => t + x.deger, 0))}</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button className="btn-ghost" disabled={!gorunen.length} onClick={() => csv(gorunen)}><Download size={16} /> CSV</button>
                {(sekme === 'kampanya' || sekme === 'toplu') && <a className={`btn-ghost ${gorunen.length ? '' : 'pointer-events-none opacity-50'}`} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(metin(sekme, gorunen.slice(0, 40)))}`}><MessageCircle size={16} /> {sekme === 'kampanya' ? 'Kampanya mesajı' : 'Toplu satış listesi'}</a>}
                {sekme !== 'beklet' && <button className="btn-primary" disabled={!gorunen.some((x) => !planli.has(x.u.id))} onClick={() => topluPlanla(gorunen.slice(0, 100))}><Plus size={16} /> İlk 100'ü plana ekle</button>}
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              {gorunen.length === 0 ? <Bos metin="Bu grupta ürün yok." /> : (
                <table className="tbl"><thead><tr><th>Ürün</th><th className="text-right">Stok</th><th>Son satış</th><th className="text-right">Bağlı para</th><th className="text-right">Satış fiyatı</th><th className="text-right">Önerilen</th><th>Neden</th><th /></tr></thead>
                  <tbody>{gorunen.slice(0, 500).map((x) => {
                    const p = planli.get(x.u.id);
                    return (
                      <tr key={x.u.id}><td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka, x.u.kategori].filter(Boolean).join(' · ')}</div></td>
                        <td className="text-right">{sayi(x.stok)}</td><td className="whitespace-nowrap text-xs text-slate-500">{x.sonSatis ? `${tarih(x.sonSatis + 'T12:00')} (${x.gecen} gün)` : 'hiç satılmadı'}</td>
                        <td className="text-right font-semibold">{para(x.deger)}</td><td className="text-right text-slate-500">{para(x.u.satis_fiyati)}</td>
                        <td className="text-right font-semibold">{x.fiyat != null && x.oneri !== 'iade' ? para(x.fiyat) : '—'}</td>
                        <td className="max-w-[260px] text-xs text-slate-500">{x.neden}</td>
                        <td className="whitespace-nowrap text-right">{p ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check size={13} /> Planda {p.durum === 'yapildi' ? '(yapıldı)' : ''}<button className="ml-1 text-slate-400 hover:text-red-600" onClick={() => durumYap(p, 'vazgecildi')} title="Plandan çıkar"><Undo2 size={13} /></button></span>
                          : x.oneri !== 'beklet' && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => planla(x)}><Plus size={13} /> Plana ekle</button>}</td></tr>
                    );
                  })}</tbody></table>
              )}
            </div>
          </div>
        </>
      )}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>Öneriler: bağlı parası ₺300'ün altındakiler "beklet"; son 150 günde faturayla alınmış olanlar "iade"; daha önce satılmış olanlar maliyetin %{oran} üstüne "kampanya" (KDV dahil, 5 TL'ye yuvarlanır, mevcut fiyatın üstüne çıkmaz); hiç satılmamış olanlar maliyetine "toplu satış". Plana eklediğiniz ürünlerde stok azaldıkça "paraya dönen" tutar kendiliğinden artar (stok BizimHesap'tan 3 dakikada bir gelir). Fiyat değişikliğini ve iadeyi BizimHesap'ta siz yaparsınız; program BizimHesap'a yazmaz. Satış verisi {ilkSatisGunu(db) ? tarih(ilkSatisGunu(db)! + 'T12:00') : 'takip başlangıcı'} tarihinden beri var; "hiç satılmadı" o tarihten beri demektir.</span>
      </div>
    </div>
  );
}
