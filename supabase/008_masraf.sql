-- =====================================================================
-- 008 — BizimHesap "Detaylı Masraf Raporu" aktarımı (işletme giderleri) ve gider ayarları
-- 007'den SONRA çalıştırılır. Tekrar çalıştırılabilir.
-- =====================================================================
create table if not exists masraflar (
  id bigint generated always as identity primary key,
  tarih date not null, odeme_tarihi date, durum text, ana text, alt text, hesap text, aciklama text,
  tutar numeric(14,2) not null default 0,
  gecersiz boolean not null default false,
  yuklendi timestamptz not null default now()
);
create index if not exists masraflar_tarih_idx on masraflar (tarih desc);
alter table masraflar enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'masraflar' and policyname = 'giris_yapan_okur') then
    create policy "giris_yapan_okur" on masraflar for select to authenticated using (true);
  end if;
end $$;
alter table bh_durum add column if not exists masraf_son date;
alter table ayarlar add column if not exists stok_disi_alis_gider boolean not null default true;
alter table ayarlar add column if not exists haric_masraf text[] not null default '{}';  -- net kârdan çıkarılan gider kalemleri ("Ana/Alt")

-- Bir tarih aralığının masraflarını yeniler (eskiler geçersiz işaretlenir)
create or replace function bh_masraf_yukle(p_anahtar text, p_bas date, p_bit date, p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then
    raise exception 'Geçersiz veya süresi dolmuş aktarım anahtarı';
  end if;
  update masraflar set gecersiz = true where tarih between p_bas and p_bit and not gecersiz;
  insert into masraflar (tarih, odeme_tarihi, durum, ana, alt, hesap, aciklama, tutar)
  select (r->>'tarih')::date, nullif(r->>'odeme','')::date, r->>'durum', r->>'ana', r->>'alt', r->>'hesap', r->>'aciklama', coalesce((r->>'tutar')::numeric, 0)
  from jsonb_array_elements(p) r where nullif(r->>'tarih','') is not null;
  get diagnostics n = row_count;
  update bh_durum set masraf_son = greatest(coalesce(masraf_son, p_bit), p_bit) where id = 1;
  return n;
end $$;
revoke execute on function bh_masraf_yukle(text, date, date, jsonb) from public;
grant execute on function bh_masraf_yukle(text, date, date, jsonb) to anon, authenticated, service_role;
do $$ begin begin alter publication supabase_realtime add table masraflar; exception when duplicate_object then null; end; end $$;
