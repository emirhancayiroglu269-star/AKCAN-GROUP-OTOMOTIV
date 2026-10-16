-- =====================================================================
-- 005 — Bakım hatırlatma, gün sonu kapanışı, borç hatırlatma, kullanıcı rolleri
-- 004'ten SONRA çalıştırılır. Tekrar çalıştırılabilir; mevcut veriye dokunmaz.
-- =====================================================================

-- ---------- Bakım hatırlatma ----------
alter table servisler add column if not exists sonraki_bakim_km integer;
alter table servisler add column if not exists sonraki_bakim_tarih date;
alter table servisler add column if not exists bakim_hatirlatma timestamptz;

-- ---------- Borç hatırlatma ----------
alter table musteriler add column if not exists son_hatirlatma timestamptz;

-- ---------- Gün sonu kapanışları ----------
create table if not exists gun_sonu (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  olusturma timestamptz not null default now(),
  personel text,
  kasalar jsonb not null default '[]',   -- [{kasa_id, ad, acilis, giris, cikis, beklenen, sayilan, fark}]
  ozet jsonb not null default '{}',      -- satış/servis/tahsilat/masraf özetleri
  notlar text
);
create index if not exists gun_sonu_tarih_idx on gun_sonu (tarih desc);

-- ---------- Kullanıcılar ve roller ----------
-- Tablo boşken herkes yönetici sayılır (ilk kurulum). Kayıt eklenince listede olmayan
-- veya pasif kullanıcı programı kullanamaz.
create table if not exists kullanicilar (
  id uuid primary key default gen_random_uuid(),
  eposta text not null,
  ad text,
  rol text not null default 'kasiyer' check (rol in ('yonetici', 'kasiyer', 'teknisyen')),
  aktif boolean not null default true,
  olusturma timestamptz not null default now()
);
create unique index if not exists kullanicilar_eposta_uq on kullanicilar (lower(eposta));

create or replace function benim_rolum() returns text
language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from kullanicilar) then 'yonetici'
    else coalesce((select rol from kullanicilar where lower(eposta) = lower(auth.jwt() ->> 'email') and aktif limit 1), 'yok')
  end
$$;
revoke execute on function benim_rolum() from public, anon;
grant execute on function benim_rolum() to authenticated, service_role;

-- ---------- Güvenlik ----------
alter table gun_sonu enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'gun_sonu' and policyname = 'giris_yapan_tam_yetki') then
    create policy "giris_yapan_tam_yetki" on gun_sonu for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Kullanıcı listesini herkes görebilir, yalnızca yönetici değiştirebilir
alter table kullanicilar enable row level security;
drop policy if exists "kullanici_oku" on kullanicilar;
drop policy if exists "kullanici_yonetici_yazar" on kullanicilar;
create policy "kullanici_oku" on kullanicilar for select to authenticated using (true);
create policy "kullanici_yonetici_yazar" on kullanicilar for all to authenticated
  using (benim_rolum() = 'yonetici') with check (benim_rolum() = 'yonetici');

-- ---------- Canlı senkron ----------
do $$ declare t text;
begin
  foreach t in array array['gun_sonu', 'kullanicilar'] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
