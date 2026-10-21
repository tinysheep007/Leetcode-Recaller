import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { createEmptyCard, fsrs, Rating, type Card, type ReviewLog } from 'ts-fsrs';
import { parseMarkdown, PARSER_VERSION, type ImportedProblem } from './import';
import { buildDailySession, DEFAULT_DAILY_TARGET, validTarget, type DailySession } from './daily';
import { withProblemReference } from './problem-references';
export type Problem = ImportedProblem & { schedule: Card; parserVersion?: number };
export type ProblemQuestion = { id: string; problemId: string; text: string; createdAt: Date; updatedAt: Date };
export type ProblemVisits = { problemId: string; count: number; lastVisitedAt: Date };
export type SavedReview = { id: string; problemId: string; rating: RecallRating; at: Date; log: ReviewLog };
export type RecallRating = 'Forgot' | 'Rusty' | 'Comfy';
interface RecallDB extends DBSchema {
  problems: { key: string; value: Problem };
  reviews: { key: string; value: SavedReview };
  assets: { key: string; value: Blob };
  settings: { key: string; value: { dailyTarget: number } };
  sessions: { key: string; value: DailySession };
  visits: { key: string; value: ProblemVisits };
  questions: { key: string; value: ProblemQuestion; indexes: { 'by-problem': string } };
}
let connection: Promise<IDBPDatabase<RecallDB>> | undefined;
function database() {
  if (!connection) {
    const opening = openDB<RecallDB>('leetcode-recall', 4, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('problems', { keyPath: 'id' });
          db.createObjectStore('reviews', { keyPath: 'id' });
          db.createObjectStore('assets');
        }
        if (oldVersion < 2) { db.createObjectStore('settings'); db.createObjectStore('sessions'); }
        if (oldVersion < 4) db.createObjectStore('visits', { keyPath: 'problemId' });
        if (oldVersion < 3) db.createObjectStore('questions', { keyPath: 'id' }).createIndex('by-problem', 'problemId');
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
    await tx.objectStore('problems').add({ ...withProblemReference(problem), schedule: createEmptyCard(), parserVersion: PARSER_VERSION }); added++;
  }
  for (const [path, bytes] of assets) await tx.objectStore('assets').put(new Blob([new Uint8Array(bytes)]), path);
  await tx.done;
  return { added, skipped };
}
export type ReviewState = { problems: Problem[]; daily: DailySession; target: number };
export async function loadReviewState(now = new Date(), newTarget?: number): Promise<ReviewState> {
  if (newTarget !== undefined) validTarget(newTarget);
  const tx = (await database()).transaction(['problems', 'settings', 'sessions'], 'readwrite');
  const stored = await tx.objectStore('problems').getAll();
  const problems: Problem[] = [];
  for (const problem of stored) {
    let updated = withProblemReference(problem);
    if ((problem.parserVersion ?? 1) < PARSER_VERSION) {
      updated = { ...updated, sections: parseMarkdown(problem.sourcePath, problem.original).sections, parserVersion: PARSER_VERSION };
    }
    if (updated !== problem) await tx.objectStore('problems').put(updated);
    problems.push(updated);
  }
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


export async function loadQuestions(problemId?: string): Promise<ProblemQuestion[]> {
  const db = await database();
  const questions = problemId === undefined ? await db.getAll('questions') : await db.getAllFromIndex('questions', 'by-problem', problemId);
  return questions.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt) || a.id.localeCompare(b.id));
}

export async function saveQuestion(problemId: string, value: string, id?: string): Promise<ProblemQuestion> {
  const text = value.trim();
  if (!text || text.length > 10000) throw new Error('Write a question between 1 and 10,000 characters.');
  const tx = (await database()).transaction(['problems', 'questions'], 'readwrite');
  if (!await tx.objectStore('problems').get(problemId)) throw new Error('Problem not found.');
  const previous = id ? await tx.objectStore('questions').get(id) : undefined;
  if (id && (!previous || previous.problemId !== problemId)) throw new Error('This question could not be found for this problem.');
  const now = new Date();
  const question: ProblemQuestion = { id: id || crypto.randomUUID(), problemId, text, createdAt: previous?.createdAt || now, updatedAt: now };
  await tx.objectStore('questions').put(question);
  await tx.done;
  return question;
}

export async function saveProblemDetails(problemId: string, description: string, value: string): Promise<Problem> {
  if (description.length > 100000) throw new Error('Please keep the description under 100,000 characters.');
  const url = value.trim();
  if (url) {
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || url.length > 2000) throw new Error();
    } catch { throw new Error('Enter a valid http or https problem link, or leave it empty.'); }
  }
  const tx = (await database()).transaction('problems', 'readwrite');
  const problem = await tx.store.get(problemId);
  if (!problem) throw new Error('Problem not found.');
  // Keep the stable identity and latest scheduling state, notes and parser version.
  const updated = { ...problem, description: description.trim(), url };
  await tx.store.put(updated); await tx.done;
  return updated;
}

export async function loadStatistics() {
  const tx = (await database()).transaction(['reviews', 'visits']);
  const [reviews, visits] = await Promise.all([tx.objectStore('reviews').getAll(), tx.objectStore('visits').getAll()]);
  await tx.done;
  return { reviews, visits };
}

export async function recordVisit(problemId: string, at = new Date()) {
  const tx = (await database()).transaction(['problems', 'visits'], 'readwrite');
  if (!await tx.objectStore('problems').get(problemId)) throw new Error('Problem not found.');
  const previous = await tx.objectStore('visits').get(problemId);
  const visit = { problemId, count: (previous?.count ?? 0) + 1, lastVisitedAt: at };
  await tx.objectStore('visits').put(visit);
  await tx.done;
  return visit;
}
