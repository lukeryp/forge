import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  console.log(`[${ts}] ${method} ${path} → ${status} (${durationMs}ms)`);
}

// ── In-memory rate limiter ────────────────────────────────────────────────────

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
    return true;
  }
  if (existing.count >= maxRequests) {
    return false;
  }
  existing.count++;
  return true;
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of rateLimitStore.entries()) {
      if (now > window.resetAt) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

// ── Auth helper ───────────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  email:  string;
}

export async function requireAuth(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { userId: user.id, email: user.email ?? '' };
  } catch {
    return null;
  }
}
