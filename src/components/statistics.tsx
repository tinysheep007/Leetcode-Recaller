'use client';
import { useState } from 'react';
import type { Problem, SavedReview, ProblemVisits } from '@/lib/database';
import { categoryStatistics } from '@/lib/statistics';

export default function Statistics({ problems, reviews, visits }: { problems: Problem[]; reviews: SavedReview[]; visits: ProblemVisits[] }) {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState(''), [order, setOrder] = useState('least');
  const categories = categoryStatistics(problems, reviews).sort((a, b) => {
    if (a.comfyRate === null) return b.comfyRate === null ? a.category.localeCompare(b.category) : 1;
    if (b.comfyRate === null) return -1;
    return (order === 'least' ? a.comfyRate - b.comfyRate : b.comfyRate - a.comfyRate) || a.category.localeCompare(b.category);
  });
  const validReviews = reviews.filter(r => problems.some(p => p.id === r.problemId) && Number.isFinite(+new Date(r.at)));
  const matches = problems.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(matches.length / 10));
  const currentPage = Math.min(page, pageCount - 1);
  return <section className="statistics tab-panel" aria-labelledby="stats-title">
    <p className="eyebrow">YOUR RECALL OVER TIME</p><h1 className="tab-title" id="stats-title">Your progress.</h1>
    <p className="subtitle">{visits.reduce((total, v) => total + v.count, 0)} visits tracked · {validReviews.length} ratings · {new Set(validReviews.map(r => r.problemId)).size} problems rated</p>
    <p className="muted small">Visits count each time you open a problem, including reopening after reload. Flipping and revealing do not add visits. Visit tracking starts with this update; previous ratings are included.</p>
    <div className="section-heading"><h2>Recall by category</h2><select className="stats-select" aria-label="Sort categories" value={order} onChange={e => setOrder(e.target.value)}><option value="least">Least comfy first</option><option value="most">Most comfy first</option></select></div>
    <p className="muted small">Comfy percentage uses each rated problem’s latest rating. Unrated problems are excluded from the percentage; counts show how much you’ve reviewed.</p>
    {!!categories.length && <figure className="recall-chart" aria-label="Latest recall ratings by category">
      <figcaption>Latest rating per problem · each bar represents a full category</figcaption>
      <div className="chart-legend">{['Forgot', 'Rusty', 'Comfy', 'Unrated'].map(label => <span key={label}><i aria-hidden="true" className={`chart-swatch chart-${label.toLowerCase()}`} />{label}</span>)}</div>
      {categories.map(c => <div className="chart-row" key={c.category}>
        <div className="chart-label"><strong>{c.category}</strong><span>{c.rated}/{c.total} rated · {c.comfyRate === null ? 'No ratings yet' : `${Math.round(c.comfyRate * 100)}% comfy among rated`}</span></div>
        <div className="chart-bar" role="img" aria-label={`${c.category}: ${c.Forgot} Forgot, ${c.Rusty} Rusty, ${c.Comfy} Comfy, ${c.total - c.rated} unrated`}>
          {([{ name: 'Forgot', count: c.Forgot }, { name: 'Rusty', count: c.Rusty }, { name: 'Comfy', count: c.Comfy }, { name: 'Unrated', count: c.total - c.rated }]).map(segment => segment.count > 0 && <span key={segment.name} title={`${segment.name}: ${segment.count}`} className={`chart-${segment.name.toLowerCase()}`} style={{ width: `${segment.count / c.total * 100}%` }} />)}
        </div>
      </div>)}
    </figure>}
    <details className="stats-breakdown"><summary>View exact category counts</summary>
    <div className="stats-table"><table><thead><tr><th>Category</th><th>Rated</th><th>Forgot</th><th>Rusty</th><th>Comfy</th><th>Comfy %</th></tr></thead><tbody>{categories.map(c => <tr key={c.category}><th scope="row">{c.category}</th><td>{c.rated}/{c.total}</td><td>{c.Forgot}</td><td>{c.Rusty}</td><td>{c.Comfy}</td><td>{c.comfyRate === null ? '—' : `${Math.round(c.comfyRate * 100)}%`}</td></tr>)}</tbody></table></div></details>
    {!problems.length && <p className="muted">Import your notes to start tracking progress.</p>}
    <h2>Problem history</h2><input className="question-search" type="search" aria-label="Search problem history" placeholder="Search problem titles…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} />
    {!matches.length && <p className="muted">No problems match your search.</p>}
    {matches.slice(currentPage * 10, (currentPage + 1) * 10).map(problem => {
      const history = validReviews.filter(r => r.problemId === problem.id).sort((a, b) => +new Date(b.at) - +new Date(a.at) || b.id.localeCompare(a.id));
      const visit = visits.find(v => v.problemId === problem.id);
      return <details className="history-problem" key={problem.id}><summary>{problem.title}<span className="muted small">{visit?.count ?? 0} visits · {history.length} ratings{history[0] ? ` · Latest: ${history[0].rating}` : ''}</span></summary>
        <p className="muted small">Last visit: {visit ? new Date(visit.lastVisitedAt).toLocaleString() : 'Not tracked yet'}</p>
        {history.length ? <ol>{history.map(r => <li key={r.id}><time dateTime={new Date(r.at).toISOString()}>{new Date(r.at).toLocaleString()}</time> · <strong>{r.rating}</strong></li>)}</ol> : <p className="muted">No ratings yet.</p>}
      </details>;
    })}
    {matches.length > 10 && <nav className="pagination" aria-label="Problem history pages">{currentPage > 0 && <button className="secondary" onClick={() => setPage(currentPage - 1)}>← Previous</button>}<span className="count">Page {currentPage + 1} of {pageCount}</span>{currentPage < pageCount - 1 && <button className="secondary" onClick={() => setPage(currentPage + 1)}>Next →</button>}</nav>}
  </section>;
}
