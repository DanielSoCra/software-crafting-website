import { createSupabaseServerClient, isUserAdmin, resolveClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveDeliverablePath, readDeliverableFile, getMimeType } from '@/lib/deliverables';
import { DELIVERABLE_TYPES } from '@/lib/types';
import type { DeliverableType } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const pathSegments = (await params).path || [];
  const deliverableType = pathSegments[0] as DeliverableType;
  const filePath = pathSegments.slice(1).join('/');

  if (!deliverableType || !DELIVERABLE_TYPES.includes(deliverableType) || !filePath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve client
  const clientParam = request.nextUrl.searchParams.get('client');
  const isAdmin = await isUserAdmin(supabase, user.id);

  const { data: client } = await resolveClient(supabase, user.id, clientParam, isAdmin);
  if (!client) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify deliverable published
  const { data: deliverable } = await supabase
    .from('deliverables').select('id').eq('client_id', client.id).eq('type', deliverableType).single();
  if (!deliverable) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Resolve and validate path
  const resolvedPath = resolveDeliverablePath(client.slug, `${deliverableType}/${filePath}`);
  if (!resolvedPath) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  const content = readDeliverableFile(client.slug, `${deliverableType}/${filePath}`);
  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const mimeType = getMimeType(filePath);
  const headers: Record<string, string> = {
    'Content-Type': mimeType,
    'X-Content-Type-Options': 'nosniff',
  };

  if (mimeType === 'text/html') {
    headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; frame-ancestors 'self'";
    headers['Cache-Control'] = 'no-store';
  } else {
    headers['Cache-Control'] = 'public, max-age=3600';
  }

  return new NextResponse(new Uint8Array(content), { headers });
}
