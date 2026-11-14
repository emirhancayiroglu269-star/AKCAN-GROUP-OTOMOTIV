# V17 Faz 37 — Çift Kayıt / Idempotency Son Taraması

## Amaç
Mevcut idempotency korumalarının yanında, veritabanında oluşmuş olabilecek çift kayıtları salt-okuma olarak tespit etmek.

## Yeni motor
`src/lib/cift-kayit-denetim.ts`

Motor veri değiştirmez. Şunları tarar:

- Aynı satış ID'si
- Aynı mal alış ID'si
- Aynı iade ID'si
- Aynı kasa işlemi ID'si
- Aynı POS tahsilatı ID'si
- Aynı stok hareketi ID'si
- Aynı depo transferi ID'si
- Aynı satış ödeme `kaynakId`'si
- Aynı satış + POS aktif tahsilatı
- Aynı satış müşteri cari hareketi
- Aynı alış tedarikçi cari hareketi
- Aynı stok parça + tür + belge + giriş/çıkış imzası

## Yönetici bağlantısı
`Yönetici > Sistem Sağlığı` içine yeni:

### Çift Kayıt

kartı eklendi.

Bulgu varsa mevcut detay panelinde:
- hata
- ilgili kayıt referansları
- `İlgili Modüle Git`

akışı kullanılabiliyor.

Yönlendirmeler:
- Çift stok → Stok
- Çift tahsilat → Kasa Yönetimi
- Çift POS → Banka/POS
- Çift cari → Cari

## Test

Temiz veri:
- Çift kayıt yok → PASS

Bozuk sentetik veri:
- Kasa çift ID → YAKALANDI
- Çift stok hareketi → YAKALANDI
- Çift POS → YAKALANDI
- Çift tahsilat → YAKALANDI
- Çift cari → YAKALANDI

Kaynak kod:
- 91 TS/TSX → 0 diagnostic
- Runtime export → PASS
- Yönetici Çift Kayıt kategorisi → PASS
- İlgili modül yönlendirmeleri → PASS
- ZIP bütünlük testi → PASS

## Sonuç
Faz 37 ile sistemin yalnızca ikinci işlemi engellemesi değil, geçmişte oluşmuş olabilecek çift kayıtların da yönetici tarafından fark edilebilmesi sağlandı.
