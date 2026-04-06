/**
 * API middleware utilities:
 * - Request logging
 * - Authentication check
 * - Rate limiting (in-memory, single-instance — use Redis for multi-instance prod)
 * - Standard error responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

// ── Standard API responses ────────────────────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) }, { status });
}

export function apiError(
  message: string,
  status: number,
  code?: string,
  details?: unknown,
) {
  const body: Record<string, unknown> = { error: message };
  if (code) body['code'] = code;
  if (details !== undefined) body['details'] = details;
  return NextResponse.json(body, { status });
}

export const Errors = {
  unauthorized:    () => apiError('Unauthorized', 401, 'UNAUTHORIZED'),
  forbidden:       () => apiError('Forbidden', 403, 'FORBIDDEN'),
  notFound:        (res = 'Resource') => apiError(`${res} not found`, 404, 'NOT_FOUND'),
  badRequest:      (msg: string, details?: unknown) => apiError(msg, 400, 'BAD_REQUEST', details),
  conflict:        (msg: string) => apiError(msg, 409, 'CONFLICT'),
  tooManyRequests: () => apiError('Too many requests', 429, 'RATE_LIMITED'),
  internal:        (msg = 'Internal server error') => apiError(msg, 500, 'INTERNAL_ERROR'),
  unprocessable:   (details: unknown) => apiError('Validation failed', 422, 'VALIDATION_ERROR', details),
} as const;

// ── Request logging ───────────────────────────────────────────────────────────

export function logRequest(req: NextRequest, status: number, durationMs: number) {
  const method = req.method;
  const path   = req.nextUrl.pathname;
  const ts     = new Date().toISOString();
  // In prod, replace with structured logger (e.g. Pino, Axiom)
  console.log(`[${ts}] ${method} ${path} → ${status} (${durationMs}ms)`);
}

// ── In-memory rate limiter ────────────────────────────────────────────────────
// For production multi-instance deploys, replace with Upstash Redis.

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitWindow>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (existing.count >= maxRequests) {
    return false; // blocked
  }

  existing.count++;
  return true; // allowed
}

// Prune stale entries every 5 minutes (prevent memory leak in long-running server)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of rateLimitStore.entries()) {
      if (now > window.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// ── Auth helper ───────────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
  clubId: string | null;
}

/**
 * Validate session and fetch user role from DB.
 * Returns null if not authenticated.
 */
export async function requireAuth(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, role, club_id')
      .eq('id', user.id)
      .is('deleted_at', null)
      .single();

    if (!dbUser) return null;

    return {
      userId: user.id,
      email: user.email ?? '',
      role: dbUser.role as UserRole,
      clubId: dbUser.club_id ?? null,
    };
  } catch {
    return null;
  }
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const PAGINATION_DEFAULTS = {
  page:     1,
  limit:    20,
  maxLimit: 100,
} as const;

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
  const limit = Math.min(
    PAGINATION_DEFAULTS.maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(PAGINATION_DEFAULTS.limit), 10)),
  );
  return { page, limit, offset: (page - 1) * limit };
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    hasNextPage: page * limit < total,
  };
}
