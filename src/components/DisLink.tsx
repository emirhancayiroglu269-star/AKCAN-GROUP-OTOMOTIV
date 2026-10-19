import { ExternalLink } from 'lucide-react';
import type { Urun } from '../lib/types';
import { otoparcasanAra, otoparcasanTerim } from '../lib/dis';

/** "otoparcasan'da ara": yeni sekmede rakip sitenin aramasını açar (veri çekilmez) */
export function OtoparcasanLink({ u, kisa = false }: { u: Pick<Urun, 'kod' | 'etiket'>; kisa?: boolean }) {
  const url = otoparcasanAra(u); if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-0.5 whitespace-nowrap text-[11px] font-normal text-orange-600 hover:underline" title={`otoparcasan.com'da "${otoparcasanTerim(u)}" ara (yeni sekme)`}>
      <ExternalLink size={11} />{kisa ? 'otoparcasan' : "otoparcasan'da ara"}
    </a>
  );
}
