import { useEffect, useMemo, useState } from 'react';
import { Loader2, Truck } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend, type TedarikciFiyat } from '../lib/backend';
import { kodNorm, para, sayi } from '../lib/format';
import { muadilDetay, omGuvenilir } from '../lib/muadil';
import { detayAc } from './DetayKart';
import type { Urun } from '../lib/types';

export const TED_AD: Record<string, string> = { otomarmara: 'Otomarmara', neko: 'Neko', iron: 'Iron', basbug: 'Başbuğ', ozas: 'Özaş', dinamik: 'Dinamik' };
const TED_RENK: Record<string, string> = {
  otomarmara: 'bg-orange-100 text-orange-800', neko: 'bg-violet-100 text-violet-800', iron: 'bg-slate-200 text-slate-800',
  basbug: 'bg-sky-100 text-sky-800', ozas: 'bg-emerald-100 text-emerald-800', dinamik: 'bg-rose-100 text-rose-800',
};
/** "MAN-HU7020Z" → "HU7020Z" (tedarikçi önekini at) */
const govde = (k?: string | null) => kodNorm((k ?? '').replace(/^[A-Za-zÇĞİÖŞÜçğıöşü]{2,6}-/, ''));
const gunOnce = (z: string) => { const g = Math.floor((Date.now() - new Date(z).getTime()) / 864e5); return g <= 0 ? 'bugün' : g === 1 ? 'dün' : `${g} gün önce`; };

/** Bir ürünün (muadilleriyle) ya da aranan kodun bütün tedarikçi fiyatları, ucuzdan pahalıya.
 *  Kaynak: tedarikçi sitelerinden okunmuş son fiyatlar (Otomarmara, Neko, Iron, Başbuğ, Özaş). Yalnız yönetici görür. */
