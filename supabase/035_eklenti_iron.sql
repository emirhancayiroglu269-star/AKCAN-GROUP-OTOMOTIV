-- Iron Otomotiv tarayıcı eklentisi: eklenti-kaydet edge function'ı bu tablolara yazar (eklenti/iron klasörü).
alter table public.tedarikci_maliyet drop constraint if exists tedarikci_maliyet_tedarikci_check;
alter table public.tedarikci_maliyet add constraint tedarikci_maliyet_tedarikci_check check (tedarikci in ('otomarmara','neko','iron'));

create table if not exists public.tedarikci_katalog (
  tedarikci text not null, kod text not null, kod_norm text not null,
  marka text, ad text, oem text,
  fiyat numeric, liste numeric, stok numeric, depolar jsonb,
  zaman timestamptz not null default now(),
  primary key (tedarikci, kod)
);
create index if not exists tedarikci_katalog_norm on public.tedarikci_katalog (kod_norm);
alter table public.tedarikci_katalog enable row level security;
create policy tedarikci_katalog_okuma on public.tedarikci_katalog for select to authenticated using (benim_rolum() = 'yonetici');
grant select on public.tedarikci_katalog to authenticated;
grant select, insert, update, delete on public.tedarikci_katalog to service_role;

create table if not exists public.eklenti_anahtar (
  id int primary key default 1 check (id = 1),
  anahtar text not null default encode(gen_random_bytes(24), 'hex'),
  olusturma timestamptz not null default now()
);
insert into public.eklenti_anahtar (id) values (1) on conflict do nothing;
alter table public.eklenti_anahtar enable row level security;
create policy eklenti_anahtar_okuma on public.eklenti_anahtar for select to authenticated using (benim_rolum() = 'yonetici');
grant select on public.eklenti_anahtar to authenticated;
grant select, insert, update, delete on public.eklenti_anahtar to service_role;
