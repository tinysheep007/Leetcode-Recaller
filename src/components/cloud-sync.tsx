'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyCloudSync, loadCloudFlags, prepareCloudSync } from '@/lib/database';
import { hydrateSharedState } from '@/lib/remote-state';

export default function CloudSync({ onSynced }: { onSynced: () => Promise<unknown> }) {
  const [offline, setOffline] = useState(false);
  const [enabled, setEnabled] = useState(false), [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [status, setStatus] = useState(''), [working, setWorking] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setOffline(!navigator.onLine);
    fetch('/api/account', { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!active) return;
      setEnabled(data.enabled !== false);
      setSignedIn(data.signedIn === true);
      if (!response.ok) setStatus(data.error || 'Cloud sync is unavailable. Local reviews still work.');
    }).catch(async () => {
      const previous = await loadCloudFlags().catch(() => undefined);
      if (active) { setEnabled(!!previous?.connected); setSignedIn(!!previous?.connected); setStatus('Offline or server unavailable: local changes are retained. Reconnect and tap Sync now.'); }
    });
    return () => { active = false; };
  }, []);

  const sync = useCallback(async () => {
    if (lock.current || !signedIn) return;
    if (!navigator.onLine) { setStatus('Offline: changes will sync when you reconnect.'); return; }
    lock.current = true; setWorking(true); setStatus('Syncing…');
    try {
      let selectionChanged = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        const prepared = await prepareCloudSync();
        const response = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prepared.input), cache: 'no-store' });
        const data = await response.json();
        const conflict = response.status === 409 && data.conflict === true;
        if (!response.ok && !conflict) {
          if (response.status === 401) setSignedIn(false);
          throw new Error(data.error || 'Sync failed; local changes are preserved. Try again.');
        }
        if (!Number.isSafeInteger(data.version) || typeof data.timeZone !== 'string') throw new Error('Invalid cloud response.');
        new Intl.DateTimeFormat('en-US', { timeZone: data.timeZone }).format();
        const state = hydrateSharedState(data.state);
        if (!await applyCloudSync({ state, version: data.version, timeZone: data.timeZone }, prepared.localVersion, conflict)) continue;
        selectionChanged ||= conflict;
        await onSynced();
        if (conflict) continue; // Re-upload any rating that accompanied a stale regeneration command.
        setStatus(`Synced at ${new Date().toLocaleTimeString()}.${selectionChanged ? ' The shared set changed; it has been refreshed. Generate again if needed.' : ''}`);
        return;
      }
      throw new Error('More local changes arrived during sync. Tap Sync now to finish.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Sync unavailable. Local changes are preserved.'); }
    finally { lock.current = false; setWorking(false); }
  }, [signedIn, onSynced]);

  useEffect(() => {
    if (!signedIn) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void sync(), 1000); };
    const offline = () => { setOffline(true); setStatus('Offline: changes will sync when you reconnect.'); };
    const online = () => { setOffline(false); schedule(); };
    schedule();
    window.addEventListener('recall-local-change', schedule);
    window.addEventListener('online', online);
    window.addEventListener('focus', schedule);
    window.addEventListener('offline', offline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('recall-local-change', schedule); window.removeEventListener('online', online);
      window.removeEventListener('focus', schedule); window.removeEventListener('offline', offline);
    };
  }, [signedIn, sync]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setWorking(true); setStatus('Signing in…');
    try {
      const response = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
      setPassword(''); setSignedIn(true); setStatus('Signed in. Preparing sync…');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Sign-in is unavailable.'); }
    finally { lock.current = false; setWorking(false); }
  }
  async function logout() {
    if (lock.current) return;
    lock.current = true; setWorking(true);
    try {
      const response = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error('Could not sign out. Please reconnect and retry.');
      setSignedIn(false); setStatus('Signed out. Local data is retained; pending changes can sync after signing in again.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not sign out.'); }
    finally { lock.current = false; setWorking(false); }
  }
  if (!enabled) return null;
  return <details className="cloud-panel"><summary>Cloud sync · {offline ? 'offline' : signedIn ? 'connected' : 'sign in'}</summary>
    <p className="muted small">Sync titles, review schedules and your daily selection for reminder emails. Notes, images and personal questions stay on this device. An already-delivered email keeps the set it was sent with.</p>
    {signedIn ? <div className="actions"><button className="secondary" disabled={working} onClick={() => void sync()}>Sync now</button><button className="text-button" disabled={working} onClick={() => void logout()}>Sign out</button></div> : <form onSubmit={login}>
      <label htmlFor="cloud-email">Owner email</label><input id="cloud-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="cloud-password">Password</label><input id="cloud-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
      <button className="secondary" disabled={working} type="submit">Sign in and sync</button>
    </form>}
    <p className="muted small" role="status">{status}</p>
  </details>;
}
