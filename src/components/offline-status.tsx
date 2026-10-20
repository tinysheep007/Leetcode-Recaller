'use client';
import { useEffect, useState } from 'react';
export default function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState('Preparing offline access…');
  useEffect(() => {
    let cancelled = false;
    const connectivity = () => setOnline(navigator.onLine);
    connectivity(); window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity);
    if (process.env.NODE_ENV !== 'production') {
      setStatus('Offline installation is available in the production build.');
    } else if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      setStatus('Offline access requires HTTPS and a browser with service worker support.');
    } else {
      const timeout = window.setTimeout(() => { if (!cancelled) setStatus('Offline setup is taking longer than expected. Reopen online to retry.'); }, 30000);
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(async registration => {
        const observe = () => {
          if (registration.waiting && !cancelled) setStatus('Update downloaded. Close all app tabs and reopen to apply.');
        };
        registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', observe));
        await navigator.serviceWorker.ready;
        window.clearTimeout(timeout);
        if (!cancelled) { setStatus('Ready for offline use'); observe(); }
      }).catch(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setStatus('Offline setup failed. Reopen online to retry.');
      });
    }
    return () => { cancelled = true; window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); };
  }, []);
  return <aside className="offline-status" aria-label="Offline access"><p role="status">{online ? status : `You’re offline · ${status}`}</p><details><summary>Use on your iPhone</summary><p>Open the deployed HTTPS link in Safari, then Share → Add to Home Screen. Open the Home Screen app online, import your notes there, and wait for “Ready for offline use” before disconnecting.</p><p>Notes and progress stay on this device. Clearing site data removes them. Email reminders and external links require internet.</p></details></aside>;
}
