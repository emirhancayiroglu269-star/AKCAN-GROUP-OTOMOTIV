import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

try { if (localStorage.getItem('tema') === 'koyu') document.documentElement.classList.add('dark'); } catch { /* yok */ }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
