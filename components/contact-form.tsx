'use client';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { validateContactPayload } from '@/lib/contact/validation';

declare global {
  interface Window { turnstile?: { render: (container: HTMLElement, options: Record<string, unknown>) => string; reset: (widgetId?: string) => void; remove: (widgetId?: string) => void } }
}

type ContactFormProps = { siteKey: string };
type FieldErrors = Partial<Record<'name'|'email'|'subject'|'message'|'turnstileToken', string>>;

export function ContactForm({ siteKey }: ContactFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>();
  const [captchaToken, setCaptchaToken] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { setIdempotencyKey(crypto.randomUUID()); }, []);
  const renderWidget = useCallback(() => {
    if (!window.turnstile || !widgetRef.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: siteKey,
      action: 'contact',
      theme: 'dark',
      callback: (token: string) => { setCaptchaToken(token); setFieldErrors(current => ({ ...current, turnstileToken: undefined })); },
      'expired-callback': () => setCaptchaToken(''),
      'error-callback': () => { setCaptchaToken(''); setError('Spam protection could not load. Refresh the page and try again.'); },
    });
  }, [siteKey]);

  useEffect(() => {
    renderWidget();
    return () => { if (widgetId.current) window.turnstile?.remove(widgetId.current); widgetId.current = undefined; };
  }, [renderWidget]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(''); setSuccess(''); setFieldErrors({});
    if (!captchaToken) { setFieldErrors({ turnstileToken: 'Complete the spam protection check.' }); return; }
    if (!idempotencyKey) { setError('Refresh the page and try again.'); return; }
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const validation = validateContactPayload({
      name: data.get('name'), email: data.get('email'), subject: data.get('subject'), message: data.get('message'),
      company: data.get('company'), idempotencyKey, turnstileToken: captchaToken,
    });
    if (Object.keys(validation.errors).length) { setFieldErrors(validation.errors); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'), email: data.get('email'), subject: data.get('subject'), message: data.get('message'),
          company: data.get('company'), idempotencyKey, turnstileToken: captchaToken,
        }),
      });
      const result = await response.json() as { error?: string; fieldErrors?: FieldErrors; notification?: string; duplicate?: boolean };
      if (!response.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setError(result.error ?? 'Your message could not be sent. Please try again later.');
        setCaptchaToken(''); if (widgetId.current) window.turnstile?.reset(widgetId.current);
        return;
      }
      setSuccess(result.duplicate
        ? 'This message has already been received.'
        : result.notification === 'sent'
          ? 'Your message has been saved and the email notification was accepted by the provider.'
          : result.notification === 'failed'
            ? 'Your message has been saved, but the email notification could not be confirmed. It remains available in the private inbox.'
            : 'Your message has been saved. Email notifications are not configured; the message is available in the private inbox.');
      form.reset();
      setCaptchaToken(''); setIdempotencyKey(crypto.randomUUID());
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    } catch {
      setError('The contact service could not be reached. Your message was not confirmed as saved. Please try again.');
      setCaptchaToken(''); if (widgetId.current) window.turnstile?.reset(widgetId.current);
    } finally { setBusy(false); }
  }

  const fieldClass = 'w-full rounded-xl border border-line bg-[var(--surface)] px-4 py-3 text-sm text-ink placeholder:text-muted';
  const feedback = (field: keyof FieldErrors) => fieldErrors[field] ? <p id={`${field}-error`} className="mt-2 text-sm text-red-300">{fieldErrors[field]}</p> : null;

  return <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={renderWidget} onError={() => setError('Spam protection could not load. Refresh the page and try again.')}/>
    <form ref={formRef} onSubmit={submit} className="surface-card grid gap-5 p-6 sm:p-8" noValidate>
      <p className="sr-only" aria-hidden="true"><label htmlFor="company">Leave this field empty</label><input id="company" name="company" type="text" tabIndex={-1} autoComplete="off"/></p>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey}/>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="contact-name">Name</label>
        <input id="contact-name" name="name" className={fieldClass} autoComplete="name" maxLength={120} required aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'name-error' : undefined}/>{feedback('name')}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="contact-email">Email</label>
        <input id="contact-email" name="email" className={fieldClass} type="email" autoComplete="email" maxLength={320} required aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined}/>{feedback('email')}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="contact-subject">Subject</label>
        <input id="contact-subject" name="subject" className={fieldClass} maxLength={200} required aria-invalid={Boolean(fieldErrors.subject)} aria-describedby={fieldErrors.subject ? 'subject-error' : undefined}/>{feedback('subject')}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" className={fieldClass} rows={7} maxLength={10000} required aria-invalid={Boolean(fieldErrors.message)} aria-describedby={fieldErrors.message ? 'message-error' : undefined}/>{feedback('message')}
      </div>
      <div>
        <p id="spam-protection-label" className="mb-2 text-sm font-medium">Spam protection <span className="muted">(required)</span></p>
        <div ref={widgetRef} role="group" aria-labelledby="spam-protection-label"/>
        {fieldErrors.turnstileToken&&<p className="mt-2 text-sm text-red-300" role="alert">{fieldErrors.turnstileToken}</p>}
      </div>
      {error&&<p className="text-sm text-red-300" role="alert">{error}</p>}
      {success&&<p className="text-sm text-[var(--accent)]" role="status" aria-live="polite">{success}</p>}
      <button className="link-arrow w-fit rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-ink)] disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={busy||!captchaToken||!idempotencyKey}>
        {busy?'Saving…':'Send message'} <span aria-hidden="true">→</span>
      </button>
      <p className="muted text-xs leading-5">Your message is stored privately. Please don’t include sensitive credentials or confidential information.</p>
    </form>
  </>;
}
