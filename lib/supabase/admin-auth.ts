import 'server-only';
import { redirect } from 'next/navigation';
import { createRequestSupabaseClient } from './ssr';

export async function getAdminContext() {
  let supabase: ReturnType<typeof createRequestSupabaseClient>;
  try { supabase = createRequestSupabaseClient(); }
  catch { return { supabase: null, user: null, isAdmin: false, configurationError: true } as const; }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, isAdmin: false, configurationError: false } as const;
  const { data: membership, error: membershipError } = await supabase
    .from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  return { supabase, user, isAdmin: !membershipError && Boolean(membership), configurationError: false } as const;
}

export async function requireAdmin() {
  const context = await getAdminContext();
  if (!context.supabase) redirect('/admin/login?error=configuration');
  if (!context.user) redirect('/admin/login');
  if (!context.isAdmin) redirect('/admin/login?error=unauthorized');
  return { supabase: context.supabase, user: context.user };
}
