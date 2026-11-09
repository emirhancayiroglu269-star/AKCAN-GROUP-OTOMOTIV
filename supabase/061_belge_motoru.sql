-- =====================================================================
-- 061 · FAZ 1 — Belge motoru ve AKCAN stok defteri (GÖLGE MOD)
-- YALNIZ akcan-test projesinde geliştirilir ve denenir; canlıya ayrıca onayla taşınır.
--
-- Mevcut hiçbir tabloya yazmaz: urunler.stok, urun_depo_stok (BizimHesap eşitlemesinin tabloları) değişmez.
-- AKCAN stoku yeni tablolarda tutulur ve yalnız onaylı belgelerle değişir.
--
-- Tablolar : belge_turleri, belge_sayac, belgeler, belge_satirlari, stok_defteri, stok_bakiye, urun_maliyet
-- Görünümler (personel, maliyetsiz): belge_satirlari_p, stok_defteri_p
-- Fonksiyonlar: belge_kaydet(jsonb), belge_onayla(uuid, int), belge_iptal(uuid, text)
--
-- Kurallar:
--  - Kullanıcılar tablolara doğrudan yazamaz (izin yok); tüm yazma üç fonksiyondan geçer.
--  - Onaylı / iptal belge, satırları ve stok defteri değiştirilemez ve silinemez (tetikleyici; yönetici ve servisler dahil).
--  - Aynı belge iki kez onaylanamaz: belge satırı kilitlenir, durum kontrol edilir; ikinci istek "zaten onaylı" döner.
--  - Aynı istek anahtarıyla ikinci kayıt yeni belge açmaz.
--  - Eksi stok oluşamaz: fonksiyon kontrolü + stok_bakiye'de CHECK (miktar >= 0).
--  - Eşzamanlılık: kilit sırası her zaman belge → sayaç → urun_maliyet (urun_id sırasıyla) → stok_bakiye (urun_id, depo_id sırasıyla).
--  - Transfer: kaynaktan düşüş ve hedefe giriş aynı işlemde (biri olmazsa hiçbiri olmaz).
--  - Ağırlıklı ortalama maliyet firma geneli, KDV hariç; yalnız girişlerde değişir.
-- =====================================================================

-- ---------- 1) belge türleri ----------
create table if not exists public.belge_turleri (
  kod text primary key check (kod ~ '^[A-Z]{3}$'),
  ad text not null,
  maliyet_girilir boolean not null default false,  -- satırda birim maliyet zorunlu (giriş, açılış)
  personel_taslak boolean not null default false,  -- kasiyer / teknisyen taslak açabilir
  sira int not null default 0,
  aktif boolean not null default true
);
insert into public.belge_turleri (kod, ad, maliyet_girilir, personel_taslak, sira) values
  ('GIR', 'Stok giriş fişi', true, false, 1),
  ('CIK', 'Stok çıkış fişi', false, true, 2),
  ('TRF', 'Depolar arası transfer fişi', false, true, 3),
  ('SAY', 'Sayım ve düzeltme fişi', false, true, 4),
  ('ACL', 'Açılış fişi', true, false, 5)
on conflict (kod) do nothing;

-- ---------- 2) numara sayacı (tür + yıl) ----------
create table if not exists public.belge_sayac (
  tur text not null references public.belge_turleri(kod),
  yil int not null check (yil between 2000 and 2100),
  son_no int not null default 0 check (son_no >= 0),
  primary key (tur, yil)
);

-- ---------- 3) belge başlıkları ----------
create table if not exists public.belgeler (
  id uuid primary key default gen_random_uuid(),
  tur text not null references public.belge_turleri(kod),
  no text unique,                                   -- GIR-2026-000001; onayda verilir
  yil int, sira_no int,
  durum text not null default 'taslak' check (durum in ('taslak', 'onayli', 'iptal')),
  tarih date not null default ((now() at time zone 'Europe/Istanbul')::date),
  depo_id uuid not null references public.depolar(id),
  hedef_depo_id uuid references public.depolar(id),
  aciklama text,
  istek_anahtari uuid not null unique,              -- çift kayıt engeli
  surum int not null default 1,                     -- aynı taslağı iki kişi düzenlerse eskisi reddedilir
  olusturan text not null, olusturan_id uuid, olusturma timestamptz not null default now(),
  guncelleyen text, guncelleme timestamptz,
  onaylayan text, onaylayan_id uuid, onay_zaman timestamptz,
  iptal_eden text, iptal_eden_id uuid, iptal_zaman timestamptz, iptal_nedeni text,
  constraint belge_hedef_depo check ((tur = 'TRF') = (hedef_depo_id is not null)),
  constraint belge_farkli_depo check (hedef_depo_id is null or hedef_depo_id <> depo_id),
  constraint belge_no_onayda check ((durum = 'taslak') = (no is null)),
  constraint belge_iptal_alanlari check ((durum = 'iptal') = (iptal_zaman is not null))
);
create index if not exists belgeler_liste_ix on public.belgeler (tur, durum, tarih desc);
create unique index if not exists belgeler_sayi_ix on public.belgeler (tur, yil, sira_no) where sira_no is not null;

