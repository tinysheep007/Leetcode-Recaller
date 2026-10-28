import type { Card } from 'ts-fsrs';
import { buildDailySession, regenerateDailySession, validTarget, type DailySession } from './daily';

export type RemoteProblem = { id: string; title: string; category: string; schedule: Card };
export type SharedState = {
  problems: RemoteProblem[]; target: number; daily?: DailySession;
  generationId?: string;
  email?: { day: string; titles: string[] };
};
export type SyncInput = {
  problems: RemoteProblem[]; target: number; targetDirty: boolean; daily?: DailySession;
  generation?: { id: string; baseVersion: number };
};
export type SharedSnapshot = { version: number; state: SharedState; timeZone: string };
export function calendarDay(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key)!.value).join('-');
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid sync data.');
  return value as Record<string, unknown>;
};
function boundedString(value: unknown, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid sync data.');
  return value;
}
function date(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(+new Date(value))) throw new Error('Invalid schedule date.');
  return new Date(value);
}
/** Whitelist the fields we upload: original notes, images and questions never leave the device. */
export function parseRemoteProblem(value: unknown): RemoteProblem {
  const p = object(value), raw = object(p.schedule);
  const schedule = { due: date(raw.due) } as Card;
  for (const key of ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'reps', 'lapses', 'learning_steps', 'state'] as const) {
    const number = raw[key];
    if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 1e9) throw new Error('Invalid schedule.');
    schedule[key] = number;
  }
  if (!Number.isInteger(schedule.reps) || !Number.isInteger(schedule.state) || schedule.state > 3) throw new Error('Invalid schedule.');
  if (raw.last_review != null) schedule.last_review = date(raw.last_review);
  if (schedule.reps > 0 && !schedule.last_review) throw new Error('Rated schedules need a review date.');
  return { id: boundedString(p.id, 250), title: boundedString(p.title, 500), category: boundedString(p.category, 250), schedule };
}
function parseDaily(value: unknown): DailySession | undefined {
  if (value == null) return undefined;
  const d = object(value);
  const day = boundedString(d.day, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid day.');
  function ids(value: unknown) {
    if (!Array.isArray(value) || value.length > 10000) throw new Error('Invalid selection.');
    return [...new Set(value.map(id => boundedString(id, 250)))];
  }
  const selectedIds = ids(d.selectedIds), completedIds = ids(d.completedIds);
  if (completedIds.some(id => !selectedIds.includes(id))) throw new Error('Invalid completion.');
  return { day, selectedIds, completedIds };
}
export function parseSyncInput(value: unknown): SyncInput {
  const p = object(value);
  if (!Array.isArray(p.problems) || p.problems.length > 2000) throw new Error('Sync supports up to 2,000 problems.');
  const problems = p.problems.map(parseRemoteProblem);
  if (new Set(problems.map(p => p.id)).size !== problems.length) throw new Error('Duplicate problem IDs.');
  const target = validTarget(p.target as number);
  let generation: SyncInput['generation'];
  if (p.generation != null) {
    const g = object(p.generation);
    if (!Number.isSafeInteger(g.baseVersion) || (g.baseVersion as number) < 0) throw new Error('Invalid revision.');
    generation = { id: boundedString(g.id, 100), baseVersion: g.baseVersion as number };
  }
  return { problems, target, targetDirty: p.targetDirty === true, daily: parseDaily(p.daily), generation };
}
export function emptySharedState(): SharedState { return { problems: [], target: 3 }; }
export function hydrateSharedState(value: unknown): SharedState {
  const p = object(value);
  const parsed = parseSyncInput({ ...p, targetDirty: false });
  let email: SharedState['email'];
  if (p.email != null) {
    const e = object(p.email);
    if (!Array.isArray(e.titles) || e.titles.length > 10000) throw new Error('Invalid email snapshot.');
    email = { day: boundedString(e.day, 10), titles: e.titles.map(t => boundedString(t, 500)) };
  }
  return { problems: parsed.problems, target: parsed.target, daily: parsed.daily, generationId: typeof p.generationId === 'string' ? p.generationId : undefined, email };
}
export function reviewTimestamp(problem: RemoteProblem) { return problem.schedule.last_review ? +new Date(problem.schedule.last_review) : 0; }

export class SelectionConflict extends Error {}
export function updateSharedState(current: SharedState, version: number, input: SyncInput | undefined, now: Date, timeZone: string): SharedState {
  const next = structuredClone(current);
  const day = calendarDay(now, timeZone);
  if (input) {
    const byId = new Map(next.problems.map(p => [p.id, p]));
    for (const problem of input.problems) {
      if (problem.schedule.last_review && +new Date(problem.schedule.last_review) > +now + 300000) throw new Error('Review date is ahead of server time. Check the device clock.');
      const previous = byId.get(problem.id);
      // Never let an old device snapshot replace a more recent rated schedule.
      if (!previous || reviewTimestamp(problem) > reviewTimestamp(previous)) byId.set(problem.id, structuredClone(problem));
    }
    if (byId.size > 2000) throw new Error('Sync supports up to 2,000 problems.');
    next.problems = [...byId.values()];
    if (!current.problems.length || input.targetDirty) next.target = input.target;
  }
  // Preserve the initial local selection on first connection, but not a stale device's later set.
  const initial = !current.daily && input?.daily?.day === day ? input.daily : next.daily;
  next.daily = buildDailySession(next.problems, initial, next.target, now, day);
  if (input?.daily?.day === day) {
    for (const id of input.daily.completedIds) {
      const local = input.problems.find(p => p.id === id);
      if (local?.schedule.reps && next.daily.selectedIds.includes(id) && !next.daily.completedIds.includes(id)) next.daily.completedIds.push(id);
    }
  }
  if (input?.generation && input.generation.id !== next.generationId) {
    if (input.generation.baseVersion !== version) throw new SelectionConflict('The shared selection changed. It has been refreshed; generate another set again if needed.');
    next.daily = regenerateDailySession(next.problems, next.daily, next.target, now);
    next.generationId = input.generation.id;
  }
  return next;
}

/** Freeze the day's email body, so retries remain compatible with provider idempotency. */
export function freezeDailyEmail(state: SharedState, day: string): SharedState {
  if (state.email?.day === day) return state;
  const byId = new Map(state.problems.map(p => [p.id, p.title]));
  const titles = (state.daily?.selectedIds ?? []).flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  return titles.length ? { ...state, email: { day, titles } } : state;
}
