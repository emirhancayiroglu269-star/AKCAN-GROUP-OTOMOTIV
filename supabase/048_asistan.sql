-- Asistan (Claude API): hafıza, sohbet geçmişi, onay bekleyen öneriler. Yalnız yönetici (maliyet ve cari verisi içerir).
create table if not exists public.asistan_hafiza (
  id bigserial primary key, metin text not null check (length(metin) between 2 and 500),
  kaynak text not null default 'kullanici' check (kaynak in ('kullanici','asistan','karar')),
  aktif boolean not null default true, kullanici text, olusturma timestamptz not null default now()
);
create table if not exists public.asistan_mesaj (
  id bigserial primary key, kullanici text not null, rol text not null check (rol in ('user','assistant')),
  metin text not null, zaman timestamptz not null default now()
);
create index if not exists asistan_mesaj_k_idx on public.asistan_mesaj (kullanici, zaman desc);
create table if not exists public.asistan_oneri (
  id bigserial primary key, zaman timestamptz not null default now(), kaynak text not null default 'sabah',
  baslik text not null, aciklama text, oncelik int not null default 2 check (oncelik between 1 and 3),
  aksiyon jsonb, durum text not null default 'yeni' check (durum in ('yeni','onaylandi','reddedildi')),
  karar_notu text, karar_zaman timestamptz, kullanici text
);
create index if not exists asistan_oneri_durum_idx on public.asistan_oneri (durum, zaman desc);
do $$ declare t text; begin
  foreach t in array array['asistan_hafiza','asistan_mesaj','asistan_oneri'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists yonetici_tam on public.%I', t);
    execute format('create policy yonetici_tam on public.%I for all to authenticated using (benim_rolum() = ''yonetici'') with check (benim_rolum() = ''yonetici'')', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
    execute format('grant usage, select on sequence public.%I_id_seq to authenticated, service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Her sabah 08:46 (İstanbul) inceleme: önerileri onaya sunar. Anahtar yoksa fonksiyon hemen "anahtar yok" döner (maliyet yok).
-- select cron.schedule('asistan-sabah', '46 5 * * *', $c$ select net.http_post(url := 'https://qmafuyuocmcobrstnmbx.supabase.co/functions/v1/asistan',
--   headers := jsonb_build_object('Content-Type','application/json','x-zamanlayici',(select anahtar from public.ty_gizli where id = 1)),
--   body := '{"islem":"sabah"}'::jsonb, timeout_milliseconds := 150000) $c$);
