-- Ürün kartında fotoğraf var mı (BizimHesap ham verisinden): sitede "Görseli yok" filtresi için
alter table public.urunler add column if not exists gorsel_var boolean generated always as (coalesce(bh_ham->>'photo','') not in ('','[]')) stored;
