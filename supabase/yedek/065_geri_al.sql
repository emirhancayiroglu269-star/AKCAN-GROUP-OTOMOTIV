-- 065 geri alma: kasiyer kısa listesini ve tedarikçi tablosunu (içindeki kayıtlarla) kaldırır. Faz 1'e dokunmaz.
-- İşlem geçmişine (denetim) daha önce yazılmış satırlar SİLİNMEZ. 066 ve 067 önce geri alınmış olmalı.
drop view if exists public.tedarikci_kisa;
drop table if exists public.tedarikciler;
