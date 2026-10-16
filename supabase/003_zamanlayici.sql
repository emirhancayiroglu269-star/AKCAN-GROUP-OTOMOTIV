-- =====================================================================
-- 003 — BizimHesap eşitlemesini her 3 dakikada bir otomatik çalıştır
-- Edge Function "bizimhesap-esitle" yayınlandıktan SONRA çalıştırılır.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin
  perform cron.unschedule('bizimhesap-esitle');
exception when others then null; end $$;

select cron.schedule(
  'bizimhesap-esitle',
  '*/3 * * * *',
  $cron$
  select net.http_post(
    url := 'https://qmafuyuocmcobrstnmbx.supabase.co/functions/v1/bizimhesap-esitle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtYWZ1eXVvY21jb2Jyc3RubWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjQyNDAsImV4cCI6MjEwNzQwMDI0MH0.jGOhkZ05ZhQUs-ruhnFoRNFnHwSHgsF4EEG_MXkPLTA'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);
