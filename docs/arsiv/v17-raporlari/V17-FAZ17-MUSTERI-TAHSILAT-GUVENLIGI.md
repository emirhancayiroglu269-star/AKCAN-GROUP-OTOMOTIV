# V17 Faz 17 — Müşteri Tahsilatı Güvenliği

## Kontrol edilen zincir
Müşteri → Tahsilat → Seçilen Kasa/Banka → Müşteri Cari → Fatura Tahsisi → Finans İşlem Kaydı.

## Düzeltmeler
- Tahsilat satırında kasa/banka hesabı seçilmeden kayıt engelleniyor.
- Aynı aktif hesap tek ise otomatik seçiliyor; birden fazla hesapta kullanıcı seçimi zorunlu.
- Tahsilat ekranına senkron kayıt kilidi eklendi. Kullanıcı Kaydet'e art arda/double-click yaptığında ikinci işlem için yeni finans işlem ID'si üretilemiyor.
- Finans motorunda müşteri tahsilatı seçilen hesaba giriş ve müşteri cari hareketi olarak merkezi transaction içinde uygulanıyor.
- Fatura tahsisi `acikHesapOdenen` üzerinden güncelleniyor.
- İşlem `kaynakId` ile hesap hareketine bağlanıyor.

## Kontrol
- `finans-islem.ts`: TypeScript transpile PASS
- `TahsilatOdemeSayfasi.tsx`: TypeScript transpile PASS
- Kritik müşteri tahsilatı zinciri statik kontrol: PASS
