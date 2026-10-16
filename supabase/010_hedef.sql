-- Ay sonu tahmini: aylık satış hedefi (KDV dahil)
alter table ayarlar add column if not exists hedef_ciro numeric default 0;
