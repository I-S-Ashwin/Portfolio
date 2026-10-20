import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { AdminLogout } from '@/components/admin/logout';
import { ADMIN_SECTIONS } from '@/lib/admin/content-config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin — Portfolio', robots: { index: false, follow: false, noarchive: true } };

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const adminContext = await requireAdmin();
  return <div className="admin-shell">
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <Link href="/admin" className="admin-brand"><span className="admin-brand-mark">P</span><span>Portfolio<span className="admin-brand-sub">CONTENT STUDIO</span></span></Link>
      <nav className="admin-nav">
        <Link href="/admin" className="admin-nav-link">Overview</Link>
        <p className="admin-nav-heading">Manage</p>
        {Object.entries(ADMIN_SECTIONS).map(([key, section]) => <Link key={key} href={`/admin/${key}`} className="admin-nav-link">{section.label}</Link>)}
        <Link href="/admin/messages" className="admin-nav-link">Messages</Link>
      </nav>
      <div className="admin-sidebar-bottom"><span className="admin-user">{adminContext.user.email ?? 'Administrator'}</span><AdminLogout /></div>
    </aside>
    <div className="admin-main" id="admin-main"><div className="admin-mobilebar"><Link href="/admin">Portfolio / Admin</Link><AdminLogout /></div>{children}</div>
  </div>;
}
