import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { createEmptyCard, fsrs, Rating, type Card, type ReviewLog } from 'ts-fsrs';
import { parseMarkdown, PARSER_VERSION, type ImportedProblem } from './import';
import { buildDailySession, DEFAULT_DAILY_TARGET, validTarget, nextRandomProblem, regenerateDailySession, type RandomCycle, type DailySession } from './daily';
import { calendarDay, parseRemoteProblem, reviewTimestamp, type SharedSnapshot, type SyncInput } from './remote-state';
import { withProblemReference } from './problem-references';
export type Problem = ImportedProblem & { schedule: Card; parserVersion?: number; metadataOnly?: boolean };
export type ProblemQuestion = { id: string; problemId: string; text: string; createdAt: Date; updatedAt: Date };
export type ProblemVisits = { problemId: string; count: number; lastVisitedAt: Date };
export type SavedReview = { id: string; problemId: string; rating: RecallRating; at: Date; log: ReviewLog };
export type RecallRating = 'Forgot' | 'Rusty' | 'Comfy';
export type CloudFlags = { localVersion: number; version?: number; connected?: boolean; timeZone?: string; lastSyncedAt?: string; targetDirty?: boolean; generation?: { id: string; baseVersion: number } };
type Settings = { dailyTarget?: number; randomCycle?: RandomCycle; cloud?: CloudFlags };
function changed() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('recall-local-change')); }
async function markChanged(store: { get: (key: string) => Promise<Settings | undefined>; put: (value: Settings, key: string) => Promise<unknown> }, patch: Partial<CloudFlags> = {}) {
  const previous = (await store.get('cloud'))?.cloud ?? { localVersion: 0 };
  await store.put({ cloud: { ...previous, ...patch, localVersion: previous.localVersion + 1 } }, 'cloud');
}
interface RecallDB extends DBSchema {
  problems: { key: string; value: Problem };
  reviews: { key: string; value: SavedReview };
  assets: { key: string; value: Blob };
  settings: { key: string; value: Settings };
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
  const tx = (await database()).transaction(['problems', 'assets', 'settings'], 'readwrite');
  let added = 0, skipped = 0;
  for (const problem of problems) {
    const existing = await tx.objectStore('problems').get(problem.id);
    if (existing && !existing.metadataOnly) { skipped++; continue; }
    if (existing) {
      await tx.objectStore('problems').put({ ...withProblemReference(problem), schedule: existing.schedule, parserVersion: PARSER_VERSION }); added++; continue;
    }
    await tx.objectStore('problems').add({ ...withProblemReference(problem), schedule: createEmptyCard(), parserVersion: PARSER_VERSION }); added++;
  }
  if (added) await markChanged(tx.objectStore('settings'));
  for (const [path, bytes] of assets) await tx.objectStore('assets').put(new Blob([new Uint8Array(bytes)]), path);
  await tx.done;
  if (added) changed();
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
  if (newTarget !== undefined) {
    await tx.objectStore('settings').put({ dailyTarget: target }, 'preferences');
    await markChanged(tx.objectStore('settings'), { targetDirty: true });
  }
  const previous = await tx.objectStore('sessions').get('daily');
  const cloud = (await tx.objectStore('settings').get('cloud'))?.cloud;
  const daily = buildDailySession(problems, previous, target, now, cloud?.connected && cloud.timeZone ? calendarDay(now, cloud.timeZone) : undefined);
  await tx.objectStore('sessions').put(daily, 'daily');
  await tx.done;
  if (newTarget !== undefined) changed();
  return { problems, daily, target };
}
export async function saveRating(problemId: string, rating: RecallRating, dailyDay?: string, at = new Date()) {
  const tx = (await database()).transaction(['problems', 'reviews', 'settings', 'sessions'], 'readwrite');
  const problems = await tx.objectStore('problems').getAll();
  const problem = problems.find(p => p.id === problemId);
  if (!problem) throw new Error('Problem not found');
  const target = (await tx.objectStore('settings').get('preferences'))?.dailyTarget ?? DEFAULT_DAILY_TARGET;
  const cloud = (await tx.objectStore('settings').get('cloud'))?.cloud;
  const daily = buildDailySession(problems, await tx.objectStore('sessions').get('daily'), target, at, cloud?.connected && cloud.timeZone ? calendarDay(at, cloud.timeZone) : undefined);
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
  await markChanged(tx.objectStore('settings'));
  await tx.done; changed();
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

export async function drawRandomProblem() {
  const tx = (await database()).transaction(['problems', 'settings'], 'readwrite');
  const ids = await tx.objectStore('problems').getAllKeys();
  const previous = await tx.objectStore('settings').get('random');
  const { id, cycle } = nextRandomProblem(ids, previous?.randomCycle);
  await tx.objectStore('settings').put({ randomCycle: cycle }, 'random');
  await tx.done;
  return id;
}

export async function generateAnotherDailySet(now = new Date()) {
  const tx = (await database()).transaction(['problems', 'settings', 'sessions'], 'readwrite');
  const problems = await tx.objectStore('problems').getAll();
  const target = (await tx.objectStore('settings').get('preferences'))?.dailyTarget ?? DEFAULT_DAILY_TARGET;
  const cloud = (await tx.objectStore('settings').get('cloud'))?.cloud;
  const current = buildDailySession(problems, await tx.objectStore('sessions').get('daily'), target, now, cloud?.connected && cloud.timeZone ? calendarDay(now, cloud.timeZone) : undefined);
  const daily = regenerateDailySession(problems, current, target, now);
  const previousIds = new Set(current.selectedIds);
  const replacementCount = daily.selectedIds.filter(id => !previousIds.has(id)).length;
  await tx.objectStore('sessions').put(daily, 'daily');
  await markChanged(tx.objectStore('settings'), cloud?.connected ? { generation: { id: crypto.randomUUID(), baseVersion: cloud.version ?? 0 } } : {});
  await tx.done; changed();
  return { daily, changed: replacementCount };
}

export async function prepareCloudSync() {
  const tx = (await database()).transaction(['problems', 'settings', 'sessions']);
  const problems = await tx.objectStore('problems').getAll();
  const cloud = (await tx.objectStore('settings').get('cloud'))?.cloud ?? { localVersion: 0 };
  const target = (await tx.objectStore('settings').get('preferences'))?.dailyTarget ?? DEFAULT_DAILY_TARGET;
  const daily = await tx.objectStore('sessions').get('daily');
  await tx.done;
  const input: SyncInput = {
    problems: problems.map(p => parseRemoteProblem(JSON.parse(JSON.stringify({ id: p.id, title: p.title, category: p.category, schedule: p.schedule })))),
    target, daily, targetDirty: !!cloud.targetDirty, generation: cloud.generation,
  };
  return { input, localVersion: cloud.localVersion, lastSyncedAt: cloud.lastSyncedAt };
}

export async function applyCloudSync(snapshot: SharedSnapshot, sentLocalVersion: number, conflict = false) {
  const tx = (await database()).transaction(['problems', 'settings', 'sessions'], 'readwrite');
  const previous = (await tx.objectStore('settings').get('cloud'))?.cloud ?? { localVersion: 0 };
  // A local rating/import happened during the request: upload that change before applying.
  if (previous.localVersion !== sentLocalVersion || snapshot.version < (previous.version ?? 0)) { await tx.done; return false; }
  for (const remote of snapshot.state.problems) {
    const local = await tx.objectStore('problems').get(remote.id);
    if (local) {
      if (reviewTimestamp(remote) > reviewTimestamp(local)) await tx.objectStore('problems').put({ ...local, schedule: remote.schedule });
    } else {
      const base = parseMarkdown(`Synced/${remote.id}.md`, `# ${remote.title}`);
      await tx.objectStore('problems').put(withProblemReference({ ...base, id: remote.id, category: remote.category, schedule: remote.schedule, parserVersion: PARSER_VERSION, metadataOnly: true }));
    }
  }
  if (!conflict || !previous.targetDirty) await tx.objectStore('settings').put({ dailyTarget: snapshot.state.target }, 'preferences');
  if (snapshot.state.daily) {
    const localDaily = await tx.objectStore('sessions').get('daily');
    const daily = structuredClone(snapshot.state.daily);
    if (localDaily?.day === daily.day) {
      for (const id of localDaily.completedIds) {
        if (daily.selectedIds.includes(id) && !daily.completedIds.includes(id)) daily.completedIds.push(id);
      }
    }
    await tx.objectStore('sessions').put(daily, 'daily');
  }
  await tx.objectStore('settings').put({ cloud: { ...previous, connected: true, timeZone: snapshot.timeZone, version: snapshot.version, generation: undefined, targetDirty: conflict && previous.targetDirty, lastSyncedAt: new Date().toISOString() } }, 'cloud');
  await tx.done;
  return true;
}

export async function loadCloudFlags() { return (await (await database()).get('settings', 'cloud'))?.cloud; }
