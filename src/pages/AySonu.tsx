import { useMemo, useState } from 'react';
import { CalendarClock, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { para, parse } from '../lib/format';
import { aySonuTahmini } from '../lib/oneriler';
import { CubukGrafik } from '../components/grafik';
import { Kpi, SayfaBaslik } from '../components/ui';
import { Degisim } from '../components/Degisim';

const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function Cubuk({ deger, hedef, renk }: { deger: number; hedef: number; renk: string }) {
  const p = hedef > 0 ? Math.min(100, (deger / hedef) * 100) : 0;
  return <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${renk}`} style={{ width: `${p}%` }} /></div>;
}

export default function AySonu() {
  const { db, calistir } = useStore();
  const t = useMemo(() => aySonuTahmini(db), [db]);
  const [hedefGir, setHedefGir] = useState(String(db.ayarlar.hedef_ciro || ''));
  const hedef = db.ayarlar.hedef_ciro || 0;
  const ayAd = AY[Number(t.ayBas.slice(5, 7)) - 1];
  const kalanGun = Math.max(1, t.kalan);
  const hedefIcinGunluk = hedef > t.ciro ? (hedef - t.ciro) / kalanGun : 0;
  const basabasIcinGunluk = t.basabasCiro > t.ciro ? (t.basabasCiro - t.ciro) / kalanGun : 0;
  const ortGunluk = t.gecen > 0 ? t.ciro / t.gecen : 0;
  const kaydet = () => calistir(() => backend.ayarKaydet({ hedef_ciro: Math.max(0, parse(hedefGir)) }), 'Hedef kaydedildi');
  const kar = t.tahminNet >= 0;

  return (
    <div className="max-w-5xl">
      <SayfaBaslik baslik={`${ayAd} ayı sonu tahmini`} alt={`Ayın ${t.gecen}. günü · ${t.kalan} gün kaldı · bu hızla ay sonunda nerede olursunuz?`} />
      <div className={`mb-4 flex items-start gap-3 rounded-xl p-4 ${kar ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200'}`}>
        {kar ? <TrendingUp size={22} className="mt-0.5 shrink-0" /> : <TrendingDown size={22} className="mt-0.5 shrink-0" />}
        <div>
          <div className="text-lg font-bold">{kar ? `Bu hızla ay yaklaşık ${para(t.tahminNet)} kârla kapanır` : `Bu hızla ay yaklaşık ${para(-t.tahminNet)} zararla kapanır`}</div>
          <div className="text-sm">
            {t.basabasCiro > 0 && (t.tahminCiro >= t.basabasCiro
              ? `Giderleri karşılamak için ${para(t.basabasCiro)} satış gerekiyor; tahmini satış bunun üstünde.`
              : `Giderleri karşılamak için ayın geri kalanında günde ${para(basabasIcinGunluk)} satış lazım (şu anki ortalama günde ${para(ortGunluk)}).`)}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Bu ay satış (KDV dahil)" deger={para(t.ciro)} alt={t.gecenAyAyni != null ? <Degisim simdi={t.ciro} once={t.gecenAyAyni} etiket="geçen ayın aynı gününe göre" /> : `Günde ortalama ${para(ortGunluk)}`} />
        <Kpi etiket="Ay sonu satış tahmini" deger={para(t.tahminCiro)} alt={t.gecenAyTum != null ? `Geçen ay toplam ${para(t.gecenAyTum)}` : undefined} renk="blue" ikon={<CalendarClock size={16} />} />
        <Kpi etiket="Brüt kâr: şimdi → tahmin" deger={para(t.tahminBrut)} alt={`Şu ana kadar ${para(t.brut)} · ürün + hizmet, KDV hariç`} renk="green" />
        <Kpi etiket="Gider: şimdi → tahmin" deger={para(t.tahminGider)} alt={`Şu ana kadar ${para(t.masraf)}${t.ortGider ? ` · son aylar ortalaması ${para(t.ortGider)}` : ''}`} renk="red" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="mb-2 font-semibold">Bu ayın günlük satışları</h3>
          <CubukGrafik veri={t.gunluk.map((x) => ({ etiket: String(x.gun), deger: x.ciro }))} bicim={para} yukseklik={200} />
        </div>
        <div className="card space-y-4 p-4">
          <div className="flex items-center gap-2 font-semibold"><Target size={18} /> Aylık satış hedefi</div>
          <div className="flex gap-2">
            <input className="inp" inputMode="decimal" placeholder="Örn. 800000" value={hedefGir} onChange={(e) => setHedefGir(e.target.value)} />
            <button className="btn-primary" onClick={kaydet}>Kaydet</button>
          </div>
          {hedef > 0 ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Gerçekleşen</span><b>{para(t.ciro)} / {para(hedef)}</b></div>
              <Cubuk deger={t.ciro} hedef={hedef} renk="bg-marka-500" />
              <div className="flex justify-between text-slate-500"><span>Tahmin</span><span>{para(t.tahminCiro)} (%{((t.tahminCiro / hedef) * 100).toFixed(0)})</span></div>
              <p className={`rounded-lg p-2 text-xs ${t.ciro >= hedef ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                {t.ciro >= hedef ? 'Hedefe ulaşıldı.' : `Hedef için kalan ${t.kalan} günde günde ${para(hedefIcinGunluk)} satış gerekiyor (şu an günde ${para(ortGunluk)}).`}
              </p>
            </div>
          ) : <p className="text-xs text-slate-500">Aylık satış hedefi girerseniz ilerleme ve günlük gereken satış burada görünür.</p>}
          {t.basabasCiro > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between"><span>Başabaş satışı</span><b>{para(t.basabasCiro)}</b></div>
              <Cubuk deger={t.ciro} hedef={t.basabasCiro} renk={t.ciro >= t.basabasCiro ? 'bg-emerald-500' : 'bg-amber-500'} />
              <p className="text-xs text-slate-500">Brüt kâr oranı %{(t.brutOran * 100).toFixed(0)} ile tahmini gideri ({para(t.tahminGider)}) karşılamak için gereken aylık satış.</p>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">Tahmin, ayın şu ana kadarki günlük ortalamasının ayın tamamına yayılmasıyla bulunur. Gider tahmini, bu ay girilen masraf ile son 3 ayın ortalamasından büyük olanıdır; Kâr / Zarar sayfasında hesap dışı bıraktığınız giderler sayılmaz. Masraflar BizimHesap'tan "faturaları güncelle" ile gelir.</p>
    </div>
  );
}
