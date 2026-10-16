-- Kampanya oranı ve usta fiyat listesi ayarları
alter table ayarlar add column if not exists kampanya_oran numeric default 10;
alter table ayarlar add column if not exists usta_liste jsonb;
