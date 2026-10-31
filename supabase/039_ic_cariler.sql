-- Firmanın kendi araç / iç hesap carileri (ör. "L200": tamir edilip satılacak kendi aracımız): tahsilat listesine ve vadesi geçen alacak toplamına girmez.
alter table public.ayarlar add column if not exists ic_cariler jsonb not null default '[]'::jsonb;
update public.ayarlar set ic_cariler = '["L200"]'::jsonb where id = 1;
