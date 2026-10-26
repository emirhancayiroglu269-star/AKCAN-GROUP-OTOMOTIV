-- Personel hedef ve prim ayarı: { "oran": 5, "hedefler": { "AHMET": 300000 } }
alter table public.ayarlar add column if not exists personel_prim jsonb;
-- Ürün Ara'dan verilen fiyat teklifleri (eski "teklifler" tablosu başka modüle ait, ona dokunulmaz)
create table if not exists public.fiyat_teklifleri (
  id bigserial primary key, zaman timestamptz not null default now(), musteri text, arac text,
  kalemler jsonb not null default '[]'::jsonb, toplam numeric not null default 0, kullanici text,
  durum text not null default 'acik' check (durum in ('acik','satildi','kaybedildi')), durum_zaman timestamptz, notlar text
);
create index if not exists fiyat_teklifleri_zaman_idx on public.fiyat_teklifleri (zaman desc);
alter table public.fiyat_teklifleri enable row level security;
create policy giris_yapan_tam_yetki on public.fiyat_teklifleri for all to authenticated using (benim_rolum() <> 'yok') with check (benim_rolum() <> 'yok');
grant select, insert, update, delete on public.fiyat_teklifleri to authenticated;
grant select, insert, update, delete on public.fiyat_teklifleri to service_role;
grant usage, select on sequence public.fiyat_teklifleri_id_seq to authenticated, service_role;
revoke all on public.fiyat_teklifleri from anon;
