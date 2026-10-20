'use client';
import { Container } from '@/components/ui';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Container className="py-28"><p className="eyebrow">Content unavailable</p><h1 className="section-title mt-4">We couldn’t load this page.</h1><p className="muted mt-4 max-w-xl leading-7">The content service may be unavailable or not configured. Please try again later.</p><button onClick={() => reset()} className="mt-7 rounded-full border border-line px-5 py-3 text-sm hover:border-accent">Try again</button></Container>;
}
