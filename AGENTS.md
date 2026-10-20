<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project documentation

- Update `docs/CHECKLIST.md` when implementing functionality. Distinguish implemented features from device/deployment checks that have not been performed.
- Keep `docs/PARSING_RULES.md` aligned with `src/lib/import.ts` whenever parsing changes. Preserve user-provided notes and document heuristic limitations.
- Keep `docs/OFFLINE.md` current when cache behavior, installation, or offline verification changes.
