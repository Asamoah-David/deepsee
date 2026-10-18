import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { publicEnv } from '@/lib/env';

/**
 * POST /api/enrollment/create-session
 *
 * Creates a new enrollment session for the organization.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawHours = body?.expires_in_hours ?? 24;
    if (!Number.isInteger(rawHours) || rawHours < 1 || rawHours > 168) {
      return NextResponse.json({ error: 'expires_in_hours must be an integer from 1 to 168' }, { status: 400 });
    }
    const expires_in_hours = rawHours as number;

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

    if (role !== 'owner' && role !== 'super_admin' && role !== 'admin') {
      return NextResponse.json({ error: 'insufficient permissions' }, { status: 403 });
    }

    // 128 bits of entropy protects the unauthenticated claim endpoint from
    // practical guessing; the code is still temporary and single-use.
    const code = randomBytes(16).toString('hex').toUpperCase();
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
    const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;
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
