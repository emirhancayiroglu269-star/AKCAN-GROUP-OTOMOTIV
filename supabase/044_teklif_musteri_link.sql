-- Teklifin müşteri linki: müşteri giriş yapmadan teklifi görür, onaylar / reddeder / revizyon ister.
-- Link okuma ve yanıt yalnız teklif-musteri edge function'ı (service role) üzerinden; anon'a tablo izni verilmez.
alter table public.fiyat_teklifleri
  add column if not exists kod text,
  add column if not exists gecerlilik date,
  add column if not exists musteri_yanit text check (musteri_yanit in ('onay','red','revizyon')),
  add column if not exists musteri_not text,
  add column if not exists yanit_zaman timestamptz,
  add column if not exists goruntulenme int not null default 0,
  add column if not exists ilk_goruntu timestamptz,
  add column if not exists son_goruntu timestamptz;
create unique index if not exists fiyat_teklifleri_kod_uq on public.fiyat_teklifleri (kod) where kod is not null;
