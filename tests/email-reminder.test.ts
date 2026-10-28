import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleReminder, reminderDay, type ReminderEmail } from '../src/lib/email-reminder';

const env = {
  CRON_SECRET: 'disposable-test-secret-long-enough', REMINDER_ENABLED: 'true',
  RESEND_API_KEY: 'test-key-no-real-credentials', REMINDER_TO: 'owner@example.com',
  APP_URL: 'https://recall.example.com/', VERCEL_ENV: 'production',
};
const now = new Date('2026-10-20T12:00:00Z');
const request = (authorization = `Bearer ${env.CRON_SECRET}`) => new Request('https://recall.example.com/api/cron/reminder?to=attacker@example.com', { headers: { authorization } });

test('missing or invalid authentication cannot send mail and responses are not cached', async () => {
  let called = false;
  const send = async () => { called = true; return true; };
  assert.equal((await handleReminder(request(''), env, send, now)).status, 401);
  assert.equal((await handleReminder(request('Bearer wrong'), env, send, now)).status, 401);
  const missing = await handleReminder(request(), { ...env, CRON_SECRET: '' }, send, now);
  assert.equal(missing.status, 503);
  assert.equal(missing.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(called, false);
});

test('disabled reminders and preview deployments never contact the provider', async () => {
  let called = false;
  const send = async () => { called = true; return true; };
  for (const settings of [{ ...env, REMINDER_ENABLED: 'false' }, { ...env, VERCEL_ENV: 'preview' }]) {
    const result = await handleReminder(request(), settings, send, now);
    assert.equal(result.status, 200);
    assert.ok((await result.json()).skipped);
  }
  assert.equal(called, false);
});

test('bad recipient, app URL, timezone, or missing key fail closed', async () => {
  const cases = [
    { REMINDER_TO: 'one@example.com,two@example.com' }, { APP_URL: 'http://example.com' },
    { APP_URL: 'https://username:password@example.com' }, { APP_URL: 'https://example.com/?secret=x' },
    { REMINDER_TIME_ZONE: 'Not/AZone' }, { RESEND_API_KEY: '' }, { REMINDER_FROM: 'a@example.com\nBcc: bad@example.com' },
  ];
  for (const changed of cases) {
    const result = await handleReminder(request(), { ...env, ...changed }, async () => { throw new Error('must not send'); }, now);
    assert.equal(result.status, 503);
    assert.equal((await result.text()).includes(env.REMINDER_TO), false);
  }
});

test('only the configured owner receives a generic app link; retries use identical day keys and payloads', async () => {
  const deliveries = new Map<string, ReminderEmail>();
  const seenKeys: string[] = [];
  const send = async (email: ReminderEmail, key: string) => { seenKeys.push(key); if (!deliveries.has(key)) deliveries.set(key, email); else assert.deepEqual(email, deliveries.get(key)); return true; };
  const first = await handleReminder(request(), env, send, now);
  const second = await handleReminder(request(), env, send, new Date(+now + 30 * 60000));
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  assert.equal(seenKeys[0], seenKeys[1]); assert.equal(deliveries.size, 1);
  assert.equal(seenKeys[0].includes(env.REMINDER_TO), false);
  const email = Array.from(deliveries.values())[0];
  assert.deepEqual(email.to, ['owner@example.com']);
  assert.ok(email.text.includes('https://recall.example.com/'));
  assert.ok(email.text.includes('Already finished?'));
  const body = await first.text();
  assert.equal(body.includes(env.CRON_SECRET), false); assert.equal(body.includes(env.RESEND_API_KEY), false);
  await handleReminder(request(), env, send, new Date('2026-10-21T12:00:00Z'));
  assert.equal(deliveries.size, 2);
});

test('provider rejection or network failure does not claim delivery', async () => {
  assert.equal((await handleReminder(request(), env, async () => false, now)).status, 502);
  const result = await handleReminder(request(), env, async () => { throw new Error('sensitive provider internals'); }, now);
  assert.equal(result.status, 502);
  assert.equal((await result.text()).includes('sensitive'), false);
});

test('reminder deduplication day follows the configured timezone', () => {
  assert.equal(reminderDay(new Date('2026-10-20T02:00:00Z'), 'America/New_York'), '2026-10-19');
  assert.equal(reminderDay(new Date('2026-10-20T05:00:00Z'), 'America/New_York'), '2026-10-20');
});


test('only the Boston 8 a.m. slot sends in summer and winter, including DST transition days', async () => {
  for (const [instant, expected] of [
    ['2026-10-20T12:30:00Z', true], ['2026-10-20T13:30:00Z', false],
    ['2026-12-20T12:30:00Z', false], ['2026-12-20T13:30:00Z', true],
    ['2026-11-01T12:30:00Z', false], ['2026-11-01T13:30:00Z', true],
    ['2027-03-14T12:30:00Z', true], ['2027-03-14T13:30:00Z', false],
  ] as const) {
    let sent = false;
    const result = await handleReminder(request(), env, async () => { sent = true; return true; }, new Date(instant));
    assert.equal(result.status, 200);
    assert.equal(sent, expected, instant);
    const body = await result.json();
    assert.equal(Boolean(body.accepted), expected, instant);
  }
});

test('personalized reminders use the shared titles, escape HTML and fail closed if cloud loading fails', async () => {
  let sent: ReminderEmail | undefined;
  const send = async (email: ReminderEmail) => { sent = email; return true; };
  const enabled = { ...env, SYNC_ENABLED: 'true' };
  const loader = async () => ({ day: '2026-10-20', titles: ['Two Sum', '<img src=x onerror=alert(1)>', 'Word Search'] });
  const response = await handleReminder(request(), enabled, send, now, loader);
  assert.equal(response.status, 200);
  assert.ok(sent!.text.includes('1. Two Sum'));
  assert.ok(sent!.html.includes('&lt;img'));
  assert.equal(sent!.html.includes('<img'), false);
  sent = undefined;
  const unavailable = await handleReminder(request(), enabled, send, now, async () => { throw new Error('private db error'); });
  assert.equal(unavailable.status, 503); assert.equal(sent, undefined);
  assert.equal((await unavailable.text()).includes('private'), false);
  const empty = await handleReminder(request(), enabled, send, now, async () => ({ day: '2026-10-20', titles: [] }));
  assert.equal(empty.status, 200); assert.equal(sent, undefined);
  let read = false;
  await handleReminder(request('Bearer wrong'), enabled, send, now, async () => { read = true; return loader(); });
  assert.equal(read, false);
});
