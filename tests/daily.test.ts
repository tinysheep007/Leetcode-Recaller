import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDB } from 'idb';
import { createEmptyCard } from 'ts-fsrs';
import { buildDailySession, pendingIds, localDay, randomProblemId, validTarget } from '../src/lib/daily';
import { loadReviewState, saveRating } from '../src/lib/database';
import { parseMarkdown } from '../src/lib/import';
const day = new Date(2026, 9, 20, 12);
const problems = Array.from({ length: 8 }, (_, i) => ({ id: String(i), schedule: { due: new Date(+day - (8 - i) * 60000) } }));

test('daily set is bounded, oldest-first, stable on reopening and does not repeat completed cards', () => {
  const session = buildDailySession(problems, undefined, 5, day);
  assert.deepEqual(session.selectedIds, ['0', '1', '2', '3', '4']);
  session.completedIds.push('0');
  assert.deepEqual(buildDailySession([...problems].reverse(), session, 5, day), session);
  assert.deepEqual(pendingIds(session), ['1', '2', '3', '4']);
  assert.equal(buildDailySession(problems, session, 3, day).selectedIds.length, 5);
  assert.equal(buildDailySession(problems, session, 7, day).selectedIds.length, 7);
});

test('next day carries unfinished cards first and fills only available target slots', () => {
  const yesterday = { day: localDay(new Date(2026, 9, 19)), selectedIds: ['4', '5', '6'], completedIds: ['5'] };
  const session = buildDailySession(problems, yesterday, 3, day);
  assert.deepEqual(session.selectedIds, ['4', '6', '0']);
  assert.deepEqual(session.completedIds, []);
  const moreCarry = buildDailySession(problems, { ...yesterday, completedIds: [] }, 1, day);
  assert.deepEqual(moreCarry.selectedIds, ['4', '5', '6']);
});

test('no due cards stays empty; newly due cards fill open slots; completed set stays finished', () => {
  const future = [{ id: 'later', schedule: { due: new Date(+day + 60000) } }];
  const empty = buildDailySession(future, undefined, 1, day);
  assert.deepEqual(empty.selectedIds, []);
  assert.deepEqual(buildDailySession(future, empty, 1, new Date(+day + 60001)).selectedIds, ['later']);
  const complete = { day: localDay(day), selectedIds: ['0'], completedIds: ['0'] };
  assert.deepEqual(buildDailySession(problems, complete, 1, day), complete);
});

test('days follow local midnight and random selection includes cards not due yet without mutation', () => {
  assert.notEqual(localDay(new Date(2026, 9, 20, 23, 59)), localDay(new Date(2026, 9, 21, 0, 0)));
  assert.equal(randomProblemId([], () => 0), undefined);
  const source = [...problems, { id: 'future', schedule: { due: new Date(+day + 999999) } }];
  const before = structuredClone(source);
  assert.equal(randomProblemId(source, () => 0), '0');
  assert.equal(randomProblemId(source, () => .999), 'future');
  assert.deepEqual(source, before);
  for (const value of [0, -1, 1.5, NaN, 101]) assert.throws(() => validTarget(value));
});

test('v1 storage upgrades without losing data; daily completion and rating commit together', async () => {
  const old = await openDB('leetcode-recall', 1, { upgrade(db) {
    db.createObjectStore('problems', { keyPath: 'id' });
    db.createObjectStore('reviews', { keyPath: 'id' });
    db.createObjectStore('assets');
  } });
  const entries = problems.map(p => ({ ...parseMarkdown(`${p.id}.md`, `# Problem ${p.id}`), id: p.id, schedule: createEmptyCard(p.schedule.due) }));
  for (const p of entries) await old.put('problems', p);
  await old.put('assets', new Blob(['original-image']), 'image.png');
  await old.put('reviews', { id: 'legacy-review', rating: 'Rusty' });
  old.close();
  const state = await loadReviewState(day, 2);
  assert.equal(state.problems.length, 8);
  assert.equal(state.target, 2);
  assert.deepEqual(state.daily.selectedIds, ['0', '1']);
  const check = await openDB('leetcode-recall', 2);
  assert.equal(await check.count('assets'), 1);
  assert.equal(await check.count('reviews'), 1);
  await saveRating('0', 'Comfy', state.daily.day, day);
  const saved = await loadReviewState(day);
  assert.deepEqual(saved.daily.completedIds, ['0']);
  assert.deepEqual(pendingIds(saved.daily), ['1']);
  assert.equal(saved.problems.find(p => p.id === '0')!.schedule.reps, 1);
  assert.equal(await check.count('reviews'), 2);
  await assert.rejects(() => saveRating('0', 'Forgot', state.daily.day, day), /session changed/);
  assert.equal(await check.count('reviews'), 2);
  // Rating a selected card outside daily mode satisfies the same obligation once.
  await saveRating('1', 'Rusty', undefined, day);
  assert.deepEqual((await loadReviewState(day)).daily.completedIds, ['0', '1']);
  assert.equal((await loadReviewState(day)).target, 2);
  await assert.rejects(() => loadReviewState(day, 0));
  assert.equal((await loadReviewState(day)).target, 2);
  const nextDay = await loadReviewState(new Date(2026, 9, 21, 12));
  assert.equal(nextDay.daily.selectedIds.length, 2);
  assert.deepEqual(nextDay.daily.completedIds, []);
  check.close();
});
