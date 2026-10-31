-- Başbuğ B2B (Iron ile aynı B2B yazılımı): tarayıcı eklentisi Başbuğ aramalarını da kaydeder.
alter table public.tedarikci_maliyet drop constraint if exists tedarikci_maliyet_tedarikci_check;
alter table public.tedarikci_maliyet add constraint tedarikci_maliyet_tedarikci_check check (tedarikci in ('otomarmara','neko','iron','basbug'));
