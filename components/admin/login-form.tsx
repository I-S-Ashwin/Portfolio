'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('This site is not connected to Supabase yet.');
  return createBrowserClient(url, key);
}

export function AdminLoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(initialError ?? '');
  const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setBusy(true); setError('');
    try {
      const email = String(formData.get('email') ?? '').trim();
      const password = String(formData.get('password') ?? '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 256) throw new Error('Enter a valid email and password.');
      const { error: authError } = await getClient().auth.signInWithPassword({ email, password });
      if (authError) throw new Error('Sign in failed. Check your credentials and try again.');
      const target = params.get('next');
      router.replace(target?.startsWith('/admin/') && !target.startsWith('//') && !target.includes('\\') ? target : '/admin');
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in right now.'); }
    finally { setBusy(false); }
  }
  return <form action={submit} className="admin-form" noValidate>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <label className="admin-field"><span className="admin-label">Email</span><input name="email" type="email" autoComplete="username" className="admin-input" required maxLength={320} /></label>
    <label className="admin-field"><span className="admin-label">Password</span><input name="password" type="password" autoComplete="current-password" className="admin-input" required minLength={8} maxLength={256} /></label>
    <button type="submit" className="admin-button admin-button-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}
