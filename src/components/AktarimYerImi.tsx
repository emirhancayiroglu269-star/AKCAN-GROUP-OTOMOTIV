import { useEffect, useRef, useState } from 'react';
import { Bookmark, Copy } from 'lucide-react';
import { supabase } from '../lib/backend';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/baglanti';
import { toast } from '../lib/store';

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL;
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_ANON_KEY;

/** Yer imi: asıl aktarım kodunu veritabanından alıp BizimHesap sayfasında çalıştırır (kod güncellenince yer imi değişmez). */
const yukleyici = (anahtar: string) =>
  `(async()=>{try{if(!/bizimhesap\\.com$/.test(location.hostname)){alert('Önce BizimHesap sayfasını açın (uygulama.bizimhesap.com).');return}` +
  `const r=await fetch('${URL_}/rest/v1/rpc/bh_aktarim_kodu',{method:'POST',headers:{apikey:'${ANON}',Authorization:'Bearer ${ANON}','Content-Type':'application/json'},body:JSON.stringify({p_anahtar:'${anahtar}'})});` +
  `const k=await r.json();if(!r.ok)throw new Error(k.message||'Kod alınamadı');await new Function('ANAHTAR','SUPA','ANON','return (async()=>{'+k+'})()')('${anahtar}','${URL_}','${ANON}')}catch(e){alert('Analize Aktar: '+e.message)}})()`;

export function AktarimYerImi() {
  const [anahtar, setAnahtar] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (link.current && anahtar) link.current.setAttribute('href', 'javascript:' + encodeURIComponent(yukleyici(anahtar)).replace(/%20/g, ' ')); }, [anahtar]);

  const olustur = async () => {
    if (!supabase) return;
    setBekle(true);
    const { data, error } = await supabase.rpc('aktarim_yer_imi_anahtari');
    setBekle(false);
    if (error) toast('Hata: ' + error.message, 'hata'); else setAnahtar(data as string);
  };
  const kopyala = async () => {
    if (!anahtar) return;
    try { await navigator.clipboard.writeText(yukleyici(anahtar)); toast('Kod kopyalandı'); } catch { toast('Kopyalanamadı', 'hata'); }
  };

  return (
    <div className="card p-5">
      <h3 className="mb-1 font-semibold">BizimHesap aktarımı (faturalar, masraf, kasa, vadesi geçen)</h3>
      <p className="mb-3 text-sm text-slate-500">
        Bu veriler BizimHesap'ın resmi bağlantısında yok. BizimHesap'a kendiniz giriş yapmışken tek tıkla aktarılır; BizimHesap'ta hiçbir şey değiştirilmez, şifreniz hiçbir yerde saklanmaz.
      </p>
      {!anahtar ? (
        <button className="btn-primary" onClick={olustur} disabled={bekle}><Bookmark size={16} /> {bekle ? 'Hazırlanıyor…' : 'Yer imini oluştur'}</button>
      ) : (
        <div className="space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
            <li>Aşağıdaki yeşil düğmeyi fareyle tutup tarayıcınızın <b>yer imleri çubuğuna</b> sürükleyin (çubuk görünmüyorsa Ctrl+Shift+B).</li>
            <li>BizimHesap'a girin (uygulama.bizimhesap.com).</li>
            <li>Yer imleri çubuğundaki <b>Analize Aktar</b>'a tıklayın. Sağ üstte ilerleme görünür, bitince bu siteye veriler gelir.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <a ref={link} onClick={(e) => { e.preventDefault(); toast('Bu düğmeye tıklamayın; yer imleri çubuğuna sürükleyin'); }}
              className="inline-flex cursor-grab items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
              <Bookmark size={16} /> Analize Aktar
            </a>
            <button className="btn-ghost" onClick={kopyala}><Copy size={16} /> Kodu kopyala</button>
          </div>
          <p className="text-xs text-slate-500">Sürükleyemiyorsanız: BizimHesap sayfasında F12 → Console'u açın, "Kodu kopyala" ile aldığınız kodu yapıştırıp Enter'a basın. Yer imi bir yıl geçerlidir; yeniden oluşturursanız eskisi iptal olur.</p>
        </div>
      )}
    </div>
  );
}
