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
export type SchedulableProblem = { id: string; schedule: { due: Date } };
export function pendingIds(session: DailySession) {
  const completed = new Set(session.completedIds);
  return session.selectedIds.filter(id => !completed.has(id));
}
export function dueProblems<T extends SchedulableProblem>(problems: T[], now: Date) {
  return problems.filter(p => +new Date(p.schedule.due) <= +now)
    .sort((a, b) => +new Date(a.schedule.due) - +new Date(b.schedule.due) || a.id.localeCompare(b.id));
}
export function buildDailySession(problems: SchedulableProblem[], previous: DailySession | undefined, target: number, now: Date): DailySession {
  validTarget(target);
  const day = localDay(now), available = new Set(problems.map(p => p.id));
  const sameDay = previous?.day === day;
  const selectedIds = Array.from(new Set((sameDay ? previous.selectedIds : previous ? pendingIds(previous) : []).filter(id => available.has(id))));
  const completedIds = sameDay ? previous.completedIds.filter(id => selectedIds.includes(id)) : [];
  // Keep today's selections stable, even when a target is lowered. Only add open slots.
  const selected = new Set(selectedIds);
  for (const problem of dueProblems(problems, now)) {
    if (selectedIds.length >= target) break;
    if (!selected.has(problem.id)) { selectedIds.push(problem.id); selected.add(problem.id); }
  }
  return { day, selectedIds, completedIds };
}
export function randomProblemId(problems: { id: string }[], random = Math.random): string | undefined {
  return problems.length ? problems[Math.floor(random() * problems.length)].id : undefined;
}
