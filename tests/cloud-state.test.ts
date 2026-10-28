import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';
import { calendarDay, emptySharedState, freezeDailyEmail, parseSyncInput, SelectionConflict, updateSharedState } from '../src/lib/remote-state';
import { applyCloudSync, importProblems, loadProblems, loadQuestions, prepareCloudSync, saveQuestion, saveRating } from '../src/lib/database';
import { parseMarkdown } from '../src/lib/import';

const now = new Date('2026-10-27T12:00:00Z'), zone = 'America/New_York';
const input = () => parseSyncInput(JSON.parse(JSON.stringify({
  target: 3, problems: ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id, title: `Problem ${id}`, category: 'Arrays', schedule: createEmptyCard(now), original: 'Do not upload private notes', questions: ['private'] })),
})));

test('sync whitelists metadata, validates schedules and keeps one stable shared selection', () => {
  const parsed = input();
  assert.equal(JSON.stringify(parsed).includes('private'), false);
  const state = updateSharedState(emptySharedState(), 0, parsed, now, zone);
  assert.equal(state.daily?.selectedIds.length, 3);
  assert.deepEqual(updateSharedState(state, 1, parsed, now, zone), state);
  assert.equal(calendarDay(new Date('2026-10-28T02:00:00Z'), zone), '2026-10-27');
  assert.throws(() => parseSyncInput({ ...parsed, target: 0 }));
  assert.throws(() => parseSyncInput(JSON.parse(JSON.stringify({ ...parsed, problems: [{ ...parsed.problems[0], schedule: { due: 'bad' } }] }))));
});

test('stale devices cannot replace newer schedules or remove completed IDs; stale regeneration conflicts', () => {
  const parsed = input();
  const first = updateSharedState(emptySharedState(), 0, parsed, now, zone);
  const rated = structuredClone(parsed);
  rated.problems[0].schedule = fsrs({ enable_fuzz: false }).next(rated.problems[0].schedule, now, Rating.Good).card;
  rated.daily = { ...first.daily!, completedIds: ['a'] };
  const second = updateSharedState(first, 1, rated, now, zone);
  const third = updateSharedState(second, 2, parsed, now, zone);
  assert.equal(third.problems[0].schedule.reps, 1);
  assert.deepEqual(third.daily?.completedIds, ['a']);
  assert.throws(() => updateSharedState(third, 3, { ...parsed, generation: { id: 'request-1', baseVersion: 1 } }, now, zone), SelectionConflict);
  const regenerated = updateSharedState(third, 3, { ...parsed, generation: { id: 'request-1', baseVersion: 3 } }, now, zone);
  assert.deepEqual(regenerated.daily?.completedIds, ['a']);
  assert.equal(regenerated.daily?.selectedIds.length, 3);
  assert.ok(!regenerated.daily?.selectedIds.includes('b'));
  assert.deepEqual(updateSharedState(regenerated, 4, { ...parsed, generation: { id: 'request-1', baseVersion: 3 } }, now, zone), regenerated);
});

test('email retries retain exact titles after later regeneration, but an empty library is not frozen', () => {
  const state = updateSharedState(emptySharedState(), 0, input(), now, zone);
  const frozen = freezeDailyEmail(state, '2026-10-27');
  const changed = updateSharedState(frozen, 1, { ...input(), generation: { id: 'new-set', baseVersion: 1 } }, now, zone);
  assert.deepEqual(freezeDailyEmail(changed, '2026-10-27').email, frozen.email);
  assert.equal(frozen.email?.titles.length, 3);
  assert.equal(freezeDailyEmail(emptySharedState(), '2026-10-27').email, undefined);
});

test('responses cannot overwrite in-flight local ratings; imports hydrate remote-only placeholders', async () => {
  const local = parseMarkdown('Arrays/One.md', '# Local fixture\nPrivate original');
  await importProblems([local], []);
  const question = await saveQuestion(local.id, 'Private question');
  const prepared = await prepareCloudSync();
  assert.equal(JSON.stringify(prepared.input).includes('Private'), false);
  await saveRating(local.id, 'Comfy');
  const state = updateSharedState(emptySharedState(), 0, prepared.input, new Date(), zone);
  assert.equal(await applyCloudSync({ version: 1, state, timeZone: zone }, prepared.localVersion), false);
  assert.equal((await loadProblems())[0].schedule.reps, 1);
  assert.deepEqual(await loadQuestions(local.id), [question]);
  const latest = await prepareCloudSync();
  const remote = updateSharedState(state, 1, latest.input, new Date(), zone);
  const original = parseMarkdown('Arrays/Two.md', '# 1. Two Sum\nhttps://leetcode.com/problems/two-sum/\nMy actual code notes');
  remote.problems.push({ id: original.id, title: original.title, category: original.category, schedule: createEmptyCard() });
  assert.equal(await applyCloudSync({ version: 2, state: remote, timeZone: zone }, latest.localVersion), true);
  assert.equal((await loadProblems()).find(p => p.id === original.id)?.metadataOnly, true);
  await importProblems([original], []);
  const hydrated = (await loadProblems()).find(p => p.id === original.id)!;
  assert.equal(hydrated.original, original.original);
  assert.equal(hydrated.metadataOnly, undefined);
  const beforeConflict = await prepareCloudSync();
  const conflicted = structuredClone(remote);
  conflicted.daily = { day: beforeConflict.input.daily!.day, selectedIds: [local.id], completedIds: [] };
  await applyCloudSync({ version: 3, state: conflicted, timeZone: zone }, beforeConflict.localVersion, true);
  assert.deepEqual((await prepareCloudSync()).input.daily!.completedIds, [local.id]);
  assert.deepEqual(await loadQuestions(local.id), [question]);
});
