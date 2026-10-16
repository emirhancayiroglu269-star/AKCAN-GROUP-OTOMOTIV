-- Kategori Fiyatlama: kategori bazında hedef marj (%)
alter table ayarlar add column if not exists kategori_marj jsonb default '{}'::jsonb;
