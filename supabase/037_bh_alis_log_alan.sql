-- bh_alis_log: değiştirilen fiyat sütunu (alis = kart alış fiyatı, satis = satış fiyatı)
alter table public.bh_alis_log add column if not exists alan text not null default 'alis' check (alan in ('alis','satis'));