-- ---------- 4) belge satırları ----------
create table if not exists public.belge_satirlari (
  id bigint generated always as identity primary key,
  belge_id uuid not null references public.belgeler(id) on delete cascade,
  sira int not null,
  urun_id uuid not null references public.urunler(id),
  miktar numeric(14,3) check (miktar > 0),          -- GIR, CIK, TRF, ACL
  birim_maliyet numeric(14,4) check (birim_maliyet >= 0),  -- GIR, ACL zorunlu; SAY'da yalnız ürünün ortalaması yoksa
  sayilan numeric(14,3) check (sayilan >= 0),       -- SAY
  sistem numeric(14,3), fark numeric(14,3),         -- SAY: onay anında yazılır
  notlar text,
  unique (belge_id, sira),
  unique (belge_id, urun_id)
);
create index if not exists belge_satirlari_urun_ix on public.belge_satirlari (urun_id);

-- ---------- 5) stok defteri (yalnız eklenir) ----------
create table if not exists public.stok_defteri (
  id bigint generated always as identity primary key,
  zaman timestamptz not null default now(),
  tarih date not null,                              -- belgenin tarihi
  belge_id uuid not null references public.belgeler(id),
  belge_no text not null,
  tur text not null,
  islem text not null check (islem in ('onay', 'iptal')),
  satir_id bigint references public.belge_satirlari(id),
  urun_id uuid not null references public.urunler(id),
  depo_id uuid not null references public.depolar(id),
  miktar numeric(14,3) not null check (miktar <> 0),        -- + giriş, − çıkış
  birim_maliyet numeric(14,4) not null check (birim_maliyet >= 0),
  tutar numeric(16,2) not null,                             -- miktar × birim maliyet
  onceki_miktar numeric(14,3) not null, sonraki_miktar numeric(14,3) not null check (sonraki_miktar >= 0),   -- bu depoda
  toplam_onceki numeric(14,3) not null, toplam_sonraki numeric(14,3) not null,                              -- tüm depolarda
  ort_onceki numeric(14,4), ort_sonraki numeric(14,4) not null,
  ters_kayit_id bigint unique references public.stok_defteri(id),   -- iptal satırı → iptal ettiği satır
  kullanici text not null, kullanici_id uuid
);
create index if not exists stok_defteri_urun_ix on public.stok_defteri (urun_id, id);
create index if not exists stok_defteri_belge_ix on public.stok_defteri (belge_id);

-- ---------- 6) depo bazlı AKCAN stoku ----------
create table if not exists public.stok_bakiye (
  urun_id uuid not null references public.urunler(id),
  depo_id uuid not null references public.depolar(id),
  miktar numeric(14,3) not null default 0 check (miktar >= 0),   -- eksi stok veritabanı düzeyinde de engelli
  son_hareket bigint references public.stok_defteri(id),
  guncelleme timestamptz not null default now(),
  primary key (urun_id, depo_id)
);

-- ---------- 7) ağırlıklı ortalama maliyet ----------
-- ortalama = stok değeri / stok miktarı. Stok değeri defterdeki tutarların toplamıdır; girişlerin sırası sonucu değiştirmez.
-- Stok sıfırlanırken son çıkış kalan değerin tamamını alır (kuruş artığı kalmaz).
create table if not exists public.urun_maliyet (
  urun_id uuid primary key references public.urunler(id),
  ort_maliyet numeric(14,4) not null default 0 check (ort_maliyet >= 0),   -- KDV hariç
  toplam_miktar numeric(14,3) not null default 0 check (toplam_miktar >= 0),
  toplam_deger numeric(18,2) not null default 0,        -- stok değeri = defterdeki tutarların toplamı (yuvarlama birikmesin diye ortalama buradan hesaplanır)
  son_hareket bigint references public.stok_defteri(id),
  guncelleme timestamptz not null default now()
);

-- ---------- 8) değiştirilemezlik ----------
-- motor fonksiyonları işlem başında akcan.motor = 'on' koyar (yalnız o işlem için); tablo yazımları yalnız o işlem içinde kabul edilir.
-- Kullanıcıların (authenticated) bu tablolara zaten yazma izni yoktur; bu kontrol servis ve yönetici bağlantılarını da durdurur.

