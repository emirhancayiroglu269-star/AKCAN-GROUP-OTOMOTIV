# FAZ 64 — Bölünmüş Ödeme / Split Payment

Tek satış belgesinde birden fazla ödeme yöntemi desteklenir.

## Örnek

2.760 TL satış:

- 1.000 TL Nakit
- 1.760 TL POS

Toplam ödeme = 2.760 TL
Kalan = 0 TL

## Desteklenen ödeme tipleri
- Nakit
- POS
- Havale
- Açık hesap

## Kurallar
- Toplam ödeme satış toplamına eşit olmalı.
- Eksik ödeme commit edilmemeli.
- Fazla ödeme varsayılan olarak reddedilmeli.
- Açık hesap parçasında cari zorunlu.
- Her ödeme parçası ayrı finans hareketi olarak kaynak işlemle bağlanmalı.
- Tüm parçalar tek satış transaction'ının parçası olmalı.

Production verisi değiştirilmedi.
