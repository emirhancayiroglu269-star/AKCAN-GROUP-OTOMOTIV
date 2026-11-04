import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/backend';
import { para, sayi, tarih } from '../lib/format';
import type { Hareket } from '../lib/types';
import { Bos } from './ui';

/** Ödeal e-Fatura portalından eklentiyle okunan fatura başlığı */
interface OdealFatura { ettn: string; yon: 'gelen' | 'giden' | 'arsiv'; no: string | null; karsi: string | null; vkn: string | null; tarih: string | null; senaryo: string | null; tip: string | null; tutar: number | null; durum: string | null; ham: { iptal?: boolean } | null; kontrol?: 'tamam' | 'bilerek' | null; kontrol_not?: string | null }
/** BizimHesap'taki bir fatura belgesi (aynı belge_guid'li satırların toplamı, KDV dahil) */
interface Belge { guid: string; tur: 'satis' | 'alis'; cari: string; gun: string; tutar: number; kalem: number }
type Eslesme = { o: OdealFatura; b: Belge };

const GUN = 864e5;
const gunFark = (a: string, b: string) => Math.abs(new Date(a + 'T12:00:00').getTime() - new Date(b + 'T12:00:00').getTime()) / GUN;
// firma adlarını karşılaştırmak için: Türkçe harfler sadeleşir, şirket ekleri atılır, ilk iki anlamlı kelime alınır
const adNorm = (s: string | null | undefined) => String(s ?? '').toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
  .replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !['OTO', 'OTOMOTIV', 'SAN', 'TIC', 'LTD', 'STI', 'SANAYI', 'TICARET', 'VE', 'YEDEK', 'PARCA', 'LIMITED', 'SIRKETI', 'ANONIM'].includes(w)).slice(0, 2).join(' ');
const adBenzer = (a: string | null | undefined, b: string | null | undefined) => { const x = adNorm(a), y = adNorm(b); if (!x || !y) return false; const w = x.split(' ')[0]; return y.includes(w) || x.includes(y.split(' ')[0]); };
const tol = (t: number) => Math.max(1, Math.abs(t) * 0.005);

/** Ödeal faturaları ile BizimHesap belgelerini tutar (±%0,5), tarih (±10 gün) ve firma adına göre birebir eşleştirir */
function eslestir(od: OdealFatura[], bl: Belge[]) {
  const adaylar: { o: OdealFatura; b: Belge; puan: number }[] = [];
  for (const o of od) for (const b of bl) {
    if (o.tutar == null || !o.tarih) continue;
    const df = Math.abs(o.tutar - b.tutar); if (df > tol(o.tutar)) continue;
    const gf = gunFark(o.tarih, b.gun); if (gf > 10) continue;
    adaylar.push({ o, b, puan: (adBenzer(o.karsi, b.cari) ? 0 : 20) + gf + df / Math.max(1, o.tutar) * 100 });
  }
  adaylar.sort((x, y) => x.puan - y.puan);
  const oKul = new Set<string>(), bKul = new Set<string>(); const es: Eslesme[] = [];
  for (const a of adaylar) { if (oKul.has(a.o.ettn) || bKul.has(a.b.guid)) continue; oKul.add(a.o.ettn); bKul.add(a.b.guid); es.push({ o: a.o, b: a.b }); }
  return { es, oKalan: od.filter((o) => !oKul.has(o.ettn)), bKalan: bl.filter((b) => !bKul.has(b.guid)) };
}