create or replace function public._belge_koru() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not (coalesce(current_setting('akcan.motor', true), '') = 'on') then raise exception 'Belgeler yalnız belge_kaydet ile oluşturulur' using errcode = '42501'; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.durum <> 'taslak' then raise exception 'Onaylı ya da iptal edilmiş belge silinemez (%)', old.no using errcode = '42501'; end if;
    if not (coalesce(current_setting('akcan.motor', true), '') = 'on') then raise exception 'Taslak yalnız uygulama üzerinden silinir' using errcode = '42501'; end if;
    return old;
  end if;
  -- UPDATE
  if not (coalesce(current_setting('akcan.motor', true), '') = 'on') then raise exception 'Belgeler doğrudan değiştirilemez' using errcode = '42501'; end if;
  if old.durum = 'iptal' then raise exception 'İptal edilmiş belge değiştirilemez (%)', old.no using errcode = '42501'; end if;
  if old.durum = 'onayli' then
    -- onaylı belgede yalnız iptal bilgileri yazılabilir
    if new.durum <> 'iptal' or (to_jsonb(new) - array['durum','surum','iptal_eden','iptal_eden_id','iptal_zaman','iptal_nedeni'])
                               is distinct from (to_jsonb(old) - array['durum','surum','iptal_eden','iptal_eden_id','iptal_zaman','iptal_nedeni']) then
      raise exception 'Onaylı belge değiştirilemez (%); düzeltme için iptal edin', old.no using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create or replace function public._satir_koru() returns trigger language plpgsql as $$
declare d text; b uuid := coalesce(new.belge_id, old.belge_id);
begin
  select durum into d from public.belgeler where id = b;
  if d is not null and d <> 'taslak' then raise exception 'Onaylı ya da iptal edilmiş belgenin satırları değiştirilemez' using errcode = '42501'; end if;
  if not (coalesce(current_setting('akcan.motor', true), '') = 'on') then raise exception 'Belge satırları yalnız uygulama üzerinden değişir' using errcode = '42501'; end if;
  return coalesce(new, old);
end $$;

create or replace function public._defter_koru() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not (coalesce(current_setting('akcan.motor', true), '') = 'on') then raise exception 'Stok defterine yalnız belge onayı / iptali yazar' using errcode = '42501'; end if;
    return new;
  end if;
  raise exception 'Stok defteri değiştirilemez ve silinemez' using errcode = '42501';
end $$;

create or replace function public._motor_tablo_koru() returns trigger language plpgsql as $$
begin
  if not (coalesce(current_setting('akcan.motor', true), '') = 'on') then raise exception '% yalnız belge onayı / iptali ile değişir', tg_table_name using errcode = '42501'; end if;
  return coalesce(new, old);
end $$;

create or replace function public._truncate_yok() returns trigger language plpgsql as $$
begin raise exception '% tablosu toplu silinemez', tg_table_name using errcode = '42501'; end $$;

drop trigger if exists belge_koru on public.belgeler;
create trigger belge_koru before insert or update or delete on public.belgeler for each row execute function public._belge_koru();
drop trigger if exists satir_koru on public.belge_satirlari;
create trigger satir_koru before insert or update or delete on public.belge_satirlari for each row execute function public._satir_koru();
drop trigger if exists defter_koru on public.stok_defteri;
create trigger defter_koru before insert or update or delete on public.stok_defteri for each row execute function public._defter_koru();
drop trigger if exists bakiye_koru on public.stok_bakiye;
create trigger bakiye_koru before insert or update or delete on public.stok_bakiye for each row execute function public._motor_tablo_koru();
drop trigger if exists maliyet_koru on public.urun_maliyet;
create trigger maliyet_koru before insert or update or delete on public.urun_maliyet for each row execute function public._motor_tablo_koru();
drop trigger if exists sayac_koru on public.belge_sayac;
create trigger sayac_koru before insert or update or delete on public.belge_sayac for each row execute function public._motor_tablo_koru();
do $$ declare t text; begin
  foreach t in array array['belgeler','belge_satirlari','stok_defteri','stok_bakiye','urun_maliyet','belge_sayac','belge_turleri'] loop
    execute format('drop trigger if exists truncate_yok on public.%I', t);
    execute format('create trigger truncate_yok before truncate on public.%I for each statement execute function public._truncate_yok()', t);
  end loop;
end $$;

