# Daily email reminders

## What is implemented

The official `resend` npm package sends one generic personal reminder through Resend. Vercel Cron calls `GET /api/cron/reminder` and `/api/cron/reminder-standard` at two UTC slots; only the one in Boston’s 8 a.m. hour sends. No public enrollment form or user database is needed for one owner.

An npm library constructs and submits a message; it does not itself provide an email delivery network. Nodemailer would instead connect to an SMTP service. This implementation uses Resend's HTTPS API and official SDK directly.

No provider account, real credentials or live mailbox has been configured by the agent. No real email has been sent. The feature is inactive unless `REMINDER_ENABLED` is exactly `true` and valid credentials/settings are supplied.

## Free setup

1. Create a free account at https://resend.com using the address where you want reminders.
2. Open API Keys in Resend and create a sending API key. Keep it private; enter it directly in Vercel, not in chat or Git.
3. In Vercel → your project → Settings → Environment Variables, add the values below for **Production**.
4. Deploy the code with `npm run build` as the build command (normally push to main after committing). Changes to environment variables require a new deployment too.
5. Check Vercel's Cron Jobs settings for the reminder job. Use its Run action during Boston’s 8–9 a.m. hour to trigger a real test after enabling (outside this hour the endpoint returns a skipped result); check Resend's email log and your inbox/spam folder. A provider acceptance response does not guarantee inbox delivery.

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | Your private API key from Resend |
| `REMINDER_TO` | Exactly the email associated with your Resend account when using the test sender |
| `CRON_SECRET` | A random secret at least 16 characters long; use a password manager or locally generate one |
| `REMINDER_ENABLED` | `true` to send; `false` to pause |
| `APP_URL` | `https://leetcode-recaller.vercel.app/` (stable production origin) |
| `REMINDER_FROM` | Optional: `LeetCode Recall <onboarding@resend.dev>` is the default |
| `REMINDER_TIME_ZONE` | Optional: `America/New_York` is the default, used to determine the day for duplicate suppression |

Enter plain values in Vercel without wrapping them in quotation marks. Never use `NEXT_PUBLIC_` for the API key, recipient or cron secret. `.env.example` contains placeholders only; `.env.local` stays ignored by Git.

### Sender restrictions

Resend's free plan currently includes 3,000 emails/month with a 100/day cap, comfortably above one personal email/day. Its `onboarding@resend.dev` sender is **for testing and restricted to the account owner's email**. It is not a general production sender. A verified domain is required to send to other people or use your own sender; do not assume the test sender is an unrestricted long-term production service. Account/provider restrictions can still apply.

For a first personal trial, the owner-only test sender avoids buying a domain. If the provider rejects it, inspect the Resend dashboard's error; the app doesn't bypass sender verification.

Official references: [pricing](https://resend.com/pricing), [test sender restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [Next.js SDK guide](https://resend.com/docs/send-with-nextjs).

## Schedule and changing it

The user-requested schedule is **around 8 a.m. Boston time** (`America/New_York`), year-round. On Vercel Hobby, delivery can occur within **8–9 a.m.**, not necessarily at exactly 8:00.

`vercel.json` uses two separate daily cron jobs: **12:00 UTC** and **13:00 UTC**. Each job runs at most once daily. The shared authenticated handler checks the configured local hour and only sends when it is 08. During daylight time, the 12 UTC slot sends and the 13 UTC slot skips; during standard time the 12 UTC slot skips and the 13 UTC slot sends. This handles daylight saving transitions without seasonal redeployments. Resend's day-based idempotency still protects retries of the sending slot.

Changing the desired hour requires updating both UTC slots in `vercel.json` and the local-hour check in `src/lib/email-reminder.ts`, then redeploying. `REMINDER_TIME_ZONE` defaults to `America/New_York`; keep that value for Boston. A different timezone requires recomputing both UTC slots. This setting doesn't affect daily card targets on the phone. Preview invocations are skipped by the handler.

To pause, set `REMINDER_ENABLED=false` in Vercel and redeploy, or disable both jobs from the Vercel Cron Jobs dashboard. Removing both jobs from `vercel.json` and redeploying removes scheduling entirely. This is an owner-managed reminder, not a public mailing list.

Official references: [cron setup](https://vercel.com/docs/cron-jobs), [Hobby timing limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [environment changes](https://vercel.com/docs/environment-variables/managing-environment-variables).

## Authentication, duplicates and privacy

- Vercel sends `Authorization: Bearer <CRON_SECRET>`. The route compares it to the private configured value. Missing/invalid authentication never sends email. Browsing directly to the URL is not a test-send action.
- Recipient, sender and link come only from server settings. Query strings/request bodies cannot select arbitrary recipients. No enrollment endpoint is exposed.
- Provider idempotency keys use a hash of the recipient and the configured timezone's calendar day. The payload is stable for repeated invocations that day. Resend keeps these keys for **24 hours**, not permanently. This suppresses ordinary immediate retries; it is not an indefinite exactly-once delivery guarantee.
- Changing sender/link settings during the same day can cause a conflicting payload for the same key and a provider rejection. Check logs rather than rotating keys to force repeated sends.
- Responses never expose recipient addresses, keys, secrets, or raw provider errors. Provider errors return a generic 502; Resend's private dashboard is the source for delivery diagnostics. Successful acceptance returns `accepted: true`, not an assertion of inbox delivery.
- The service worker doesn't cache API routes. There are no browser-side email credentials.
- The email contains a generic reminder and link only. The server cannot inspect the phone's IndexedDB, calculate its due count, or know whether you already completed today's set. A reminder still arrives on completed days while enabled.
- Resend receives the configured sender/recipient and message to deliver it. Vercel holds the server environment variables. Personal problem notes and review history remain local.

Official references: [cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Resend idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Verification

`npm test` uses a fake sender to verify authentication, disabled/preview behavior, validation, fixed recipient selection, deterministic day keys/payloads and failure responses. It does not send real mail. The actual provider delivery and scheduled Vercel run must be verified after the owner configures their account.
