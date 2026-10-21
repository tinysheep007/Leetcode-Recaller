import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDB } from 'idb';
import { createEmptyCard } from 'ts-fsrs';
import { parseMarkdown } from '../src/lib/import';
import { importProblems, loadProblems, loadQuestions, loadReviewState, saveQuestion, saveRating } from '../src/lib/database';

test('v2 upgrade preserves notes, reviews, settings, sessions and images; questions survive edits, reimports and ratings', async () => {
  const a = { ...parseMarkdown('Graph/One.md', '# One\nMy original notes'), schedule: createEmptyCard() };
  const b = { ...parseMarkdown('Graph/Two.md', '# Two\nOther notes'), schedule: createEmptyCard() };
  const old = await openDB('leetcode-recall', 2, { upgrade(db) {
    db.createObjectStore('problems', { keyPath: 'id' }); db.createObjectStore('reviews', { keyPath: 'id' });
    db.createObjectStore('assets'); db.createObjectStore('settings'); db.createObjectStore('sessions');
  } });
  await old.put('problems', a); await old.put('problems', b);
  await old.put('reviews', { id: 'previous', rating: 'Rusty' });
  await old.put('assets', new Blob(['image']), 'image.png');
  await old.put('settings', { dailyTarget: 3 }, 'preferences');
  const existingSession = { day: '2026-10-20', selectedIds: [a.id], completedIds: [] };
  await old.put('sessions', existingSession, 'daily'); old.close();

  assert.deepEqual(await loadQuestions(), []);
  const check = await openDB('leetcode-recall');
  assert.equal(check.version, 4);
  assert.deepEqual(await check.get('problems', a.id), a);
  assert.equal(await check.count('reviews'), 1); assert.equal(await check.count('assets'), 1);
  assert.deepEqual(await check.get('sessions', 'daily'), existingSession);
  assert.equal((await check.get('settings', 'preferences')).dailyTarget, 3);

  const first = await saveQuestion(a.id, '  Why do we mark visited before enqueuing?  ');
  const second = await saveQuestion(a.id, 'What is the queue space cost?');
  const third = await saveQuestion(b.id, 'Could this use a set?');
  assert.equal(first.text, 'Why do we mark visited before enqueuing?');
  assert.equal((await loadQuestions(a.id)).length, 2);
  assert.equal((await loadQuestions(b.id))[0].id, third.id);
  assert.equal((await loadQuestions()).length, 3);
  // Writing questions never grades a card or completes its daily obligation.
  assert.deepEqual((await loadProblems()).find(p => p.id === a.id)?.schedule, a.schedule);
  assert.deepEqual(await check.get('sessions', 'daily'), existingSession);
  assert.equal(await check.count('reviews'), 1);

  const edited = await saveQuestion(a.id, 'Why mark visited before adding to the queue?\nKeep both lines.', first.id);
  assert.equal(edited.id, first.id); assert.deepEqual(edited.createdAt, first.createdAt);
  assert.equal((await loadQuestions(a.id)).length, 2);
  await assert.rejects(() => saveQuestion(b.id, 'Move across problems', first.id), /could not be found/);
  await assert.rejects(() => saveQuestion('missing-problem', 'Question'), /Problem not found/);
  await assert.rejects(() => saveQuestion(a.id, '   '));
  await assert.rejects(() => saveQuestion(a.id, 'x'.repeat(10001)));
  assert.equal((await loadQuestions(a.id)).find(q => q.id === first.id)?.text, edited.text);

  await importProblems([a], []);
  await loadReviewState();
  await saveRating(a.id, 'Comfy');
  assert.equal((await loadQuestions(a.id)).length, 2);
  assert.deepEqual((await loadQuestions(a.id)).find(q => q.id === second.id), second);
  assert.equal((await loadQuestions(a.id)).find(q => q.id === first.id)?.text, edited.text);
  assert.equal((await loadProblems()).find(p => p.id === a.id)?.original, a.original);
  assert.equal(await check.count('reviews'), 2);
  check.close();
});
