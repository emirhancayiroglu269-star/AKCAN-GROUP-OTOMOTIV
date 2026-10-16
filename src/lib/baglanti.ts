/**
 * Supabase bağlantı bilgileri (Supabase > Project Settings > API).
 * .env dosyasında VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY varsa onlar önceliklidir.
 * İkisini de boş bırakırsanız program demo modunda açılır.
 * Not: anon anahtar tarayıcıya açık bir anahtardır; güvenlik veritabanındaki RLS kurallarıyla sağlanır.
 */
export const SUPABASE_URL = 'https://qmafuyuocmcobrstnmbx.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtYWZ1eXVvY21jb2Jyc3RubWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjQyNDAsImV4cCI6MjEwNzQwMDI0MH0.jGOhkZ05ZhQUs-ruhnFoRNFnHwSHgsF4EEG_MXkPLTA';
