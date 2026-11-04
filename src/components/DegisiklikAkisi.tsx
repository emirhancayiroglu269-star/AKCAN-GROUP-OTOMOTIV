import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, PackagePlus, Search, Tag, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { ara, para, sayi } from '../lib/format';
import { MusteriLink, UrunLink } from './DetayKart';
import type { Urun } from '../lib/types';

/** BizimHesap'ta neler değişti: eşitlemenin yakaladığı fiyat, stok, cari bakiye değişimleri ve yeni ürünler (zaman sırasıyla). */
type Tur = 'fiyat' | 'cikis' | 'giris' | 'cari' | 'yeni';
type Olay = { t: string; tur: Tur; urun?: Urun; cari?: { ad: string; guid: string; tur: string }; metin: string; ek?: string; ton?: 'iyi' | 'kotu' };

const DONEM = [{ id: 'bugun', ad: 'Bugün' }, { id: 'dun', ad: 'Dün' }, { id: 'hafta', ad: 'Son 7 gün' }] as const;
type Donem = (typeof DONEM)[number]['id'];
const TUR_AD: Record<Tur, string> = { fiyat: 'Fiyat', cikis: 'Stok çıkışı', giris: 'Stok girişi', cari: 'Cari bakiye', yeni: 'Yeni ürün' };
const TUR_RENK: Record<Tur, string> = {
  fiyat: 'bg-amber-100 text-amber-900', cikis: 'bg-sky-100 text-sky-900', giris: 'bg-emerald-100 text-emerald-900',
  cari: 'bg-violet-100 text-violet-900', yeni: 'bg-slate-200 text-slate-800',
};
const TUR_IKON: Record<Tur, typeof Tag> = { fiyat: Tag, cikis: ArrowDownRight, giris: ArrowUpRight, cari: Users, yeni: PackagePlus };

