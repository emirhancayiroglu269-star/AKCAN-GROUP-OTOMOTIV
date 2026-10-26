import { asama } from './lib/hataKayit';
import TrendyolSayfa from './pages/Trendyol';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Activity, ArrowLeftRight, Search, ShieldAlert, ShoppingBasket, RefreshCw, Wrench, HandCoins, PackageMinus, Warehouse, Lightbulb, Medal, Store, BarChart3, Boxes, LayoutDashboard, LogOut, Menu, Moon, PieChart, Settings, Sun, Tag, Truck, UserCheck, Users, Wallet, X,
} from 'lucide-react';
import { supabase, MODE, onbellekTemizle } from './lib/backend';
import { StoreProvider, Toasts, useStore } from './lib/store';
import { YazdirmaAlani } from './components/Yazdir';
import Giris from './pages/Giris';
import Panel from './pages/Panel';
import Hareketler from './pages/Hareketler';
import UrunAnalizi from './pages/UrunAnalizi';
import Cariler from './pages/Cariler';
import AyarlarSayfa from './pages/Ayarlar';
import SatisAnalizi from './pages/SatisAnalizi';
import MusteriAnalizi from './pages/MusteriAnalizi';
import NakitAkisi from './pages/NakitAkisi';
import Oneriler from './pages/Oneriler';
import Tahsilat from './pages/Tahsilat';
import UstaFiyat from './pages/UstaFiyat';
import KayipKacak from './pages/KayipKacak';
import BirlikteSatilan from './pages/BirlikteSatilan';
import { DepolarSayfa, EritmeSayfa, FiyatSayfa, KarZararSayfa, AramaSayfa, PerformansSayfa, TedarikciSayfa, UrunlerSayfa } from './pages/Birlesik';
import { DetayKartlari } from './components/DetayKart';
import { sayfaIzni } from './lib/yetki';
import { onerileriCikar } from './lib/oneriler';
import { tahsilatListesi } from './lib/tahsilat';
import { ROL_AD } from './lib/types';
import { tarihSaat } from './lib/format';

export type AnaSayfa = 'panel' | 'arama' | 'oneriler' | 'hareketler' | 'satisanaliz' | 'musteri' | 'sepet' | 'kayip' | 'karzarar' | 'tahsilat' | 'nakit' | 'cariler' | 'analiz' | 'fiyat' | 'usta' | 'eritme' | 'depolar' | 'tedarikci' | 'urunler' | 'performans' | 'trendyol' | 'ayarlar';
/** Eski sayfa adları (birleştirilen/kaldırılan) — eski bağlantılar ve öneriler çalışmaya devam etsin diye */
type EskiSayfa = 'aysonu' | 'arac' | 'indirim' | 'deposiparis' | 'katfiyat' | 'stoksagligi' | 'alinacaklar';
export type Sayfa = AnaSayfa | EskiSayfa | `${AnaSayfa}/${string}`;
const ESKI: Record<EskiSayfa, string> = {
  aysonu: 'karzarar/aysonu', katfiyat: 'fiyat/kategori', stoksagligi: 'eritme/yaslanma',
  alinacaklar: 'depolar/toplam', deposiparis: 'depolar/siparis', indirim: 'fiyat/urun', arac: 'satisanaliz',
};
/** "depolar/toplam" → { ana: 'depolar', alt: 'toplam' }; eski adları yenisine çevirir */
export function cozumle(h: string): { ana: AnaSayfa; alt?: string } {
  const t = ESKI[h as EskiSayfa] ?? h;
  const [ana, alt] = t.split('/');
  return { ana: (ana in SAYFALAR ? ana : 'panel') as AnaSayfa, alt };
}

