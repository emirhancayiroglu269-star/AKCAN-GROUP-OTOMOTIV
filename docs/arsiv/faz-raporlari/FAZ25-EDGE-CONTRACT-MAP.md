# FAZ 25 — Edge Contract Map

Kaynak kod statik olarak tarandı; production endpoint çağrısı yapılmadı.

Her Edge/Supabase bağlantısı için:
- dosya
- invoke adı
- HTTP handler (`serve`)
- `dryRun`
- `testRunId`
- `referenceId`

durumu çıkarıldı.

Amaç, gerçek Edge Function kontratına geçmeden önce eksik alanları görünür hale getirmek.
