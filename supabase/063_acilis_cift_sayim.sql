-- =====================================================================
-- 063 · FAZ 1 — Açılış onayında çift sayım engeli (YALNIZ akcan-test; canlıya ayrıca onayla)
-- belge_onayla'nın yeni hali: ACL (açılış) fişinde, satırdaki ürünün aynı depoda daha önce AKCAN stok hareketi
-- varsa onay reddedilir. Mevcut onaylı fişlere, stok defterine ve taslaklara dokunmaz; yalnız fonksiyonu değiştirir.
-- Geri alma: supabase/yedek/063_geri_al.sql (061'deki önceki fonksiyona döner).
-- =====================================================================
create or replace function public.belge_onayla(p_id uuid, p_surum int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; b belgeler; s record; n int; v_no text; urunler_ uuid[]; ciftler jsonb; v_sis numeric; v_fark numeric; a numeric; say int := 0; v_h bigint; v_cakisan int; v_ornek text;
begin
  select * into k from _kim();
  if k.rol <> 'yonetici' then raise exception 'Belgeyi yalnız yönetici onaylayabilir' using errcode = '42501'; end if;
  perform set_config('akcan.motor', 'on', true);

  select * into b from belgeler where id = p_id for update;          -- aynı belgeye ikinci onay burada bekler
  if not found then raise exception 'Belge bulunamadı'; end if;
  if b.durum = 'onayli' then perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'zaten', true, 'no', b.no); end if;
  if b.durum = 'iptal' then raise exception 'İptal edilmiş belge onaylanamaz (%)', b.no; end if;
  if p_surum is distinct from b.surum then raise exception 'Belge siz açtıktan sonra değiştirildi; son halini görüp yeniden onaylayın' using errcode = '40001'; end if;
  if not exists (select 1 from belge_satirlari where belge_id = b.id) then raise exception 'Satırı olmayan belge onaylanamaz'; end if;
  if not exists (select 1 from depolar where id = b.depo_id and aktif) or (b.hedef_depo_id is not null and not exists (select 1 from depolar where id = b.hedef_depo_id and aktif)) then
    raise exception 'Belgedeki depo pasif'; end if;

  -- numara: tür + yıl sayacı (satır kilidi; iki onay aynı numarayı alamaz)
  insert into belge_sayac as x (tur, yil, son_no) values (b.tur, extract(year from b.tarih)::int, 1)
    on conflict (tur, yil) do update set son_no = x.son_no + 1 returning son_no into n;
  v_no := b.tur || '-' || extract(year from b.tarih)::int || '-' || lpad(n::text, 6, '0');
  b.no := v_no;   -- defter satırları numarayı taşır; belge başlığı satırlar işlendikten sonra onaylı yapılır

  -- kilitler: ürün maliyetleri ve depo bakiyeleri, sabit sırayla
  select array_agg(distinct urun_id order by urun_id) into urunler_ from belge_satirlari where belge_id = b.id;
  select jsonb_agg(jsonb_build_object('u', u, 'd', d)) into ciftler from (
    select urun_id u, b.depo_id d from belge_satirlari where belge_id = b.id
    union select urun_id, b.hedef_depo_id from belge_satirlari where belge_id = b.id and b.hedef_depo_id is not null) x;
  perform _kilitle(urunler_, ciftler);

  -- açılış: ürün × depoda daha önce AKCAN stok hareketi varsa reddedilir (çift sayım olmasın).
  -- Kontrol, bakiye satırları kilitlendikten SONRA yapılır: aynı ürün × depoya eşzamanlı yazan her işlem aynı kilidi bekler,
  -- kilit alındığında önceki işlemin hareketi görünür. Hata olursa işlemin tamamı geri alınır (hareket yok, numara harcanmaz).
  if b.tur = 'ACL' then
    select count(*), min(u.ad || ' · ' || d.ad || ' (ilk hareket ' || x.belge_no || ')')
      into v_cakisan, v_ornek
      from belge_satirlari bs
      join lateral (select h.belge_no from stok_defteri h where h.urun_id = bs.urun_id and h.depo_id = b.depo_id order by h.id limit 1) x on true
      join urunler u on u.id = bs.urun_id join depolar d on d.id = b.depo_id
     where bs.belge_id = b.id;
    if v_cakisan > 0 then
      raise exception 'Açılış reddedildi: % satırdaki ürünün bu depoda zaten AKCAN stok hareketi var (çift sayım olur). Örnek: %', v_cakisan, v_ornek
        using errcode = '23514';
    end if;
  end if;

  for s in select * from belge_satirlari where belge_id = b.id order by urun_id loop
    if b.tur in ('GIR', 'ACL') then
      perform _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, s.miktar, s.birim_maliyet, 'giris', null, k.eposta, k.uid); say := say + 1;
    elsif b.tur = 'CIK' then
      perform _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, -s.miktar, null, 'yok', null, k.eposta, k.uid); say := say + 1;
    elsif b.tur = 'TRF' then                                   -- kaynaktan düşüş ve hedefe giriş aynı işlemde, aynı tutarla
      v_h := _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, -s.miktar, null, 'yok', null, k.eposta, k.uid);
      perform _hareket(b, 'onay', s.id, s.urun_id, b.hedef_depo_id, s.miktar, null, 'yok', null, k.eposta, k.uid,
                       -(select tutar from stok_defteri where id = v_h)); say := say + 2;
    elsif b.tur = 'SAY' then                                   -- sistem miktarı onay anındaki AKCAN bakiyesi
      select miktar into v_sis from stok_bakiye where urun_id = s.urun_id and depo_id = b.depo_id;
      v_fark := s.sayilan - v_sis;
      update belge_satirlari set sistem = v_sis, fark = v_fark where id = s.id;
      if v_fark > 0 then
        select ort_maliyet into a from urun_maliyet where urun_id = s.urun_id;
        if (select toplam_miktar from urun_maliyet where urun_id = s.urun_id) <= 0 and s.birim_maliyet is null then
          raise exception 'Sayım fazlası: % için ortalama maliyet yok; satıra birim maliyet girilmeli (yönetici)', (select ad from urunler where id = s.urun_id);
        end if;
        perform _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, v_fark,
                         case when (select toplam_miktar from urun_maliyet where urun_id = s.urun_id) > 0 then a else s.birim_maliyet end,
                         'giris', null, k.eposta, k.uid); say := say + 1;
      elsif v_fark < 0 then
        perform _hareket(b, 'onay', s.id, s.urun_id, b.depo_id, v_fark, null, 'yok', null, k.eposta, k.uid); say := say + 1;
      end if;
    end if;
  end loop;
  update belgeler set durum = 'onayli', no = v_no, yil = extract(year from b.tarih)::int, sira_no = n, surum = surum + 1,
                      onaylayan = k.eposta, onaylayan_id = k.uid, onay_zaman = now()
    where id = b.id returning * into b;
  perform set_config('akcan.motor', '', true); return jsonb_build_object('ok', true, 'no', b.no, 'hareket', say);
end $$;

revoke all on function public.belge_onayla(uuid, int) from public, anon;
grant execute on function public.belge_onayla(uuid, int) to authenticated;
