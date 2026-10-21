import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDB } from 'idb';
import { createEmptyCard } from 'ts-fsrs';
import { parseMarkdown } from '../src/lib/import';
import { loadStatistics, recordVisit, loadReviewState, saveRating, type Problem, type SavedReview } from '../src/lib/database';
import { categoryStatistics } from '../src/lib/statistics';
import { buildDailySession, dueProblems } from '../src/lib/daily';

test('new cards are not overdue; daily selection prefers scheduled reviews then offers new cards', () => {
  const now = new Date();
  const cards = [
    { id: 'new', schedule: { due: new Date(0), reps: 0 } },
    { id: 'review', schedule: { due: new Date(+now - 1000), reps: 2 } },
    { id: 'later', schedule: { due: new Date(+now + 99999), reps: 1 } },
  ];
  assert.deepEqual(dueProblems(cards, now).map(p => p.id), ['review']);
  assert.deepEqual(buildDailySession(cards, undefined, 3, now).selectedIds, ['review', 'new']);
});

test('v3 upgrade keeps existing data; concurrent visits do not rate or reschedule a card', async () => {
  const p = { ...parseMarkdown('Arrays/One.md', '# One'), schedule: createEmptyCard() };
  const old = await openDB('leetcode-recall', 3, { upgrade(db) {
    for (const name of ['problems', 'reviews', 'questions']) db.createObjectStore(name, { keyPath: 'id' });
    for (const name of ['assets', 'settings', 'sessions']) db.createObjectStore(name);
  } });
  await old.put('problems', p);
  await old.put('questions', { id: 'q', problemId: p.id, text: 'Keep this question' });
  await old.put('assets', new Blob(['image']), 'image.png');
  old.close();
  await loadReviewState();
  const db = await openDB('leetcode-recall');
  assert.equal(db.version, 4);
  const before = await db.get('problems', p.id), session = await db.get('sessions', 'daily');
  await Promise.all([recordVisit(p.id), recordVisit(p.id)]);
  const stats = await loadStatistics();
  assert.equal(stats.visits[0].count, 2);
  assert.deepEqual(stats.reviews, []);
  assert.deepEqual(await db.get('problems', p.id), before);
  assert.deepEqual(await db.get('sessions', 'daily'), session);
  assert.equal(await db.count('questions'), 1); assert.equal(await db.count('assets'), 1);
  await assert.rejects(() => recordVisit('unknown'));
  await saveRating(p.id, 'Rusty'); await saveRating(p.id, 'Comfy');
  const saved = await loadStatistics();
  assert.equal(saved.visits[0].count, 2);
  assert.deepEqual(saved.reviews.map(r => r.rating).sort(), ['Comfy', 'Rusty']);
  db.close();
});

test('category comparisons use latest rating per problem and exclude unrated problems', () => {
  const problems = ['a', 'b', 'c', 'd'].map((id, i) => ({ ...parseMarkdown(`${i < 3 ? 'Arrays' : 'Graphs'}/${id}.md`, `# ${id}`), id, schedule: createEmptyCard() })) satisfies Problem[];
  const reviews = [
    { id: '1', problemId: 'a', rating: 'Forgot', at: new Date(1) },
    { id: '2', problemId: 'a', rating: 'Comfy', at: new Date(2) },
    { id: '3', problemId: 'b', rating: 'Rusty', at: new Date(3) },
  ] as SavedReview[];
  const rows = categoryStatistics(problems, reviews.reverse());
  assert.deepEqual(rows[0], { category: 'Arrays', total: 3, rated: 2, Forgot: 0, Rusty: 1, Comfy: 1, comfyRate: .5 });
  assert.equal(rows[1].comfyRate, null);
});
