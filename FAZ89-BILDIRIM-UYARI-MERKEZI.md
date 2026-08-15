# FAZ 89 — Bildirim ve Uyarı Merkezi

ERP'deki kritik durumlar tek bir bildirim merkezinde toplanır.

## Uyarı türleri
- Kritik stok
- Düşük kâr marjı
- Cari limit aşımı
- Gecikmiş tahsilat
- Vadesi gelen çek/senet
- Bütçe aşımı
- Olağandışı gider

## Seviyeler
- KRİTİK
- YÜKSEK
- ORTA
- BİLGİ

## Çalışma mantığı
V80-V88 modüllerindeki sonuçlar uyarı kurallarına bağlanabilir.
Dashboard uyarıyı gösterir; kaynak modülde işlem yapılır.

## Güvenlik
Bildirimler işlem kaydının yerine geçmez. Bir uyarı oluşması stok, cari veya
finans kaydını otomatik değiştirmez.

Okundu bilgisi ayrıca tutulur. Aynı kaynak olay için tekrar bildirim
oluşmasını önlemek amacıyla kaynak olay + kural anahtarı benzersizliği
kullanılmalıdır.

Production verisi değiştirilmedi.
