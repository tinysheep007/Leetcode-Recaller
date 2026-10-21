import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDB } from 'idb';
import { createEmptyCard } from 'ts-fsrs';
import { findProblemReference, withProblemReference } from '../src/lib/problem-references';
import { parseMarkdown, readArchive, PARSER_VERSION } from '../src/lib/import';
import { importProblems, loadProblems, loadQuestions, loadReviewState, saveQuestion, saveRating } from '../src/lib/database';

test('matches explicit title aliases, not unrelated platform numbers or similar titles', () => {
  assert.equal(findProblemReference('178 · Graph Valid Tree')?.url, 'https://leetcode.com/problems/graph-valid-tree/');
  assert.equal(findProblemReference('268. Missing Numbers')?.url, 'https://leetcode.com/problems/missing-number/');
  assert.equal(findProblemReference('208. Implement Tree (Prefix tree)')?.url, 'https://leetcode.com/problems/implement-trie-prefix-tree/');
  assert.equal(findProblemReference('Two Sums II')?.url, 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/');
  assert.equal(findProblemReference('1. Something else'), undefined);
  assert.equal(findProblemReference('Two Sum III'), undefined);
  assert.equal(findProblemReference('Encode and Decode Strings')?.description, '');
  assert.equal(findProblemReference('76. Minimum Window Substring')?.difficulty, 'Hard');
  assert.equal(findProblemReference('49. Group Anagrams')?.difficulty, 'Medium');
  assert.equal(findProblemReference('AlgoMonster - Newspapers')?.difficulty, undefined);
  const unknown = { title: 'Unknown', description: '', url: '' };
  assert.equal(withProblemReference(unknown), unknown);
  const conflicting = { title: 'Two Sum', description: '', url: 'https://example.com/different-variant' };
  assert.equal(withProblemReference(conflicting), conflicting);
});

test('reference metadata persists on import and backfills existing cards without losing progress', async () => {
  const imported = parseMarkdown('Arrays/217.md', '# 217. Contains Duplicate\nMy notes');
  await importProblems([imported], []);
  const fresh = (await loadProblems()).find(p => p.id === imported.id)!;
  assert.ok(fresh.description); assert.ok(fresh.url); assert.equal(fresh.difficulty, 'Easy');
  assert.equal(fresh.id, imported.id);
  // Seed a pre-enrichment record, then preserve an actual rating and personal question.
  const legacy = parseMarkdown('Arrays/1.md', '# 1. Two Sum\nOriginal notes');
  const db = await openDB('leetcode-recall');
  await db.put('problems', { ...legacy, schedule: createEmptyCard(), parserVersion: PARSER_VERSION });
  await saveRating(legacy.id, 'Comfy');
  const question = await saveQuestion(legacy.id, 'Why are distinct positions required?');
  const before = await db.get('problems', legacy.id);
  const logs = await db.getAll('reviews');
  const session = await db.get('sessions', 'daily');
  const state = await loadReviewState();
  const after = state.problems.find(p => p.id === legacy.id)!;
  assert.ok(after.description); assert.equal(after.url, 'https://leetcode.com/problems/two-sum/');
  const { difficulty, ...withoutDifficulty } = after;
  assert.equal(difficulty, 'Easy');
  assert.deepEqual({ ...withoutDifficulty, description: '', url: '' }, before);
  assert.deepEqual(await loadQuestions(legacy.id), [question]);
  assert.deepEqual(await db.getAll('reviews'), logs);
  assert.deepEqual(await db.get('sessions', 'daily'), session);
  assert.deepEqual((await loadReviewState()).problems.find(p => p.id === legacy.id), after);
  assert.deepEqual(await importProblems([legacy], []), { added: 0, skipped: 1 });
  assert.deepEqual(await db.get('problems', legacy.id), after);
  const custom = { ...after, description: 'Previously supplied description' };
  await db.put('problems', custom);
  await loadReviewState();
  assert.deepEqual(await db.get('problems', legacy.id), custom);
  db.close();
});

test('real archive reference coverage includes all titles with only documented description gaps', { skip: !process.env.RECALL_TEST_ARCHIVE }, () => {
  const problems = readArchive(readFileSync(process.env.RECALL_TEST_ARCHIVE!)).problems;
  assert.equal(problems.length, 151);
  const enriched = problems.map(withProblemReference);
  assert.deepEqual(enriched.filter(p => !p.url).map(p => p.title), []);
  assert.deepEqual(enriched.filter(p => !p.description).map(p => p.title).sort(), [
    'Encode and Decode Strings',
    '3651 · Number of Connected Components in an Undirected Graph',
    '892 · Alien Dictionary',
    '920 · Meeting Rooms',
    '919 · Meeting Rooms II',
  ].sort());
  assert.equal(enriched.filter(p => p.difficulty).length, 149);
  for (let i = 0; i < problems.length; i++) {
    assert.equal(enriched[i].id, problems[i].id);
    assert.equal(enriched[i].original, problems[i].original);
    assert.deepEqual(enriched[i].sections, problems[i].sections);
  }
});
