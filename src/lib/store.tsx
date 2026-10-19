import { hataKaydet } from './hataKayit';
import { useRef, createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { faturaAlisUygula } from './efektifAlis';
import { backend, MODE } from './backend';
import type { DB, Rol } from './types';
import { rolBul, yetkili, type Yetki } from './yetki';

interface Ctx { db: DB; yenile: () => Promise<void>; personel: string; rol: Rol | 'yok'; eposta: string | null; izin: (y: Yetki) => boolean; mode: typeof MODE; calistir: <T>(f: () => Promise<T>, basari?: string) => Promise<NonNullable<T> | true | undefined> }
const C = createContext<Ctx | null>(null);

type Toast = { id: number; text: string; tip: 'ok' | 'hata' };
let toastSet: ((f: (t: Toast[]) => Toast[]) => void) | null = null;
export function toast(text: string, tip: Toast['tip'] = 'ok') {
  const id = Date.now() + Math.random();
  toastSet?.((t) => [...t, { id, text, tip }]);
  setTimeout(() => toastSet?.((t) => t.filter((x) => x.id !== id)), 3500);
}
export function Toasts() {
  const [list, set] = useState<Toast[]>([]);
  useEffect(() => { toastSet = set; return () => { toastSet = null; }; }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 print:hidden">
      {list.map((t) => (
        <div key={t.id} className={`rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${t.tip === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>{t.text}</div>
      ))}
    </div>
  );
}

/** İlk yükleme uzun sürerse (yavaş mobil bağlantı) kullanıcı ne olduğunu görsün */
function YukleniyorEkrani() {
  const [sn, setSn] = useState(0);
  useEffect(() => { const t = setInterval(() => setSn((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="grid h-screen place-items-center p-6 text-center text-slate-500">
      <div><div>Veriler yükleniyor…{sn >= 5 ? ` (${sn} sn)` : ''}</div>
        {sn >= 25 && <div className="mt-3 max-w-xs text-xs">Bağlantı yavaş görünüyor. Bekleyebilir ya da <button className="text-marka-600 underline" onClick={() => location.reload()}>sayfayı yenileyebilirsiniz</button>.</div>}</div>
    </div>
  );
}

export function StoreProvider({ personel: varsayilanAd, eposta = null, children }: { personel: string; eposta?: string | null; children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  // Aynı anda tek yükleme: veritabanı yavaşsa yüklemeler üst üste binip onu daha da yormasın
  const yukleniyor = useRef(false);
  const yenile = useCallback(async () => {
    if (yukleniyor.current) return;
    yukleniyor.current = true;
    try { setDb(faturaAlisUygula(await backend.load())); setHata(null); } catch (e) { hataKaydet(e, 'yukleme'); setHata((e as Error).message); } finally { yukleniyor.current = false; }
  }, []);
  useEffect(() => {
    yenile();
    const omTazele = async () => { try { const om = await backend.omVeri(); setDb((x) => (x ? { ...x, otomarmara_veri: om } : x)); } catch { /* sonraki olayda */ } };
    const kapat = backend.subscribe(yenile, omTazele);
    // BizimHesap her dakika eşitlenir. 30 sn'de bir tek satırlık durum okunur; yalnız veri değiştiyse tamamı yeniden yüklenir.
    // Veri değişince tamamı yeniden yüklenir, ama en sık 3 dakikada bir (gün içinde stok her dakika değişebiliyor)
    const ENAZ = 3 * 60 * 1000;
    let imza: string | null = null; let tamYukleme = Date.now(); let bekleyen = false;
    const kontrol = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const d = await backend.durum(); if (!d) return;
        if (imza !== null && d.imza !== imza) bekleyen = true;
        imza = d.imza;
        const gecen = Date.now() - tamYukleme;
        if ((bekleyen && gecen > ENAZ) || gecen > 15 * 60 * 1000) { bekleyen = false; tamYukleme = Date.now(); yenile(); return; }
        setDb((x) => (x && x.bh_durum && x.bh_durum.son_esitleme !== d.son_esitleme ? { ...x, bh_durum: { ...x.bh_durum, son_esitleme: d.son_esitleme } } : x));
      } catch { /* bağlantı yoksa sonraki turda */ }
    };
    const t = setInterval(kontrol, 30 * 1000);
    let son = Date.now();
    const gorunur = () => { if (document.visibilityState === 'visible' && Date.now() - son > 3 * 60 * 1000 && Date.now() - tamYukleme > 3 * 60 * 1000) { son = Date.now(); tamYukleme = Date.now(); yenile(); } };
    document.addEventListener('visibilitychange', gorunur); window.addEventListener('focus', gorunur);
    return () => { kapat(); clearInterval(t); document.removeEventListener('visibilitychange', gorunur); window.removeEventListener('focus', gorunur); };
  }, [yenile]);

  const calistir = useCallback(async <T,>(f: () => Promise<T>, basari?: string) => {
    try { const r = await f(); if (MODE === 'bulut') await yenile(); if (basari) toast(basari); return (r ?? true) as NonNullable<T> | true; }
    catch (e) { toast('Hata: ' + (e as Error).message, 'hata'); return undefined; }
  }, [yenile]);

  if (hata && !db) return (
    <div className="grid h-screen place-items-center p-6 text-center">
      <div className="max-w-md">
        <p className="mb-2 text-lg font-semibold">Veriler yüklenemedi</p>
        <p className="mb-4 text-sm text-slate-500">{hata}</p>
        <p className="mb-4 text-xs text-slate-500">Supabase'de supabase/schema.sql dosyasını çalıştırdığınızdan emin olun.</p>
        <button className="btn-primary" onClick={yenile}>Tekrar dene</button>
      </div>
    </div>
  );
  if (!db) return <YukleniyorEkrani />;
  const { rol, kayit } = MODE === 'demo' ? { rol: 'yonetici' as const, kayit: undefined } : rolBul(db, eposta);
  const personel = kayit?.ad || varsayilanAd;
  const izin = (y: Yetki) => yetkili(rol, y);
  return <C.Provider value={{ db, yenile, personel, rol, eposta, izin, mode: MODE, calistir }}>{children}</C.Provider>;
}

export function useStore() { const c = useContext(C); if (!c) throw new Error('StoreProvider yok'); return c; }
