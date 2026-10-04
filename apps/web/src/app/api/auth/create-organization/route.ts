import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';

/**
 * POST /api/auth/create-organization
 *
 * Creates a new organization and grants the creating user owner access.
 *
 * §8 (multi-tenancy): A tenant represents an independent organization/customer.
 * §9 (multiple administrators): Organization can have many administrators.
 * §86 (tenant isolation): org_id on writes always comes from server-derived values.
 *
 * This endpoint uses the service role client to bypass RLS for the initial
 * organization creation, but the trigger (005_org_creation_trigger.sql) ensures
 * the membership is created correctly.
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

    // Generate a unique slug from the organization name
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const supabase = await createAdminClient();

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

    // Create organization with the user as creator
    // The trigger will automatically create the owner membership
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug,
        plan: 'free',
        created_by: userId,
      } as any)
      .select()
      .single() as any;

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
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
