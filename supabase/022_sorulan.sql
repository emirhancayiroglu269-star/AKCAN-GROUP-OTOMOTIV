-- Tezgâhta sorulan ama stokta olmayan parçalar (kaçan satış kaydı). BizimHesap'a yazılmaz.
create table if not exists public.sorulan (
  id bigserial primary key,
  zaman timestamptz not null default now(),
  metin text not null,
  urun_id uuid references public.urunler(id) on delete set null,
  kullanici text,
  adet integer not null default 1
);
create index if not exists sorulan_zaman_idx on public.sorulan (zaman desc);
alter table public.sorulan enable row level security;
create policy giris_yapan_tam_yetki on public.sorulan for all to authenticated using (benim_rolum() <> 'yok') with check (benim_rolum() <> 'yok');
grant select, insert, update, delete on public.sorulan to authenticated;
grant select, insert, update, delete on public.sorulan to service_role;
grant usage, select on sequence public.sorulan_id_seq to authenticated, service_role;
revoke all on public.sorulan from anon;
