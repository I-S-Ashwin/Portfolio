import type { Metadata } from 'next';
import './globals.css';
import { SiteFooter, SiteHeader } from '@/components/site-shell';

export const metadata: Metadata = {
  title: '[Your Name] — CS Engineer & Builder',
  description: 'Portfolio of [Your Name], a computer science engineering student exploring AI, software, and research.',
  metadataBase: new URL('https://example.com'),
  openGraph: { title: '[Your Name] — CS Engineer & Builder', description: 'Portfolio of [Your Name], exploring AI, software, and research.', type: 'website', images: [{ url: '/opengraph-image' }] },
  twitter: { card: 'summary_large_image', title: '[Your Name] — CS Engineer & Builder', description: 'Portfolio of [Your Name], exploring AI, software, and research.' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-3 focus:text-paper" href="#main">Skip to content</a><SiteHeader /><main id="main">{children}</main><SiteFooter /></body></html>;
}
