import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// In the Android build, relative /api requests must reach the hosted Vercel API.
// On the web, the existing relative URLs continue to work unchanged.
const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
if (apiBaseUrl) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return nativeFetch(`${apiBaseUrl}${input}`, init);
    }
    if (input instanceof URL && input.pathname.startsWith('/api/')) {
      return nativeFetch(`${apiBaseUrl}${input.pathname}${input.search}`, init);
    }
    if (input instanceof Request && input.url.includes('/api/')) {
      return nativeFetch(input, init);
    }
    return nativeFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
