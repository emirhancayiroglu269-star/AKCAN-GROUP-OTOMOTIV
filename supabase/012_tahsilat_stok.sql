-- Tahsilat Takip ve Ölü Stok Eritme modülleri: programın kendi notları (BizimHesap'a yazılmaz)
create table if not exists tahsilat_notlari (
  id uuid primary key default gen_random_uuid(),
  cari text not null,
  cari_guid text,
  tur text not null default 'not',          -- not | arama | mesaj | soz
  metin text,
  soz_tarih date,
  soz_tutar numeric(14,2),
  durum text,                                -- soz için: acik | tutuldu | tutulmadi
  kullanici text,
  olusturma timestamptz not null default now()
);
create index if not exists tahsilat_notlari_cari_idx on tahsilat_notlari (cari);

create table if not exists stok_aksiyon (
  id uuid primary key default gen_random_uuid(),
  urun_id uuid not null references urunler(id) on delete cascade,
  aksiyon text not null,                     -- iade | kampanya | toplu | beklet
  fiyat numeric(14,2),
  tedarikci text,
  durum text not null default 'planlandi',   -- planlandi | yapildi | vazgecildi
  notlar text,
  baslangic_stok numeric(14,3),
  baslangic_deger numeric(14,2),
  kullanici text,
  olusturma timestamptz not null default now(),
  guncelleme timestamptz
);
create index if not exists stok_aksiyon_urun_idx on stok_aksiyon (urun_id);

alter table ayarlar add column if not exists tahsilat_hedef numeric default 0;
alter table ayarlar add column if not exists stok_eritme_hedef numeric default 0;

alter table tahsilat_notlari enable row level security;
alter table stok_aksiyon enable row level security;
drop policy if exists giris_yapan_tam_yetki on tahsilat_notlari;
create policy giris_yapan_tam_yetki on tahsilat_notlari for all to authenticated using (true) with check (true);
drop policy if exists giris_yapan_tam_yetki on stok_aksiyon;
create policy giris_yapan_tam_yetki on stok_aksiyon for all to authenticated using (true) with check (true);