const MENU: { id: AnaSayfa; ad: string; ikon: typeof LayoutDashboard; grup?: string }[] = [
  { id: 'panel', ad: 'Genel Bakış', ikon: LayoutDashboard },
  { id: 'arama', ad: 'Ürün Ara', ikon: Search },
  { id: 'oneriler', ad: 'Öneriler', ikon: Lightbulb },
  { id: 'hareketler', ad: 'Satışlar & Alışlar', ikon: ArrowLeftRight, grup: 'Satış' },
  { id: 'satisanaliz', ad: 'Satış Analizi', ikon: Activity },
  { id: 'musteri', ad: 'Müşteri Analizi', ikon: UserCheck },
  { id: 'sepet', ad: 'Birlikte Satılanlar', ikon: ShoppingBasket },
  { id: 'performans', ad: 'Personel & Usta', ikon: Medal },
  { id: 'karzarar', ad: 'Kâr / Zarar', ikon: BarChart3, grup: 'Para' },
  { id: 'tahsilat', ad: 'Tahsilat Takip', ikon: HandCoins },
  { id: 'nakit', ad: 'Nakit Akışı', ikon: Wallet },
  { id: 'cariler', ad: 'Cariler', ikon: Users },
  { id: 'analiz', ad: 'Ürün Analizi (ABC)', ikon: PieChart, grup: 'Stok' },
  { id: 'fiyat', ad: 'Fiyat & Marj', ikon: Tag },
  { id: 'usta', ad: 'Usta Fiyat Listesi', ikon: Wrench },
  { id: 'eritme', ad: 'Ölü Stok Eritme', ikon: PackageMinus },
  { id: 'kayip', ad: 'Kayıp-Kaçak Kontrolü', ikon: ShieldAlert },
  { id: 'depolar', ad: 'Depolar & Sipariş', ikon: Warehouse },
  { id: 'tedarikci', ad: 'Tedarikçiler', ikon: Truck },
  { id: 'urunler', ad: 'Ürünler & Stok', ikon: Boxes },
  { id: 'trendyol', ad: 'Trendyol', ikon: Store, grup: 'E-Ticaret' },
  { id: 'ayarlar', ad: 'Ayarlar', ikon: Settings, grup: ' ' },
];
type Props = { git: (s: Sayfa) => void; alt?: string };
const SAYFALAR: Record<AnaSayfa, (p: Props) => React.ReactNode> = {
  panel: Panel, arama: AramaSayfa, oneriler: Oneriler, hareketler: Hareketler, satisanaliz: SatisAnalizi, musteri: MusteriAnalizi, sepet: BirlikteSatilan, kayip: KayipKacak, karzarar: KarZararSayfa, tahsilat: Tahsilat, nakit: NakitAkisi, cariler: Cariler,
  analiz: UrunAnalizi, fiyat: FiyatSayfa, usta: UstaFiyat, eritme: EritmeSayfa, depolar: DepolarSayfa, tedarikci: TedarikciSayfa, urunler: UrunlerSayfa, performans: PerformansSayfa, trendyol: TrendyolSayfa, ayarlar: AyarlarSayfa,
};

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(MODE === 'demo' ? null : undefined);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { asama('oturum ' + (data.session ? 'var' : 'yok')); setSession(data.session); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (MODE === 'bulut' && session === undefined) return <div className="grid h-screen place-items-center text-slate-500">Yükleniyor…</div>;
  if (MODE === 'bulut' && !session) return <><Giris /><Toasts /></>;

  const u = session?.user;
  const personel = MODE === 'demo' ? 'Demo Kullanıcı' : (u?.user_metadata?.ad as string) || u?.email?.split('@')[0] || 'Kullanıcı';
  return (
    <StoreProvider personel={personel} eposta={u?.email ?? null}>
      <Kabuk />
      <Toasts />
      <YazdirmaAlani />
    </StoreProvider>
  );
}

