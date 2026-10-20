import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { handleContactSubmission, isAllowedContactOrigin } from '@/lib/contact/handler';
import { validateContactPayload } from '@/lib/contact/validation';

const validPayload = {
  name: 'Taylor Example', email: 'taylor@example.com', subject: 'A question', message: 'Hello there.',
  company: '', idempotencyKey: '123e4567-e89b-42d3-a456-426614174000', turnstileToken: 'valid-test-token',
};
const requestFor = (payload: unknown) => new Request('https://portfolio.example/api/contact', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://portfolio.example', 'x-forwarded-for': '192.0.2.1' },
  body: JSON.stringify(payload),
});
const deps = (overrides: Partial<Parameters<typeof handleContactSubmission>[1]> = {}) => ({
  configured: true,
  rateLimit: vi.fn(async () => true),
  verifyTurnstile: vi.fn(async () => true),
  save: vi.fn(async () => ({ id: 'submission-id', duplicate: false })),
  notify: vi.fn(async () => 'not_configured' as const),
  ...overrides,
});

describe('contact validation and intake', () => {
  it('validates required fields and rejects malformed addresses and control characters', () => {
    const result = validateContactPayload({ ...validPayload, email: 'not-an-email', subject: 'Bad\nSubject' });
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.subject).toBeTruthy();
  });

  it('rejects invalid submissions before storage', async () => {
    const dependencies = deps();
    const response = await handleContactSubmission(requestFor({ ...validPayload, email: 'broken' }), dependencies);
    expect(response.status).toBe(400);
    expect(dependencies.save).not.toHaveBeenCalled();
  });

  it('returns success only after persistence and reports unconfigured email honestly', async () => {
    const dependencies = deps();
    const response = await handleContactSubmission(requestFor(validPayload), dependencies);
    expect(response.status).toBe(201);
    expect(dependencies.save).toHaveBeenCalledOnce();
    expect((await response.json()).notification).toBe('not_configured');
  });

  it('does not store or email a honeypot submission', async () => {
    const dependencies = deps();
    const response = await handleContactSubmission(requestFor({ ...validPayload, company: 'bot value' }), dependencies);
    expect(response.status).toBe(202);
    expect(dependencies.rateLimit).not.toHaveBeenCalled();
    expect(dependencies.save).not.toHaveBeenCalled();
    expect(dependencies.notify).not.toHaveBeenCalled();
  });

  it('rejects invalid input before using rate-limit capacity', async () => {
    const dependencies = deps();
    const response = await handleContactSubmission(requestFor({ ...validPayload, email: 'broken' }), dependencies);
    expect(response.status).toBe(400);
    expect(dependencies.rateLimit).not.toHaveBeenCalled();
  });

  it('enforces rate limits and server-verified spam tokens', async () => {
    const limited = deps({ rateLimit: vi.fn(async () => false) });
    expect((await handleContactSubmission(requestFor(validPayload), limited)).status).toBe(429);
    expect(limited.save).not.toHaveBeenCalled();
    const rejected = deps({ verifyTurnstile: vi.fn(async () => false) });
    expect((await handleContactSubmission(requestFor(validPayload), rejected)).status).toBe(400);
    expect(rejected.save).not.toHaveBeenCalled();
  });

  it('does not re-notify an idempotent duplicate', async () => {
    const dependencies = deps({ save: vi.fn(async () => ({ id: '', duplicate: true })) });
    const response = await handleContactSubmission(requestFor(validPayload), dependencies);
    expect(response.status).toBe(200);
    expect(dependencies.notify).not.toHaveBeenCalled();
  });

  it('does not claim an external notification succeeded when it failed', async () => {
    const dependencies = deps({ notify: vi.fn(async () => 'failed' as const) });
    const response = await handleContactSubmission(requestFor(validPayload), dependencies);
    expect(response.status).toBe(201);
    expect((await response.json()).notification).toBe('failed');
  });

  it('reports notification success only when the provider adapter confirms it', async () => {
    const dependencies = deps({ notify: vi.fn(async () => 'sent' as const) });
    const response = await handleContactSubmission(requestFor(validPayload), dependencies);
    expect((await response.json()).notification).toBe('sent');
  });

  it('fails closed when required contact infrastructure is unconfigured', async () => {
    const dependencies = deps({ configured: false });
    expect((await handleContactSubmission(requestFor(validPayload), dependencies)).status).toBe(503);
    expect(dependencies.save).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests', () => {
    expect(isAllowedContactOrigin(new Request('https://portfolio.example/api/contact', { headers: { Origin: 'https://attacker.example' } }), 'https://portfolio.example')).toBe(false);
    expect(isAllowedContactOrigin(new Request('https://portfolio.example/api/contact', { headers: { Origin: 'https://portfolio.example' } }), 'https://portfolio.example')).toBe(true);
  });

  it('keeps database intake private to the server and admins', async () => {
    const migration = await readFile(path.join(process.cwd(), 'supabase/migrations/20261020201500_contact_intake_security.sql'), 'utf8');
    const schema = await readFile(path.join(process.cwd(), 'supabase/schema.sql'), 'utf8');
    expect(migration).toMatch(/revoke insert on public\.contact_submissions from anon, authenticated/i);
    expect(migration).toMatch(/drop policy if exists contact_public_submit/i);
    expect(schema).toMatch(/create policy contact_admin_read[\s\S]+?exists \(select 1 from public\.admin_users/i);
    expect(schema).not.toMatch(/create policy contact_public_submit/i);
  });
});