-- işlem geçmişi (Faz 0 denetim): belge ve satır değişiklikleri kim / ne zaman / önce-sonra ile kaydedilir
drop trigger if exists denetim_tg on public.belgeler;
create trigger denetim_tg after insert or update or delete on public.belgeler for each row execute function public.denetim_tg();
drop trigger if exists denetim_tg on public.belge_satirlari;
create trigger denetim_tg after insert or update or delete on public.belge_satirlari for each row execute function public.denetim_tg();

-- ---------- 9) yardımcılar ----------
create or replace function public._kim() returns table (eposta text, uid uuid, rol text) language sql stable security definer set search_path = public as
$$ select auth.jwt() ->> 'email', auth.uid(), public.benim_rolum() $$;

/** depo ve ürün satırlarını sabit sırayla kilitler (yoksa açar): kilitlenmeyi (deadlock) önler */
create or replace function public._kilitle(p_urunler uuid[], p_ciftler jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into urun_maliyet (urun_id) select u from unnest(p_urunler) u order by u on conflict do nothing;
  perform 1 from urun_maliyet where urun_id = any(p_urunler) order by urun_id for update;
  insert into stok_bakiye (urun_id, depo_id)
    select (c->>'u')::uuid, (c->>'d')::uuid from jsonb_array_elements(p_ciftler) c order by 1, 2 on conflict do nothing;
  perform 1 from stok_bakiye b join jsonb_array_elements(p_ciftler) c on b.urun_id = (c->>'u')::uuid and b.depo_id = (c->>'d')::uuid
    order by b.urun_id, b.depo_id for update of b;
end $$;

/** tek bir stok hareketi: bakiye, stok değeri, ortalama maliyet ve defter satırı.
    p_maliyet_etkisi: 'giris' (ortalamayı karıştırır), 'cikis_geri' (bir girişi geri alır), 'yok' (ortalama değişmez: çıkış, transfer)
    p_tutar: iptalde asıl satırın tutarının tersi (verilmezse miktar × birim maliyet) */
create or replace function public._hareket(p_belge public.belgeler, p_islem text, p_satir bigint, p_urun uuid, p_depo uuid, p_miktar numeric,
                                            p_birim numeric, p_maliyet_etkisi text, p_ters bigint, p_eposta text, p_uid uuid, p_tutar numeric default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare b numeric; q numeric; a numeric; v numeric; a2 numeric; q2 numeric; c numeric; cb numeric; t numeric; id bigint; ad text; dad text;
begin
  select miktar into b from stok_bakiye where urun_id = p_urun and depo_id = p_depo;
  select toplam_miktar, ort_maliyet, toplam_deger into q, a, v from urun_maliyet where urun_id = p_urun;
  if b + p_miktar < 0 then
    select u.ad into ad from urunler u where u.id = p_urun; select d.ad into dad from depolar d where d.id = p_depo;
    raise exception 'Eksi stok: % · % deposunda AKCAN stoku %, istenen %', ad, dad, b, -p_miktar using errcode = '23514';
  end if;
  q2 := q + p_miktar;
  c := coalesce(p_birim, a);
  t := coalesce(p_tutar, round(p_miktar * c, 2));
  cb := c;
  if q2 = 0 and p_miktar < 0 then t := -v; cb := round(abs(t / p_miktar), 4); end if;   -- stok sıfırlanıyor: kalan değerin tamamı çıkar
  if p_maliyet_etkisi in ('giris', 'cikis_geri') then
    a2 := case when q2 > 0 then greatest(0, round((v + t) / q2, 4)) else a end;   -- (Q·A ± q·c) / (Q ± q), değer üzerinden
  else a2 := a; end if;
  if p_maliyet_etkisi = 'giris' and q <= 0 and p_birim is not null then a2 := round(p_birim, 4); end if;   -- stok yokken giriş: doğrudan c
  insert into stok_defteri (tarih, belge_id, belge_no, tur, islem, satir_id, urun_id, depo_id, miktar, birim_maliyet, tutar,
                            onceki_miktar, sonraki_miktar, toplam_onceki, toplam_sonraki, ort_onceki, ort_sonraki, ters_kayit_id, kullanici, kullanici_id)
  values (p_belge.tarih, p_belge.id, p_belge.no, p_belge.tur, p_islem, p_satir, p_urun, p_depo, p_miktar, cb, t,
          b, b + p_miktar, q, q2, a, a2, p_ters, p_eposta, p_uid)
  returning stok_defteri.id into id;
  update stok_bakiye set miktar = b + p_miktar, son_hareket = id, guncelleme = now() where urun_id = p_urun and depo_id = p_depo;
  update urun_maliyet set toplam_miktar = q2, toplam_deger = v + t, ort_maliyet = a2, son_hareket = id, guncelleme = now() where urun_id = p_urun;
  return id;
end $$;

-- ---------- 10) belge_kaydet: taslak oluşturma / güncelleme ----------
-- p: { id?, istek_anahtari, surum?, tur, tarih?, depo_id, hedef_depo_id?, aciklama?, satirlar: [{urun_id, miktar?, birim_maliyet?, sayilan?, notlar?}] }
create or replace function public.belge_kaydet(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; t belge_turleri; b belgeler; v_id uuid := nullif(p->>'id', '')::uuid; s jsonb; i int := 0; personel boolean;
        v_tur text := upper(p->>'tur'); v_depo uuid := (p->>'depo_id')::uuid; v_hedef uuid := nullif(p->>'hedef_depo_id', '')::uuid;
        v_tarih date := coalesce(nullif(p->>'tarih', '')::date, (now() at time zone 'Europe/Istanbul')::date); u record;
begin
  select * into k from _kim();
  if k.rol not in ('yonetici', 'kasiyer', 'teknisyen') then raise exception 'Bu işlem için giriş yapmış ve yetkili bir kullanıcı gerekli' using errcode = '42501'; end if;
  personel := k.rol <> 'yonetici';
  perform set_config('akcan.motor', 'on', true);

  if v_id is null then
    if p->>'istek_anahtari' is null then raise exception 'istek_anahtari zorunlu'; end if;
    select * into b from belgeler where istek_anahtari = (p->>'istek_anahtari')::uuid;
    if found then perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'tekrar', true, 'id', b.id, 'durum', b.durum, 'surum', b.surum, 'no', b.no); end if;
  else
    select * into b from belgeler where id = v_id for update;
    if not found then raise exception 'Belge bulunamadı'; end if;
    if b.durum <> 'taslak' then raise exception 'Onaylı ya da iptal edilmiş belge değiştirilemez (%)', b.no using errcode = '42501'; end if;
    if (p->>'surum')::int is distinct from b.surum then raise exception 'Belge siz açtıktan sonra başkası tarafından değiştirildi; yeniden açın' using errcode = '40001'; end if;
    if personel and b.olusturan is distinct from k.eposta then raise exception 'Personel yalnız kendi taslağını değiştirebilir' using errcode = '42501'; end if;
    v_tur := b.tur;   -- tür sonradan değişmez
  end if;

  select * into t from belge_turleri where kod = v_tur and aktif;
  if not found then raise exception 'Geçersiz belge türü: %', v_tur; end if;
  if personel and not t.personel_taslak then raise exception '% yalnız yönetici tarafından hazırlanır', t.ad using errcode = '42501'; end if;
  if v_tarih > (now() at time zone 'Europe/Istanbul')::date then raise exception 'Belge tarihi ileri bir gün olamaz'; end if;
  if not exists (select 1 from depolar where id = v_depo and aktif) then raise exception 'Depo bulunamadı ya da pasif'; end if;
  if v_tur = 'TRF' then
    if v_hedef is null or v_hedef = v_depo then raise exception 'Transferde farklı bir hedef depo seçilmeli'; end if;
    if not exists (select 1 from depolar where id = v_hedef and aktif) then raise exception 'Hedef depo bulunamadı ya da pasif'; end if;
  else v_hedef := null; end if;
  if jsonb_typeof(p->'satirlar') <> 'array' or jsonb_array_length(p->'satirlar') = 0 then raise exception 'Belgede en az bir satır olmalı'; end if;
  if jsonb_array_length(p->'satirlar') > 500 then raise exception 'Bir belgede en fazla 500 satır olabilir'; end if;

  if v_id is null then
    insert into belgeler (tur, tarih, depo_id, hedef_depo_id, aciklama, istek_anahtari, olusturan, olusturan_id)
    values (v_tur, v_tarih, v_depo, v_hedef, nullif(trim(p->>'aciklama'), ''), (p->>'istek_anahtari')::uuid, k.eposta, k.uid)
    returning * into b;
  else
    delete from belge_satirlari where belge_id = b.id;
    update belgeler set tarih = v_tarih, depo_id = v_depo, hedef_depo_id = v_hedef, aciklama = nullif(trim(p->>'aciklama'), ''),
                        surum = surum + 1, guncelleyen = k.eposta, guncelleme = now()
      where id = b.id returning * into b;
  end if;

  for s in select * from jsonb_array_elements(p->'satirlar') loop
    i := i + 1;
    select id, ad, aktif into u from urunler where id = (s->>'urun_id')::uuid;
    if not found then raise exception '%. satır: ürün bulunamadı', i; end if;
    if not u.aktif then raise exception '%. satır: % pasif bir ürün', i, u.ad; end if;
    if personel and nullif(s->>'birim_maliyet', '') is not null then raise exception 'Personel maliyet giremez' using errcode = '42501'; end if;
    if v_tur = 'SAY' then
      if nullif(s->>'sayilan', '') is null or (s->>'sayilan')::numeric < 0 then raise exception '%. satır (%): sayılan miktar girilmeli', i, u.ad; end if;
    else
      if nullif(s->>'miktar', '') is null or (s->>'miktar')::numeric <= 0 then raise exception '%. satır (%): miktar sıfırdan büyük olmalı', i, u.ad; end if;
      if t.maliyet_girilir and (nullif(s->>'birim_maliyet', '') is null or (s->>'birim_maliyet')::numeric < 0) then
        raise exception '%. satır (%): birim maliyet (KDV hariç) girilmeli', i, u.ad; end if;
    end if;
    begin
      insert into belge_satirlari (belge_id, sira, urun_id, miktar, birim_maliyet, sayilan, notlar)
      values (b.id, i, u.id,
              case when v_tur = 'SAY' then null else (s->>'miktar')::numeric end,
              case when v_tur in ('GIR', 'ACL', 'SAY') then nullif(s->>'birim_maliyet', '')::numeric end,
              case when v_tur = 'SAY' then (s->>'sayilan')::numeric end,
              nullif(trim(s->>'notlar'), ''));
    exception when unique_violation then raise exception '% belgede iki kez var; tek satırda toplayın', u.ad;
    end;
  end loop;
  perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'id', b.id, 'durum', b.durum, 'surum', b.surum, 'satir', i);
