import { useEffect, useRef, useState } from 'react';
import { Bookmark, Copy } from 'lucide-react';
import { supabase } from '../lib/backend';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/baglanti';
import { toast } from '../lib/store';
import AKTARIM from '../lib/aktarim.js?raw';

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL;
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_ANON_KEY;

/** Aktarım kodunun tamamı yer iminin/kopyalanan kodun içindedir; dışarıdan kod yüklenmez. */
const kodu = (anahtar: string, gun: number, oto = 0) =>
  `(async(ANAHTAR,SUPA,ANON,GUN,OTO)=>{${AKTARIM}\n})(${JSON.stringify(anahtar)},${JSON.stringify(URL_)},${JSON.stringify(ANON)},${gun},${oto}).catch(e=>alert('Analize Aktar: '+e.message))`;
const OTO_DK = 2;

export function AktarimYerImi() {
  const [anahtar, setAnahtar] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  const linkOto = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!anahtar) return;
    link.current?.setAttribute('href', 'javascript:' + encodeURIComponent(kodu(anahtar, 45)));
    linkOto.current?.setAttribute('href', 'javascript:' + encodeURIComponent(kodu(anahtar, 7, OTO_DK)));
  }, [anahtar]);

  const olustur = async () => {
    if (!supabase) return;
    setBekle(true);
    const { data, error } = await supabase.rpc('aktarim_yer_imi_anahtari');
    setBekle(false);
    if (error) toast('Hata: ' + error.message, 'hata'); else setAnahtar(data as string);
  };
  const kopyala = async (gun: number) => {
    if (!anahtar) return;
    try { await navigator.clipboard.writeText(kodu(anahtar, gun)); toast('Kod kopyalandı. BizimHesap sayfasında F12 → Console\'a yapıştırın.'); } catch { toast('Kopyalanamadı', 'hata'); }
  };

  return (
    <div className="card p-5">
      <h3 className="mb-1 font-semibold">BizimHesap aktarımı (faturalar, masraf, kasa, vadesi geçen)</h3>
      <p className="mb-3 text-sm text-slate-500">
        Bu veriler BizimHesap'ın resmi bağlantısında yok. BizimHesap'a kendiniz giriş yapmışken tek tıkla aktarılır. BizimHesap'ta hiçbir şey değiştirilmez, şifreniz hiçbir yerde saklanmaz.
      </p>
      {!anahtar ? (
        <button className="btn-primary" onClick={olustur} disabled={bekle}><Bookmark size={16} /> {bekle ? 'Hazırlanıyor…' : 'Aktarım düğmesini hazırla'}</button>
      ) : (
        <div className="space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
            <li>Yeşil düğmeleri Chrome'un yer imleri çubuğuna sürükleyin (eskileri silin; çubuk görünmüyorsa Ctrl+Shift+B).</li>
            <li><b>Analize Aktar</b>: son 45 günü bir kez aktarır (yaklaşık 1 dakika).</li>
            <li><b>Analize Aktar (otomatik)</b>: son 7 günü aktarır, sonra sekme açık kaldıkça her {OTO_DK} dakikada bir bugünün ve son 2 günün verilerini günceller. Yalnız değişiklik olunca yazar. BizimHesap oturumu kapanırsa kutu kırmızıya döner; yeniden girip tekrar tıklayın.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <a ref={link} onClick={(e) => { e.preventDefault(); toast('Bu düğmeye tıklamayın; yer imleri çubuğuna sürükleyin'); }}
              className="inline-flex cursor-grab items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
              <Bookmark size={16} /> Analize Aktar
            </a>
            <a ref={linkOto} onClick={(e) => { e.preventDefault(); toast('Bu düğmeye tıklamayın; yer imleri çubuğuna sürükleyin'); }}
              className="inline-flex cursor-grab items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">
              <Bookmark size={16} /> Analize Aktar (otomatik)
            </a>
            <button className="btn-ghost" onClick={() => kopyala(45)}><Copy size={16} /> Kodu kopyala (45 gün)</button>
            <button className="btn-ghost" onClick={() => kopyala(0)}><Copy size={16} /> Tüm geçmiş (16 Mart'tan)</button>
          </div>
          <p className="text-xs text-slate-500">Yer imi yerine kopyalanan kodu BizimHesap sayfasında F12 → Console'a yapıştırıp Enter ile de çalıştırabilirsiniz. Düğme bir yıl geçerlidir; yeniden hazırlarsanız eskisi çalışmaz.</p>
        </div>
      )}
    </div>
  );
}
