import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/create-organization
 *
 * Creates a new organization and grants the creating user owner access.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgName } = body;

    if (!orgName) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const env = serverEnv();

    // Get the current authenticated user
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('Creating organization for authenticated user:', user.id);

    // Use direct Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        db: { schema: 'public' },
        global: { headers: { 'x-supabase-role': 'service_role' } },
      }
    );

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An organization with this name already exists' },
        { status: 409 }
      );
    }

    // Create organization using service role (bypasses RLS)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug,
        plan: 'free',
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation database error:', orgError);
      return NextResponse.json(
        { error: orgError.message || 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Create membership for the AUTHENTICATED user (not the userId from request)
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: org.id,
        user_id: user.id, // Use the authenticated user's ID
        role: 'owner',
      });

    if (membershipError) {
      console.error('Membership creation error:', membershipError);
      // Try to clean up the organization if membership creation fails
      await supabase.from('organizations').delete().eq('id', org.id);
      return NextResponse.json(
        { error: membershipError.message || 'Failed to create membership' },
        { status: 500 }
      );
    }

    console.log('Organization and membership created successfully for user:', user.id);
    return NextResponse.json({ success: true, organization: org });
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
