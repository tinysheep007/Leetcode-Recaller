import { openDB, type DBSchema } from 'idb';
import { createEmptyCard, fsrs, Rating, type Card, type ReviewLog } from 'ts-fsrs';
import type { ImportedProblem } from './import';
export type Problem = ImportedProblem & { schedule: Card };
export type RecallRating = 'Forgot' | 'Rusty' | 'Comfy';
interface RecallDB extends DBSchema {
  problems: { key: string; value: Problem };
  reviews: { key: string; value: { id: string; problemId: string; rating: RecallRating; at: Date; log: ReviewLog } };
  assets: { key: string; value: Blob };
}
function database() { return openDB<RecallDB>('leetcode-recall', 1, { upgrade(db) { db.createObjectStore('problems', { keyPath: 'id' }); db.createObjectStore('reviews', { keyPath: 'id' }); db.createObjectStore('assets'); } }); }
export async function loadProblems() { return (await database()).getAll('problems'); }
export async function loadAssets() {
  const tx = (await database()).transaction('assets');
  const keys = await tx.store.getAllKeys(), values = await tx.store.getAll();
  return keys.map((key, i) => [key, values[i]] as const);
}
export async function importProblems(problems: ImportedProblem[], assets: [string, Uint8Array][]) {
  const tx = (await database()).transaction(['problems', 'assets'], 'readwrite');
  let added = 0, skipped = 0;
  for (const problem of problems) {
    if (await tx.objectStore('problems').get(problem.id)) { skipped++; continue; }
    await tx.objectStore('problems').add({ ...problem, schedule: createEmptyCard() }); added++;
  }
  for (const [path, bytes] of assets) await tx.objectStore('assets').put(new Blob([new Uint8Array(bytes)]), path);
  await tx.done;
  return { added, skipped };
}
export async function saveRating(problemId: string, rating: RecallRating) {
  const tx = (await database()).transaction(['problems', 'reviews'], 'readwrite');
  const problem = await tx.objectStore('problems').get(problemId);
  if (!problem) throw new Error('Problem not found');
  const at = new Date(), grades = { Forgot: Rating.Again, Rusty: Rating.Hard, Comfy: Rating.Good } as const;
  const result = fsrs({ request_retention: 0.9, enable_fuzz: false }).next(problem.schedule, at, grades[rating]);
  await tx.objectStore('problems').put({ ...problem, schedule: result.card });
  await tx.objectStore('reviews').add({ id: crypto.randomUUID(), problemId, rating, at, log: result.log });
  await tx.done;
  return result.card.due;
}
