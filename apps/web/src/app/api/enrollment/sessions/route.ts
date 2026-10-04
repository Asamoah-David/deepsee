import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/enrollment/sessions
 *
 * Lists active enrollment sessions for the organization.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data: sessions, error } = await supabase
      .from('enrollment_sessions')
      .select(`
        id,
        code,
        created_at,
        expires_at,
        used_at,
        metadata,
        devices (name, hostname)
      `)
      .is('used_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch enrollment sessions error:', error);
      return NextResponse.json({ error: 'Failed to fetch enrollment sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    console.error('Enrollment sessions error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
