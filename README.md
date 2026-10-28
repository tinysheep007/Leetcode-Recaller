# LeetCode Recall

A personal, offline-capable coding-problem review app built with Next.js, React and TypeScript. Notes, images, personal questions and progress stay in your browser's IndexedDB. No app login or remote database is required for local-only use. Optional owner-only Supabase sync enables personalized daily-title emails.

## Get started

**[Full setup and usage guide →](docs/GETTING_STARTED.md)**

The guide covers local development, the expected Markdown/ZIP format, Vercel deployment, Resend account setup, every email environment variable, iPhone installation and troubleshooting.

Requires Node.js 22.13+ and npm. From the cloned repository:

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000), then choose **Import notes +**. No environment variables are required for local-only use; reminders and optional cloud sync have separate setup.

**Bring your own notes:** `questions.zip` is private and excluded from Git. A fresh clone contains no default problem ZIP. Import a single Markdown file or a ZIP containing one Markdown file per problem. See the [format and copyable examples](docs/GETTING_STARTED.md#3-prepare-and-import-your-problems).

## Features

- Library search, category/difficulty filters and pagination.
- Title-only card fronts; independent notes/code/complexity reveals and formatted original Markdown.
- Saved daily sets, adjustable daily target, Random practice and FSRS scheduling from Forgot / Rusty / Comfy ratings.
- Personal questions and a searchable Questions tab.
- Stats with visit counts, dated rating history and category recall charts.
- Offline caching, iPhone Home Screen installation and lightweight CSS motion respecting Reduce Motion.
- Optional owner-only daily email via Resend and Vercel Cron around 8 a.m. Boston time.

Known titles receive bundled short summaries, links and difficulty metadata. This is not a full statement or solution library. Missing content stays empty, with a placeholder after reveal; the running app does not fetch statements.

Each browser, device and site address has separate data. Normal updates preserve IndexedDB; clearing site data or browser storage eviction can remove it. There is no cloud sync or backup. Emails are generic in local-only mode. Optional Supabase sync lets them list the shared daily titles; notes and images still stay local.

## Development checks

```sh
npm test
npm run typecheck
npm run build
```

Tests use fake email delivery. Device behavior and real email delivery require separate verification. The private archive is optional; see the setup guide for archive-specific tests.

## Documentation

- [Setup and usage guide](docs/GETTING_STARTED.md)
- [Checklist and verification status](docs/CHECKLIST.md)
- [Markdown parsing rules](docs/PARSING_RULES.md)
- [Reference catalog coverage](docs/PROBLEM_REFERENCES.md)
- [Supabase setup for personalized emails](docs/SUPABASE_SETUP.md)
- [Daily sessions and random practice](docs/DAILY_REVIEWS.md)
- [Personal questions and storage](docs/PROBLEM_QUESTIONS.md)
- [Stats and visit counting](docs/STATISTICS.md)
- [Email configuration and limitations](docs/EMAIL_REMINDERS.md)
- [Offline use and iPhone installation](docs/OFFLINE.md)
