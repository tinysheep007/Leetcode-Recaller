import { createHash, timingSafeEqual } from 'node:crypto';

// Server code only. Never import this module into a Client Component.
export type ReminderEmail = { from: string; to: string[]; subject: string; text: string; html: string };
export type EmailSender = (email: ReminderEmail, idempotencyKey: string) => Promise<boolean>;
type Environment = Record<string, string | undefined>;
const response = (body: Record<string, unknown>, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store, max-age=0' },
});
const digest = (value: string) => createHash('sha256').update(value).digest();
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function reminderDay(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (name: string) => parts.find(p => p.type === name)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export async function handleReminder(request: Request, env: Environment, send: EmailSender, now = new Date()) {
  if (request.method !== 'GET') return response({ error: 'Method not allowed' }, 405);
  const secret = env.CRON_SECRET;
  if (!secret || secret.length < 16) return response({ error: 'Reminder authentication is not configured' }, 503);
  const authorization = request.headers.get('authorization') || '';
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) return response({ error: 'Unauthorized' }, 401);
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production') return response({ skipped: 'Not a production deployment' });
  if (env.REMINDER_ENABLED !== 'true') return response({ skipped: 'Reminders are disabled' });

  const recipient = env.REMINDER_TO?.trim() || '';
  const from = env.REMINDER_FROM?.trim() || 'LeetCode Recall <onboarding@resend.dev>';
  let appUrl: URL, day: string;
  try {
    // One fixed recipient from server settings; no caller-controlled addresses or email content.
    if (!env.RESEND_API_KEY || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient)) throw new Error();
    if (/[\r\n]/.test(from) || !from.includes('@')) throw new Error();
    appUrl = new URL(env.APP_URL || '');
    if (appUrl.protocol !== 'https:' || appUrl.username || appUrl.password || appUrl.search || appUrl.hash || appUrl.pathname !== '/') throw new Error();
    day = reminderDay(now, env.REMINDER_TIME_ZONE || 'America/New_York');
  } catch { return response({ error: 'Reminder settings are incomplete or invalid' }, 503); }

  // Two daily UTC slots cover Boston's daylight and standard time offsets.
  // Only the slot that lands in the local 8 a.m. hour may send.
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: env.REMINDER_TIME_ZONE || 'America/New_York', hour: '2-digit', hourCycle: 'h23',
  }).format(now);
  if (hour !== '08') return response({ skipped: 'Outside the local 8 a.m. reminder hour', day });

  const link = appUrl.href;
  const email: ReminderEmail = {
    from, to: [recipient], subject: 'Time for your LeetCode recall',
    text: `A little recall, at your own pace.\n\nOpen your saved daily review: ${link}\n\nAlready finished? You are all set for today. This is a daily reminder; your notes and progress stay on your device.\n\nTo stop these reminders, set REMINDER_ENABLED=false in your Vercel project and redeploy.`,
    html: `<div style="font-family:Arial,sans-serif;color:#25392f;max-width:520px;margin:32px auto;line-height:1.7"><h1>A little recall.</h1><p>Take a moment to revisit the problems you’ve solved.</p><p><a href="${escape(link)}" style="display:inline-block;padding:12px 20px;background:#25392f;color:white;border-radius:8px;text-decoration:none">Open daily review</a></p><p>Already finished? You’re all set for today.</p><p style="font-size:12px;color:#6f786e">This is a daily reminder. Your notes and review progress stay on your device.</p><p style="font-size:12px;color:#6f786e">To stop reminders, set REMINDER_ENABLED=false in your Vercel project and redeploy.</p></div>`,
  };
  // Resend retains idempotency keys for 24 hours. Use a stable day key and body for retries.
  const recipientHash = createHash('sha256').update(recipient.toLowerCase()).digest('hex').slice(0, 24);
  const key = `recall-daily/${recipientHash}/${day}`;
  try {
    if (!await send(email, key)) return response({ error: 'Email provider rejected the reminder. Check the provider dashboard.' }, 502);
    return response({ accepted: true, day });
  } catch { return response({ error: 'Email provider is unavailable. Retry with the same daily key.' }, 502); }
}
