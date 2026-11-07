import { useEffect, useState } from 'react';
import { History, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { backend, type DenetimKaydi, type YedekKaydi } from '../lib/backend';
import { tarihSaat, sayi } from '../lib/format';

const TABLO_AD: Record<string, string> = {
  urunler: 'Ürün', urun_kodlari: 'Ürün kodu (OEM)', kullanicilar: 'Kullanıcı', ayarlar: 'Ayarlar', hareketler: 'Stok hareketi', depolar: 'Depo', cariler: 'Cari',
  tahsilat_notlari: 'Tahsilat notu', stok_aksiyon: 'Stok aksiyonu', fiyat_teklifleri: 'Teklif', sorulan: 'Soruldu', sayim: 'Sayım', odeal_fatura: 'e-Fatura kontrol',
  tedarikci_carpan: 'Tedarikçi çarpanı', asistan_oneri: 'Asistan önerisi', asistan_hafiza: 'Asistan hafızası', sase_araclar: 'Araç (şase)', rakip_not: 'Rakip notu', otomarmara_veri: 'Otomarmara isteği',
};
const ISLEM: Record<DenetimKaydi['islem'], [string, string]> = { ekleme: ['Ekledi', 'text-emerald-700'], degisiklik: ['Değiştirdi', 'text-sky-700'], silme: ['Sildi', 'text-red-600'] };
const deger = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80));
/** satırın kısa adı: ürün adı, metin, cari, eposta… */
const ozet = (k: DenetimKaydi) => { const r = (k.yeni ?? k.eski ?? {}) as Record<string, unknown>; return String(r.ad ?? r.metin ?? r.cari ?? r.musteri ?? r.eposta ?? r.baslik ?? r.kod ?? k.kayit ?? '').slice(0, 60); };

