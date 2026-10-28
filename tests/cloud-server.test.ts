import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { limitedJson, mutateSharedState, ownerSession, remoteConfig, sameOrigin, setSession, signIn } from '../src/lib/supabase-server';
import { emptySharedState } from '../src/lib/remote-state';

const env = { SYNC_ENABLED: 'true', SUPABASE_URL: 'https://test-project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'fake-public-key', SUPABASE_SECRET_KEY: 'fake-service-key', SYNC_OWNER_ID: '11111111-1111-4111-8111-111111111111' };
test('signed-out and non-owner sessions cannot access sync; owner login succeeds', async t => {
  await assert.rejects(() => ownerSession(new NextRequest('https://recall.example.com/api/sync'), env), /Sign in/);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 'not-the-owner', user: { id: 'not-the-owner' }, access_token: 'fake', refresh_token: 'fake' }));
  const request = new NextRequest('https://recall.example.com/api/sync', { headers: { Cookie: 'recall-access=fake' } });
  await assert.rejects(() => ownerSession(request, env), /configured owner/);
  await assert.rejects(() => signIn('other@example.com', 'test-password', env), /configured owner/);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ user: { id: env.SYNC_OWNER_ID }, access_token: 'fake', refresh_token: 'fake' }));
  assert.equal((await signIn('owner@example.com', 'test-password', env)).user.id, env.SYNC_OWNER_ID);
});
test('cloud configuration and mutation origin/body protections fail closed', async () => {
  assert.throws(() => remoteConfig({}));
  assert.throws(() => remoteConfig({ ...env, SUPABASE_URL: 'https://attacker.example.com' }));
  assert.throws(() => sameOrigin(new Request('https://recall.example.com/api/sync', { headers: { Origin: 'https://attacker.example.com', 'Content-Type': 'application/json' } })));
  await assert.rejects(() => limitedJson(new Request('https://recall.example.com', { method: 'POST', body: 'x'.repeat(100) }), 20));
  const response = setSession(new (await import('next/server')).NextResponse(), { access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600, user: { id: env.SYNC_OWNER_ID } }, new NextRequest('https://recall.example.com/api/account'));
  const cookies = response.headers.get('set-cookie')!;
  assert.ok(cookies.includes('HttpOnly')); assert.ok(cookies.includes('Secure')); assert.ok(cookies.toLowerCase().includes('samesite=strict'));
});

test('conditional cloud updates retry a concurrent writer and return the committed revision', async t => {
  let reads = 0, writes = 0;
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal((options.headers as Record<string, string>).apikey, env.SUPABASE_SECRET_KEY);
    if (!options.method) { reads++; return Response.json([{ version: reads, data: emptySharedState() }]); }
    writes++;
    if (writes === 1) return Response.json([]); // Another request won the version comparison.
    assert.ok(url.includes('version=eq.2'));
    return Response.json([{ version: 3 }]);
  });
  const result = await mutateSharedState(state => ({ ...state, target: 4 }), env);
  assert.equal(result.version, 3); assert.equal(result.state.target, 4);
  assert.equal(writes, 2); assert.equal(reads, 2);
});
