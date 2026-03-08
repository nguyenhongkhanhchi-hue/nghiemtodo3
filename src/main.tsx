import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const fontScale = localStorage.getItem('nw_fontscale');
if (fontScale) document.documentElement.style.setProperty('--font-scale', fontScale);

const theme = localStorage.getItem('nw_theme');
if (theme) document.documentElement.setAttribute('data-theme', JSON.parse(theme));
else document.documentElement.setAttribute('data-theme', 'dark');

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Auto update detection
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              if (window.confirm('Phiên bản mới có sẵn. Cập nhật ngay?')) {
                newSW.postMessage('skipWaiting');
                window.location.reload();
              }
            }
          });
        }
      });
    }).catch((err) => {
      console.log('SW registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
