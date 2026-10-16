import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/backend';
import { toast } from '../lib/store';

export default function Giris() {
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [goster, setGoster] = useState(false);
  const [kayit, setKayit] = useState(false);
  const [ad, setAd] = useState('');
  const [bekle, setBekle] = useState(false);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault(); if (!supabase) return;
    setBekle(true);
    const r = kayit
      ? await supabase.auth.signUp({ email: eposta, password: sifre, options: { data: { ad } } })
      : await supabase.auth.signInWithPassword({ email: eposta, password: sifre });
    setBekle(false);
    if (r.error) toast(r.error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı' : r.error.message, 'hata');
    else if (kayit && !r.data.session) toast('Kayıt alındı. E-postanızdaki onay linkine tıklayın.');
  };

  return (
    <div className="grid min-h-full place-items-center bg-slate-900 p-4">
      <form onSubmit={gonder} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-900">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-marka-600">Satış & Servis</div>
          <h1 className="mt-1 text-2xl font-bold">{kayit ? 'Personel kaydı' : 'Giriş yap'}</h1>
        </div>
        <div className="space-y-3">
          {kayit && <label className="block"><span className="lbl">Ad Soyad</span><input className="inp" value={ad} onChange={(e) => setAd(e.target.value)} required /></label>}
          <label className="block"><span className="lbl">E-posta</span><input className="inp" type="email" autoFocus value={eposta} onChange={(e) => setEposta(e.target.value)} required /></label>
          <label className="block">
            <span className="lbl">Şifre</span>
            <div className="relative">
              <input className="inp pr-10" type={goster ? 'text' : 'password'} value={sifre} onChange={(e) => setSifre(e.target.value)} minLength={6} required />
              <button type="button" onClick={() => setGoster(!goster)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">{goster ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </label>
          <button className="btn-primary w-full py-2.5" disabled={bekle}>{bekle ? 'Bekleyin…' : kayit ? 'Kayıt ol' : 'Giriş'}</button>
        </div>
        <button type="button" onClick={() => setKayit(!kayit)} className="mt-4 w-full text-center text-xs text-slate-500 hover:text-marka-600">
          {kayit ? 'Hesabın var mı? Giriş yap' : 'Yeni personel hesabı oluştur'}
        </button>
      </form>
    </div>
  );
}
