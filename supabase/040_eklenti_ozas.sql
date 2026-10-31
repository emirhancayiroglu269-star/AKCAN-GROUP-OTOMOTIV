-- Özaş B2B (Iron/Başbuğ ile aynı SystemSoft B2B yazılımı): tarayıcı eklentisi Özaş aramalarını da kaydeder.
alter table public.tedarikci_maliyet drop constraint if exists tedarikci_maliyet_tedarikci_check;
alter table public.tedarikci_maliyet add constraint tedarikci_maliyet_tedarikci_check check (tedarikci in ('otomarmara','neko','iron','basbug','ozas'));
