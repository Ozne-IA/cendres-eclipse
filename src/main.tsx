import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Enregistrement du Service Worker pour le support PWA hors-ligne
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator
  && window.location.protocol.startsWith('http') && window.location.hostname !== 'appassets.androidplatform.net') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Le jeu reste jouable sans service worker.
    });
  });
}
