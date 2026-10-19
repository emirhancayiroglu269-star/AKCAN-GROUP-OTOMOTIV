import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { nakitAkisi } from '../lib/analiz2';
import { gunu, para, tarih } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { CubukGrafik, YatayListe } from '../components/grafik';
import { Kpi, SayfaBaslik } from '../components/ui';
import { tahsilatDisi } from '../lib/tahsilat';
import { gecisCarisi } from '../lib/analiz2';

export default function NakitAkisi() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const n = useMemo(() => nakitAkisi(db, d), [db, d]);
  const hesap = db.hesap_bakiyeleri;
  const kartMi = (ad: string) => /KRED[İI]\s*KART|KREDİ KARTI|Kredi Kart/i.test(ad);
  const ortakMi = (ad: string) => /ORTA[ĞG]I|ORTAK/i.test(ad);
  const nakit = hesap.filter((h) => !kartMi(h.ad) && !ortakMi(h.ad)).reduce((t, h) => t + h.bakiye, 0);
  const kart = hesap.filter((h) => kartMi(h.ad)).reduce((t, h) => t + h.bakiye, 0);
  const bugun = gunu();
  const ay = gunu(new Date(Date.now() + 30 * 864e5));
  const yaklasan = db.masraflar.filter((m) => m.odeme_tarihi && m.odeme_tarihi > bugun && m.odeme_tarihi <= ay).sort((a, b) => (a.odeme_tarihi ?? '').localeCompare(b.odeme_tarihi ?? ''));
  const yaklasanToplam = yaklasan.reduce((t, m) => t + m.tutar, 0);
  const vg = db.vadesi_gecen.filter((v) => v.tutar > 0 && !tahsilatDisi(db, v.cari));
  const alacak = vg.reduce((t, v) => t + v.tutar, 0);
  const gecisC = db.cariler.filter((c) => c.tur === 'musteri' && c.bakiye > 0 && (gecisCarisi(db, c.bh_id) || gecisCarisi(db, c.ad)));
  const musteriAlacak = db.cariler.filter((c) => c.tur === 'musteri' && c.bakiye > 0 && !gecisC.includes(c)).reduce((t, c) => t + c.bakiye, 0);
  const tedarikciBorc = db.cariler.filter((c) => c.tur === 'tedarikci' && c.bakiye < 0).reduce((t, c) => t + -c.bakiye, 0);
  const tahmin30 = nakit + 30 * n.gunlukGiris - 30 * n.gunlukCikis - yaklasanToplam;
  const seri = [...n.gunluk.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([g, v]) => ({ etiket: g.slice(8, 10) + '.' + g.slice(5, 7), deger: v.giris - v.cikis, alt: `${tarih(g + 'T12:00')} · giriş ${para(v.giris)} · çıkış ${para(v.cikis)}` }));
  const tipler = [...n.tip.entries()].map(([ad, v]) => ({ ad, deger: v.giris - v.cikis, alt: `giriş ${para(v.giris)} · çıkış ${para(v.cikis)}` })).sort((a, b) => Math.abs(b.deger) - Math.abs(a.deger));

  return (
    <div>
      <SayfaBaslik baslik="Nakit Akışı" alt={db.kasa_akisi.length ? 'Kasa, banka ve POS hareketleri (BizimHesap)' : 'Kasa-banka verisi henüz aktarılmadı'} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Kasa + banka + POS" deger={para(nakit)} alt={`${hesap.filter((h) => !kartMi(h.ad) && !ortakMi(h.ad)).length} hesap`} renk="green" />
        <Kpi etiket="Kredi kartı borcu" deger={para(-kart)} alt="Kart ekstreleri ödenince bankadan düşer" renk="red" />
        <Kpi etiket="Vadesi geçen alacak" deger={para(alacak)} alt={`${vg.length} müşteri`} renk="amber" />
        <Kpi etiket="30 gün sonra tahmini nakit" deger={para(tahmin30)} alt="Kasa+banka + seçili dönemin günlük net akışı × 30 − 30 gün içindeki kayıtlı ödemeler (kredi kartı borcu hariç)" renk={tahmin30 >= 0 ? 'blue' : 'red'} />
      </div>
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Günlük net nakit (giriş − çıkış)</h3><span className="text-xs text-slate-500">Giriş {para(n.giris)} · Çıkış {para(n.cikis)}</span></div>
          <CubukGrafik veri={seri} bicim={para} yukseklik={220} bos="Bu dönemde kasa hareketi yok" />
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Hesaplar</h3>
          {hesap.length === 0 ? <div className="text-sm text-slate-400">Veri yok</div> : hesap.filter((h) => h.bakiye !== 0).sort((a, b) => b.bakiye - a.bakiye).map((h) => (
            <div key={h.ad} className="flex justify-between gap-2 py-0.5 text-sm"><span className="truncate">{h.ad}</span><b className={h.bakiye < 0 ? 'text-red-600' : ''}>{para(h.bakiye)}</b></div>
          ))}
          {hesap[0]?.guncelleme && <p className="mt-2 text-[11px] text-slate-400">Son aktarım: {tarih(hesap[0].guncelleme)}</p>}
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Hareket türleri (net)</h3>
          <YatayListe veri={tipler} bicim={para} limit={10} />
          {(n.aktarim.giris > 0 || n.aktarim.cikis > 0) && <div className="mt-3 border-t pt-2 text-xs text-slate-500 dark:border-slate-700">
            <div className="font-medium text-slate-600 dark:text-slate-300">Hesaplar arası aktarım (toplama katılmadı)</div>
            <div>Giren {para(n.aktarim.giris)} · çıkan {para(n.aktarim.cikis)} · fark <b className={n.aktarim.giris - n.aktarim.cikis < -1 ? 'text-red-600' : ''}>{para(n.aktarim.giris - n.aktarim.cikis)}</b></div>
            {Math.abs(n.aktarim.giris - n.aktarim.cikis) > 1000 && <div className="mt-0.5">Fark sıfır değilse para kayıtlı hesaplardan birine girmeden çıkmış ya da girmiştir (ör. ortağın cebinden gelen/çekilen para). Hesap bazında: {[...n.aktarim.hesap.entries()].filter(([, v]) => Math.abs(v) > 1).sort((x, y) => x[1] - y[1]).map(([h, v]) => `${h} ${para(v)}`).join(' · ')}</div>}
          </div>}
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Yaklaşan ödemeler (30 gün)</h3>
          {yaklasan.length === 0 ? <div className="text-sm text-slate-400">Kayıtlı yaklaşan ödeme yok</div> : yaklasan.slice(0, 12).map((m) => (
            <div key={m.id} className="flex justify-between gap-2 py-0.5 text-sm"><span className="truncate"><span className="text-slate-500">{tarih(m.odeme_tarihi + 'T12:00')}</span> {m.alt ?? m.aciklama}</span><b>{para(m.tutar)}</b></div>
          ))}
          {yaklasan.length > 0 && <div className="mt-2 border-t pt-1 text-right text-sm font-semibold dark:border-slate-700">{para(yaklasanToplam)}</div>}
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Borç / alacak dengesi</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Müşteri alacakları (toplam)</span><b>{para(musteriAlacak)}</b></div>
            <div className="flex justify-between"><span>— vadesi geçen</span><b className="text-amber-700">{para(alacak)}</b></div>
            <div className="flex justify-between"><span>Tedarikçilere borç</span><b className="text-red-600">{para(tedarikciBorc)}</b></div>
            <div className="flex justify-between"><span>Kredi kartı borcu</span><b className="text-red-600">{para(-kart)}</b></div>
          </div>
          {gecisC.length > 0 && <p className="mt-2 text-xs text-slate-500">{gecisC.map((c) => c.ad.replace(/\s*\/\s*$/, '')).join(', ')} proje carisi ({para(gecisC.reduce((t, c) => t + c.bakiye, 0))}) alacaklara katılmadı.</p>}
          <p className="mt-2 text-xs text-slate-500">Tedarikçi bakiyeleri BizimHesap'taki işaretle alınır (eksi = borç kabul edildi).</p>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" /><span>Grafik ve toplamlar yalnız gerçek para hareketlerini gösterir: müşteri tahsilatı (giriş) ve tedarikçi, masraf, cari ödemeleri (çıkış). Kendi hesaplarınız arasındaki "Para Girişi / Para Çıkışı" aktarımları (POS → banka, banka → kredi kartı, ortak hesabı) ayrı gösterilir. Kredi kartıyla yapılan ödeme harcama günü çıkış sayılır; ekstre ödemesi aktarımdır. Şirket ortağı hesabı nakit toplamına katılmadı. Kasa hareketleri ve hesap bakiyeleri "faturaları güncelle" ile yenilenir.</span>
      </div>
    </div>
  );
}
