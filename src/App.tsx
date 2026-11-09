import { asama } from './lib/hataKayit';
import TrendyolSayfa from './pages/Trendyol';
import AsistanSayfa from './pages/Asistan';
import StokFisleri from './pages/StokFisleri';
import { BELGE_MOTORU } from './lib/belge';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Activity, ArrowLeftRight, ClipboardList, Bot, ChevronDown, Search, ShieldAlert, ShoppingBasket, RefreshCw, Wrench, HandCoins, PackageMinus, Warehouse, Lightbulb, Medal, Store, BarChart3, Boxes, LayoutDashboard, LogOut, Menu, Moon, PieChart, Settings, Sun, Tag, Truck, UserCheck, Users, Wallet, X,
} from 'lucide-react';
import { backend, supabase, MODE, onbellekTemizle } from './lib/backend';
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

export type AnaSayfa = 'panel' | 'arama' | 'oneriler' | 'asistan' | 'hareketler' | 'satisanaliz' | 'musteri' | 'sepet' | 'kayip' | 'karzarar' | 'tahsilat' | 'nakit' | 'cariler' | 'analiz' | 'fiyat' | 'usta' | 'eritme' | 'depolar' | 'tedarikci' | 'urunler' | 'performans' | 'trendyol' | 'ayarlar' | 'stokfis';
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

