'use client';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { importProblems, loadAssets, loadProblems, saveRating, type Problem, type RecallRating } from '@/lib/database';
import { parseMarkdown, readArchive } from '@/lib/import';
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
  const input = useRef<HTMLInputElement>(null), ratingLock = useRef(false);
  const assetUrls = useRef<Record<string, string>>({});
  const current = problems.find(p => p.id === queue[0]);
  async function refresh() { setProblems(await loadProblems()); setNow(Date.now()); }
  async function refreshAssets() {
    const entries = await loadAssets(); Object.values(assetUrls.current).forEach(URL.revokeObjectURL);
    assetUrls.current = Object.fromEntries(entries.map(([path, blob]) => [path, URL.createObjectURL(blob)])); setAssets(assetUrls.current);
  }
  useEffect(() => { Promise.all([refresh(), refreshAssets()]).then(() => setReady(true)).catch(() => setError('Could not open local storage. Enable browser storage and reload to try again.')); return () => Object.values(assetUrls.current).forEach(URL.revokeObjectURL); }, []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const due = problems.filter(p => +new Date(p.schedule.due) <= now).sort((a, b) => +new Date(a.schedule.due) - +new Date(b.schedule.due));
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
      const next = await saveRating(current.id, rating); await refresh(); setBack(false); setQueue(q => q.slice(1)); setMessage(`Review saved. Next review: ${next.toLocaleString()}.`);
    } catch { setError('Could not finish saving this review. Reload the library before retrying.'); }
    finally { setBusy(false); ratingLock.current = false; }
  }
  function start(ids: string[]) { setQueue(ids); setBack(false); setMessage(''); setError(''); }
  return <main><header><a className="brand" href="/">recall<span>.</span></a><span className="label">YOUR PERSONAL PRACTICE</span></header>
    <input ref={input} hidden type="file" accept=".zip,.md,.markdown" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
    {error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    {!ready ? <p className="intro">{error ? 'Local storage is unavailable.' : 'Opening your library…'}</p> : current ? <section className="review-area">
      <div className="section-heading"><button className="text-button" disabled={busy} onClick={() => start([])}>← Library</button><span className="count">{queue.length} remaining</span></div>
      <article className="review-card" key={current.id + String(back)}><h1 className="problem-title">{current.title}</h1>
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
        {!!problems.length && <div className="actions"><button className="primary" disabled={!due.length || busy} onClick={() => start(due.map(p => p.id))}>Review due · {due.length}</button><span className="muted">{problems.length - due.length} scheduled for later</span></div>}
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
