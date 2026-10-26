import { para } from '../lib/format';
import type { urunTedarikcileri } from '../lib/analiz3';

type Ted = ReturnType<typeof urunTedarikcileri> extends Map<string, infer V> ? V : never;

/** Son alış en ucuz tedarikçiden yapılmadıysa ve %5'ten fazla pahalıysa uyarı */
export function PahaliRozet({ t, maliyet }: { t: Ted | undefined; maliyet: boolean }) {
  if (!t?.pahali) return null;
  return (
    <span className="ml-1.5 rozet bg-red-50 text-red-700" title={`Son alış ${t.son.ad}${maliyet ? ` (${para(t.son.fiyat)})` : ''}; son 6 ayda ${t.ucuz.ad}${maliyet ? ` ortalama ${para(t.ucuz.fiyat)}` : ''}`}>
      ⚠ son alış %{t.pahali.oran.toFixed(0)} pahalı · {t.ucuz.ad}'dan al
    </span>
  );
}
