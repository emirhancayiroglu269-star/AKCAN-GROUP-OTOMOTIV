-- Stok sayımı (Ürünler & Stok > Stok sayımı). BizimHesap'a yazılmaz.
create table if not exists public.sayim (
  depo_id uuid not null references public.depolar(id) on delete cascade,
  urun_id uuid not null references public.urunler(id) on delete cascade,
  sayilan numeric not null,
  sistem numeric,
  kullanici text,
  zaman timestamptz not null default now(),
  primary key (depo_id, urun_id)
);
alter table public.sayim enable row level security;
create policy giris_yapan_tam_yetki on public.sayim for all to authenticated using (benim_rolum() <> 'yok') with check (benim_rolum() <> 'yok');
grant select, insert, update, delete on public.sayim to authenticated;
grant select, insert, update, delete on public.sayim to service_role;
revoke all on public.sayim from anon;