end $$;

-- ---------- 11) belge_onayla: numara + stok hareketleri, tek işlemde ----------
create or replace function public.belge_onayla(p_id uuid, p_surum int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; b belgeler; s record; n int; v_no text; urunler_ uuid[]; ciftler jsonb; v_sis numeric; v_fark numeric; a numeric; say int := 0; v_h bigint;
begin
  select * into k from _kim();
  if k.rol <> 'yonetici' then raise exception 'Belgeyi yalnız yönetici onaylayabilir' using errcode = '42501'; end if;
  perform set_config('akcan.motor', 'on', true);

  select * into b from belgeler where id = p_id for update;          -- aynı belgeye ikinci onay burada bekler
  if not found then raise exception 'Belge bulunamadı'; end if;
  if b.durum = 'onayli' then perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'zaten', true, 'no', b.no); end if;
  if b.durum = 'iptal' then raise exception 'İptal edilmiş belge onaylanamaz (%)', b.no; end if;
  if p_surum is distinct from b.surum then raise exception 'Belge siz açtıktan sonra değiştirildi; son halini görüp yeniden onaylayın' using errcode = '40001'; end if;
  if not exists (select 1 from belge_satirlari where belge_id = b.id) then raise exception 'Satırı olmayan belge onaylanamaz'; end if;
  if not exists (select 1 from depolar where id = b.depo_id and aktif) or (b.hedef_depo_id is not null and not exists (select 1 from depolar where id = b.hedef_depo_id and aktif)) then
    raise exception 'Belgedeki depo pasif'; end if;

  -- numara: tür + yıl sayacı (satır kilidi; iki onay aynı numarayı alamaz)
  insert into belge_sayac as x (tur, yil, son_no) values (b.tur, extract(year from b.tarih)::int, 1)
    on conflict (tur, yil) do update set son_no = x.son_no + 1 returning son_no into n;
  v_no := b.tur || '-' || extract(year from b.tarih)::int || '-' || lpad(n::text, 6, '0');
  b.no := v_no;   -- defter satırları numarayı taşır; belge başlığı satırlar işlendikten sonra onaylı yapılır

  -- kilitler: ürün maliyetleri ve depo bakiyeleri, sabit sırayla
  select array_agg(distinct urun_id order by urun_id) into urunler_ from belge_satirlari where belge_id = b.id;
  select jsonb_agg(jsonb_build_object('u', u, 'd', d)) into ciftler from (
    select urun_id u, b.depo_id d from belge_satirlari where belge_id = b.id
    union select urun_id, b.hedef_depo_id from belge_satirlari where belge_id = b.id and b.hedef_depo_id is not null) x;
  perform _kilitle(urunler_, ciftler);

  for s in select * from belge_satirlari where belge_id = b.id order by urun_id loop
    if b.tur in ('GIR', 'ACL') then
      perform _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, s.miktar, s.birim_maliyet, 'giris', null, k.eposta, k.uid); say := say + 1;
    elsif b.tur = 'CIK' then
      perform _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, -s.miktar, null, 'yok', null, k.eposta, k.uid); say := say + 1;
    elsif b.tur = 'TRF' then                                   -- kaynaktan düşüş ve hedefe giriş aynı işlemde, aynı tutarla
      v_h := _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, -s.miktar, null, 'yok', null, k.eposta, k.uid);
      perform _hareket(b, 'onay', s.id, s.urun_id, b.hedef_depo_id, s.miktar, null, 'yok', null, k.eposta, k.uid,
                       -(select tutar from stok_defteri where id = v_h)); say := say + 2;
    elsif b.tur = 'SAY' then                                   -- sistem miktarı onay anındaki AKCAN bakiyesi
      select miktar into v_sis from stok_bakiye where urun_id = s.urun_id and depo_id = b.depo_id;
      v_fark := s.sayilan - v_sis;
      update belge_satirlari set sistem = v_sis, fark = v_fark where id = s.id;
      if v_fark > 0 then
        select ort_maliyet into a from urun_maliyet where urun_id = s.urun_id;
        if (select toplam_miktar from urun_maliyet where urun_id = s.urun_id) <= 0 and s.birim_maliyet is null then
          raise exception 'Sayım fazlası: % için ortalama maliyet yok; satıra birim maliyet girilmeli (yönetici)', (select ad from urunler where id = s.urun_id);
        end if;
        perform _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, v_fark,
                         case when (select toplam_miktar from urun_maliyet where urun_id = s.urun_id) > 0 then a else s.birim_maliyet end,
                         'giris', null, k.eposta, k.uid); say := say + 1;
      elsif v_fark < 0 then
        perform _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, v_fark, null, 'yok', null, k.eposta, k.uid); say := say + 1;
      end if;
    end if;
  end loop;
  update belgeler set durum = 'onayli', no = v_no, yil = extract(year from b.tarih)::int, sira_no = n, surum = surum + 1,
                      onaylayan = k.eposta, onaylayan_id = k.uid, onay_zaman = now()
    where id = b.id returning * into b;
  perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'no', b.no, 'hareket', say);
