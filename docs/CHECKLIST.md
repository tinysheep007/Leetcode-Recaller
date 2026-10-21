# Functionality checklist

Keep this file updated as work is completed. Checked means implemented; verification limits are stated explicitly.

## Foundation and import

- [x] Next.js + TypeScript project, local Git baseline, local preview.
- [x] Notion ZIP and individual Markdown import in the browser.
- [x] Exclude category/index pages; derive categories from folders.
- [x] Preserve original Markdown, fenced code languages and supported images.
- [x] Render the Original imported Markdown disclosure as formatted Markdown with local images, while retaining the unchanged source in storage.
- [x] Missing-field reveal placeholders without generating answers.
- [x] Skip existing identities on reimport; preserve review history.
- [x] Search titles and filter categories.
- [x] Paginate the library with 10 problems per page, previous/next and direct page selection; filters search the full library and reset to page one.
- [x] Document exact parsing rules and limitations in PARSING_RULES.md.
- [x] Extract explicit trailing Python-style runtime/run/time/space comments into approach-specific complexity sections while preserving code.
- [x] Refresh legacy parsed sections once from preserved original Markdown without changing scheduling, history or personal questions.
- [x] Read-only description reveal and original problem link on the back; no user-facing description/link editor.
- [x] Bundle checked problem links and original short summaries; fill missing metadata on import/library load without changing IDs or progress. Actual ZIP: 151 links, 146 descriptions; five source-verification gaps documented in PROBLEM_REFERENCES.md.
- [ ] Verify reference enrichment and source-link interaction on the deployed app/iPhone.
- [ ] Verify accessible primary statements for the five remaining description gaps.
- [ ] Edit solution notes, code languages and section groupings (deferred by user).
- [x] Show catalog difficulty beside the category on card backs; persist/backfill it locally. The two AlgoMonster cards are Unrated.
- [ ] Verify difficulty badges on a device/deployed app.
- [ ] Manual problem creation and difficulty filtering (manual creation deferred by user).
- [ ] Import ambiguity/conflict UI, if needed.

## Reviews and persistence

- [x] Title-only card front; separate question reveal.
- [x] Answer sections independently collapsed; resets on flip/new card.
- [x] Forgot / Rusty / Comfy ratings mapped to FSRS Again / Hard / Good.
- [x] IndexedDB problems, image assets and atomic review logs/scheduling updates.
- [x] Due reviews remain due when a session is abandoned.
- [x] Manual early review reschedules when explicitly rated; UI states this behavior.
- [x] Automated tests for repeat import persistence and FSRS interval ordering.
- [x] Configurable daily target (default 5), saved daily selections, oldest-due ordering and completed/remaining progress.
- [x] Carry unfinished cards across local days, preserving pending obligations.
- [x] Optional extra due practice and Random problem from the entire library.
- [x] Version 1 storage migration preserves existing cards, assets and review history; daily ratings save atomically.
- [x] Document session rules and tradeoffs in DAILY_REVIEWS.md.
- [x] Browser verification with disposable cards: resume after reload, lower/increase target, random selection without rating, full daily completion, extra due practice, and offline rating persistence.
- [ ] Agreed initial activation/staggering policy (currently all imports are immediately due).
- [ ] Configurable target retention (currently 90%).
- [ ] Progress/history UI and optional recall note.

## Offline and installation

- [x] Web app manifest, standalone display and PNG Home Screen icons.
- [x] Production build generates a versioned full app-shell precache.
- [x] Offline status and iPhone installation instructions.
- [x] Service worker excluded from development registration.
- [x] Cached app versions switch after old app tabs close; IndexedDB is not cleared.
- [x] Verify production app reopens with the server stopped, and notes still render (new browser tab, 151 imported cards; code reveal and disposable test rating persisted after reload).
- [ ] Verify install and airplane-mode reopening on the user's actual iPhone.
- [ ] Verify deployed HTTPS app, including update activation across deployments.

## Deployment and reminders

- [x] GitHub remote configured by user.
- [x] Basic app deployed at https://leetcode-recaller.vercel.app/ (user confirmed).
- [ ] Deploy and verify the latest daily-session changes.
- [ ] Email provider and sender configured.
- [x] Daily cron email code with app link, server-side recipient, cron authentication, enabled switch and provider 24-hour idempotency protection.
- [x] Fake-sender tests for authentication, configuration, recipient restrictions, retries and provider failures.
- [ ] Verify real Resend delivery to the owner and an active scheduled Vercel run after account setup.
- [x] Owner-requested Boston 8 a.m. reminder hour with automatic daylight/standard-time slot selection (approximately 8–9 a.m. on Hobby).
- [ ] Reminder time/settings UI, if included in MVP.

No backup feature or cloud sync is planned. Localhost, deployed sites, browsers and devices have separate local data. Offline caches and IndexedDB survive ordinary restarts but can be removed by clearing site data or browser storage eviction.


## Personal problem questions

- [x] Add multiple plain-text questions on a problem's back, behind My questions.
- [x] Edit saved personal questions without altering imported notes or scheduling.
- [x] Questions portal groups all saved questions by problem and supports searching titles/text.
- [x] Open a problem from the portal with personal questions expanded and answers collapsed.
- [x] IndexedDB v3 questions store with by-problem index; additive migration preserves existing stores.
- [x] Automated migration, validation, multiple-question and reimport/rating preservation tests.
- [x] Document schema and behavior in PROBLEM_QUESTIONS.md.
- [ ] Browser and actual iPhone verification of question saving, editing and offline portal reopening (no browser surface available during implementation).
- [ ] Commit, deploy and verify this feature on the production URL.
