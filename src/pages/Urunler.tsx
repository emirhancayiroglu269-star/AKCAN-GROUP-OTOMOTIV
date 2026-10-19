import { useMemo, useState } from 'react';
import { Download, History, KeyRound, Link2, Pencil, Tag } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend } from '../lib/backend';
import { kodNorm, para, parse, sayi, tarihSaat } from '../lib/format';
import type { Urun } from '../lib/types';
import { Alan, Bos, Kpi, Modal, SayfaBaslik } from '../components/ui';
import { aktifDepolar, stokHaritasi } from '../lib/depo';
import { kodHaritasi, urunAra } from '../lib/kod';
import { birimKar, hareketTutar, stokluMu, kritikAltinda } from '../lib/analiz';
import { EtiketModal, type EtiketKalem } from '../components/StokAraclari';
import { Plus, X } from 'lucide-react';
import { UrunLink } from '../components/DetayKart';

export default function Urunler() {
  const { db, izin } = useStore();
  const yonet = izin('urun'), maliyetGor = izin('maliyet');
  const [q, setQ] = useState('');
  const [kat, setKat] = useState('');
  const [filtre, setFiltre] = useState<'hepsi' | 'stoklu' | 'kritik' | 'biten' | 'pasif'>('hepsi');
  const [duzen, setDuzen] = useState<Urun | null>(null);
  const [gecmis, setGecmis] = useState<Urun | null>(null);
  const [etiket, setEtiket] = useState<EtiketKalem[] | null>(null);
  const [kodIce, setKodIce] = useState(false);
  const [gosterilen, setGosterilen] = useState(200);

  const depolar = aktifDepolar(db);
  const harita = useMemo(() => stokHaritasi(db), [db]);
  const kategoriler = useMemo(() => Array.from(new Set(db.urunler.map((u) => u.kategori).filter(Boolean))).sort() as string[], [db.urunler]);
  const kodlar = useMemo(() => kodHaritasi(db), [db]);
  const liste = useMemo(() => {
    const aday = q.trim() ? urunAra(db, q, kodlar, { sadeceAktif: false }).map((x) => x.urun) : [...db.urunler].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
    return aday.filter((u) => (filtre === 'pasif' ? !u.aktif : u.aktif) && (filtre !== 'stoklu' || u.stok > 0) && (filtre !== 'biten' || (u.stok <= 0 && stokluMu(u))) &&
      (filtre !== 'kritik' || kritikAltinda(u)) && (!kat || u.kategori === kat));
  }, [db, q, kodlar, filtre, kat]);

  const aktifler = db.urunler.filter((u) => u.aktif);
  const stoklu = aktifler.filter((u) => u.stok > 0);
  const csvIndir = () => {
    const satir = (a: (string | number | null | undefined)[]) => a.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';');
    const csv = [satir(['Kod', 'Barkod', 'Ad', 'Marka', 'Kategori', 'Birim', 'Alış', 'Satış', 'Marj % (KDV hariç)', 'KDV', 'Stok', ...depolar.map((d) => d.ad), 'Kritik', 'Raf']),
      ...liste.map((u) => satir([u.kod, u.barkod, u.ad, u.marka, u.kategori, u.birim, u.alis_fiyati, u.satis_fiyati, birimKar(u, db.ayarlar).marj.toFixed(1), u.kdv, u.stok, ...depolar.map((d) => harita.get(u.id)?.get(d.id) ?? 0), u.kritik_stok, u.raf]))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'urunler.csv'; a.click();
  };

  return (
    <div>
      <SayfaBaslik baslik="Ürünler & Stok" alt={`${sayi(aktifler.length)} aktif ürün · BizimHesap'tan birkaç dakikada bir güncellenir`}>
        <button className="btn-ghost" onClick={() => setEtiket([])}><Tag size={16} /> Etiket yazdır</button>
        {yonet && <button className="btn-ghost" onClick={() => setKodIce(true)}><KeyRound size={16} /> OEM kodları yükle</button>}
        {maliyetGor && <button className="btn-ghost" onClick={csvIndir}><Download size={16} /> Excel (CSV)</button>}
      </SayfaBaslik>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button className="text-left" onClick={() => setFiltre('stoklu')}><Kpi etiket="Stoktaki ürün çeşidi" deger={sayi(stoklu.length)} alt={`${sayi(stoklu.reduce((t, u) => t + u.stok, 0))} adet`} /></button>
        <Kpi etiket="Stoğun satış değeri" deger={para(stoklu.reduce((t, u) => t + u.stok * u.satis_fiyati, 0))} renk="blue" />
        {maliyetGor ? <Kpi etiket={`Stok maliyeti (${db.ayarlar.alis_kdv_haric ? 'KDV hariç' : 'KDV dahil'})`} deger={para(stoklu.reduce((t, u) => t + u.stok * u.alis_fiyati, 0))} renk="green" /> : <Kpi etiket="Kategori" deger={sayi(kategoriler.length)} />}
        <button className="text-left" onClick={() => setFiltre('biten')}><Kpi etiket="Stoğu biten" deger={sayi(aktifler.filter((u) => u.stok <= 0 && stokluMu(u)).length)} renk="amber" alt="İşçilik/hizmet hariç · listelemek için tıklayın" /></button>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-sm" placeholder="Ad, kod, barkod, marka, raf veya OEM / muadil kodu…" value={q} onChange={(e) => { setQ(e.target.value); setGosterilen(200); }} autoFocus />
          <select className="inp w-44" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Tüm kategoriler</option>{kategoriler.map((k) => <option key={k}>{k}</option>)}</select>
          <select className="inp w-40" value={filtre} onChange={(e) => setFiltre(e.target.value as typeof filtre)}><option value="hepsi">Aktif ürünler</option><option value="stoklu">Stoktakiler</option><option value="biten">Stoğu bitenler</option><option value="kritik">Kritik stok</option><option value="pasif">Pasif ürünler</option></select>
          <span className="ml-auto text-xs text-slate-500">{sayi(liste.length)} sonuç</span>
        </div>
        <div className="max-h-[65vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Ürün bulunamadı." /> : (
            <table className="tbl">
              <thead><tr><th>Kod</th><th>Ürün</th><th>Marka</th><th>Raf</th>{maliyetGor && <th className="text-right">Alış</th>}<th className="text-right">Satış</th>{maliyetGor && <th className="text-right">Marj</th>}{depolar.length > 1 && depolar.map((d) => <th key={d.id} className="text-right">{d.ad}</th>)}<th className="text-right">{depolar.length > 1 ? 'Toplam' : 'Stok'}</th><th className="w-24" /></tr></thead>
              <tbody>
                {liste.slice(0, gosterilen).map((u) => {
                  const bk = birimKar(u, db.ayarlar);
                  return (
                    <tr key={u.id}>
                      <td className="font-mono text-xs text-slate-500">{u.kod}<div>{u.barkod}</div></td>
                      <td><div className="flex items-center gap-1 font-medium"><UrunLink id={u.id}>{u.ad}</UrunLink>{u.bh_id && <span title="BizimHesap'tan eşitleniyor"><Link2 size={13} className="text-sky-500" /></span>}</div><div className="text-xs text-slate-500">{u.kategori}{kodlar.get(u.id)?.length ? <span className="ml-1.5 rozet bg-sky-50 text-sky-700" title={kodlar.get(u.id)!.map((k) => k.kod).join(', ')}>{kodlar.get(u.id)!.length} OEM/muadil</span> : null}</div></td>
                      <td>{u.marka}</td><td>{u.raf}</td>
                      {maliyetGor && <td className="text-right">{u.alis_fiyati ? <>{para(u.alis_fiyati)}{u.kart_alis ? <div className="text-[10px] text-sky-700" title={`Kartta ${para(u.kart_alis)} yazıyor; ${u.alis_fatura?.tarih} tarihli faturanın net fiyatı kullanılıyor`}>fatura fiyatı</div> : null}</> : <span className="text-slate-300">—</span>}</td>}<td className="text-right font-medium">{para(u.satis_fiyati)}</td>
                      {maliyetGor && <td className={`text-right ${bk.maliyetYok ? 'text-slate-300' : bk.marj < 0 ? 'text-red-600' : bk.marj < 15 ? 'text-amber-600' : 'text-slate-500'}`}>{bk.maliyetYok ? '—' : `%${bk.marj.toFixed(0)}`}</td>}
                      {depolar.length > 1 && depolar.map((d) => { const m = harita.get(u.id)?.get(d.id) ?? 0; return <td key={d.id} className={`text-right ${m < 0 ? 'text-red-600' : m === 0 ? 'text-slate-300' : ''}`}>{sayi(m)}</td>; })}
                      <td className="text-right"><span className={`rozet ${u.stok <= 0 ? 'bg-red-100 text-red-700' : kritikAltinda(u) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{sayi(u.stok)} {u.birim}</span></td>
                      <td>
                        <div className="flex justify-end gap-1 text-slate-400">
                          <button title="Etiket yazdır" className="rounded p-1 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-slate-800" onClick={() => setEtiket([{ urun: u, adet: 1 }])}><Tag size={16} /></button>
                          <button title="Hareket ve fiyat geçmişi" className="rounded p-1 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800" onClick={() => setGecmis(u)}><History size={16} /></button>
                          {yonet && <button title="Kritik stok, raf, OEM kodları" className="rounded p-1 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800" onClick={() => setDuzen(u)}><Pencil size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {liste.length > gosterilen && <div className="p-3 text-center"><button className="btn-ghost text-xs" onClick={() => setGosterilen((g) => g + 300)}>Daha fazla göster ({liste.length - gosterilen} ürün daha)</button></div>}
        </div>
      </div>

      {duzen && <UrunDuzen u={duzen} kapat={() => setDuzen(null)} />}
      {gecmis && <UrunGecmis u={gecmis} kapat={() => setGecmis(null)} />}
      {etiket && <EtiketModal baslangic={etiket} kapat={() => setEtiket(null)} />}
      <KodIceAktar acik={kodIce} kapat={() => setKodIce(false)} />
    </div>
  );
}

/** Yalnızca programa ait alanlar: kritik stok ve raf (ad, fiyat, stok BizimHesap'tan gelir) */
function UrunDuzen({ u, kapat }: { u: Urun; kapat: () => void }) {
  const { calistir } = useStore();
  const [kritik, setKritik] = useState(String(u.kritik_stok || ''));
  const [raf, setRaf] = useState(u.raf ?? '');
  const kaydet = async () => {
    const ok = await calistir(() => backend.update<Urun>('urunler', u.id, { kritik_stok: parse(kritik), raf: raf.trim() || null }), 'Kaydedildi');
    if (ok !== undefined) kapat();
  };
  return (
    <Modal acik kapat={kapat} baslik={u.ad} genis="lg" alt={<><button className="btn-ghost" onClick={kapat}>Vazgeç</button><button className="btn-primary" onClick={kaydet}>Kaydet</button></>}>
      <div className="mb-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">Ad, kod, barkod, fiyat ve stok BizimHesap'tan gelir; onları BizimHesap'ta değiştirin. Buradaki alanlar sadece bu programda tutulur.</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Alan etiket="Kritik stok seviyesi"><input className="inp" autoFocus value={kritik} onChange={(e) => setKritik(e.target.value)} placeholder="ör. 3" /></Alan>
        <Alan etiket="Raf / konum"><input className="inp" value={raf} onChange={(e) => setRaf(e.target.value)} /></Alan>
      </div>
      <KodYonetimi urunId={u.id} />
    </Modal>
  );
}

function UrunGecmis({ u, kapat }: { u: Urun; kapat: () => void }) {
  const { db, izin } = useStore();
  const h = db.hareketler.filter((x) => x.urun_id === u.id).sort((p, r) => r.tarih.localeCompare(p.tarih));
  const f = db.fiyat_gecmisi.filter((x) => x.urun_id === u.id);
  const maliyetGor = izin('maliyet');
  return (
    <Modal acik kapat={kapat} baslik={`Geçmiş — ${u.ad}`} genis="lg">
      <h4 className="mb-2 text-sm font-semibold">Satış / alış hareketleri</h4>
      {h.length === 0 ? <Bos metin="Takip başladığından beri hareket yok." /> : (
        <div className="max-h-72 overflow-auto"><table className="tbl"><thead><tr><th>Tarih</th><th>Tür</th><th className="text-right">Miktar</th><th className="text-right">Stok</th><th className="text-right">Tutar</th></tr></thead>
          <tbody>{h.map((x) => <tr key={x.id} className={x.yok_say ? 'opacity-40' : ''}><td>{tarihSaat(x.tarih)}</td><td>{x.tur === 'satis' ? 'Satış' : 'Alış'}{x.yok_say ? ' (hesap dışı)' : ''}</td>
            <td className="text-right">{x.tur === 'satis' ? '−' : '+'}{sayi(x.miktar)}</td><td className="text-right text-slate-500">{x.onceki != null ? `${sayi(x.onceki)} → ${sayi(x.sonraki ?? 0)}` : ''}</td>
            <td className="text-right">{x.tur === 'satis' ? para(hareketTutar(x, db.ayarlar).ciro) : maliyetGor ? para(x.miktar * x.alis_fiyati) : ''}</td></tr>)}</tbody></table></div>
      )}
      {maliyetGor && <>
        <h4 className="mb-2 mt-5 text-sm font-semibold">Fiyat değişimleri</h4>
        {f.length === 0 ? <Bos metin="Takip başladığından beri fiyat değişmedi." /> : (
          <table className="tbl"><thead><tr><th>Tarih</th><th className="text-right">Alış</th><th className="text-right">Satış</th></tr></thead>
            <tbody>{f.map((x) => <tr key={x.id}><td>{tarihSaat(x.tarih)}</td><td className="text-right">{x.alis_eski !== x.alis_yeni ? <>{para(x.alis_eski)} → <b>{para(x.alis_yeni)}</b></> : para(x.alis_yeni)}</td>
              <td className="text-right">{x.satis_eski !== x.satis_yeni ? <>{para(x.satis_eski)} → <b>{para(x.satis_yeni)}</b></> : para(x.satis_yeni)}</td></tr>)}</tbody></table>
        )}
      </>}
    </Modal>
  );
}

/** Ürün kartında OEM / muadil kodlar (anında kaydedilir; BizimHesap eşitlemesi bunlara dokunmaz) */
function KodYonetimi({ urunId }: { urunId: string }) {
  const { db, calistir } = useStore();
  const [kod, setKod] = useState('');
  const [tur, setTur] = useState<'OEM' | 'Muadil'>('OEM');
  const liste = db.urun_kodlari.filter((k) => k.urun_id === urunId);
  const ekle = async () => {
    const parcalar = kod.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    if (!parcalar.length) return;
    for (const p of parcalar) {
      if (liste.some((k) => kodNorm(k.kod) === kodNorm(p))) continue;
      await backend.insert('urun_kodlari', { urun_id: urunId, kod: p, tur });
    }
    await calistir(async () => true, parcalar.length > 1 ? `${parcalar.length} kod eklendi` : 'Kod eklendi');
    setKod('');
  };
  return (
    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><KeyRound size={15} /> OEM / muadil kodlar</div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {liste.length === 0 && <span className="text-xs text-slate-400">Henüz kod yok. Satış ekranında bu kodlarla da arama yapılabilir.</span>}
        {liste.map((k) => (
          <span key={k.id} className={`rozet gap-1 py-1 ${k.tur === 'Muadil' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
            <span className="opacity-60">{k.tur}</span> {k.kod}
            <button className="opacity-60 hover:opacity-100" title="Sil" onClick={() => calistir(() => backend.remove('urun_kodlari', k.id), 'Kod silindi')}><X size={12} /></button>
          </span>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ekle(); }}>
        <select className="inp w-28" value={tur} onChange={(e) => setTur(e.target.value as 'OEM' | 'Muadil')}><option>OEM</option><option>Muadil</option></select>
        <input className="inp" placeholder="Kod yazın (virgülle birden fazla: 4246.R1, 1611186880)" value={kod} onChange={(e) => setKod(e.target.value)} />
        <button className="btn-ghost shrink-0" type="submit"><Plus size={16} /> Ekle</button>
      </form>
    </div>
  );
}

/** Excel'den yapıştırarak toplu OEM/muadil kod yükleme */
function KodIceAktar({ acik, kapat }: { acik: boolean; kapat: () => void }) {
  const { calistir } = useStore();
  const [metin, setMetin] = useState('');
  const [tur, setTur] = useState<'OEM' | 'Muadil'>('OEM');
  const [bekle, setBekle] = useState(false);
  const satirlar = metin.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const [anahtar, ...geri] = s.split(/\t|;/);
    return { anahtar: (anahtar ?? '').replace(/^"|"$/g, '').trim(), kodlar: geri.join(',').split(/[,|/]/).map((x) => x.replace(/^"|"$/g, '').trim()).filter(Boolean), tur };
  }).filter((r) => r.anahtar && r.kodlar.length && !/^(barkod|kod|stok)/i.test(r.anahtar));
  const yukle = async () => {
    setBekle(true);
    const r = await calistir(() => backend.urunKodlariYukle(satirlar));
    setBekle(false);
    if (r && r !== true) { toast(`${r.eklenen} kod eklendi${r.bulunamayan ? `, ${r.bulunamayan} satırın ürünü bulunamadı` : ''}`); setMetin(''); kapat(); }
  };
  return (
    <Modal acik={acik} kapat={kapat} baslik="OEM / muadil kodları toplu yükle" genis="lg"
      alt={<><button className="btn-ghost" onClick={kapat}>Vazgeç</button><button className="btn-primary" disabled={!satirlar.length || bekle} onClick={yukle}>{bekle ? 'Yükleniyor…' : `${satirlar.length} ürüne kod ekle`}</button></>}>
      <p className="mb-2 text-sm text-slate-500">Excel'den iki sütun kopyalayıp yapıştırın: <b>barkod veya stok kodu</b> ve <b>kodlar</b> (birden fazla kod virgülle ayrılabilir).</p>
      <code className="mb-3 block rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">2472626667741 ; 4246.R1, 1611186880<br />MYS-PS9830305 ; G16736, 335808</code>
      <div className="mb-2 flex items-center gap-2 text-sm"><span className="text-slate-500">Kod türü:</span>
        <select className="inp w-32" value={tur} onChange={(e) => setTur(e.target.value as 'OEM' | 'Muadil')}><option>OEM</option><option>Muadil</option></select>
      </div>
      <textarea className="inp h-56 font-mono text-xs" value={metin} onChange={(e) => setMetin(e.target.value)} placeholder={'2472626667741\t4246.R1, 1611186880'} />
      <p className="mt-2 text-xs text-slate-500">Aynı ürüne aynı kod iki kez eklenmez. Boşluk, nokta ve tire farkları aynı kod sayılır.</p>
    </Modal>
  );
}
