# FAZ 27 — Supabase Veri Akış Haritası

Bu rapor yalnızca kaynak kod statik taramasıyla oluşturuldu. Production database'e bağlanılmadı.

Supabase bağlantılı dosya sayısı: 5

## src/App.tsx
- L49: `const raw = localStorage.getItem(R.STORAGE_KEY);`
- L92: `try { localStorage.setItem(R.STORAGE_KEY, JSON.stringify(db)); } catch {}`
- L141: `// Çoklu bilgisayar senkronizasyonu: Realtime olayını dinle; yerel kayıt`
- L143: `// hemen sonra yeniden yükle. Realtime koparsa 2 saniyelik güvenli fallback`
- L171: `try { localStorage.setItem(R.STORAGE_KEY, JSON.stringify(R.veriyiOnar({ ...R.bosVeritabani(), ...yeni }))); } catch {}`
- L178: `// Supabase Realtime: app_events tablosundaki her app_state_changed`
- L181: `const channel = R.supabaseRealtime`
- L182: `.channel("akcan-app-state-realtime")`
- L203: `// İlk yükleme ve Realtime bağlantısı kurulmadan önceki değişiklikler için`
- L212: `R.supabaseRealtime.removeChannel(channel);`

## src/core/akcan-runtime.tsx
- L74: `SUPABASE_URL,`
- L75: `SUPABASE_PUBLISHABLE_KEY,`
- L76: `supabaseRealtime,`
- L78: `} from "../lib/supabase";`
- L303: `export { React, useState, useEffect, useRef, loginBrandImage, Package, Plus, Search, X, Check, Pencil, Trash2, AlertTriangle, Loader2, Car, ImageIcon, History, TrendingUp, EyeOff, Eye, GitCompare, ShoppingCart, Zap, Printer, RotateCcw, Tag,`

## src/lib/supabase.ts
- L1: `import { createClient } from "@supabase/supabase-js";`
- L4: `export const MERKEZI_API = "https://oungmlyniuwpoyfghvrz.supabase.co/functions/v1/app-state";`
- L6: `export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://oungmlyniuwpoyfghvrz.supabase.co";`
- L7: `export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6mdoEyS-O79tqVm2AogJDA_buYLyv--";`
- L8: `export const supabaseRealtime = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {`

## src/lib/guvenlik-politikasi.ts
- L73: `* Gerçek güvenlik Supabase RLS / Edge Function / server-side authorization`

## src/lib/domain/finans-test-runner.ts
- L17: `// Üretim verisine veya Supabase'e yazmaz.`

## Sonraki inceleme
1. Supabase client'ın nerede oluşturulduğunu belirle.
2. Veri erişiminin hangi servis/hook katmanından geçtiğini çıkar.
3. Auth kullanıcı/rol akışını ayır.
4. Realtime varsa kanal ve tablo eşleşmesini belirle.
5. UI → servis → Supabase veri akışını tek şemada birleştir.