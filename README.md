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
npm run typecheck
npm run build
```

## Current state

Initial project scaffold with a responsive empty library screen. Import, storage, FSRS, offline caching, and email reminders are planned; they are not implemented yet. See `leetcode_recall_requirements.md` for the product baseline and updated web app decisions.

## Deployment plan

Connect this repository to Vercel as a Next.js project. GitHub and Vercel have not been connected yet. No external services or credentials are required for the local scaffold.

Future email credentials belong in server-side environment variables, never in client code or Git. A daily generic reminder can be added without uploading personal notes or review history.
