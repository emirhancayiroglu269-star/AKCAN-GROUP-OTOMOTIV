/**
 * Tarayıcı önbelleği (IndexedDB): ham tabloların son kopyası.
 * Site açılınca önce buradan gösterilir, sonra sunucudan yalnız değişen satırlar alınır.
 * Supabase ücretsiz planın aylık 5 GB veri çıkış sınırı için. Erişilemezse (gizli sekme vb.) sessizce devre dışı kalır.
 */
const DB_AD = 'bh-analiz';
const DEPO = 'ham';

function ac(): Promise<IDBDatabase | null> {
  return new Promise((coz) => {
    try {
      const r = indexedDB.open(DB_AD, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(DEPO); };
      r.onsuccess = () => coz(r.result);
      r.onerror = () => coz(null);
      r.onblocked = () => coz(null);
    } catch { coz(null); }
  });
}

export async function onbellekOku<T>(anahtar: string): Promise<T | null> {
  const db = await ac(); if (!db) return null;
  return new Promise((coz) => {
    try {
      const r = db.transaction(DEPO, 'readonly').objectStore(DEPO).get(anahtar);
      r.onsuccess = () => { coz((r.result as T) ?? null); db.close(); };
      r.onerror = () => { coz(null); db.close(); };
    } catch { coz(null); db.close(); }
  });
}

export async function onbellekYaz(anahtar: string, deger: unknown): Promise<void> {
  const db = await ac(); if (!db) return;
  await new Promise<void>((coz) => {
    try {
      const tx = db.transaction(DEPO, 'readwrite'); tx.objectStore(DEPO).put(deger, anahtar);
      tx.oncomplete = () => { coz(); db.close(); }; tx.onerror = () => { coz(); db.close(); }; tx.onabort = () => { coz(); db.close(); };
    } catch { coz(); db.close(); }
  });
}

export async function onbellekSil(anahtar: string): Promise<void> {
  const db = await ac(); if (!db) return;
  await new Promise<void>((coz) => {
    try { const tx = db.transaction(DEPO, 'readwrite'); tx.objectStore(DEPO).delete(anahtar); tx.oncomplete = () => { coz(); db.close(); }; tx.onerror = () => { coz(); db.close(); }; }
    catch { coz(); db.close(); }
  });
}
