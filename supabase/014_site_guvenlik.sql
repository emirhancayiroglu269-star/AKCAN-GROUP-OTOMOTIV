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
