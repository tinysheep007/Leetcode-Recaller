# Personal questions and review portal

## User flow

1. Open any imported problem and flip to the back.
2. Open **My questions**, type a question and press **Save question**.
3. Save additional questions independently or edit an existing one.
4. Open **Questions** in the header to see every problem with saved questions, grouped by problem.
5. Search the portal by problem title or question text. **Open problem** opens its back with My questions expanded; solution sections stay collapsed.

The Questions navigation count is the number of problems with questions. The portal also shows the total number of saved questions. The flashcard front does not display personal question contents or a problem-specific question count. Writing questions does not rate a card, change its FSRS state, or complete a daily obligation.

Questions are plain text, preserving internal line breaks. Each must contain 1–10,000 non-whitespace characters. Saving is explicit; unsaved draft text is not persisted across navigation/refresh. No deletion, resolved status, full note editing, or cloud sync was added.

## Database design

Database: `leetcode-recall`, schema **version 3**. Existing stores remain intact:

| Store | Purpose |
| --- | --- |
| problems | Imported notes, parsed sections, problem identity, FSRS state |
| reviews | Timestamped ratings and scheduler logs |
| assets | Imported image blobs |
| settings | Daily target |
| sessions | Saved daily selection and completion |
| questions (new) | Multiple personal questions linked to each problem |

Question record:

```ts
{
  id: string;          // random UUID, primary key
  problemId: string;   // existing Problem.id
  text: string;
  createdAt: Date;
  updatedAt: Date;
}
```

The `questions` object store uses `id` as its key path and a nonunique `by-problem` index on `problemId`. This represents one problem to many questions and supports loading questions for one problem without scanning the entire store. The current small portal loads all questions locally, groups them by problem, and filters them in memory.

A save transaction includes the problems and questions stores, validates that the referenced problem exists, then writes only the question. Editing keeps its ID, parent problem and creation time. A question cannot be reassigned to another problem through the save API.

Questions are separate from imported content, so reimport and rating writes do not overwrite them. The importer itself is unchanged. Version upgrades add the questions store/index without recreating or clearing the other stores. If an older tab blocks the upgrade, close older Recall tabs and reopen instead of clearing site data.

## Persistence and privacy

Questions remain in IndexedDB on the same device/browser/origin. They survive ordinary reloads, restarts and code updates, and use no network request or hosted database. They are not sent to the reminder server or included in emails. Once the production app is fully cached, its new components are included in the offline app shell; saving questions requires only local storage.

Clearing site data or browser storage eviction can remove questions along with other local data. They do not sync between localhost, Vercel previews, the production site, devices or browser profiles.

## Verification

`tests/questions.test.ts` verifies migration from schema v2, preservation of cards/history/settings/sessions/assets, multiple questions, index filtering, edits, invalid inputs, and preservation across reimport and ratings. The existing migration test also verifies upgrading from v1 to the latest schema.

The production build and automated tests pass. Browser interaction/offline UI verification was attempted but no browser surface was available in this tool session; actual iPhone verification is pending in CHECKLIST.md.

## Problem description and original link

These fields are read-only in the UI by user request. Reveal Question shows the stored description; the back shows an existing original problem URL. No editor or add-description shortcut is exposed. A bundled catalog now fills missing descriptions and source links on import/library load; see PROBLEM_REFERENCES.md for coverage and the five remaining description gaps. The internal `saveProblemDetails` storage helper can update these fields without changing the stable ID, notes, scheduling state, or personal questions, and its tests cover validation and preservation. It is not exposed through a user-facing form or HTTP endpoint. No automated LeetCode fetching is present.
