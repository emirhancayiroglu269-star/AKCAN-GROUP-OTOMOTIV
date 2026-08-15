# V17 Faz 2 — Satış + Mal Alış Finans Zinciri

## Yapılanlar
- `src/lib/satis-finans-motoru.ts` eklendi.
  - Satış açık hesap cari borcu merkezi uygular.
  - Nakit/Havale/EFT gibi anında tahsilatları seçilen kasa/bankaya işler.
  - Kredi kartını POS bekleyen tahsilat olarak kaydeder; banka hareketini mutabakata bırakır.
  - Aynı satışın finans ayağının ikinci kez yazılmasını engeller.
  - Anında ödeme yapılan hesapta yetersiz bakiye varsa işlemi reddeder.
- `src/lib/alis-finans-motoru.ts` eklendi.
  - Alış faturası tedarikçi borcunu her zaman oluşturur.
  - İlk ödeme varsa tedarikçi ödeme hareketini ve seçilen kasa/banka çıkışını birlikte oluşturur.
  - Ödeme hesabı ve bakiye doğrulanır.
  - Tam ödenen alış faturalarında önceki eksik cari geçmiş problemi giderildi.
- `Satis.tsx` merkezi satış finans motoruna bağlandı.
- `AlisTedarikci.tsx` yeni alış faturasında ödeme hesabı seçimini zorunlu hale getirecek şekilde güncellendi.
- Kayıtlı alış faturalarının ödeme bilgileri artık fatura düzenleme ekranından değiştirilmez; Tahsilat / Ödeme modülüne yönlendirilir.
- `bosAlisForm` içine `odemeYontemi` ve `odemeHesapId` alanları eklendi.

## Test
- 61 TS/TSX dosyası transpile/syntax kontrolü: PASS
- Satış finans smoke testleri: PASS
- Alış tam ödeme: PASS
- Alış kısmi ödeme: PASS
- Fazla ödeme engeli: PASS
- Toplam smoke test: 4/4 PASS

## Not
Tam Vite production build bu çalışma ortamında bağımlılık kurulumu olmadığı için doğrulanmadı.
