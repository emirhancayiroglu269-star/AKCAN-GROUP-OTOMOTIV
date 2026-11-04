-- e-Fatura kontrol: kullanıcı eşleşmeyen bir Ödeal faturasını "bilerek girilmedi" (devir, şahsi alım vb.) diye işaretleyebilir
alter table public.odeal_fatura add column if not exists kontrol text check (kontrol in ('tamam','bilerek')), add column if not exists kontrol_not text, add column if not exists kontrol_zaman timestamptz;
create policy odeal_fatura_kontrol on public.odeal_fatura for update to authenticated using (benim_rolum() = 'yonetici') with check (benim_rolum() = 'yonetici');
grant update (kontrol, kontrol_not, kontrol_zaman) on public.odeal_fatura to authenticated;
