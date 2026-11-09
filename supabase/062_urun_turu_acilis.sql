-- =====================================================================
-- 062 · FAZ 1 — Ürün türü (stoklu / hizmet) ve BizimHesap'tan açılış taslağı
-- YALNIZ akcan-test'te geliştirilir; canlıya ayrıca onayla taşınır. 061'e bağlıdır.
--
-- Ürün türü ayrı tabloda tutulur (urunler tablosuna ve BizimHesap eşitlemesine dokunulmaz).
-- Kaydı olmayan ürün "stoklu" sayılır. Hizmet adayı (adı/kategorisi işçilik, hizmet, yıkama… içeren) ürünler
-- otomatik sınıflandırılmaz: yönetici kontrol listesinden tek tek belirler; o zamana kadar stok belgelerine ve açılışa alınmaz.
-- Hizmet ürünleri: stok defterine, bakiyeye, giriş/çıkış/transfer/sayım/açılış belgelerine girmez. Satış ve kârlılık
-- raporlarında kullanılmak üzere ürün kartları ve geçmişleri olduğu gibi korunur.
-- =====================================================================

create table if not exists public.urun_turu (
  urun_id uuid primary key references public.urunler(id),
  tur text not null check (tur in ('stoklu', 'hizmet')),
  belirleyen text not null, belirleyen_id uuid,
  zaman timestamptz not null default now(),
  aciklama text
);

/** ürünün türü; kayıt yoksa stoklu */
create or replace function public.urun_turu_bul(p_urun uuid) returns text language sql stable security definer set search_path = public as
$$ select coalesce((select tur from urun_turu where urun_id = p_urun), 'stoklu') $$;

/** hizmet adayı: adı ya da kategorisi hizmet / işçilik sözcükleri içeriyor (yalnız kontrol listesi için; kendiliğinden sınıflandırmaz) */
create or replace function public.hizmet_adayi_mi(p_ad text, p_kategori text) returns boolean language sql immutable as $$
  select upper(coalesce(p_ad, '') || ' ' || coalesce(p_kategori, '')) ~ '(İŞÇİLİK|ISCILIK|İSCİLİK|IŞÇILIK|HİZMET|HIZMET|DANIŞMANLIK|YIKAMA|MONTAJ ÜCRET|SERVİS ÜCRET|TAMİR ÜCRET)'
$$;

/** stok belgesine girebilir mi: türü hizmet olmayan ve (aday ise) türü yönetici tarafından belirlenmiş */
create or replace function public._stoklu_mu(p_urun uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when t.tur = 'hizmet' then 'hizmet'
    when t.tur is null and public.hizmet_adayi_mi(u.ad, u.kategori) then 'belirsiz'
    else 'stoklu' end
  from urunler u left join urun_turu t on t.urun_id = u.id where u.id = p_urun
$$;

-- yazma yalnız fonksiyonla; işlem geçmişi
create or replace function public._urun_turu_koru() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('akcan.motor', true), '') <> 'on' then raise exception 'Ürün türü yalnız uygulamadan değiştirilir' using errcode = '42501'; end if;
  return coalesce(new, old);
end $$;
drop trigger if exists urun_turu_koru on public.urun_turu;
create trigger urun_turu_koru before insert or update or delete on public.urun_turu for each row execute function public._urun_turu_koru();
drop trigger if exists denetim_tg on public.urun_turu;
create trigger denetim_tg after insert or update or delete on public.urun_turu for each row execute function public.denetim_tg();
drop trigger if exists truncate_yok on public.urun_turu;
create trigger truncate_yok before truncate on public.urun_turu for each statement execute function public._truncate_yok();

