import { Copy } from 'lucide-react';
import { toast } from '../lib/store';

/** Stok kodunu gösterir; tıklayınca panoya kopyalar (BizimHesap / tedarikçi aramasına yapıştırmak için) */
export function KodKopyala({ kod, className = '' }: { kod: string; className?: string }) {
  const kopyala = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    navigator.clipboard.writeText(kod).then(() => toast(`Kopyalandı: ${kod}`), () => toast('Kopyalanamadı', 'hata'));
  };
  return (
    <button type="button" onClick={kopyala} title="Kodu kopyala" className={`group inline-flex items-center gap-1 rounded font-mono hover:bg-slate-100 hover:text-marka-700 dark:hover:bg-slate-800 ${className}`}>
      {kod}<Copy size={11} className="opacity-40 group-hover:opacity-100" />
    </button>
  );
}
