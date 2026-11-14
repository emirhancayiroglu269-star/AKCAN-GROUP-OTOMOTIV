# V17 Faz 16 — Tahsilat / Ödeme Hesap Seçimi

- Tahsilat/Ödeme ekranında aktif hesaplar listeleniyor ve seçim alanı korunuyor.
- Tek aktif kasa/banka varsa hesap otomatik seçiliyor; birden fazla hesap varsa sistem kullanıcı adına tahmin yapmıyor.
- Finans motoru artık tutarlı tutarlı bir ödeme/tahsilat satırında `hesapId` boşsa işlemi kesin olarak reddediyor.
- Seçilen hesap aktif değilse veya bulunamıyorsa işlem yine reddediliyor.
- Ödeme tarafında seçilen hesabın bakiyesi ayrıca kontrol ediliyor.
