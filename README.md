# LeetCode Recall

A personal LeetCode review app. Built with Next.js, React, and TypeScript.

## Local development

Requires Node.js 22.13+ and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Edit `src/app/page.tsx` to see changes in the browser.

## Verify

```sh
npm test
npm run typecheck
npm run build
```

## Current state

Notion ZIP and individual Markdown import, a searchable category-filtered library, independent answer reveals, missing-field placeholders, and FSRS ratings with IndexedDB persistence are implemented. Existing identified cards are skipped on repeat import, preserving notes and review history. Imported images and original Markdown are retained. All imported cards initially become due; the review button currently includes all due cards.

Offline app caching and a Home Screen manifest are implemented for production builds. Note editing, difficulty extraction, user-configurable daily targets, email reminders, and deployment are not implemented yet. The current question description reveal shows a missing-field placeholder; no descriptions are generated from solution notes. Browser data belongs to the current device and site origin; localhost data does not transfer automatically to a future deployed URL. See `leetcode_recall_requirements.md` for the product baseline and updated web app decisions.

## Deployment plan

Connect this repository to Vercel as a Next.js project. The GitHub remote is configured; Vercel deployment is still pending. No external services or credentials are required for the local scaffold.

Future email credentials belong in server-side environment variables, never in client code or Git. A daily generic reminder can be added without uploading personal notes or review history.

## Importing your notes

Click **Import notes +** and select `questions.zip` or a Markdown file. Import happens locally in your browser. The source ZIP is not bundled into the website.

The optional real-export test is run with `RECALL_TEST_ARCHIVE=questions.zip npm test`; it checks this supplied export against its expected 151 problem pages. Other tests run without the private export.

## Project documentation

- [Functionality checklist](docs/CHECKLIST.md)
- [Markdown parsing rules](docs/PARSING_RULES.md)
- [Offline design, iPhone installation, and production testing](docs/OFFLINE.md)
