import { useEffect, useState } from 'react';
import type { DB, ID } from './types';

export const aktifDepolar = (db: DB) => db.depolar.filter((d) => d.aktif);

/** Ürünün bir depodaki (veya depo verilmezse tüm depolardaki) stoğu */
export function depoStogu(db: DB, urunId: ID, depoId?: ID | null): number {
  if (!depoId) return db.urunler.find((u) => u.id === urunId)?.stok ?? 0;
  return db.urun_depo_stok.find((s) => s.urun_id === urunId && s.depo_id === depoId)?.miktar ?? 0;
}

/** urun_id → { depo_id → miktar } (tablo görünümleri için hızlı erişim) */
export function stokHaritasi(db: DB) {
  const m = new Map<ID, Map<ID, number>>();
  for (const s of db.urun_depo_stok) {
    let x = m.get(s.urun_id); if (!x) { x = new Map(); m.set(s.urun_id, x); }
    x.set(s.depo_id, s.miktar);
  }
  return m;
}

const ANAHTAR = 'secili-depo';
/** Kasada seçili depo; tarayıcıda hatırlanır */
export function useSeciliDepo(db: DB): [ID | null, (id: ID) => void] {
  const depolar = aktifDepolar(db);
  const [secili, setSecili] = useState<ID | null>(() => { try { return localStorage.getItem(ANAHTAR); } catch { return null; } });
  const gecerli = depolar.find((d) => d.id === secili)?.id ?? depolar[0]?.id ?? null;
  useEffect(() => { if (gecerli && gecerli !== secili) setSecili(gecerli); }, [gecerli, secili]);
  const sec = (id: ID) => { setSecili(id); try { localStorage.setItem(ANAHTAR, id); } catch { /* yok */ } };
  return [gecerli, sec];
}

export const depoAdi = (db: DB, id?: ID | null) => (id ? db.depolar.find((d) => d.id === id)?.ad ?? '—' : '—');
