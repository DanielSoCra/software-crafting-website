import { NextResponse } from 'next/server';

/**
 * Shared API error response shape so the client can switch on `code` rather
 * than parsing human-readable messages. Routes should pick the most specific
 * code they can; `INTERNAL_ERROR` is the fallback.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'ADMIN_ONLY'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, code }, { status });
}
