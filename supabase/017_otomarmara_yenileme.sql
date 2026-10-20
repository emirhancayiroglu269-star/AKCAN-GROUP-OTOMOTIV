-- Otomarmara canlı veri: stoktaki ürünler 12 saatte bir yeniden sorgulanır (2026-10-20)
-- om_yenile: 12 saati geçen stoklu ürünleri sıraya alır · om_kuyruk_besle: önce hiç sorulmamışlar, kalan yer yenilemeye
-- om_sonuc_yaz: yenilemede geçici hata önceki OEM/eşdeğer bilgisini silmez
-- cron: otomarmara-muadil her dakika (tur ~50 sn), otomarmara-toplu-kuyruk 5 dakikada bir om_kuyruk_besle()

create or replace function public.om_yenile(p_saat integer default 12, p_adet integer default 60)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  update otomarmara_veri v set durum = 'istendi', istendi = now(), oncelik = 0, deneme = 0
  where v.urun_id in (
    select v2.urun_id from otomarmara_veri v2 join urunler u on u.id = v2.urun_id
    where v2.durum in ('tamam','bulunamadi','hata')
      and coalesce(v2.guncelleme, v2.istendi) < now() - make_interval(hours => p_saat)
      and u.aktif and u.stok > 0 and u.kategori is not null and coalesce(u.kod,'') ~ '[0-9]{3,}'
      and lower(u.ad) !~ '(işçilik|iscilik|hizmet|revizyon|montaj|tamir|torna|kaporta|ücret|rektefiye|değişim|degisim|araç alım|arac alim|araç satı|arac sati)'
    order by coalesce(v2.guncelleme, v2.istendi) limit p_adet);
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.om_kuyruk_besle()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare bekleyen int; yeni int := 0; yen int := 0;
begin
  select count(*) into bekleyen from otomarmara_veri where durum = 'istendi' and oncelik = 0;
  if bekleyen >= 40 then return 0; end if;
  yeni := om_gece_kuyruk(60);
  if yeni < 60 then yen := om_yenile(12, 60 - yeni); end if;
  return yeni + yen;
end $$;

create or replace function public.om_sonuc_yaz(p jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_urun uuid := (p->>'urun_id')::uuid; v_durum text := coalesce(p->>'durum','tamam');
begin
  if v_durum not in ('tamam','bulunamadi','hata') then raise exception 'Geçersiz durum'; end if;
  if v_durum = 'hata' and exists (select 1 from otomarmara_veri where urun_id = v_urun and (cardinality(oemler) > 0 or jsonb_array_length(coalesce(esdegerler,'[]'::jsonb)) > 0)) then
    update otomarmara_veri set durum = 'tamam', guncelleme = now(), deneme = 0, hata = left('Son yenileme başarısız, önceki bilgi gösteriliyor: ' || coalesce(p->>'hata',''), 500) where urun_id = v_urun;
    return;
  end if;
  update otomarmara_veri set durum = v_durum, guncelleme = now(), deneme = 0,
    om_kod = left(nullif(p->>'om_kod',''), 100), om_ad = left(nullif(p->>'om_ad',''), 300),
    oemler = coalesce((select array_agg(distinct trim(x)) from jsonb_array_elements_text(coalesce(p->'oemler','[]'::jsonb)) x where length(trim(x)) between 3 and 40), '{}'),
    esdegerler = coalesce((select jsonb_agg(e) from jsonb_array_elements(coalesce(p->'esdegerler','[]'::jsonb)) e where length(coalesce(e->>'kod','')) between 2 and 60), '[]'::jsonb), hata = left(nullif(p->>'hata',''), 500)
  where urun_id = v_urun;
  if v_durum = 'tamam' then
    delete from urun_kodlari where urun_id = v_urun and tur = 'OTOMARMARA';
    insert into urun_kodlari (urun_id, kod, tur)
    select distinct on (upper(regexp_replace(x, '[^A-Za-z0-9]', '', 'g'))) v_urun, x, 'OTOMARMARA'
    from (select trim(x) x from jsonb_array_elements_text(coalesce(p->'oemler','[]'::jsonb)) x where length(trim(x)) between 3 and 40) s
    on conflict (urun_id, kod_norm) do nothing;
  end if;
end $$;

select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'otomarmara-muadil'), schedule := '* * * * *');
select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'otomarmara-toplu-kuyruk'), schedule := '*/5 * * * *', command := 'select public.om_kuyruk_besle();');
