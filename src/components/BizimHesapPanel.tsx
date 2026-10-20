import { useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend } from '../lib/backend';
import { sayi, tarih, tarihSaat } from '../lib/format';

export function BizimHesapPanel() {
  const { db, mode, calistir } = useStore();
  const [bekle, setBekle] = useState(false);
  const d = db.bh_durum;
  const esitle = async () => {
    setBekle(true);
    const r = await calistir(() => backend.bhEsitle());
    setBekle(false);
    if (r && r !== true) {
      if (r.ok) toast(`Eşitlendi: ${sayi(r.urun ?? 0)} ürün, ${sayi(r.cari ?? 0)} cari${r.degisen ? ` · ${sayi(r.degisen)} ürün güncellendi` : ''}`);
      else toast('BizimHesap: ' + (r.hata ?? 'hata'), 'hata');
    }
  };
  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">BizimHesap bağlantısı</h3>
        {mode === 'bulut' && <button className="btn-ghost" disabled={bekle} onClick={esitle}><RefreshCw size={16} className={bekle ? 'animate-spin' : ''} /> {bekle ? 'Eşitleniyor…' : 'Şimdi eşitle'}</button>}
      </div>
      {!d?.son_esitleme ? <p className="text-sm text-slate-500">{mode === 'demo' ? 'Demo modunda BizimHesap bağlantısı yok.' : 'Henüz eşitleme yapılmadı.'}</p> : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">{d.son_hata ? <XCircle size={16} className="text-red-600" /> : <CheckCircle2 size={16} className="text-emerald-600" />}
            <span>Son eşitleme: <b>{tarihSaat(d.son_esitleme)}</b></span></div>
          {d.son_hata && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">{d.son_hata}</div>}
          <div className="grid gap-2 sm:grid-cols-4">
            <Bilgi l="Ürün" v={sayi(d.urun_sayisi ?? 0)} /><Bilgi l="Depo" v={sayi(d.depo_sayisi ?? 0)} /><Bilgi l="Cari" v={sayi(d.cari_sayisi ?? 0)} />
            <Bilgi l="Takip başlangıcı" v={tarih(d.takip_baslangic)} />
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">Program BizimHesap'ı <b>yalnızca okur</b>; BizimHesap'a hiçbir kayıt göndermez. Sunucu her 2 dakikada ürün, fiyat, depo stoğu ve cari bakiyeleri çeker; açık olan sayfa değişiklikleri en geç 10 dakikada bir alır (veri kotasını korumak için). Hemen görmek için sayfayı yenileyin. Stok azalması satış, artması alış olarak kaydedilir.</p>
    </div>
  );
}
const Bilgi = ({ l, v }: { l: string; v: string }) => <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"><div className="text-xs text-slate-500">{l}</div><b>{v}</b></div>;
