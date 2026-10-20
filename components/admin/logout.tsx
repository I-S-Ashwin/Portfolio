'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export function AdminLogout() {
  const [busy, setBusy] = useState(false); const router = useRouter();
  async function logout() {
    setBusy(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (url && key) await createBrowserClient(url, key).auth.signOut();
      router.replace('/admin/login'); router.refresh();
    } finally { setBusy(false); }
  }
  return <button type="button" onClick={logout} disabled={busy} className="admin-button">{busy ? 'Signing out…' : 'Sign out'}</button>;
}
