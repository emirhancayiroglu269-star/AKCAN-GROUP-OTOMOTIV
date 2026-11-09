-- =====================================================================
-- 066 · FAZ 2 · F2.1 Aşama A — Köprü başlangıç noktası, tekilleştirme ve alış taslakları (ara tablo)
-- YALNIZ akcan-test; canlıya ayrıca yazılı onayla.
--
-- Kesin sınırlar:
--   * Faz 1 belge, stok, maliyet ve sayaç tablolarına HİÇ yazılmaz; Faz 1 yazma fonksiyonları çağrılmaz;
--     Faz 1 motor ayarı kullanılmaz. Faz 1 tabloları yalnız OKUNUR (açılış durumu, ürün türü).
--   * Mevcut tablolara yabancı anahtar kurulmaz (FK başvurulan tabloya iç tetikleyici ekler); bağlar fonksiyonda doğrulanır.
--   * Alış taslakları belge değildir; alis_taslak.belge_id F2.1'de her zaman boştur (kısıt). Deneme kaynaklı
--     taslak hiçbir zaman belgeye bağlanamaz (kalıcı kısıt). ALF belge türü F2.2'de, ayrı yazılı onayla.
--   * Kesim kaydı yalnız kopru_kesim_onayla ile yazılır; açılışı onaylanmamış depoyu reddeder; onaydan sonra
--     değiştirilemez ve silinemez.
-- Geri alma: supabase/yedek/066_geri_al.sql (önce 067 geri alınmalı).
-- =====================================================================

-- ---------- tablolar ----------
create table if not exists public.kopru_baslangic (
  id bigint generated always as identity primary key,
  depo_id uuid not null,
  akis text not null check (akis in ('alis', 'satis')),
  kesim_ani timestamptz not null,
  guven_dk int not null default 10 check (guven_dk between 0 and 120),
  dayanak jsonb not null,                 -- açılış belgeleri, önerilen değer, stok görüntüsü zamanı, doğrulanmış mı
  durum text not null default 'onayli' check (durum in ('onayli')),
  gerekce text not null check (length(trim(gerekce)) >= 5),
  onaylayan text not null, onaylayan_id uuid,
  onay_zaman timestamptz not null default now()
);
create unique index if not exists kopru_baslangic_tek on public.kopru_baslangic (depo_id, akis);

create table if not exists public.kopru_kayit (
  id bigint generated always as identity primary key,
  akis text not null check (akis in ('alis', 'satis')),
  kaynak text not null check (kaynak in ('bh', 'deneme')),
  bh_belge_guid text not null,
  depo_id uuid,                           -- null: depo tanınmadı
  depo_ad text,
  depo_anahtar text generated always as (coalesce(depo_id::text, 'ad:' || coalesce(depo_ad, ''))) stored,
  fatura_tarihi date not null,
  fatura_saati time,
  ilk_gorulme timestamptz not null,
  parmak_izi text not null,
  karar text not null check (karar in ('acilista', 'islendi', 'belirsiz', 'depo_acilmadi', 'degisti', 'hata')),
  karar_nedeni text,
  alis_taslak_id bigint,
  karar_veren text,
  karar_zaman timestamptz not null default now(),
  olusturma timestamptz not null default now(),
  -- yapay ve gerçek fatura kesin ayrılır: deneme ⇔ kimlik DENEME- ile başlar
  constraint kopru_kayit_deneme_onek check ((kaynak = 'deneme') = (bh_belge_guid like 'DENEME-%'))
);
create unique index if not exists kopru_kayit_anahtar on public.kopru_kayit (akis, kaynak, bh_belge_guid, depo_anahtar);

