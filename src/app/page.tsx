'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { importProblems, loadAssets, loadReviewState, saveRating, type Problem, type RecallRating } from '@/lib/database';
import { parseMarkdown, readArchive } from '@/lib/import';
import { dueProblems, pendingIds, randomProblemId, type DailySession } from '@/lib/daily';
function Reveal({ title, content, assets, path }: { title: string; content: string; assets: Record<string, string>; path: string }) {
  const [open, setOpen] = useState(false);
  return <section className="reveal"><button className="reveal-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><span>{title}</span><span>{open ? 'Hide −' : 'Reveal +'}</span></button>{open && <div className="markdown">{content.trim() ? <Markdown components={{ img: ({ src, alt }) => {
    const source = typeof src === 'string' ? src : ''; let resolved = '';
    try { resolved = decodeURIComponent(new URL(source, `https://import.local/${path}`).pathname.slice(1)); } catch { /* Render missing assets as text. */ }
    return assets[resolved] ? <img src={assets[resolved]} alt={alt || 'Imported note illustration'} /> : <p className="muted">Image: {alt || source} (not available in this import)</p>;
  } }}>{content}</Markdown> : <p className="muted">Not provided yet</p>}</div>}</section>;
}
export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]), [assets, setAssets] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [category, setCategory] = useState('');
  const [queue, setQueue] = useState<string[]>([]), [back, setBack] = useState(false), [now, setNow] = useState(0);
  const [daily, setDaily] = useState<DailySession | null>(null);
  const [target, setTarget] = useState(5), [targetDraft, setTargetDraft] = useState('5');
  const [mode, setMode] = useState<'daily' | 'extra' | 'random' | 'manual' | null>(null);
  const targetRef = useRef(5), dayRef = useRef('');
  const dailyRemaining = daily ? pendingIds(daily) : [];
  const activeIds = mode === 'daily' ? dailyRemaining : queue;
  const modeDay = useRef('');
  const input = useRef<HTMLInputElement>(null), ratingLock = useRef(false);
  const assetUrls = useRef<Record<string, string>>({});
  const current = problems.find(p => p.id === activeIds[0]);
  const refresh = useCallback(async () => {
    const state = await loadReviewState();
    setProblems(state.problems); setDaily(state.daily); setTarget(state.target); setNow(Date.now());
    if (targetRef.current !== state.target) { setTargetDraft(String(state.target)); targetRef.current = state.target; }
    if (dayRef.current && dayRef.current !== state.daily.day) { setMode(null); setQueue([]); setBack(false); }
    dayRef.current = state.daily.day;
    return state;
  }, []);
  async function refreshAssets() {
    const entries = await loadAssets(); Object.values(assetUrls.current).forEach(URL.revokeObjectURL);
    assetUrls.current = Object.fromEntries(entries.map(([path, blob]) => [path, URL.createObjectURL(blob)])); setAssets(assetUrls.current);
  }
  useEffect(() => {
    const timeout = window.setTimeout(() => setError('If loading is stuck, close older Recall tabs and reopen this app to finish the storage upgrade.'), 15000);
    Promise.all([refresh(), refreshAssets()]).then(() => { window.clearTimeout(timeout); setReady(true); setError(''); }).catch(() => { window.clearTimeout(timeout); setError('Could not open local storage. Enable browser storage and reload to try again.'); });
    return () => { window.clearTimeout(timeout); Object.values(assetUrls.current).forEach(URL.revokeObjectURL); };
  }, [refresh]);
  useEffect(() => {
    const update = () => { if (ready && !ratingLock.current) void refresh().catch(() => setError('Could not refresh the daily session. Reload to retry.')); };
    const timer = setInterval(update, 30000); window.addEventListener('focus', update);
    const visible = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', visible); };
  }, [ready, refresh]);
  const due = dueProblems(problems, new Date(now));
  const filtered = problems.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) && (!category || p.category === category));
  async function upload(file: File) {
    setBusy(true); setError('');
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Please choose an export under 25 MB.');
      const parsed = /\.zip$/i.test(file.name) ? readArchive(new Uint8Array(await file.arrayBuffer())) : { problems: [parseMarkdown(file.name, await file.text())], assets: [], skipped: 0 };
      if (!parsed.problems.length) throw new Error('No problem Markdown pages found in this file.');
      const result = await importProblems(parsed.problems, parsed.assets as [string, Uint8Array][]);
      await refresh(); await refreshAssets(); setMessage(`Imported ${result.added} problems. Skipped ${result.skipped} existing problems and ${parsed.skipped} index pages.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  async function rate(rating: RecallRating) {
    if (!current || ratingLock.current) return; ratingLock.current = true; setBusy(true); setError('');
    try {
      const next = await saveRating(current.id, rating, mode === 'daily' ? modeDay.current : undefined);
      // Advance immediately after the atomic save, before any optional UI refresh can fail.
      setBack(false); setQueue(q => q.slice(1));
      const updated = await refresh();
      if (mode === 'daily' && pendingIds(updated.daily).length === 0) setMode(null);
      setMessage(`Review saved. Next review: ${next.toLocaleString()}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this review. Return to the library before retrying.'); }
    finally { setBusy(false); ratingLock.current = false; }
  }
  function start(ids: string[], nextMode: typeof mode = 'manual') { setQueue(ids); setMode(ids.length ? nextMode : null); setBack(false); setMessage(''); setError(''); }
  async function beginDaily() {
    setBusy(true); setError('');
    try { const state = await refresh(); modeDay.current = state.daily.day; start(pendingIds(state.daily), 'daily'); }
    catch { setError('Could not open the daily session. Please try again.'); }
    finally { setBusy(false); }
  }
  async function changeTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const state = await loadReviewState(new Date(), Number(targetDraft));
      setDaily(state.daily); setTarget(state.target); targetRef.current = state.target; setTargetDraft(String(state.target));
      setMessage('Daily target saved. Increasing it adds due cards; lowering it keeps today’s existing selections.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the daily target.'); }
    finally { setBusy(false); }
  }
  function randomPractice() {
    const id = randomProblemId(problems);
    if (id) start([id], 'random');
  }
  return <main><header><a className="brand" href="/">recall<span>.</span></a><span className="label">YOUR PERSONAL PRACTICE</span></header>
    <input ref={input} hidden type="file" accept=".zip,.md,.markdown" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
    {error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    {!ready ? <p className="intro">{error ? 'Local storage is unavailable.' : 'Opening your library…'}</p> : current ? <section className="review-area">
      <div className="section-heading"><button className="text-button" disabled={busy} onClick={() => start([])}>← Library</button><span className="count">{mode === 'daily' ? 'Daily session' : mode === 'random' ? 'Random practice' : 'Extra practice'} · {activeIds.length} remaining</span></div>
      <article className="review-card" key={current.id + String(back) + mode}><h1 className="problem-title">{current.title}</h1>
        {!back ? <><Reveal title="Question" content={current.description} path={current.sourcePath} assets={assets} /><button className="primary flip" onClick={() => setBack(true)}>Flip to answer →</button></> : <>
          <p className="metadata">{current.category}</p>{current.url && <a href={current.url} target="_blank" rel="noreferrer">Open on LeetCode ↗</a>}
          {current.sections.map(s => <Reveal key={s.id} title={s.title} content={s.content} path={current.sourcePath} assets={assets} />)}
          <details className="original"><summary>Original imported Markdown</summary><pre>{current.original}</pre></details>
          <button className="text-button" onClick={() => setBack(false)}>← Back to question</button><p className="rating-label">How well did you recall it?</p>
          <div className="ratings">{(['Forgot', 'Rusty', 'Comfy'] as const).map(r => <button disabled={busy} key={r} onClick={() => void rate(r)}>{r}</button>)}</div>
        </>}
      </article>
    </section> : <>
      <section className="intro"><p className="eyebrow">SOLVED ONCE. REMEMBER LONGER.</p><h1>A little recall.<br />A lot more confidence.</h1><p className="subtitle">Revisit the problems you’ve solved, with your own notes and the answers tucked away.</p>
        {daily && <section className="daily-panel" aria-labelledby="daily-title">
          <div className="section-heading"><h2 id="daily-title">Today’s review</h2><span className="count">{daily.day}</span></div>
          <div className="daily-progress"><strong>{daily.completedIds.length}<span> / {daily.selectedIds.length} completed</span></strong><span className="muted">Daily target: {target}</span></div>
          <progress aria-label="Daily review progress" max={daily.selectedIds.length || 1} value={daily.completedIds.length} />
          <p className="muted small">{!problems.length ? 'Import your notes to create your first daily set.' : dailyRemaining.length ? `${dailyRemaining.length} left in your saved set. Oldest due cards first.` : daily.selectedIds.length ? 'Daily set complete. You can stop here or keep practicing.' : 'You’re caught up. No cards are due right now.'}</p>
          {daily.selectedIds.length > target && <p className="muted small">Your saved set is larger than your target. Existing selections stay available until completed.</p>}
          <div className="actions">
            <button className="primary" disabled={!dailyRemaining.length || busy} onClick={() => void beginDaily()}>{daily.completedIds.length ? 'Continue daily review' : 'Start daily review'} · {dailyRemaining.length}</button>
            <button className="secondary" disabled={!problems.length || busy} onClick={randomPractice}>Random problem ↝</button>
            {!dailyRemaining.length && !!due.length && <button className="text-button" disabled={busy} onClick={() => start(due.slice(0, target).map(p => p.id), 'extra')}>Extra due practice · {Math.min(due.length, target)}</button>}
          </div>
          <p className="muted small">{due.length} due in your library. Anything outside today’s set stays due. Random practice picks from your entire library; only rating it changes its schedule.</p>
          <details className="daily-settings"><summary>Daily target</summary><form onSubmit={changeTarget}><label htmlFor="daily-target">Problems per day</label><div className="actions"><input id="daily-target" type="number" min="1" max="100" step="1" required value={targetDraft} onChange={e => setTargetDraft(e.target.value)} /><button className="secondary" disabled={busy} type="submit">Save target</button></div><p className="muted small">Unfinished cards carry forward at local midnight. Raising your target adds due cards; lowering it doesn’t remove today’s saved cards.</p></form></details>
        </section>}
      </section>
      <section className="workspace" aria-labelledby="library-title"><div className="section-heading"><h2 id="library-title">Your library <span className="count">({problems.length})</span></h2><button className="primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Importing…' : 'Import notes +'}</button></div>
        {!problems.length ? <div className="empty-state"><div className="card-mark" aria-hidden="true">{'{ }'}</div><h3>Your next review starts here.</h3><p>Choose your Notion Markdown ZIP or an individual Markdown file. Missing fields are welcome.</p><span className="status">Your notes and reviews stay in this browser</span></div> : <>
          <div className="filters"><input aria-label="Search problem titles" placeholder="Search problems…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{Array.from(new Set(problems.map(p => p.category))).sort().map(c => <option key={c}>{c}</option>)}</select></div>
          <p className="muted small">Opening any problem lets you review early. A rating updates its next review date. Reimport skips existing cards.</p>
          <div className="problem-list">{filtered.map(p => <button className="problem-row" key={p.id} onClick={() => start([p.id])}><span><strong>{p.title}</strong><small>{p.category}</small></span><span className="count">{+new Date(p.schedule.due) <= now ? 'Due now' : new Date(p.schedule.due).toLocaleDateString()} →</span></button>)}</div>{!filtered.length && <p className="muted">No problems match your search.</p>}
        </>}
      </section>
    </>}
    <footer><span>Built for remembering, at your own pace.</span><span>LeetCode Recall</span></footer>
  </main>;
}