end $$;

-- ---------- 12) belge_iptal: ters stok hareketiyle ----------
create or replace function public.belge_iptal(p_id uuid, p_neden text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; b belgeler; h record; urunler_ uuid[]; ciftler jsonb; say int := 0; v_h bigint; trf jsonb := '{}';
begin
  select * into k from _kim();
  if k.rol <> 'yonetici' then raise exception 'Belgeyi yalnız yönetici iptal edebilir' using errcode = '42501'; end if;
  if length(trim(coalesce(p_neden, ''))) < 5 then raise exception 'İptal nedeni yazılmalı (en az 5 karakter)'; end if;
  perform set_config('akcan.motor', 'on', true);

  select * into b from belgeler where id = p_id for update;
  if not found then raise exception 'Belge bulunamadı'; end if;
  if b.durum = 'iptal' then perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'zaten', true, 'no', b.no); end if;
  if b.durum <> 'onayli' then raise exception 'Yalnız onaylı belge iptal edilir; taslak silinebilir'; end if;

  select array_agg(distinct urun_id order by urun_id), jsonb_agg(distinct jsonb_build_object('u', urun_id, 'd', depo_id))
    into urunler_, ciftler from stok_defteri where belge_id = b.id and islem = 'onay';
  if urunler_ is not null then perform _kilitle(urunler_, ciftler); end if;

  -- önce girişlerin tersi (stok düşer, eksiye düşerse iptal reddedilir), sonra çıkışların tersi; aynı maliyetle
  for h in select * from stok_defteri where belge_id = b.id and islem = 'onay' order by (miktar < 0), urun_id, depo_id loop
    v_h := _hareket(b, 'iptal', h.satir_id, h.urun_id, h.depo_id, -h.miktar, h.birim_maliyet,
                     case when b.tur = 'TRF' then 'yok' when h.miktar > 0 then 'cikis_geri' else 'giris' end,
                     h.id, k.eposta, k.uid,
                     -- transferde kaynağa dönen tutar, hedeften çıkanla aynı olur (toplam stok değeri değişmez)
                     case when b.tur = 'TRF' and h.miktar < 0 and trf ? h.satir_id::text then -(trf ->> h.satir_id::text)::numeric else -h.tutar end);
    if b.tur = 'TRF' and h.miktar > 0 then trf := trf || jsonb_build_object(h.satir_id::text, (select tutar from stok_defteri where id = v_h)); end if;
    say := say + 1;
  end loop;
  update belgeler set durum = 'iptal', surum = surum + 1, iptal_eden = k.eposta, iptal_eden_id = k.uid, iptal_zaman = now(), iptal_nedeni = trim(p_neden)
    where id = b.id returning * into b;
  perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'no', b.no, 'ters_hareket', say);
