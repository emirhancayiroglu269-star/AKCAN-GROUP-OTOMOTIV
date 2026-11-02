import './lib/hizliYerel';
import { Component, StrictMode, Suspense, lazy, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
// yazı tipleri sitenin içinde (Google'a bağlı kalmasın); Türkçe harfler latin-ext alt kümesinden, tarayıcı yalnız gerekeni indirir
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './index.css';
import App from './App';
import { hataKaydet } from './lib/hataKayit';

const TeklifMusteri = lazy(() => import('./pages/TeklifMusteri'));
/** #t/KOD → müşterinin teklif sayfası (giriş yok, ana uygulama verisi yüklenmez) */
const teklifKod = /^#t\/([A-Za-z0-9]{10,32})$/.exec(location.hash)?.[1];

try { if (localStorage.getItem('tema') === 'koyu') document.documentElement.classList.add('dark'); } catch { /* yok */ }
window.addEventListener('error', (e) => hataKaydet(e.error ?? e.message, 'window'));
window.addEventListener('unhandledrejection', (e) => hataKaydet(e.reason, 'promise'));

/** Ekran çizilirken hata olursa beyaz sayfa yerine mesaj göster ve hatayı kaydet */
class HataSiniri extends Component<{ children: ReactNode }, { hata: Error | null }> {
  state = { hata: null as Error | null };
  static getDerivedStateFromError(hata: Error) { return { hata }; }
  componentDidCatch(hata: Error) { hataKaydet(hata, 'ekran'); }
  render() {
    if (!this.state.hata) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', textAlign: 'center' }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Sayfa açılırken bir hata oluştu</p>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16, wordBreak: 'break-word' }}>{this.state.hata.message}</p>
        <button onClick={() => location.reload()} style={{ padding: '8px 16px', borderRadius: 8, background: '#0f172a', color: '#fff' }}>Yeniden dene</button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><HataSiniri>{teklifKod
  ? <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Teklif yükleniyor…</div>}><TeklifMusteri kod={teklifKod} /></Suspense>
  : <App />}</HataSiniri></StrictMode>);
