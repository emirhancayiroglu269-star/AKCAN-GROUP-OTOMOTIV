import { createClient } from "@supabase/supabase-js";

// Merkezi veri sunucusu — tüm bilgisayarlar aynı veriyi kullanır.
export const MERKEZI_API = "https://oungmlyniuwpoyfghvrz.supabase.co/functions/v1/app-state";
export const OTURUM_KEY = "akcan-merkezi-oturum";
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://oungmlyniuwpoyfghvrz.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6mdoEyS-O79tqVm2AogJDA_buYLyv--";
export const supabaseRealtime = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const merkeziIstek = async (action, options = {}) => {
  const opts = options as any;
  const { method = "GET", body, token = localStorage.getItem(OTURUM_KEY) } = opts;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const cevap = await fetch(`${MERKEZI_API}?action=${encodeURIComponent(action)}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  let veri = null;
  try { veri = await cevap.json(); } catch { veri = null; }
  if (!cevap.ok) {
    const hata: any = new Error(veri?.error || veri?.message || `Merkezi sunucu hatası (${cevap.status})`);
    hata.status = cevap.status;
    throw hata;
  }
  return veri || {};
};
