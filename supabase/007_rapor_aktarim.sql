-- =====================================================================
-- 007 — BizimHesap "Ürün Alış-Satış Raporu"ndan gerçek fatura satırlarını aktarma
-- Rapor verisi olan günlerde analizler bu gerçek satırları kullanır (iskontolu tutar, gerçek maliyet);
-- rapor yüklenmemiş günlerde stok değişiminden türetilen hareketler kullanılır.
-- Tekrar çalıştırılabilir.
-- =====================================================================
create table if not exists rapor_satirlari (
  id bigint generated always as identity primary key,
  tarih date not null,
  tur text not null check (tur in ('satis', 'alis')),
  urun_id uuid references urunler(id) on delete set null,
  urun_ad text, kategori text, marka text, kod text, barkod text,
  miktar numeric(14,3) not null default 0, birim text,
  alis_fiyati numeric(14,2), tutar numeric(14,2), indirim numeric(14,2), net numeric(14,2), kdv numeric(14,2), toplam numeric(14,2),
  yuklendi timestamptz not null default now()
);
alter table rapor_satirlari add column if not exists gecersiz boolean not null default false;
create index if not exists rapor_satirlari_tarih_idx on rapor_satirlari (tarih desc, tur);
create index if not exists rapor_satirlari_urun_idx on rapor_satirlari (urun_id);

alter table bh_durum add column if not exists rapor_ilk date;
alter table bh_durum add column if not exists rapor_son date;
alter table bh_durum add column if not exists rapor_yukleme timestamptz;

-- Tarayıcıdan yükleme için kısa ömürlü anahtar (yalnızca bu anahtarı bilen yükleme yapabilir)
create table if not exists aktarim_anahtari (anahtar text primary key, son timestamptz not null);
alter table aktarim_anahtari enable row level security;  -- politika yok: dışarıdan okunamaz

-- Bir günün bir türdeki (satış/alış) satırlarını yeniler: eskiler geçersiz işaretlenir, tekrar yüklemek güvenlidir
create or replace function bh_rapor_yukle(p_anahtar text, p_tur text, p_tarih date, p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then
    raise exception 'Geçersiz veya süresi dolmuş aktarım anahtarı';
  end if;
  if p_tur not in ('satis', 'alis') then raise exception 'tur'; end if;
  update rapor_satirlari set gecersiz = true where tarih = p_tarih and tur = p_tur and not gecersiz;
  insert into rapor_satirlari (tarih, tur, urun_id, urun_ad, kategori, marka, kod, barkod, miktar, birim, alis_fiyati, tutar, indirim, net, kdv, toplam)
  select p_tarih, p_tur,
    coalesce(
      (select u.id from urunler u where nullif(r->>'barkod','') is not null and u.barkod = r->>'barkod' limit 1),
      (select u.id from urunler u where nullif(r->>'kod','') is not null and u.kod = r->>'kod' limit 1),
      (select u.id from urunler u where u.ad = r->>'ad' limit 1)),
    r->>'ad', nullif(r->>'kategori',''), nullif(r->>'marka',''), nullif(r->>'kod',''), nullif(r->>'barkod',''),
    coalesce((r->>'miktar')::numeric, 0), nullif(r->>'birim',''),
    (r->>'alis')::numeric, (r->>'tutar')::numeric, (r->>'indirim')::numeric, (r->>'net')::numeric, (r->>'kdv')::numeric, (r->>'toplam')::numeric
  from jsonb_array_elements(p) r
  where nullif(r->>'ad','') is not null;
  get diagnostics n = row_count;
  update bh_durum set rapor_ilk = least(coalesce(rapor_ilk, p_tarih), p_tarih), rapor_son = greatest(coalesce(rapor_son, p_tarih), p_tarih), rapor_yukleme = now() where id = 1;
  return n;
end $$;
revoke execute on function bh_rapor_yukle(text, text, date, jsonb) from public;
grant execute on function bh_rapor_yukle(text, text, date, jsonb) to anon, authenticated, service_role;

alter table rapor_satirlari enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'rapor_satirlari' and policyname = 'giris_yapan_okur') then
    create policy "giris_yapan_okur" on rapor_satirlari for select to authenticated using (true);
  end if;
end $$;
do $$ begin
  begin alter publication supabase_realtime add table rapor_satirlari; exception when duplicate_object then null; end;
end $$;
