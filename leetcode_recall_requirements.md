# LeetCode Recall — Product Requirements & Design Decisions

## Updated implementation decisions — October 19, 2026

These decisions supersede conflicting native iOS implementation and deployment suggestions below. The confirmed flashcard and recall behavior remains the planning baseline.

- Build an installable, offline-capable web app (PWA) using Next.js and TypeScript.
- Host on Vercel's free Hobby plan for personal use; no Xcode or Apple Developer membership is required.
- Store notes, FSRS scheduling state, and review history locally in IndexedDB. Cache the app with a service worker for offline use after initial loading.
- Use a daily email reminder with a link to the review session instead of native local iOS notifications. Email delivery requires internet; offline review does not.
- Start with a generic daily reminder. Completion-aware emails and cloud synchronization of review state are not approved scope.
- Use Vercel Cron and the official Resend npm SDK for one generic owner-only email reminder. Credentials and recipient stay on the server. Provider account setup, sender eligibility and actual delivery must be verified before marking reminders active. The free resend.dev test sender is restricted to the account owner.
- Vercel Hobby daily cron timing is approximate within the scheduled hour.
- Keep the MVP simple: no backup feature, cloud accounts, or native app distribution.
- Personal follow-up questions: allow multiple locally saved plain-text questions per problem, edit them, and provide a searchable Questions view grouped by problem. Keep this separate from imported note editing; adding questions must not affect ratings or daily completion. See `docs/PROBLEM_QUESTIONS.md`.
- Daily sessions: configurable soft target (default 5), oldest due cards first, stable selections, unfinished carryover at local midnight, optional extra due practice, and a Random problem button across the entire library. Only explicit ratings reschedule cards. Editing and manual creation are deferred. See `docs/DAILY_REVIEWS.md` for target-change and manual-review semantics.
- The native iOS notification acceptance check below is replaced by an email link opening the review session; dismissing an email must not erase due reviews.
- Track local visits, timestamped rating history and latest-rating category comparisons in Stats. Keep incoming problems New until rated, and offer difficulty filtering. Scheduler retention stays at 90%; reminder settings remain in Vercel.
- Descriptions and problem links stay read-only. A curated offline catalog supplies short original summaries and checked links for known titles; unverified descriptions remain empty. Full statements/examples are not bundled. See `docs/PROBLEM_REFERENCES.md`.
- Import source supplied: `questions.zip`, a Notion Markdown export containing category pages and individual problem pages. Category/index pages should not become problem cards.
- Missing fields are allowed and must not block import or review. Preserve missing values as empty rather than generating answers. If a reveal control exists for a missing field (such as runtime or space complexity), show “Not provided yet” only after the user reveals it. Missing descriptions can follow this same reveal behavior. Missing-field notices must not appear on the title-only front or automatically expose other sections.

---

**Status:** Requirements draft (v1.5), for Codex planning. **Do not treat proposed features or open decisions as finalized.**  
**Platform:** Personal-use iPhone app.  
**Purpose:** Maintain recall of LeetCode problems already solved (e.g., NeetCode 150) during technical-interview preparation. **This is a review/retention app, not a learning curriculum or full coding environment.**

## 1. Product vision and core flow

The app acts as an Anki-style flashcard reviewer for previously solved algorithm problems. It proactively schedules reviews based on memory performance, reminds the user on iPhone, and keeps solution details hidden until individually requested.

1. Import a previously solved problem and its existing notes/solutions.
2. Open the app at any time **or** tap a daily notification to start a review session.
3. See **only the problem name** on the front of the flashcard.
4. Optionally tap **Reveal Question** to see the full problem description; no solution hints or metadata leak onto the front.
5. Flip to the back; see problem metadata and **collapsed, independently revealable** solution sections.
6. Reveal only the needed section(s) (tips, BFS/DFS approach notes, code, complexity, follow-ups, etc.).
7. Choose **Forgot**, **Rusty**, or **Comfy** to report recall quality; update spaced-repetition state and next review time.
8. Move to the next card or finish the session. Outstanding review obligations remain tracked even if a notification is dismissed.

## 2. Confirmed design decisions

- **Personal-use first**, iOS/iPhone first. Keep the MVP small, offline-friendly, and avoid unnecessary cloud/account infrastructure.
- **Exactly three ratings:** `Forgot`, `Rusty`, `Comfy`. A previous `Rusty` selection was **only a UI prototype test**, not an actual logged review.
- **Front shows only the title.** Do **not** show difficulty, category, pattern, tags, or other metadata on the front. A separate **Reveal Question** button expands the full description on the front.
- **Back initially shows metadata** (e.g., difficulty/category) and headings/buttons for solution sections, **not their contents**. Each content section needs its own Reveal/Hide control.
- **Existing notes are the source of truth**, not AI-generated replacement answers. Preserve original text/code wherever practical.
- **Unlimited approaches per problem**, each with its own independently revealable notes/code/complexity where present (e.g., BFS, DFS, follow-up variation).
- **Imported material remains editable** inside the app: tips, explanations, code, time/space complexity, approach structure.
- **Notion note organization:** individual problem pages, nested under category pages. Import should be simple and personal-use oriented.
- **Manual review is always available**, independent of daily notifications.
- **Reviews persist in the app** when incomplete. Do not rely on iOS Notification Center for state.
- **Spaced repetition** should adapt intervals to actual recall, inspired by the forgetting curve; FSRS is the planned algorithm, not fixed Ebbinghaus day intervals.

