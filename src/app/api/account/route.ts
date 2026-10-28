import { NextRequest } from 'next/server';
import { authCall, errorResponse, json, limitedJson, ownerSession, sameOrigin, setSession, signIn, RemoteError } from '@/lib/supabase-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  if (process.env.SYNC_ENABLED !== 'true') return json({ enabled: false, signedIn: false });
  try { const session = await ownerSession(request); const result = json({ enabled: true, signedIn: true }); return session ? setSession(result, session, request) : result; }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const data = await limitedJson(request, 4096);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new RemoteError('Enter email and password.', 400);
    const { email, password } = data;
    return setSession(json({ signedIn: true }), await signIn(email, password), request);
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: NextRequest) {
  try {
    sameOrigin(request);
    const access = request.cookies.get('recall-access')?.value;
    if (access) await authCall('logout?scope=local', {}, access).catch(() => undefined);
    return setSession(json({ signedIn: false }), null, request);
  } catch (error) { return errorResponse(error); }
}
