-- Şase / Araç: çözülen ve kaydedilen müşteri araçları (Ürün Ara → Şase / Araç sekmesi).
-- Not: public.araclar adlı eski (boş) bir tablo başka modüle ait; ona dokunulmaz.
-- Küçük tablo; tam yüklemeye girmez, sekme açılınca okunur.
create table if not exists public.sase_araclar (
  id bigserial primary key,
  vin text unique,
  plaka text,
  marka text, model text, model_kod text, yil int, motor text, yakit text, kasa text,
  musteri text, telefon text, notlar text,
  kaynak jsonb,
  kullanici text,
  olusturma timestamptz not null default now(),
  son_islem timestamptz not null default now()
);
create index if not exists sase_araclar_plaka_idx on public.sase_araclar (upper(regexp_replace(plaka, '\s', '', 'g')));
create index if not exists sase_araclar_son_idx on public.sase_araclar (son_islem desc);
alter table public.sase_araclar enable row level security;
create policy giris_yapan_tam_yetki on public.sase_araclar for all to authenticated using (benim_rolum() <> 'yok') with check (benim_rolum() <> 'yok');
grant select, insert, update, delete on public.sase_araclar to authenticated;
grant select, insert, update, delete on public.sase_araclar to service_role;
grant usage, select on sequence public.sase_araclar_id_seq to authenticated, service_role;
revoke all on public.sase_araclar from anon;
-- teklif hangi araç için verildi
alter table public.fiyat_teklifleri add column if not exists arac_id bigint references public.sase_araclar(id) on delete set null;
