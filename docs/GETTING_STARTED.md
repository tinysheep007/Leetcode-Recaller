# Setup and usage guide

Set up your own copy locally first, then optionally host it on Vercel and enable Resend reminders. Reviewing notes requires no API key, remote database or app login.

## 1. Tools and code

Install [Node.js](https://nodejs.org/en/download) 22.13 or newer with npm and [Git](https://git-scm.com/downloads). Check `node --version`, `npm --version` and `git --version` in your terminal.

For your own deployment, open this repository on GitHub and choose Fork, then clone your fork. Replace `YOUR_USERNAME` below with your GitHub username:

```sh
git clone https://github.com/YOUR_USERNAME/Leetcode-Recaller.git
cd Leetcode-Recaller
npm ci
npm run dev
```

Run commands from the folder containing `package.json`. `npm ci` installs the lockfile's dependency versions; you do not separately install Next.js or TypeScript.

## 2. Local use

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). If the terminal reports another port, use that port. Stop the server with Ctrl+C.

No `.env` file is needed for imports or reviews. A fresh browser has an empty library. Development mode does not register the offline worker; production/offline testing is explained below.

## 3. Prepare and import your problems

There is **no default question ZIP in the repository**. The owner's `questions.zip` remains private and ignored by Git. To use a [NeetCode practice collection](https://neetcode.io/practice), prepare files for the problems you want; no particular problem list is required.

Choose **Import notes +** in Library and select:

- One UTF-8 `.md` file for a single problem; or
- A ZIP containing UTF-8 `.md` files, one per problem, plus optional local images.

Notion Markdown ZIP exports work, but Notion is not required. The selected file must be at most **25 MB**. PDFs, Word files, JSON and CSV are not supported import formats.

### Minimal Markdown

Save this as `1 Two Sum.md`:

```markdown
# 1. Two Sum

https://leetcode.com/problems/two-sum/
```

Only a title is needed. Without a `# ` heading, the filename supplies the title. Known titles receive bundled short summaries, links and difficulty; unknown titles still import with those fields empty. A link does not trigger a statement download.

### Notes, approaches and complexity

Copy the text inside this example into a `.md` file. The code is an illustrative note, not a supplied LeetCode solution:

````markdown
# My practice problem

My observations and things I want to remember.

## First approach

My explanation of this approach.

```python
def solve(values):
    return len(values)

# runtime: O(1)
# space: O(1)
```

## Second approach

Another approach or comparison.

runtime: Not measured yet
space: Not measured yet

## Follow-up

What changes if the input grows?

![My diagram](images/diagram.png)
````

- `# ` supplies the title. `##` through `######` headings group notes and approaches.
- Fenced code retains its language label and entire contents.
- Explicit runtime/space lines outside fences become separate reveals.
- Python-style `# runtime:`, `# run:`, `# time:` and `# space:` comments are additionally extracted when in a trailing comment block after executable code. Complexity is never calculated from the code.
- Missing fields are allowed and show “Not provided yet” only after reveal.
- A `Description` heading is treated as notes; it does not populate the special Question reveal. There is no user-facing description/link editor.

See [exact parsing rules](PARSING_RULES.md) for supported variants and heuristic limitations.

### ZIP layout and images

Example ZIP contents:

```text
my-notes/
  Arrays/
    1 Two Sum.md
  Graphs/
    My practice problem.md
    images/
      diagram.png
```

The immediate parent folder becomes the category: Arrays or Graphs here. A standalone Markdown file normally becomes Uncategorized. Notion IDs in filenames are optional. A Markdown page whose base filename matches a sibling folder containing Markdown descendants is treated as a category index and skipped; avoid that naming pattern for real problem cards.

Reference images relative to the Markdown file, such as `images/diagram.png`. Include them in the ZIP. PNG, JPEG, GIF and WebP are supported. Remote images are not downloaded by the renderer, and importing a lone Markdown file does not import neighboring images.

Compress the folder using your computer's ZIP menu/command, then select that ZIP in the app. Import occurs in the browser; no upload to Vercel or commit to Git is needed.

### Reimports

Identity comes from the first LeetCode problem URL in the note, otherwise a Notion page ID, otherwise the normalized title. Put the problem's own link first and use one problem per file.

