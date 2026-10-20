export type ContactInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  idempotencyKey: string;
  turnstileToken: string;
  honeypot: string;
};

export type ContactFieldErrors = Partial<Record<'name'|'email'|'subject'|'message'|'turnstileToken', string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function validateContactPayload(input: unknown): { value?: ContactInput; errors: ContactFieldErrors; spam: boolean } {
  const errors: ContactFieldErrors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: { message: 'Submit a valid contact form.' }, spam: false };
  const raw = input as Record<string, unknown>;
  const getText = (key: string) => typeof raw[key] === 'string' ? (raw[key] as string).trim() : '';
  const name = getText('name');
  const email = getText('email').toLowerCase();
  const subject = getText('subject');
  const message = getText('message');
  const idempotencyKey = getText('idempotencyKey');
  const turnstileToken = getText('turnstileToken');
  const honeypot = getText('company');

  if (!name || name.length > 120 || CONTROL_CHARS.test(name)) errors.name = 'Enter a name of up to 120 characters.';
  if (!email || email.length > 320 || !EMAIL.test(email)) errors.email = 'Enter a valid email address.';
  if (!subject || subject.length > 200 || CONTROL_CHARS.test(subject)) errors.subject = 'Enter a subject of up to 200 characters.';
  if (!message || message.length > 10000 || CONTROL_CHARS.test(message.replace(/\r?\n/g, ''))) errors.message = 'Enter a message of up to 10,000 characters.';
  if (!UUID.test(idempotencyKey)) errors.message ??= 'Refresh the page and try again.';
  if (!turnstileToken || turnstileToken.length > 2048) errors.turnstileToken = 'Complete the spam protection check.';

  if (Object.keys(errors).length) return { errors, spam: Boolean(honeypot) };
  return { value: { name, email, subject, message, idempotencyKey, turnstileToken, honeypot }, errors, spam: Boolean(honeypot) };
}
