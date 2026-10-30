-- Tedarikçi (Otomarmara / Neko) güncel alış fiyatları: tedarikci-maliyet edge function'ı her gece Trendyol ilanlarının ürünleri için doldurur.
-- Trendyol fiyat hesabı maliyet = max(kart alışı, son fatura, tedarikçi fiyatı) kullanır (tedarikçi fiyatı kartı %50'den fazla aşarsa kullanılmaz).
create table if not exists public.tedarikci_maliyet (
  urun_id uuid not null references public.urunler(id) on delete cascade,
  tedarikci text not null check (tedarikci in ('otomarmara','neko')),
  kod text, ad text,
  fiyat numeric,          -- KDV hariç birim alış (TL); bulunamadıysa null
  stok_var boolean,
  ham jsonb,
  hata text,
  zaman timestamptz not null default now(),
  primary key (urun_id, tedarikci)
);
create index if not exists tedarikci_maliyet_zaman on public.tedarikci_maliyet (zaman);
alter table public.tedarikci_maliyet enable row level security;
drop policy if exists tedarikci_maliyet_okuma on public.tedarikci_maliyet;
create policy tedarikci_maliyet_okuma on public.tedarikci_maliyet for select to authenticated using (benim_rolum() = 'yonetici');
grant select on public.tedarikci_maliyet to authenticated;
grant select, insert, update, delete on public.tedarikci_maliyet to service_role;

-- zamanlayıcı (Authorization = anon anahtar; bizimhesap-esitle işindekiyle aynı)
-- select cron.schedule('tedarikci-maliyet', '*/3 * * * *', $$ select net.http_post(url := '.../functions/v1/tedarikci-maliyet', headers := ..., body := '{}'::jsonb, timeout_milliseconds := 150000)
--   where extract(hour from now() at time zone 'UTC') < 6 or exists (select 1 from ty_urun t where t.urun_id is not null and not exists (select 1 from tedarikci_maliyet m where m.urun_id = t.urun_id)); $$);
