# FAZ 43 — Atomic RPC Uygulama Bağlantısı

V42'de hazırlanan `atomic_write_app_state` için uygulama tarafı adapter katmanı oluşturuldu.

## Amaç

UI/component kodunun doğrudan:
`write_app_state`

çağırmasını engellemek.

Yeni hedef:

`UI → Finans/State Service → AtomicWriteAdapter → atomic_write_app_state`

## Kontrol

Kaynak pakette bulunan eski `write_app_state` referansları ayrı raporlandı.

Bu fazda mevcut canlı RPC çağrısı değiştirilmedi ve production database'e yazılmadı.

## Geçiş

Eski fonksiyon tamamen kaldırılmadan önce:
1. Adapter'a bağlan.
2. `expectedVersion` gönder.
3. Her işlem için benzersiz `idempotencyKey` üret.
4. `VERSION_CONFLICT` durumunda kullanıcıya kontrollü hata göster.
5. Duplicate sonuçlarını ikinci işlem olarak kaydetme.
6. Test ortamında satış/alış/iade/iptal senaryolarını çalıştır.
