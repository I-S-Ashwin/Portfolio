'use client';
import { useState } from 'react';

export function SafeImage({ src, alt, className = '' }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div role="img" aria-label={alt || 'Image unavailable'} className={`flex items-center justify-center bg-[radial-gradient(circle_at_70%_25%,rgba(198,243,107,.14),transparent_45%),linear-gradient(135deg,#171b1b,#0e1011)] ${className}`}><span aria-hidden="true" className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">Preview unavailable</span></div>;
  return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setFailed(true)} />;
}
