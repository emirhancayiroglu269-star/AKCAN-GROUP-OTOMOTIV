-- Takım çarpanı tek sefer uygulanır (2 Kasım 2026: upsert'te tetikleyici iki kez çalışıp Başbuğ disklerini 4 kat yazdı).
--  INSERT: fiyat ham kalır (birim_fiyat = fiyat); ekleme gerçekten olursa AFTER INSERT tetikleyicisi fiyatı çarpar.
--  Upsert çakışmasında ekleme olmaz; güncelleme yoluna ham fiyat (EXCLUDED) gelir ve BEFORE UPDATE bir kez çarpar.
--  AFTER INSERT'in kendi güncellemesi (pg_trigger_depth > 1) tekrar çarpılmaz.
create or replace function public.tedarikci_maliyet_carpan()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare c numeric; u record;
begin
  if NEW.fiyat is null then NEW.birim_fiyat := null; return NEW; end if;
  if TG_OP = 'UPDATE' and pg_trigger_depth() > 1 then return NEW; end if;
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
  if TG_OP = 'UPDATE' and c is not null and c <> 1 then NEW.fiyat := round(NEW.fiyat * c, 2); end if;
  return NEW;
end $function$;

create or replace function public.tedarikci_maliyet_carpan_ekle()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare c numeric;
begin
  if NEW.birim_fiyat is null then return null; end if;
  select carpan into c from tedarikci_carpan where urun_id = NEW.urun_id and tedarikci = NEW.tedarikci;
  if c is not null and c <> 1 then
    update tedarikci_maliyet set fiyat = round(NEW.birim_fiyat * c, 2) where urun_id = NEW.urun_id and tedarikci = NEW.tedarikci;
  end if;
  return null;
end $function$;
create trigger tedarikci_maliyet_carpan_ekle_tg after insert on public.tedarikci_maliyet for each row execute function public.tedarikci_maliyet_carpan_ekle();
