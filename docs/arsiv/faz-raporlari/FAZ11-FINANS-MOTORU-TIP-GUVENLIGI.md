# FAZ 11 — Finans Motoru Tip Güvenliği

- src/lib/satis-finans-motoru.ts: domain model import eklendi
- src/lib/finans-islem.ts: domain model import eklendi
- Finans zinciri temel doğrulama adapteri eklendi.

Bu aşamada mevcut muhasebe formülleri değiştirilmedi. Yeni domain modelleri ve yan etki öncesi zincir doğrulaması hazırlandı. Amaç TypeScript'i susturmak değil, yanlış satış/ödeme/stok/cari/kasa verisinin finans motoruna girmesini önlemektir.
