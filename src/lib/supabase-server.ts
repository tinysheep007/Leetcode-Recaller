// Server-only: imported by Route Handlers, never by the browser bundle.
import { NextRequest, NextResponse } from 'next/server';
import { emptySharedState, hydrateSharedState, type SharedState, type SharedSnapshot } from './remote-state';

type Env = Record<string, string | undefined>;
export class RemoteError extends Error { constructor(message: string, public status = 503) { super(message); } }
export function remoteConfig(env: Env = process.env) {
  if (env.SYNC_ENABLED !== 'true') throw new RemoteError('Cloud sync is disabled.');
  const url = new URL(env.SUPABASE_URL || '');
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.pathname !== '/' || url.port || url.search || url.hash || url.username || url.password) throw new RemoteError('Check the Supabase project URL.');
  if (!env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SECRET_KEY || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(env.SYNC_OWNER_ID || '')) throw new RemoteError('Cloud settings are incomplete.');
  const timeZone = env.REMINDER_TIME_ZONE || 'America/New_York';
  new Intl.DateTimeFormat('en-US', { timeZone }).format();
  return { url: url.origin, publicKey: env.SUPABASE_PUBLISHABLE_KEY, secret: env.SUPABASE_SECRET_KEY, owner: env.SYNC_OWNER_ID!, timeZone };
}
export function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } }); }
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new RemoteError('Request origin is not allowed.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RemoteError('Use JSON.', 415);
}
export async function limitedJson(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new RemoteError('Missing request body.', 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new RemoteError('Request is too large.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new RemoteError('Invalid JSON.', 400); }
}
export async function authCall(path: string, body?: unknown, access?: string, env: Env = process.env) {
  const c = remoteConfig(env);
  return fetch(`${c.url}/auth/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000),
    headers: { apikey: c.publicKey, 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
type Session = { access_token: string; refresh_token: string; expires_in: number; user: { id: string } };
export function setSession(response: NextResponse, session: Session | null, request: NextRequest) {
  const options = { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict' as const, path: '/api' };
  response.cookies.set('recall-access', session?.access_token || '', { ...options, maxAge: session ? 3600 : 0 });
  response.cookies.set('recall-refresh', session?.refresh_token || '', { ...options, maxAge: session ? 60 * 60 * 24 * 30 : 0 });
  return response;
}
export async function ownerSession(request: NextRequest, env: Env = process.env): Promise<Session | undefined> {
  const c = remoteConfig(env);
  const access = request.cookies.get('recall-access')?.value;
  if (access) {
    const result = await authCall('user', undefined, access, env);
    if (result.ok) {
      const user = await result.json();
      if (user.id !== c.owner) throw new RemoteError('Only the configured owner can sync.', 403);
      return undefined;
    }
    if (result.status !== 401 && result.status !== 403) throw new RemoteError('Sign-in service is unavailable.');
  }
  const refresh = request.cookies.get('recall-refresh')?.value;
  if (!refresh) throw new RemoteError('Sign in to sync.', 401);
  const result = await authCall('token?grant_type=refresh_token', { refresh_token: refresh }, undefined, env);
  if (!result.ok) throw new RemoteError(result.status >= 500 ? 'Sign-in service is unavailable.' : 'Please sign in again.', result.status >= 500 ? 503 : 401);
  const session = await result.json() as Session;
  if (session.user?.id !== c.owner) throw new RemoteError('Only the configured owner can sync.', 403);
  return session;
}
export async function signIn(email: unknown, password: unknown, env: Env = process.env) {
  if (typeof email !== 'string' || email.length > 320 || typeof password !== 'string' || password.length > 1000) throw new RemoteError('Enter your email and password.', 400);
  const result = await authCall('token?grant_type=password', { email, password }, undefined, env);
  if (!result.ok) throw new RemoteError('Sign-in failed. Check the account credentials.', result.status === 429 ? 429 : 401);
  const session = await result.json() as Session;
  if (session.user?.id !== remoteConfig(env).owner) throw new RemoteError('Only the configured owner can sync.', 403);
  return session;
}

type Row = { version: number; data: unknown };
/** Version-checked writes prevent concurrent phone/cron requests from losing updates. */
export async function mutateSharedState(change: (state: SharedState, version: number) => SharedState, env: Env = process.env): Promise<SharedSnapshot> {
  const c = remoteConfig(env);
  const headers = { apikey: c.secret, 'Content-Type': 'application/json' };
  const base = `${c.url}/rest/v1/recall_owner_state`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const read = await fetch(`${base}?owner_id=eq.${c.owner}&select=version,data`, { headers, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!read.ok) throw new RemoteError('Could not load cloud data. Check the project settings and SQL migration.');
    const rows = await read.json() as Row[];
    const row = rows[0];
    const version = row ? Number(row.version) : 0;
    if (!Number.isSafeInteger(version) || version < 0) throw new RemoteError('Cloud version is invalid.');
    const current = row ? hydrateSharedState(row.data) : emptySharedState();
    const next = change(current, version);
    if (row && JSON.stringify(next) === JSON.stringify(current)) return { version, state: next, timeZone: c.timeZone };
    const write = await fetch(row ? `${base}?owner_id=eq.${c.owner}&version=eq.${version}` : base, {
      method: row ? 'PATCH' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(5000),
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(row ? { version: version + 1, data: next } : { owner_id: c.owner, version: 1, data: next }),
    });
    if (write.status === 409) continue;
    if (!write.ok) throw new RemoteError('Could not save cloud data. Local reviews are still safe.');
    const saved = await write.json() as Row[];
    if (saved.length) return { version: version + 1, state: next, timeZone: c.timeZone };
  }
  throw new RemoteError('Cloud data changed during sync. Please retry.', 409);
}
export function errorResponse(error: unknown) {
  return json({ error: error instanceof RemoteError ? error.message : 'Cloud service is unavailable. Your local data is safe.' }, error instanceof RemoteError ? error.status : 503);
}