/** yönetici: ürünlerin türünü belirler. Hizmete çevrilecek üründe AKCAN stoku olmamalı (önce çıkış/sayımla sıfırlanır). */
create or replace function public.urun_turu_belirle(p_urunler uuid[], p_tur text, p_aciklama text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; n int := 0; u uuid; stoklu_ad text;
begin
  select * into k from _kim();
  if k.rol <> 'yonetici' then raise exception 'Ürün türünü yalnız yönetici belirler' using errcode = '42501'; end if;
  if p_tur not in ('stoklu', 'hizmet') then raise exception 'Tür stoklu ya da hizmet olmalı'; end if;
  if coalesce(array_length(p_urunler, 1), 0) = 0 or array_length(p_urunler, 1) > 500 then raise exception '1 ile 500 arası ürün seçin'; end if;
  perform set_config('akcan.motor', 'on', true);
  if p_tur = 'hizmet' then
    select string_agg(x.ad, ', ') into stoklu_ad from (
      select distinct u2.ad from stok_bakiye b join urunler u2 on u2.id = b.urun_id where b.urun_id = any(p_urunler) and b.miktar <> 0 limit 5) x;
    if stoklu_ad is not null then raise exception 'AKCAN stoku olan ürün hizmete çevrilemez (önce stok sıfırlanmalı): %', stoklu_ad; end if;
    -- onay bekleyen taslaklarda bu ürünler varsa uyarı: onaylarken reddedilir
  end if;
  foreach u in array p_urunler loop
    if not exists (select 1 from urunler where id = u) then raise exception 'Ürün bulunamadı'; end if;
    insert into urun_turu as t (urun_id, tur, belirleyen, belirleyen_id, aciklama) values (u, p_tur, k.eposta, k.uid, nullif(trim(p_aciklama), ''))
      on conflict (urun_id) do update set tur = excluded.tur, belirleyen = excluded.belirleyen, belirleyen_id = excluded.belirleyen_id, zaman = now(), aciklama = excluded.aciklama
      where t.tur is distinct from excluded.tur;
    n := n + 1;
  end loop;
  perform set_config('akcan.motor', '', true);
  return jsonb_build_object('ok', true, 'urun', n, 'tur', p_tur);
end $$;

/** kontrol listesi: hizmet adayları ve türü belirlenmiş ürünler */
create or replace view public.urun_turu_kontrol as
  select u.id as urun_id, u.ad, u.kod, u.kategori, u.stok as bh_stok, t.tur, t.belirleyen, t.zaman,
         public.hizmet_adayi_mi(u.ad, u.kategori) as aday,
         coalesce((select sum(b.miktar) from public.stok_bakiye b where b.urun_id = u.id), 0) as akcan_stok
  from public.urunler u left join public.urun_turu t on t.urun_id = u.id
  where u.aktif and (t.urun_id is not null or public.hizmet_adayi_mi(u.ad, u.kategori))
    and (select public.benim_rolum()) <> 'yok';

-- ---------- belge motoruna hizmet kuralı ----------
-- 1) taslakta: hizmet ya da türü belirsiz ürün satıra eklenemez
-- 2) onayda: (taslak sonrası tür değişmiş olabilir) yeniden kontrol
-- 3) her hareket yazımında son savunma
create or replace function public._satir_tur_kontrol() returns trigger language plpgsql security definer set search_path = public as $$
declare d text := _stoklu_mu(new.urun_id); ad text;
begin
  if d <> 'stoklu' then
    select u.ad into ad from urunler u where u.id = new.urun_id;
    if d = 'hizmet' then raise exception '% bir hizmet ürünü; stok belgelerine eklenemez', ad using errcode = '23514'; end if;
    raise exception '% hizmet adayı ve türü henüz belirlenmemiş; önce yönetici ürün türünü belirlemeli', ad using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists satir_tur_kontrol on public.belge_satirlari;
create trigger satir_tur_kontrol before insert or update of urun_id on public.belge_satirlari for each row execute function public._satir_tur_kontrol();

create or replace function public._defter_tur_kontrol() returns trigger language plpgsql security definer set search_path = public as $$
declare ad text;
begin
  if _stoklu_mu(new.urun_id) <> 'stoklu' then
    select u.ad into ad from urunler u where u.id = new.urun_id;
    raise exception '% stoklu ürün değil (hizmet ya da türü belirsiz); stok hareketi yazılamaz', ad using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists defter_tur_kontrol on public.stok_defteri;
