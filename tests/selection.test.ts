import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDB } from 'idb';
import { nextRandomProblem, regenerateDailySession, type RandomCycle } from '../src/lib/daily';
import { importProblems, drawRandomProblem, generateAnotherDailySet, loadReviewState, saveRating } from '../src/lib/database';
import { parseMarkdown } from '../src/lib/import';

test('random cycle visits every ID once, avoids boundary repeats and handles changed libraries', () => {
  const ids = ['a', 'b', 'c', 'd'];
  let cycle: RandomCycle | undefined;
  const selected: string[] = [];
  for (let i = 0; i < 12; i++) {
    const next = nextRandomProblem(ids, cycle, () => .5);
    selected.push(next.id!); cycle = next.cycle;
  }
  for (let i = 0; i < 12; i += 4) assert.equal(new Set(selected.slice(i, i + 4)).size, 4);
  for (let i = 1; i < selected.length; i++) assert.notEqual(selected[i], selected[i - 1]);
  assert.equal(nextRandomProblem([], cycle).id, undefined);
  assert.equal(nextRandomProblem(['only'], cycle).id, 'only');
  const altered = nextRandomProblem(['new', 'b'], { knownIds: ['a', 'b'], remainingIds: ['a', 'b'], lastId: 'a' }, () => .5);
  assert.ok(['new', 'b'].includes(altered.id!));
  assert.deepEqual(new Set([altered.id, ...altered.cycle.remainingIds]), new Set(['new', 'b']));
});

test('regeneration preserves completed reviews, excludes current suggestions and future scheduled cards', () => {
  const now = new Date(), old = new Date(0);
  const problems = ['done', 'old', 'fresh', 'due', 'future'].map(id => ({ id, schedule: { due: id === 'future' ? new Date(+now + 100000) : old, reps: id === 'fresh' ? 0 : 1 } }));
  const current = { day: 'today', selectedIds: ['done', 'old'], completedIds: ['done'] };
  const next = regenerateDailySession(problems, current, 3, now);
  assert.deepEqual(next, { day: 'today', selectedIds: ['done', 'due', 'fresh'], completedIds: ['done'] });
  assert.deepEqual(regenerateDailySession(problems.slice(0, 2), current, 2, now), current);
  const larger = { ...current, selectedIds: ['done', 'old', 'fresh', 'due'], completedIds: [] };
  assert.equal(regenerateDailySession(problems, larger, 2, now).selectedIds.length, 2);
  assert.deepEqual(current.selectedIds, ['done', 'old']);
});

test('random draws persist atomically and regeneration does not reset ratings or schedules', async () => {
  const problems = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => parseMarkdown(`${id}.md`, `# ${id}`));
  await importProblems(problems, []);
  const now = new Date();
  const state = await loadReviewState(now, 3);
  await saveRating(state.daily.selectedIds[0], 'Comfy', state.daily.day, now);
  const db = await openDB('leetcode-recall');
  const before = await db.getAll('problems'), logs = await db.getAll('reviews');
  const draws = await Promise.all(problems.map(() => drawRandomProblem()));
  assert.equal(new Set(draws).size, 6);
  assert.deepEqual((await db.get('settings', 'random')).randomCycle.remainingIds, []);
  const next = await drawRandomProblem();
  assert.notEqual(next, draws.at(-1));
  const result = await generateAnotherDailySet(now);
  assert.equal(result.changed, 2);
  assert.deepEqual(result.daily.completedIds, [state.daily.selectedIds[0]]);
  assert.equal(result.daily.selectedIds.length, 3);
  assert.deepEqual(await db.getAll('problems'), before);
  assert.deepEqual(await db.getAll('reviews'), logs);
  assert.deepEqual((await loadReviewState(now)).daily, result.daily);
  db.close();
});
