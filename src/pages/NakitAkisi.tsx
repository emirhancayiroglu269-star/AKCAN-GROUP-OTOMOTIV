import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { nakitAkisi } from '../lib/analiz2';
import { gunu, para, tarih } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { CubukGrafik, YatayListe } from '../components/grafik';
import { Kpi, SayfaBaslik } from '../components/ui';

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
  const yaklasan = db.masraflar.filter((m) => m.odeme_tarihi && m.odeme_tarihi > bugun).sort((a, b) => (a.odeme_tarihi ?? '').localeCompare(b.odeme_tarihi ?? ''));
  const yaklasanToplam = yaklasan.reduce((t, m) => t + m.tutar, 0);
  const alacak = db.vadesi_gecen.reduce((t, v) => t + v.tutar, 0);
  const tedarikciBorc = db.cariler.filter((c) => c.tur === 'tedarikci' && c.bakiye < 0).reduce((t, c) => t + -c.bakiye, 0);
  const tahmin30 = nakit + 30 * n.gunlukGiris - 30 * n.gunlukCikis - yaklasanToplam;
  const seri = [...n.gunluk.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([g, v]) => ({ etiket: g.slice(8, 10) + '.' + g.slice(5, 7), deger: v.giris - v.cikis, alt: `${tarih(g + 'T12:00')} · giriş ${para(v.giris)} · çıkış ${para(v.cikis)}` }));
  const tipler = [...n.tip.entries()].map(([ad, v]) => ({ ad, deger: v.giris - v.cikis, alt: `giriş ${para(v.giris)} · çıkış ${para(v.cikis)}` })).sort((a, b) => Math.abs(b.deger) - Math.abs(a.deger));

  return (
    <div>
      <SayfaBaslik baslik="Nakit Akışı" alt={db.kasa_akisi.length ? 'Kasa, banka ve POS hareketleri (BizimHesap)' : 'Kasa-banka verisi henüz aktarılmadı'} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Kasa + banka + POS" deger={para(nakit)} alt={`${hesap.filter((h) => !kartMi(h.ad) && !ortakMi(h.ad)).length} hesap`} renk="green" />
        <Kpi etiket="Kredi kartı borcu" deger={para(kart)} renk="red" />
        <Kpi etiket="Vadesi geçen alacak" deger={para(alacak)} alt={`${db.vadesi_gecen.length} müşteri`} renk="amber" />
        <Kpi etiket="30 gün sonra tahmini nakit" deger={para(tahmin30)} alt="Seçili dönemin günlük ortalamasıyla, yaklaşan ödemeler düşülmüş" renk={tahmin30 >= 0 ? 'blue' : 'red'} />
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
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Yaklaşan ödemeler</h3>
          {yaklasan.length === 0 ? <div className="text-sm text-slate-400">Kayıtlı yaklaşan ödeme yok</div> : yaklasan.slice(0, 12).map((m) => (
            <div key={m.id} className="flex justify-between gap-2 py-0.5 text-sm"><span className="truncate"><span className="text-slate-500">{tarih(m.odeme_tarihi + 'T12:00')}</span> {m.alt ?? m.aciklama}</span><b>{para(m.tutar)}</b></div>
          ))}
          {yaklasan.length > 0 && <div className="mt-2 border-t pt-1 text-right text-sm font-semibold dark:border-slate-700">{para(yaklasanToplam)}</div>}
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Borç / alacak dengesi</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Müşteri alacakları (toplam)</span><b>{para(db.cariler.filter((c) => c.tur === 'musteri' && c.bakiye > 0).reduce((t, c) => t + c.bakiye, 0))}</b></div>
            <div className="flex justify-between"><span>— vadesi geçen</span><b className="text-amber-700">{para(alacak)}</b></div>
            <div className="flex justify-between"><span>Tedarikçilere borç</span><b className="text-red-600">{para(tedarikciBorc)}</b></div>
            <div className="flex justify-between"><span>Kredi kartı borcu</span><b className="text-red-600">{para(-kart)}</b></div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Tedarikçi bakiyeleri BizimHesap'taki işaretle alınır (eksi = borç kabul edildi).</p>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" /><span>Hesaplar arası transferler "Para Girişi / Para Çıkışı" olarak görünebilir; bunlar birbirini götürür. Şirket ortağı hesabı nakit toplamına katılmadı. Kasa hareketleri ve hesap bakiyeleri "faturaları güncelle" ile yenilenir.</span>
      </div>
    </div>
  );
}
