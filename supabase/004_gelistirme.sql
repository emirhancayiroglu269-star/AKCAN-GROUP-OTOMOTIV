-- =====================================================================
-- 004 — Araç kartı, OEM/muadil kodlar, fiyat teklifleri
-- 002'den SONRA çalıştırılır. Tekrar çalıştırılabilir.
-- =====================================================================

-- ---------- Araçlar (plaka bazlı kart) ----------
create table if not exists araclar (
  id uuid primary key default gen_random_uuid(),
  plaka text not null,
  plaka_norm text generated always as (upper(regexp_replace(plaka, '[^A-Za-z0-9]', '', 'g'))) stored,
  marka_model text,
  sase_no text,
  yil text,
  musteri_id uuid references musteriler(id) on delete set null,
  notlar text,
  olusturma timestamptz not null default now()
);
create unique index if not exists araclar_plaka_uq on araclar (plaka_norm);
create index if not exists araclar_musteri_idx on araclar (musteri_id);

-- Satışlara isteğe bağlı plaka
alter table satislar add column if not exists plaka text;

-- ---------- OEM / muadil kodlar ----------
create table if not exists urun_kodlari (
  id uuid primary key default gen_random_uuid(),
  urun_id uuid not null references urunler(id) on delete cascade,
  kod text not null,
  kod_norm text generated always as (upper(regexp_replace(kod, '[^A-Za-z0-9]', '', 'g'))) stored,
  tur text not null default 'OEM',               -- OEM | Muadil
  olusturma timestamptz not null default now()
);
create unique index if not exists urun_kodlari_uq on urun_kodlari (urun_id, kod_norm);
create index if not exists urun_kodlari_norm_idx on urun_kodlari (kod_norm);

-- Toplu yükleme: [{anahtar: barkod/stok kodu, kodlar: ["..",".."], tur}] → eklenen kod sayısı
create or replace function urun_kodlari_yukle(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare r jsonb; k text; u uuid; eklenen int := 0; bulunamayan int := 0; c int;
begin
  for r in select * from jsonb_array_elements(p) loop
    select id into u from urunler
    where nullif(trim(r->>'anahtar'),'') is not null and (barkod = trim(r->>'anahtar') or kod = trim(r->>'anahtar'))
    order by (barkod = trim(r->>'anahtar')) desc limit 1;
    if u is null then bulunamayan := bulunamayan + 1; continue; end if;
    for k in select trim(x) from jsonb_array_elements_text(r->'kodlar') x where trim(x) <> '' loop
      insert into urun_kodlari (urun_id, kod, tur) values (u, k, coalesce(nullif(r->>'tur',''), 'OEM'))
      on conflict (urun_id, kod_norm) do nothing;
      get diagnostics c = row_count; eklenen := eklenen + c;
    end loop;
  end loop;
  return jsonb_build_object('eklenen', eklenen, 'bulunamayan', bulunamayan);
end $$;

-- ---------- Fiyat teklifleri ----------
create table if not exists teklifler (
  id uuid primary key default gen_random_uuid(),
  no bigserial,
  tarih timestamptz not null default now(),
  gecerlilik date,
  musteri_id uuid references musteriler(id) on delete set null,
  musteri_ad text,
  telefon text,
  plaka text,
  arac text,
  kalemler jsonb not null default '[]',          -- [{urun_id, ad, adet, fiyat, kdv}]
  iscilik numeric(14,2) not null default 0,
  iskonto numeric(14,2) not null default 0,
  toplam numeric(14,2) not null default 0,
  durum text not null default 'Taslak',          -- Taslak | Gönderildi | Onaylandı | Reddedildi | Satışa çevrildi | İş emrine çevrildi
  donusen_tur text,                              -- satis | servis
  donusen_id uuid,
  hazirlayan text,
  notlar text
);
create index if not exists teklifler_musteri_idx on teklifler (musteri_id);

-- ---------- Satış: plaka da kaydedilir ----------
create or replace function satis_kaydet(p jsonb)
returns satislar language plpgsql security invoker set search_path = public as $$
declare s satislar; k jsonb; o jsonb;
begin
  insert into satislar (musteri_id, musteri_ad, kalemler, ara_toplam, iskonto, toplam, odeme_turu, odemeler, veresiye, personel, notlar, depo_id, plaka)
  values ((p->>'musteri_id')::uuid, p->>'musteri_ad', p->'kalemler', (p->>'ara_toplam')::numeric, (p->>'iskonto')::numeric,
          (p->>'toplam')::numeric, p->>'odeme_turu', coalesce(p->'odemeler','[]'), coalesce((p->>'veresiye')::numeric,0),
          p->>'personel', p->>'notlar', coalesce((p->>'depo_id')::uuid, _varsayilan_depo()), nullif(upper(trim(p->>'plaka')),''))
  returning * into s;
  for k in select * from jsonb_array_elements(s.kalemler) loop
    perform _depo_stok((k->>'urun_id')::uuid, s.depo_id, -(k->>'adet')::numeric, 'Satış', s.id, 'Satış #' || s.no);
  end loop;
  for o in select * from jsonb_array_elements(s.odemeler) loop
    perform _kasa_islem((o->>'kasa_id')::uuid, 'Giriş', 'Satış', s.id, 'Satış #' || s.no, (o->>'tutar')::numeric, s.personel);
  end loop;
  perform _cari_islem(s.musteri_id, 'Borç', 'Satış', s.id, 'Satış #' || s.no || ' (veresiye)', s.veresiye);
  perform _bh_kuyruga_ekle('satis', s.id);
  return s;
end $$;

-- ---------- Güvenlik ----------
do $$ declare t text;
begin
  foreach t in array array['araclar','urun_kodlari','teklifler'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "giris_yapan_tam_yetki" on %I', t);
    execute format('create policy "giris_yapan_tam_yetki" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

do $$ declare f text;
begin
  foreach f in array array['urun_kodlari_yukle(jsonb)','satis_kaydet(jsonb)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- ---------- Canlı senkron ----------
do $$ declare t text;
begin
  foreach t in array array['araclar','urun_kodlari','teklifler'] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
