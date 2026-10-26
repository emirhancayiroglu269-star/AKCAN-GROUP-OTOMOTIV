import { useEffect, useMemo, useState } from 'react';
import { Download, Info, MessageCircle, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type FiyatTeklifi, type Sorulan } from '../lib/backend';
import { OtomarmaraArama } from './UrunAra';
import { pahaliAlimlar } from '../lib/analiz5';
import { ara, gunu, para, sayi, tarih, tarihSaat } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik, onayla } from '../components/ui';
import { aktifDepolar, stokHaritasi } from '../lib/depo';
import { depoKisa } from '../lib/muadil';

const csvIndir = (ad: string, satirlar: (string | number | null | undefined)[][]) => {
  const icerik = satirlar.map((a) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = ad; el.click();
};

/* ───────────────────────── Pahalıya alınanlar ───────────────────────── */

export function PahaliAlimlar() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const [q, setQ] = useState('');
  const [grup, setGrup] = useState<'satir' | 'tedarikci'>('satir');
  const tum = useMemo(() => pahaliAlimlar(db, d), [db, d]);
  const liste = tum.filter((x) => ara(q, x.u.ad, x.u.kod, x.u.marka, x.tedarikci, x.ref.ad));
  const toplam = liste.reduce((t, x) => t + x.fazla, 0);
  const tedGrup = useMemo(() => {
    const m = new Map<string, { ad: string; fazla: number; satir: number; ucuzlar: Map<string, number> }>();
    for (const x of liste) { const g = m.get(x.tedarikci) ?? { ad: x.tedarikci, fazla: 0, satir: 0, ucuzlar: new Map() }; g.fazla += x.fazla; g.satir++; g.ucuzlar.set(x.ref.ad, (g.ucuzlar.get(x.ref.ad) ?? 0) + 1); m.set(x.tedarikci, g); }
    return [...m.values()].sort((a, b) => b.fazla - a.fazla);
  }, [liste]);
  return (
    <div>
      <SayfaBaslik baslik="Pahalıya Alınan Mallar" alt="Aynı ürünü son 90 gün içinde başka bir tedarikçiden daha ucuza almışken pahalıya alınan faturalar">
        <button className="btn-ghost" disabled={!liste.length} onClick={() => csvIndir(`pahali-alimlar-${gunu()}.csv`, [['Tarih', 'Kod', 'Ürün', 'Alınan yer', 'Adet', 'Birim fiyat', 'Daha ucuz alınan yer', 'Ucuz fiyat', 'Ucuz alış tarihi', 'Fazla ödenen'],
          ...liste.map((x) => [tarih(x.h.tarih), x.u.kod, x.u.ad, x.tedarikci, x.h.miktar, x.fiyat.toFixed(2), x.ref.ad, x.ref.fiyat.toFixed(2), tarih(x.ref.tarih), x.fazla.toFixed(2)])])}><Download size={16} /> CSV</button>
      </SayfaBaslik>
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi etiket="Fazla ödenen (tahmini)" deger={para(toplam)} alt="Fiyat farkı × alınan adet" renk="red" />
        <Kpi etiket="Pahalı alım satırı" deger={sayi(liste.length)} alt={`${new Set(liste.map((x) => x.u.id)).size} farklı ürün`} renk="amber" />
        <Kpi etiket="En çok fark çıkan tedarikçi" deger={tedGrup[0]?.ad ?? '—'} alt={tedGrup[0] ? para(tedGrup[0].fazla) : ''} />
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-xs" placeholder="Ürün, kod, tedarikçi…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex rounded-full bg-slate-100 p-0.5 text-xs dark:bg-slate-800">{([['satir', 'Fatura satırları'], ['tedarikci', 'Tedarikçiye göre']] as const).map(([k, ad]) => (
            <button key={k} onClick={() => setGrup(k)} className={`rounded-full px-3 py-1 ${grup === k ? 'bg-white font-semibold shadow-sm dark:bg-slate-900' : 'text-slate-500'}`}>{ad}</button>))}</div>
        </div>
        {liste.length === 0 ? <Bos metin="Bu dönemde, başka yerden daha ucuza alınabilecekken pahalıya alınan mal görünmüyor 👍" /> : grup === 'tedarikci' ? (
          <table className="tbl">
            <thead><tr><th>Pahalıya alınan yer</th><th className="text-right">Satır</th><th>Daha ucuz alınan yerler</th><th className="text-right">Fazla ödenen</th></tr></thead>
            <tbody>{tedGrup.map((g) => <tr key={g.ad}><td className="font-medium">{g.ad}</td><td className="text-right">{g.satir}</td><td className="text-xs text-slate-500">{[...g.ucuzlar.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} (${n})`).join(', ')}</td><td className="text-right font-semibold text-red-600">{para(g.fazla)}</td></tr>)}</tbody>
          </table>
        ) : (
          <div className="max-h-[62vh] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Ürün</th><th>Alınan yer</th><th className="text-right">Adet</th><th className="text-right">Ödenen</th><th>Daha ucuz alınan</th><th className="text-right">Fazla</th></tr></thead>
              <tbody>{liste.slice(0, 500).map((x, i) => (
                <tr key={i}>
                  <td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka].filter(Boolean).join(' · ')}</div></td>
                  <td><div>{x.tedarikci}</div><div className="text-xs text-slate-500">{tarih(x.h.tarih)}</div></td>
                  <td className="text-right">{sayi(x.h.miktar)}</td>
                  <td className="text-right font-medium text-red-600">{para(x.fiyat)} <span className="text-[11px]">+%{x.oran.toFixed(0)}</span></td>
                  <td><div className="text-emerald-700">{para(x.ref.fiyat)} · {x.ref.ad}</div><div className="text-xs text-slate-500">{tarih(x.ref.tarih)}</div></td>
                  <td className="text-right font-semibold text-red-600">{para(x.fazla)}</td>
                </tr>))}</tbody>
            </table>
          </div>)}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Her alış faturası satırı, aynı ürünün önceki 90 gündeki en ucuz alışıyla karşılaştırılır. Yalnız daha ucuz alınan yer başka bir tedarikçiyse ve fark %5'ten fazlaysa listelenir; aynı firmanın zammı burada sayılmaz. Fiyatlar faturadaki birim alış fiyatıdır (KDV hariç). Acil alım, kampanya bitişi gibi haklı sebepler olabilir — liste kontrol içindir.</p>
    </div>
  );
}

/* ───────────────────────── Sorulan ama stokta olmayanlar ───────────────────────── */

export function SorulanParcalar() {
  const { db, izin, mode, calistir } = useStore();
  const [omQ, setOmQ] = useState<{ anahtar: string; q: string } | null>(null);
  const [gun, setGun] = useState(30);
  const [kayit, setKayit] = useState<Sorulan[] | null>(null);
  const [yuk, setYuk] = useState(false);
  const [q, setQ] = useState('');
  const [acik, setAcik] = useState<string | null>(null);
  const harita = useMemo(() => stokHaritasi(db), [db]); const depolar = aktifDepolar(db);
  const urun = useMemo(() => new Map(db.urunler.map((u) => [u.id, u])), [db.urunler]);
  const oku = async () => { setYuk(true); try { setKayit(await backend.sorulanOku(gun)); } catch (e) { toast(`Okunamadı: ${(e as Error).message}`, 'hata'); } finally { setYuk(false); } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { oku(); }, [gun]);
  const norm = (s: string) => s.toLocaleUpperCase('tr').replace(/[^0-9A-ZÇĞİÖŞÜ]+/g, ' ').trim();
  const gruplar = useMemo(() => {
    const m = new Map<string, { anahtar: string; ad: string; urunId: string | null; adet: number; kez: number; son: string; kisiler: Set<string>; kayitlar: Sorulan[] }>();
    for (const r of kayit ?? []) {
      const k = r.urun_id ? `u:${r.urun_id}` : `m:${norm(r.metin)}`; const u = r.urun_id ? urun.get(r.urun_id) : null;
      const g = m.get(k) ?? { anahtar: k, ad: u?.ad ?? r.metin, urunId: r.urun_id, adet: 0, kez: 0, son: '', kisiler: new Set(), kayitlar: [] };
      g.adet += r.adet || 1; g.kez++; if (r.zaman > g.son) g.son = r.zaman; if (r.kullanici) g.kisiler.add(r.kullanici); g.kayitlar.push(r); m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.kez - a.kez || b.son.localeCompare(a.son));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kayit, urun]);
  const liste = gruplar.filter((g) => ara(q, g.ad, g.urunId ? urun.get(g.urunId)?.kod : ''));
  const sil = async (r: Sorulan) => { if (!onayla(`"${r.metin}" kaydı silinsin mi?`)) return; try { await backend.sorulanSil(r.id); setKayit((k) => (k ?? []).filter((x) => x.id !== r.id)); } catch (e) { toast(`Silinemedi: ${(e as Error).message}`, 'hata'); } };
  const toplamKez = gruplar.reduce((t, g) => t + g.kez, 0);
  return (
    <div>
      <SayfaBaslik baslik="Sorulan Ama Olmayan Parçalar" alt="Tezgâhta sorulup stokta olmadığı için satılamayan parçalar · Ürün Ara'daki “Soruldu, yok” düğmesiyle kaydedilir">
        <select className="inp w-36" value={gun} onChange={(e) => setGun(Number(e.target.value))}>{[7, 30, 90, 180].map((n) => <option key={n} value={n}>Son {n} gün</option>)}</select>
        <button className="btn-ghost" onClick={oku} disabled={yuk}><RefreshCw size={16} className={yuk ? 'animate-spin' : ''} /> Yenile</button>
        <button className="btn-ghost" disabled={!liste.length} onClick={() => csvIndir(`sorulan-parcalar-${gunu()}.csv`, [['Parça', 'Stok kodu', 'Kaç kez soruldu', 'Toplam adet', 'Son soruluş', 'Şu anki stok'], ...liste.map((g) => { const u = g.urunId ? urun.get(g.urunId) : null; return [g.ad, u?.kod, g.kez, g.adet, tarihSaat(g.son), u ? u.stok : 'kartı yok']; })])}><Download size={16} /> CSV</button>
      </SayfaBaslik>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi etiket="Kaçan soru" deger={sayi(toplamKez)} alt={`Son ${gun} gün`} renk="red" />
        <Kpi etiket="Farklı parça" deger={sayi(gruplar.length)} alt={`${gruplar.filter((g) => !g.urunId).length} tanesinin kartı bile yok`} renk="amber" />
        <Kpi etiket="2+ kez sorulan" deger={sayi(gruplar.filter((g) => g.kez >= 2).length)} alt="Rafa koymayı düşünün" renk="blue" />
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-xs" placeholder="Parça ara…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="text-xs text-slate-500">{liste.length} parça</span>
        </div>
        {kayit === null ? <div className="p-6 text-center text-sm text-slate-500">Yükleniyor…</div> : liste.length === 0 ? <Bos metin="Kayıt yok. Ürün Ara'da stokta olmayan bir parça sorulduğunda “Soruldu, yok” düğmesine basın." /> : (
          <div className="max-h-[62vh] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Parça</th><th className="text-right">Soruldu</th><th className="text-right">Adet</th><th className="text-right">Şu anki stok</th><th className="text-right">Son</th></tr></thead>
              <tbody>{liste.map((g) => { const u = g.urunId ? urun.get(g.urunId) : null; return [
                <tr key={g.anahtar} className="cursor-pointer" onClick={() => setAcik(acik === g.anahtar ? null : g.anahtar)}>
                  <td><div className="font-medium">{u ? <UrunLink id={u.id}>{u.ad}</UrunLink> : g.ad}</div>
                    <div className="text-xs text-slate-500">{u ? [u.kod, u.marka].filter(Boolean).join(' · ') : <span className="rozet bg-amber-50 text-amber-800">kartı yok · aranan: {g.kayitlar[0].metin}</span>}{g.kisiler.size ? ` · ${[...g.kisiler].join(', ')}` : ''}</div></td>
                  <td className={`text-right text-base font-bold ${g.kez >= 3 ? 'text-red-600' : g.kez >= 2 ? 'text-amber-700' : ''}`}>{g.kez}</td>
                  <td className="text-right">{sayi(g.adet)}</td>
                  <td className="text-right">{u ? <><span className={u.stok > 0 ? 'text-emerald-700' : 'text-red-600'}>{sayi(u.stok)}</span>{depolar.length > 1 && <div className="text-[10px] text-slate-400">{depolar.map((dp) => `${depoKisa(dp.ad)} ${sayi(harita.get(u.id)?.get(dp.id) ?? 0)}`).join(' · ')}</div>}</> : '—'}</td>
                  <td className="text-right text-xs text-slate-500">{tarihSaat(g.son)}</td>
                </tr>,
                acik === g.anahtar && <tr key={g.anahtar + 'd'}><td colSpan={5} className="bg-slate-50 dark:bg-slate-800/40">
                  <div className="mb-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {mode === 'bulut' && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setOmQ(omQ?.anahtar === g.anahtar ? null : { anahtar: g.anahtar, q: u?.kod?.replace(/^[A-Z]{2,4}-/, '') || g.kayitlar[0].metin })}><Search size={13} /> Otomarmara'da ara</button>}
                    {u && izin('urun') && !(u.kritik_stok > 0) && <button className="btn-ghost px-2 py-1 text-xs text-emerald-700" title="Kritik stok 1 yapılır; ürün Kritik Stok & Alınacaklar listesine düşer" onClick={() => calistir(() => backend.update('urunler', u.id, { kritik_stok: 1 }), `${u.ad}: kritik stok 1 yapıldı, alınacaklara düştü`)}>Rafa koy (alınacaklara ekle)</button>}
                    {u && u.kritik_stok > 0 && <span className="rozet bg-emerald-50 text-emerald-700">kritik stok {sayi(u.kritik_stok)} · alınacaklarda</span>}
                  </div>
                  {omQ?.anahtar === g.anahtar && <div className="mb-2" onClick={(e) => e.stopPropagation()}><OtomarmaraArama q={omQ.q} oto maliyet={izin('maliyet')} /></div>}
                  <div className="space-y-1 text-xs">{g.kayitlar.sort((a, b) => b.zaman.localeCompare(a.zaman)).map((r) => (
                    <div key={r.id} className="flex items-center gap-2"><span className="w-32 text-slate-500">{tarihSaat(r.zaman)}</span><span className="flex-1">“{r.metin}”{r.adet > 1 ? ` · ${r.adet} adet` : ''}{r.kullanici ? ` · ${r.kullanici}` : ''}</span>
                      {izin('urun') && <button className="rounded p-1 text-slate-400 hover:text-red-600" title="Kaydı sil" onClick={(e) => { e.stopPropagation(); sil(r); }}><Trash2 size={13} /></button>}</div>))}</div>
                </td></tr>,
              ]; })}</tbody>
            </table>
          </div>)}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Aynı ürün kartına bağlı sorular birleşir; kartı olmayan parçalar aranan yazıya göre gruplanır. Birkaç kez sorulup stokta olmayan parçalar rafa konmaya adaydır. Kayıtlar yalnız bu sitede tutulur.</p>
    </div>
  );
}

/* ───────────────────────── Teklif takibi ───────────────────────── */

type TeklifFiltre = 'acik' | 'satildi' | 'kaybedildi' | 'hepsi';

export function TeklifTakip() {
  const { db, calistir } = useStore();
  const [gun, setGun] = useState(30);
  const [kayit, setKayit] = useState<FiyatTeklifi[] | null>(null);
  const [yuk, setYuk] = useState(false);
  const [f, setF] = useState<TeklifFiltre>('acik');
  const [q, setQ] = useState('');
  const oku = async () => { setYuk(true); try { setKayit(await backend.teklifOku(gun)); } catch (e) { toast(`Okunamadı: ${(e as Error).message}`, 'hata'); } finally { setYuk(false); } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { oku(); }, [gun]);
  // teklif verilen ürünlerden biri teklif tarihinden sonraki 14 gün içinde satıldıysa "satılmış görünüyor"
  const tespit = useMemo(() => {
    const m = new Map<number, { tarih: string; cari: string | null; adet: number }>(); if (!kayit) return m;
    const satis = new Map<string, { tarih: string; cari: string | null }[]>();
    for (const h of db.hareketler) if (h.tur === 'satis' && !h.yok_say) { const l = satis.get(h.urun_id) ?? []; l.push({ tarih: h.tarih, cari: h.cari_ad ?? null }); satis.set(h.urun_id, l); }
    for (const t of kayit) {
      const bas = new Date(t.zaman).getTime(); let bulunan: { tarih: string; cari: string | null } | null = null; let adet = 0;
      for (const k of t.kalemler) { const s = (satis.get(k.urun_id) ?? []).find((x) => { const z = new Date(x.tarih).getTime(); return z >= bas - 36e5 && z <= bas + 14 * 864e5; }); if (s) { adet++; if (!bulunan) bulunan = s; } }
      if (bulunan) m.set(t.id, { ...bulunan, adet });
    }
    return m;
  }, [db.hareketler, kayit]);
  const durumAyarla = (t: FiyatTeklifi, durum: FiyatTeklifi['durum']) => calistir(async () => {
    await backend.teklifGuncelle(t.id, { durum, durum_zaman: new Date().toISOString() }); setKayit((k) => (k ?? []).map((x) => (x.id === t.id ? { ...x, durum, durum_zaman: new Date().toISOString() } : x)));
  }, durum === 'satildi' ? 'Satışa döndü olarak işaretlendi' : durum === 'kaybedildi' ? 'Kaybedildi olarak işaretlendi' : 'Açık olarak işaretlendi');
  const tum = kayit ?? [];
  const liste = tum.filter((t) => (f === 'hepsi' || t.durum === f) && ara(q, t.musteri, t.arac, t.kullanici, ...t.kalemler.map((k) => k.ad)));
  const say = (d: FiyatTeklifi['durum']) => tum.filter((t) => t.durum === d).length;
  const kapanan = say('satildi') + say('kaybedildi');
  const tekrarMetin = (t: FiyatTeklifi) => [`*${db.ayarlar.firma_adi}* — Fiyat teklifi (${tarih(t.zaman)})`, ...(t.musteri ? [`Sayın ${t.musteri}`] : []), ...(t.arac ? [`Araç: ${t.arac}`] : []), '',
    ...t.kalemler.map((k) => `• ${k.ad}${k.marka ? ` (${k.marka})` : ''}${k.ekonomik ? ' — ekonomik seçenek' : ''}: ${k.adet > 1 ? `${sayi(k.adet)} × ` : ''}${para(k.fiyat)}`), '', `*Toplam: ${para(t.toplam)}* (KDV dahil)`].join('\n');
  const fBtn = (k: TeklifFiltre, ad: string, n: number) => <button key={k} onClick={() => setF(k)} className={`rounded-full px-3 py-1.5 text-sm ${f === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{ad} <span className="opacity-60">{n}</span></button>;
  return (
    <div>
      <SayfaBaslik baslik="Teklif Takibi" alt="Ürün Ara'dan verilen fiyat teklifleri · satışa döndü mü?">
        <select className="inp w-36" value={gun} onChange={(e) => setGun(Number(e.target.value))}>{[7, 30, 90, 365].map((n) => <option key={n} value={n}>Son {n} gün</option>)}</select>
        <button className="btn-ghost" onClick={oku} disabled={yuk}><RefreshCw size={16} className={yuk ? 'animate-spin' : ''} /> Yenile</button>
      </SayfaBaslik>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Verilen teklif" deger={sayi(tum.length)} alt={para(tum.reduce((t, x) => t + x.toplam, 0))} />
        <Kpi etiket="Satışa dönen" deger={sayi(say('satildi'))} alt={para(tum.filter((t) => t.durum === 'satildi').reduce((s, t) => s + t.toplam, 0))} renk="green" />
        <Kpi etiket="Dönüş oranı" deger={kapanan ? `%${((say('satildi') / kapanan) * 100).toFixed(0)}` : '—'} alt="Satıldı ÷ (satıldı + kaybedildi)" renk="blue" />
        <Kpi etiket="Açık teklif" deger={sayi(say('acik'))} alt={`${tum.filter((t) => t.durum === 'acik' && tespit.has(t.id)).length} tanesi satılmış görünüyor`} renk="amber" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {fBtn('acik', 'Açık', say('acik'))}{fBtn('satildi', 'Satışa döndü', say('satildi'))}{fBtn('kaybedildi', 'Kaybedildi', say('kaybedildi'))}{fBtn('hepsi', 'Tümü', tum.length)}
        <input className="inp ml-auto max-w-xs" placeholder="Müşteri, araç, parça…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {kayit === null ? <div className="card p-6 text-center text-sm text-slate-500">Yükleniyor…</div> : liste.length === 0 ? <div className="card"><Bos metin="Teklif yok. Ürün Ara'da “+ Teklif” ile parça ekleyip gönderdiğinizde burada görünür." /></div> : (
        <div className="space-y-2">{liste.map((t) => { const z = tespit.get(t.id); const gun = Math.floor((Date.now() - new Date(t.zaman).getTime()) / 864e5); return (
          <div key={t.id} className="card p-3">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.musteri || 'İsimsiz müşteri'}{t.arac ? <span className="font-normal text-slate-500"> · {t.arac}</span> : ''}</div>
                <div className="text-xs text-slate-500">{tarihSaat(t.zaman)} · {gun === 0 ? 'bugün' : `${gun} gün önce`}{t.kullanici ? ` · ${t.kullanici}` : ''}</div>
              </div>
              <div className="text-right"><div className="text-lg font-bold">{para(t.toplam)}</div>
                <span className={`rozet ${t.durum === 'satildi' ? 'bg-emerald-100 text-emerald-800' : t.durum === 'kaybedildi' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>{t.durum === 'satildi' ? 'satışa döndü' : t.durum === 'kaybedildi' ? 'kaybedildi' : 'açık'}</span></div>
            </div>
            <ul className="mt-2 space-y-0.5 text-sm">{t.kalemler.map((k, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{k.ad}{k.marka ? <span className="text-slate-400"> · {k.marka}</span> : ''}{k.ekonomik ? <span className="ml-1 rozet bg-sky-50 text-sky-700">ekonomik</span> : ''}</span><span className="shrink-0">{k.adet > 1 ? `${sayi(k.adet)} × ` : ''}{para(k.fiyat)}</span></li>)}</ul>
            {t.durum === 'acik' && z && <div className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">Satılmış görünüyor: {z.adet}/{t.kalemler.length} parça {tarih(z.tarih)} tarihinde satıldı{z.cari ? ` (${z.cari})` : ''}.</div>}
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              {t.durum !== 'satildi' && <button className="btn-ghost px-2 py-1 text-xs text-emerald-700" onClick={() => durumAyarla(t, 'satildi')}>Satışa döndü</button>}
              {t.durum !== 'kaybedildi' && <button className="btn-ghost px-2 py-1 text-xs text-slate-500" onClick={() => durumAyarla(t, 'kaybedildi')}>Kaybedildi</button>}
              {t.durum !== 'acik' && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => durumAyarla(t, 'acik')}>Açığa al</button>}
              <a className="btn-ghost px-2 py-1 text-xs" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(tekrarMetin(t))}`}><MessageCircle size={13} /> Tekrar gönder</a>
            </div>
          </div>); })}</div>)}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Teklif; Ürün Ara'daki teklif kutusunda Kaydet, Yazdır veya WhatsApp'a basınca kaydedilir. Teklifteki parçalardan biri sonraki 14 gün içinde satıldıysa "satılmış görünüyor" yazar (kime satıldığı kontrol edilmeli); kesinleştirmek için "Satışa döndü" deyin.</p>
    </div>
  );
}
