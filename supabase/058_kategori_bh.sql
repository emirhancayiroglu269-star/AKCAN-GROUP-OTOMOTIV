-- Kategori fiyatlama: "BizimHesap listesine ekle" seçilen kategoriler. Eklentinin "zararına / hedef altı satış fiyatı" listesine
-- bu kategorilerin, kategori hedef marjına göre fiyatı düşük kalan ürünleri de eklenir (kullanıcı yine eklentide onaylayarak yükler).
alter table public.ayarlar add column if not exists kategori_bh jsonb not null default '[]'::jsonb;
-- ilk deneme kategorisi (kullanıcıyla kararlaştırıldı): madeni yağ
update public.ayarlar set kategori_bh = '["MADENİ YAĞ"]'::jsonb where id = 1 and kategori_bh = '[]'::jsonb;
