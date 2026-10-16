// Keşif sürümü: BizimHesap giriş sayfasının form yapısını döndürür (kimlik bilgisi kullanmaz).
Deno.serve(async () => {
  const r = await fetch('https://uygulama.bizimhesap.com/bhlogin', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }, redirect: 'manual' });
  const html = await r.text();
  const formlar = [...html.matchAll(/<form[^>]*>/gi)].map((m) => m[0]);
  const inputlar = [...html.matchAll(/<input[^>]*>/gi)].map((m) => m[0].replace(/value="[^"]{40,}"/, 'value="…uzun…"'));
  const scriptler = [...html.matchAll(/<script[^>]*src="([^"]+)"/gi)].map((m) => m[1]);
  const butonlar = [...html.matchAll(/<button[^>]*>[\s\S]{0,80}?<\/button>/gi)].map((m) => m[0].slice(0, 200));
  const ajax = [...html.matchAll(/(url\s*:\s*['"][^'"]+['"]|fetch\(['"][^'"]+|\$\.post\(['"][^'"]+|action\s*=\s*['"][^'"]+)/gi)].map((m) => m[0]).slice(0, 30);
  return new Response(JSON.stringify({ durum: r.status, konum: r.headers.get('location'), cerezler: r.headers.getSetCookie?.().map((c) => c.split('=')[0]), formlar, inputlar, scriptler, butonlar, ajax, uzunluk: html.length, captcha: /captcha|turnstile|hcaptcha/i.test(html) }, null, 1), { headers: { 'Content-Type': 'application/json' } });
});
