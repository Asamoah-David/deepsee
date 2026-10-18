import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));
  if (!code) return NextResponse.redirect(new URL('/login?auth=callback-failed', request.url));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/login?auth=callback-failed', request.url));

  return NextResponse.redirect(new URL(next, request.url));
}
