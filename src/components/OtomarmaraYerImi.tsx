import { useEffect, useRef, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { supabase } from '../lib/backend';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/baglanti';
import { toast } from '../lib/store';
import KOD from '../lib/otomarmara.js?raw';

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL;
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_ANON_KEY;
const kodu = (anahtar: string) => `(async(ANAHTAR,SUPA,ANON)=>{${KOD}\n})(${JSON.stringify(anahtar)},${JSON.stringify(URL_)},${JSON.stringify(ANON)}).catch(e=>alert('Otomarmara Muadil: '+e.message))`;

/** Otomarmara B4B'den ihtiyaç anında OEM / eşdeğer çeken yer imi. Kodun tamamı yer iminin içindedir. */
export function OtomarmaraYerImi() {
  const [anahtar, setAnahtar] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (anahtar) link.current?.setAttribute('href', 'javascript:' + encodeURIComponent(kodu(anahtar))); }, [anahtar]);
  const olustur = async () => {
    if (!supabase) return; setBekle(true);
    const { data, error } = await supabase.rpc('om_yer_imi_anahtari'); setBekle(false);
    if (error) toast('Hata: ' + error.message, 'hata'); else setAnahtar(data as string);
  };
  return (
    <div className="card p-5">
      <h3 className="mb-1 font-semibold">Otomarmara muadil / OEM bilgisi</h3>
      <p className="mb-3 text-sm text-slate-500">Bir ürünün muadili gerektiğinde (ürün kartı, biten stok, sipariş listesi) "Otomarmara'dan getir" deyin; Otomarmara B4B sekmesi açıkken bu yer imi o ürünü Otomarmara'da arar, OEM kodlarını ve eşdeğer ürünleri buraya kaydeder. Yalnız istenen ürünler sorgulanır; Otomarmara'da sepete ekleme veya sipariş yapılmaz, şifreniz hiçbir yerde saklanmaz.</p>
      {!anahtar ? <button className="btn-primary" onClick={olustur} disabled={bekle}><Bookmark size={16} /> {bekle ? 'Hazırlanıyor…' : 'Otomarmara düğmesini hazırla'}</button> : (
        <div className="space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
            <li>Turuncu düğmeyi Chrome'un yer imleri çubuğuna sürükleyin (eskisi varsa silin).</li>
            <li>b4b.otomarmara.com.tr'ye kendiniz giriş yapın, sonra yer imine bir kez tıklayın. Sağ altta kutu çıkar; sekme açık kaldıkça istekleri sırayla işler.</li>
            <li>Otomarmara oturumu kapanırsa kutu kırmızıya döner; yeniden girip tekrar tıklayın.</li>
          </ol>
          <a ref={link} onClick={(e) => { e.preventDefault(); toast('Bu düğmeye tıklamayın; yer imleri çubuğuna sürükleyin'); }}
            className="inline-flex cursor-grab items-center gap-2 rounded-lg bg-orange-700 px-4 py-2 font-semibold text-white"><Bookmark size={16} /> Otomarmara Muadil</a>
          <p className="text-xs text-slate-500">Yeni düğme hazırlayınca eskisi çalışmaz.</p>
        </div>
      )}
    </div>
  );
}
