import { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareText, Phone, Printer, XCircle } from 'lucide-react';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/baglanti';
import { para, tarih } from '../lib/format';

/** Müşterinin açtığı teklif sayfası (#t/KOD). Giriş gerektirmez; veriyi teklif-musteri fonksiyonundan alır.
 *  Alış fiyatı, tedarikçi ve personel bilgisi sunucudan hiç gelmez. */
type Kalem = { ad: string; marka: string | null; adet: number; fiyat: number; ekonomik: boolean; stokta: boolean | null };
type Teklif = { no: number; tarih: string; musteri: string | null; arac: string | null; kalemler: Kalem[]; toplam: number; gecerlilik: string | null;
  suresi_doldu: boolean; kapali: boolean; yanit: 'onay' | 'red' | 'revizyon' | null; yanit_not: string | null; yanit_zaman: string | null };
type Firma = { ad: string; telefon: string | null; adres: string | null };

const URL_ = `${(import.meta.env?.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL}/functions/v1/teklif-musteri`;
const KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_ANON_KEY;
const basliklar = { apikey: KEY, 'Content-Type': 'application/json' };
const YANIT_AD = { onay: 'Teklifi onayladınız', red: 'Teklifi reddettiniz', revizyon: 'Değişiklik istediniz' } as const;

