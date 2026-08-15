# V48 — ERP Sağlamlaştırma Planı

Bu fazın amacı yeni özellik eklemekten önce mevcut mimariyi sade, güvenli,
test edilebilir ve ücretsiz altyapıda sürdürülebilir hale getirmektir.

## Öncelik sırası

### 1. Tek veri yazma kapısı
ERP state değişiklikleri tek bir servis üzerinden yapılmalı.
UI bileşenleri doğrudan Supabase/RPC çağırmamalı.

### 2. Tek yetki kaynağı
`roller[].yetkiler` ve `role_permissions` gibi paralel yetki kaynakları
zamanla ayrışmamalı. Tek kanonik kaynak seçilmeli.

### 3. Auth ayrıştırması
Parola uygulama JSONB state'inden tamamen çıkarılmalı.
Kimlik doğrulama Supabase Auth'a ait olmalı.

### 4. Finansal işlem bütünlüğü
Satış/alış/iade/iptal işlemleri:
- idempotent,
- versiyon kontrollü,
- audit edilebilir,
- mümkün olduğunca tek işlem mantığında
olmalı.

### 5. Stok motoru
Stok miktarı doğrudan rastgele değiştirilememeli.
Hareket kaydı + belge + kaynak işlem üzerinden hesaplanmalı.
Negatif stok politikası açıkça tanımlanmalı.

### 6. UI güvenliği
Menü gizlemek yalnızca UX'tir. İşlem Guard + server/RLS birlikte çalışmalı.

### 7. Ücretsiz çalışma
Yeni servis eklemek yerine mevcut React + Supabase altyapısı kullanılmalı.
Yeni ücretli branch/proje açılmamalı.

## V48 kararı
Önce sağlamlaştırma, sonra yeni ERP modülleri.
