import type { NextRequest } from 'next/server';
import { refreshSupabaseSession } from '@/lib/supabase/session-middleware';

export function middleware(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
