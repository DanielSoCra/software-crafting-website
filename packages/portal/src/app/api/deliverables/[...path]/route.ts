import { requireAuth, isUserAdmin, resolveClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveDeliverablePath, readDeliverableFile, getMimeType } from '@/lib/deliverables';
import { DELIVERABLE_TYPES } from '@/lib/types';
import type { DeliverableType } from '@/lib/types';
import { apiError } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const pathSegments = (await params).path || [];
  const deliverableType = pathSegments[0] as DeliverableType;
  const filePath = pathSegments.slice(1).join('/');

  if (!deliverableType || !DELIVERABLE_TYPES.includes(deliverableType) || !filePath) {
    return apiError(404, 'NOT_FOUND', 'Not found');
  }

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  // Resolve client
  const clientParam = request.nextUrl.searchParams.get('client');
  const isAdmin = await isUserAdmin(supabase, user.id);

  const { data: client, error: clientError } = await resolveClient(supabase, user.id, clientParam, isAdmin);
  if (clientError && clientError.code !== 'PGRST116') {
    return apiError(500, 'INTERNAL_ERROR', 'Internal error');
  }
  if (!client) {
    return apiError(404, 'NOT_FOUND', 'Not found');
  }

  // Verify deliverable published
  const { data: deliverable, error: delError } = await supabase
    .from('deliverables').select('id').eq('client_id', client.id).eq('type', deliverableType).single();
  if (delError && delError.code !== 'PGRST116') {
    return apiError(500, 'INTERNAL_ERROR', 'Internal error');
  }
  if (!deliverable) {
    return apiError(404, 'NOT_FOUND', 'Not found');
  }

  // Resolve and validate path
  const resolvedPath = resolveDeliverablePath(client.slug, `${deliverableType}/${filePath}`);
  if (!resolvedPath) {
    return apiError(403, 'FORBIDDEN', 'Invalid path');
  }

  const content = readDeliverableFile(client.slug, `${deliverableType}/${filePath}`);
  if (!content) {
    return apiError(404, 'NOT_FOUND', 'Not found');
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