function Kabuk() {
  const { db, personel, mode, rol, yenile } = useStore();
  const [yenileniyor, setYenileniyor] = useState(false);
  const [konum, setKonum] = useState(() => cozumle(location.hash.slice(1) || 'panel'));
  const [menuAcik, setMenuAcik] = useState(false);
  const [koyu, setKoyu] = useState(() => document.documentElement.classList.contains('dark'));
  const rolRef = useRef(rol); rolRef.current = rol;
  const git = (s: Sayfa) => { const k = cozumle(s); setKonum(k); location.hash = k.alt ? `${k.ana}/${k.alt}` : k.ana; setMenuAcik(false); };
  useEffect(() => {
    const f = () => setKonum(cozumle(location.hash.slice(1) || 'panel'));
    window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f);
  }, []);
  const onemliOneri = useMemo(() => (rol === 'yonetici' ? onerileriCikar(db).filter((x) => x.oncelik === 1).length : 0), [db, rol]);
  const tahsilatSay = useMemo(() => (rol === 'yonetici' ? tahsilatListesi(db).filter((x) => x.durum === 'soz_gecti' || x.durum === 'soz_bugun').length : 0), [db, rol]);
  useEffect(() => { asama('kabuk cizildi ' + location.hash); }, []);
  const temaDegis = () => {
    const y = !koyu; setKoyu(y); document.documentElement.classList.toggle('dark', y);
    try { localStorage.setItem('tema', y ? 'koyu' : 'acik'); } catch { /* yok */ }
  };

  if (rol === 'yok') return (
    <div className="grid h-screen place-items-center p-6 text-center print:hidden">
      <div className="card max-w-md p-6">
        <p className="mb-2 text-lg font-semibold">Bu programı kullanma yetkiniz yok</p>
        <p className="mb-4 text-sm text-slate-500">Hesabınız kullanıcı listesinde yok ya da pasif. Yöneticinizden Ayarlar → Kullanıcılar bölümünden sizi eklemesini isteyin.</p>
        <button className="btn-ghost" onClick={() => { onbellekTemizle().finally(() => supabase?.auth.signOut()); }}><LogOut size={16} /> Çıkış yap</button>
      </div>
    </div>
  );
  const menu = MENU.filter((m) => sayfaIzni(rol, m.id));
  const gecerli: AnaSayfa = sayfaIzni(rol, konum.ana) ? konum.ana : menu[0].id;
  const Icerik = SAYFALAR[gecerli];
  const kritik = db.urunler.filter((u) => u.aktif && u.kritik_stok > 0 && u.stok <= u.kritik_stok).length;
  const rozet: Partial<Record<AnaSayfa, number>> = { oneriler: onemliOneri, tahsilat: tahsilatSay, depolar: kritik, ayarlar: db.bh_durum?.son_hata ? 1 : 0 };
  const bh = db.bh_durum;

  return (
    <div className="flex h-full print:hidden">
      {menuAcik && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuAcik(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform lg:static lg:translate-x-0 ${menuAcik ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-marka-500">BizimHesap Analiz</div>
            <div className="truncate text-base font-bold text-white">{db.ayarlar.firma_adi}</div>
          </div>
          <button className="lg:hidden" onClick={() => setMenuAcik(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {menu.map((m) => (<div key={m.id}>
            {m.grup && <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{m.grup}</div>}
            <button onClick={() => git(m.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${gecerli === m.id ? 'bg-marka-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
              <m.ikon size={18} /><span className="flex-1 text-left">{m.ad}</span>
              {!!rozet[m.id] && <span className={`rozet ${m.id === 'ayarlar' ? 'bg-red-500/25 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{m.id === 'ayarlar' ? '!' : rozet[m.id]}</span>}
            </button>
          </div>))}
        </nav>
        <div className="border-t border-slate-800 p-3 text-xs">
          {mode === 'demo' && <div className="mb-2 rounded-md bg-amber-500/15 px-2 py-1.5 text-amber-300">Demo modu — örnek verilerle</div>}
          {bh?.son_esitleme && <div className={`mb-2 flex items-center gap-1.5 ${bh.son_hata ? 'text-red-300' : 'text-slate-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${bh.son_hata ? 'bg-red-400' : Date.now() - new Date(bh.son_esitleme).getTime() > 10 * 60 * 1000 ? 'bg-amber-400' : 'bg-emerald-400'}`} />BizimHesap: {tarihSaat(bh.son_esitleme)}
            <button className="ml-auto rounded p-1 hover:bg-slate-800" title="Verileri şimdi yeniden yükle" onClick={async () => { setYenileniyor(true); await yenile(); setYenileniyor(false); }}><RefreshCw size={13} className={yenileniyor ? 'animate-spin' : ''} /></button></div>}
          <div className="flex items-center justify-between">
            <span className="min-w-0 truncate">{personel}{mode === 'bulut' && rol !== 'yonetici' && <span className="ml-1 text-slate-500">· {ROL_AD[rol]}</span>}</span>
            <div className="flex gap-1">
              <button onClick={temaDegis} className="rounded p-1.5 hover:bg-slate-800" title="Tema">{koyu ? <Sun size={16} /> : <Moon size={16} />}</button>
              {mode === 'bulut' && <button onClick={() => { onbellekTemizle().finally(() => supabase?.auth.signOut()); }} className="rounded p-1.5 hover:bg-slate-800" title="Çıkış"><LogOut size={16} /></button>}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <button onClick={() => setMenuAcik(true)}><Menu size={22} /></button>
          <span className="font-semibold">{MENU.find((m) => m.id === gecerli)?.ad}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6"><Icerik git={git} alt={gecerli === konum.ana ? konum.alt : undefined} /></div>
        <DetayKartlari />
      </main>
    </div>
  );
}