Existing identities are **skipped**, preserving notes/progress instead of replacing text. Changing the identity source can produce a duplicate. Assets at the same import path can be replaced. Note merging/editing is not implemented.

## 4. Everyday use and storage

1. Browse Library with search and category/difficulty filters; lists are paginated.
2. Open a problem, optionally reveal Question, then flip to its back. Reveal notes and code individually.
3. Rate Forgot, Rusty or Comfy. Only rating changes the schedule. Unreviewed rows show only an arrow, without a deadline.
4. Set your daily target (default 5). Saved sets prioritize scheduled reviews, then offer new problems. Unfinished selections carry forward. Random selects from the entire library regardless of browsing filters.
5. Save personal questions under My questions on a card's back; use Questions to search them.
6. Stats shows visits, dated ratings and category comparisons. Category percentages use each problem's latest rating, excluding unrated problems. Visits start with this tracking feature, not historical imports.

Data stays in IndexedDB on that browser/device/site address. Localhost, preview URLs, your production domain, phone and laptop each have separate storage. Import directly where you intend to use the app. Clearing site data, private sessions ending, device resets or storage eviction can remove local data. There is no app login, cloud sync or recovery service.

## 5. Deploy on Vercel

1. Push your fork to GitHub and sign up/sign in at [Vercel](https://vercel.com/signup).
2. Open [New Project](https://vercel.com/new), import **your fork**, and use your production branch, normally `main`.
3. Set root directory `./`, framework **Next.js**, and build command **`npm run build`**. This command also generates the offline worker. Leave output directory at the Next.js default and installation on lockfile-based automatic detection.
4. Deploy and record your stable HTTPS production URL, for example `https://your-recall-app.vercel.app/`.
5. Open that address and import your notes there. Localhost data does not transfer automatically.

See [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs). Email is optional: absent credentials make reminder routes fail closed without blocking reviews. No database service is needed.

With Git integration enabled, pushing to the production branch starts a deployment. Verify the build and commit in Deployments. Environment changes require a new deployment too. Keep using the stable production domain rather than a new preview URL each time.

## 6. Optional email reminders

### Resend account

1. Create an account at [Resend](https://resend.com/signup), using your desired reminder email for an owner-only trial.
2. Open [API Keys](https://resend.com/api-keys) and create a key with sending permission. See [Resend key setup](https://resend.com/docs/dashboard/api-keys/introduction).
3. Enter the key directly in Vercel, never source code, Git, chat or screenshots.

`onboarding@resend.dev` is a test sender limited to your Resend account email. For another recipient or your own sender, [verify a domain](https://resend.com/domains) and use an address on it. See [test-sender restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain) and [current plans/limits](https://resend.com/pricing). Do not assume unrestricted or unlimited free sending.

### Vercel environment variables

In your Vercel project, open Settings → Environment Variables / Environments. Choose **Production** and add:

| Key | Value |
| --- | --- |
| `RESEND_API_KEY` | Your private Resend sending key |
| `REMINDER_TO` | Your email; use the Resend account email with the test sender |
| `APP_URL` | Your own stable HTTPS origin, e.g. `https://your-recall-app.vercel.app/`; no query, fragment or subpath |
| `CRON_SECRET` | A random private string at least 16 characters long |
| `REMINDER_ENABLED` | `true` to send; `false` to pause |
| `REMINDER_FROM` | Optional: default `LeetCode Recall <onboarding@resend.dev>` |
| `REMINDER_TIME_ZONE` | Optional: keep `America/New_York` for the bundled Boston schedule |

Enter plain values without wrapping quotation marks in Vercel. Use its Secret option for keys/secrets if available. Do not use `NEXT_PUBLIC_`: settings are server-only. Variables set only for Development do not configure Production. Save, then **redeploy Production**. See [Vercel environment setup](https://vercel.com/docs/environment-variables/managing-environment-variables).

Generate the cron secret with a password manager or run locally:

```sh
openssl rand -hex 32
```

Copy its output into Vercel; you do not need to memorize it. Vercel includes the value in the cron Authorization header. See [cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

For local email development only, copy `.env.example` to `.env.local`, replace its example app URL and fill in your values. Restart the dev server after local changes. `.env.local` is ignored by Git; do not put actual secrets in `.env.example`. Vercel variables are not automatically copied into local files.

### Timing and verification

The bundled schedule is around **8 a.m. Boston time**, covering daylight and standard time:

| Route | UTC cron expression |
| --- | --- |
| `/api/cron/reminder` | `0 12 * * *` |
| `/api/cron/reminder-standard` | `0 13 * * *` |

Both routes share a handler that sends only during the local 08 hour. On Hobby, daily invocations can occur anywhere within the scheduled hour, so expect roughly **8–9 a.m.**, not exactly 8:00. See [cron usage limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Changing only the timezone variable does not create a different local schedule. A different time/timezone requires checking both UTC schedules and the handler's hour check; see [EMAIL_REMINDERS.md](EMAIL_REMINDERS.md).

After enabling and redeploying:

1. Check both jobs in the project's Cron Jobs settings.
2. During Boston's 8–9 a.m. hour, use the dashboard's Run action for a real test, or wait for the scheduled invocation. Outside that hour the handler skips sending.
3. Check Vercel function logs, [Resend email logs](https://resend.com/emails) and your inbox/spam folder. `accepted: true` means provider acceptance, not guaranteed inbox delivery.

Opening the route in a browser lacks the secret header and is not a send test. Daily idempotency can suppress duplicate test sends. The app does not expose raw provider errors; inspect private dashboard logs.

Subject: **Time for your LeetCode recall**. Body: a generic reminder and your app link. The server cannot read phone IndexedDB, include its daily selection or know if reviews are finished. Set `REMINDER_ENABLED=false` and redeploy to stop sending.

## 7. iPhone and offline use

1. Open your stable HTTPS deployment in Safari.
2. Choose Share → Add to Home Screen, then open the Home Screen app online.
3. Import your notes there and wait for **Ready for offline use**.
4. Close it, enable airplane mode and reopen. Check notes, questions and a disposable practice card's saved rating.

Reviews, stats, charts and animations use local records/bundled assets after caching. Installation, app updates and external source links require connectivity. CSS motion respects Reduce Motion. Email delivery requires connectivity too.

For updates, open online and let the new version download. When an update is waiting, close all app windows/tabs for the origin and reopen. Activation preserves IndexedDB. Do not clear site data to force an update.

For a local production/offline check:

```sh
npm run build
npm start -- --port 3001
```

Open `http://127.0.0.1:3001`, wait for offline readiness and import on that origin. Stop the server and reopen the same address. This data is separate from port 3000. Your iPhone cannot reach your Mac through `127.0.0.1`. See [OFFLINE.md](OFFLINE.md).

## 8. Checks and troubleshooting

```sh
npm test
npm run typecheck
npm run build
```

Tests use fake email delivery and temporary IndexedDB; they do not send real mail. With the owner's private export available, `RECALL_TEST_ARCHIVE=questions.zip npm test` runs additional checks expecting that export's 151 cards. Do not set it for arbitrary exports with different expected counts. Normal tests need no private ZIP.

| Symptom | Check |
| --- | --- |
| Empty library on another device/URL | Import there too; storage is separate |
| Image unavailable | ZIP inclusion, supported extension, relative path |
| Reimport leaves text unchanged | Existing IDs are skipped; merging is not implemented |
| Description absent | Only catalog titles receive summaries; links do not fetch statements |
| Upgrade stuck | Close old app tabs and reopen; do not clear data |
| Old deployed UI | Check production commit, download update online, close all app tabs and reopen |
| Cron 401 | Missing/wrong bearer secret; browser navigation is unauthenticated |
| Cron 503 | Missing/short secret or incomplete enabled reminder settings |
| Cron skipped | Disabled, Preview deployment, or outside the local 08 hour |
| Provider error / 502 | Check Resend key, recipient, sender/domain and private logs |
| Offline app unavailable | Correct origin, production build and Ready for offline use before disconnecting |

[CHECKLIST.md](CHECKLIST.md) separates implementation from real-device/deployment checks. Local tests do not verify your Vercel account, mailbox or iPhone.