function aralik(d: Donem): [number, number] {
  const bas = new Date(); bas.setHours(0, 0, 0, 0); const b = bas.getTime();
  if (d === 'bugun') return [b, Infinity];
  if (d === 'dun') return [b - 864e5, b];
  return [b - 6 * 864e5, Infinity];
}
const yuzde = (eski: number, yeni: number) => (eski > 0 ? ` (${yeni >= eski ? '+' : ''}%${(((yeni - eski) / eski) * 100).toFixed(1).replace('.', ',')})` : '');
const saat = (t: string, cokGun: boolean) => new Date(t).toLocaleString('tr-TR', cokGun ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' });

export function DegisiklikAkisi() {
  const { db, izin } = useStore(); const maliyet = izin('maliyet');
  const [donem, setDonem] = useState<Donem>('bugun');
  const [filtre, setFiltre] = useState<Tur | 'hepsi'>('hepsi');
  const [q, setQ] = useState(''); const [kac, setKac] = useState(100);

  const { l: olaylar, duzeltme } = useMemo(() => {
    const [bas, bit] = aralik(donem); const ici = (t?: string | null) => { if (!t) return false; const x = new Date(t).getTime(); return x >= bas && x < bit; };
    const urun = new Map(db.urunler.map((u) => [String(u.id), u])); const l: Olay[] = [];
    for (const f of db.fiyat_gecmisi) {
      if (!ici(f.tarih)) continue; const u = urun.get(String(f.urun_id));
      const parca: string[] = []; let ton: Olay['ton'];
      if (f.satis_eski !== f.satis_yeni) { parca.push(`Satış ${para(f.satis_eski)} → ${para(f.satis_yeni)}${yuzde(f.satis_eski, f.satis_yeni)}`); ton = f.satis_yeni > f.satis_eski ? 'iyi' : 'kotu'; }
      if (maliyet && f.alis_eski !== f.alis_yeni) parca.push(`Alış ${para(f.alis_eski)} → ${para(f.alis_yeni)}${yuzde(f.alis_eski, f.alis_yeni)}`);
      if (parca.length) l.push({ t: f.tarih, tur: 'fiyat', urun: u, metin: parca.join(' · '), ton });
    }
    // Aynı ürünün aynı miktarda çıkıp 1 saat içinde geri girmesi (yanlış girilip silinen / iade alınan satış) birbirini götürür: ikisi de gösterilmez
    const stk = (db.stok_degisim ?? []).filter((h) => ici(h.tarih) && !h.yok_say).sort((x, y) => x.tarih.localeCompare(y.tarih));
    const esli = new Set<typeof stk[number]>();
    for (let i = 0; i < stk.length; i++) {
      const a = stk[i]; if (esli.has(a)) continue;
      for (let j = i + 1; j < stk.length; j++) {
        const b = stk[j]; if (new Date(b.tarih).getTime() - new Date(a.tarih).getTime() > 3600e3) break;
        if (!esli.has(b) && String(b.urun_id) === String(a.urun_id) && b.tur !== a.tur && Math.abs(b.miktar - a.miktar) < 0.001) { esli.add(a); esli.add(b); break; }
      }
    }
    const duzeltme = esli.size / 2;
    for (const h of stk) {
      if (esli.has(h)) continue; const u = urun.get(String(h.urun_id)); const cik = h.tur === 'satis';
      l.push({ t: h.tarih, tur: cik ? 'cikis' : 'giris', urun: u, metin: `${cik ? '−' : '+'}${sayi(h.miktar)} adet`, ek: h.onceki != null && h.sonraki != null ? `stok ${sayi(h.onceki)} → ${sayi(h.sonraki)}` : undefined });
    }
    if (maliyet) {
      const cari = new Map(db.cariler.map((c) => [String(c.id), c]));
      for (const c of db.cari_hareketler) {
        if (!ici(c.tarih) || !c.fark) continue; const k = cari.get(String(c.cari_id)); if (!k) continue;
        // müşteride bakiye artışı = veresiye satış, azalış = tahsilat; tedarikçide tersi
        const musteri = k.tur === 'musteri'; const artti = c.fark > 0;
        const ne = musteri ? (artti ? 'Borçlandı' : 'Tahsilat') : (artti ? 'Alacak arttı' : 'Ödeme');
        l.push({ t: c.tarih, tur: 'cari', cari: { ad: k.ad, guid: k.bh_id, tur: k.tur }, metin: `${ne} ${para(Math.abs(c.fark))}`, ek: `bakiye ${para(c.onceki)} → ${para(c.sonraki)}`, ton: musteri && !artti ? 'iyi' : undefined });
      }
    }
    // ilk eşitlemede bütün ürünler "yeni" görünmesin: takip başladıktan sonra açılanlar
    const takip = db.bh_durum?.takip_baslangic ? new Date(db.bh_durum.takip_baslangic).getTime() + 864e5 : 0;
    for (const u of db.urunler) if (u.olusturma && ici(u.olusturma) && new Date(u.olusturma).getTime() > takip)
      l.push({ t: u.olusturma, tur: 'yeni', urun: u, metin: `Satış ${para(u.satis_fiyati)}${maliyet ? ` · alış ${para(u.kart_alis ?? u.alis_fiyati)}` : ''}`, ek: u.marka ?? undefined });
    return { l: l.sort((a, b) => b.t.localeCompare(a.t)), duzeltme };
  }, [db, donem, maliyet]);

  const sayac = useMemo(() => {
    const s: Record<Tur, number> = { fiyat: 0, cikis: 0, giris: 0, cari: 0, yeni: 0 };
    for (const o of olaylar) s[o.tur]++;
    return s;
  }, [olaylar]);
  const adet = useMemo(() => olaylar.reduce((t, o) => (o.tur === 'cikis' ? t + Number(o.metin.replace(/[^\d]/g, '')) : t), 0), [olaylar]);
  const gorunen = useMemo(() => olaylar.filter((o) => (filtre === 'hepsi' || o.tur === filtre) && (!q || ara(q, o.urun?.ad, o.urun?.kod, o.urun?.marka, o.cari?.ad))), [olaylar, filtre, q]);
  const cokGun = donem === 'hafta';

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">BizimHesap'ta neler değişti</h3>
        <div className="ml-auto flex gap-1">{DONEM.map((d) => (
          <button key={d.id} className={`rounded px-2.5 py-1 text-sm ${donem === d.id ? 'bg-marka-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'}`} onClick={() => { setDonem(d.id); setKac(100); }}>{d.ad}</button>))}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button className={`rozet ${filtre === 'hepsi' ? 'ring-2 ring-marka-500' : ''} bg-slate-100 text-slate-700`} onClick={() => setFiltre('hepsi')}>Hepsi {sayi(olaylar.length)}</button>
        {(Object.keys(TUR_AD) as Tur[]).filter((t) => maliyet || t !== 'cari').map((t) => (
          <button key={t} className={`rozet ${TUR_RENK[t]} ${filtre === t ? 'ring-2 ring-marka-500' : ''} ${sayac[t] ? '' : 'opacity-50'}`} onClick={() => setFiltre(filtre === t ? 'hepsi' : t)}>
            {TUR_AD[t]} {sayi(sayac[t])}{t === 'cikis' && adet > 0 ? ` · ${sayi(adet)} adet` : ''}</button>))}
        <label className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="inp h-8 w-48 pl-7 text-sm" placeholder="Ürün, kod, cari…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {!gorunen.length ? <p className="py-4 text-center text-sm text-slate-500">{olaylar.length ? 'Aramaya uyan değişiklik yok.' : `${DONEM.find((d) => d.id === donem)!.ad} BizimHesap'ta değişiklik olmadı.`}</p> : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {gorunen.slice(0, kac).map((o, i) => {
            const Ikon = TUR_IKON[o.tur];
            return (
              <div key={i} className="flex items-start gap-3 py-2 text-sm">
                <span className={`${cokGun ? "w-20" : "w-12"} shrink-0 pt-0.5 text-xs tabular-nums text-slate-500`}>{saat(o.t, cokGun)}</span>
                <span className={`rozet shrink-0 ${TUR_RENK[o.tur]}`}><Ikon size={12} className="mr-0.5 inline" />{TUR_AD[o.tur]}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    {o.urun ? <UrunLink id={String(o.urun.id)}><b className="font-mono text-xs">{o.urun.kod}</b> {o.urun.ad}</UrunLink>
                      : o.cari ? <MusteriLink guid={o.cari.guid} ad={o.cari.ad}><b>{o.cari.ad}</b></MusteriLink> : <span className="text-slate-500">Silinmiş ürün</span>}
                    {o.cari?.tur === 'tedarikci' && <span className="ml-1 text-xs text-slate-500">(tedarikçi)</span>}
                  </div>
                  <div className={`text-xs ${o.ton === 'iyi' ? 'text-emerald-700' : o.ton === 'kotu' ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}>{o.metin}{o.ek && <span className="text-slate-500"> · {o.ek}</span>}</div>
                </div>
              </div>);
          })}
        </div>)}
      {gorunen.length > kac && <button className="btn-ghost mt-2 w-full justify-center text-sm" onClick={() => setKac((k) => k + 200)}>{sayi(gorunen.length - kac)} değişiklik daha göster</button>}
      {duzeltme > 0 && <p className="mt-2 text-xs text-slate-500">{sayi(duzeltme)} stok hareketi 1 saat içinde geri alındığı için (yanlış girilip silinen ya da iade alınan satış) gösterilmedi.</p>}
      <p className="mt-3 text-xs text-slate-500">Eşitleme her 2 dakikada BizimHesap'taki fiyat, stok ve bakiye farklarını yakalar. Stok çıkışı genelde satış, girişi alış demektir; aynı dakikada çıkıp giren ürün tek satır görünebilir.</p>
    </div>
  );
}
