/** Local calendar days, not UTC dates: midnight follows the device timezone. */
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const DEFAULT_DAILY_TARGET = 5;
export function validTarget(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('Choose a whole number from 1 to 100.');
  return value;
}
export type DailySession = { day: string; selectedIds: string[]; completedIds: string[] };
export type SchedulableProblem = { id: string; schedule: { due: Date; reps?: number } };
export function pendingIds(session: DailySession) {
  const completed = new Set(session.completedIds);
  return session.selectedIds.filter(id => !completed.has(id));
}
export function dueProblems<T extends SchedulableProblem>(problems: T[], now: Date) {
  return problems.filter(p => p.schedule.reps !== 0 && +new Date(p.schedule.due) <= +now)
    .sort((a, b) => +new Date(a.schedule.due) - +new Date(b.schedule.due) || a.id.localeCompare(b.id));
}
export function buildDailySession(problems: SchedulableProblem[], previous: DailySession | undefined, target: number, now: Date, day = localDay(now)): DailySession {
  validTarget(target);
  const available = new Set(problems.map(p => p.id));
  const sameDay = previous?.day === day;
  const selectedIds = Array.from(new Set((sameDay ? previous.selectedIds : previous ? pendingIds(previous) : []).filter(id => available.has(id))));
  const completedIds = sameDay ? previous.completedIds.filter(id => selectedIds.includes(id)) : [];
  // Keep today's selections stable, even when a target is lowered. Only add open slots.
  const selected = new Set(selectedIds);
  for (const problem of [...dueProblems(problems, now), ...problems.filter(p => p.schedule.reps === 0).sort((a, b) => a.id.localeCompare(b.id))]) {
    if (selectedIds.length >= target) break;
    if (!selected.has(problem.id)) { selectedIds.push(problem.id); selected.add(problem.id); }
  }
  return { day, selectedIds, completedIds };
}
export function randomProblemId(problems: { id: string }[], random = Math.random): string | undefined {
  return problems.length ? problems[Math.floor(random() * problems.length)].id : undefined;
}

export function shuffled<T>(values: T[], random = Math.random): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export type RandomCycle = { knownIds: string[]; remainingIds: string[]; lastId?: string };
export function nextRandomProblem(ids: string[], previous?: RandomCycle, random = Math.random) {
  const available = [...new Set(ids)], allowed = new Set(available);
  const known = new Set(previous?.knownIds ?? []);
  let remainingIds = [...new Set(previous?.remainingIds ?? [])].filter(id => allowed.has(id));
  const added = available.filter(id => !known.has(id));
  if (added.length) remainingIds = shuffled([...remainingIds, ...added], random);
  if (!remainingIds.length) {
    remainingIds = shuffled(available, random);
    // Avoid repeating the last draw across cycle boundaries when alternatives exist.
    if (remainingIds.length > 1 && remainingIds[0] === previous?.lastId) remainingIds.push(remainingIds.shift()!);
  }
  const id = remainingIds.shift();
  return { id, cycle: { knownIds: available, remainingIds, lastId: id ?? previous?.lastId } satisfies RandomCycle };
}

/** Replace pending suggestions only; ratings and schedules remain untouched. */
export function regenerateDailySession(problems: SchedulableProblem[], current: DailySession, target: number, now: Date, random = Math.random): DailySession {
  validTarget(target);
  const completedIds = [...current.completedIds];
  const excluded = new Set(current.selectedIds);
  const candidates = problems.filter(p => !excluded.has(p.id));
  const scheduled = dueProblems(candidates, now);
  const fresh = shuffled(candidates.filter(p => p.schedule.reps === 0), random);
  const slots = Math.max(0, target - completedIds.length);
  const replacements = [...scheduled, ...fresh].slice(0, slots).map(p => p.id);
  // If there are too few alternatives, retain pending cards instead of losing work.
  const retained = pendingIds(current).slice(0, Math.max(0, slots - replacements.length));
  return { day: current.day, selectedIds: [...completedIds, ...replacements, ...retained], completedIds };
}
