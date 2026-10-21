# Functionality checklist

Keep this file updated as work is completed. Checked means implemented; verification limits are stated explicitly.

## Foundation and import

- [x] Next.js + TypeScript project, local Git baseline, local preview.
- [x] Notion ZIP and individual Markdown import in the browser.
- [x] Exclude category/index pages; derive categories from folders.
- [x] Preserve original Markdown, fenced code languages and supported images.
- [x] Missing-field reveal placeholders without generating answers.
- [x] Skip existing identities on reimport; preserve review history.
- [x] Search titles and filter categories.
- [x] Document exact parsing rules and limitations in PARSING_RULES.md.
- [ ] Edit notes, descriptions, code languages and section groupings (deferred by user).
- [ ] Manual problem creation and difficulty metadata/filtering (manual creation deferred by user).
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
