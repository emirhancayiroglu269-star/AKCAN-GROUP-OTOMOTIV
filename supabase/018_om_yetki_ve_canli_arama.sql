-- 2026-10-20 akşam
-- Otomarmara canlı arama (otomarmara-ara fonksiyonu): sonuç önbelleği ve sunucunun Otomarmara oturumu (yalnız sunucu erişir)
create table if not exists public.om_arama (anahtar text primary key, sonuc jsonb not null, zaman timestamptz not null default now());
alter table public.om_arama enable row level security;
create table if not exists public.om_oturum (id int primary key default 1 check (id = 1), cerez text, zaman timestamptz, son_istek timestamptz);
alter table public.om_oturum enable row level security;
insert into public.om_oturum (id) values (1) on conflict do nothing;
revoke all on public.om_arama, public.om_oturum from anon, authenticated;
-- ürün listesi hızı: etiket hazır sütun + sıralama dizini
alter table public.urunler add column if not exists etiket text generated always as (bh_ham->>'tag') stored;
create index if not exists urunler_olusturma_idx on public.urunler (olusturma desc, id);
-- Otomarmara fonksiyonları yalnız sunucu (cron / servis) tarafından kullanılır; herkese açık anahtarla çağrılamaz
revoke execute on function public.om_yer_imi_anahtari() from public, anon, authenticated;
revoke execute on function public.om_bekleyen(text) from public, anon, authenticated;
revoke execute on function public.om_sonuc(text, jsonb) from public, anon, authenticated;
revoke execute on function public.om_kuyruk_besle() from public, anon, authenticated;
revoke execute on function public.om_yenile(integer, integer) from public, anon, authenticated;
update public.om_anahtari set son = now() where son > now();
