import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../lib/backend';
import { useStore, toast } from '../lib/store';
import { tarihSaat, sayi } from '../lib/format';
import { stokluMu } from '../lib/analiz';

type Durum = { son_calisma: string | null; son_hata: string | null; islenen: number | null };

/** Otomarmara muadil servisi (Supabase'de çalışır): durum ve kurulum */
export function OtomarmaraDurum() {
  const { db } = useStore();
  const [d, setD] = useState<Durum | null>(null);
  const [bekle, setBekle] = useState(false);
  const yukle = async () => { if (!supabase) return; const { data } = await supabase.from('om_durum').select('son_calisma,son_hata,islenen').eq('id', 1).maybeSingle(); setD(data as Durum | null); };
  useEffect(() => { yukle(); const t = setInterval(yukle, 20000); return () => clearInterval(t); }, []);
  const v = db.otomarmara_veri ?? [];
  const say = (x: string) => v.filter((y) => y.durum === x).length;
  // gece doldurma ilerlemesi: kodunda rakam olan stoklu ürünler
  const hedef = db.urunler.filter((u) => u.aktif && stokluMu(u) && /\d{3,}/.test(u.kod ?? ''));
  const vIds = new Set(v.filter((y) => y.durum !== 'istendi').map((y) => String(y.urun_id)));
  const biten = hedef.filter((u) => vIds.has(String(u.id))).length;
  const dene = async () => {
    if (!supabase) return; setBekle(true);
    const { data, error } = await supabase.functions.invoke('otomarmara-muadil', { body: { zorla: true } }); setBekle(false);
    if (error) toast('Hata: ' + error.message, 'hata'); else toast((data as { hata?: string; islenen?: number })?.hata ? 'Otomarmara: ' + (data as { hata?: string }).hata : `Otomarmara: ${(data as { islenen?: number })?.islenen ?? 0} ürün işlendi`);
    yukle();
  };
  return (
    <div className="card p-5">
      <h3 className="mb-1 font-semibold">Otomarmara muadil / OEM servisi</h3>
      <p className="mb-3 text-sm text-slate-500">"Otomarmara'dan getir" denen ürünler Supabase'de çalışan servis tarafından Otomarmara B4B'de aranır; OEM kodları ve eşdeğer ürünler buraya kaydedilir. İstenen ürünler hemen, diğer stok kartları her gece 150'şer ürün olarak yavaş yavaş sorgulanır. Otomarmara'da sepete ekleme veya sipariş yapılmaz.</p>
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-xs text-slate-500">Alınan</div><b>{sayi(say('tamam'))}</b></div>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-xs text-slate-500">Sırada</div><b>{sayi(say('istendi'))}</b></div>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-xs text-slate-500">Bulunamayan</div><b>{sayi(say('bulunamadi'))}</b></div>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-xs text-slate-500">Son çalışma</div><b className="text-xs">{d?.son_calisma ? tarihSaat(d.son_calisma) : '—'}</b></div>
      </div>
      <div className="mb-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="mb-1 flex justify-between"><span>Tüm stok kartları (her gece 02:00'de 150 ürün sıraya girer)</span><b>{sayi(biten)} / {sayi(hedef.length)}</b></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-orange-500" style={{ width: `${hedef.length ? (biten / hedef.length) * 100 : 0}%` }} /></div>
      </div>
      {d?.son_hata && <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{d.son_hata}</p>}
      <details className="mb-3 text-xs text-slate-600 dark:text-slate-300" open={!!d?.son_hata && /girilmemiş|başarısız/.test(d.son_hata)}>
        <summary className="cursor-pointer font-medium">Kurulum: Otomarmara giriş bilgileri</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>supabase.com → projeniz → <b>Edge Functions → Secrets</b> sayfasını açın.</li>
          <li>Şu üç değeri ekleyin (Otomarmara giriş ekranındaki bilgiler): <code>OM_MUSTERI_KODU</code>, <code>OM_KULLANICI</code>, <code>OM_SIFRE</code>.</li>
          <li>Kaydedin, sonra aşağıdaki "Şimdi dene" düğmesine basın.</li>
        </ol>
        <p className="mt-1">Şifre yalnız Supabase'in gizli değerlerinde durur; sitede ve tarayıcıda görünmez. Giriş başarısız olursa hesabınız kilitlenmesin diye servis 30 dakika bekler.</p>
      </details>
      <button className="btn-ghost text-sm" onClick={dene} disabled={bekle || !say('istendi')} title={say('istendi') ? '' : 'Sırada ürün yok'}><RefreshCw size={15} /> {bekle ? 'Çalışıyor…' : 'Şimdi dene'}</button>
    </div>
  );
}
