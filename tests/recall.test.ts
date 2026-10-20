import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDB } from 'idb';
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';
import { parseMarkdown, readArchive } from '../src/lib/import';
import { importProblems, loadProblems, saveRating } from '../src/lib/database';

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
