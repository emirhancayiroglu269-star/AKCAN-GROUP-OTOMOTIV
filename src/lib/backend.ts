import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Ayarlar, BhDurum, Cari, CrudTable, DB, Hareket, HesapBakiye, ID, KasaAkisi, Masraf, Urun, VadesiGecen } from './types';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './baglanti';

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL;
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null;
export const MODE: 'bulut' | 'demo' = supabase ? 'bulut' : 'demo';

export interface EsitlemeSonucu { ok: boolean; hata?: string; urun?: number; depo?: number; degisen?: number; stokSatiri?: number; cari?: number }

export interface Backend {
  load(): Promise<DB>;
  insert<T extends object>(t: CrudTable, row: T): Promise<void>;
  update<T extends object>(t: CrudTable, id: ID | number, patch: Partial<T>): Promise<void>;
  remove(t: CrudTable, id: ID): Promise<void>;
  ayarKaydet(a: Partial<Ayarlar>): Promise<void>;
  bhEsitle(): Promise<EsitlemeSonucu>;
  urunKodlariYukle(satirlar: { anahtar: string; kodlar: string[]; tur: string }[]): Promise<{ eklenen: number; bulunamayan: number }>;
  subscribe(onChange: () => void): () => void;
  /** Hafif kontrol: verinin değişip değişmediğini anlamak için tek satır okur */
  durum(): Promise<{ son_esitleme?: string | null; imza: string } | null>;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const NUMS: Record<string, string[]> = {
  urunler: ['alis_fiyati', 'satis_fiyati', 'kdv', 'stok', 'kritik_stok'],
  urun_depo_stok: ['miktar'],
  hareketler: ['miktar', 'onceki', 'sonraki', 'satis_fiyati', 'alis_fiyati', 'kdv'],
  rapor_satirlari: ['miktar', 'alis_fiyati', 'tutar', 'indirim', 'net', 'kdv', 'toplam', 'birim_fiyat', 'kdv_orani'],
  masraflar: ['tutar'], kasa_akisi: ['giris', 'cikis'], hesap_bakiyeleri: ['bakiye'], vadesi_gecen: ['tutar'],
  fiyat_gecmisi: ['alis_eski', 'alis_yeni', 'satis_eski', 'satis_yeni'],
  tahsilat_notlari: ['soz_tutar'], stok_aksiyon: ['fiyat', 'baslangic_stok', 'baslangic_deger'],
  cariler: ['bakiye', 'cek_senet'], cari_hareketler: ['onceki', 'sonraki', 'fark'],
};
function norm<T>(t: string, rows: T[]): T[] {
  const f = NUMS[t] || [];
  return rows.map((r) => { const o = { ...(r as Record<string, unknown>) }; f.forEach((k) => (o[k] = num(o[k]))); if (t === 'urunler' && o.bh_stok != null) o.bh_stok = Number(o.bh_stok); return o as T; });
}

interface RaporSatiri { id: number; tarih: string; tur: 'satis' | 'alis'; urun_id: ID | null; urun_ad: string | null; miktar: number; alis_fiyati: number; net: number; kdv: number; toplam: number; tutar?: number | null; indirim?: number | null;
  kdv_orani?: number | null; belge_guid?: string | null; cari_guid?: string | null; cari_ad?: string | null; kullanici?: string | null; depo?: string | null; saat?: string | null }

/** Rapor (gerçek fatura) satırlarını harekete çevirir; rapor olan günlerde stok tahminini kullanmaz */
function hareketleriBirlestir(stok: Hareket[], rapor: RaporSatiri[], d: BhDurum | null, urunler: Urun[], masraf: Masraf[] = []): Hareket[] {
  const son = d?.rapor_son ?? null;
  const fiyat = new Map(urunler.map((u) => [u.id, u]));
  const yerelGun = (s: string) => new Date(s).toLocaleDateString('sv');
  const r: Hareket[] = rapor.filter((x) => x.miktar > 0).map((x) => {
    const kdvOran = x.kdv_orani != null ? Number(x.kdv_orani) : x.net > 0 && x.kdv > 0 ? Math.round((x.kdv / x.net) * 100) : (x.urun_id ? fiyat.get(x.urun_id)?.kdv ?? 20 : 20);
    return {
      id: -x.id, tarih: `${x.tarih}T${x.saat ? String(x.saat).slice(0, 5) : '12:00'}:00`,
      belge_guid: x.belge_guid, cari_guid: x.cari_guid, cari_ad: x.cari_ad, kullanici: x.kullanici, depo: x.depo, saat: x.saat ? String(x.saat).slice(0, 5) : null, urun_id: x.urun_id ?? `yok:${x.urun_ad}`, tur: x.tur, miktar: x.miktar,
      satis_fiyati: x.tur === 'satis' ? x.toplam / x.miktar : (x.urun_id ? fiyat.get(x.urun_id)?.satis_fiyati ?? 0 : 0),
      alis_fiyati: x.tur === 'satis' ? x.alis_fiyati || 0 : x.net / x.miktar,
      kdv: kdvOran, yok_say: false, kaynak: 'fatura', urun_ad: x.urun_ad, brut: x.tutar ?? undefined, indirim: x.indirim ?? undefined,
      cift_kayit: x.tur === 'alis' && !x.urun_id && masraf.some((m) => Math.abs(m.tutar - x.toplam) < 1 && Math.abs(new Date(m.tarih).getTime() - new Date(x.tarih).getTime()) <= 5 * 864e5),
    };
  });
  const s = stok.filter((h) => !son || yerelGun(h.tarih) > son).map((h) => ({ ...h, kaynak: 'stok' as const }));
  return [...s, ...r].sort((a, b) => b.tarih.localeCompare(a.tarih));
}

// ======================= SUPABASE =======================
function supabaseBackend(sb: SupabaseClient): Backend {
  const ok = <T,>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };

