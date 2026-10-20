import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { PageIntro } from '@/components/content-ui';
import { ContactForm } from '@/components/contact-form';
import { getContactConfiguration } from '@/lib/contact/config';

export const metadata: Metadata = {
  title: 'Contact — Portfolio',
  description: 'Send a private message about software, AI, research, or collaboration.',
};
export const dynamic = 'force-dynamic';

function profileLink(value: string | undefined, label: string) {
  if (!value || /(your[_-]|example\.com|placeholder)/i.test(value)) return null;
  try { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol)) return null; return <a key={label} className="link-arrow muted hover:text-ink" href={url.toString()} target="_blank" rel="noreferrer">{label} <span aria-hidden="true">↗</span></a>; }
  catch { return null; }
}

export default function ContactPage() {
  const config = getContactConfiguration();
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const publicEmail = email && !/(your[_-]|example\.com|placeholder)/i.test(email) ? email : undefined;
  const profiles = [profileLink(process.env.NEXT_PUBLIC_GITHUB_URL, 'GitHub'), profileLink(process.env.NEXT_PUBLIC_LINKEDIN_URL, 'LinkedIn')].filter(Boolean);
  return <Container className="py-16 sm:py-24">
    <PageIntro eyebrow="Contact / 01" title="Start a conversation." description="For collaboration, questions, or a good technical conversation, send a message below."/>
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section aria-labelledby="contact-form-title">
        <h2 id="contact-form-title" className="sr-only">Send a message</h2>
        {config.ready
          ? <ContactForm siteKey={config.turnstileSiteKey}/>
          : <div className="surface-card p-6 sm:p-8"><p className="eyebrow">Contact form unavailable</p><h2 className="mt-3 text-xl">Server setup is incomplete.</h2><p className="muted mt-3 text-sm leading-6">The form will become available after private Supabase, Turnstile, rate-limit, and site-origin settings are configured. No message has been sent or stored.</p></div>}
      </section>
      <aside className="surface-card h-fit p-6" aria-label="Contact details">
        <h2 className="text-sm font-medium">Other ways to connect</h2>
        {publicEmail&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail)
          ? <a className="link-arrow muted mt-4 block break-all text-sm hover:text-ink" href={`mailto:${encodeURIComponent(publicEmail)}`}>{publicEmail} <span aria-hidden="true">↗</span></a>
          : <p className="muted mt-4 text-sm">No public email address configured.</p>}
        {profiles.length>0&&<div className="mt-5 grid gap-3">{profiles}</div>}
        <div className="mt-8 grid gap-3 border-t border-line pt-5">
          <Link className="link-arrow muted hover:text-ink" href="/projects">Browse projects <span aria-hidden="true">→</span></Link>
          <Link className="link-arrow muted hover:text-ink" href="/about">About me <span aria-hidden="true">→</span></Link>
        </div>
      </aside>
    </div>
  </Container>;
}
