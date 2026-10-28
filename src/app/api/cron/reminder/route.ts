import { Resend } from 'resend';
import { mutateSharedState, remoteConfig } from '@/lib/supabase-server';
import { calendarDay, freezeDailyEmail, updateSharedState } from '@/lib/remote-state';
import { handleReminder } from '@/lib/email-reminder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleReminder(request, process.env, async (email, idempotencyKey) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send(email, { idempotencyKey });
    return !error && Boolean(data?.id);
  }, new Date(), async now => {
    const c = remoteConfig();
    const day = calendarDay(now, c.timeZone);
    const snapshot = await mutateSharedState((state, version) => freezeDailyEmail(updateSharedState(state, version, undefined, now, c.timeZone), day));
    return snapshot.state.email?.day === day ? snapshot.state.email : { day, titles: [] };
  });
}