  /** Supabase sorgu başına en fazla 1000 satır döndürür; tamamını sayfa sayfa çeker. */
  async function hepsi(t: string, order: string, asc = false, sinir = 50000, filtre?: [string, boolean]) {
    const sayfa = 1000; const sonuc: unknown[] = [];
    for (let i = 0; i < sinir; i += sayfa) {
      let q = sb.from(t).select('*');
      if (filtre) q = q.eq(filtre[0], filtre[1]);
      const d = ok(await q.order(order, { ascending: asc }).range(i, i + sayfa - 1)) as unknown[];
      sonuc.push(...d);
      if (d.length < sayfa) break;
    }
    return norm(t, sonuc);
  }

  return {
    async load() {
      const [u, dp, uds, bd, h, fg, c, ch, a, ku, uk, rs, ms, ka, hb, vg, tn, sa] = await Promise.all([
        hepsi('urunler', 'olusturma'), hepsi('depolar', 'olusturma', true), hepsi('urun_depo_stok', 'urun_id', true, 200000),
        sb.from('bh_durum').select('id,son_esitleme,son_hata,urun_sayisi,depo_sayisi,cari_sayisi,takip_baslangic,rapor_ilk,rapor_son,rapor_yukleme,masraf_son').eq('id', 1).maybeSingle(),
        hepsi('hareketler', 'tarih', false, 200000), hepsi('fiyat_gecmisi', 'tarih', false, 50000),
        hepsi('cariler', 'ad', true), hepsi('cari_hareketler', 'tarih', false, 50000),
        sb.from('ayarlar').select('*').eq('id', 1).maybeSingle(), hepsi('kullanicilar', 'olusturma', true), hepsi('urun_kodlari', 'olusturma', true, 200000),
        hepsi('rapor_satirlari', 'tarih', false, 300000, ['gecersiz', false]), hepsi('masraflar', 'tarih', false, 100000, ['gecersiz', false]),
        hepsi('kasa_akisi', 'tarih', false, 200000, ['gecersiz', false]), hepsi('hesap_bakiyeleri', 'ad', true), hepsi('vadesi_gecen', 'tutar', false, 10000, ['gecersiz', false]),
        hepsi('tahsilat_notlari', 'olusturma', false, 50000), hepsi('stok_aksiyon', 'olusturma', false, 50000),
      ]);
      const durum = (ok(bd) as BhDurum | null) ?? null;
      return {
        urunler: u, depolar: dp, urun_depo_stok: uds, bh_durum: durum, hareketler: hareketleriBirlestir(h as Hareket[], rs as RaporSatiri[], durum, u as Urun[], ms as Masraf[]), masraflar: ms,
        kasa_akisi: ka as KasaAkisi[], hesap_bakiyeleri: hb as HesapBakiye[], vadesi_gecen: vg as VadesiGecen[], fiyat_gecmisi: fg, cariler: c, cari_hareketler: ch,
        ayarlar: (ok(a) as Ayarlar) ?? { id: 1, firma_adi: 'İşletmem' }, kullanicilar: ku, urun_kodlari: uk, tahsilat_notlari: tn, stok_aksiyon: sa,
      } as DB;
    },
    async insert(t, row) { ok(await sb.from(t).insert(row)); },
    async update(t, id, patch) { ok(await sb.from(t).update(patch as never).eq('id', id)); },
    async remove(t, id) { ok(await sb.from(t).delete().eq('id', id)); },
    async ayarKaydet(a) { ok(await sb.from('ayarlar').upsert({ ...a, id: 1 })); },
    async urunKodlariYukle(satirlar) { return ok(await sb.rpc('urun_kodlari_yukle', { p: satirlar })) as { eklenen: number; bulunamayan: number }; },
    async bhEsitle() {
      const { data, error } = await sb.functions.invoke('bizimhesap-esitle', { body: {} });
      if (error) {
        let mesaj = error.message;
        try { const j = await (error as { context?: Response }).context?.json(); if (j?.hata) mesaj = j.hata; } catch { /* yok */ }
        return { ok: false, hata: mesaj };
      }
      return data as EsitlemeSonucu;
    },
    subscribe(onChange) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const fire = () => { clearTimeout(timer); timer = setTimeout(onChange, 1500); };
      const ch = sb.channel('degisiklikler');
      // BizimHesap eşitlemesinin yazdığı tablolar burada yok: onlar durum() ile 30 sn'de bir kontrol edilir
      ['ayarlar', 'kullanicilar', 'urun_kodlari', 'tahsilat_notlari', 'stok_aksiyon'].forEach((t) =>
        ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, fire));
      ch.subscribe();
      return () => { clearTimeout(timer); sb.removeChannel(ch); };
    },
    async durum() {
      const { data } = await sb.from('bh_durum').select('son_esitleme,son_degisim,rapor_yukleme,masraf_son,son_hata').eq('id', 1).maybeSingle();
      if (!data) return null;
      return { son_esitleme: data.son_esitleme, imza: [data.son_degisim, data.rapor_yukleme, data.masraf_son, data.son_hata].join('|') };
    },
  };
}

