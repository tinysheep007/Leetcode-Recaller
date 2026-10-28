'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { importProblems, loadAssets, loadReviewState, loadQuestions, loadStatistics, recordVisit, drawRandomProblem, generateAnotherDailySet, saveRating, type Problem, type RecallRating, type ProblemQuestion, type SavedReview, type ProblemVisits } from '@/lib/database';
import CloudSync from '@/components/cloud-sync';
import Statistics from '@/components/statistics';
import ProblemQuestions from '@/components/problem-questions';
import { parseMarkdown, readArchive } from '@/lib/import';
import { dueProblems, pendingIds, type DailySession } from '@/lib/daily';
function NoteMarkdown({ content, assets, path }: { content: string; assets: Record<string, string>; path: string }) {
  return <div className="markdown">{content.trim() ? <Markdown components={{ img: ({ src, alt }) => {
    const source = typeof src === 'string' ? src : ''; let resolved = '';
    try { resolved = decodeURIComponent(new URL(source, `https://import.local/${path}`).pathname.slice(1)); } catch { /* Render missing assets as text. */ }
    return assets[resolved] ? <img src={assets[resolved]} alt={alt || 'Imported note illustration'} /> : <p className="muted">Image: {alt || source} (not available in this import)</p>;
  } }}>{content}</Markdown> : <p className="muted">Not provided yet</p>}</div>;
}
function Reveal({ title, content, assets, path }: { title: string; content: string; assets: Record<string, string>; path: string }) {
  const [open, setOpen] = useState(false);
  return <section className="reveal"><button className="reveal-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><span>{title}</span><span>{open ? 'Hide −' : 'Reveal +'}</span></button>{open && <NoteMarkdown content={content} assets={assets} path={path} />}</section>;
}
const PROBLEMS_PER_PAGE = 10;
function LibraryPages({ page, pageCount, total, position, onPage }: { page: number; pageCount: number; total: number; position: string; onPage: (page: number) => void }) {
  return <nav className="pagination" aria-label={`Library pages (${position})`}>
    <span className="count" role="status">Showing {page * PROBLEMS_PER_PAGE + 1}–{Math.min((page + 1) * PROBLEMS_PER_PAGE, total)} of {total}</span>
    <div className="pagination-controls">
      {page > 0 && <button className="secondary" onClick={() => onPage(page - 1)}>← Previous</button>}
      <select aria-label={`Problem page (${position})`} value={page} onChange={event => onPage(Number(event.target.value))}>{Array.from({ length: pageCount }, (_, index) => <option key={index} value={index}>Page {index + 1} of {pageCount}</option>)}</select>
      {page < pageCount - 1 && <button className="secondary" onClick={() => onPage(page + 1)}>Next →</button>}
    </div>
  </nav>;
}
export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]), [assets, setAssets] = useState<Record<string, string>>({});
  const [stats, setStats] = useState(false);
  const [activity, setActivity] = useState<{ reviews: SavedReview[]; visits: ProblemVisits[] }>({ reviews: [], visits: [] });
  const lastVisitId = useRef<string | undefined>(undefined);
  const [difficulty, setDifficulty] = useState('');
  const [questions, setQuestions] = useState<ProblemQuestion[]>([]);
  const [portal, setPortal] = useState(false), [questionFocus, setQuestionFocus] = useState(false);
  const [questionQuery, setQuestionQuery] = useState('');
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [libraryPage, setLibraryPage] = useState(0);
  const libraryHeading = useRef<HTMLHeadingElement>(null);
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
    const [state, savedQuestions, savedActivity] = await Promise.all([loadReviewState(), loadQuestions(), loadStatistics()]);
    setActivity(savedActivity);
    setQuestions(savedQuestions);
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
  useEffect(() => {
    const id = current?.id;
    if (lastVisitId.current === id) return;
    lastVisitId.current = id;
    if (id) void recordVisit(id).then(() => loadStatistics()).then(setActivity).catch(() => setError('Could not save this visit. Your review progress is unchanged.'));
  }, [current?.id]);
  const due = dueProblems(problems, new Date(now));
  const withQuestions = problems.filter(p => questions.some(q => q.problemId === p.id));
  const questionMatches = withQuestions.filter(p => p.title.toLowerCase().includes(questionQuery.toLowerCase()) || questions.some(q => q.problemId === p.id && q.text.toLowerCase().includes(questionQuery.toLowerCase())));
  const filtered = problems.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) && (!category || p.category === category) && (!difficulty || (p.difficulty || 'Unrated') === difficulty));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PROBLEMS_PER_PAGE));
  const currentPage = Math.min(libraryPage, pageCount - 1);
  const pageProblems = filtered.slice(currentPage * PROBLEMS_PER_PAGE, (currentPage + 1) * PROBLEMS_PER_PAGE);
  function changeLibraryPage(page: number) {
    setLibraryPage(Math.max(0, Math.min(page, pageCount - 1)));
    libraryHeading.current?.focus({ preventScroll: true });
    libraryHeading.current?.scrollIntoView({ block: 'start' });
  }

  async function upload(file: File) {
    setBusy(true); setError('');
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Please choose an export under 25 MB.');
      const parsed = /\.zip$/i.test(file.name) ? readArchive(new Uint8Array(await file.arrayBuffer())) : { problems: [parseMarkdown(file.name, await file.text())], assets: [], skipped: 0 };
      if (!parsed.problems.length) throw new Error('No problem Markdown pages found in this file.');
      const result = await importProblems(parsed.problems, parsed.assets as [string, Uint8Array][]);
      await refresh(); await refreshAssets(); setLibraryPage(0); setMessage(`Imported ${result.added} problems. Skipped ${result.skipped} existing problems and ${parsed.skipped} index pages.`);
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
  function start(ids: string[], nextMode: typeof mode = 'manual') { setQueue(ids); setMode(ids.length ? nextMode : null); setBack(false); setQuestionFocus(false); setMessage(''); setError(''); }
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
      setMessage('Daily target saved. Increasing it adds available cards; lowering it keeps today’s existing selections.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the daily target.'); }
    finally { setBusy(false); }
  }
  async function randomPractice() {
    if (busy) return;
    setBusy(true); setError('');
    try { const id = await drawRandomProblem(); if (id) start([id], 'random'); }
    catch { setError('Could not select a random problem. Please try again.'); }
    finally { setBusy(false); }
  }
  async function regenerateDaily() {
    setBusy(true); setError('');
    try {
      const { changed } = await generateAnotherDailySet();
      await refresh();
      setMessage(changed ? `Replaced ${changed} unfinished suggestions. Completed reviews are preserved.` : 'No different due or unreviewed problems are available. Your set is unchanged.');
    } catch { setError('Could not generate another set. Your saved reviews are safe.'); }
    finally { setBusy(false); }
  }
  return <main><header><a className="brand" href="/">recall<span>.</span></a><nav className="header-nav" aria-label="Main navigation"><button className="text-button" disabled={busy} aria-pressed={!portal && !stats && !current} onClick={() => { start([]); setPortal(false); setStats(false); }}>Library</button><button className="text-button" disabled={!ready || busy} aria-pressed={portal && !stats && !current} onClick={() => { start([]); setPortal(true); setStats(false); }}>Questions</button><button className="text-button" disabled={!ready || busy} aria-pressed={stats && !current} onClick={() => { start([]); setPortal(false); setStats(true); }}>Stats</button></nav></header>
    {ready && <CloudSync onSynced={refresh} />}
    <input ref={input} hidden type="file" accept=".zip,.md,.markdown" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
    {error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    {!ready ? <p className="intro">{error ? 'Local storage is unavailable.' : 'Opening your library…'}</p> : current ? <section className="review-area">
      <div className="section-heading"><button className="text-button" disabled={busy} onClick={() => start([])}>{portal ? '← All questions' : '← Library'}</button><span className="count">{mode === 'daily' ? 'Daily session' : mode === 'random' ? 'Random practice' : 'Extra practice'} · {activeIds.length} remaining</span></div>
      <article className="review-card" key={current.id + String(back) + mode}><h1 className="problem-title">{current.title}</h1>
        {!back ? <><Reveal title="Question" content={current.description} path={current.sourcePath} assets={assets} /><button className="primary flip" onClick={() => setBack(true)}>Flip to answer →</button></> : <>
          <p className="metadata">{current.category} <span className={`difficulty difficulty-${current.difficulty?.toLowerCase() || 'unknown'}`}>{current.difficulty || 'Unrated'}</span></p>{current.url && <a href={current.url} target="_blank" rel="noreferrer">Open problem ↗</a>}
          {current.sections.map(s => <Reveal key={s.id} title={s.title} content={s.content} path={current.sourcePath} assets={assets} />)}
          <details className="original"><summary>Original imported Markdown</summary><NoteMarkdown content={current.original} assets={assets} path={current.sourcePath} /></details>
          <ProblemQuestions key={current.id} problemId={current.id} questions={questions.filter(q => q.problemId === current.id)} initiallyOpen={questionFocus} onSaved={question => setQuestions(previous => [...previous.filter(q => q.id !== question.id), question])} />
          <button className="text-button" onClick={() => setBack(false)}>← Back to question</button><p className="rating-label">How well did you recall it?</p>
          <div className="ratings">{(['Forgot', 'Rusty', 'Comfy'] as const).map(r => <button disabled={busy} key={r} onClick={() => void rate(r)}>{r}</button>)}</div>
        </>}
      </article>
    </section> : stats ? <Statistics problems={problems} reviews={activity.reviews} visits={activity.visits} /> : portal ? <section key="questions" className="questions-portal tab-panel" aria-labelledby="questions-title">
      <p className="eyebrow">YOUR FOLLOW-UP LIST</p><h1 className="tab-title" id="questions-title">Questions to revisit.</h1>
      <p className="subtitle">{questions.length} saved questions across {withQuestions.length} problems. Saved on this device.</p>
      <input className="question-search" type="search" aria-label="Search saved questions" placeholder="Search problem titles or your questions…" value={questionQuery} onChange={e => setQuestionQuery(e.target.value)} />
      {!withQuestions.length && <div className="empty-state"><h3>Keep track of what’s unclear.</h3><p>Open a problem, flip to its back, then open My questions to write your first question.</p><button className="secondary" onClick={() => setPortal(false)}>Browse library</button></div>}
      {questionMatches.map(problem => <article key={problem.id} className="question-group"><div className="section-heading"><h2>{problem.title}</h2><button className="secondary" onClick={() => { start([problem.id]); setQuestionFocus(true); setBack(true); }}>Open problem</button></div><ul>{questions.filter(q => q.problemId === problem.id).map(q => <li key={q.id}>{q.text}</li>)}</ul></article>)}
      {!!withQuestions.length && !questionMatches.length && <p className="muted">No saved questions match your search.</p>}
    </section> : <>
      <section key="library" className="intro tab-panel"><p className="eyebrow">SOLVED ONCE. REMEMBER LONGER.</p><h1 className="tab-title">A little recall.<br />A lot more confidence.</h1><p className="subtitle">Revisit the problems you’ve solved, with your own notes and the answers tucked away.</p>
        {daily && <section className="daily-panel" aria-labelledby="daily-title">
          <div className="section-heading"><h2 id="daily-title">Today’s review</h2><span className="count">{daily.day}</span></div>
          <div className="daily-progress"><strong>{daily.completedIds.length}<span> / {daily.selectedIds.length} completed</span></strong><span className="muted">Daily target: {target}</span></div>
          <progress aria-label="Daily review progress" max={daily.selectedIds.length || 1} value={daily.completedIds.length} />
          <p className="muted small">{!problems.length ? 'Import your notes to create your first daily set.' : dailyRemaining.length ? `${dailyRemaining.length} left in your saved set. Scheduled reviews first, then new problems.` : daily.selectedIds.length ? 'Daily set complete. You can stop here or keep practicing.' : 'You’re caught up. No reviews or new problems are waiting.'}</p>
          {daily.selectedIds.length > target && <p className="muted small">Your saved set is larger than your target. Existing selections stay available until completed.</p>}
          <div className="actions">
            <button className="primary" disabled={!dailyRemaining.length || busy} onClick={() => void beginDaily()}>{daily.completedIds.length ? 'Continue daily review' : 'Start daily review'} · {dailyRemaining.length}</button>
            <button className="secondary" disabled={!problems.length || busy} onClick={() => void randomPractice()}>Random problem ↝</button>
            {!!dailyRemaining.length && <button className="text-button" disabled={busy} onClick={() => void regenerateDaily()}>Generate another set ↻</button>}
            {!dailyRemaining.length && !!due.length && <button className="text-button" disabled={busy} onClick={() => start(due.slice(0, target).map(p => p.id), 'extra')}>Extra due practice · {Math.min(due.length, target)}</button>}
          </div>
          <p className="muted small">{due.length} scheduled reviews ready · {problems.filter(p => p.schedule.reps === 0).length} new problems. New problems have no review date until you rate them. Random practice cycles through a shuffled library before repeating, even after reopening the app. Only rating changes a schedule. Generating another set swaps unfinished suggestions; those skipped remain available for review.</p>
          <details className="daily-settings"><summary>Daily target</summary><form onSubmit={changeTarget}><label htmlFor="daily-target">Problems per day</label><div className="actions"><input id="daily-target" type="number" min="1" max="100" step="1" required value={targetDraft} onChange={e => setTargetDraft(e.target.value)} /><button className="secondary" disabled={busy} type="submit">Save target</button></div><p className="muted small">Unfinished cards carry forward at local midnight. Raising your target adds scheduled or new cards; lowering it doesn’t remove today’s saved cards.</p></form></details>
        </section>}
      </section>
      <section className="workspace" aria-labelledby="library-title"><div className="section-heading"><h2 id="library-title" ref={libraryHeading} tabIndex={-1}>Your library <span className="count">({problems.length})</span></h2><button className="primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Importing…' : 'Import notes +'}</button></div>
        {!problems.length ? <div className="empty-state"><div className="card-mark" aria-hidden="true">{'{ }'}</div><h3>Your next review starts here.</h3><p>Choose your Notion Markdown ZIP or an individual Markdown file. Missing fields are welcome.</p><span className="status">Your notes and reviews stay in this browser</span></div> : <>
          <div className="filters"><input aria-label="Search problem titles" placeholder="Search problems…" value={query} onChange={e => { setQuery(e.target.value); setLibraryPage(0); }} /><select aria-label="Filter by category" value={category} onChange={e => { setCategory(e.target.value); setLibraryPage(0); }}><option value="">All categories</option>{Array.from(new Set(problems.map(p => p.category))).sort().map(c => <option key={c}>{c}</option>)}</select><select aria-label="Filter by difficulty" value={difficulty} onChange={e => { setDifficulty(e.target.value); setLibraryPage(0); }}><option value="">All difficulties</option>{['Easy', 'Medium', 'Hard', 'Unrated'].map(d => <option key={d}>{d}</option>)}</select></div>
          <p className="muted small">Opening any problem lets you review early. A rating updates its next review date. Reimport skips existing cards.</p>
          {!!filtered.length && <LibraryPages page={currentPage} pageCount={pageCount} total={filtered.length} position="top" onPage={changeLibraryPage} />}
          <div className="problem-list">{pageProblems.map(p => <button className="problem-row" key={p.id} onClick={() => start([p.id])}><span><strong>{p.title}</strong><small>{p.category}</small></span><span className="count">{p.schedule.reps === 0 ? '' : +new Date(p.schedule.due) <= now ? 'Ready to review' : `Next review ${new Date(p.schedule.due).toLocaleDateString()}`} →</span></button>)}</div>
          {!!filtered.length && <LibraryPages page={currentPage} pageCount={pageCount} total={filtered.length} position="bottom" onPage={changeLibraryPage} />}
          {!filtered.length && <p className="muted">No problems match your search.</p>}
        </>}
      </section>
    </>}
    <footer><span>Built for remembering, at your own pace.</span><span>LeetCode Recall</span></footer>
  </main>;
}