## 3. Functional requirements

### A. Problem library and import

- **A1 — Starter lists:** Support an initial list of previously solved problems (e.g., NeetCode 150), but do not assume the app can redistribute third-party descriptions or solutions. Initial content should come from the user's notes/imports where possible.
- **A2 — Individual additions:** Allow adding a LeetCode problem manually, ideally with its problem URL.
- **A3 — Problem record:** Store title, optional original description, difficulty, category/tags, LeetCode URL, user-provided notes, and approaches.
- **A4 — Library browsing:** Browse/search/filter by title, category, and difficulty (these metadata are visible in the *library* and on the *back*, not the flashcard front).
- **A5 — Notion Markdown import:** Import existing Notion notes, preferably from a Markdown + nested-pages ZIP export or a small set of Markdown files. One Notion problem page maps to one flashcard; parent page/folder is an optional category.
- **A6 — Edit imported content:** Allow edits to tips, explanations, code, complexity, and sections after import.
- **A7 — Unlimited approaches:** Support zero or more approaches, each with optional tips, code, complexity and follow-up information.
- **A8 — Preserve original content:** Retain bullet lists, section headings, fenced code blocks, code language labels, and textual explanations as faithfully as practical.
- **A9 — Lightweight parsing:** Recognize code fences and common headings (e.g., `BFS NOTES`, `DFS`, `runtime`, `space`, `follow up`), without requiring uniform templates or complex AI extraction.
- **A10 — Manual corrections:** Provide a simple way to review/adjust how imported content is divided into revealable sections. If parsing is uncertain, retain content rather than discard it.
- **A11 — Duplicate safety:** Avoid duplicating an existing problem on a repeat import. Prefer stable identity (LeetCode slug/URL when available; otherwise a normalized title with reviewable ambiguity).

**Do not build for MVP:** Notion OAuth/API sync, elaborate import wizards, AI-generated solutions, mandatory JSON/CSV authoring, cloud backend.

**Proposals not yet explicitly approved:** detailed import preview UI, automated merging on reimport, preserving review history when reimporting, bulk import of all categories versus one-by-one category import, how to handle ambiguous titles or parser failures. Implement conservatively or ask before designing complicated behaviors.

### B. Flashcard and active recall

- **B1 — Front:** Only problem title plus `Reveal Question` control. When pressed, display the description; the user can hide it again. No difficulty/tags/solution information on front.
- **B2 — Back:** Show metadata (difficulty/category) and separate, initially closed reveal sections based on imported notes. Example controls: `Tips`, `BFS Notes`, `BFS Code`, `BFS Complexity`, `DFS Code`, `DFS Complexity`, `Follow-up`, `Follow-up Code`. Content is visible only after that section's `Reveal` control is tapped. Sections are data-driven, not a mandatory fixed list.
- **B3 — Independent reveal state:** Revealing one section does not reveal the others. Flipping/reviewing a new card should not unintentionally expose answers.
- **B4 — Ratings:** Exactly `Forgot`, `Rusty`, `Comfy` after review. Suggested internal FSRS mapping: `Forgot → Again`, `Rusty → Hard`, `Comfy → Good`. `Easy` is hidden from the user. Mapping can be evaluated during technical design.
- **B5 — LeetCode link:** Provide a link to the original problem for optional full re-solving; it is not required for every quick review.
- **B6 — Optional recall note:** Allow recording what was forgotten (or which detail was shaky). This should not add friction to normal reviews.

**Important distinction:** `Reveal Question` exposes the *problem statement*, while `Flip to Answer` exposes *section names/metadata*, never all solutions at once. Revealing a hint does not automatically choose `Forgot`; the user rates recall manually.

### C. Spaced repetition and recall history

- **C1:** Use an FSRS-based scheduling component per problem to choose next review date/time; start with a reasonable configurable target retention, tentatively 90%.
- **C2:** Track each problem's prior reviews, timestamp, chosen rating and scheduling state.
- **C3:** Forgotten problems should return soonest; rusty problems sooner; comfy problems later. Actual intervals should come from algorithm state, not a hardcoded `1, 3, 7, 14` sequence.
- **C4:** Allow target retention to be configured (proposal retained from earlier draft; exact UX not yet decided).
- **C5:** Prioritize overdue/weak problems within daily workloads (proposed).
- **C6:** Never silently delete overdue reviews; carry remaining obligations forward.
- **C7:** Manual reviews should be possible without deleting pending items or accidentally duplicating review logs (exact queue semantics still open).

### D. Daily sessions and iPhone notifications

