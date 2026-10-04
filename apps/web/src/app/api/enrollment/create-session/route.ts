import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/enrollment/create-session
 *
 * Creates a new enrollment session for the organization.
 *
 * §72 (enrollment link): Administrator generates enrollment link.
 * §73 (USB enrollment): Administrator creates USB enrollment package.
 * §74 (enrollment security): Enrollment code is temporary.
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

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Check if user has permission to create enrollment sessions
    const role = (membership as any).role;
    if (role !== 'owner' && role !== 'super_admin' && role !== 'admin') {
      return NextResponse.json({ error: 'insufficient permissions' }, { status: 403 });
    }

    // Call the database function to create enrollment session
    const { data: session, error: sessionError } = await supabase.rpc('create_enrollment_session', {
      p_org_id: (membership as any).org_id,
      p_created_by: user.id,
      p_expires_in_hours: expires_in_hours,
    } as any);

    if (sessionError) {
      console.error('Enrollment session creation error:', sessionError);
      return NextResponse.json({ error: 'Failed to create enrollment session' }, { status: 500 });
    }

    // Generate enrollment link
    const enrollmentLink = `${process.env.NEXT_PUBLIC_APP_URL}/enroll/${(session as any).code}`;

    return NextResponse.json({
      success: true,
      session: {
        id: (session as any).id,
        code: (session as any).code,
        expires_at: (session as any).expires_at,
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
