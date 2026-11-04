-- Ödeal e-Fatura portalı (fatura.odeal.com): kullanıcı portalda fatura listesini açtığında eklenti listeyi okur,
-- eklenti-kaydet (islem: 'odeal') buraya yazar. Yalnız fatura başlığı (no, karşı taraf, tarih, tutar); kalemler yok.
-- yon: gelen = tedarikçiden gelen e-fatura (alış), giden = kestiğimiz e-fatura, arsiv = kestiğimiz e-arşiv.
create table if not exists public.odeal_fatura (
  ettn text primary key,
  yon text not null check (yon in ('gelen','giden','arsiv')),
  no text, karsi text, vkn text,
  tarih date, gelis timestamptz,
  senaryo text, tip text, tutar numeric, durum text,
  ham jsonb,
  ilk timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);
create index if not exists odeal_fatura_tarih on public.odeal_fatura (yon, tarih);
alter table public.odeal_fatura enable row level security;
create policy odeal_fatura_okuma on public.odeal_fatura for select to authenticated using (benim_rolum() = 'yonetici');
grant select on public.odeal_fatura to authenticated;
grant select, insert, update, delete on public.odeal_fatura to service_role;
