import { gecerliMaliyet, satisKalemiKarBilgisi } from "./maliyet";

// Devir hızına göre 5 kademeli sınıflandırma (58. adım, 3. madde) — Ölü
// Stok modülündeki (57. adım) satış-ADEDİ tabanlı sınıflandırmadan FARKLI:
// burada YILLIKLANDIRILMIŞ devir hızı oranı esas alınır.
export const DEVIR_HIZI_SINIF_GORSELI = {
  "Çok Hızlı": { emoji: "🟢", ton: "green" },
  Hızlı: { emoji: "🟢", ton: "green" },
  Normal: { emoji: "🟡", ton: "yellow" },
  Yavaş: { emoji: "🟠", ton: "yellow" },
  Ölü: { emoji: "🔴", ton: "red" },
};
export const devirHiziSinifBul = (yillikDevirHizi, satisAdedi) => {
  if (satisAdedi === 0 || yillikDevirHizi === null) return "Ölü";
  if (yillikDevirHizi >= 12) return "Çok Hızlı";
  if (yillikDevirHizi >= 6) return "Hızlı";
  if (yillikDevirHizi >= 3) return "Normal";
  if (yillikDevirHizi >= 1) return "Yavaş";
  return "Ölü";
};

// Bir ürünün seçilen dönemdeki TAM performans analizini hesaplar — devir
// hızı, stokta kalma süresi, ciro, kâr, kâr marjı (1, 2, 4, 7. madde).
// NOT: "Ortalama stok maliyeti" için günlük stok anlık görüntüsü geçmişi
// gerekir; sistemde bu sadece Gün Sonu kapatıldıkça (56. adım) birikir. O
// yüzden burada MEVCUT stok, dönem boyunca stok seviyesinin makul bir
// yaklaşık göstergesi olarak kullanılır — perakende yedek parçada stok
// seviyeleri günlük büyük dalgalanma göstermediğinden kabul edilebilir bir
// basitleştirmedir, ama gerçek ortalamanın YERİNE GEÇMEZ.
export const urunDevirHiziHesapla = (db, parca, baslangic, bitis) => {
  const satisKalemleri = db.satislar
    .filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= baslangic && s.tarih.slice(0, 10) <= bitis)
    .flatMap((s) => s.kalemler.filter((k) => k.parcaId === parca.id));
  const satisAdedi = satisKalemleri.reduce((t, k) => t + k.adet, 0);
  const satilanMaliyet = satisKalemleri.reduce((t, k) => t + k.adet * (k.maliyet || 0), 0);
  const ciro = satisKalemleri.reduce((t, k) => t + (k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0)), 0);
  const brutKar = satisKalemleri.reduce((t, k) => t + satisKalemiKarBilgisi(k).karToplam, 0);
  const karMarji = ciro > 0 ? (brutKar / ciro) * 100 : null;

  const stokMaliyeti = (parca.stok || 0) * gecerliMaliyet(parca, db);
  const gunSayisi = Math.max(1, Math.round((new Date(bitis).getTime() - new Date(baslangic).getTime()) / 86400000) + 1);
  const devirHiziDonem = stokMaliyeti > 0 ? satilanMaliyet / stokMaliyeti : null;
  const yillikDevirHizi = devirHiziDonem !== null ? Math.round(devirHiziDonem * (365 / gunSayisi) * 100) / 100 : null;
  const stoktaKalmaSuresi = yillikDevirHizi && yillikDevirHizi > 0 ? Math.round(365 / yillikDevirHizi) : null;
  const sinif = devirHiziSinifBul(yillikDevirHizi, satisAdedi);

  // Stok alma önerisi (8. madde) — kural tabanlı karar desteği.
  let oneri;
  const stokDusuk = parca.stok <= (parca.kritikSeviye || 0) || (parca.hedefStok > 0 && parca.stok < parca.hedefStok * 0.5);
  const stokYuksek = parca.hedefStok > 0 && parca.stok > parca.hedefStok;
  if ((sinif === "Çok Hızlı" || sinif === "Hızlı") && stokDusuk) oneri = { emoji: "🟢", metin: "Acil Sipariş Ver" };
  else if (sinif === "Yavaş" || sinif === "Ölü") oneri = stokYuksek ? { emoji: "🔴", metin: "Yeni Alımı Durdur" } : { emoji: "🟠", metin: "Dikkatli İzle" };
  else oneri = { emoji: "🟡", metin: "Normal Takip" };

  return { parca, satisAdedi, satilanMaliyet, ciro, brutKar, karMarji, stokMaliyeti, devirHiziDonem, yillikDevirHizi, stoktaKalmaSuresi, sinif, oneri };
};

// Bir grup ürün (marka/kategori) için toplu devir hızı — 5 ve 6. madde.
export const grupDevirHiziHesapla = (db, urunler, baslangic, bitis) => {
  const satisKalemleri = db.satislar
    .filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= baslangic && s.tarih.slice(0, 10) <= bitis)
    .flatMap((s) => s.kalemler)
    .filter((k) => urunler.some((p) => p.id === k.parcaId));
  const satilanMaliyet = satisKalemleri.reduce((t, k) => t + k.adet * (k.maliyet || 0), 0);
  const stokDegeri = urunler.reduce((t, p) => t + (p.stok || 0) * gecerliMaliyet(p, db), 0);
  const gunSayisi = Math.max(1, Math.round((new Date(bitis).getTime() - new Date(baslangic).getTime()) / 86400000) + 1);
  const devirHiziDonem = stokDegeri > 0 ? satilanMaliyet / stokDegeri : null;
  const yillikDevirHizi = devirHiziDonem !== null ? Math.round(devirHiziDonem * (365 / gunSayisi) * 100) / 100 : null;
  return { stokDegeri, satilanMaliyet, devirHiziDonem: devirHiziDonem !== null ? Math.round(devirHiziDonem * 100) / 100 : null, yillikDevirHizi };
};
