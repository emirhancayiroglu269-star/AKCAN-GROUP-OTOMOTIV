/** AKCAN stok defteri (Faz 1, yalnız test sitesi): hareket tablosu ve ürün kartındaki "AKCAN stoku" bölümü */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { para, sayi, tarihSaat } from '../lib/format';
import { belgeApi, urunDurumu, TUR_KISA, type DefterSatir } from '../lib/belge';

const kisaEposta = (e?: string | null) => (e ? e.split('@')[0] : '—');

export function HareketTablosu({ l, yonetici, urunAdi, depoAdi, belgeNo = true }: { l: DefterSatir[]; yonetici: boolean; urunAdi?: (id: string) => string; depoAdi: (id: string) => string; belgeNo?: boolean }) {
  return (
    <div className="overflow-x-auto"><table className="tbl text-xs">
      <thead><tr><th>Zaman</th>{belgeNo && <th>Belge</th>}{urunAdi && <th>Ürün</th>}<th>Depo</th><th className="text-right">Miktar</th><th className="text-right">Önce → sonra</th>
        {yonetici && <><th className="text-right">Birim</th><th className="text-right">Tutar</th><th className="text-right">Ort. maliyet</th></>}<th>Kim</th></tr></thead>
      <tbody>{l.map((h) => (
        <tr key={h.id} className={h.islem === 'iptal' ? 'bg-red-50/60 dark:bg-red-500/5' : ''}>
          <td className="whitespace-nowrap">{tarihSaat(h.zaman)}</td>
          {belgeNo && <td className="whitespace-nowrap font-mono">{h.belge_no}{h.islem === 'iptal' && <span className="rozet ml-1 bg-red-100 text-red-700">iptal</span>}</td>}
          {urunAdi && <td className="max-w-[16rem] truncate">{urunAdi(h.urun_id)}{!belgeNo && h.islem === 'iptal' && <span className="rozet ml-1 bg-red-100 text-red-700">ters kayıt</span>}</td>}
          <td>{depoAdi(h.depo_id)}</td>
          <td className={`text-right font-semibold ${h.miktar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{h.miktar > 0 ? '+' : ''}{sayi(h.miktar)}</td>
          <td className="whitespace-nowrap text-right">{sayi(h.onceki_miktar)} → {sayi(h.sonraki_miktar)}</td>
          {yonetici && <><td className="text-right">{h.birim_maliyet !== undefined ? para(h.birim_maliyet) : ''}</td><td className="text-right">{h.tutar !== undefined ? para(h.tutar) : ''}</td>
            <td className="whitespace-nowrap text-right">{h.ort_sonraki !== undefined ? para(h.ort_sonraki) : ''}</td></>}
          <td>{kisaEposta(h.kullanici)}</td>
        </tr>))}</tbody></table></div>
  );
}


/** ürün kartı: depo bazında AKCAN stoku (BizimHesap ile yan yana), ürün türü, (yöneticiye) ortalama maliyet ve son hareketler */
export function AkcanStokBolum({ urunId }: { urunId: string }) {
  const { db, rol } = useStore(); const yonetici = rol === 'yonetici';
  const [v, setV] = useState<{ bakiye: { depo_id: string; miktar: number }[]; hareket: DefterSatir[]; maliyet: { ort_maliyet: number; toplam_miktar: number; toplam_deger: number } | null; tur: 'stoklu' | 'hizmet' | 'belirsiz' } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    let iptal = false;
    (async () => {
      const [b, h, m, t] = await Promise.all([
        belgeApi.urunBakiye(urunId), belgeApi.urunHareketleri(urunId, yonetici, 30),
        yonetici ? belgeApi.urunMaliyet(urunId) : Promise.resolve(null), belgeApi.urunTuru(urunId)]);
      const u = db.urunler.find((x) => x.id === urunId);
      if (!iptal) setV({ bakiye: b, hareket: h, maliyet: m, tur: u ? urunDurumu(new Map(t ? [[urunId, t]] : []), u) : 'stoklu' });
    })().catch((e) => !iptal && setHata((e as Error).message));
    return () => { iptal = true; };
  }, [urunId, yonetici, db.urunler]);
  const depoAd = (id: string) => (db.depolar.find((d) => d.id === id)?.ad ?? '?').replace(/ DEPO$/i, '');
  if (hata) return <div className="text-xs text-red-600">AKCAN stoku okunamadı: {hata}</div>;
  if (!v) return <div className="text-xs text-slate-500"><Loader2 size={12} className="mr-1 inline animate-spin" />AKCAN stoku yükleniyor…</div>;
  const depolar = db.depolar.filter((d) => d.aktif);
  return (
    <div className="rounded-lg border border-dashed border-red-300 p-3 dark:border-red-500/40">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">AKCAN stoku <span className="rozet bg-red-100 text-red-700">deneme</span>
        <span className={`rozet ${v.tur === 'hizmet' ? 'bg-violet-100 text-violet-800' : v.tur === 'belirsiz' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{v.tur === 'hizmet' ? 'Hizmet: stok tutulmaz' : v.tur === 'belirsiz' ? 'Hizmet adayı: tür bekleniyor' : 'Stoklu ürün'}</span></div>
      {v.tur !== 'hizmet' && <div className="mb-2 overflow-x-auto"><table className="tbl text-sm">
        <thead><tr><th>Depo</th><th className="text-right">AKCAN</th><th className="text-right">BizimHesap</th><th className="text-right">Fark</th></tr></thead>
        <tbody>{depolar.map((d) => { const a = v.bakiye.find((x) => x.depo_id === d.id)?.miktar ?? 0; const b = Number(db.urun_depo_stok.find((x) => x.urun_id === urunId && x.depo_id === d.id)?.miktar ?? 0); const f = Math.round((a - b) * 1000) / 1000;
          return <tr key={d.id}><td>{depoAd(d.id)}</td><td className="text-right font-semibold">{sayi(a)}</td><td className="text-right">{sayi(b)}</td><td className={`text-right ${f ? 'font-semibold text-red-600' : 'text-slate-400'}`}>{f > 0 ? '+' : ''}{sayi(f)}</td></tr>; })}</tbody></table></div>}
      {yonetici && v.maliyet && v.tur !== 'hizmet' && <div className="mb-2 text-xs text-slate-600 dark:text-slate-400">Ağırlıklı ortalama maliyet <b>{para(v.maliyet.ort_maliyet)}</b> (KDV hariç) · stok değeri {para(v.maliyet.toplam_deger)}</div>}
      {v.hareket.length ? <HareketTablosu l={v.hareket} yonetici={yonetici} depoAdi={depoAd} /> : <div className="text-xs text-slate-500">AKCAN stok hareketi yok.</div>}
      {v.hareket.length > 0 && <div className="mt-1 text-[11px] text-slate-500">Son {v.hareket.length} hareket · {[...new Set(v.hareket.map((h) => TUR_KISA[h.tur]))].join(', ')}</div>}
    </div>
  );
}
