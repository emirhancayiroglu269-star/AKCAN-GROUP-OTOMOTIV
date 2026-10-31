import { KodKopyala } from './KodKopyala';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Phone } from 'lucide-react';
import { useStore } from '../lib/store';
import { birimKar } from '../lib/analiz';
import { musteriKarti, mevsim, urunKarti } from '../lib/analiz3';
import { onerilenFiyat } from '../lib/analiz2';
import { gunu, para, sayi, tarih, telLink } from '../lib/format';
import { CubukGrafik } from './grafik';
import { muadilDetay, MUADIL_ESIK } from '../lib/muadil';
import { Modal } from './ui';
import { OtoparcasanLink } from './DisLink';
import { OtomarmaraBolum } from './OtomarmaraBolum';

type Detay = { tur: 'urun'; id: string } | { tur: 'musteri'; guid: string | null; ad: string };
let ac: ((d: Detay | null) => void) | null = null;
/** Herhangi bir sayfadan ürün ya da müşteri kartını açar */
export const detayAc = (d: Detay) => ac?.(d);

/** Tıklanınca kart açan ad (tablolarda kullanılır) */
export function UrunLink({ id, children }: { id: string; children: ReactNode }) {
  if (id.startsWith('yok:')) return <>{children}</>;
  return <button className="text-left hover:text-marka-600 hover:underline" onClick={(e) => { e.stopPropagation(); detayAc({ tur: 'urun', id }); }}>{children}</button>;
}
export function MusteriLink({ guid, ad, children }: { guid?: string | null; ad: string; children?: ReactNode }) {
  return <button className="text-left hover:text-marka-600 hover:underline" onClick={(e) => { e.stopPropagation(); detayAc({ tur: 'musteri', guid: guid ?? null, ad }); }}>{children ?? ad}</button>;
}

const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const ayEtiket = (k: string) => AY[Number(k.slice(5, 7)) - 1];
const Bilgi = ({ e, v, alt }: { e: string; v: ReactNode; alt?: ReactNode }) => (
  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60"><div className="text-[11px] text-slate-500">{e}</div><div className="font-bold">{v}</div>{alt && <div className="text-[11px] text-slate-500">{alt}</div>}</div>
);