- **D1:** User-configurable daily review target (example: 5 problems, not a fixed requirement).
- **D2:** Generate a daily queue of due problems based on review scheduling and daily target.
- **D3:** Schedule a local iOS notification at user-preferred time(s).
- **D4:** Tapping a notification opens the app at the daily review session (deep link/navigation).
- **D5:** If the user stops partway through, incomplete cards remain due/in the app for later completion.
- **D6:** User may start a review manually at any time, without waiting for a notification.
- **D7:** Optional follow-up reminders for incomplete daily reviews.
- **D8:** On completion, clear or update app-managed reminders/badge as appropriate.

**iOS constraint:** The app cannot guarantee a notification remains pinned in Notification Center until reviews are complete. Tapping may change its appearance/removal according to iOS. The app should **not intentionally clear delivered notifications merely on opening** if avoidable, but it must not use notifications as the persistent queue. Badge/follow-up notifications are optional ways to reflect unfinished reviews. Respect notification permissions and iOS delivery limits.

### E. Progress and settings (draft scope)

- **E1:** Today's finished/remaining reviews.
- **E2:** Total completed reviews and optionally streaks.
- **E3:** Upcoming/overdue review counts.
- **E4:** Identify frequently forgotten problems/weak categories (nice-to-have).
- **E5:** Settings for daily target, notification time, and target retention.

## 4. Example supplied Notion note structure

A real `Number of Islands` page contains:

- Top-level bullets describing BFS: visited `set` of `(x, y)`, grid scan, BFS queue, four directions, boundary checks.
- `## BFS NOTES`, then a `python` code fence implementing BFS; a space-complexity note.
- `## DFS`, then a `python` code fence implementing DFS; runtime and space notes.
- Follow-up bullets for counting islands of different numeric types; a fenced code block labeled `sql` that actually contains Python.

Expected import: **one** `Number of Islands` flashcard, with separate optional sections for BFS tips/notes/code/complexity, DFS code/complexity, and follow-up notes/code. The importer should preserve user content and avoid interpreting a mislabeled language fence as permission to rewrite code. Allow changing its display language manually.

The original pasted notes do **not** contain the full LeetCode problem description. Accordingly, the importer must support a **missing description** gracefully: hide/disable `Reveal Question` until description is provided, or allow the user to enter it. A sample description in the earlier UI prototype was illustrative, not imported from those notes.

## 5. Suggested implementation direction (not locked requirements)

- React Native + Expo + TypeScript for the iPhone app.
- Local SQLite storage for problems, note sections, scheduler state and review logs.
- FSRS implementation in TypeScript, with a wrapper to map the three UI ratings to scheduler ratings.
- Expo local notifications for reminders and navigation on tapping.
- Offline-first, no user account or server for the personal MVP.
- Markdown parser that imports Notion exported files and retains unknown structures rather than trying to overclassify them.

Codex should treat this as a planning baseline, **not authorization to start implementing additional scope**. Design the schema and screens around the confirmed flow and ask before introducing cloud sync, authentication, AI generation, complex import transformations or bulk data sourcing.

## 6. Open product decisions / not finalized

1. **Daily queue policy:** soft target vs obligation to finish all due reviews; what happens when more are due than the target.
2. **Initial problem activation:** schedule all imported problems with staggered due dates vs gradually activate them.
3. **Import packaging:** entire Notion ZIP in one go vs category-by-category; whether to support both.
4. **Problem description source:** manually entered, preserved if present in Notion, or separately obtained from a permitted source. Do not invent descriptions.
5. **Missing/uneven note sections:** exact fallback grouping and editor behavior.
6. **Reimport update behavior:** replace notes, merge, prompt on conflicts; review history should ideally stay intact, but semantics remain unapproved.
7. **Manual review and rating:** does an early/manual review reschedule the problem? Default suggestion: yes if explicitly rated, but confirm.
8. **Review reminders:** frequency, preferred time, badge use, follow-up notifications, and completion handling.
9. **Review history/stats:** necessary minimum UI versus later refinements.
10. **On-device deployment:** Expo Go vs development build and chosen distribution method; evaluate based on notification/plugin requirements.

## 7. Non-goals

- Teaching LeetCode from scratch.
- Requiring full code submissions during each review.
- Displaying all hints and solutions by default.
- Replacing user's notes with generated answers.
- Building a multi-user SaaS product.
- Notion live sync, AI features, hosted backend, cloud accounts or overly elaborate import tools for MVP.

## 8. Acceptance checks

- An imported `Number of Islands` card opens with **only** `Number of Islands` visible as problem metadata on the front.
- `Reveal Question` does not leak hints and handles absence of problem description cleanly.
- Flipping displays metadata and *only section titles*, with every solution section hidden.
- Revealing `BFS Code` does not reveal `DFS Code`, tips or complexity.
- A card with three or more approaches is representable without schema changes.
- Rating `Rusty` stores one review event and moves the card to a suitably earlier next review than a comparable `Comfy` review, as determined by the scheduler.
- Closing the app halfway through a session leaves the remaining reviews available later.
- A notification opens the review session, but notification dismissal cannot erase due items.
- Reimporting the same identified problem should not silently create multiple unrelated cards.

---

*This document captures the conversation's requirements decisions through October 19, 2026. Requirements can be revised before development.*