export function TedarikciFiyatlari({ u, kod, baslik = true }: { u?: Urun; kod?: string; baslik?: boolean }) {
  const { db } = useStore();
  const [veri, setVeri] = useState<TedarikciFiyat[] | null>(null); const [hata, setHata] = useState('');
  const muadiller = useMemo(() => (u ? muadilDetay(db)(u).map((m) => m.v) : []), [db, u]);
  const { kodlar, urunler } = useMemo(() => {
    const k = new Set<string>(); const ekle = (x?: string | null) => { if (!x) return; const n = kodNorm(x); if (n.length >= 4) k.add(n); const g = govde(x); if (g.length >= 4) k.add(g); };
    ekle(kod);
    if (u) {
      ekle(u.kod); for (const e of (u.etiket ?? '').split(',')) ekle(e);
      const guven = omGuvenilir(db).has(String(u.id));
      for (const r of db.urun_kodlari) if (String(r.urun_id) === String(u.id) && (r.tur !== 'OTOMARMARA' || guven)) ekle(r.kod);
    }
    return { kodlar: [...k].slice(0, 60), urunler: u ? [u.id, ...muadiller.map((m) => m.id)].map(String) : [] };
  }, [db, u, kod, muadiller]);
  const imza = kodlar.join(',') + '|' + urunler.join(',');
  useEffect(() => {
    if (!kodlar.length && !urunler.length) { setVeri([]); return; }
    let iptal = false; setVeri(null); setHata('');
    // yazım sürerken her harfte sorgu atılmasın
    const t = setTimeout(() => backend.tedarikciFiyatAra(kodlar, urunler).then((d) => { if (!iptal) setVeri(d); }, (e) => { if (!iptal) setHata((e as Error).message); }), 400);
    return () => { iptal = true; clearTimeout(t); };
  }, [imza]); // eslint-disable-line react-hooks/exhaustive-deps

  const urunId = useMemo(() => new Map(db.urunler.map((x) => [String(x.id), x])), [db.urunler]);
  const kodla = useMemo(() => { const m = new Map<string, Urun>(); for (const x of db.urunler) { const n = kodNorm(x.kod); if (n) m.set(n, x); } return m; }, [db.urunler]);
  const satirlar = useMemo(() => {
    // aynı tedarikçide aynı kod iki kaynaktan gelebilir (kart eşleşmesi + katalog): en yeni olan kalır
    const m = new Map<string, TedarikciFiyat & { bizde?: Urun }>();
    for (const x of veri ?? []) {
      const bizde = x.urun_id ? urunId.get(String(x.urun_id)) : kodla.get(kodNorm(x.kod));
      const anahtar = `${x.tedarikci}|${govde(x.kod) || x.urun_id}`;
      const e = m.get(anahtar);
      if (!e || new Date(x.zaman) > new Date(e.zaman)) m.set(anahtar, { ...x, marka: x.marka ?? bizde?.marka ?? null, ad: x.ad ?? bizde?.ad ?? null, bizde });
    }
    const eski = Date.now() - 30 * 864e5;
    return [...m.values()].filter((x) => new Date(x.zaman).getTime() > eski)
      .sort((a, b) => Number(b.stok_var === true) - Number(a.stok_var === true) || a.fiyat - b.fiyat);
  }, [veri, urunId, kodla]);

  // şüpheli: kart alışının 1,6 katından fazla ve başka tedarikçide ±%20 yakın fiyat yok (BizimHesap'a yazılacaklar listesine de girmez)
  const supheli = (x: (typeof satirlar)[number]) => {
    const urun = x.bizde ?? u; if (!urun) return false; const kart = urun.kart_alis ?? urun.alis_fiyati;
    return kart > 0 && x.fiyat > kart * 1.6 && !satirlar.some((o) => o !== x && o.tedarikci !== x.tedarikci && (o.bizde ?? u)?.id === urun.id && Math.abs(o.fiyat - x.fiyat) <= x.fiyat * 0.2);
  };
  const enUcuz = satirlar.find((x) => x.stok_var === true && !supheli(x));
  const kartAlis = u ? (u.kart_alis ?? u.alis_fiyati) : 0;
  if (veri && !satirlar.length && !hata) return baslik ? <p className="text-xs text-slate-500">Tedarikçilerde kayıtlı fiyat yok (son 30 gün). Eklenti açıkken tedarikçi sitesinde bu kodu arattığınızda burada görünür.</p> : null;
  return (
    <div>
      {baslik && <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
        <Truck size={14} className="text-marka-600" /><b>Tedarikçi fiyatları</b>
        <span className="text-slate-500">KDV hariç birim alış · stokta olanlar önde, ucuzdan pahalıya</span>
        {u && kartAlis > 0 && enUcuz && <span className={`ml-auto rounded px-1.5 py-0.5 ${enUcuz.fiyat < kartAlis * 0.97 ? 'bg-emerald-50 text-emerald-800' : enUcuz.fiyat > kartAlis * 1.03 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
          Kart alışımız {para(kartAlis)} · en ucuz stoklu {para(enUcuz.fiyat)} ({TED_AD[enUcuz.tedarikci] ?? enUcuz.tedarikci})</span>}
      </div>}
      {hata && <p className="text-xs text-red-600">{hata}</p>}
      {!veri && !hata && <p className="flex items-center gap-1 text-xs text-slate-500"><Loader2 size={12} className="animate-spin" /> Tedarikçi fiyatları okunuyor…</p>}
      {satirlar.length > 0 && <div className="overflow-x-auto">
        <table className="tbl text-sm">
          <thead><tr><th>Tedarikçi</th><th>Ürün</th><th className="text-center">Stok</th><th className="text-right">Alış</th><th className="text-right">KDV dahil</th>{u && <th className="text-right">Satışımıza göre</th>}<th className="text-right">Güncel</th></tr></thead>
          <tbody>{satirlar.slice(0, 40).map((x, i) => {
            const kdv = x.bizde?.kdv ?? u?.kdv ?? 20; const satis = x.bizde && x.bizde.id !== u?.id ? x.bizde.satis_fiyati : u?.satis_fiyati ?? 0;
            const marj = satis > 0 ? ((satis / (1 + kdv / 100) - x.fiyat) / (satis / (1 + kdv / 100))) * 100 : null;
            return (
              <tr key={i} className={x === enUcuz ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : ''}>
                <td className="whitespace-nowrap"><span className={`rozet ${TED_RENK[x.tedarikci] ?? 'bg-slate-100 text-slate-700'}`}>{TED_AD[x.tedarikci] ?? x.tedarikci}</span>{x === enUcuz && <div className="mt-0.5 text-[10px] font-semibold text-emerald-700">en ucuz stoklu</div>}{supheli(x) && <div className="mt-0.5 text-[10px] font-semibold text-red-600" title="Kart alışının 1,6 katından fazla ve başka tedarikçide yakın fiyat yok: birim (ör. 2 adet) ya da eşleşme hatası olabilir. BizimHesap'a yazılmaz.">şüpheli fiyat</div>}</td>
                <td className="min-w-[13rem]">
                  <div className="text-xs"><b>{x.kod}</b>{x.marka && <span className="text-slate-500"> · {x.marka}</span>}{x.eslesme === 'oem' && <span className="ml-1 rozet bg-sky-50 text-sky-700" title={`OEM: ${x.oem ?? ''}`}>OEM muadili</span>}</div>
                  {x.ad && <div className="truncate text-[11px] text-slate-500" title={x.ad}>{x.ad}</div>}
                  {x.bizde && <button className="text-[11px] text-marka-700 hover:underline" onClick={() => detayAc({ tur: 'urun', id: x.bizde!.id })}>bizde: {x.bizde.kod} · stok {sayi(x.bizde.stok)}</button>}
                </td>
                <td className="text-center text-xs">{x.stok_var === true ? <span className="text-emerald-700">{x.stok != null && x.stok > 0 ? sayi(x.stok) : 'var'}</span> : x.stok_var === false ? <span className="text-red-500">yok</span> : '—'}</td>
                <td className="text-right font-semibold">{para(x.fiyat)}</td>
                <td className="text-right text-xs text-slate-500">{para(x.fiyat * (1 + kdv / 100))}</td>
                {u && <td className={`text-right text-xs ${marj == null ? '' : marj < 15 ? 'text-red-600' : 'text-emerald-700'}`}>{marj == null ? '—' : `%${marj.toFixed(0)} marj`}</td>}
                <td className="whitespace-nowrap text-right text-[11px] text-slate-500">{gunOnce(x.zaman)}</td>
              </tr>);
          })}</tbody>
        </table>
      </div>}
    </div>
  );
}