/** Yönetici: gecelik yedeklerin durumu ve işlem geçmişi (kim, ne zaman, neyi değiştirdi) */
export function GuvenlikPanel() {
  const [yedek, setYedek] = useState<YedekKaydi[] | null>(null);
  const [kayit, setKayit] = useState<DenetimKaydi[] | null>(null); const [daha, setDaha] = useState(false);
  const [tablo, setTablo] = useState(''); const [bekle, setBekle] = useState(false); const [hata, setHata] = useState<string | null>(null);
  const oku = async (once?: string) => {
    setBekle(true); setHata(null);
    try {
      const [y, d] = await Promise.all([once ? Promise.resolve(yedek ?? []) : backend.yedekKayitlari(), backend.denetimOku({ limit: 100, tablo: tablo || undefined, once })]);
      setYedek(y); setKayit((k) => (once ? [...(k ?? []), ...d] : d)); setDaha(d.length === 100);
    } catch (e) { setHata((e as Error).message); } finally { setBekle(false); }
  };
  useEffect(() => { oku(); }, [tablo]); // eslint-disable-line react-hooks/exhaustive-deps
  const son = yedek?.find((y) => y.durum === 'basarili');
  const sonTamam = son && son.geri_yukleme === 'basarili' && Date.now() - new Date(son.zaman).getTime() < 36 * 3600e3;

  return (
    <div className="card space-y-5 p-5">
      <div>
        <h3 className="mb-1 flex items-center gap-2 font-semibold"><ShieldCheck size={18} /> Yedekler</h3>
        <p className="mb-2 text-xs text-slate-500">Her gece 03:30'da veritabanının tamamı şifreli olarak yedeklenir, boş bir veritabanına geri yüklenip satır sayıları canlıyla karşılaştırılır. Yedek dosyaları GitHub'da 30 gün saklanır; şifresi yalnız sizdedir.</p>
        {yedek === null ? <p className="text-sm text-slate-500">Yükleniyor…</p>
          : !yedek.length ? <p className="rounded bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Henüz yedek kaydı yok. GitHub'da SUPABASE_DB_URL ve YEDEK_SIFRE sırları girildikten sonra ilk yedek alınır.</p>
          : <>
            <p className={`mb-2 rounded p-2 text-sm ${sonTamam ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'}`}>
              {son ? `Son başarılı yedek: ${tarihSaat(son.zaman)} · ${son.boyut_mb ?? '?'} MB · ${sayi(son.satir_sayisi ?? 0)} satır · geri yükleme testi ${son.geri_yukleme === 'basarili' ? 'başarılı' : son.geri_yukleme === 'fark_var' ? 'farklı çıktı' : 'yapılamadı'}` : 'Başarılı yedek yok.'}
              {son && !sonTamam && ' — 36 saatten eski ya da test başarısız: GitHub > Actions > "Veritabanı yedeği" işine bakın.'}
            </p>
            <table className="tbl text-xs"><thead><tr><th>Zaman</th><th>Durum</th><th className="text-right">Boyut</th><th className="text-right">Satır</th><th>Geri yükleme</th><th>Not</th></tr></thead>
              <tbody>{yedek.slice(0, 10).map((y) => <tr key={y.id}><td className="whitespace-nowrap">{tarihSaat(y.zaman)}</td><td className={y.durum === 'basarili' ? 'text-emerald-700' : 'text-red-600'}>{y.durum === 'basarili' ? 'Başarılı' : 'Hata'}</td>
                <td className="text-right">{y.boyut_mb ?? '—'} MB</td><td className="text-right">{y.satir_sayisi !== null ? sayi(y.satir_sayisi) : '—'}</td>
                <td className={y.geri_yukleme === 'basarili' ? 'text-emerald-700' : 'text-amber-700'}>{y.geri_yukleme === 'basarili' ? 'Başarılı' : y.geri_yukleme === 'fark_var' ? 'Fark var' : y.geri_yukleme ?? '—'}</td>
                <td className="max-w-[16rem] truncate" title={y.aciklama ?? ''}>{y.aciklama}{y.fark ? ` · ${Object.keys(y.fark).join(', ')}` : ''}</td></tr>)}</tbody></table>
          </>}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 font-semibold"><History size={18} /> İşlem geçmişi</h3>
          <select className="inp ml-auto w-auto py-1 text-sm" value={tablo} onChange={(e) => setTablo(e.target.value)}>
            <option value="">Tüm kayıtlar</option>{Object.entries(TABLO_AD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-ghost px-2 py-1 text-sm" onClick={() => oku()} disabled={bekle}>{bekle ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Yenile</button>
        </div>
        <p className="mb-2 text-xs text-slate-500">Siteye giriş yapan herkesin eklediği, değiştirdiği ve sildiği kayıtlar. Kayıtlar değiştirilemez ve silinemez. BizimHesap ve tedarikçi eşitlemesinin otomatik yazdıkları burada yer almaz.</p>
        {hata && <p className="text-sm text-red-600">{hata}</p>}
        {kayit && !kayit.length && !bekle && <p className="text-sm text-slate-500">Henüz kayıt yok.</p>}
        {kayit && kayit.length > 0 && <div className="max-h-[32rem] overflow-auto"><table className="tbl text-xs">
          <thead><tr><th>Zaman</th><th>Kim</th><th>İşlem</th><th>Kayıt</th><th>Değişen</th></tr></thead>
          <tbody>{kayit.map((k) => {
            const [ad, renk] = ISLEM[k.islem] ?? [k.islem, ''];
            const alanlar = k.islem === 'degisiklik' ? Object.keys(k.yeni ?? {}) : [];
            return <tr key={k.id} className="align-top">
              <td className="whitespace-nowrap">{tarihSaat(k.zaman)}</td>
              <td className="whitespace-nowrap">{k.eposta?.split('@')[0]}<div className="text-[10px] text-slate-400">{k.rol}</div></td>
              <td className={`whitespace-nowrap font-medium ${renk}`}>{ad}<div className="text-[10px] font-normal text-slate-500">{TABLO_AD[k.tablo] ?? k.tablo}</div></td>
              <td className="max-w-[14rem]">{ozet(k)}</td>
              <td>{alanlar.length ? alanlar.slice(0, 6).map((a) => <div key={a}><span className="text-slate-500">{a}:</span> {deger(k.eski?.[a])} → <b>{deger(k.yeni?.[a])}</b></div>) : <span className="text-slate-400">{k.islem === 'silme' ? 'tüm satır silindi' : 'yeni kayıt'}</span>}</td>
            </tr>; })}</tbody></table></div>}
        {daha && <button className="btn-ghost mt-2 w-full" onClick={() => oku(kayit![kayit!.length - 1].zaman)} disabled={bekle}>Daha eski kayıtlar</button>}
      </div>
    </div>
  );
}
