import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, KeyRound, Loader2, Play, Send, Trash2, X } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type AsistanHafiza, type AsistanOneri, type AsistanYanit } from '../lib/backend';
import { kodNorm, tarihSaat } from '../lib/format';
import { SayfaBaslik } from '../components/ui';
import type { StokAksiyon, TahsilatNot } from '../lib/types';

/** Asistan: verilere bakarak cevap verir; her sabah inceleme yapıp önerilerini ONAYA sunar; kararları hafızasına alır. Hiçbir şeyi kendi başına değiştirmez. */
type Mesaj = { rol: 'user' | 'assistant'; metin: string; zaman?: string };
const ORNEK = ['Bu hafta satışlar nasıl gitti?', 'Vadesi geçen en büyük 5 alacak kimde?', 'Kritik stokta neler var, ne sipariş edelim?', 'Ölü stokta en pahalı 10 ürün', 'Son 30 günde en çok kâr bıraktıran ürünler'];
const ONCELIK: Record<number, [string, string]> = { 1: ['Acil', 'bg-red-100 text-red-800'], 2: ['Normal', 'bg-slate-100 text-slate-700'], 3: ['Bilgi', 'bg-sky-50 text-sky-800'] };
const AKSIYON_AD: Record<string, string> = { siparis: 'sipariş planı açılır', alma: '"şimdilik alma" işaretlenir', kampanya: 'kampanya planı açılır', iade: 'iade planı açılır', beklet: 'bekletme planı açılır', tahsilat_notu: 'tahsilat notu eklenir' };

/** **kalın** ve satır sonlarını gösteren basit metin */
function Metin({ t }: { t: string }) {
  return <>{t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}</>;
}

