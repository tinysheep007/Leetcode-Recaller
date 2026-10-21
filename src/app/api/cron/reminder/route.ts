import { Resend } from 'resend';
import { handleReminder } from '@/lib/email-reminder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  return handleReminder(request, process.env, async (email, idempotencyKey) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send(email, { idempotencyKey });
    return !error && Boolean(data?.id);
  });
}
