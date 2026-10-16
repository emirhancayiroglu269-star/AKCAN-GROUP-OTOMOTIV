import { useState } from 'react';
import { Plus, Trash2, UserCog } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend } from '../lib/backend';
import { ROL_AD, type Kullanici, type Rol } from '../lib/types';
import { onayla } from './ui';

const ROL_ACIKLAMA: Record<Rol, string> = {
  yonetici: 'Tüm sayfalar: satış, kâr/zarar, maliyetler, cariler, ayarlar',
  kasiyer: 'Sadece Ürünler & Stok ile Kritik Stok sayfaları; alış fiyatı ve kâr görünmez',
  teknisyen: 'Personel ile aynı (depo sorumlusu için)',
};
export function KullaniciPanel() {
  const { db, calistir, eposta, mode } = useStore();
  const [yeni, setYeni] = useState<{ eposta: string; ad: string; rol: Rol }>({ eposta: '', ad: '', rol: 'kasiyer' });
  const liste = db.kullanicilar;
  const yoneticiSayisi = liste.filter((k) => k.rol === 'yonetici' && k.aktif).length;
  const benMi = (k: Kullanici) => !!eposta && k.eposta.toLowerCase() === eposta.toLowerCase();

  const ekle = async () => {
    const e = yeni.eposta.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return toast('Geçerli bir e-posta girin', 'hata');
    if (liste.some((k) => k.eposta.toLowerCase() === e)) return toast('Bu e-posta zaten listede', 'hata');
    // İlk kayıt eklenirken siz de yönetici olarak eklenirsiniz; yoksa kendinizi kilitlersiniz
    if (!liste.length && eposta && e !== eposta.toLowerCase()) {
      if (!onayla(`Liste ilk kez oluşturuluyor. Kilitlenmemeniz için önce sizin hesabınız (${eposta}) yönetici olarak eklenecek. Devam edilsin mi?`)) return;
      const ok = await calistir(() => backend.insert('kullanicilar', { eposta: eposta.toLowerCase(), ad: null, rol: 'yonetici', aktif: true }));
      if (ok === undefined) return;
    }
    const ok = await calistir(() => backend.insert('kullanicilar', { eposta: e, ad: yeni.ad.trim() || null, rol: yeni.rol, aktif: true }), 'Kullanıcı eklendi');
    if (ok !== undefined) setYeni({ eposta: '', ad: '', rol: 'kasiyer' });
  };
  const guncelle = (k: Kullanici, p: Partial<Kullanici>) => {
    const yoneticiKaybi = k.rol === 'yonetici' && k.aktif && ((p.rol && p.rol !== 'yonetici') || p.aktif === false);
    if (yoneticiKaybi && yoneticiSayisi <= 1) return toast('En az bir aktif yönetici kalmalı', 'hata');
    if (yoneticiKaybi && benMi(k) && !onayla('Kendi yönetici yetkinizi kaldırıyorsunuz. Emin misiniz?')) return;
    calistir(() => backend.update<Kullanici>('kullanicilar', k.id, p), 'Güncellendi');
  };
  const sil = (k: Kullanici) => {
    if (k.rol === 'yonetici' && k.aktif && yoneticiSayisi <= 1 && liste.length > 1) return toast('Son yönetici silinemez', 'hata');
    if (benMi(k) && liste.length > 1) return toast('Kendinizi silemezsiniz', 'hata');
    if (onayla(`${k.eposta} listeden çıkarılsın mı? Bu kişi artık programı kullanamaz.`)) calistir(() => backend.remove('kullanicilar', k.id), 'Kullanıcı çıkarıldı');
  };

  return (
    <div className="card p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold"><UserCog size={18} /> Kullanıcılar ve yetkiler</h3>
      <p className="mb-3 text-xs text-slate-500">
        {liste.length === 0 ? 'Liste boşken giriş yapan herkes yöneticidir. İlk kullanıcıyı eklediğinizde yetkiler devreye girer ve listede olmayanlar programı kullanamaz.' : 'Listede olmayan veya pasif kullanıcılar programı açamaz.'}
        {mode === 'bulut' && ' Kişinin giriş hesabını Supabase → Authentication → Users → Add user ile oluşturun (şifreyi siz belirlersiniz), sonra e-postasını buraya ekleyin.'}
      </p>
      {liste.length > 0 && (
        <div className="mb-3 divide-y divide-slate-100 dark:divide-slate-800">
          {liste.map((k) => (
            <div key={k.id} className={`flex flex-wrap items-center gap-2 py-2 ${k.aktif ? '' : 'opacity-50'}`}>
              <div className="min-w-0 flex-1">
                <input className="inp py-1 text-sm" defaultValue={k.ad ?? ''} placeholder="Görünen ad (fişlerde)" onBlur={(e) => e.target.value !== (k.ad ?? '') && guncelle(k, { ad: e.target.value || null })} />
                <div className="mt-0.5 truncate text-xs text-slate-500">{k.eposta}{benMi(k) && ' · siz'}</div>
              </div>
              <select className="inp w-32 py-1 text-sm" value={k.rol} onChange={(e) => guncelle(k, { rol: e.target.value as Rol })}>{(Object.keys(ROL_AD) as Rol[]).map((r) => <option key={r} value={r}>{ROL_AD[r]}</option>)}</select>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={k.aktif} onChange={(e) => guncelle(k, { aktif: e.target.checked })} /> Aktif</label>
              <button className="text-slate-400 hover:text-red-600" onClick={() => sil(k)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input className="inp min-w-48 flex-1" placeholder="E-posta (giriş hesabı)" value={yeni.eposta} onChange={(e) => setYeni({ ...yeni, eposta: e.target.value })} />
        <input className="inp w-40" placeholder="Ad (ör. Mehmet)" value={yeni.ad} onChange={(e) => setYeni({ ...yeni, ad: e.target.value })} />
        <select className="inp w-32" value={yeni.rol} onChange={(e) => setYeni({ ...yeni, rol: e.target.value as Rol })}>{(Object.keys(ROL_AD) as Rol[]).map((r) => <option key={r} value={r}>{ROL_AD[r]}</option>)}</select>
        <button className="btn-primary" onClick={ekle}><Plus size={16} /> Ekle</button>
      </div>
      <div className="mt-3 space-y-0.5 text-xs text-slate-500">{(Object.keys(ROL_AD) as Rol[]).map((r) => <div key={r}><b>{ROL_AD[r]}:</b> {ROL_ACIKLAMA[r]}</div>)}</div>
    </div>
  );
}
