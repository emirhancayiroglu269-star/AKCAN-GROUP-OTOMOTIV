-- Site internete açılmadan önce: veriyi yalnız kullanıcı listesindeki aktif hesaplar okuyabilsin.
-- (Önceden giriş yapan herkes okuyabiliyordu; sitede "kayıt ol" ile yabancı biri hesap açabilirdi.)
insert into kullanicilar (eposta, ad, rol, aktif)
select 'emirhancayiroglu269@gmail.com', 'Emirhan', 'yonetici', true
where not exists (select 1 from kullanicilar where lower(eposta) = 'emirhancayiroglu269@gmail.com');

do $$ declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and policyname in ('giris_yapan_tam_yetki', 'giris_yapan_okur') loop
    if r.policyname = 'giris_yapan_okur' then
      execute format('alter policy %I on %I.%I using (benim_rolum() <> ''yok'')', r.policyname, r.schemaname, r.tablename);
    else
      execute format('alter policy %I on %I.%I using (benim_rolum() <> ''yok'') with check (benim_rolum() <> ''yok'')', r.policyname, r.schemaname, r.tablename);
    end if;
  end loop;
end $$;

alter policy "kullanici_oku" on kullanicilar using (benim_rolum() <> 'yok' or lower(eposta) = lower(auth.jwt() ->> 'email'));

-- Dakikalık eşitleme: çakışma kilidi ve değişiklik algılama (site yalnız veri değişince yeniden yükler)
alter table bh_durum add column if not exists kilit timestamptz, add column if not exists parmak_izi text, add column if not exists son_degisim timestamptz;
select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'bizimhesap-esitle'), schedule := '* * * * *');

-- 17 Ekim: yük sorunu sonrası — parça izleri, eşitleme 2 dakikada bir, canlı bildirim yalnız kullanıcı tablolarında
alter table bh_durum add column if not exists parca_izleri jsonb;
select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'bizimhesap-esitle'), schedule := '*/2 * * * *');
alter publication supabase_realtime set table public.ayarlar, public.kullanicilar, public.urun_kodlari, public.tahsilat_notlari, public.stok_aksiyon;