export default function TeklifMusteri({ kod }: { kod: string }) {
  const [veri, setVeri] = useState<{ teklif: Teklif; firma: Firma } | null>(null);
  const [hata, setHata] = useState('');
  const [mod, setMod] = useState<'revizyon' | 'red' | null>(null);
  const [not, setNot] = useState('');
  const [gonder, setGonder] = useState(false);

  const oku = () => fetch(`${URL_}?kod=${encodeURIComponent(kod)}`, { headers: { apikey: KEY } }).then((r) => r.json())
    .then((j) => (j.ok ? setVeri({ teklif: j.teklif, firma: j.firma }) : setHata(j.hata || 'Teklif açılamadı')))
    .catch(() => setHata('Bağlantı hatası, lütfen tekrar deneyin'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { document.title = 'Fiyat teklifi'; oku(); }, [kod]);

  const yanitla = async (yanit: 'onay' | 'red' | 'revizyon') => {
    setGonder(true);
    try {
      const j = await fetch(URL_, { method: 'POST', headers: basliklar, body: JSON.stringify({ kod, yanit, not }) }).then((r) => r.json());
      if (!j.ok) { setHata(j.hata || 'Gönderilemedi'); return; }
      setMod(null); setNot(''); await oku();
    } catch { setHata('Bağlantı hatası, lütfen tekrar deneyin'); } finally { setGonder(false); }
  };

  if (!veri) return <div className="grid min-h-screen place-items-center bg-slate-50 p-4 text-sm text-slate-500">{hata || 'Teklif yükleniyor…'}</div>;
  const { teklif: t, firma: f } = veri;
  const acik = !t.kapali && !t.suresi_doldu;
  const tel = f.telefon?.replace(/[^\d+]/g, '');

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div><div className="text-lg font-bold">{f.ad}</div>{f.adres && <div className="text-xs text-slate-500">{f.adres}</div>}{f.telefon && <div className="text-xs text-slate-500">{f.telefon}</div>}</div>
          <div className="text-right"><div className="text-xs font-semibold tracking-wide text-slate-500">FİYAT TEKLİFİ</div><div className="text-sm">No {t.no} · {tarih(t.tarih)}</div>
            {t.gecerlilik && <div className={`text-xs ${t.suresi_doldu ? 'text-red-600' : 'text-slate-500'}`}>{t.suresi_doldu ? 'Süresi doldu' : `${tarih(t.gecerlilik)} tarihine kadar geçerli`}</div>}</div>
        </div>
        {(t.musteri || t.arac) && <div className="px-5 pt-4 text-sm">{t.musteri && <div>Sayın <b>{t.musteri}</b></div>}{t.arac && <div className="text-slate-600">Araç: {t.arac}</div>}</div>}
        <div className="divide-y divide-slate-100 px-5 py-3">
          {t.kalemler.map((k, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0"><div className="font-medium">{k.ad}</div>
                <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-slate-500">{k.marka && <span>{k.marka}</span>}
                  {k.ekonomik && <span className="rounded bg-sky-50 px-1.5 text-sky-700">ekonomik seçenek</span>}
                  {k.stokta === true && <span className="rounded bg-emerald-50 px-1.5 text-emerald-700">stokta</span>}
                  {k.stokta === false && <span className="rounded bg-amber-50 px-1.5 text-amber-700">sipariş ile</span>}</div></div>
              <div className="shrink-0 text-right"><div className="font-semibold">{para(k.adet * k.fiyat)}</div>{k.adet > 1 && <div className="text-xs text-slate-500">{k.adet} × {para(k.fiyat)}</div>}</div>
            </div>))}
        </div>
        <div className="flex items-baseline justify-between border-t border-slate-200 px-5 py-4"><span className="text-sm text-slate-500">Toplam (KDV dahil)</span><span className="text-2xl font-bold">{para(t.toplam)}</span></div>
        {t.kalemler.some((k) => k.ekonomik) && <p className="px-5 pb-2 text-xs text-slate-500">“Ekonomik seçenek” işaretli kalemler alternatif üründür; hangisini istediğinizi not olarak yazabilirsiniz.</p>}

        <div className="border-t border-slate-100 p-5 print:hidden">
          {hata && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</div>}
          {t.yanit && <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${t.yanit === 'onay' ? 'bg-emerald-50 text-emerald-800' : t.yanit === 'red' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'}`}>
            <b>{YANIT_AD[t.yanit]}</b>{t.yanit_zaman ? ` · ${tarih(t.yanit_zaman)}` : ''}{t.yanit_not && <div className="mt-1 whitespace-pre-wrap">“{t.yanit_not}”</div>}
            {acik && <div className="mt-1 text-xs opacity-75">Fikrinizi değiştirdiyseniz aşağıdan yeniden yanıtlayabilirsiniz.</div>}</div>}
          {!acik ? <div className="text-sm text-slate-500">{t.kapali ? 'Bu teklif kapatılmış.' : 'Bu teklifin süresi dolmuş; güncel fiyat için bizi arayın.'}</div> : mod ? (
            <div className="space-y-2">
              <textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm" rows={3} maxLength={500} autoFocus value={not} onChange={(e) => setNot(e.target.value)}
                placeholder={mod === 'revizyon' ? 'Ne değişsin? (ör. ekonomik seçeneği istiyorum, adet 2 olsun…)' : 'İsterseniz nedenini yazın (isteğe bağlı)'} />
              <div className="flex justify-end gap-2"><button className="rounded-lg px-3 py-2 text-sm text-slate-600" onClick={() => { setMod(null); setNot(''); }}>Vazgeç</button>
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={gonder || (mod === 'revizyon' && !not.trim())} onClick={() => yanitla(mod)}>Gönder</button></div>
            </div>) : (
            <div className="grid gap-2 sm:grid-cols-3">
              <button className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={gonder} onClick={() => yanitla('onay')}><CheckCircle2 size={17} /> Onaylıyorum</button>
              <button className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800" onClick={() => setMod('revizyon')}><MessageSquareText size={17} /> Değişiklik iste</button>
              <button className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600" onClick={() => setMod('red')}><XCircle size={17} /> İstemiyorum</button>
            </div>)}
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-slate-500">
            {tel && <a className="inline-flex items-center gap-1 hover:text-slate-900" href={`tel:${tel}`}><Phone size={15} /> Ara</a>}
            <button className="inline-flex items-center gap-1 hover:text-slate-900" onClick={() => window.print()}><Printer size={15} /> Yazdır / PDF</button>
          </div>
        </div>
        <p className="px-5 pb-4 text-center text-[11px] text-slate-400">Fiyatlar stok durumuna göre değişebilir.</p>
      </div>
    </div>
  );
}