// ======================= DEMO (tarayıcı) =======================
const LS = 'perakende-analiz-demo-v5';
const DEMO_CARI = ['PERAKENDE CARİ', 'PERAKENDE CARİ', 'PERAKENDE CARİ', 'Demir Lojistik', 'Ahmet Usta Oto', 'ALİ YILMAZ / 34 ABC 123 / FIAT EGEA', 'Çakıroğlu Otomotiv', 'KEMAL BEY / 34 KL 55 / RENAULT MEGANE', 'SELİN KAYA / 34 SK 812 / TOYOTA COROLLA', 'MURAT ÖZ / 41 MO 77 / VOLKSWAGEN CADDY', 'HASAN EKER / 34 HE 309 / HYUNDAI I20'];
const uid = () => crypto.randomUUID();

/** Rastgele ama tekrarlanabilir örnek veri: 40 ürün, son 45 günün satış/alış hareketleri, cariler */
function demoSeed(): DB {
  let tohum = 7; const rnd = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
  const d1 = uid(), d2 = uid();
  const katalog: [string, string, string, number, number][] = [
    ['Yağ Filtresi', 'Bosch', 'Filtre', 120, 1.75], ['Hava Filtresi', 'Mann', 'Filtre', 160, 1.7], ['Polen Filtresi', 'Mann', 'Filtre', 140, 1.9],
    ['Yakıt Filtresi', 'Bosch', 'Filtre', 220, 1.6], ['Motor Yağı 5W-30 4L', 'Castrol', 'Yağ', 950, 1.35], ['Motor Yağı 10W-40 4L', 'Shell', 'Yağ', 780, 1.4],
    ['Şanzıman Yağı 75W80 1L', 'Motul', 'Yağ', 420, 1.5], ['Ön Fren Balatası Egea', 'Brembo', 'Fren', 640, 1.7], ['Arka Fren Balatası', 'Brembo', 'Fren', 520, 1.7],
    ['Fren Diski Ön Megane IV', 'TRW', 'Fren', 1100, 1.45], ['Fren Hidroliği DOT4', 'Bosch', 'Fren', 150, 1.8], ['Buji (4lü)', 'NGK', 'Ateşleme', 380, 1.6],
    ['Ateşleme Bobini', 'Bosch', 'Ateşleme', 900, 1.5], ['Triger Seti', 'Gates', 'Motor', 2400, 1.4], ['V Kayışı', 'Gates', 'Motor', 260, 1.8],
    ['Devirdaim Pompası', 'SKF', 'Motor', 1300, 1.45], ['Termostat', 'Wahler', 'Soğutma', 450, 1.7], ['Antifriz 3L', 'Prestone', 'Soğutma', 300, 1.6],
    ['Radyatör Hortumu', 'Gates', 'Soğutma', 280, 1.9], ['Amortisör Ön Corolla', 'Sachs', 'Süspansiyon', 1800, 1.4], ['Amortisör Arka', 'Sachs', 'Süspansiyon', 1500, 1.4],
    ['Rotil', 'Lemförder', 'Süspansiyon', 420, 1.65], ['Rot Başı', 'Lemförder', 'Süspansiyon', 380, 1.65], ['Salıncak W205 C180', 'Febi', 'Süspansiyon', 1200, 1.5],
    ['Debriyaj Seti Caddy 1.6 TDI', 'Valeo', 'Şanzıman', 3800, 1.3], ['Silecek 60cm', 'Bosch', 'Aksesuar', 180, 2.0], ['Silecek 45cm', 'Bosch', 'Aksesuar', 150, 2.0],
    ['Akü 60Ah', 'Varta', 'Elektrik', 2600, 1.3], ['Akü 72Ah', 'Varta', 'Elektrik', 3100, 1.3], ['Far Ampulü H7', 'Philips', 'Elektrik', 120, 2.1],
    ['Stop Ampulü', 'Osram', 'Elektrik', 25, 2.4], ['Marş Motoru', 'Valeo', 'Elektrik', 4200, 1.25], ['Alternatör', 'Bosch', 'Elektrik', 5200, 1.25],
    ['Egzoz Contası', 'Elring', 'Egzoz', 90, 2.2], ['Oksijen Sensörü', 'Bosch', 'Egzoz', 1400, 1.45], ['ABS Sensörü', 'ATE', 'Fren', 650, 1.6],
    ['Kampana Seti', 'TRW', 'Fren', 900, 0.95], ['Motor Takozu Clio IV', 'Febi', 'Motor', 700, 1.5], ['Klima Gazı', 'Honeywell', 'Klima', 600, 1.7], ['Cam Suyu 3L', 'Prestone', 'Aksesuar', 60, 2.5],
  ];
  const uds: DB['urun_depo_stok'] = [];
  const urunler: Urun[] = katalog.map(([ad, marka, kategori, alis, oran], i) => {
    const id = uid(); const s1 = Math.floor(rnd() * 14), s2 = Math.floor(rnd() * 6);
    uds.push({ urun_id: id, depo_id: d1, miktar: s1 }, { urun_id: id, depo_id: d2, miktar: s2 });
    return { id, kod: 'P' + (1000 + i * 7), barkod: '869' + String(100000000 + i * 1371).padStart(10, '0'), ad, marka, kategori, birim: 'Adet',
      alis_fiyati: alis, satis_fiyati: Math.round((alis * oran) / 5) * 5, kdv: 20, stok: s1 + s2, bh_stok: s1 + s2,
      kritik_stok: i % 5 === 0 ? 3 : 0, raf: 'A-' + (1 + (i % 9)), aktif: true, bh_id: 'DEMO' + i };
  });
  const hareketler: Hareket[] = []; let hid = 1;
  const simdi = Date.now();
  for (let g = 44; g >= 0; g--) {
    const gunSatis = 4 + Math.floor(rnd() * 9);
    for (let k = 0; k < gunSatis; k++) {
      const i = Math.floor(Math.pow(rnd(), 1.8) * urunler.length); const u = urunler[i];
      const t = new Date(simdi - g * 864e5); t.setHours(9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60));
      const ci = Math.floor(rnd() * DEMO_CARI.length);
      const mk = 1 + Math.floor(rnd() * 2.2); const indOran = ci > 2 && rnd() < 0.3 ? [0.05, 0.1, 0.15][Math.floor(rnd() * 3)] : 0;
      const sf = u.satis_fiyati * (1 - indOran); const brut = (u.satis_fiyati / 1.2) * mk;
      hareketler.push({ id: hid++, tarih: t.toISOString(), urun_id: u.id, tur: 'satis', miktar: mk, satis_fiyati: sf, alis_fiyati: u.alis_fiyati, kdv: u.kdv, yok_say: false, kaynak: 'fatura',
        depo: rnd() < 0.72 ? 'SULTANBEYLİ DEPO' : 'VELİBABA DEPO', brut, indirim: brut * indOran,
        cari_guid: 'C' + ci, cari_ad: DEMO_CARI[ci], kullanici: rnd() < 0.7 ? 'FURKAN' : 'EMİRHAN', belge_guid: `B${g}-${k}`, saat: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` });
    }
    if (g % 6 === 0) for (let k = 0; k < 4; k++) {
      const u = urunler[Math.floor(rnd() * urunler.length)];
      const t = new Date(simdi - g * 864e5); t.setHours(11);
      hareketler.push({ id: hid++, tarih: t.toISOString(), urun_id: u.id, tur: 'alis', miktar: 4 + Math.floor(rnd() * 8), satis_fiyati: u.satis_fiyati, alis_fiyati: u.alis_fiyati * (0.95 + rnd() * 0.15), kdv: u.kdv, yok_say: false, kaynak: 'fatura',
        cari_guid: k % 2 ? 'T1' : 'T2', cari_ad: k % 2 ? 'Martaş Otomotiv' : 'Otomarmara', belge_guid: `A${g}-${k % 2}` });
    }
  }
  for (let g = 44; g >= 0; g -= 2) {
    const t = new Date(simdi - g * 864e5); t.setHours(15);
    hareketler.push({ id: hid++, tarih: t.toISOString(), urun_id: 'yok:FREN BALATA DEĞİŞİM İŞÇİLİK', urun_ad: 'FREN BALATA DEĞİŞİM İŞÇİLİK', tur: 'satis', miktar: 1, satis_fiyati: 1200, alis_fiyati: 0, kdv: 20, yok_say: false, kaynak: 'fatura' });
    if (g % 10 === 0) hareketler.push({ id: hid++, tarih: t.toISOString(), urun_id: 'yok:KAPORTA TAMİR HİZMET', urun_ad: 'KAPORTA TAMİR HİZMET', tur: 'alis', miktar: 1, satis_fiyati: 0, alis_fiyati: 3000, kdv: 20, yok_say: false, kaynak: 'fatura' });
  }
  // satılmayan (ölü) stok örnekleri
  const olu: [string, string, string, number, number, number, 'iade' | 'kampanya' | 'toplu'][] = [
    ['Turbo Hortumu Passat B6', 'Febi', 'Motor', 1450, 1.5, 3, 'iade'], ['Far Sol Megane III', 'Valeo', 'Elektrik', 2900, 1.4, 2, 'kampanya'],
    ['Şanzıman Takozu Doblo', 'Lemförder', 'Şanzıman', 650, 1.6, 6, 'toplu'], ['Enjektör 1.5 dCi', 'Bosch', 'Motor', 3800, 1.3, 2, 'toplu'], ['Stop Lambası Sağ Fiesta', 'Depo', 'Elektrik', 420, 1.7, 4, 'kampanya']];
  for (const [ad, marka, kategori, alis, oran, stok, tip] of olu) {
    const id = uid(); uds.push({ urun_id: id, depo_id: d1, miktar: stok });
    urunler.push({ id, kod: 'X' + (urunler.length + 100), ad, marka, kategori, birim: 'Adet', alis_fiyati: alis, satis_fiyati: Math.round((alis * oran) / 5) * 5, kdv: 20, stok, bh_stok: stok, kritik_stok: 0, aktif: true, bh_id: 'DEMOX' + urunler.length });
    if (tip === 'iade') hareketler.push({ id: hid++, tarih: new Date(simdi - 40 * 864e5).toISOString(), urun_id: id, tur: 'alis', miktar: stok, satis_fiyati: 0, alis_fiyati: alis, kdv: 20, yok_say: false, kaynak: 'fatura', cari_ad: 'Martaş Otomotiv', cari_guid: 'T1', belge_guid: 'AX' + id });
    if (tip === 'kampanya') hareketler.push({ id: hid++, tarih: new Date(simdi - 120 * 864e5).toISOString(), urun_id: id, tur: 'satis', miktar: 1, satis_fiyati: alis * oran, alis_fiyati: alis, kdv: 20, yok_say: false, kaynak: 'fatura', cari_ad: 'PERAKENDE CARİ', belge_guid: 'BX' + id });
  }
  hareketler.sort((a, b) => b.tarih.localeCompare(a.tarih));
  const kasa: DB['kasa_akisi'] = []; let kid = 1;
  for (let g = 44; g >= 0; g--) {
    const gun = new Date(simdi - g * 864e5).toLocaleDateString('sv');
    const ciro = hareketler.filter((h) => h.tur === 'satis' && h.tarih.slice(0, 10) === new Date(simdi - g * 864e5).toISOString().slice(0, 10)).reduce((t, h) => t + h.miktar * h.satis_fiyati, 0);
    kasa.push({ id: kid++, tarih: gun, tip: 'Tahsilat', hesap: rnd() < 0.5 ? 'Kasa' : 'POS', giris: Math.round(ciro * 0.85), cikis: 0 });
    if (g % 3 === 0) kasa.push({ id: kid++, tarih: gun, tip: 'Ödeme', hesap: 'Banka', karsi: 'Martaş Otomotiv', giris: 0, cikis: Math.round(8000 + rnd() * 12000) });
  }
  const cari = (ad: string, tur: Cari['tur'], bakiye: number, tel = ''): Cari => ({ id: uid(), bh_id: uid(), tur, ad, telefon: tel, bakiye, cek_senet: 0 });
  return {
    urunler, depolar: [{ id: d1, ad: 'SULTANBEYLİ DEPO', aktif: true, bh_id: 'D1' }, { id: d2, ad: 'VELİBABA DEPO', aktif: true, bh_id: 'D2' }], urun_depo_stok: uds,
    bh_durum: { id: 1, son_esitleme: new Date().toISOString(), takip_baslangic: new Date(simdi - 45 * 864e5).toISOString(), urun_sayisi: urunler.length, depo_sayisi: 2, cari_sayisi: 6 },
    hareketler, fiyat_gecmisi: [],
    cariler: [cari('Demir Lojistik', 'musteri', 12450, '05321112233'), cari('Ahmet Usta Oto', 'musteri', 3800), cari('34 ABC 123 / Egea', 'musteri', 950), cari('Perakende Cari', 'musteri', 0),
      cari('Martaş Otomotiv', 'tedarikci', -28400), cari('Otomarmara', 'tedarikci', -9150)],
    cari_hareketler: [], ayarlar: { id: 1, firma_adi: 'Demo İşletme', alis_kdv_haric: true, hedef_gun: 30, haric_masraf: [], hedef_marj: 35 }, kullanicilar: [], urun_kodlari: [],
    kasa_akisi: kasa, vadesi_gecen: [{ id: 1, cari: 'Demir Lojistik', telefon: '05321112233', tutar: 12450, gun: 38 }, { id: 2, cari: 'Ahmet Usta Oto', tutar: 3800, gun: 12 },
      { id: 3, cari: 'KEMAL BEY / 34 KL 55 / RENAULT MEGANE', telefon: '05551234567', tutar: 21500, gun: 74 }, { id: 4, cari: 'MURAT ÖZ / 41 MO 77 / VOLKSWAGEN CADDY', telefon: '05324445566', tutar: 8900, gun: 21 },
      { id: 5, cari: 'Çakıroğlu Otomotiv', telefon: '02164440000', tutar: 34200, gun: 55 }, { id: 6, cari: 'SELİN KAYA / 34 SK 812 / TOYOTA COROLLA', tutar: 2500, gun: 6 }],
    tahsilat_notlari: [], stok_aksiyon: [],
    hesap_bakiyeleri: [{ ad: 'Kasa', bakiye: 18500 }, { ad: 'Banka', bakiye: 92400 }, { ad: 'POS', bakiye: 6200 }, { ad: 'Kredi Kartı', bakiye: -48000 }],
    masraflar: [['Kira', 'İşletme Giderleri', 40000, 1], ['Maaş', 'Personel Giderleri', 55000, 2], ['Elektrik', 'İşletme Giderleri', 4200, 8], ['Yemek', 'Personel Giderleri', 9000, 12], ['Kira', 'İşletme Giderleri', 40000, 31], ['Maaş', 'Personel Giderleri', 55000, 32]]
      .map(([alt, ana, tutar, g], i) => ({ id: i + 1, tarih: new Date(simdi - (g as number) * 864e5).toLocaleDateString('sv'), ana: ana as string, alt: alt as string, aciklama: alt as string, tutar: tutar as number })),
  };
}

function demoBackend(): Backend {
  let db: DB;
  try { db = JSON.parse(localStorage.getItem(LS) || 'null') || demoSeed(); } catch { db = demoSeed(); }
  db.masraflar ??= []; db.kasa_akisi ??= []; db.hesap_bakiyeleri ??= []; db.vadesi_gecen ??= []; db.tahsilat_notlari ??= []; db.stok_aksiyon ??= [];
  const listeners = new Set<() => void>();
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(db)); } catch { /* yer yok */ } listeners.forEach((f) => f()); };
  const tbl = (t: CrudTable) => db[t] as unknown as { id: ID | number }[];
  return {
    async load() { return structuredClone(db); },
    async insert(t, row) {
      const r = { id: uid(), olusturma: new Date().toISOString(), ...row } as Record<string, unknown>;
      if (t === 'urun_kodlari') r.kod_norm = String(r.kod ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      tbl(t).unshift(r as { id: ID }); save();
    },
    async update(t, id, patch) { const r = tbl(t).find((x) => x.id === id); if (r) Object.assign(r, patch); save(); },
    async remove(t, id) { (db[t] as unknown) = tbl(t).filter((x) => x.id !== id); save(); },
    async ayarKaydet(a) { db.ayarlar = { ...db.ayarlar, ...a, id: 1 }; save(); },
    async bhEsitle() { return { ok: false, hata: 'Demo modunda BizimHesap bağlantısı yok' }; },
    async urunKodlariYukle(satirlar) {
      let eklenen = 0, bulunamayan = 0;
      for (const r of satirlar) {
        const u = db.urunler.find((x) => x.barkod === r.anahtar.trim()) ?? db.urunler.find((x) => x.kod === r.anahtar.trim());
        if (!u) { bulunamayan++; continue; }
        for (const k of r.kodlar.map((x) => x.trim()).filter(Boolean)) {
          const n = k.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (db.urun_kodlari.some((x) => x.urun_id === u.id && x.kod_norm === n)) continue;
          db.urun_kodlari.push({ id: uid(), urun_id: u.id, kod: k, kod_norm: n, tur: r.tur || 'OEM' }); eklenen++;
        }
      }
      save(); return { eklenen, bulunamayan };
    },
    subscribe(onChange) { listeners.add(onChange); return () => { listeners.delete(onChange); }; },
    async durum() { return null; },
  };
}

export const backend: Backend = supabase ? supabaseBackend(supabase) : demoBackend();
export const demoSifirla = () => { localStorage.removeItem(LS); location.reload(); };
