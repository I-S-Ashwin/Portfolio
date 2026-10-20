import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/supabase/admin-auth';
import { AdminLoginForm } from '@/components/admin/login-form';
import { AdminLogout } from '@/components/admin/logout';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Administrator sign in — Portfolio', robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const context = await getAdminContext();
  if (context.user && context.isAdmin) redirect('/admin');
  const error = searchParams.error === 'unauthorized' ? 'This account is not authorized to access the administrator dashboard.' : searchParams.error === 'configuration' || context.configurationError ? 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before signing in.' : undefined;
  return <div className="admin-login-wrap"><section className="admin-panel admin-login" aria-labelledby="login-title">
    <p className="admin-eyebrow">Private area</p><h1 className="admin-title" id="login-title">Administrator sign in</h1>
    <p className="admin-description">Sign in with the administrator account provisioned through Supabase Auth.</p>
    {context.user&&!context.isAdmin&&<div className="mt-4 flex items-center justify-between gap-3"><span className="admin-hint">Signed in as a non-admin account.</span><AdminLogout/></div>}
    <div className="mt-6"><AdminLoginForm initialError={error} /></div>
    <p className="admin-hint mt-5">Account registration is disabled in this interface. Ask the database owner to provision an administrator identity.</p>
  </section></div>;
}
