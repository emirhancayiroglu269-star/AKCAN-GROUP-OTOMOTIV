import type { ReactNode } from 'react';
import type { Sayfa } from '../App';
import { useStore } from '../lib/store';
import Depolar from './Depolar';
import DepoSiparis from './DepoSiparis';
import Alinacaklar from './Alinacaklar';
import StokEritme from './StokEritme';
import StokSagligi from './StokSagligi';
import FiyatMarj from './FiyatMarj';
import KategoriFiyat from './KategoriFiyat';
import EksikBilgi from './EksikBilgi';
import KarZarar from './KarZarar';
import AySonu from './AySonu';
import Urunler from './Urunler';
import { FiyatUyarilari, StokSayimi, TransferOnerisi } from './UrunlerEk';

type Sekme = { id: string; ad: string; bilesen: () => ReactNode; izin?: boolean };
type P = { git: (s: Sayfa) => void; alt?: string };

/** Birden çok eski sayfayı tek menü maddesi altında sekmelerle gösterir. Adres: #sayfa/sekme */
function Sekmeli({ sayfa, sekmeler, alt, git }: P & { sayfa: string; sekmeler: Sekme[] }) {
  const gorunen = sekmeler.filter((s) => s.izin !== false);
  const aktif = gorunen.find((s) => s.id === alt) ?? gorunen[0];
  const Bilesen = aktif.bilesen;
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60 print:hidden" role="tablist">
        {gorunen.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === aktif.id} onClick={() => git(`${sayfa}/${s.id}` as Sayfa)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${s.id === aktif.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
            {s.ad}
          </button>
        ))}
      </div>
      <Bilesen key={aktif.id} />
    </div>
  );
}

export function DepolarSayfa(p: P) {
  const { izin } = useStore();
  return <Sekmeli {...p} sayfa="depolar" sekmeler={[
    { id: 'siparis', ad: 'Siparişler (depo bazında)', bilesen: DepoSiparis },
    { id: 'toplam', ad: 'Kritik stok & alınacaklar', bilesen: Alinacaklar },
    { id: 'karsilastirma', ad: 'Depo karşılaştırması', bilesen: Depolar, izin: izin('maliyet') },
  ]} />;
}
export const EritmeSayfa = (p: P) => <Sekmeli {...p} sayfa="eritme" sekmeler={[
  { id: 'plan', ad: 'Eritme planı', bilesen: StokEritme },
  { id: 'yaslanma', ad: 'Yaşlanma & devir hızı', bilesen: StokSagligi },
]} />;
export const FiyatSayfa = (p: P) => <Sekmeli {...p} sayfa="fiyat" sekmeler={[
  { id: 'urun', ad: 'Ürün bazında', bilesen: FiyatMarj },
  { id: 'kategori', ad: 'Kategori bazında', bilesen: KategoriFiyat },
  { id: 'eksik', ad: 'Eksik kart bilgisi', bilesen: EksikBilgi },
]} />;
export const KarZararSayfa = (p: P) => <Sekmeli {...p} sayfa="karzarar" sekmeler={[
  { id: 'ozet', ad: 'Özet', bilesen: KarZarar },
  { id: 'aysonu', ad: 'Ay sonu tahmini', bilesen: AySonu },
]} />;
export function UrunlerSayfa(p: P) {
  const { izin, db } = useStore();
  return <Sekmeli {...p} sayfa="urunler" sekmeler={[
    { id: 'liste', ad: 'Ürün listesi', bilesen: Urunler },
    { id: 'sayim', ad: 'Stok sayımı', bilesen: StokSayimi },
    { id: 'transfer', ad: 'Depolar arası transfer', bilesen: TransferOnerisi, izin: db.depolar.filter((d) => d.aktif).length > 1 },
    { id: 'fiyat', ad: 'Fiyat uyarıları', bilesen: FiyatUyarilari, izin: izin('maliyet') },
  ]} />;
}
