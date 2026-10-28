import { NextRequest } from 'next/server';
import { errorResponse, json, limitedJson, mutateSharedState, ownerSession, remoteConfig, sameOrigin, setSession, RemoteError } from '@/lib/supabase-server';
import { parseSyncInput, SelectionConflict, updateSharedState } from '@/lib/remote-state';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const session = await ownerSession(request);
    let input;
    try { input = parseSyncInput(await limitedJson(request, 1500000)); }
    catch (error) { if (error instanceof RemoteError) throw error; throw new RemoteError(error instanceof Error ? error.message : 'Invalid sync data.', 400); }
    let result;
    try { result = await mutateSharedState((state, version) => updateSharedState(state, version, input, new Date(), remoteConfig().timeZone)); }
    catch (error) {
      if (!(error instanceof SelectionConflict)) throw error;
      const latest = await mutateSharedState(state => state);
      const response = json({ ...latest, conflict: true, message: error.message }, 409);
      return session ? setSession(response, session, request) : response;
    }
    const response = json(result);
    return session ? setSession(response, session, request) : response;
  } catch (error) { return errorResponse(error); }
}
