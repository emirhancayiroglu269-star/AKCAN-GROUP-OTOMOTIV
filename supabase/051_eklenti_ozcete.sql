-- Özçete (online.ozcete.com.tr) eklentiye eklendi: aynı B2B yazılımı (SystemSoft, /web/b2b/search)
alter table public.tedarikci_maliyet drop constraint if exists tedarikci_maliyet_tedarikci_check;
alter table public.tedarikci_maliyet add constraint tedarikci_maliyet_tedarikci_check check (tedarikci = any (array['otomarmara','neko','iron','basbug','ozas','dinamik','ozcete']));
