import { validateContactPayload, type ContactInput, type ContactFieldErrors } from './validation';

export type ContactDependencies = {
  configured: boolean;
  rateLimit: (request: Request) => Promise<boolean>;
  verifyTurnstile: (token: string, request: Request) => Promise<boolean>;
  save: (input: ContactInput) => Promise<{ id: string; duplicate: boolean }>;
  notify: (input: ContactInput, submissionId: string) => Promise<'sent'|'not_configured'|'failed'>;
};

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '3600' } : {}) } });
}

export async function handleContactSubmission(request: Request, dependencies: ContactDependencies): Promise<Response> {
  if (!dependencies.configured) return json({ error: 'Contact submissions are not configured yet.' }, 503);
  const maxBodyBytes = 64 * 1024;
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxBodyBytes) return json({ error: 'This submission is too large.' }, 413);

  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Submit a valid contact form.' }, 400);
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > maxBodyBytes) { await reader.cancel(); return json({ error: 'This submission is too large.' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return json({ error: 'Submit a valid contact form.' }, 400); }
  const validation = validateContactPayload(payload);
  if (Object.keys(validation.errors).length) return json({ error: 'Check the highlighted fields and try again.', fieldErrors: validation.errors }, 400);
  const input = validation.value!;

  // Do not spend the sender's shared rate-limit quota on invalid or trap
  // submissions. Honeypot traffic gets the same neutral response as a normal
  // acceptance, but never reaches verification, storage, or notification.
  if (validation.spam) return json({ ok: true, notification: 'not_configured' }, 202);

  try {
    if (!await dependencies.rateLimit(request)) return json({ error: 'Too many submissions. Please wait before trying again.' }, 429);
  } catch {
    return json({ error: 'The contact service is temporarily unavailable. Please try again later.' }, 503);
  }

  let verified = false;
  try { verified = await dependencies.verifyTurnstile(input.turnstileToken, request); }
  catch { return json({ error: 'Spam protection is temporarily unavailable. Please try again later.' }, 503); }
  if (!verified) return json({ error: 'Spam protection could not verify this submission. Please retry the check.' }, 400);

  let saved: { id: string; duplicate: boolean };
  try { saved = await dependencies.save(input); }
  catch { return json({ error: 'Your message could not be saved. Please try again later.' }, 503); }
  if (saved.duplicate) return json({ ok: true, duplicate: true, notification: 'unchanged' }, 200);

  let notification: 'sent'|'not_configured'|'failed' = 'not_configured';
  try { notification = await dependencies.notify(input, saved.id); }
  catch { notification = 'failed'; }
  return json({ ok: true, notification }, 201);
}

export function isAllowedContactOrigin(request: Request, configuredSiteUrl?: string): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const requestOrigin = new URL(request.url).origin;
    const allowedOrigin = configuredSiteUrl ? new URL(configuredSiteUrl).origin : requestOrigin;
    return origin === allowedOrigin && requestOrigin === allowedOrigin;
  } catch { return false; }
}

export type { ContactFieldErrors };
