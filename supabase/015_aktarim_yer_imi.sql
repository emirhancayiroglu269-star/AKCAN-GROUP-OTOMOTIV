-- =====================================================================
-- 015 — "Analize Aktar" yer imi: kullanıcı BizimHesap'a kendisi girmişken tek tıkla aktarım.
-- Yer imi kodu küçük bir yükleyicidir; asıl kod bh_aktarim_kod tablosundan gelir (güncellemek için yer imini değiştirmek gerekmez).
-- =====================================================================
create table if not exists bh_aktarim_kod (id int primary key default 1 check (id = 1), kod text not null, surum int not null default 1, guncelleme timestamptz not null default now());
alter table bh_aktarim_kod enable row level security;   -- doğrudan okuma yok; yalnız anahtarla RPC

create table if not exists bh_kesif (id bigint generated always as identity primary key, olusturma timestamptz not null default now(), veri jsonb);
alter table bh_kesif enable row level security;

-- Yer imi kodunu verir (geçerli anahtar gerekir)
create or replace function bh_aktarim_kodu(p_anahtar text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then
    raise exception 'Aktarım anahtarı geçersiz. Sitede Ayarlar > BizimHesap aktarımı bölümünden yer imini yenileyin.';
  end if;
  return (select kod from bh_aktarim_kod where id = 1);
end $$;
revoke execute on function bh_aktarim_kodu(text) from public;
grant execute on function bh_aktarim_kodu(text) to anon, authenticated, service_role;

-- Keşif verisi (rapor sayfalarının yapısı) — kodu yazmak için
create or replace function bh_kesif_yukle(p_anahtar text, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare i bigint;
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then raise exception 'anahtar'; end if;
  insert into bh_kesif (veri) values (p) returning id into i;
  return i;
end $$;
revoke execute on function bh_kesif_yukle(text, jsonb) from public;
grant execute on function bh_kesif_yukle(text, jsonb) to anon, authenticated, service_role;

-- Yönetici sitede yer imi oluşturur: 1 yıllık anahtar (eski yer imi anahtarları iptal edilir)
alter table aktarim_anahtari add column if not exists yer_imi boolean not null default false;
create or replace function aktarim_yer_imi_anahtari() returns text
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if benim_rolum() <> 'yonetici' then raise exception 'Yalnız yönetici'; end if;
  update aktarim_anahtari set son = now() where yer_imi and son > now();
  k := encode(extensions.gen_random_bytes(18), 'hex');
  insert into aktarim_anahtari (anahtar, son, yer_imi) values (k, now() + interval '365 days', true);
  return k;
end $$;
revoke execute on function aktarim_yer_imi_anahtari() from public, anon;
grant execute on function aktarim_yer_imi_anahtari() to authenticated;
