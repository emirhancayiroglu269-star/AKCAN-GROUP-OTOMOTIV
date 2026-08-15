// Bir ürünün fiziksel konum(lar)ını tek biçimde okur: çoklu raf konumu
// tanımlıysa onu, yoksa tekil "Ana Raf" (rafAdresi) alanını tüm stokla
// birlikte döndürür. Böylece tüm ekranlar tek bir fonksiyona bakabilir.
export const parcaRafListesi = (p) => {
  if (p.rafKonumlari && p.rafKonumlari.length > 0) return p.rafKonumlari;
  if (p.rafAdresi) return [{ id: "ana", kod: p.rafAdresi, adet: p.stok || 0 }];
  return [];
};
