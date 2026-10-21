import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDB } from 'idb';
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';
import { parseMarkdown, readArchive } from '../src/lib/import';
import { importProblems, loadProblems, loadReviewState, loadQuestions, saveQuestion, saveRating } from '../src/lib/database';

test('missing fields and uneven fences preserve notes without invented content', () => {
  const raw = '# Test\n\n## BFS\n```sql\nprint(42)\n```\n- space: O(n)\n\nUnknown text remains.';
  const p = parseMarkdown('Category/Test.md', raw);
  assert.equal(p.original, raw);
  assert.equal(p.description, '');
  assert.ok(p.sections.some(s => s.content.includes('```sql\nprint(42)')));
  assert.ok(p.sections.some(s => s.content.includes('Unknown text remains.')));
  assert.equal(p.sections.find(s => s.title === 'BFS Runtime')?.content, '');
});

test('real export keeps every problem, excludes indexes, and preserves follow-up code', { skip: !process.env.RECALL_TEST_ARCHIVE }, () => {
  const result = readArchive(readFileSync(process.env.RECALL_TEST_ARCHIVE!));
  assert.equal(result.problems.length, 151);
  assert.equal(result.skipped, 18);
  assert.equal(result.assets.length, 7);
  const island = result.problems.find(p => p.title.includes('Number of Islands'))!;
  assert.ok(island.sections.some(s => s.title === 'Follow-up Code' && s.content.startsWith('```sql')));
  assert.equal(island.sections.find(s => s.title === 'BFS Runtime')?.content, '');
});

test('repeat imports skip duplicates and preserve original notes and persisted reviews', async () => {
  const p = parseMarkdown('Category/One.md', '# One\nMy original notes');
  assert.deepEqual(await importProblems([p], []), { added: 1, skipped: 0 });
  await saveRating(p.id, 'Rusty');
  const before = (await loadProblems())[0];
  assert.deepEqual(await importProblems([{ ...p, original: 'Replacement' }], []), { added: 0, skipped: 1 });
  const after = (await loadProblems())[0];
  assert.deepEqual(after, before);
  assert.equal(after.schedule.reps, 1);
  const db = await openDB('leetcode-recall');
  assert.equal(await db.count('reviews'), 1);
  assert.equal((await db.getAll('reviews'))[0].rating, 'Rusty');
});

test('FSRS maps comparable rusty reviews earlier than comfy reviews', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false });
  const card = createEmptyCard(now);
  assert.ok(+scheduler.next(card, now, Rating.Hard).card.due < +scheduler.next(card, now, Rating.Good).card.due);
});

test('trailing Python runtime/run/space comments are extracted per approach without changing code', () => {
  const bfs = '```python\n# runtime: do not extract an introductory comment\nprint(42)\n\n# run: O(M * N)\n# M is row num; N is col num\n# space O(M * N)\n```';
  const dfs = '```sql\nprint(1)\n    # Runtime: O(N)\n    # space: O(H)\n```';
  const raw = '# Grid\n\n## BFS\n' + bfs + '\n\n## DFS\n' + dfs;
  const p = parseMarkdown('Graph/Grid.md', raw);
  assert.equal(p.original, raw);
  assert.equal(p.sections.find(s => s.title === 'BFS Code')?.content, bfs);
  assert.equal(p.sections.find(s => s.title === 'DFS Code')?.content, dfs);
  assert.equal(p.sections.find(s => s.title === 'BFS Runtime')?.content, 'run: O(M * N)\nM is row num; N is col num');
  assert.equal(p.sections.find(s => s.title === 'BFS Space complexity')?.content, 'space O(M * N)');
  assert.equal(p.sections.find(s => s.title === 'DFS Runtime')?.content, 'Runtime: O(N)');
  assert.equal(p.sections.find(s => s.title === 'DFS Space complexity')?.content, 'space: O(H)');
});

test('inline and interior comments do not become complexity; unclosed fences retain trailing comments', () => {
  const interior = parseMarkdown('One.md', '# One\n```python\n# runtime: O(N)\nprint(1) # space: O(N)\n```');
  assert.equal(interior.sections.find(s => s.title === 'Runtime')?.content, '');
  assert.equal(interior.sections.find(s => s.title === 'Space complexity')?.content, '');
  const unclosed = parseMarkdown('Two.md', '# Two\n```python\nprint(1)\n# runtime O(1)\n# space = O(1)');
  assert.equal(unclosed.sections.find(s => s.title === 'Runtime')?.content, 'runtime O(1)');
  assert.equal(unclosed.sections.find(s => s.title === 'Space complexity')?.content, 'space = O(1)');
});


test('existing imported cards refresh parsed sections without changing schedules, review logs, or questions', async () => {
  const raw = '# Existing approach\n\n## BFS\n```python\nprint(1)\n# runtime: O(N)\n# space: O(1)\n```';
  const imported = parseMarkdown('Graph/Existing.md', raw);
  const legacy = { ...imported, sections: imported.sections.filter(s => s.title.endsWith('Code')), schedule: createEmptyCard(), parserVersion: 1 };
  const db = await openDB('leetcode-recall');
  await db.put('problems', legacy);
  const question = await saveQuestion(legacy.id, 'Why is this linear?');
  const logCount = await db.count('reviews');
  await loadReviewState();
  const updated = await db.get('problems', legacy.id);
  assert.equal(updated.sections.find((s: { title: string }) => s.title === 'BFS Runtime').content, 'runtime: O(N)');
  assert.deepEqual(updated.schedule, legacy.schedule);
  assert.equal(updated.original, raw);
  assert.equal(updated.id, legacy.id);
  assert.deepEqual(await loadQuestions(legacy.id), [question]);
  assert.equal(await db.count('reviews'), logCount);
  await loadReviewState();
  assert.deepEqual(await db.get('problems', legacy.id), updated);
  db.close();
});
