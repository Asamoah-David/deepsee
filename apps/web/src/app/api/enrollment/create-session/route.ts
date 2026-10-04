import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

/**
 * POST /api/enrollment/create-session
 *
 * Creates a new enrollment session for the organization.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expires_in_hours = 24 } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const membershipObj = membership as { org_id: string; role: string };
    const role = membershipObj.role;

    if (role !== 'owner' && role !== 'super_admin' && role !== 'admin' && role !== 'member') {
      return NextResponse.json({ error: 'insufficient permissions' }, { status: 403 });
    }

    // Generate a 8-character uppercase random code
    const code = randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + expires_in_hours * 3600 * 1000).toISOString();

    const { data: session, error: sessionError } = await supabase
      .from('enrollment_sessions')
      .insert({
        org_id: membershipObj.org_id,
        code,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Enrollment session creation error:', sessionError);
      return NextResponse.json({ error: 'Failed to create enrollment session' }, { status: 500 });
    }

    const sessionObj = session as { id: string; code: string; expires_at: string };
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const enrollmentLink = `${baseUrl}/enroll/${sessionObj.code}`;

    return NextResponse.json({
      success: true,
      session: {
        id: sessionObj.id,
        code: sessionObj.code,
        expires_at: sessionObj.expires_at,
        enrollment_link: enrollmentLink,
      },
    });
  } catch (error) {
    console.error('Create enrollment session error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
