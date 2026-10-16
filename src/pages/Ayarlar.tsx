import { useState } from 'react';
import { Download } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend, demoSifirla } from '../lib/backend';
import type { Ayarlar } from '../lib/types';
import { Alan, SayfaBaslik, onayla } from '../components/ui';
import { BizimHesapPanel } from '../components/BizimHesapPanel';
import { KullaniciPanel } from '../components/KullaniciPanel';
import { AktarimYerImi } from '../components/AktarimYerImi';

export default function AyarlarSayfa() {
  const { db, mode, calistir } = useStore();
  const [a, setA] = useState<Ayarlar>(db.ayarlar);
  const kaydet = () => calistir(() => backend.ayarKaydet({ firma_adi: a.firma_adi, telefon: a.telefon, adres: a.adres, alis_kdv_haric: !!a.alis_kdv_haric, hedef_gun: Math.max(1, Math.round(a.hedef_gun || 30)) }), 'Ayarlar kaydedildi');
  const yedek = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = `yedek-${new Date().toISOString().slice(0, 10)}.json`; el.click();
  };
  // örnek ürünle KDV seçiminin etkisini göster
  const ornek = db.urunler.find((u) => u.aktif && u.alis_fiyati > 0 && u.satis_fiyati > 0 && u.stok > 0);
  const marj = (haric: boolean) => {
    if (!ornek) return null;
    const s = ornek.satis_fiyati / (1 + ornek.kdv / 100), m = haric ? ornek.alis_fiyati : ornek.alis_fiyati / (1 + ornek.kdv / 100);
    return ((s - m) / s) * 100;
  };

  return (
    <div className="max-w-3xl space-y-4">
      <SayfaBaslik baslik="Ayarlar" />
      <div className="card p-5">
        <h3 className="mb-3 font-semibold">Firma ve analiz ayarları</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Alan etiket="Firma adı"><input className="inp" value={a.firma_adi ?? ''} onChange={(e) => setA({ ...a, firma_adi: e.target.value })} /></Alan>
          <Alan etiket="Telefon"><input className="inp" value={a.telefon ?? ''} onChange={(e) => setA({ ...a, telefon: e.target.value })} /></Alan>
          <Alan etiket="Kaç günlük stok tutulsun? (alınacak adet hesabı)"><input className="inp" type="number" min={1} value={a.hedef_gun ?? 30} onChange={(e) => setA({ ...a, hedef_gun: Number(e.target.value) })} /></Alan>
          <Alan etiket="BizimHesap'taki alış fiyatları">
            <select className="inp" value={a.alis_kdv_haric ? '1' : '0'} onChange={(e) => setA({ ...a, alis_kdv_haric: e.target.value === '1' })}>
              <option value="0">KDV dahil girildi</option><option value="1">KDV hariç girildi</option>
            </select>
          </Alan>
        </div>
        {ornek && <p className="mt-2 text-xs text-slate-500">Örnek: <b>{ornek.ad}</b> — alış {ornek.alis_fiyati}, satış {ornek.satis_fiyati} (KDV %{ornek.kdv}). "KDV dahil" seçiminde marj %{marj(false)!.toFixed(0)}, "KDV hariç" seçiminde %{marj(true)!.toFixed(0)} çıkar. BizimHesap'ta alış fiyatını nasıl girdiğinize göre seçin; tüm kâr hesapları buna göre yapılır.</p>}
        <button className="btn-primary mt-4" onClick={kaydet}>Kaydet</button>
      </div>

      <BizimHesapPanel />
      {mode === 'bulut' && <AktarimYerImi />}
      <KullaniciPanel />

      <div className="card p-5">
        <h3 className="mb-3 font-semibold">Veri</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={yedek}><Download size={16} /> Yedek indir (JSON)</button>
          {mode === 'demo' && <button className="btn-ghost text-red-600" onClick={() => onayla('Demo verileri yeniden oluşturulsun mu?') && demoSifirla()}>Demo verilerini sıfırla</button>}
        </div>
        <p className="mt-3 text-xs text-slate-500">{mode === 'demo' ? 'Demo modu: örnek verilerle çalışıyor.' : 'Veriler Supabase veritabanında; ana kaynak BizimHesap.'}</p>
      </div>
    </div>
  );
}
