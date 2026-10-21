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

Notion ZIP and individual Markdown import, a searchable category-filtered library, independent answer reveals, missing-field placeholders, and FSRS ratings with IndexedDB persistence are implemented. Existing identified cards are skipped on repeat import, preserving notes and review history. Imported images and original Markdown are retained. All imported cards initially become due. Daily sessions select a saved set up to a configurable target (default 5), carry unfinished cards forward, and show daily completion progress. Extra due practice and random selection are available.

Offline app caching and a Home Screen manifest are implemented for production builds. Note editing and difficulty extraction are not implemented yet. Daily email reminder code is implemented but requires provider credentials and activation in Vercel; no real delivery has been verified. The current question description reveal shows a missing-field placeholder; no descriptions are generated from solution notes. Browser data belongs to the current device and site origin; localhost data does not transfer automatically to a future deployed URL. See `leetcode_recall_requirements.md` for the product baseline and updated web app decisions.

## Deployment plan

Connect this repository to Vercel as a Next.js project. The basic app is deployed at https://leetcode-recaller.vercel.app/ (confirmed by the user). Local changes require committing and pushing before they reach Vercel. No external services or credentials are required for the local scaffold.

Future email credentials belong in server-side environment variables, never in client code or Git. A daily generic reminder can be added without uploading personal notes or review history.

## Importing your notes

Click **Import notes +** and select `questions.zip` or a Markdown file. Import happens locally in your browser. The source ZIP is not bundled into the website.

The optional real-export test is run with `RECALL_TEST_ARCHIVE=questions.zip npm test`; it checks this supplied export against its expected 151 problem pages. Other tests run without the private export.

## Project documentation

- [Functionality checklist](docs/CHECKLIST.md)
- [Markdown parsing rules](docs/PARSING_RULES.md)
- [Daily review and random practice rules](docs/DAILY_REVIEWS.md)
- [Email reminder setup and limitations](docs/EMAIL_REMINDERS.md)
- [Offline design, iPhone installation, and production testing](docs/OFFLINE.md)