create table if not exists public.alis_taslak (
  id bigint generated always as identity primary key,
  kopru_kayit_id bigint not null unique references public.kopru_kayit (id),
  kaynak text not null check (kaynak in ('bh', 'deneme')),
  bh_belge_guid text not null,
  tedarikci_id uuid references public.tedarikciler (id),
  cari_kimlik text, cari_ad text,
  fatura_no text,
  fatura_tarihi date not null, fatura_saati time,
  depo_id uuid not null,
  fatura_alti_iskonto numeric(14,2) not null default 0 check (fatura_alti_iskonto >= 0),
  ara_toplam numeric(14,2), kdv_toplam numeric(14,2), genel_toplam numeric(14,2),
  uyari_sayisi int not null default 0,
  durum text not null default 'taslak' check (durum in ('taslak')),
  surum int not null default 1,
  belge_id uuid,                          -- F2.2'de (ayrı onayla) kullanılacak; F2.1'de her zaman boş
  olusturma timestamptz not null default now(),
  guncelleme timestamptz,
  constraint alis_taslak_deneme_onek check ((kaynak = 'deneme') = (bh_belge_guid like 'DENEME-%')),
  constraint alis_taslak_deneme_belgesiz check (kaynak <> 'deneme' or belge_id is null),   -- kalıcı
  constraint alis_taslak_f21_belgesiz check (belge_id is null)                               -- F2.2'de ayrı onayla kaldırılır
);

create table if not exists public.alis_taslak_satir (
  id bigint generated always as identity primary key,
  taslak_id bigint not null references public.alis_taslak (id) on delete cascade,
  sira int not null,
  urun_id uuid, urun_bh_id text, urun_kod text, urun_ad text,
  miktar numeric(14,3) not null check (miktar > 0),
  birim_fiyat numeric(14,4) not null check (birim_fiyat >= 0),
  indirim numeric(14,2) not null default 0,
  satir_tutar numeric(14,2) not null,              -- miktar × birim fiyat − satır indirimi (KDV hariç)
  fatura_alti_pay numeric(14,2) not null default 0,
  net_birim_maliyet numeric(14,4) not null,         -- (satır tutarı − fatura altı pay) / miktar
  kdv_orani numeric(5,2),
  kdv_tutar numeric(14,2),
  uyarilar text[] not null default '{}',            -- urun_eslesmedi, pasif_urun, hizmet, sifir_maliyet
  unique (taslak_id, sira)
);

-- ---------- koruma ----------
create or replace function public._kopru_tablo_koru() returns trigger language plpgsql as $$
declare kopru boolean := coalesce(current_setting('akcan.kopru', true), '') = 'on';
        temizlik boolean := coalesce(current_setting('akcan.deneme_temizlik', true), '') = 'on';
begin
  if tg_op = 'TRUNCATE' then raise exception '% tablosu toplu silinemez', tg_table_name using errcode = '42501'; end if;
  if tg_table_name = 'kopru_baslangic' then
    if tg_op <> 'INSERT' then raise exception 'Kesim kaydı onaydan sonra değiştirilemez ve silinemez' using errcode = '42501'; end if;
    if not kopru then raise exception 'Kesim kaydı yalnız kopru_kesim_onayla ile yazılır' using errcode = '42501'; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if tg_table_name = 'alis_taslak_satir' and (kopru or temizlik) then return old; end if;
    if temizlik and old.kaynak = 'deneme' then return old; end if;            -- yalnız deneme kayıtları temizlenebilir
    raise exception '% kaydı silinemez', tg_table_name using errcode = '42501';
  end if;
  if not kopru then raise exception '% yalnız köprü fonksiyonlarıyla yazılır', tg_table_name using errcode = '42501'; end if;
  if tg_table_name = 'kopru_kayit' and tg_op = 'UPDATE' then
    if old.akis <> new.akis or old.kaynak <> new.kaynak or old.bh_belge_guid <> new.bh_belge_guid or old.depo_anahtar <> new.depo_anahtar then
      raise exception 'Köprü kaydının anahtarı değiştirilemez' using errcode = '42501'; end if;
    if old.karar <> new.karar and not (old.karar = 'depo_acilmadi'
                                       or (old.karar = 'belirsiz' and new.karar in ('acilista', 'islendi'))
                                       or (old.karar = 'islendi' and new.karar = 'degisti')) then
      raise exception 'Geçersiz köprü kararı değişikliği: % → %', old.karar, new.karar using errcode = '42501'; end if;
  end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['kopru_baslangic', 'kopru_kayit', 'alis_taslak', 'alis_taslak_satir'] loop
    execute format('drop trigger if exists kopru_koru on public.%I', t);
    execute format('create trigger kopru_koru before insert or update or delete on public.%I for each row execute function public._kopru_tablo_koru()', t);
    execute format('drop trigger if exists kopru_truncate_yok on public.%I', t);
    execute format('create trigger kopru_truncate_yok before truncate on public.%I for each statement execute function public._kopru_tablo_koru()', t);
  end loop;