create trigger defter_tur_kontrol before insert on public.stok_defteri for each row execute function public._defter_tur_kontrol();

-- ---------- BizimHesap'tan açılış taslağı ----------
/** açılışa alınamayan ürün × depo kalemleri ve nedeni (maliyet uydurulmaz; eksi stok 0 alınır) */
create or replace function public.acilis_istisnalari(p_depo uuid) returns table (urun_id uuid, ad text, kod text, bh_miktar numeric, alis_net numeric, satis_net numeric, neden text)
language plpgsql stable security definer set search_path = public as $$
declare kdv_haric boolean := coalesce((select alis_kdv_haric from ayarlar where id = 1), true);
begin
  if benim_rolum() <> 'yonetici' then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  return query
  select u.id, u.ad, u.kod, s.miktar,
         round(case when kdv_haric then coalesce(u.alis_fiyati, 0) else coalesce(u.alis_fiyati, 0) / (1 + coalesce(u.kdv, 20) / 100) end, 4),
         round(coalesce(u.satis_fiyati, 0) / (1 + coalesce(u.kdv, 20) / 100), 4),
         case
           when s.miktar < 0 then 'BizimHesap stoku eksi: açılışta 0 alındı'
           when _stoklu_mu(u.id) = 'hizmet' then 'Hizmet ürünü: stoka alınmaz'
           when _stoklu_mu(u.id) = 'belirsiz' then 'Hizmet adayı, türü belirlenmemiş'
           when coalesce(u.alis_fiyati, 0) <= 0 then 'Alış fiyatı sıfır ya da eksik'
           when (case when kdv_haric then u.alis_fiyati else u.alis_fiyati / (1 + coalesce(u.kdv, 20) / 100) end) > coalesce(u.satis_fiyati, 0) / (1 + coalesce(u.kdv, 20) / 100)
                and coalesce(u.satis_fiyati, 0) > 0 then 'Alış fiyatı satış fiyatından yüksek (güvenilir değil)'
           when not u.aktif then 'Pasif ürün'
         end
  from urun_depo_stok s join urunler u on u.id = s.urun_id
  where s.depo_id = p_depo and s.miktar <> 0
    and (s.miktar < 0 or _stoklu_mu(u.id) <> 'stoklu' or coalesce(u.alis_fiyati, 0) <= 0 or not u.aktif
         or ((case when kdv_haric then u.alis_fiyati else u.alis_fiyati / (1 + coalesce(u.kdv, 20) / 100) end) > coalesce(u.satis_fiyati, 0) / (1 + coalesce(u.kdv, 20) / 100) and coalesce(u.satis_fiyati, 0) > 0))
  order by 7, 2;
end $$;

/** yönetici: seçilen depo için BizimHesap stokundan AÇILIŞ TASLAKLARI oluşturur (300'er satır). Onaylanmaz; yönetici inceleyip onaylar.
    Alınmayanlar: eksi/sıfır stok, hizmet ve türü belirsiz, alış fiyatı sıfır/eksik/satıştan yüksek, pasif, AKCAN'da zaten hareketi olan ürün × depo,
    başka bir açılış taslağında bekleyen ürün × depo. */
