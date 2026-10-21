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
| Opening fence of 3+ backticks or tildes | Starts a separate code section; code is preserved, with trailing Python-style complexity comments additionally extracted |
| Matching closing fence (same character, at least the opening length) | Ends that code section and checks its trailing comment block |
| `##` through `######` heading | Flushes preceding notes and sets the current section label and approach |
| A line beginning with optional `-`/`*` and `follow up`, `follow-up` or `followup` | Starts a Follow-up section and retains the line |
| A line beginning with optional `-`/`*`, then `runtime`, `time`, `time complexity`, `space`, or `space complexity`, then `:` or `=` | Creates a Runtime or Space complexity section for the current approach |
| Any other text | Retained in the current notes section; initial section name is Notes |

Heading and follow-up handling precede complexity handling. Keywords are case insensitive. Complexity recognition applies to a single line; subsequent lines return to notes under the current heading.

For code labels, the current heading loses a trailing `Notes`, `Note`, `Code`, or `Complexity`. For example `## BFS NOTES` followed by a fenced block produces **BFS Code**. Multiple blocks remain separate sections even if they have the same label. Without an approach heading the label is simply **Code**.

Code language labels are preserved exactly, including mistakes such as `sql` around Python. An unclosed code fence is retained through the end of the file. Sections receive sequential IDs; their labels do not have to be unique.

## Complexity comments at the end of code

The final contiguous block of comment-only (`#`) and blank lines inside each code fence is checked for explicit complexity labels:

```python
# runtime: O(M * N) M is row num; N is col num
# run: O(N)
# time complexity = O(N)
# space O(N)
# space: O(1)
```

Recognized labels are `runtime`, `run`, `time`, and `space`, optionally followed by `complexity`. Matching is case insensitive, indentation is allowed, and the label/value separator may be `:`, `=`, or whitespace. Comments following a recognized label are retained as explanation until the next recognized label. The leading comment marker is removed only in the separate display section so it isn't rendered as a Markdown heading.

The entire original code block, including these comments and its language fence, remains unchanged. Runtime/space sections are additional revealable copies attached to the current approach. This applies even to a mislabeled fence such as `sql`; no code is rewritten or analyzed for correctness. Interior comments followed by executable lines, inline comments after code, and missing complexity values are not extracted. This is a text heuristic, not Python syntax analysis.

Parser version 2 refreshes the parsed sections of older imported records from their saved original Markdown on library load, once per record. Problem identity, original source, description, FSRS state, review logs, personal questions and other fields are preserved. New imports are marked with the current parser version. Repeat ZIP imports still skip existing identities.

## Missing data and preservation

- Empty Runtime and Space complexity sections are added if no section label of that type exists anywhere in the card.
- Each named approach with a Code section also gets an empty Runtime and Space complexity section if those exact labels are missing. These placeholders are appended, not inferred from code.
- Missing content is stored as an empty string. **Not provided yet** appears only after revealing it.
- Imported descriptions initialize empty; the importer does not yet recognize statement headings. Descriptions and original links are read-only in the UI; the separate bundled reference catalog fills missing fields when a verified title match is available (see PROBLEM_REFERENCES.md). The parser itself does not fetch or infer statements. These fields are preserved by reimport skips and parser-version updates. Difficulty is not extracted from notes; the separate catalog supplies it for known LeetCode titles. Neither descriptions nor difficulty are guessed from solution notes.
- The complete original Markdown string is retained unchanged. Parsed sections normalize CRLF line endings and trim surrounding whitespace.
- Unknown text is retained, but automatic grouping can be wrong. The Original imported Markdown disclosure renders the complete unparsed note as formatted Markdown, including local image references, until the editor is implemented. The stored source string remains unchanged.

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