export function EFaturaKontrol({ d }: { d: { bas: string; bit: string } }) {
  const { db, calistir } = useStore();
  const [veri, setVeri] = useState<OdealFatura[] | null>(null); const [hata, setHata] = useState<string | null>(null); const [yuk, setYuk] = useState(0);
  const [kapsam, setKapsam] = useState<{ min: string | null; max: string | null; say: number } | null>(null);
  const bas = useMemo(() => { const t = new Date(d.bas + 'T12:00:00'); t.setDate(t.getDate() - 10); return t.toLocaleDateString('sv'); }, [d.bas]);
  const bit = useMemo(() => { const t = new Date(d.bit + 'T12:00:00'); t.setDate(t.getDate() + 10); return t.toLocaleDateString('sv'); }, [d.bit]);

  useEffect(() => {
    if (!supabase) { setHata('Bu görünüm yalnız bulut modunda çalışır'); return; }
    let iptal = false; setVeri(null); setHata(null);
    (async () => {
      const l: OdealFatura[] = [];
      for (let i = 0; i < 20000; i += 1000) {
        const { data, error } = await supabase!.from('odeal_fatura').select('ettn,yon,no,karsi,vkn,tarih,senaryo,tip,tutar,durum,ham,kontrol,kontrol_not').gte('tarih', bas).lte('tarih', bit).order('tarih').range(i, i + 999);
        if (error) { if (!iptal) setHata(error.message); return; }
        l.push(...((data ?? []) as OdealFatura[])); if (!data || data.length < 1000) break;
      }
      const { data: k } = await supabase!.from('odeal_fatura').select('tarih').order('tarih', { ascending: true }).limit(1);
      const { data: k2 } = await supabase!.from('odeal_fatura').select('tarih').order('tarih', { ascending: false }).limit(1);
      const { count } = await supabase!.from('odeal_fatura').select('ettn', { count: 'exact', head: true });
      if (!iptal) { setVeri(l); setKapsam({ min: k?.[0]?.tarih ?? null, max: k2?.[0]?.tarih ?? null, say: count ?? 0 }); }
    })();
    return () => { iptal = true; };
  }, [bas, bit, yuk]);

  // BizimHesap fatura belgeleri (KDV dahil toplam)
  const belgeler = useMemo(() => {
    const m = new Map<string, Belge>();
    const ekle = (h: Hareket, iade: boolean) => {
      if (h.kaynak !== 'fatura' || !h.belge_guid || iade) return;
      const gun = h.tarih.slice(0, 10); if (gun < bas || gun > bit) return;
      const t = h.tur === 'satis' ? h.miktar * h.satis_fiyati : h.miktar * h.alis_fiyati * (1 + (h.kdv ?? 20) / 100);
      const b = m.get(h.belge_guid) ?? { guid: h.belge_guid, tur: h.tur, cari: h.cari_ad ?? '—', gun, tutar: 0, kalem: 0 };
      b.tutar += t; b.kalem++; m.set(h.belge_guid, b);
    };
    for (const h of db.hareketler) ekle(h, false);
    return [...m.values()];
  }, [db.hareketler, bas, bit]);

  const sonuc = useMemo(() => {
    if (!veri) return null;
    const gecerli = veri.filter((o) => !o.ham?.iptal && !/iptal|red/i.test(o.durum ?? '') && (o.tip ?? 'SATIS').toUpperCase() !== 'IADE');
    const gelen = gecerli.filter((o) => o.yon === 'gelen'); const giden = gecerli.filter((o) => o.yon !== 'gelen');
    // karşılaştırma yalnız Ödeal verisi okunmuş günlerde yapılır (eklentiyle açılmamış sayfalar "eksik" sanılmasın)
    const aralik = (l: OdealFatura[]) => { const g = l.map((o) => o.tarih!).filter(Boolean).sort(); return g.length ? { min: g[0], max: g[g.length - 1] } : null; };
    const ga = aralik(gelen), sa = aralik(giden);
    const icinde = (gun: string, a: { min: string; max: string } | null) => !!a && gun >= a.min && gun <= a.max && gun >= d.bas && gun <= d.bit;
    const alis = eslestir(gelen, belgeler.filter((b) => b.tur === 'alis'));
    const satis = eslestir(giden, belgeler.filter((b) => b.tur === 'satis'));
    // alış olarak bulunamayanlar BizimHesap'ta masraf (gider) olarak girilmiş olabilir: tutar ±%0,5, tarih ±15 gün
    const mKul = new Set<number>(); const giderGirilmis: { o: OdealFatura; m: { id: number; tarih: string; tutar: number; aciklama?: string | null } }[] = [];
    const kalanAlis: OdealFatura[] = [];
    for (const o of alis.oKalan) {
      const m = o.tutar == null || !o.tarih ? undefined : db.masraflar.filter((x) => !mKul.has(x.id) && Math.abs(x.tutar - o.tutar!) <= tol(o.tutar!) && gunFark(o.tarih!, x.tarih.slice(0, 10)) <= 15)
        .sort((x, y) => gunFark(o.tarih!, x.tarih.slice(0, 10)) - gunFark(o.tarih!, y.tarih.slice(0, 10)))[0];
      if (m) { mKul.add(m.id); giderGirilmis.push({ o, m }); } else kalanAlis.push(o);
    }
    // kalanlar: BizimHesap'ta alış carisi olarak geçen bir firmaysa parça faturası, değilse gider faturası sayılır
    const alisCari = [...new Set(db.hareketler.filter((h) => h.tur === 'alis' && h.cari_ad).map((h) => h.cari_ad!))];
    const tedarikciMi = (o: OdealFatura) => alisCari.some((c) => adBenzer(o.karsi, c));
    const sirala = (l: OdealFatura[]) => l.sort((x, y) => (y.tarih ?? '').localeCompare(x.tarih ?? ''));
    // aynı firmadan aynı tutarda ikinci bir BizimHesap alış belgesi: çift giriş olabilir
    const cift = alis.bKalan.filter((b) => alis.es.some((e) => Math.abs(e.b.tutar - b.tutar) <= tol(b.tutar) && gunFark(e.b.gun, b.gun) <= 10 && adBenzer(e.b.cari, b.cari)));
    return {
      ga, sa,
      parca: sirala(kalanAlis.filter((o) => icinde(o.tarih!, ga) && !o.kontrol && tedarikciMi(o))),
      gider: sirala(kalanAlis.filter((o) => icinde(o.tarih!, ga) && !o.kontrol && !tedarikciMi(o))),
      isaretli: sirala([...kalanAlis, ...satis.oKalan].filter((o) => icinde(o.tarih!, o.yon === 'gelen' ? ga : sa) && !!o.kontrol)),
      giderEs: giderGirilmis.filter((e) => icinde(e.o.tarih!, ga)).length,
      alisEs: alis.es.filter((e) => icinde(e.o.tarih!, ga)).length,
      cift: cift.filter((b) => icinde(b.gun, ga)),
      bhFazla: alis.bKalan.filter((b) => icinde(b.gun, ga) && !cift.includes(b)).sort((x, y) => y.tutar - x.tutar),
      satisYok: satis.oKalan.filter((o) => icinde(o.tarih!, sa) && !o.kontrol).sort((x, y) => (y.tarih ?? '').localeCompare(x.tarih ?? '')),
      satisEs: satis.es.filter((e) => icinde(e.o.tarih!, sa)).length,
      iptal: veri.filter((o) => (o.ham?.iptal || /iptal/i.test(o.durum ?? '')) && o.tarih && o.tarih >= d.bas && o.tarih <= d.bit),
    };
  }, [veri, belgeler, d.bas, d.bit, db.masraflar, db.hareketler]);

  if (hata) return <div className="p-4 text-sm text-red-600">Ödeal verisi okunamadı: {hata}</div>;
  if (!veri || !sonuc) return <div className="p-6 text-center text-sm text-slate-500">Ödeal faturaları yükleniyor…</div>;
  const isaretle = (o: OdealFatura, k: 'bilerek' | null) => calistir(async () => {
    const { error } = await supabase!.from('odeal_fatura').update({ kontrol: k, kontrol_zaman: k ? new Date().toISOString() : null }).eq('ettn', o.ettn);
    if (error) throw new Error(error.message);
    setVeri((v) => v && v.map((x) => (x.ettn === o.ettn ? { ...x, kontrol: k } : x)));
  }, k ? 'Fatura "bilerek girilmedi" olarak işaretlendi' : 'İşaret kaldırıldı');
  const toplam = (l: { tutar: number | null }[]) => l.reduce((t, x) => t + (x.tutar ?? 0), 0);
  const odealTablo = (l: OdealFatura[], bos: string) => l.length === 0 ? <div className="flex items-center gap-2 p-3 text-sm text-emerald-700"><CheckCircle2 size={16} /> {bos}</div> : (
    <table className="tbl text-sm"><thead><tr><th>Tarih</th><th>Fatura no</th><th>Firma</th><th>Senaryo</th><th className="text-right">Tutar</th><th /></tr></thead>
      <tbody>{l.map((o) => <tr key={o.ettn}><td className="whitespace-nowrap">{tarih(o.tarih)}</td><td className="font-mono text-xs">{o.no}</td><td>{o.karsi}<div className="text-[11px] text-slate-500">{o.vkn}{o.durum ? ` · ${o.durum}` : ''}</div></td><td className="text-xs">{o.senaryo}</td><td className="text-right font-semibold">{para(o.tutar ?? 0)}</td>
        <td className="text-right">{o.kontrol ? <button className="btn-ghost text-xs" onClick={() => isaretle(o, null)}>Geri al</button> : <button className="btn-ghost whitespace-nowrap text-xs" title="Bu fatura bilerek BizimHesap'a girilmedi (devir, şahsi alım, iade edildi vb.): listeden çıkar" onClick={() => isaretle(o, 'bilerek')}>Bilerek girilmedi</button>}</td></tr>)}</tbody></table>);

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>Ödeal e-Fatura portalında <b>Gelen e-Fatura</b>, <b>Gönderilen</b> ve <b>e-Arşiv</b> listelerini açtığınızda eklenti faturaları okur (sayfada 100 kayıt seçip sayfaları gezmek eski faturaları da getirir).
          Faturalar BizimHesap belgeleriyle <b>tutar (±%0,5)</b>, <b>tarih (±10 gün)</b> ve firma adına göre eşleştirilir; karşılaştırma yalnız Ödeal'den okunmuş tarih aralığında yapılır.
          {kapsam && <> Okunan: <b>{sayi(kapsam.say)}</b> fatura{kapsam.min ? ` (${tarih(kapsam.min)} – ${tarih(kapsam.max)})` : ''}.</>}</span>
        <button className="btn-ghost ml-auto shrink-0 text-xs" onClick={() => setYuk((x) => x + 1)}><RefreshCw size={13} /> Yenile</button>
      </div>
      {!veri.length && <Bos metin="Bu dönem için Ödeal'den okunmuş fatura yok. Ödeal portalında fatura listelerini açın." />}

      {sonuc.ga && <div>
        <div className="mb-1 flex flex-wrap items-baseline gap-2 text-sm font-semibold"><AlertTriangle size={15} className={sonuc.parca.length ? 'text-red-600' : 'text-emerald-600'} />
          Tedarikçi faturası, BizimHesap'a alış olarak girilmemiş: {sayi(sonuc.parca.length)} {sonuc.parca.length > 0 && <span className="text-red-600">({para(toplam(sonuc.parca))})</span>}
          <span className="font-normal text-xs text-slate-500">· {sayi(sonuc.alisEs)} fatura alışla, {sayi(sonuc.giderEs)} fatura masrafla eşleşti</span></div>
        <p className="mb-1 text-xs text-slate-500">BizimHesap'ta alış carisi olan firmalardan gelen ama alış ya da masraf olarak bulunamayan faturalar: mal girişi ve tedarikçi borcu eksik kalır.</p>
        {odealTablo(sonuc.parca, 'Tedarikçilerden gelen tüm e-faturalar BizimHesap\'ta var.')}
      </div>}

      {sonuc.ga && <div>
        <div className="mb-1 flex flex-wrap items-baseline gap-2 text-sm font-semibold"><AlertTriangle size={15} className={sonuc.gider.length ? 'text-amber-600' : 'text-emerald-600'} />
          Gider faturası, BizimHesap'a masraf olarak girilmemiş: {sayi(sonuc.gider.length)} {sonuc.gider.length > 0 && <span className="text-amber-700">({para(toplam(sonuc.gider))})</span>}</div>
        <p className="mb-1 text-xs text-slate-500">Telefon, internet, elektrik, market, yazılım gibi faturalar. Masraf olarak girilmezse kâr-zarar ve KDV indirimi eksik kalır.</p>
        {odealTablo(sonuc.gider, 'Gelen gider faturalarının hepsi BizimHesap\'ta masraf olarak var.')}
      </div>}

      {sonuc.cift.length > 0 && <div>
        <div className="mb-1 text-sm font-semibold text-amber-700">Çift girilmiş olabilecek alışlar: {sayi(sonuc.cift.length)}</div>
        <p className="mb-1 text-xs text-slate-500">Ödeal'de tek fatura var ama BizimHesap'ta aynı firmadan aynı tutarda bir alış belgesi daha girilmiş.</p>
        <table className="tbl text-sm"><thead><tr><th>Tarih</th><th>BizimHesap carisi</th><th className="text-right">Kalem</th><th className="text-right">Tutar</th></tr></thead>
          <tbody>{sonuc.cift.map((b) => <tr key={b.guid}><td>{tarih(b.gun)}</td><td>{b.cari}</td><td className="text-right">{b.kalem}</td><td className="text-right font-semibold">{para(b.tutar)}</td></tr>)}</tbody></table>
      </div>}

      {sonuc.sa && <div>
        <div className="mb-1 flex flex-wrap items-baseline gap-2 text-sm font-semibold"><AlertTriangle size={15} className={sonuc.satisYok.length ? 'text-amber-600' : 'text-emerald-600'} />
          Ödeal'de kesilmiş, BizimHesap'ta satış faturası bulunamayan: {sayi(sonuc.satisYok.length)} {sonuc.satisYok.length > 0 && <span className="text-amber-700">({para(toplam(sonuc.satisYok))})</span>}
          <span className="font-normal text-xs text-slate-500">· {sayi(sonuc.satisEs)} fatura eşleşti</span></div>
        <p className="mb-1 text-xs text-slate-500">Ödeal POS'tan ya da portaldan doğrudan kesilen e-arşiv/e-faturalar BizimHesap'a işlenmemişse satış ve stok eksik kalır.</p>
        {odealTablo(sonuc.satisYok, 'Kesilen tüm e-fatura / e-arşivler BizimHesap\'ta satış olarak var.')}
      </div>}

      {sonuc.bhFazla.length > 0 && <details className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
        <summary className="cursor-pointer font-semibold">BizimHesap'ta olup gelen e-faturası bulunamayan alışlar: {sayi(sonuc.bhFazla.length)} ({para(toplam(sonuc.bhFazla))})</summary>
        <p className="my-1 text-xs text-slate-500">Kağıt / e-arşiv fatura, kurye, fiş gibi e-fatura olmayan alışlar da burada görünür; tutarı farklı girilmiş faturalar da buraya düşer.</p>
        <table className="tbl text-sm"><thead><tr><th>Tarih</th><th>BizimHesap carisi</th><th className="text-right">Kalem</th><th className="text-right">Tutar</th></tr></thead>
          <tbody>{sonuc.bhFazla.slice(0, 200).map((b) => <tr key={b.guid}><td>{tarih(b.gun)}</td><td>{b.cari}</td><td className="text-right">{b.kalem}</td><td className="text-right">{para(b.tutar)}</td></tr>)}</tbody></table>
      </details>}

      {sonuc.isaretli.length > 0 && <details className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
        <summary className="cursor-pointer font-semibold">"Bilerek girilmedi" işaretlenenler: {sayi(sonuc.isaretli.length)} ({para(toplam(sonuc.isaretli))})</summary>
        <div className="mt-2">{odealTablo(sonuc.isaretli, '')}</div>
      </details>}

      {sonuc.iptal.length > 0 && <p className="text-xs text-slate-500">Bu dönemde Ödeal'de iptal edilmiş {sonuc.iptal.length} fatura karşılaştırmaya katılmadı.</p>}
    </div>
  );
}
