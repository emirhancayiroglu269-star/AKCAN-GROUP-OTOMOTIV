# FAZ 87 — Yönetici Ana Dashboard / ERP Genel Kontrol Merkezi

V80 stok kararları, V81 cari risk, V82 tahsilat, V84 finans hesapları,
V85 gider ve V86 kârlılık verileri tek yönetim özetinde birleştirildi.

## Yönetici ekranı
### Finans
- Ciro
- Brüt kâr
- Brüt marj
- Net faaliyet kârı
- Net marj
- Toplam gider

### Nakit
- Kasa/banka/POS toplamı
- Toplam borç
- Net likidite
- Toplam tahsilat

### Stok
- Stokta bağlı para
- Alınacak ürün sayısı
- Önerilen alış adedi
- Kritik stok
- Ölü stok

### Cari
- Geciken cari sayısı

### Uyarılar
Kritik stok + ölü stok + geciken cari hesaplar tek uyarı sayısında özetlenir.

## Tasarım ilkesi
Bu ekran "tek bakışta şirketin durumu" ekranıdır.
Operasyonel işlemler kendi modüllerinde yapılır; dashboard doğrudan kayıt
değiştirmez.

Production verisi değiştirilmedi.
