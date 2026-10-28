# Optional owner-only sync and personalized emails

The code is implemented locally, but live activation still requires your project, SQL, user account and Vercel settings. Local-only use remains available with `SYNC_ENABLED=false`. This is not full backup or note sync.

## 1. Create the project

Sign in at [Supabase Dashboard](https://supabase.com/dashboard), select your Free organization and choose New project. Pick a name, nearby region and strong database password. An organization alone is not a database project. Wait for provisioning; keep the password private.

The Free plan currently includes a 500 MB database and may pause after a week of inactivity. See [current pricing](https://supabase.com/pricing). No paid upgrade is required for this small metadata workload, within those limits.

## 2. Create your app user

In the project, open Authentication → Users and use Add user / Create user to create your own email/password account. Confirm the user using the dashboard's confirmation option if available, or complete its email confirmation. This app password is separate from your database password and Supabase dashboard login.

Copy that user's UUID for `SYNC_OWNER_ID`. It is the Authentication user ID, not the project or organization ID. The app rejects every other user, even if they can authenticate with the Supabase project.

Under Authentication configuration, disable **Allow new users to sign up** and leave anonymous sign-in disabled. Keep email/password sign-in enabled. The app has no public signup form or password-reset flow; manage this one account in the Supabase dashboard. See [auth configuration](https://supabase.com/docs/guides/auth/general-configuration) and [password sign-in](https://supabase.com/docs/guides/auth/passwords).

## 3. Run the SQL migration

Open the project's SQL Editor, create a query, paste the contents of [202610270001_owner_state.sql](../supabase/migrations/202610270001_owner_state.sql), then run it.

The migration creates `public.recall_owner_state`: one owner-keyed JSON state document and a version number. RLS is enabled and direct browser-role permissions are revoked. Only the server's secret-key role can read/write it; the server checks the authenticated owner before database access. See [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

Do not disable RLS or grant anonymous access to fix a setup error. Existing local IndexedDB records are not reset by this migration. The SQL has not been executed against your live project by the agent.

## 4. Configure Vercel

Find the project URL in Supabase's Connect dialog / Data API settings. Open Settings → API Keys for the **publishable key** and **secret key**. Create them if necessary. This implementation uses current key types, not legacy anon/service-role JWT keys. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

In your Vercel project's Production environment, add:

| Variable | Value |
| --- | --- |
| `SYNC_ENABLED` | `true` |
| `SUPABASE_URL` | Project URL, e.g. `https://your-project.supabase.co` (use the default Supabase domain) |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable key |
| `SUPABASE_SECRET_KEY` | Project secret key; server-only |
| `SYNC_OWNER_ID` | Your app user's UUID from Authentication → Users |
| `REMINDER_TIME_ZONE` | `America/New_York` for the bundled schedule |

Keep the existing Resend/reminder variables described in [EMAIL_REMINDERS.md](EMAIL_REMINDERS.md). `REMINDER_TO` is still the fixed email recipient; logging in does not change it.

Do not prefix any of these variables with `NEXT_PUBLIC_`. Put actual values directly in Vercel, not Git, screenshots or chat. `.env.example` has blank placeholders only. For local testing, put values in ignored `.env.local` and restart the dev server. Do not use a production database for disposable automated tests.

After the updated code is committed/pushed, redeploy Production to activate the new variables. Vercel environment changes do not modify an already-built deployment. To disable cloud access later, set `SYNC_ENABLED=false` and redeploy; local reviews remain available.

## 5. Connect the device that already has your notes

1. Open the updated app online on your existing browser/origin. Do not clear site data.
2. Set Daily target to **3** if you want three titles in the email. Existing larger selections can be replaced using Generate another set; completed reviews are always preserved.
3. Open **Cloud sync** below the header and sign in with the app user's email/password.
4. Wait for **Synced at …**. Initial upload seeds your metadata and, when possible, the current local daily selection.
5. Tap Sync now to retry an error. Check that your daily selection and notes still look correct.

No local data is uploaded until you sign in. The upload contains only problem IDs, titles, categories, FSRS schedules, daily target and daily selection/completion. Original Markdown, code, images, personal questions, visit counts and full rating logs are excluded.

If you connect another device, it can receive title/schedule placeholders. Import the same original ZIP there to supply the full local notes/images. Matching metadata-only records are hydrated without resetting their schedules. Different identity sources can create duplicates; use the same import on each device. Personal questions and detailed Stats history do not sync in this initial scope.

## 6. Confirm personalized email

With `SYNC_ENABLED=true`, both cron routes load the persisted shared daily set. They no longer send a generic fallback if the cloud lookup fails. An empty synced library produces no personalized email.

The email lists the selected titles only, with a button to the app; no hints or solutions are included. Its count follows your target and saved selection, not a hardcoded three. Fewer eligible problems may produce a smaller set. Preserved completed work can leave a set larger than a lowered target.

The cron creates/advances the shared day when the phone is closed. The phone adopts that persisted selection on the next successful sync. Once the email snapshot is created, retries retain the same day's titles for provider idempotency. Generate another set after delivery changes the app's set, not the email already in your inbox.

Test a scheduled or dashboard-triggered run during the configured 8–9 a.m. Boston hour and inspect Vercel/Resend logs and the actual inbox. The Supabase project must be active and the owner must have synced a library first. No live email was sent by the local tests.

## Offline, conflicts and data usage

- Reviews continue in IndexedDB offline; changes upload after reconnecting/signing in.
- Sync runs after sign-in, local imports/ratings/target changes/regeneration, window focus and reconnection. There is also Sync now. There is no continuous polling or realtime subscription.
- The app sends bounded metadata snapshots (up to 2,000 problems), not notes/images. Unlike local-only Stats, cloud sync does use network data when enabled.
- Schedules merge using the latest review timestamp. An old snapshot cannot replace a newer rated schedule. Simultaneous offline ratings of the same problem are not replayed as two FSRS events; the latest timestamp wins. Detailed logs remain local.
- Database writes compare version numbers and retry concurrent writes. A local rating made while a response is in flight prevents that response from overwriting local state; another sync uploads it.
- The saved server selection is authoritative. Daily completion merges without removing completed IDs. A stale Generate another set request is rejected and refreshed; the UI asks you to generate again rather than silently replacing someone else's newer selection.
- Pending target changes can update the shared target. Notes/questions/assets are never replaced by cloud metadata. There is no remote deletion UI.
- The shared day follows `REMINDER_TIME_ZONE`, including while offline after the first connection. Keep the device clock accurate. Emails only know progress successfully synced before they run.
- Login tokens use HttpOnly, SameSite cookies, Secure over HTTPS. API responses and cloud requests are not cached by the offline worker. Sign out retains local data; a paused/unavailable project must not prevent local reviews.

## Verification status

Local tests cover metadata allowlists, owner rejection, cookie/origin/body protections, stale snapshots, concurrent writes, in-flight local edits, metadata hydration, regeneration conflicts, frozen email titles, HTML escaping and provider failure behavior. SQL deployment, real auth, two-device use, offline reconnection and scheduled inbox delivery still need verification on your accounts/devices. Never clear local storage as a troubleshooting step.
