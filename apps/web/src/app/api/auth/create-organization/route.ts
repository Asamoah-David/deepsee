import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Create an organization and its owner membership in one authenticated RPC. */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const name = body && typeof body === 'object'
      ? (body as Record<string, unknown>)['orgName']
      : undefined;
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Organization name must be between 2 and 100 characters' }, { status: 400 });
    }

    const slug = name.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    if (!slug) {
      return NextResponse.json({ error: 'Organization name must contain letters or numbers' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('create_organization_for_current_user', {
      p_org_name: name.trim(),
      p_slug: slug,
    });
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An organization with this name already exists' }, { status: 409 });
      }
      console.error('Organization creation failed:', error);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    const organization = Array.isArray(data) ? data[0] : null;
    if (!organization) {
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }
    return NextResponse.json({ success: true, organization }, { status: 201 });
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
