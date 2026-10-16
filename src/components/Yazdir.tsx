import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

let setIcerik: ((n: ReactNode) => void) | null = null;

/** Verilen içeriği yazdırma alanına koyar ve tarayıcının yazdır penceresini açar. */
export function yazdir(n: ReactNode) {
  setIcerik?.(n);
  setTimeout(() => { window.print(); }, 80);
}

export function YazdirmaAlani() {
  const [icerik, set] = useState<ReactNode>(null);
  useEffect(() => { setIcerik = set; return () => { setIcerik = null; }; }, []);
  return createPortal(<div id="yazdir" className="hidden bg-white text-black print:block">{icerik}</div>, document.body);
}
