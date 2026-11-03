-- Oto İsmail (b2b.otoismail.com.tr) eklentiye eklendi: arama yanıtı HTML satırlar (/Arama/UrunArama)
alter table public.tedarikci_maliyet drop constraint if exists tedarikci_maliyet_tedarikci_check;
alter table public.tedarikci_maliyet add constraint tedarikci_maliyet_tedarikci_check check (tedarikci = any (array['otomarmara','neko','iron','basbug','ozas','dinamik','ozcete','martas','otoismail']));