/** Sol menü: günlük iş akışına göre gruplu; "Raporlar" gibi seyrek kullanılanlar kapatılabilir. Ayarlar alt bölümde. */
type MenuGrup = 'Tezgâh' | 'Stok & sipariş' | 'Fiyat' | 'Raporlar';
const MENU: { id: AnaSayfa; ad: string; ikon: typeof LayoutDashboard; grup?: MenuGrup }[] = [
  { id: 'panel', ad: 'Genel Bakış', ikon: LayoutDashboard },
  { id: 'arama', ad: 'Ürün Ara', ikon: Search },
  { id: 'oneriler', ad: 'Öneriler', ikon: Lightbulb },
  { id: 'asistan', ad: 'Asistan', ikon: Bot },
  { id: 'hareketler', ad: 'Satışlar & Alışlar', ikon: ArrowLeftRight, grup: 'Tezgâh' },
  { id: 'tahsilat', ad: 'Tahsilat Takip', ikon: HandCoins, grup: 'Tezgâh' },
  { id: 'cariler', ad: 'Cariler', ikon: Users, grup: 'Tezgâh' },
  // Faz 1 belge motoru: yalnız test sitesinde (canlı derlemeye girmez)
  ...(BELGE_MOTORU ? [{ id: 'stokfis' as AnaSayfa, ad: 'Stok Fişleri (deneme)', ikon: ClipboardList, grup: 'Stok & sipariş' as MenuGrup }] : []),
  { id: 'urunler', ad: 'Ürünler & Stok', ikon: Boxes, grup: 'Stok & sipariş' },
  { id: 'depolar', ad: 'Depolar & Sipariş', ikon: Warehouse, grup: 'Stok & sipariş' },
  { id: 'tedarikci', ad: 'Tedarikçiler', ikon: Truck, grup: 'Stok & sipariş' },
  { id: 'eritme', ad: 'Ölü Stok Eritme', ikon: PackageMinus, grup: 'Stok & sipariş' },
  { id: 'kayip', ad: 'Kayıp-Kaçak Kontrolü', ikon: ShieldAlert, grup: 'Stok & sipariş' },
  { id: 'fiyat', ad: 'Fiyat & Marj', ikon: Tag, grup: 'Fiyat' },
  { id: 'usta', ad: 'Usta Fiyat Listesi', ikon: Wrench, grup: 'Fiyat' },
  { id: 'trendyol', ad: 'Trendyol', ikon: Store, grup: 'Fiyat' },
  { id: 'karzarar', ad: 'Kâr / Zarar', ikon: BarChart3, grup: 'Raporlar' },
  { id: 'nakit', ad: 'Nakit Akışı', ikon: Wallet, grup: 'Raporlar' },
  { id: 'satisanaliz', ad: 'Satış Analizi', ikon: Activity, grup: 'Raporlar' },
  { id: 'musteri', ad: 'Müşteri Analizi', ikon: UserCheck, grup: 'Raporlar' },
  { id: 'sepet', ad: 'Birlikte Satılanlar', ikon: ShoppingBasket, grup: 'Raporlar' },
  { id: 'analiz', ad: 'Ürün Analizi (ABC)', ikon: PieChart, grup: 'Raporlar' },
  { id: 'performans', ad: 'Personel & Usta', ikon: Medal, grup: 'Raporlar' },
  { id: 'ayarlar', ad: 'Ayarlar', ikon: Settings },
];
const KAPALI_ANAHTAR = 'menuKapali';
type Props = { git: (s: Sayfa) => void; alt?: string };
const SAYFALAR = {
  panel: Panel, arama: AramaSayfa, oneriler: Oneriler, asistan: AsistanSayfa, hareketler: Hareketler, satisanaliz: SatisAnalizi, musteri: MusteriAnalizi, sepet: BirlikteSatilan, kayip: KayipKacak, karzarar: KarZararSayfa, tahsilat: Tahsilat, nakit: NakitAkisi, cariler: Cariler,
  analiz: UrunAnalizi, fiyat: FiyatSayfa, usta: UstaFiyat, eritme: EritmeSayfa, depolar: DepolarSayfa, tedarikci: TedarikciSayfa, urunler: UrunlerSayfa, performans: PerformansSayfa, trendyol: TrendyolSayfa, ayarlar: AyarlarSayfa,
  ...(BELGE_MOTORU ? { stokfis: StokFisleri } : {}),
} as Record<AnaSayfa, (p: Props) => React.ReactNode>;

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
  // kapatılan menü grupları (kişiye özel, tarayıcıda hatırlanır)
  const [kapali, setKapali] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(KAPALI_ANAHTAR) ?? '["Raporlar"]')); } catch { return new Set(['Raporlar']); } });
  // asistanın onay bekleyen önerileri (menü rozeti; yalnız yönetici, 10 dakikada bir)
  const [asistanBekleyen, setAsistanBekleyen] = useState(0);
  useEffect(() => {
    if (mode !== 'bulut' || rol !== 'yonetici') return;
    const oku = () => backend.asistanOneriler().then((l) => setAsistanBekleyen(l.filter((o) => o.durum === 'yeni').length), () => undefined);
    oku(); const t = setInterval(oku, 600000); return () => clearInterval(t);
  }, [mode, rol]);
  const grupDegis = (g: string) => setKapali((k) => { const y = new Set(k); if (y.has(g)) y.delete(g); else y.add(g); try { localStorage.setItem(KAPALI_ANAHTAR, JSON.stringify([...y])); } catch { /* yok */ } return y; });
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
  const rozet: Partial<Record<AnaSayfa, number>> = { asistan: asistanBekleyen, oneriler: onemliOneri, tahsilat: tahsilatSay, depolar: kritik, ayarlar: db.bh_durum?.son_hata ? 1 : 0 };
  const bh = db.bh_durum;

  return (
    <div className="flex h-full print:hidden">
      {menuAcik && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuAcik(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 dark:bg-slate-950 dark:border-r dark:border-slate-800 transition-transform lg:static lg:translate-x-0 ${menuAcik ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <div className="min-w-0 border-l-4 border-marka-500 pl-3">
            <div className="truncate font-dar text-xl font-semibold leading-tight text-white">{db.ayarlar.firma_adi}</div>
            <div className="text-xs text-slate-400">BizimHesap analiz</div>
          </div>
          <button className="lg:hidden" onClick={() => setMenuAcik(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
          {menu.filter((m) => m.id !== 'ayarlar').map((m, i, l) => {
            const yeniGrup = m.grup && m.grup !== l[i - 1]?.grup;
            const gizli = !!m.grup && kapali.has(m.grup) && MENU.find((x) => x.id === gecerli)?.grup !== m.grup;
            const grupRozet = m.grup ? l.filter((x) => x.grup === m.grup).reduce((t, x) => t + (rozet[x.id] ?? 0), 0) : 0;
            return (<div key={m.id}>
              {yeniGrup && <button onClick={() => grupDegis(m.grup!)} aria-expanded={!gizli}
                className="mt-2 flex w-full items-center gap-2 border-t border-slate-800 px-3 pb-1 pt-2.5 text-left text-xs font-medium text-slate-500 hover:text-slate-300">
                <span className="flex-1">{m.grup}</span>
                {gizli && grupRozet > 0 && <span className="rozet bg-amber-500/20 text-amber-300">{grupRozet}</span>}
                <ChevronDown size={14} className={`transition-transform ${gizli ? '-rotate-90' : ''}`} />
              </button>}
              {!gizli && <MenuDugme m={m} secili={gecerli === m.id} sayi={rozet[m.id]} git={git} />}
            </div>);
          })}
        </nav>
        <div className="border-t border-slate-800 p-3 text-xs">
          {mode === 'demo' && <div className="mb-2 rounded-md bg-amber-500/15 px-2 py-1.5 text-amber-300">Demo modu — örnek verilerle</div>}
          {bh?.son_esitleme && <div className={`mb-2 flex items-center gap-1.5 ${bh.son_hata ? 'text-red-300' : 'text-slate-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${bh.son_hata ? 'bg-red-400' : Date.now() - new Date(bh.son_esitleme).getTime() > 10 * 60 * 1000 ? 'bg-amber-400' : 'bg-emerald-400'}`} />{menu.some((m) => m.id === 'ayarlar') ? <button className="hover:text-white hover:underline" title="BizimHesap'ta neler değişti" onClick={() => git('ayarlar')}>BizimHesap: {tarihSaat(bh.son_esitleme)}</button> : <>BizimHesap: {tarihSaat(bh.son_esitleme)}</>}
            <button className="ml-auto rounded p-1 hover:bg-slate-800" title="Verileri şimdi yeniden yükle" onClick={async () => { setYenileniyor(true); await yenile(); setYenileniyor(false); }}><RefreshCw size={13} className={yenileniyor ? 'animate-spin' : ''} /></button></div>}
          {menu.some((m) => m.id === 'ayarlar') && <div className="mb-2 -mx-3"><MenuDugme m={MENU.find((m) => m.id === 'ayarlar')!} secili={gecerli === 'ayarlar'} sayi={rozet.ayarlar} git={git} /></div>}
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
        <div className="flex items-center gap-3 border-b-2 border-marka-500 bg-slate-900 px-4 py-3 text-white lg:hidden">
          <button onClick={() => setMenuAcik(true)}><Menu size={22} /></button>
          <span className="font-dar text-lg font-semibold">{MENU.find((m) => m.id === gecerli)?.ad}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6"><Icerik git={git} alt={gecerli === konum.ana ? konum.alt : undefined} /></div>
        <DetayKartlari />
      </main>
    </div>
  );
}

/** Sol menü düğmesi: seçili sayfada solda yeşil şerit */
function MenuDugme({ m, secili, sayi, git }: { m: (typeof MENU)[number]; secili: boolean; sayi?: number; git: (s: Sayfa) => void }) {
  return (
    <button onClick={() => git(m.id)} aria-current={secili ? 'page' : undefined}
      className={`relative flex w-full items-center gap-3 rounded-r-md px-3 py-[7px] text-sm transition ${secili ? 'bg-slate-800 font-medium text-white before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-marka-500' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'}`}>
      <m.ikon size={18} /><span className="flex-1 text-left">{m.ad}</span>
      {!!sayi && <span className={`rozet ${m.id === 'ayarlar' ? 'bg-red-500/25 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{m.id === 'ayarlar' ? '!' : sayi}</span>}
    </button>
  );
}
