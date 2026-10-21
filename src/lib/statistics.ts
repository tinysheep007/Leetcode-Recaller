import type { Problem, SavedReview } from './database';

export function categoryStatistics(problems: Problem[], reviews: SavedReview[]) {
  const latest = new Map<string, SavedReview>();
  for (const review of reviews) {
    if (!['Forgot', 'Rusty', 'Comfy'].includes(review.rating) || !Number.isFinite(+new Date(review.at))) continue;
    const previous = latest.get(review.problemId);
    if (!previous || +new Date(review.at) > +new Date(previous.at) || (+new Date(review.at) === +new Date(previous.at) && review.id > previous.id)) latest.set(review.problemId, review);
  }
  const categories = new Map<string, { category: string; total: number; rated: number; Forgot: number; Rusty: number; Comfy: number }>();
  for (const problem of problems) {
    const row = categories.get(problem.category) ?? { category: problem.category, total: 0, rated: 0, Forgot: 0, Rusty: 0, Comfy: 0 };
    row.total++;
    const review = latest.get(problem.id);
    if (review) { row.rated++; row[review.rating]++; }
    categories.set(problem.category, row);
  }
  return [...categories.values()].map(row => ({ ...row, comfyRate: row.rated ? row.Comfy / row.rated : null }));
}