end $$;

drop trigger if exists denetim_tg on public.kopru_baslangic;
create trigger denetim_tg after insert or update or delete on public.kopru_baslangic for each row execute function public.denetim_tg();
drop trigger if exists denetim_tg on public.kopru_kayit;
create trigger denetim_tg after insert or update or delete on public.kopru_kayit for each row execute function public.denetim_tg();

-- ---------- yardımcılar (yalnız okur) ----------
create or replace function public._kopru_fatura_zamani(p_tarih date, p_saat time) returns timestamptz
language sql immutable as $$ select (p_tarih + coalesce(p_saat, time '00:00')) at time zone 'Europe/Istanbul' $$;

-- Türkçe büyük/küçük harf farkını yok sayan ad karşılaştırması (İ/ı/i → I, boşluklar sadeleşir)
create or replace function public._kopru_ad_norm(p text) returns text
language sql immutable as $$ select upper(regexp_replace(translate(trim(coalesce(p, '')), 'İıi', 'III'), '\s+', ' ', 'g')) $$;

-- depo açık mı: en az bir onaylı açılış var ve bekleyen açılış taslağı yok (Faz 1 tabloları yalnız okunur)
create or replace function public._kopru_depo_acik(p_depo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from belgeler where tur = 'ACL' and durum = 'onayli' and depo_id = p_depo)
     and not exists (select 1 from belgeler where tur = 'ACL' and durum = 'taslak' and depo_id = p_depo) $$;

create or replace function public._fatura_parmak_izi(p_satirlar jsonb, p_iskonto numeric) returns text
language sql immutable as $$
  select md5(coalesce(p_iskonto, 0)::text || '#' || coalesce((
    select string_agg(concat_ws('|', s->>'sira', coalesce(s->>'urun_id', s->>'urun_bh_id', s->>'ad'),
                                ((s->>'miktar')::numeric)::text, ((s->>'birim_fiyat')::numeric)::text,
                                coalesce((s->>'indirim')::numeric, 0)::text, coalesce(s->>'kdv_orani', '')), ';' order by (s->>'sira')::int)
      from jsonb_array_elements(p_satirlar) s), '')) $$;

