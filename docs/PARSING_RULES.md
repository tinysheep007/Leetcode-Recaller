# How question notes are parsed

Implementation: `src/lib/import.ts`. These are deterministic text rules, not AI extraction. Imported content is not corrected or rewritten.

## Files and categories

- Accept a Notion ZIP or one Markdown file through **Import notes +**. The UI limits the selected file to 25 MB.
- ZIP import reads `.md` files (case insensitive), ignoring `__MACOSX/` metadata.
- A Markdown file is treated as an index when its filename, with a trailing Notion ID removed, matches a sibling directory containing Markdown descendants. Index pages do not become cards. This is a heuristic, not a universal Markdown convention.
- Category is the immediate parent directory, with a trailing 32-character hexadecimal Notion ID stripped. A standalone Markdown file normally has category `Uncategorized`.
- Title is the first line starting with `# `, otherwise the filename without its extension and trailing Notion ID. Number prefixes in displayed titles are retained.
- PNG, JPEG, GIF and WebP assets from the ZIP are stored locally. Relative image paths are resolved from the original Markdown path. Missing images show a text placeholder. No remote images are fetched by the note renderer.

## Section rules, in order

| Input | Result |
| --- | --- |
| First `# ` title | Used as card title, omitted from the parsed note body |
| Opening fence of 3+ backticks or tildes | Starts a separate code section; headings and complexity text inside it are not parsed |
| Matching closing fence (same character, at least the opening length) | Ends that code section |
| `##` through `######` heading | Flushes preceding notes and sets the current section label and approach |
| A line beginning with optional `-`/`*` and `follow up`, `follow-up` or `followup` | Starts a Follow-up section and retains the line |
| A line beginning with optional `-`/`*`, then `runtime`, `time`, `time complexity`, `space`, or `space complexity`, then `:` or `=` | Creates a Runtime or Space complexity section for the current approach |
| Any other text | Retained in the current notes section; initial section name is Notes |

Heading and follow-up handling precede complexity handling. Keywords are case insensitive. Complexity recognition applies to a single line; subsequent lines return to notes under the current heading.

For code labels, the current heading loses a trailing `Notes`, `Note`, `Code`, or `Complexity`. For example `## BFS NOTES` followed by a fenced block produces **BFS Code**. Multiple blocks remain separate sections even if they have the same label. Without an approach heading the label is simply **Code**.

Code language labels are preserved exactly, including mistakes such as `sql` around Python. An unclosed code fence is retained through the end of the file. Sections receive sequential IDs; their labels do not have to be unique.

## Missing data and preservation

- Empty Runtime and Space complexity sections are added if no section label of that type exists anywhere in the card.
- Each named approach with a Code section also gets an empty Runtime and Space complexity section if those exact labels are missing. These placeholders are appended, not inferred from code.
- Missing content is stored as an empty string. **Not provided yet** appears only after revealing it.
- Descriptions are currently always empty; the importer does not yet recognize statement headings. Difficulty is not extracted. Neither is guessed from solution notes.
- The complete original Markdown string is retained unchanged. Parsed sections normalize CRLF line endings and trim surrounding whitespace.
- Unknown text is retained, but automatic grouping can be wrong. The original Markdown disclosure is the way to inspect the source until the editor is implemented.

## Identity and repeat imports

Identity uses this priority:

1. First LeetCode `/problems/<slug>` URL found anywhere in the original Markdown.
2. Trailing Notion page ID in the file path.
3. Normalized title: lowercase, leading problem number removed, then non-ASCII-alphanumeric characters removed.

An existing identity is skipped rather than merged or replaced. Existing notes, ratings and scheduling state are preserved. Assets at the same path may be replaced on reimport. A renamed file, changed identity source, shared first URL, or ambiguous normalized title can create a duplicate or cause a skip; there is no conflict-resolution UI yet.

## Example: Number of Islands

The supplied page produces Notes, BFS NOTES, BFS Code, BFS Space complexity, DFS Code, DFS Runtime, DFS Space complexity, Follow-up, and Follow-up Code. Missing per-approach complexity fields are appended as empty reveal sections. A `sql` fence in the follow-up remains `sql`.

## Verification

`npm test` checks parsing, duplicate import persistence, and FSRS ordering. With the local private ZIP present, `RECALL_TEST_ARCHIVE=questions.zip npm test` additionally verifies 151 problem pages, 18 index pages excluded, and 7 image assets. The ZIP is ignored by Git.