create or replace function public.acilis_taslagi_olustur(p_depo uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; kdv_haric boolean := coalesce((select alis_kdv_haric from ayarlar where id = 1), true); r record; b uuid; i int := 0; n int := 0; belgeler_ uuid[] := '{}';
begin
  select * into k from _kim();
  if k.rol <> 'yonetici' then raise exception 'Açılışı yalnız yönetici hazırlar' using errcode = '42501'; end if;
  if not exists (select 1 from depolar where id = p_depo and aktif) then raise exception 'Depo bulunamadı ya da pasif'; end if;
  perform set_config('akcan.motor', 'on', true);
  for r in
    select u.id, s.miktar, round(case when kdv_haric then u.alis_fiyati else u.alis_fiyati / (1 + coalesce(u.kdv, 20) / 100) end, 4) as maliyet
    from urun_depo_stok s join urunler u on u.id = s.urun_id
    where s.depo_id = p_depo and s.miktar > 0 and u.aktif and _stoklu_mu(u.id) = 'stoklu' and coalesce(u.alis_fiyati, 0) > 0
      and not ((case when kdv_haric then u.alis_fiyati else u.alis_fiyati / (1 + coalesce(u.kdv, 20) / 100) end) > coalesce(u.satis_fiyati, 0) / (1 + coalesce(u.kdv, 20) / 100) and coalesce(u.satis_fiyati, 0) > 0)
      and not exists (select 1 from stok_defteri d where d.urun_id = u.id and d.depo_id = p_depo)
      and not exists (select 1 from belge_satirlari x join belgeler y on y.id = x.belge_id where y.tur = 'ACL' and y.durum = 'taslak' and y.depo_id = p_depo and x.urun_id = u.id)
    order by u.ad
  loop
    if i % 300 = 0 then
      insert into belgeler (tur, depo_id, aciklama, istek_anahtari, olusturan, olusturan_id)
      values ('ACL', p_depo, 'BizimHesap stokundan açılış (' || to_char(now() at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI') || ')', gen_random_uuid(), k.eposta, k.uid)
      returning id into b;
      belgeler_ := belgeler_ || b; i := 0;
    end if;
    i := i + 1; n := n + 1;
    insert into belge_satirlari (belge_id, sira, urun_id, miktar, birim_maliyet, notlar) values (b, i, r.id, r.miktar, r.maliyet, 'BizimHesap stoku');
  end loop;
  perform set_config('akcan.motor', '', true);
  return jsonb_build_object('ok', true, 'belge', coalesce(array_length(belgeler_, 1), 0), 'satir', n, 'belgeler', to_jsonb(belgeler_));
end $$;

-- ---------- ekranlar için belge listesi (maliyetsiz; satır sayısı ve toplam miktar) ----------
create or replace view public.belge_listesi as
  select b.id, b.tur, b.no, b.durum, b.tarih, b.depo_id, b.hedef_depo_id, b.aciklama, b.surum, b.olusturan, b.olusturma, b.guncelleyen, b.guncelleme,
         b.onaylayan, b.onay_zaman, b.iptal_eden, b.iptal_zaman, b.iptal_nedeni,
         (select count(*) from public.belge_satirlari s where s.belge_id = b.id)::int as satir,
         (select coalesce(sum(coalesce(s.miktar, s.sayilan)), 0) from public.belge_satirlari s where s.belge_id = b.id) as toplam_miktar
  from public.belgeler b where (select public.benim_rolum()) <> 'yok';

-- ---------- izinler ----------
alter table public.urun_turu enable row level security;
drop policy if exists okuma on public.urun_turu;
create policy okuma on public.urun_turu for select to authenticated using ((select public.benim_rolum()) <> 'yok');
revoke all on public.urun_turu, public.urun_turu_kontrol, public.belge_listesi from public, anon, authenticated, service_role;
grant select on public.urun_turu, public.urun_turu_kontrol, public.belge_listesi to authenticated, service_role;
revoke all on function public.urun_turu_belirle(uuid[], text, text), public.acilis_taslagi_olustur(uuid), public.acilis_istisnalari(uuid),
  public.urun_turu_bul(uuid), public._stoklu_mu(uuid), public._satir_tur_kontrol(), public._defter_tur_kontrol(), public._urun_turu_koru() from public, anon;
grant execute on function public.urun_turu_belirle(uuid[], text, text), public.acilis_taslagi_olustur(uuid), public.acilis_istisnalari(uuid), public.urun_turu_bul(uuid) to authenticated;
revoke all on function public._stoklu_mu(uuid), public._satir_tur_kontrol(), public._defter_tur_kontrol(), public._urun_turu_koru() from authenticated, service_role;
