-- Eklentinin BizimHesap'a yüklediği kart alış fiyatı değişikliklerinin kaydı
create table if not exists public.bh_alis_log (
  id bigint generated always as identity primary key,
  zaman timestamptz not null default now(),
  urun_id uuid references public.urunler(id) on delete set null,
  kod text, ad text, eski numeric, yeni numeric, tedarikci text
);
create index if not exists bh_alis_log_zaman on public.bh_alis_log (zaman desc);
alter table public.bh_alis_log enable row level security;
create policy bh_alis_log_okuma on public.bh_alis_log for select to authenticated using (benim_rolum() = 'yonetici');
grant select on public.bh_alis_log to authenticated;
grant select, insert, update, delete on public.bh_alis_log to service_role;