-- kaynağı tek biçime getirir; her çağrı TEK kaynak okur (bh ya da deneme), iki kaynak hiçbir yerde karışmaz
create or replace function public._kopru_alis_kaynak(p_kaynak text)
returns table (guid text, depo_id uuid, depo_ad text, tarih date, saat time, ilk_gorulme timestamptz,
               cari_kimlik text, cari_ad text, fatura_no text, iskonto numeric, satirlar jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_kaynak = 'bh' then
    -- BizimHesap alış rapor satırları (iade hariç: tedarikçiye iade F2.2'de TIA). İlk görülme, yeniden yüklemede
    -- geçersiz yapılan eski satırlar da dahil en eski yüklenme anıdır (eski satırlar silinmez).
    return query
      with r as (select x.*, (select d.id from depolar d where public._kopru_ad_norm(d.ad) = public._kopru_ad_norm(x.depo) or d.bh_id = x.depo order by d.aktif desc limit 1) as dep
                   from rapor_satirlari x where x.tur = 'alis' and x.belge_guid is not null and not coalesce(x.iade, false)),
           ilk as (select r.belge_guid, min(r.yuklendi) as ilk from r group by 1),
           g as (select r.*, row_number() over (partition by r.belge_guid, r.depo order by r.id) as sira from r where not coalesce(r.gecersiz, false))
      select g.belge_guid, g.dep, g.depo, min(g.tarih), min(g.saat), min(ilk.ilk), min(g.cari_guid), min(g.cari_ad), null::text, 0::numeric,
             jsonb_agg(jsonb_build_object('sira', g.sira, 'urun_id', g.urun_id, 'urun_bh_id', g.urun_bh_id, 'kod', g.kod, 'ad', g.urun_ad,
                       'miktar', g.miktar, 'birim_fiyat', coalesce(g.birim_fiyat, g.alis_fiyati, 0), 'indirim', coalesce(g.indirim, 0),
                       'kdv_orani', g.kdv_orani) order by g.sira)
        from g join ilk on ilk.belge_guid = g.belge_guid
       group by g.belge_guid, g.dep, g.depo;
  elsif p_kaynak = 'deneme' then
    return query
      select f.guid, f.depo_id, (select d.ad from depolar d where d.id = f.depo_id), f.tarih, f.saat, f.ilk_gorulme, f.cari_id, c.unvan,
             f.fatura_no, f.iskonto_tutar,
             (select jsonb_agg(jsonb_build_object('sira', s.sira, 'urun_id', s.urun_id, 'urun_bh_id', null, 'kod', null, 'ad', s.urun_ad,
                       'miktar', s.miktar, 'birim_fiyat', s.birim_fiyat, 'indirim', s.indirim, 'kdv_orani', s.kdv_orani) order by s.sira)
                from deneme_fatura_satir s where s.fatura_guid = f.guid)
        from deneme_fatura f join deneme_cari c on c.id = f.cari_id;
  else
    raise exception 'Geçersiz kaynak: % (bh ya da deneme)', p_kaynak;
  end if;
end $$;

-- alış taslağını (ara tablo) yazar ya da günceller; çağıran köprü bayrağını açmış olmalı
create or replace function public._alis_taslak_yaz(p_taslak bigint, p_kayit bigint, p_kaynak text, f jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_ted uuid; v_id bigint := p_taslak; s jsonb; n int; i int := 0; v_toplam numeric := 0; v_kalan numeric; v_iskonto numeric;
        v_tutar numeric; v_pay numeric; v_net numeric; v_kdv numeric; u record; v_tur text; uy text[]; v_uyari int := 0;
        v_ara numeric := 0; v_kdv_t numeric := 0;
begin
  -- tedarikçi: aynı kaynak + cari kimliği; yoksa açılır (deneme carisi deneme kaynaklı tedarikçi olur)
  if f->>'cari_kimlik' is not null then
    select id into v_ted from tedarikciler where kaynak = p_kaynak and bh_cari_id = f->>'cari_kimlik';
    if v_ted is null then
      insert into tedarikciler (kaynak, bh_cari_id, unvan, olusturan)
      values (p_kaynak, f->>'cari_kimlik', coalesce(nullif(trim(f->>'cari_ad'), ''), 'Bilinmeyen tedarikçi'), 'köprü')
      returning id into v_ted;
    end if;
  end if;
  v_iskonto := coalesce((f->>'iskonto')::numeric, 0);
  select count(*), coalesce(sum(round((x->>'miktar')::numeric * (x->>'birim_fiyat')::numeric - coalesce((x->>'indirim')::numeric, 0), 2)), 0)
    into n, v_toplam from jsonb_array_elements(f->'satirlar') x;
  v_kalan := v_iskonto;

  if v_id is null then
    insert into alis_taslak (kopru_kayit_id, kaynak, bh_belge_guid, tedarikci_id, cari_kimlik, cari_ad, fatura_no, fatura_tarihi, fatura_saati,
                             depo_id, fatura_alti_iskonto)
    values (p_kayit, p_kaynak, f->>'guid', v_ted, f->>'cari_kimlik', f->>'cari_ad', f->>'fatura_no', (f->>'tarih')::date, (f->>'saat')::time,
            (f->>'depo_id')::uuid, v_iskonto)
    returning id into v_id;
  else
    delete from alis_taslak_satir where taslak_id = v_id;
    update alis_taslak set tedarikci_id = v_ted, cari_kimlik = f->>'cari_kimlik', cari_ad = f->>'cari_ad', fatura_no = f->>'fatura_no',
                           fatura_tarihi = (f->>'tarih')::date, fatura_saati = (f->>'saat')::time, fatura_alti_iskonto = v_iskonto,
                           surum = surum + 1, guncelleme = now()
     where id = v_id;
  end if;

  for s in select x from jsonb_array_elements(f->'satirlar') x order by (x->>'sira')::int loop
    i := i + 1;
    v_tutar := round((s->>'miktar')::numeric * (s->>'birim_fiyat')::numeric - coalesce((s->>'indirim')::numeric, 0), 2);
    -- fatura altı iskonto satırlara tutar oranında dağıtılır; kuruş farkını son satır alır
    v_pay := case when v_iskonto = 0 or v_toplam <= 0 then 0 when i = n then v_kalan else round(v_iskonto * v_tutar / v_toplam, 2) end;
    v_kalan := v_kalan - v_pay;
    v_net := round((v_tutar - v_pay) / (s->>'miktar')::numeric, 4);
    v_kdv := round((v_tutar - v_pay) * coalesce((s->>'kdv_orani')::numeric, 0) / 100, 2);
    uy := '{}';
    select x.id, x.kod, x.ad, x.aktif, x.kategori into u from urunler x where x.id = nullif(s->>'urun_id', '')::uuid;
    if u.id is null then uy := uy || 'urun_eslesmedi'::text;
    else
      if not u.aktif then uy := uy || 'pasif_urun'::text; end if;
      select t.tur into v_tur from urun_turu t where t.urun_id = u.id;
      if v_tur = 'hizmet' or (v_tur is null and public.hizmet_adayi_mi(u.ad, u.kategori)) then uy := uy || 'hizmet'::text; end if;
    end if;
    if v_net <= 0 then uy := uy || 'sifir_maliyet'::text; end if;
    v_uyari := v_uyari + cardinality(uy);
    v_ara := v_ara + v_tutar - v_pay; v_kdv_t := v_kdv_t + v_kdv;
    insert into alis_taslak_satir (taslak_id, sira, urun_id, urun_bh_id, urun_kod, urun_ad, miktar, birim_fiyat, indirim, satir_tutar,
                                   fatura_alti_pay, net_birim_maliyet, kdv_orani, kdv_tutar, uyarilar)
    values (v_id, (s->>'sira')::int, u.id, s->>'urun_bh_id', coalesce(u.kod, s->>'kod'), coalesce(u.ad, s->>'ad'), (s->>'miktar')::numeric,
            (s->>'birim_fiyat')::numeric, coalesce((s->>'indirim')::numeric, 0), v_tutar, v_pay, v_net, (s->>'kdv_orani')::numeric, v_kdv, uy);
  end loop;
  update alis_taslak set ara_toplam = v_ara, kdv_toplam = v_kdv_t, genel_toplam = v_ara + v_kdv_t, uyari_sayisi = v_uyari where id = v_id;
  return v_id;
end $$;

-- ---------- kesim anı ----------
-- yalnız önerir, hiçbir şey yazmaz. Öneri, açılış taslaklarının okuduğu BizimHesap depo stoku kopyasının
-- son değişim zamanından türetilir; doğrulanmış eşitleme zamanı DEĞİLDİR (dogrulanmis = false).
create or replace function public.kopru_kesim_oner(p_depo uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_acl_ilk timestamptz; v_stok timestamptz; v_belgeler jsonb;
begin
  if public.benim_rolum() <> 'yonetici' then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  if not exists (select 1 from depolar where id = p_depo) then raise exception 'Depo bulunamadı'; end if;
  if not public._kopru_depo_acik(p_depo) then
    return jsonb_build_object('depo_id', p_depo, 'oneri', null, 'neden', 'Depo açılmadı: onaylı açılış yok ya da bekleyen açılış taslağı var');
  end if;
  select min(olusturma), jsonb_agg(no order by no) into v_acl_ilk, v_belgeler from belgeler where tur = 'ACL' and durum = 'onayli' and depo_id = p_depo;
  select max(degisim) into v_stok from urun_depo_stok where depo_id = p_depo and degisim <= v_acl_ilk;
  return jsonb_build_object('depo_id', p_depo, 'acilis_belgeleri', v_belgeler, 'acilis_taslak_olusturma', v_acl_ilk,
           'stok_goruntu_ani', v_stok,
           'oneri', case when v_stok is not null then date_trunc('second', v_stok) + interval '1 second' end,
           'dogrulanmis', false,
           'kaynak', 'BizimHesap depo stoku kopyasının son değişim zamanı (urun_depo_stok.degisim); eşitleme kaydı değil',
           'mevcut', (select jsonb_agg(jsonb_build_object('akis', akis, 'kesim_ani', kesim_ani)) from kopru_baslangic where depo_id = p_depo));
end $$;

-- yalnız yönetici; depo × akış için bir kez. Açılışı onaylanmamış depoyu (bugün Velibaba) reddeder.
create or replace function public.kopru_kesim_onayla(p_depo uuid, p_akis text, p_kesim timestamptz, p_gerekce text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_oneri jsonb; v_id bigint;
begin
  if public.benim_rolum() <> 'yonetici' then raise exception 'Kesim anını yalnız yönetici onaylar' using errcode = '42501'; end if;
  if p_akis not in ('alis', 'satis') then raise exception 'Akış alis ya da satis olmalı'; end if;
  if not exists (select 1 from depolar where id = p_depo and aktif) then raise exception 'Depo bulunamadı ya da pasif'; end if;
  if not public._kopru_depo_acik(p_depo) then raise exception 'Depo açılmadı: onaylı açılışı olmayan ya da bekleyen açılış taslağı olan depoya kesim kaydı yazılamaz' using errcode = '23514'; end if;
  if p_kesim is null or p_kesim > now() then raise exception 'Kesim anı boş ya da ileri bir zaman olamaz'; end if;
  if length(trim(coalesce(p_gerekce, ''))) < 5 then raise exception 'Gerekçe yazılmalı (en az 5 karakter)'; end if;
  if exists (select 1 from kopru_baslangic where depo_id = p_depo and akis = p_akis) then
    raise exception 'Bu depo ve akış için kesim anı zaten onaylı; değiştirilemez' using errcode = '23505'; end if;
  v_oneri := public.kopru_kesim_oner(p_depo);
  perform set_config('akcan.kopru', 'on', true);
  insert into kopru_baslangic (depo_id, akis, kesim_ani, dayanak, gerekce, onaylayan, onaylayan_id)
  values (p_depo, p_akis, p_kesim, v_oneri, trim(p_gerekce), auth.jwt() ->> 'email', auth.uid())
  returning id into v_id;
  perform set_config('akcan.kopru', '', true);
  return jsonb_build_object('ok', true, 'id', v_id, 'depo_id', p_depo, 'akis', p_akis, 'kesim_ani', p_kesim);
end $$;

-- ---------- alış köprüsü ----------
-- Tek kaynak okur. Her fatura × depo için tek kayıt (tekil anahtar). Kesim kaydı olmayan açık depodaki
-- faturaya kayıt açmaz (sonra değerlendirilir). Stok hareketi ve belge OLUŞTURMAZ; yalnız ara tabloya taslak açar.
create or replace function public.alis_kopru_calistir(p_kaynak text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; k record; kb record; f jsonb; v_parmak text; v_zaman timestamptz; v_karar text; v_neden text; v_id bigint; v_t bigint;
        okunan int := 0; v_var boolean; yeni jsonb := '{}'; zaten int := 0; guncellenen int := 0; kesim_yok int := 0; bekleyen int := 0;
begin
  if public.benim_rolum() <> 'yonetici' and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Köprüyü yalnız yönetici çalıştırır' using errcode = '42501'; end if;
  if p_kaynak not in ('bh', 'deneme') then raise exception 'Geçersiz kaynak: %', p_kaynak; end if;
  perform pg_advisory_xact_lock(hashtext('akcan.alis_kopru'));          -- iki çalıştırma aynı anda işlemez
  perform set_config('akcan.kopru', 'on', true);

  for r in select * from public._kopru_alis_kaynak(p_kaynak) x order by x.tarih, x.saat nulls first, x.ilk_gorulme, x.guid loop
    okunan := okunan + 1;
    f := to_jsonb(r);
    v_parmak := public._fatura_parmak_izi(r.satirlar, r.iskonto);
    select * into k from kopru_kayit
     where akis = 'alis' and kaynak = p_kaynak and bh_belge_guid = r.guid and depo_anahtar = coalesce(r.depo_id::text, 'ad:' || coalesce(r.depo_ad, ''))
       for update;
    v_var := found;
    if v_var then
      if k.karar = 'acilista' or (k.parmak_izi = v_parmak and k.karar <> 'depo_acilmadi') then zaten := zaten + 1; continue; end if;
      if k.karar = 'islendi' then                                      -- fatura değişti; taslak yeni haliyle güncellenir
        perform public._alis_taslak_yaz(k.alis_taslak_id, k.id, p_kaynak, f);
        update kopru_kayit set parmak_izi = v_parmak, karar_nedeni = 'fatura değişti; taslak güncellendi', karar_zaman = now() where id = k.id;
        guncellenen := guncellenen + 1; continue;
      end if;
      if k.karar <> 'depo_acilmadi' then                               -- belirsiz / hata: yalnız iz güncellenir, karar bekler
        update kopru_kayit set parmak_izi = v_parmak where id = k.id;
        guncellenen := guncellenen + 1; continue;
      end if;
    end if;

    -- karar
    v_neden := null;
    if r.depo_id is null then
      v_karar := 'hata'; v_neden := 'Depo tanınmadı: ' || coalesce(r.depo_ad, '(boş)');
    elsif not public._kopru_depo_acik(r.depo_id) then
      v_karar := 'depo_acilmadi'; v_neden := 'Depo açılmadı; açılış onaylanıp kesim belirlenince yeniden değerlendirilir';
    else
      select * into kb from kopru_baslangic where depo_id = r.depo_id and akis = 'alis';
      if not found then kesim_yok := kesim_yok + 1; continue; end if; -- kesim onaylanmadan hiçbir fatura işlenmez
      v_zaman := public._kopru_fatura_zamani(r.tarih, r.saat);
      if r.saat is null and r.tarih = (kb.kesim_ani at time zone 'Europe/Istanbul')::date then
        v_karar := 'belirsiz'; v_neden := 'Fatura saati yok ve tarihi kesim günü';
      elsif v_zaman between kb.kesim_ani - make_interval(mins => kb.guven_dk) and kb.kesim_ani + make_interval(mins => kb.guven_dk) then
        v_karar := 'belirsiz'; v_neden := 'Fatura zamanı kesimin ±' || kb.guven_dk || ' dakikası içinde';
      elsif v_zaman < kb.kesim_ani then
        if r.ilk_gorulme <= kb.kesim_ani then v_karar := 'acilista'; v_neden := 'Kesimden önce tarihli ve kesimden önce görülmüş: açılış stokunda';
        else v_karar := 'belirsiz'; v_neden := 'Kesimden önce tarihli ama kesimden sonra ilk kez görülmüş (geriye tarihli giriş)'; end if;
      else
        v_karar := 'islendi'; v_neden := 'Kesimden sonra';
      end if;
    end if;

    if v_var and k.karar = 'depo_acilmadi' then      -- daha önce "depo açılmadı" denmişti
      if v_karar = 'depo_acilmadi' then
        update kopru_kayit set parmak_izi = v_parmak where id = k.id and parmak_izi <> v_parmak;
        bekleyen := bekleyen + 1; continue;
      end if;
      update kopru_kayit set karar = v_karar, karar_nedeni = v_neden, parmak_izi = v_parmak, karar_veren = 'köprü', karar_zaman = now()
       where id = k.id;
      v_id := k.id;
    else
      insert into kopru_kayit (akis, kaynak, bh_belge_guid, depo_id, depo_ad, fatura_tarihi, fatura_saati, ilk_gorulme, parmak_izi, karar, karar_nedeni, karar_veren)
      values ('alis', p_kaynak, r.guid, r.depo_id, r.depo_ad, r.tarih, r.saat, r.ilk_gorulme, v_parmak, v_karar, v_neden, 'köprü')
      returning id into v_id;
    end if;
    if v_karar = 'islendi' then
      v_t := public._alis_taslak_yaz(null, v_id, p_kaynak, f);
      update kopru_kayit set alis_taslak_id = v_t where id = v_id;
    end if;
    yeni := jsonb_set(yeni, array[v_karar], to_jsonb(coalesce((yeni->>v_karar)::int, 0) + 1));
  end loop;
  perform set_config('akcan.kopru', '', true);
  return jsonb_build_object('ok', true, 'kaynak', p_kaynak, 'okunan', okunan, 'yeni', yeni, 'zaten', zaten,
                            'guncellenen', guncellenen, 'kesim_yok', kesim_yok, 'depo_acilmadi_bekleyen', bekleyen);
end $$;

-- belirsiz kararı yalnız yönetici verir: 'acilista' (hareket yok) ya da 'isle' (alış taslağı açılır)
create or replace function public.kopru_belirsiz_karar(p_kayit bigint, p_karar text, p_gerekce text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; r record; v_t bigint;
begin
  if public.benim_rolum() <> 'yonetici' then raise exception 'Belirsiz faturaya yalnız yönetici karar verir' using errcode = '42501'; end if;
  if p_karar not in ('acilista', 'isle') then raise exception 'Karar acilista ya da isle olmalı'; end if;
  if length(trim(coalesce(p_gerekce, ''))) < 5 then raise exception 'Gerekçe yazılmalı (en az 5 karakter)'; end if;
  select * into k from kopru_kayit where id = p_kayit for update;
  if not found then raise exception 'Köprü kaydı bulunamadı'; end if;
  if k.karar <> 'belirsiz' then raise exception 'Yalnız belirsiz kayda karar verilir (şu an: %)', k.karar; end if;
  perform set_config('akcan.kopru', 'on', true);
  if p_karar = 'isle' then
    select * into r from public._kopru_alis_kaynak(k.kaynak) x where x.guid = k.bh_belge_guid and coalesce(x.depo_id::text, 'ad:' || coalesce(x.depo_ad, '')) = k.depo_anahtar;
    if not found then raise exception 'Faturanın kaynağı bulunamadı'; end if;
    update kopru_kayit set karar = 'islendi', karar_nedeni = 'Yönetici: ' || trim(p_gerekce), karar_veren = auth.jwt() ->> 'email', karar_zaman = now() where id = k.id;
    v_t := public._alis_taslak_yaz(null, k.id, k.kaynak, to_jsonb(r));
    update kopru_kayit set alis_taslak_id = v_t where id = k.id;
  else
    update kopru_kayit set karar = 'acilista', karar_nedeni = 'Yönetici: ' || trim(p_gerekce), karar_veren = auth.jwt() ->> 'email', karar_zaman = now() where id = k.id;
  end if;
  perform set_config('akcan.kopru', '', true);
  return jsonb_build_object('ok', true, 'kayit', k.id, 'karar', case when p_karar = 'isle' then 'islendi' else 'acilista' end, 'alis_taslak', v_t);
end $$;

-- ---------- güvenlik ve izinler ----------
do $$ declare t text; begin
  foreach t in array array['kopru_baslangic', 'kopru_kayit', 'alis_taslak', 'alis_taslak_satir'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_yonetici', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.benim_rolum() = %L)', t || '_yonetici', t, 'yonetici');
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);         -- satır güvenliği: yalnız yönetici; kasiyer hiçbir satır görmez
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

revoke all on function public._kopru_tablo_koru(), public._kopru_fatura_zamani(date, time), public._kopru_depo_acik(uuid), public._kopru_ad_norm(text),
  public._fatura_parmak_izi(jsonb, numeric), public._kopru_alis_kaynak(text), public._alis_taslak_yaz(bigint, bigint, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.kopru_kesim_oner(uuid), public.kopru_kesim_onayla(uuid, text, timestamptz, text),
  public.alis_kopru_calistir(text), public.kopru_belirsiz_karar(bigint, text, text) from public, anon;
grant execute on function public.kopru_kesim_oner(uuid), public.kopru_kesim_onayla(uuid, text, timestamptz, text),
  public.alis_kopru_calistir(text), public.kopru_belirsiz_karar(bigint, text, text) to authenticated;   -- içeride yönetici kontrolü