export default function AsistanSayfa() {
  const { db, personel, calistir } = useStore();
  const [anahtar, setAnahtar] = useState<boolean | null>(null);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [yazi, setYazi] = useState(''); const [bekle, setBekle] = useState(false);
  const [oneriler, setOneriler] = useState<AsistanOneri[] | null>(null);
  const [hafiza, setHafiza] = useState<AsistanHafiza[] | null>(null);
  const [yeniNot, setYeniNot] = useState('');
  const [red, setRed] = useState<{ id: number; not: string } | null>(null);
  const [gecmisAcik, setGecmisAcik] = useState(false);
  const [sabah, setSabah] = useState(false);
  const sonRef = useRef<HTMLDivElement>(null);

  const oneriOku = () => backend.asistanOneriler().then(setOneriler, () => setOneriler([]));
  const hafizaOku = () => backend.asistanHafiza().then(setHafiza, () => setHafiza([]));
  useEffect(() => {
    backend.asistan({ islem: 'durum' }).then((r) => setAnahtar(!!r.anahtar), () => setAnahtar(false));
    backend.asistanMesajlar().then(setMesajlar, () => undefined);
    oneriOku(); hafizaOku();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { sonRef.current?.scrollIntoView({ block: 'end' }); }, [mesajlar, bekle]);

  const gonder = async (m = yazi) => {
    const t = m.trim(); if (!t || bekle) return;
    setYazi(''); setMesajlar((l) => [...l, { rol: 'user', metin: t }]); setBekle(true);
    const r: AsistanYanit = await backend.asistan({ islem: 'sor', mesaj: t }).catch((e) => ({ ok: false, hata: (e as Error).message }));
    setBekle(false);
    if (!r.ok) { setMesajlar((l) => [...l, { rol: 'assistant', metin: r.hata || 'Cevap alınamadı.' }]); if (r.anahtar_yok) setAnahtar(false); return; }
    setMesajlar((l) => [...l, { rol: 'assistant', metin: r.cevap || '' }]);
    if (r.oneri) { oneriOku(); toast(`${r.oneri} öneri onayınıza sunuldu`); }
    hafizaOku();
  };
  const sabahCalistir = async () => {
    setSabah(true);
    const r: AsistanYanit = await backend.asistan({ islem: 'sabah' }).catch((e) => ({ ok: false, hata: (e as Error).message }));
    setSabah(false);
    if (!r.ok) return toast(r.hata || 'İnceleme yapılamadı', 'hata');
    toast(r.oneri ? `İnceleme bitti: ${r.oneri} yeni öneri` : 'İnceleme bitti: yeni öneri yok'); oneriOku();
  };

  const urunKod = useMemo(() => { const m = new Map<string, (typeof db.urunler)[number]>(); for (const u of db.urunler) { const n = kodNorm(u.kod); if (n) m.set(n, u); } return m; }, [db.urunler]);
  const onayla = (o: AsistanOneri) => calistir(async () => {
    const a = o.aksiyon;
    if (a && a.tip === 'tahsilat_notu') {
      if (!a.cari) throw new Error('Öneride cari adı yok');
      await backend.insert<Partial<TahsilatNot>>('tahsilat_notlari', { cari: a.cari, tur: 'not', metin: a.not || o.baslik, kullanici: personel });
    } else if (a) {
      const u = a.urun_kod ? urunKod.get(kodNorm(a.urun_kod)) : undefined;
      if (!u) throw new Error(`Ürün bulunamadı: ${a.urun_kod ?? '(kod yok)'}`);
      await backend.insert<Partial<StokAksiyon>>('stok_aksiyon', { urun_id: u.id, aksiyon: a.tip as StokAksiyon['aksiyon'], durum: 'planlandi', baslangic_stok: u.stok, notlar: `Asistan: ${a.not || o.baslik}`, kullanici: personel });
    }
    await backend.asistanOneriKarar(o.id, 'onaylandi');
    setOneriler((l) => (l ?? []).map((x) => (x.id === o.id ? { ...x, durum: 'onaylandi' } : x)));
  }, a(o) ? 'Onaylandı ve uygulandı' : 'Onaylandı');
  const reddet = (o: AsistanOneri, not: string) => calistir(async () => {
    await backend.asistanOneriKarar(o.id, 'reddedildi', not || null);
    await backend.asistanHafizaEkle(`Reddedildi: ${o.baslik}${not ? ` — ${not}` : ''}`, 'karar');
    setOneriler((l) => (l ?? []).map((x) => (x.id === o.id ? { ...x, durum: 'reddedildi', karar_notu: not || null } : x))); setRed(null); hafizaOku();
  }, 'Reddedildi; asistan bunu hatırlayacak');
  const notEkle = () => { const t = yeniNot.trim(); if (t.length < 2) return; calistir(async () => { await backend.asistanHafizaEkle(t); setYeniNot(''); await hafizaOku(); }, 'Hafızaya eklendi'); };
  const unut = (h: AsistanHafiza) => calistir(async () => { await backend.asistanHafizaKapat(h.id); setHafiza((l) => (l ?? []).filter((x) => x.id !== h.id)); }, 'Unutuldu');
  const temizle = () => calistir(async () => { await backend.asistan({ islem: 'sohbet_temizle' }); setMesajlar([]); }, 'Sohbet temizlendi');

  const bekleyen = (oneriler ?? []).filter((o) => o.durum === 'yeni').sort((x, y) => x.oncelik - y.oncelik || y.zaman.localeCompare(x.zaman));
  const gecmis = (oneriler ?? []).filter((o) => o.durum !== 'yeni');

  return (
    <div>
      <SayfaBaslik baslik="Asistan" alt="Her sabah 08:37'de verilerinizi inceler, sorularınızı cevaplar. Değişiklikleri onayınıza sunar, kendi başına hiçbir şeyi değiştirmez.">
        <button className="btn-ghost" onClick={sabahCalistir} disabled={sabah || anahtar === false}>{sabah ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {sabah ? 'İnceleniyor…' : 'İncelemeyi şimdi yap'}</button>
      </SayfaBaslik>

      {anahtar === false && <div className="card mb-4 border-l-4 border-l-marka-500 p-4 text-sm">
        <div className="mb-1 flex items-center gap-2 font-semibold"><KeyRound size={16} /> Sohbet için API anahtarı gerekli</div>
        <p className="mb-1.5 text-slate-600 dark:text-slate-300">Sabah incelemesi anahtarsız çalışıyor: Claude her sabah 08:37'de verileri inceleyip önerilerini sağdaki "Onay bekleyenler" listesine yazar. Onaylama, reddetme ve hafıza bugünden kullanılabilir. Sayfadaki sohbet kutusu için anahtar gerekir:</p>
        <ol className="ml-5 list-decimal space-y-0.5 text-slate-600 dark:text-slate-300">
          <li>console.anthropic.com adresinde hesap açın, Billing bölümünden ödeme yöntemi ve isterseniz aylık harcama limiti girin.</li>
          <li>API Keys bölümünden yeni bir anahtar oluşturup kopyalayın.</li>
          <li>Supabase panelinde projenizi açın: Edge Functions → Secrets → Add secret. Adı <b>ANTHROPIC_API_KEY</b>, değeri kopyaladığınız anahtar.</li>
          <li>Bu sayfayı yenileyin. Anahtar sitede ya da veritabanında saklanmaz; yalnız sunucu fonksiyonu kullanır.</li>
        </ol>
      </div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card flex h-[calc(100vh-210px)] min-h-[420px] flex-col">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <Bot size={18} className="text-marka-600" /><b className="text-sm">Sohbet</b>
            {mesajlar.length > 0 && <button className="ml-auto text-xs text-slate-500 hover:text-red-600" onClick={temizle}>Sohbeti temizle</button>}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!mesajlar.length && <div className="text-sm text-slate-500">
              <p className="mb-2">Dükkânla ilgili her şeyi sorabilirsiniz. Örneğin:</p>
              <div className="flex flex-wrap gap-1.5">{ORNEK.map((o) => <button key={o} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-slate-700 hover:border-marka-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={() => gonder(o)} disabled={anahtar === false}>{o}</button>)}</div>
              <p className="mt-3 text-xs">Kalıcı bir karar söylerseniz ("Areon kokuyu artık almayacağız" gibi) hafızasına yazar ve önerilerini buna göre yapar.</p>
            </div>}
            {mesajlar.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-relaxed ${m.rol === 'user' ? 'bg-slate-900 text-white dark:bg-marka-700' : 'border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}><Metin t={m.metin} /></div>
              </div>))}
            {bekle && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Verilere bakıyor…</div>}
            <div ref={sonRef} />
          </div>
          <form className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800" onSubmit={(e) => { e.preventDefault(); gonder(); }}>
            <input className="inp" placeholder={anahtar === false ? 'Önce API anahtarını girin' : 'Sorunuzu yazın…'} value={yazi} onChange={(e) => setYazi(e.target.value)} disabled={bekle || anahtar === false} maxLength={2000} />
            <button className="btn-primary" disabled={bekle || !yazi.trim() || anahtar === false} aria-label="Gönder"><Send size={16} /></button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2"><b className="text-sm">Onay bekleyenler</b><span className="rozet bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{bekleyen.length}</span></div>
            {oneriler === null ? <p className="text-xs text-slate-500">Okunuyor…</p> : !bekleyen.length ? <p className="text-xs text-slate-500">Bekleyen öneri yok. Asistan her sabah inceleme yapıp bulduklarını buraya yazar.</p> :
              <div className="space-y-2">{bekleyen.map((o) => (
                <div key={o.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-start gap-2"><span className={`rozet ${ONCELIK[o.oncelik]?.[1]}`}>{ONCELIK[o.oncelik]?.[0]}</span><b className="flex-1 text-sm leading-snug">{o.baslik}</b></div>
                  {o.aciklama && <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{o.aciklama}</p>}
                  {o.aksiyon && <p className="mt-1.5 text-xs text-slate-500">Onaylarsanız: {o.aksiyon.urun_kod ? <b className="font-mono">{o.aksiyon.urun_kod}</b> : o.aksiyon.cari ? <b>{o.aksiyon.cari}</b> : null} için {AKSIYON_AD[o.aksiyon.tip]}{o.aksiyon.not ? ` (${o.aksiyon.not})` : ''}.</p>}
                  {red?.id === o.id ? <div className="mt-2 flex gap-1.5"><input className="inp py-1 text-xs" autoFocus placeholder="Neden? (isteğe bağlı, asistan öğrenir)" value={red.not} onChange={(e) => setRed({ id: o.id, not: e.target.value })} />
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => reddet(o, red.not.trim())}>Reddet</button><button className="px-1 text-slate-400" onClick={() => setRed(null)} aria-label="Vazgeç"><X size={14} /></button></div>
                    : <div className="mt-2 flex justify-end gap-1.5"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => setRed({ id: o.id, not: '' })}>Reddet</button>
                      <button className="btn-primary px-2.5 py-1 text-xs" onClick={() => onayla(o)}><Check size={13} /> {o.aksiyon ? 'Onayla ve uygula' : 'Tamam'}</button></div>}
                  <div className="mt-1 text-[11px] text-slate-400">{o.kaynak === 'sabah' ? 'Sabah incelemesi' : 'Sohbetten'} · {tarihSaat(o.zaman)}</div>
                </div>))}</div>}
            {gecmis.length > 0 && <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800">
              <button className="text-xs text-slate-500 hover:underline" onClick={() => setGecmisAcik(!gecmisAcik)}>Karar verilenler ({gecmis.length}) {gecmisAcik ? 'gizle' : 'göster'}</button>
              {gecmisAcik && <ul className="mt-1.5 space-y-1 text-xs">{gecmis.slice(0, 30).map((o) => <li key={o.id} className="flex gap-1.5"><span className={o.durum === 'onaylandi' ? 'text-emerald-700' : 'text-slate-400'}>{o.durum === 'onaylandi' ? 'Onaylandı' : 'Reddedildi'}</span><span className="truncate">{o.baslik}{o.karar_notu ? ` — ${o.karar_notu}` : ''}</span></li>)}</ul>}
            </div>}
          </div>

          <div className="card p-4">
            <div className="mb-1 flex items-center gap-2"><b className="text-sm">Hafıza</b><span className="text-xs text-slate-500">asistanın uyduğu kararlar ve notlar</span></div>
            <form className="mb-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); notEkle(); }}>
              <input className="inp py-1.5 text-sm" placeholder="Ör. Yelpa faturası bekleniyor, hatırlatma" value={yeniNot} onChange={(e) => setYeniNot(e.target.value)} maxLength={500} />
              <button className="btn-ghost px-2 py-1 text-sm" disabled={yeniNot.trim().length < 2}>Ekle</button>
            </form>
            {hafiza === null ? <p className="text-xs text-slate-500">Okunuyor…</p> : !hafiza.length ? <p className="text-xs text-slate-500">Henüz not yok.</p> :
              <ul className="max-h-72 space-y-1 overflow-y-auto">{hafiza.map((h) => (
                <li key={h.id} className="group flex items-start gap-2 text-xs"><span className="mt-0.5 rozet shrink-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{h.kaynak === 'karar' ? 'karar' : h.kaynak === 'asistan' ? 'sohbet' : 'not'}</span>
                  <span className="flex-1 leading-relaxed">{h.metin}</span>
                  <button className="text-slate-300 hover:text-red-600" title="Unut" onClick={() => unut(h)}><Trash2 size={13} /></button></li>))}</ul>}
          </div>
        </div>
      </div>
    </div>
  );
}

const a = (o: AsistanOneri) => !!o.aksiyon;
