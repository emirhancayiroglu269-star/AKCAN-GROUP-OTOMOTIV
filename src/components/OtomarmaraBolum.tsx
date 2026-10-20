import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { kodNorm, sayi, tarihSaat } from '../lib/format';
import type { Urun } from '../lib/types';
import { UrunLink } from './DetayKart';
import { muadilDetay, omEslesme, MUADIL_ESIK } from '../lib/muadil';

/** Ürün kartında Otomarmara OEM / eşdeğer bilgisi ve "Otomarmara'dan getir" isteği */
export function OtomarmaraBolum({ u }: { u: Urun }) {
  const { db, calistir, mode } = useStore();
  const [hepsi, setHepsi] = useState(false);
  if (mode !== 'bulut') return null;
  const v = db.otomarmara_veri?.find((x) => String(x.urun_id) === String(u.id));
  const kodIdx = new Map(db.urunler.filter((x) => x.aktif && x.kod).map((x) => [kodNorm(x.kod), x]));
  const iste = () => calistir(() => backend.omIste([u.id]), "Otomarmara'ya istek gönderildi");
  // 12 saatlik yenileme sırasında (istendi) veya geçici hatada önceki bilgi gösterilmeye devam eder
  const veriVar = !!v && ((v.oemler?.length ?? 0) > 0 || (v.esdegerler?.length ?? 0) > 0);
  const esd = (v?.esdegerler ?? []).map((e) => ({ ...e, bizde: kodIdx.get(kodNorm(e.kod)) }));
  const bizdeki = esd.filter((e) => e.bizde).sort((a, b) => (b.bizde!.stok - a.bizde!.stok));
  // eşleşme şüpheliyse (Otomarmara'da başka bir ürün bulunmuş olabilir) OEM / eşdeğer bilgisi muadil hesabında kullanılmaz
  const eslesme = omEslesme(db, u);
  const kesin = new Set(muadilDetay(db)(u).map((x) => String(x.v.id)));
  return (
    <div className="rounded-lg border border-orange-200 p-3 dark:border-orange-500/30">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold">Otomarmara OEM / eşdeğer
        {veriVar && <span className="text-xs font-normal text-slate-500">{v!.om_kod} · {v!.durum === 'istendi' ? 'yenileniyor' : tarihSaat(v!.guncelleme!)}</span>}
        <button className="btn-ghost ml-auto px-2 py-1 text-xs" onClick={iste} disabled={v?.durum === 'istendi'}><RefreshCw size={13} /> {v ? (v.durum === 'istendi' ? 'İstendi, bekleniyor' : 'Yeniden getir') : "Otomarmara'dan getir"}</button>
      </div>
      {!v && <p className="text-xs text-slate-500">Bu ürünün OEM kodları ve eşdeğerleri henüz alınmadı.</p>}
      {v?.durum === 'istendi' && !veriVar && <p className="text-xs text-amber-700">Sırada; sunucu birkaç dakika içinde Otomarmara'dan alır. Gelmezse Ayarlar → "Otomarmara muadil / OEM servisi" bölümüne bakın.</p>}
      {v?.durum === 'bulunamadi' && <p className="text-xs text-slate-500">{v.hata ?? "Otomarmara'da bulunamadı."}</p>}
      {v?.durum === 'hata' && !veriVar && <p className="text-xs text-red-600">Hata: {v.hata}</p>}
      {veriVar && v!.hata && <p className="text-xs text-amber-700">{v!.hata}</p>}
      {veriVar && eslesme === 'supheli' && <p className="mb-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">Şüpheli eşleşme: Otomarmara'da bulunan <b>{v!.om_kod}</b> «{v!.om_ad}» bu ürünle uyuşmuyor (kod farklı, ürün adları da tutmuyor). Bu yüzden aşağıdaki OEM ve eşdeğer bilgisi muadil ve aramada kullanılmıyor.</p>}
      {veriVar && v && <div className="space-y-2 text-xs">
        <div><span className="text-slate-500">OEM ({v.oemler.length}):</span> {v.oemler.length ? v.oemler.slice(0, hepsi ? 999 : 20).join(', ') : '—'}{!hepsi && v.oemler.length > 20 && <button className="ml-1 text-marka-600 hover:underline" onClick={() => setHepsi(true)}>+{v.oemler.length - 20}</button>}</div>
        <div><span className="text-slate-500">Eşdeğer ({esd.length}, bizde kayıtlı {bizdeki.length}; ✓ = OEM ile doğrulanmış muadil, üstü çizili = doğrulanmadı):</span>
          <div className="mt-1 flex flex-wrap gap-1.5">{bizdeki.map((e) => { const ok = kesin.has(String(e.bizde!.id)); return <span key={e.kod} title={ok ? `En az ${MUADIL_ESIK} ortak OEM kodu: kesin muadil` : `Ortak OEM kodu ${MUADIL_ESIK}'den az: yalnız Otomarmara'ya göre eşdeğer, muadil sayılmıyor`} className={`rozet ${ok ? (e.bizde!.stok > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600') : 'bg-amber-50 text-amber-700 line-through decoration-amber-400/60'}`}><UrunLink id={String(e.bizde!.id)}>{e.kod}</UrunLink>&nbsp;· stok {sayi(e.bizde!.stok)}{ok ? ' ✓' : ''}</span>; })}
            {esd.filter((e) => !e.bizde).slice(0, hepsi ? 999 : 12).map((e) => <span key={e.kod} className="rozet bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" title={e.ad ?? ''}>{e.kod}</span>)}
            {!hepsi && esd.filter((e) => !e.bizde).length > 12 && <button className="text-marka-600 hover:underline" onClick={() => setHepsi(true)}>+{esd.filter((e) => !e.bizde).length - 12}</button>}</div>
        </div>
      </div>}
    </div>
  );
}
