import { zamanDamgasi } from "./format";
import { hesapHareketiUygula } from "./cari-kasa";

export type PosMutabakatSonucu = {
  db: any;
  tahsilat: any;
  fark: number;
  hareketOlusturuldu: boolean;
};

/**
 * POS tahsilatını bağlı banka hesabıyla tek merkezden mutabık hale getirir.
 *
 * Kurallar:
 * - Sadece "Bekliyor" POS tahsilatı eşleştirilebilir.
 * - Aynı POS tahsilatı ikinci kez bankaya geçirilemez.
 * - Banka hareketi `pos:{tahsilatId}:mutabakat` kaynak anahtarıyla idempotenttir.
 * - Gerçek banka tutarı, POS'un beklenen net tutarından farklı olabilir; fark ayrıca tutulur.
 * - Orijinal POS tahsilatı silinmez.
 */
export const posMutabakatUygula = (
  prev: any,
  input: { tahsilatId: string; gercekTutar: number; kullanici?: string }
): PosMutabakatSonucu | null => {
  if (!input?.tahsilatId) return null;

  const gercek = Math.round(Number(input.gercekTutar) * 100) / 100;
  if (!Number.isFinite(gercek) || gercek <= 0) return null;

  const hedef = (prev.posTahsilatlari || []).find((t: any) => t.id === input.tahsilatId);
  if (!hedef || hedef.durum === "İptal" || hedef.durum !== "Bekliyor") return null;

  const pos = (prev.posCihazlari || []).find(
    (p: any) => p.id === hedef.posId && p.aktif !== false
  );
  const hesap = pos?.hesapId
    ? (prev.hesaplar || []).find((h: any) => h.id === pos.hesapId && h.aktif !== false)
    : null;
  if (!pos || !hesap) return null;

  const kaynakId = `pos:${hedef.id}:mutabakat`;
  const hareketler = Array.isArray(hesap.hareketler) ? hesap.hareketler : [];
  const mevcutHareket = hareketler.find((h: any) => h.kaynakId === kaynakId);

  // Bankaya para daha önce geçirildiyse ikinci kez bakiye artırma.
  if (mevcutHareket) return null;

  const fark = Math.round((gercek - Number(hedef.netTutar || 0)) * 100) / 100;
  const tarih = zamanDamgasi();

  const sonuc = hesapHareketiUygula(prev, {
    hesapId: hesap.id,
    tur: "POS Mutabakatı",
    giris: gercek,
    aciklama: `POS mutabakatı — ${hedef.not || hedef.id}`,
    kullanici: input.kullanici || "",
    kaynakId,
    tarih,
  });

  const tahsilat = {
    ...hedef,
    gercekTutar: gercek,
    durum: Math.abs(fark) < 0.5 ? "Eşleşti" : "Fark Var",
    eslesmeTarihi: tarih,
    bankaHareketId: kaynakId,
    mutabakatFarki: fark,
  };

  return {
    db: {
      ...sonuc,
      posTahsilatlari: (sonuc.posTahsilatlari || []).map((t: any) =>
        t.id === hedef.id ? tahsilat : t
      ),
    },
    tahsilat,
    fark,
    hareketOlusturuldu: true,
  };
};
