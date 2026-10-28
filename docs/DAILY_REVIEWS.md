# Daily review sessions

## Behavior

- Daily target defaults to **5**, adjustable to a whole number from 1 to 100 under **Daily target**. The preference stays on this browser/device.
- A saved daily set is created when the library is opened. It selects previously rated, due problems by oldest due timestamp first, with ID as a stable tie-breaker, then fills open slots with unreviewed problems in stable ID order. Future-due reviewed cards are not included. New problems have no user-facing review date until first rated; the scheduler's initial due timestamp is only an internal placeholder.
- The set is stable across refreshes and restarts. **Start/Continue daily review** opens its first unfinished card. Reveal state is not saved; resumed cards open on the front with answers hidden.
- A rating marks a selected card completed once. The card's FSRS update, review event, and daily completion are saved in one IndexedDB transaction.
- Rating a selected card from the library or Random also completes its pending daily obligation. Ratings on other cards do not replace the daily set or artificially increase its completion count.
- A Forgot card may be due again soon, but does not automatically re-enter today's daily set after being completed. Extra due practice or manual review can revisit it.
- The progress indicator counts completed cards in today's selected set, not all historical reviews or extra practice.

## Day boundaries and target changes

- Day keys use the device's local calendar, not UTC. Traveling or changing the device date/timezone affects which day the app sees.
- On the next local day, unfinished selected cards are carried forward in their existing order. Remaining slots are filled from the oldest scheduled reviews, then new problems. No review logs or due obligations are deleted.
- If carried selections exceed the target, they all remain available; the target is a soft workload goal.
- Increasing the target adds scheduled or new cards to available slots immediately. Lowering it preserves today's existing selections and applies to tomorrow's fill limit. The UI explains this behavior.
- If too few scheduled or new cards are available, select only those available. Cards becoming due later may fill remaining target slots, while existing selections stay fixed.
- The app refreshes on window focus, visibility changes and every 30 seconds while mounted. A day change returns an active session to the library. A stale daily rating from a different day or an already-completed daily card is rejected before a log is written.

## Extra and random practice

- After the daily set is complete, **Extra due practice** opens up to the daily target of currently due cards. These extra queues are temporary, but saved ratings persist.
- **Random problem** draws from a shuffled queue covering the entire library, including cards scheduled for later; library search/category filters do not restrict it. Each problem appears once per cycle. The queue is persisted locally across reloads. A new cycle avoids immediately repeating the previous draw when there is more than one problem. Newly imported IDs join the remaining queue; missing IDs are dropped.
- Selecting a random problem advances the saved random queue, but does not reschedule it or write a review. Revealing content also does not rate it. Explicitly rating it does. Random practice is available even before the daily set is finished.
- When nothing is due, the app shows a caught-up state; Random and manual early review remain available.

## Storage and migration

IndexedDB version 2 adds `settings` and `sessions` stores while retaining the existing `problems`, `reviews`, and `assets` stores. The preferences record is stored at `preferences`, the latest daily set at `daily`. Historical per-day sets are not retained; timestamped review logs are retained separately.

If an older app tab blocks the upgrade, close old Recall tabs and reopen. Do not clear browser data. There is no cloud sync, account, or new external dependency. This feature works offline with a fully cached production app.

Tests in `tests/daily.test.ts` cover bounded stable selection, carryover, changed targets, newly due cards, random selection, the v1-to-v2 upgrade, atomic daily completion, and duplicate stale daily ratings. Device-level testing remains separate in CHECKLIST.md.

## Browser verification

Verified in a production build at a separate test origin using seven disposable cards. Default selection was five; rating one and reloading resumed at card two with four left. Lowering the target to two kept the existing set; increasing to six added one card. Random practice without a rating left completion unchanged. With the server stopped, reload, rating, progress persistence, finishing the daily set, and opening Extra due practice all worked. Real library review logs were not used for these checks. Actual iPhone verification and deployment of these changes remain pending.

## Generate another set

Generate another set replaces only unfinished suggestions, preserves today's completed IDs/count and leaves all schedules/review logs/questions untouched. It prefers other due reviewed problems, then shuffled unreviewed problems, excluding the currently selected set. Explicit regeneration follows the current target for remaining slots (completed cards are always retained). If alternatives are insufficient, some previous unfinished suggestions remain; a message reports how many were replaced. Future-scheduled reviewed cards are not pulled in. Skipped suggestions stay eligible for a later daily set; regeneration is not a rating or permanent dismissal. Repeated regeneration can revisit an earlier set. Ordinary daily loading still carries unfinished cards forward unless you explicitly regenerate. A smaller library or soon-due Forgot/Rusty cards can still produce repetition on different days.

Random queue state lives under the separate `random` key in the existing settings store. No schema reset, schedule reset or new database version is required. Concurrent draws and regeneration use read/write transactions. Tests in selection.test.ts cover complete cycles, boundary repeats, library changes, concurrent draws and preservation of completed work/ratings.

## Optional shared selection

When cloud sync is configured and signed in, the server keeps the authoritative daily set for both the app and email. Local regeneration is provisional until sync succeeds. A stale generation request refreshes the shared set instead of overwriting newer changes. Daily completion is merged and schedules use the latest review timestamp. Local-only mode and saved Random cycles remain available independently. See SUPABASE_SETUP.md for scope and live checks.
