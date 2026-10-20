import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { createEmptyCard, fsrs, Rating, type Card, type ReviewLog } from 'ts-fsrs';
import type { ImportedProblem } from './import';
import { buildDailySession, DEFAULT_DAILY_TARGET, validTarget, type DailySession } from './daily';
export type Problem = ImportedProblem & { schedule: Card };
export type RecallRating = 'Forgot' | 'Rusty' | 'Comfy';
interface RecallDB extends DBSchema {
  problems: { key: string; value: Problem };
  reviews: { key: string; value: { id: string; problemId: string; rating: RecallRating; at: Date; log: ReviewLog } };
  assets: { key: string; value: Blob };
  settings: { key: string; value: { dailyTarget: number } };
  sessions: { key: string; value: DailySession };
}
let connection: Promise<IDBPDatabase<RecallDB>> | undefined;
function database() {
  if (!connection) {
    const opening = openDB<RecallDB>('leetcode-recall', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('problems', { keyPath: 'id' });
          db.createObjectStore('reviews', { keyPath: 'id' });
          db.createObjectStore('assets');
        }
        if (oldVersion < 2) { db.createObjectStore('settings'); db.createObjectStore('sessions'); }
      },
      blocking() { void opening.then(db => db.close()); connection = undefined; },
      terminated() { connection = undefined; },
    });
    connection = opening;
    void opening.catch(() => { if (connection === opening) connection = undefined; });
  }
  return connection;
}
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
export type ReviewState = { problems: Problem[]; daily: DailySession; target: number };
export async function loadReviewState(now = new Date(), newTarget?: number): Promise<ReviewState> {
  if (newTarget !== undefined) validTarget(newTarget);
  const tx = (await database()).transaction(['problems', 'settings', 'sessions'], 'readwrite');
  const problems = await tx.objectStore('problems').getAll();
  const settings = await tx.objectStore('settings').get('preferences');
  const target = newTarget ?? settings?.dailyTarget ?? DEFAULT_DAILY_TARGET;
  if (newTarget !== undefined) await tx.objectStore('settings').put({ dailyTarget: target }, 'preferences');
  const previous = await tx.objectStore('sessions').get('daily');
  const daily = buildDailySession(problems, previous, target, now);
  await tx.objectStore('sessions').put(daily, 'daily');
  await tx.done;
  return { problems, daily, target };
}
export async function saveRating(problemId: string, rating: RecallRating, dailyDay?: string, at = new Date()) {
  const tx = (await database()).transaction(['problems', 'reviews', 'settings', 'sessions'], 'readwrite');
  const problems = await tx.objectStore('problems').getAll();
  const problem = problems.find(p => p.id === problemId);
  if (!problem) throw new Error('Problem not found');
  const target = (await tx.objectStore('settings').get('preferences'))?.dailyTarget ?? DEFAULT_DAILY_TARGET;
  const daily = buildDailySession(problems, await tx.objectStore('sessions').get('daily'), target, at);
  if (dailyDay && (daily.day !== dailyDay || !daily.selectedIds.includes(problemId) || daily.completedIds.includes(problemId))) {
    throw new Error('Your daily session changed. Return to the library to continue.');
  }
  const grades = { Forgot: Rating.Again, Rusty: Rating.Hard, Comfy: Rating.Good } as const;
  const result = fsrs({ request_retention: 0.9, enable_fuzz: false }).next(problem.schedule, at, grades[rating]);
  await tx.objectStore('problems').put({ ...problem, schedule: result.card });
  await tx.objectStore('reviews').add({ id: crypto.randomUUID(), problemId, rating, at, log: result.log });
  // A daily card rated from Random or the library also completes that obligation once.
  if (daily.selectedIds.includes(problemId) && !daily.completedIds.includes(problemId)) daily.completedIds.push(problemId);
  await tx.objectStore('sessions').put(daily, 'daily');
  await tx.done;
  return result.card.due;
}
