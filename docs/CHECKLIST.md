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
- [ ] Edit notes, descriptions, code languages and section groupings.
- [ ] Manual problem creation and difficulty metadata/filtering.
- [ ] Import ambiguity/conflict UI, if needed.

## Reviews and persistence

- [x] Title-only card front; separate question reveal.
- [x] Answer sections independently collapsed; resets on flip/new card.
- [x] Forgot / Rusty / Comfy ratings mapped to FSRS Again / Hard / Good.
- [x] IndexedDB problems, image assets and atomic review logs/scheduling updates.
- [x] Due reviews remain due when a session is abandoned.
- [x] Manual early review reschedules when explicitly rated; UI states this behavior.
- [x] Automated tests for repeat import persistence and FSRS interval ordering.
- [ ] Configurable daily target and agreed daily queue policy.
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
- [ ] Vercel deployment and stable URL verified.
- [ ] Email provider and sender configured.
- [ ] Daily cron email with app link; endpoint authentication and duplicate-send protection.
- [ ] Reminder time/settings UI, if included in MVP.

No backup feature or cloud sync is planned. Localhost, deployed sites, browsers and devices have separate local data. Offline caches and IndexedDB survive ordinary restarts but can be removed by clearing site data or browser storage eviction.
