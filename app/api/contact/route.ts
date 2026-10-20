import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { getContactConfiguration } from '@/lib/contact/config';
import { handleContactSubmission, isAllowedContactOrigin } from '@/lib/contact/handler';
import type { ContactInput } from '@/lib/contact/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_SECONDS = 60 * 60;
const MAX_PER_WINDOW = 5;
const RATE_LIMIT_LUA = "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count";

async function redisEval(key: string): Promise<number> {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, '');
  const response = await fetch(`${endpoint}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['EVAL', RATE_LIMIT_LUA, '1', key, String(WINDOW_SECONDS)]]),
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error('Rate limiter unavailable');
  const result = await response.json() as Array<{ result?: number; error?: string }>;
  const count = Number(result[0]?.result);
  if (!Number.isFinite(count) || result[0]?.error) throw new Error('Rate limiter unavailable');
  return count;
}

function trustedClientAddress(request: Request) {
  // Vercel appends the connecting client address to this header. Deployments
  // behind another proxy must configure an equivalent trusted header.
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',').map(value => value.trim()).filter(Boolean).at(-1) ?? request.headers.get('x-real-ip') ?? '';
}

async function verifyTurnstile(token: string) {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
    cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Turnstile unavailable');
  const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
  const expectedHost = new URL(process.env.NEXT_PUBLIC_SITE_URL!).hostname;
  return result.success === true && result.hostname === expectedHost && result.action === 'contact';
}

export async function POST(request: Request) {
  if (!isAllowedContactOrigin(request, process.env.NEXT_PUBLIC_SITE_URL)) {
    return Response.json({ error: 'This request origin is not allowed.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const config = getContactConfiguration();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = config.ready && supabaseUrl && serviceKey
    ? createClient<Database>(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    : null;

  return handleContactSubmission(request, {
    configured: config.ready && Boolean(supabase),
    rateLimit: async req => {
      const address = trustedClientAddress(req);
      if (!address) throw new Error('Client address unavailable');
      const digest = createHmac('sha256', process.env.CONTACT_RATE_LIMIT_HMAC_SECRET!).update(address).digest('hex');
      return await redisEval(`portfolio:contact:${digest}`) <= MAX_PER_WINDOW;
    },
    verifyTurnstile: async token => verifyTurnstile(token),
    save: async (input: ContactInput) => {
      if (!supabase) throw new Error('Contact storage unavailable');
      const notificationStatus = config.notificationReady ? 'pending' : 'not_configured';
      const { data, error } = await supabase.from('contact_submissions').insert({
        name: input.name, email: input.email, subject: input.subject, message: input.message,
        idempotency_key: input.idempotencyKey, notification_status: notificationStatus,
      }).select('id').single();
      if (error?.code === '23505') return { id: '', duplicate: true };
      if (error || !data) throw new Error('Submission insert failed');
      return { id: data.id, duplicate: false };
    },
    notify: async (input: ContactInput, submissionId: string) => {
      if (!config.notificationReady || !supabase) return 'not_configured';
      let status: 'sent'|'failed' = 'failed';
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.CONTACT_NOTIFICATION_FROM,
            to: process.env.CONTACT_NOTIFICATION_TO!.split(',').map(value => value.trim()).filter(Boolean),
            reply_to: input.email,
            subject: `Portfolio contact: ${input.subject}`,
            text: `New portfolio contact submission\n\nName: ${input.name}\nEmail: ${input.email}\nSubject: ${input.subject}\n\n${input.message}`,
          }),
          cache: 'no-store', signal: AbortSignal.timeout(7000),
        });
        status = response.ok ? 'sent' : 'failed';
      } catch { status = 'failed'; }
      const { error } = await supabase.from('contact_submissions').update({ notification_status: status }).eq('id', submissionId);
      if (error) console.error('Contact notification status update failed', error.code);
      return status;
    },
  });
}
