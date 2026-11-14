/// <reference types="vite/client" />

// Vite ortam değişkenleri (import.meta.env) ve varlık modülleri için tip tanımları.
// Vite 8 ile birlikte gelen `vite/client` tipleri .env değişkenlerini tanımlar;
// aşağıdaki arayüzler projeye özel değişkenleri belgeler.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css";
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.svg" {
  const src: string;
  export default src;
}