function UrunIcerik({ id }: { id: string }) {
  const { db, izin } = useStore(); const maliyet = izin('maliyet');
  const k = useMemo(() => urunKarti(db, id), [db, id]);
  if (!k.u) return <div className="p-6 text-sm text-slate-500">Ürün bulunamadı.</div>;
  const u = k.u; const bk = birimKar(u, db.ayarlar); const ms = mevsim(u);
  const hedef = db.ayarlar.kategori_marj?.[u.kategori ?? ''] ?? db.ayarlar.hedef_marj ?? 35;
  const maliyetGuncel = Math.max(bk.alisNet, k.tedarikci.length ? Math.max(...k.alis.slice(0, 1).map((x) => x.alis_fiyati)) : 0);
  const oneri = onerilenFiyat(u, maliyetGuncel, hedef);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">{u.kod && <KodKopyala kod={u.kod} />}<span>{[u.barkod, u.marka, u.kategori, u.raf ? `Raf ${u.raf}` : '', k.arac ? `${k.arac.marka}${k.arac.model ? ' ' + k.arac.model : ''}` : ''].filter(Boolean).join(' · ')}</span><OtoparcasanLink u={u} /></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Bilgi e="Stok" v={sayi(u.stok)} alt={k.depo.filter((x) => x.miktar).map((x) => `${x.ad.replace(/ DEPO$/i, '')}: ${sayi(x.miktar)}`).join(' · ') || undefined} />
        <Bilgi e="Satış fiyatı (KDV dahil)" v={para(u.satis_fiyati)} alt={oneri && maliyet ? `Kategori hedefiyle (%${hedef}) önerilen ${para(oneri)}` : undefined} />
        {maliyet && <Bilgi e="Alış (KDV hariç) · marj" v={`${para(bk.alisNet)} · %${bk.marj.toFixed(0)}`} alt={`Birim kâr ${para(bk.kar)}`} />}
        <Bilgi e="Toplam satış" v={`${sayi(k.adet)} adet`} alt={`${para(k.ciro)}${maliyet ? ` · kâr ${para(k.kar)}` : ''}`} />
      </div>
      {ms && <div className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-500/10 dark:text-sky-200">Mevsimlik ürün ({ms.ad}): önümüzdeki ay talebin bu aya göre yaklaşık <b>{ms.katsayi >= 1 ? '%' + Math.round((ms.katsayi - 1) * 100) + ' artması' : '%' + Math.round((1 - ms.katsayi) * 100) + ' düşmesi'}</b> beklenir.</div>}
      {(() => { const m = muadilDetay(db)(u); return m.length ? (
        <div><div className="mb-1 text-sm font-semibold">Muadiller <span className="text-xs font-normal text-slate-500">(en az {MUADIL_ESIK} ortak OEM kodu olan, aynı kategorideki ürünler)</span></div>
          <div className="flex flex-wrap gap-1.5">{m.slice(0, 16).map(({ v, ortak }) => <span key={v.id} className={`rozet ${v.stok > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} title={`${ortak} ortak OEM kodu`}><UrunLink id={String(v.id)}>{v.kod || v.ad.slice(0, 24)}</UrunLink>&nbsp;· stok {sayi(v.stok)} · {ortak} OEM</span>)}</div></div>) : null; })()}
      <OtomarmaraBolum u={u} />
      <div><div className="mb-1 text-sm font-semibold">Aylık satış adedi</div><CubukGrafik veri={k.ay.map((x) => ({ etiket: ayEtiket(x.ay), deger: x.adet, alt: `${x.ay} · ${para(x.ciro)}` }))} bicim={(v) => `${sayi(v)} adet`} yukseklik={120} bos="Satış yok" /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-sm font-semibold">Tedarikçiler (ucuzdan pahalıya)</div>
          {k.tedarikci.length === 0 ? <div className="text-xs text-slate-400">Alış faturası yok</div> : <table className="tbl"><tbody>{k.tedarikci.map((t) => <tr key={t.ad}><td>{t.ad}<div className="text-[11px] text-slate-500">son alış {tarih(t.son + 'T12:00')}</div></td><td className="text-right">{sayi(t.adet)} adet</td>{maliyet && <td className="text-right font-medium">{para(t.tutar / t.adet)}<div className="text-[11px] text-slate-500">son {para(t.sonFiyat)}</div></td>}</tr>)}</tbody></table>}
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold">En çok alan müşteriler</div>
          {k.musteri.length === 0 ? <div className="text-xs text-slate-400">Cari satış yok</div> : <table className="tbl"><tbody>{k.musteri.map((m) => <tr key={m.ad}><td className="max-w-[220px] truncate"><MusteriLink ad={m.ad} /></td><td className="text-right">{sayi(m.adet)} adet</td></tr>)}</tbody></table>}
        </div>
      </div>
      <div>
        <div className="mb-1 text-sm font-semibold">Son satışlar</div>
        {k.satis.length === 0 ? <div className="text-xs text-slate-400">Satış yok</div> : <div className="max-h-56 overflow-auto"><table className="tbl"><tbody>{k.satis.map((h) => <tr key={h.id}><td className="whitespace-nowrap text-slate-500">{tarih(h.tarih)}</td><td className="max-w-[220px] truncate">{h.cari_ad ? <MusteriLink guid={h.cari_guid} ad={h.cari_ad} /> : '—'}</td><td className="text-right">{sayi(h.miktar)}</td><td className="text-right">{para(h.satis_fiyati)}</td><td className="text-right text-xs text-slate-500">{h.depo?.replace(/ DEPO$/i, '') ?? ''}</td></tr>)}</tbody></table></div>}
      </div>
      {k.fiyat.length > 0 && <div className="text-xs text-slate-500">Fiyat değişiklikleri: {k.fiyat.map((f) => `${tarih(f.tarih)} satış ${para(f.satis_eski)} → ${para(f.satis_yeni)}`).join(' · ')}</div>}
    </div>
  );
}

function MusteriIcerik({ guid, ad }: { guid: string | null; ad: string }) {
  const { db, izin } = useStore(); const maliyet = izin('maliyet');
  const k = useMemo(() => musteriKarti(db, guid, ad), [db, guid, ad]);
  const tel = k.cari?.telefon || k.vadesiGecen?.telefon;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        {tel && <a className="inline-flex items-center gap-1 text-marka-600 hover:underline" href={telLink(tel) ? `tel:+${telLink(tel)}` : '#'}><Phone size={14} /> {tel}</a>}
        {k.arac && <span>Araç: {k.arac.marka}{k.arac.model ? ' ' + k.arac.model : ''}</span>}
        {k.ilk && <span>İlk alış {tarih(k.ilk + 'T12:00')} · son alış {tarih(k.son + 'T12:00')}{k.aralik ? ` · ortalama ${k.aralik} günde bir` : ''}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Bilgi e="Toplam satış" v={para(k.ciro)} alt={`${k.belgeler.length} fiş`} />
        {maliyet && <Bilgi e="Bıraktığı brüt kâr" v={para(k.kar)} alt={k.ciro ? `satışın %${((k.kar / k.ciro) * 100).toFixed(0)}'i` : undefined} />}
        <Bilgi e="Bakiye (BizimHesap)" v={k.cari ? <span className={k.cari.bakiye > 0 ? 'text-amber-700' : ''}>{para(k.cari.bakiye)}</span> : '—'} alt={k.cari && k.cari.bakiye > 0 ? 'bize borçlu' : undefined} />
        <Bilgi e="Vadesi geçen" v={k.vadesiGecen ? <span className="text-red-600">{para(k.vadesiGecen.tutar)}</span> : 'yok'} alt={k.vadesiGecen?.gun ? `${k.vadesiGecen.gun} gün gecikme` : undefined} />
      </div>
      <div><div className="mb-1 text-sm font-semibold">Aylık alışverişi</div><CubukGrafik veri={k.ay.map((x) => ({ etiket: ayEtiket(x.ay), deger: x.ciro, alt: x.ay }))} bicim={para} yukseklik={110} bos="Satış yok" /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-sm font-semibold">En çok aldıkları</div>
          {k.urunler.length === 0 ? <div className="text-xs text-slate-400">—</div> : <table className="tbl"><tbody>{k.urunler.map((x) => <tr key={x.ad}><td className="max-w-[220px] truncate" title={x.ad}>{x.ad}</td><td className="text-right">{sayi(x.adet)}</td><td className="text-right">{para(x.ciro)}</td></tr>)}</tbody></table>}
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold">Ödemeleri (kasa/banka girişleri)</div>
          {k.tahsilat.length === 0 ? <div className="text-xs text-slate-400">Bu isimle eşleşen tahsilat bulunamadı.</div> : <>
            <table className="tbl"><tbody>{k.tahsilat.map((t) => <tr key={t.id}><td className="text-slate-500">{tarih(t.tarih + 'T12:00')}</td><td className="text-xs">{t.hesap}</td><td className="text-right font-medium">{para(t.giris)}</td></tr>)}</tbody></table>
            <div className="mt-1 text-xs text-slate-500">Toplam {para(k.tahsilatToplam)}</div></>}
        </div>
      </div>
      <div>
        <div className="mb-1 text-sm font-semibold">Fişleri</div>
        <div className="max-h-56 overflow-auto"><table className="tbl"><tbody>{k.belgeler.slice(0, 40).map((b, i) => <tr key={i}><td className="text-slate-500">{tarih(b.tarih)}{gunu(b.tarih) === gunu() ? ' (bugün)' : ''}</td><td>{b.kalem} kalem</td><td className="text-right font-medium">{para(b.tutar)}</td>{maliyet && <td className="text-right text-xs text-slate-500">kâr {para(b.kar)}</td>}</tr>)}</tbody></table></div>
      </div>
    </div>
  );
}

/** Uygulamada bir kez yerleştirilir; detayAc ile açılır */
export function DetayKartlari() {
  const [d, setD] = useState<Detay | null>(null);
  const { db } = useStore();
  useEffect(() => { ac = setD; return () => { ac = null; }; }, []);
  if (!d) return null;
  const baslik = d.tur === 'urun' ? db.urunler.find((u) => u.id === d.id)?.ad ?? 'Ürün' : d.ad;
  return (
    <Modal acik kapat={() => setD(null)} genis="xl" baslik={baslik}>
      {d.tur === 'urun' ? <UrunIcerik key={d.id} id={d.id} /> : <MusteriIcerik key={d.ad} guid={d.guid} ad={d.ad} />}
    </Modal>
  );
}
