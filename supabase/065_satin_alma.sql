-- =====================================================================
-- 065 · FAZ 2 · F2.1 Aşama A — Tedarikçi kartı (YALNIZ akcan-test; canlıya ayrıca yazılı onayla)
-- Faz 1 tablolarına, fonksiyonlarına ve sayaçlarına dokunmaz: mevcut tablolara yabancı anahtar (FK) da kurulmaz,
-- çünkü FK başvurulan tabloya iç tetikleyici ekler. Bağlar fonksiyonlarda doğrulanır.
-- Kaynak: 'bh' (BizimHesap carisi), 'deneme' (yapay; kimlik DENEME- ile başlar), 'elle' (yönetici).
-- Geri alma: supabase/yedek/065_geri_al.sql (önce 067, sonra 066 geri alınmalı).
-- =====================================================================

create table if not exists public.tedarikciler (
  id uuid primary key default gen_random_uuid(),
  kaynak text not null check (kaynak in ('bh', 'deneme', 'elle')),
  bh_cari_id text,                                   -- BizimHesap cari kimliği; deneme kaynağında DENEME-…
  unvan text not null check (length(trim(unvan)) > 0),
  vergi_no text, telefon text,
  vade_gun int check (vade_gun >= 0),
  portal_adi text,                                   -- B2B portal adı (tedarikci_maliyet.tedarikci ile eşleşir)
  aktif boolean not null default true,
  olusturma timestamptz not null default now(),
  olusturan text,
  -- yapay ve gerçek kayıt kesin ayrılır: deneme ⇔ kimlik DENEME- ile başlar; deneme unvanı "DENEME " ile başlar
  constraint tedarikci_deneme_onek check ((kaynak = 'deneme') = (coalesce(bh_cari_id, '') like 'DENEME-%')),
  constraint tedarikci_deneme_unvan check (kaynak <> 'deneme' or unvan like 'DENEME %'),
  constraint tedarikci_bh_kimlik check (kaynak <> 'bh' or bh_cari_id is not null)
);
create unique index if not exists tedarikciler_kaynak_cari on public.tedarikciler (kaynak, bh_cari_id) where bh_cari_id is not null;

alter table public.tedarikciler enable row level security;
drop policy if exists tedarikciler_yonetici on public.tedarikciler;
create policy tedarikciler_yonetici on public.tedarikciler for select to authenticated using (public.benim_rolum() = 'yonetici');
revoke all on public.tedarikciler from anon, authenticated;
grant select on public.tedarikciler to authenticated;               -- satır güvenliği: yalnız yönetici görür
grant select, insert, update, delete on public.tedarikciler to service_role;

-- kasiyer / teknisyen için fiyatsız kısa liste (yalnız unvan ve telefon); maliyet, portal, vergi bilgisi yok
create or replace view public.tedarikci_kisa as
  select t.id, t.unvan, t.telefon, t.aktif from public.tedarikciler t
   where public.benim_rolum() in ('yonetici', 'kasiyer', 'teknisyen');
revoke all on public.tedarikci_kisa from anon, authenticated;
grant select on public.tedarikci_kisa to authenticated;

drop trigger if exists denetim_tg on public.tedarikciler;
create trigger denetim_tg after insert or update or delete on public.tedarikciler for each row execute function public.denetim_tg();
