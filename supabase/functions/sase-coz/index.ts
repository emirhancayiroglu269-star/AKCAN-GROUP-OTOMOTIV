// Şase (VIN) çözme yardımcısı (Supabase Edge Function, giriş gerekli).
// Kaynak: ABD Ulaştırma Bakanlığı NHTSA vPIC — ücretsiz, herkese açık resmi servis (vpic.nhtsa.dot.gov/api).
// Avrupa araçlarında marka/üretici/yıl genelde gelir; model ve motor her zaman gelmez (site kendi tablosuyla tamamlar).
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
const ALAN: Record<string, string> = {
  Make: 'marka', Manufacturer: 'uretici', Model: 'model', ModelYear: 'yil', Series: 'seri', Trim: 'donanim', BodyClass: 'kasa',
  DisplacementL: 'motor_litre', DisplacementCC: 'motor_cc', EngineCylinders: 'silindir', EngineModel: 'motor_kodu', EngineHP: 'beygir',
  FuelTypePrimary: 'yakit', TransmissionStyle: 'sanziman', DriveType: 'cekis', Doors: 'kapi', PlantCountry: 'uretim_ulke', PlantCity: 'uretim_sehir',
  VehicleType: 'arac_tipi', ErrorCode: 'hata_kodu', ErrorText: 'hata',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const yanit = (b: Record<string, unknown>, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const b = await req.json().catch(() => ({})) as { vin?: string };
    const vin = String(b.vin ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!VIN.test(vin)) return yanit({ ok: false, hata: 'Şase numarası 17 karakter olmalı (I, O, Q harfleri kullanılmaz)' }, 400);
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 12000);
    const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`, { signal: ac.signal, headers: { accept: 'application/json' } }).finally(() => clearTimeout(t));
    if (!r.ok) return yanit({ ok: false, hata: `NHTSA yanıt vermedi (${r.status})` }, 502);
    const j = await r.json() as { Results?: Record<string, string>[] };
    const ham = j.Results?.[0] ?? {};
    const sonuc: Record<string, string> = {};
    for (const [k, ad] of Object.entries(ALAN)) { const v = String(ham[k] ?? '').trim(); if (v && v !== 'Not Applicable' && v !== '0') sonuc[ad] = v; }
    return yanit({ ok: true, vin, nhtsa: sonuc });
  } catch (e) {
    const m = (e as Error).name === 'AbortError' ? 'NHTSA zaman aşımı' : (e as Error).message;
    return yanit({ ok: false, hata: m.slice(0, 200) }, 502);
  }
});