end $$;

/** taslak silme (yalnız taslak; personel yalnız kendi taslağı) */
create or replace function public.belge_taslak_sil(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; b belgeler;
begin
  select * into k from _kim();
  if k.rol not in ('yonetici', 'kasiyer', 'teknisyen') then raise exception 'Yetki yok' using errcode = '42501'; end if;
  perform set_config('akcan.motor', 'on', true);
  select * into b from belgeler where id = p_id for update;
  if not found then perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'zaten', true); end if;
  if b.durum <> 'taslak' then raise exception 'Onaylı ya da iptal edilmiş belge silinemez (%)', b.no using errcode = '42501'; end if;
  if k.rol <> 'yonetici' and b.olusturan is distinct from k.eposta then raise exception 'Personel yalnız kendi taslağını silebilir' using errcode = '42501'; end if;
  delete from belgeler where id = b.id;
  perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true);
end $$;

-- ---------- 13) personel görünümleri (maliyetsiz) ----------
create or replace view public.belge_satirlari_p as
  select id, belge_id, sira, urun_id, miktar, null::numeric as birim_maliyet, sayilan, sistem, fark, notlar
  from public.belge_satirlari where (select public.benim_rolum()) <> 'yok';
create or replace view public.stok_defteri_p as
  select id, zaman, tarih, belge_id, belge_no, tur, islem, satir_id, urun_id, depo_id, miktar, onceki_miktar, sonraki_miktar,
         toplam_onceki, toplam_sonraki, ters_kayit_id, kullanici
  from public.stok_defteri where (select public.benim_rolum()) <> 'yok';

