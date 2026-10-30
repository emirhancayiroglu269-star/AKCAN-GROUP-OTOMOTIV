-- rakip_ozet_yenile: "delete from rakip_ozet" yerine "truncate rakip_ozet" (her 30 dk silip yazmak tabloyu şişiriyordu; 44 MB -> 24 MB)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.rakip_ozet_yenile'::regproc);
  d := replace(d, '  delete from rakip_ozet;', '  truncate rakip_ozet;');
  execute d;
end $$;
