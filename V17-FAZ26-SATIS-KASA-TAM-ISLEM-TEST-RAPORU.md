# V17 Faz 26 — Satış/Kasa Tam İşlem ve Finans Zinciri

## Bulunan kritik hata
Satış tahsilatında UI ve merkezi finans motoru, seçilen kasa/banka hesabının mevcut bakiyesini ödeme tutarıyla karşılaştırıyordu.

Bu kontrol satışta yanlıştı; çünkü satış tahsilatı hesabın bakiyesini **artırır**. Sıfır bakiyeli kasaya 500 TL satış tahsilatı yapılabilmelidir.

## Düzeltme
- `SatisSayfasi.tsx`: satış tahsilatlarında "yeterli bakiye" kontrolü kaldırıldı.
- `satis-finans-motoru.ts`: aynı yanlış bakiye kontrolü merkezi motordan kaldırıldı.
- Ödeme/çıkış motorlarındaki bakiye kontrollerine dokunulmadı.

## İdempotency güçlendirmesi
Satış finans motoru artık yalnızca `satislar` koleksiyonuna bakmıyor. Satış kaydı henüz ana koleksiyona eklenmeden aynı finans motoru tekrar çağrılırsa:
- hesap hareketlerindeki `kaynakId = satışId:odeme:*`
- cari hareketlerindeki `kaynakSatisId`
- POS tahsilatındaki `kaynakSatisId`

kontrolleriyle ikinci finans yazımı engelleniyor.

## Uçtan uca motor testleri
1. Sıfır bakiyeli kasaya 500 TL satış tahsilatı → **PASS**
2. Açık hesap satış → müşteri cari borcu → **PASS**
3. POS satış, bağlı bankanın bakiyesi satıştan önce düşük → **PASS**
4. Aynı satış finansının ikinci kez uygulanması → **PASS / ENGELLENDİ**

## Kod doğrulama
89 TS/TSX dosyası → **0 diagnostic**

## Not
Gerçek Chrome/Vercel tıklama testi bu çalışma ortamında yapılmadı. Motor ve kaynak seviyesinde doğrulama yapıldı.
