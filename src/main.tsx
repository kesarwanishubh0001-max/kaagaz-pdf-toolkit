import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/caveat/600.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register local cache Service Worker on standard web deployments so the web app
// and its bundled English + Hindi OCR models remain available without internet.
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  window.location.protocol.startsWith('http') &&
  window.location.hostname !== '127.0.0.1' &&
  !(window as Window & { KaagazNative?: unknown }).KaagazNative
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Ignore SW registration failure in restricted sandboxes
    });
  });
}
