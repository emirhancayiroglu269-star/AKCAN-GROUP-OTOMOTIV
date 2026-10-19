import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck, Check, ChevronDown, HandCoins, Info, MessageCircle, NotebookPen, Phone, Target, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { gunu, para, parse, tarih, tarihSaat, telLink } from '../lib/format';
import { haftalikTahsilat, MESAJLAR, tahsilatDisiListe, tahsilatListesi, type TahsilatDurum, type TahsilatSatir } from '../lib/tahsilat';
import type { TahsilatNot } from '../lib/types';
import { MusteriLink } from '../components/DetayKart';
import { Alan, Bos, Kpi, Modal, SayfaBaslik } from '../components/ui';

const DURUM: Record<TahsilatDurum, { ad: string; cls: string }> = {
  soz_gecti: { ad: 'Söz verdiği gün geçti', cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  soz_bugun: { ad: 'Bugün ödeyecek', cls: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  aranacak: { ad: 'Aranacak', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  soz_bekleniyor: { ad: 'Söz verdi, bekleniyor', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  yeni_arandi: { ad: 'Son 3 günde görüşüldü', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};
const TUR_AD: Record<TahsilatNot['tur'], string> = { not: 'Not', arama: 'Arandı', mesaj: 'Mesaj atıldı', soz: 'Ödeme sözü' };
type Form = { s: TahsilatSatir; tur: 'not' | 'arama' | 'soz' } | null;

export default function Tahsilat() {
  const { db, personel, calistir } = useStore();
  const liste = useMemo(() => tahsilatListesi(db), [db]);
  const hafta = useMemo(() => haftalikTahsilat(db), [db]);
  const disi = useMemo(() => tahsilatDisiListe(db), [db]);
  const [filtre, setFiltre] = useState<'bugun' | 'hepsi'>('bugun');
  const [acik, setAcik] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [metin, setMetin] = useState(''); const [sozTarih, setSozTarih] = useState(gunu()); const [sozTutar, setSozTutar] = useState('');
  const [hedefGir, setHedefGir] = useState(String(db.ayarlar.tahsilat_hedef || ''));
  const hedef = db.ayarlar.tahsilat_hedef || 0;
  const firma = db.ayarlar.firma_adi;
  const toplam = liste.reduce((t, x) => t + x.tutar, 0);
  const bugunListe = liste.filter((x) => x.durum === 'soz_gecti' || x.durum === 'soz_bugun' || x.durum === 'aranacak');
  const gosterilen = filtre === 'bugun' ? bugunListe : liste;
  const bugunSoz = liste.filter((x) => x.durum === 'soz_bugun' || x.durum === 'soz_gecti').reduce((t, x) => t + (x.acikSoz?.soz_tutar ?? x.tutar), 0);
  const riskli = liste.filter((x) => x.son14Satis > 0);

  const notEkle = (row: Partial<TahsilatNot> & { cari: string; tur: TahsilatNot['tur'] }, mesaj?: string) => calistir(() => backend.insert<Partial<TahsilatNot>>('tahsilat_notlari', { kullanici: personel, ...row }), mesaj);
  const formAc = (s: TahsilatSatir, tur: 'not' | 'arama' | 'soz') => { setForm({ s, tur }); setMetin(''); setSozTarih(gunu(new Date(Date.now() + 2 * 864e5))); setSozTutar(String(Math.round(s.tutar))); };
  const formKaydet = async () => {
    if (!form) return;
    const { s, tur } = form;
    if (tur === 'soz' && (!sozTarih || !(parse(sozTutar) > 0))) return;
    await notEkle({ cari: s.cari, cari_guid: s.cari_guid, tur, metin: metin.trim() || null, ...(tur === 'soz' ? { soz_tarih: sozTarih, soz_tutar: parse(sozTutar), durum: 'acik' as const } : {}) }, tur === 'soz' ? 'Ödeme sözü kaydedildi' : 'Kaydedildi');
    setForm(null);
  };
  const sozGuncelle = (n: TahsilatNot, durum: 'tutuldu' | 'tutulmadi') => calistir(() => backend.update<TahsilatNot>('tahsilat_notlari', n.id, { durum }), durum === 'tutuldu' ? 'Söz tutuldu olarak işaretlendi' : 'Söz tutulmadı olarak işaretlendi');
  const wa = (s: TahsilatSatir, tip: keyof typeof MESAJLAR) => {
    const ad = s.cari.split('/')[0].trim(); const m = MESAJLAR[tip](ad, para(s.tutar), firma);
    notEkle({ cari: s.cari, cari_guid: s.cari_guid, tur: 'mesaj', metin: tip === 'kibar' ? 'WhatsApp: kibar hatırlatma' : tip === 'ikinci' ? 'WhatsApp: ikinci hatırlatma' : 'WhatsApp: ödeme planı teklifi' });
    window.open(`https://wa.me/${telLink(s.telefon) ?? ''}?text=${encodeURIComponent(m)}`, '_blank');
  };

  return (
    <div className="max-w-6xl">
      <SayfaBaslik baslik="Tahsilat Takip" alt="Vadesi geçen alacaklar için günlük arama listesi, ödeme sözleri ve hazır hatırlatma mesajları" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Vadesi geçen alacak" deger={para(toplam)} alt={`${liste.length} müşteri`} ikon={<HandCoins size={16} />} renk="red" />
        <Kpi etiket="Bugün ilgilenilecek" deger={bugunListe.length} alt={`${liste.filter((x) => x.durum === 'soz_gecti').length} kişinin sözü geçti`} ikon={<Phone size={16} />} renk="amber" />
        <Kpi etiket="Bugün/geçmiş vadeli sözler" deger={para(bugunSoz)} alt={`${liste.filter((x) => x.durum === 'soz_bekleniyor').length} söz ileri tarihli`} ikon={<CalendarCheck size={16} />} />
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>Bu hafta tahsilat</span><Target size={16} /></div>
          <div className="mt-2 text-2xl font-bold">{para(hafta.toplam)}</div>
          {hedef > 0 && <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-marka-500" style={{ width: `${Math.min(100, (hafta.toplam / hedef) * 100)}%` }} /></div>}
          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">Hedef <input className="inp w-24 px-1.5 py-0.5 text-xs" inputMode="decimal" value={hedefGir} onChange={(e) => setHedefGir(e.target.value)} onBlur={() => parse(hedefGir) !== hedef && calistir(() => backend.ayarKaydet({ tahsilat_hedef: parse(hedefGir) }), 'Haftalık hedef kaydedildi')} placeholder="₺" />{hedef > 0 && <span>· %{((hafta.toplam / hedef) * 100).toFixed(0)}</span>}</div>
        </div>
      </div>
      {riskli.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-900 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div><b>Borcu gecikmişken almaya devam edenler:</b> {riskli.slice(0, 6).map((x) => `${x.cari.split('/')[0].trim()} (son 14 günde ${para(x.son14Satis)})`).join(', ')}{riskli.length > 6 ? ` ve ${riskli.length - 6} kişi daha` : ''}. Yeni veresiye vermeden önce tahsilat isteyin.</div>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setFiltre('bugun')} className={`rounded-full px-3 py-1 text-xs ${filtre === 'bugun' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>Bugünün listesi ({bugunListe.length})</button>
        <button onClick={() => setFiltre('hepsi')} className={`rounded-full px-3 py-1 text-xs ${filtre === 'hepsi' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>Tümü ({liste.length})</button>
        <span className="ml-auto text-xs text-slate-500">Alacak ve tahsilat verisi: {db.vadesi_gecen[0]?.yuklendi ? tarihSaat(db.vadesi_gecen[0].yuklendi) : hafta.sonKasa ? tarih(hafta.sonKasa + 'T12:00') : '—'} · güncellemek için "verileri güncelle" deyin</span>
      </div>
      {gosterilen.length === 0 ? <div className="card"><Bos metin={liste.length ? 'Bugün aranacak kimse kalmadı.' : 'Vadesi geçen alacak yok.'} /></div> : (
        <div className="space-y-2">{gosterilen.map((s, i) => {
          const ac = acik === s.cari;
          return (
            <div key={s.cari} className="card">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <div className="w-6 text-center text-xs font-semibold text-slate-400">{i + 1}</div>
                <div className="min-w-[220px] flex-1">
                  <div className="font-semibold"><MusteriLink guid={s.cari_guid} ad={s.cari} /></div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${DURUM[s.durum].cls}`}>{DURUM[s.durum].ad}</span>
                    {s.acikSoz && <span>söz: {tarih(s.acikSoz.soz_tarih + 'T12:00')} · {para(s.acikSoz.soz_tutar ?? 0)}</span>}
                    {s.tutulmayanSoz > 0 && <span className="text-red-600">{s.tutulmayanSoz} söz tutulmadı</span>}
                    {s.sonTahsilat ? <span>son ödeme {tarih(s.sonTahsilat.tarih + 'T12:00')} ({para(s.sonTahsilat.tutar)})</span> : <span>kayıtlı ödeme yok</span>}
                    {s.notlar[0] && <span className="truncate">· {TUR_AD[s.notlar[0].tur]}{s.notlar[0].metin ? `: ${s.notlar[0].metin}` : ''} ({tarih(s.notlar[0].olusturma)})</span>}
                  </div>
                </div>
                <div className="text-right"><div className="text-lg font-bold text-red-600">{para(s.tutar)}</div><div className="text-xs text-slate-500">{s.gun != null ? `${s.gun} gün gecikme` : ''}</div></div>
                <div className="flex flex-wrap gap-1.5">
                  {s.telefon && <a className="btn-ghost px-2.5 py-1.5" href={`tel:+${telLink(s.telefon)}`} title={s.telefon}><Phone size={15} /></a>}
                  <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => formAc(s, 'arama')}><Check size={14} /> Aradım</button>
                  <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => formAc(s, 'soz')}><CalendarCheck size={14} /> Söz</button>
                  <button className="btn-ghost px-2.5 py-1.5" onClick={() => setAcik(ac ? null : s.cari)} aria-label="Ayrıntı"><ChevronDown size={15} className={ac ? 'rotate-180' : ''} /></button>
                </div>
              </div>
              {ac && (
                <div className="grid gap-4 border-t border-slate-200 p-3 md:grid-cols-2 dark:border-slate-800">
                  <div>
                    <div className="mb-2 text-sm font-semibold">WhatsApp hatırlatma</div>
                    {!s.telefon && <p className="mb-2 text-xs text-amber-700">Telefon kayıtlı değil; WhatsApp numara seçmenizi isteyecek.</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <button className="btn-ghost text-xs" onClick={() => wa(s, 'kibar')}><MessageCircle size={14} /> Kibar hatırlatma</button>
                      <button className="btn-ghost text-xs" onClick={() => wa(s, 'ikinci')}><MessageCircle size={14} /> İkinci hatırlatma</button>
                      <button className="btn-ghost text-xs" onClick={() => wa(s, 'plan')}><MessageCircle size={14} /> Ödeme planı teklifi</button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-slate-500">BizimHesap bakiyesi</div><b>{s.bakiye != null ? para(s.bakiye) : '—'}</b></div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-slate-500">Son 90 gün ödemesi</div><b>{para(s.son90Tahsilat)}</b></div>
                    </div>
                    <button className="btn-ghost mt-3 text-xs" onClick={() => formAc(s, 'not')}><NotebookPen size={14} /> Not ekle</button>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-semibold">Geçmiş</div>
                    {s.notlar.length === 0 ? <div className="text-xs text-slate-400">Henüz not yok.</div> : (
                      <ul className="max-h-56 space-y-1.5 overflow-auto text-xs">{s.notlar.map((n) => (
                        <li key={n.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                          <div className="flex justify-between gap-2"><b>{TUR_AD[n.tur]}{n.tur === 'soz' && n.soz_tarih ? ` — ${tarih(n.soz_tarih + 'T12:00')}, ${para(n.soz_tutar ?? 0)}` : ''}</b><span className="text-slate-400">{tarihSaat(n.olusturma)}{n.kullanici ? ` · ${n.kullanici}` : ''}</span></div>
                          {n.metin && <div className="mt-0.5 text-slate-600 dark:text-slate-300">{n.metin}</div>}
                          {n.tur === 'soz' && (
                            (n.durum ?? 'acik') === 'acik'
                              ? <div className="mt-1.5 flex gap-1.5"><button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => sozGuncelle(n, 'tutuldu')}><Check size={12} /> Ödedi</button><button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => sozGuncelle(n, 'tutulmadi')}><X size={12} /> Ödemedi</button></div>
                              : <div className={`mt-1 font-medium ${n.durum === 'tutuldu' ? 'text-emerald-700' : 'text-red-600'}`}>{n.durum === 'tutuldu' ? 'Söz tutuldu' : 'Söz tutulmadı'}</div>
                          )}
                        </li>
                      ))}</ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}</div>
      )}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>{disi.length > 0 && <>Araç alım/satım faturası olan {disi.map((v) => `${v.cari.replace(/\s*\/\s*$/, '')} (${para(v.tutar)})`).join(', ')} carisi proje hesabı olduğu için listeye ve toplama katılmadı. </>}Sıralama: borç tutarı × gecikme süresi; sözü geçenler ve bugün ödeyecekler en üstte, son 3 günde görüşülenler ve ileri tarihli söz verenler altta. Notlar ve sözler programın kendi veritabanında tutulur, BizimHesap'a yazılmaz. Ödeme gelince BizimHesap'ta tahsilatı girin; vadesi geçen listesi ve "Bu hafta tahsilat" "verileri güncelle" ile yenilenir.</span>
      </div>

      {form && (
        <Modal acik kapat={() => setForm(null)} baslik={`${form.tur === 'soz' ? 'Ödeme sözü' : form.tur === 'arama' ? 'Arama kaydı' : 'Not'} — ${form.s.cari.split('/')[0].trim()}`}
          alt={<><button className="btn-ghost" onClick={() => setForm(null)}>Vazgeç</button><button className="btn-primary" onClick={formKaydet}>Kaydet</button></>}>
          <div className="space-y-3">
            {form.tur === 'soz' && <div className="grid grid-cols-2 gap-3">
              <Alan etiket="Ödeyeceği gün"><input type="date" className="inp" value={sozTarih} min={gunu()} onChange={(e) => setSozTarih(e.target.value)} /></Alan>
              <Alan etiket="Tutar (₺)"><input className="inp" inputMode="decimal" value={sozTutar} onChange={(e) => setSozTutar(e.target.value)} /></Alan>
              {!(parse(sozTutar) > 0) && <p className="col-span-2 text-xs text-red-600">Tutar girin.</p>}
            </div>}
            <Alan etiket={form.tur === 'arama' ? 'Görüşme notu (isteğe bağlı)' : 'Not'}><textarea className="inp" rows={3} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder={form.tur === 'arama' ? 'Ör. Açmadı / Hafta sonu arayın dedi' : ''} /></Alan>
          </div>
        </Modal>
      )}
    </div>
  );
}
