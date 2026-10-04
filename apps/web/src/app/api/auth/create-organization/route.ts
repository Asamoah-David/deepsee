import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/create-organization
 *
 * Creates a new organization and grants the creating user owner access.
 *
 * §8 (multi-tenancy): A tenant represents an independent organization/customer.
 * §9 (multiple administrators): Organization can have many administrators.
 * §86 (tenant isolation): org_id on writes always comes from server-derived values.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgName, userId } = body;

    if (!orgName || !userId) {
      return NextResponse.json(
        { error: 'Organization name and user ID are required' },
        { status: 400 }
      );
    }

    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const supabase = await createAdminClient();

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
      console.error('Organization creation error:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Add membership for creating user
    if (org) {
      await supabase.from('memberships').insert({
        org_id: org.id,
        user_id: userId,
        role: 'owner',
      });
    }

    return NextResponse.json({ success: true, organization: org });
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