-- ---------- 14) RLS ve izinler ----------
alter table public.belge_turleri enable row level security;
alter table public.belge_sayac enable row level security;
alter table public.belgeler enable row level security;
alter table public.belge_satirlari enable row level security;
alter table public.stok_defteri enable row level security;
alter table public.stok_bakiye enable row level security;
alter table public.urun_maliyet enable row level security;
do $$ declare t text; p record; begin
  foreach t in array array['belge_turleri','belge_sayac','belgeler','belge_satirlari','stok_defteri','stok_bakiye','urun_maliyet'] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop execute format('drop policy %I on public.%I', p.policyname, t); end loop;
  end loop;
end $$;
-- herkes (giriş yapmış ve listede olan): tür, sayaç, belge başlığı, depo bakiyesi — maliyet içermez
create policy okuma on public.belge_turleri for select to authenticated using ((select public.benim_rolum()) <> 'yok');
create policy okuma on public.belge_sayac for select to authenticated using ((select public.benim_rolum()) <> 'yok');
create policy okuma on public.belgeler for select to authenticated using ((select public.benim_rolum()) <> 'yok');
create policy okuma on public.stok_bakiye for select to authenticated using ((select public.benim_rolum()) <> 'yok');
-- maliyet içerenler: yalnız yönetici (personel _p görünümlerini okur)
create policy okuma on public.belge_satirlari for select to authenticated using ((select public.benim_rolum()) = 'yonetici');
create policy okuma on public.stok_defteri for select to authenticated using ((select public.benim_rolum()) = 'yonetici');
create policy okuma on public.urun_maliyet for select to authenticated using ((select public.benim_rolum()) = 'yonetici');

revoke all on public.belge_turleri, public.belge_sayac, public.belgeler, public.belge_satirlari, public.stok_defteri, public.stok_bakiye,
              public.urun_maliyet, public.belge_satirlari_p, public.stok_defteri_p from public, anon, authenticated, service_role;
grant select on public.belge_turleri, public.belge_sayac, public.belgeler, public.belge_satirlari, public.stok_defteri, public.stok_bakiye,
                public.urun_maliyet, public.belge_satirlari_p, public.stok_defteri_p to authenticated, service_role;

revoke all on function public.belge_kaydet(jsonb), public.belge_onayla(uuid, int), public.belge_iptal(uuid, text), public.belge_taslak_sil(uuid) from public, anon;
grant execute on function public.belge_kaydet(jsonb), public.belge_onayla(uuid, int), public.belge_iptal(uuid, text), public.belge_taslak_sil(uuid) to authenticated;
revoke all on function public._kim(), public._kilitle(uuid[], jsonb),
  public._hareket(public.belgeler, text, bigint, uuid, uuid, numeric, numeric, text, bigint, text, uuid, numeric),
  public._belge_koru(), public._satir_koru(), public._defter_koru(), public._motor_tablo_koru(), public._truncate_yok()
  from public, anon, authenticated, service_role;
