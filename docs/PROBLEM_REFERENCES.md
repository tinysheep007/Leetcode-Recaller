# Problem reference catalog

`src/lib/problem-references.ts` bundles curated source URLs and short, independently worded recall prompts. Source pages were checked on 2026-10-20 using page lookup; the application performs no scraping, external API calls or runtime fetching. These prompts omit examples, full constraints, follow-ups, diagrams and solutions. Consult the linked source for the complete problem.

## Coverage and sources

The current `questions.zip` has 151 cards (150 distinct titles, including Happy Number twice). All 151 titles match a catalog URL; 146 cards have short descriptions. Each LeetCode entry links directly to its corresponding `https://leetcode.com/problems/<slug>/` source. The two AlgoMonster entries use their original pages:

- [Newspapers](https://algo.monster/problems/newspapers_split)
- [Peak of a Mountain Array](https://algo.monster/problems/peak_of_mountain_array)

LintCode-numbered imports match by title to the corresponding LeetCode problem, not by the number. These links are equivalent problem pages, not the original LintCode URLs. [Graph Valid Tree](https://www.lintcode.com/problem/178/) and [Walls and Gates](https://www.lintcode.com/problem/663/) had public descriptions available through indexed LintCode results, which support their original short summaries. Their LeetCode links were also checked.

Five descriptions remain empty because their statements could not be verified from the accessible primary pages during this lookup. Their LeetCode destinations were found but were locked:

- [Encode and Decode Strings](https://leetcode.com/problems/encode-and-decode-strings/)
- [Number of Connected Components in an Undirected Graph](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/)
- [Alien Dictionary](https://leetcode.com/problems/alien-dictionary/)
- [Meeting Rooms](https://leetcode.com/problems/meeting-rooms/)
- [Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/)

Those cards retain the existing missing-field message after reveal. No locked statement is copied or reconstructed. Link availability and access requirements may change.

## Matching and persistence

Matching ignores capitalization, punctuation and a leading numeric prefix followed by `.` or `·`. Canonical slug names and a small explicit alias list cover misspellings and abbreviated titles in this archive. Numbers alone, fuzzy similarity and solution notes never select a reference. Unknown titles remain unfilled. Adding more titles requires adding and reviewing catalog entries.

Enrichment happens in `importProblems` after the parser computes the stable ID, and in `loadReviewState` for already stored cards. It fills empty descriptions and URLs only, then persists the result in IndexedDB. If an existing nonempty URL differs from the catalog source, enrichment skips the card to avoid mixing a variant's link and description. Existing descriptions are preserved. Applying the same catalog repeatedly makes no further changes.

IDs, original Markdown, parsed answer sections, schedules, review logs and personal questions are preserved. No reimport or database reset is required. Descriptions and links remain read-only in the UI; links appear only on card backs. Newly bundled catalog entries arrive with the app update and work offline once the production app shell is cached; following an external source link requires internet access.

## Verification

`tests/problem-references.test.ts` covers alias matching, unrelated titles, conflicting URLs, preservation of existing metadata, automatic backfill with actual rating/question records, idempotence and reimport safety. With `RECALL_TEST_ARCHIVE=questions.zip npm test`, the actual archive verifies 151 links, 146 descriptions, the five documented gaps, and preservation of IDs/notes/sections. Tests and a production build are checked locally; deployed/iPhone interaction remains a separate check.

## Difficulty

Catalog LeetCode entries also carry Easy, Medium or Hard ratings alongside their source URL. These are LeetCode ratings, including for equivalent problems imported with LintCode numbering. Difficulty is metadata rather than a value inferred from notes or the user's recall rating. The two AlgoMonster entries have no assigned LeetCode rating and display Unrated. The actual archive has difficulty for 149 of 151 cards.

Difficulty is optional on problem records for compatibility with existing IndexedDB data, and the same enrichment step fills it without resetting progress. A supplied difficulty is preserved. It appears only beside the category on the card back, never on the title-only front. Catalog ratings are a snapshot and may need updating if the source changes.
