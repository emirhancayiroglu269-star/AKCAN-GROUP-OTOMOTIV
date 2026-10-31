-- Tedarikçi birim çarpanı (tedarikçi bazında): tedarikçiler fren diskini çoğunlukla ADET fiyatıyla listeler, bizde kart TAKIM (2 adet) fiyatıyla.
-- tedarikci_maliyet.birim_fiyat = tedarikçinin ham fiyatı; fiyat = birim_fiyat × çarpan (tetikleyici uygular, eklenti ve gece işi ham fiyat yazar).
-- Yeni gelen fren diskleri: tedarikçi fiyatının 2 katı kart alışının %70–140'ı arasındaysa çarpan 2 kendiliğinden eklenir. Adında "ADET" geçen kartlar hariç.
create table if not exists public.tedarikci_carpan (
  urun_id uuid not null references public.urunler(id) on delete cascade,
  tedarikci text not null,
  carpan numeric not null check (carpan > 0 and carpan <= 20),
  neden text, olusturma timestamptz not null default now(),
  primary key (urun_id, tedarikci)
);
alter table public.tedarikci_carpan enable row level security;
create policy tedarikci_carpan_okuma on public.tedarikci_carpan for select to authenticated using (benim_rolum() <> 'yok');
create policy tedarikci_carpan_yaz on public.tedarikci_carpan for all to authenticated using (benim_rolum() = 'yonetici') with check (benim_rolum() = 'yonetici');
grant select, insert, update, delete on public.tedarikci_carpan to authenticated;
grant select, insert, update, delete on public.tedarikci_carpan to service_role;
alter table public.tedarikci_maliyet add column if not exists birim_fiyat numeric;

create or replace function public.fren_diski_mi(ad text) returns boolean language sql immutable as $$
  select upper(coalesce(ad,'')) ~ '(FREN D[İI]SK|D[İI]SK AYNA|FREN AYNA|^D[İI]SK (ON|ÖN|ARKA))' and upper(coalesce(ad,'')) !~ '(BALATA|DEBR[İI]YAJ|BASKI|KAMPANA|ADET)'
$$;

create or replace function public.tedarikci_maliyet_carpan() returns trigger language plpgsql security definer set search_path = public as $$
declare c numeric; u record;
begin
  if NEW.fiyat is null then NEW.birim_fiyat := null; return NEW; end if;
  if TG_OP = 'UPDATE' and NEW.fiyat is not distinct from OLD.fiyat then return NEW; end if;
  NEW.birim_fiyat := NEW.fiyat;
  select carpan into c from tedarikci_carpan where urun_id = NEW.urun_id and tedarikci = NEW.tedarikci;
  if c is null then
    select ad, alis_fiyati into u from urunler where id = NEW.urun_id;
    if u.alis_fiyati > 0 and fren_diski_mi(u.ad) and NEW.fiyat * 2 between u.alis_fiyati * 0.7 and u.alis_fiyati * 1.4 then
      insert into tedarikci_carpan (urun_id, tedarikci, carpan, neden) values (NEW.urun_id, NEW.tedarikci, 2, 'Fren diski: tedarikçi adet, kart takım (otomatik)') on conflict do nothing;
      c := 2;
    end if;
  end if;
  if c is not null and c <> 1 then NEW.fiyat := round(NEW.fiyat * c, 2); end if;
  return NEW;
end $$;
drop trigger if exists tedarikci_maliyet_carpan_tg on public.tedarikci_maliyet;
create trigger tedarikci_maliyet_carpan_tg before insert or update on public.tedarikci_maliyet for each row execute function public.tedarikci_maliyet_carpan();
