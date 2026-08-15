import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

type ErrorBoundaryState = { hataVar: boolean; hataMesaji: string; hataDetay: string };

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hataVar: false, hataMesaji: '', hataDetay: '' };
  }

  static getDerivedStateFromError(hata: unknown): ErrorBoundaryState {
    return {
      hataVar: true,
      hataMesaji: hata instanceof Error ? hata.message : String(hata),
      hataDetay: hata instanceof Error && hata.stack ? hata.stack : '',
    };
  }

  componentDidCatch(hata: unknown, bilgi: { componentStack: string }) {
    // Konsola tam detayı yaz, böylece geliştirme sırasında da izlenebilir.
    // eslint-disable-next-line no-console
    // Hata ayrıntısı kullanıcıya ErrorBoundary üzerinden gösterilir.
  }

  sifirla = () => {
    this.setState({ hataVar: false, hataMesaji: '', hataDetay: '' });
  };

  render() {
    if (this.state.hataVar) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>
              AKCAN GROUP OTOMOTİV
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
              Beklenmeyen bir hata oluştu
            </h1>
            <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 16, lineHeight: 1.5 }}>
              Bu ekranda bir sorun oluştu ve program devam edemedi. Verileriniz kaybolmadı — sayfayı
              yeniden yükleyerek devam edebilirsiniz. Sorun tekrar ederse ekran görüntüsüyle birlikte
              bildirin.
            </p>
            <details style={{ marginBottom: 20, fontSize: 12, color: '#94a3b8' }}>
              <summary style={{ cursor: 'pointer', marginBottom: 6 }}>Teknik detay</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.hataMesaji}
                {this.state.hataDetay ? `\n\n${this.state.hataDetay}` : ''}
              </pre>
            </details>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={this.sifirla}
                style={{
                  background: 'transparent',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
