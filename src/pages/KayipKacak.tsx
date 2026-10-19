import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { kayipAnalizi } from '../lib/analiz4';
import { para, sayi, tarih } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { MusteriLink, UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

type Sekme = 'stok' | 'zarar' | 'ucretsiz' | 'indirim' | 'tutarsiz';

export default function KayipKacak() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const [sekme, setSekme] = useState<Sekme>('stok');
  const k = useMemo(() => kayipAnalizi(db, db.ayarlar, d), [db, d]);
  const sb = (s: Sekme, ad: string, n: number) => (
    <button key={s} onClick={() => setSekme(s)} className={`rounded-full px-3 py-1.5 text-sm ${sekme === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>
      {ad} <span className="opacity-60">{n}</span>
    </button>
  );
  const pencereMetni = k.pencere ? `${tarih(k.pencere.bas + 'T12:00')} – ${tarih(k.pencere.bit + 'T12:00')}` : 'henüz yok';

  return (
    <div>
      <SayfaBaslik baslik="Kayıp-Kaçak Kontrolü" alt="Faturasız stok çıkışları, maliyetin altında satışlar, yüksek indirimler ve tutarsız stoklar" />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Faturasız stok çıkışı" deger={para(k.faturasizCikisDeger)} alt={`${k.faturasizCikis.length} ürün · maliyetle · ${pencereMetni}`} renk="red" />
        <Kpi etiket="Maliyetin altında satış" deger={para(k.zararToplam)} alt={`${k.zararli.length} satır · 0 TL'lik satırlar hariç (${para(k.ucretsizToplam)} ayrı sekmede)`} renk="red" />
        <Kpi etiket="%20+ indirimli satış" deger={para(k.indirimToplam)} alt={`${k.indirimli.length} satırda verilen indirim`} renk="amber" />
        <Kpi etiket="Tutarsız stok" deger={sayi(k.eksiStok.length + k.depoFarki.length)} alt={`${k.eksiStok.length} eksi stok · ${k.depoFarki.length} depo farkı`} renk="amber" />
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {sb('stok', 'Stok ↔ fatura farkı', k.faturasizCikis.length + k.faturasizGiris.length + k.stoktanDusmeyen.length)}
        {sb('zarar', 'Maliyetin altında satış', k.zararli.length)}
        {sb('ucretsiz', 'Ücretsiz (0 TL) çıkış', k.ucretsiz.length)}
        {sb('indirim', 'Yüksek indirim', k.indirimli.length)}
        {sb('tutarsiz', 'Eksi stok / depo farkı', k.eksiStok.length + k.depoFarki.length)}
      </div>

      {sekme === 'stok' && (
        <div className="space-y-4">
          {!k.pencere ? <div className="card"><Bos metin="Stok değişimi takibi ve fatura aktarımı aynı döneme denk gelince bu karşılaştırma başlar." /></div> : <>
            <Tablo baslik="Stoktan düşmüş ama satış faturası yok" aciklama="Sayım düzeltmesi, faturasız satış, kayıp ya da faturası sonradan kesilecek satış olabilir. Değer: alış maliyetiyle."
              bos="Faturasız stok çıkışı yok."
              satirlar={k.faturasizCikis.map((f) => ({ u: f.u, a: f.stokCikis, b: f.faturaSatis, fark: f.cikisFarki - Math.max(0, f.girisFarki), deger: f.deger }))}
              aAd="Stoktan düşen" bAd="Faturalı satış" renk="text-red-600" />
            <Tablo baslik="Stoğa girmiş ama alış faturası yok" aciklama="Sayımda fazla çıkan, iade alınan, irsaliyeyle girilip henüz faturalaşmamış ya da alış faturası girilmemiş ürünler."
              bos="Faturasız stok girişi yok."
              satirlar={k.faturasizGiris.map((f) => ({ u: f.u, a: f.stokGiris, b: f.faturaAlis, fark: f.girisFarki - Math.max(0, f.cikisFarki), deger: -f.deger }))}
              aAd="Stoğa giren" bAd="Faturalı alış" renk="text-amber-600" />
            <Tablo baslik="Faturası kesilmiş ama stoktan düşmemiş" aciklama="Satış faturası var ama stok azalmamış: yanlış ürün kartına fatura kesilmiş ya da stok elle geri eklenmiş olabilir."
              bos="Böyle bir ürün yok."
              satirlar={k.stoktanDusmeyen.map((f) => ({ u: f.u, a: f.faturaSatis, b: f.stokCikis, fark: -f.cikisFarki, deger: -f.deger }))}
              aAd="Faturalı satış" bAd="Stoktan düşen" renk="text-amber-600" />
          </>}
          {k.kapanmis.length > 0 && <p className="px-1 text-xs text-slate-500">Elle stok düzeltmesiyle kapanmış {k.kapanmis.length} ürün listelenmedi (satışı stoktan düşmemiş, sonra aynı miktar stok girişiyle denkleştirilmiş): {k.kapanmis.slice(0, 8).map((f) => f.u.kod || f.u.ad).join(', ')}{k.kapanmis.length > 8 ? '…' : ''}</p>}
          <Not>Karşılaştırma dönemi: <b>{pencereMetni}</b>. BizimHesap'ın stok değişimleri 14 Ekim'den beri takip ediliyor; bu dönem her gün uzar. Faturaların güncel olması için "Analize Aktar (otomatik)" açık olmalı. Aynı gün içinde düzeltilen kayıtlar birbirini götürür; tek tek satırlar kesin hırsızlık değil, kontrol edilecek liste olarak okunmalı.</Not>
        </div>
      )}

      {sekme === 'zarar' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h3 className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">Maliyetin altında kesilen satış satırları</h3>
            {k.zararli.length === 0 ? <Bos metin="Bu dönemde maliyetin altında satış yok." /> : (
              <div className="max-h-[60vh] overflow-auto"><table className="tbl">
                <thead><tr><th>Tarih</th><th>Ürün</th><th>Müşteri</th><th className="text-right">Adet</th><th className="text-right">Birim satış (KDV hariç)</th><th className="text-right">Birim maliyet</th><th className="text-right">Zarar</th></tr></thead>
                <tbody>{k.zararli.slice(0, 300).map((z, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap text-slate-500">{tarih(z.h.tarih)}</td>
                    <td>{z.u ? <UrunLink id={z.u.id}>{z.u.ad}</UrunLink> : z.h.urun_ad}<div className="text-xs text-slate-500">{z.h.kullanici}</div></td>
                    <td className="text-sm">{z.h.cari_guid ? <MusteriLink guid={z.h.cari_guid} ad={z.h.cari_ad ?? ''} /> : z.h.cari_ad}</td>
                    <td className="text-right">{sayi(z.h.miktar)}</td>
                    <td className="text-right">{para(z.satisNet)}</td>
                    <td className="text-right text-slate-500">{para(z.maliyetNet)}</td>
                    <td className="text-right font-semibold text-red-600">{para(z.zarar)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
          <div className="card">
            <h3 className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">Kime zararına satıldı</h3>
            {k.kimeZarar.length === 0 ? <Bos metin="—" /> : (
              <div className="max-h-[60vh] overflow-auto"><table className="tbl">
                <tbody>{k.kimeZarar.slice(0, 40).map((x) => (<tr key={x.ad}><td className="text-sm">{x.ad}<div className="text-xs text-slate-500">{x.adet} satır</div></td><td className="text-right font-medium text-red-600">{para(x.zarar)}</td></tr>))}</tbody>
              </table></div>
            )}
          </div>
          <div className="lg:col-span-3"><Not>Satırdaki maliyet, satış anında BizimHesap'ta kayıtlı alış fiyatıdır; bu fiyat son 180 gündeki alış faturasının 1,3 katından fazlaysa (kart alışı hatalı) fatura fiyatı kullanılır. 0 TL'lik satırlar ve araç alım/satım faturaları burada sayılmaz. Bilerek yapılan kampanya ve usta indirimleri de burada görünür; hata ya da yetkisiz indirim olanları ayıklamak için kullanın.</Not></div>
        </div>
      )}

      {sekme === 'ucretsiz' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h3 className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">0 TL'ye faturalanan ürünler</h3>
            {k.ucretsiz.length === 0 ? <Bos metin="Bu dönemde 0 TL'lik satış satırı yok." /> : (
              <div className="max-h-[60vh] overflow-auto"><table className="tbl">
                <thead><tr><th>Tarih</th><th>Ürün</th><th>Müşteri</th><th>Kesen</th><th className="text-right">Adet</th><th className="text-right">Maliyet</th></tr></thead>
                <tbody>{k.ucretsiz.slice(0, 300).map((z, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap text-slate-500">{tarih(z.h.tarih)}</td>
                    <td>{z.u ? <UrunLink id={z.u.id}>{z.u.ad}</UrunLink> : z.h.urun_ad}</td>
                    <td className="text-sm">{z.h.cari_guid ? <MusteriLink guid={z.h.cari_guid} ad={z.h.cari_ad ?? ''} /> : z.h.cari_ad}</td>
                    <td className="text-sm text-slate-500">{z.h.kullanici}</td>
                    <td className="text-right">{sayi(z.h.miktar)}</td>
                    <td className="text-right font-semibold text-red-600">{para(z.zarar)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
          <div className="card">
            <h3 className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">Kime ücretsiz verildi</h3>
            {k.kimeUcretsiz.length === 0 ? <Bos metin="—" /> : (
              <div className="max-h-[60vh] overflow-auto"><table className="tbl">
                <tbody>{k.kimeUcretsiz.slice(0, 40).map((x) => (<tr key={x.ad}><td className="text-sm">{x.ad}<div className="text-xs text-slate-500">{x.adet} satır</div></td><td className="text-right font-medium text-red-600">{para(x.zarar)}</td></tr>))}</tbody>
              </table></div>
            )}
          </div>
          <div className="lg:col-span-3"><Not>Faturada fiyatı 0 TL girilen ürünler: kendi/şirket aracına takılan parça, garanti değişimi, ikram ya da fiyatı girilmeyi unutulmuş satış olabilir. Değer alış maliyetiyle.</Not></div>
        </div>
      )}

      {sekme === 'indirim' && (
        <div className="card">
          <h3 className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">%20 ve üzeri indirimli satış satırları</h3>
          {k.indirimli.length === 0 ? <Bos metin="Bu dönemde %20 ve üzeri indirimli satış yok." /> : (
            <div className="max-h-[62vh] overflow-auto"><table className="tbl">
              <thead><tr><th>Tarih</th><th>Ürün</th><th>Müşteri</th><th>Kesen</th><th className="text-right">Adet</th><th className="text-right">İndirim oranı</th><th className="text-right">İndirim (KDV hariç)</th></tr></thead>
              <tbody>{k.indirimli.slice(0, 300).map((x, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap text-slate-500">{tarih(x.h.tarih)}</td>
                  <td>{x.u ? <UrunLink id={x.u.id}>{x.u.ad}</UrunLink> : x.h.urun_ad}</td>
                  <td className="text-sm">{x.h.cari_ad}</td>
                  <td className="text-sm text-slate-500">{x.h.kullanici}</td>
                  <td className="text-right">{sayi(x.h.miktar)}</td>
                  <td className="text-right">%{(x.oran * 100).toFixed(0)}</td>
                  <td className="text-right font-medium text-amber-700">{para(x.h.indirim ?? 0)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {sekme === 'tutarsiz' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h3 className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">Eksi stoktaki ürünler</h3>
            {k.eksiStok.length === 0 ? <Bos metin="Eksi stokta ürün yok." /> : (
              <div className="max-h-[60vh] overflow-auto"><table className="tbl">
                <thead><tr><th>Ürün</th><th className="text-right">Stok</th></tr></thead>
                <tbody>{k.eksiStok.map((u) => (<tr key={u.id}><td><UrunLink id={u.id}>{u.ad}</UrunLink><div className="text-xs text-slate-500">{u.kod}</div></td><td className="text-right font-semibold text-red-600">{sayi(u.stok)}</td></tr>))}</tbody>
              </table></div>
            )}
            <p className="px-4 pb-3 text-xs text-slate-500">Alış faturası girilmeden satılmış ya da yanlış ürüne fatura kesilmiş olabilir.</p>
          </div>
          <div className="card">
            <h3 className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">Depo toplamı ≠ ürün stoğu</h3>
            {k.depoFarki.length === 0 ? <Bos metin="Depo stokları ürün stoklarıyla birebir tutuyor." /> : (
              <div className="max-h-[60vh] overflow-auto"><table className="tbl">
                <thead><tr><th>Ürün</th><th className="text-right">Ürün stoğu</th><th className="text-right">Depolar toplamı</th></tr></thead>
                <tbody>{k.depoFarki.map((x) => (<tr key={x.u.id}><td><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></td><td className="text-right">{sayi(x.u.stok)}</td><td className="text-right text-amber-700">{sayi(x.depo)}</td></tr>))}</tbody>
              </table></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Tablo({ baslik, aciklama, bos, satirlar, aAd, bAd, renk }: { baslik: string; aciklama: string; bos: string; satirlar: { u: import('../lib/types').Urun; a: number; b: number; fark: number; deger: number }[]; aAd: string; bAd: string; renk: string }) {
  return (
    <div className="card">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h3 className="font-semibold">{baslik} <span className="text-sm font-normal text-slate-500">{satirlar.length}</span></h3><p className="text-xs text-slate-500">{aciklama}</p></div>
      {satirlar.length === 0 ? <Bos metin={bos} /> : (
        <div className="max-h-[45vh] overflow-auto"><table className="tbl">
          <thead><tr><th>Ürün</th><th className="text-right">{aAd}</th><th className="text-right">{bAd}</th><th className="text-right">Fark</th><th className="text-right">Değer</th><th className="text-right">Şu anki stok</th></tr></thead>
          <tbody>{satirlar.slice(0, 200).map((s) => (
            <tr key={s.u.id}>
              <td><UrunLink id={s.u.id}>{s.u.ad}</UrunLink><div className="text-xs text-slate-500">{[s.u.kod, s.u.marka].filter(Boolean).join(' · ')}</div></td>
              <td className="text-right">{sayi(s.a)}</td><td className="text-right">{sayi(s.b)}</td>
              <td className={`text-right font-semibold ${renk}`}>{sayi(s.fark)}</td>
              <td className="text-right">{para(Math.abs(s.deger))}</td>
              <td className="text-right text-slate-500">{sayi(s.u.stok)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

const Not = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Info size={15} className="mt-0.5 shrink-0" /><span>{children}</span></div>
);
