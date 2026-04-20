import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess, Errors, requireAuth,
  checkRateLimit, logRequest,
} from '@/lib/api/middleware';
import { CreateSessionSchema } from '@/lib/forge/schemas';
import { listForgeSessions, createForgeSession } from '@/lib/forge/queries';
import { FORGE_RATE_LIMITS } from '@/lib/forge/constants';

const ListQuerySchema = z.object({
  limit:               z.coerce.number().int().min(1).max(50).default(20),
  before_created_at:   z.string().datetime({ offset: true }).optional(),
  include_in_progress: z.coerce.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requireAuth();
    if (!auth) return Errors.unauthorized();

    if (!checkRateLimit(
      `forge:sessions:${auth.userId}`,
      FORGE_RATE_LIMITS.sessions.maxRequests,
      FORGE_RATE_LIMITS.sessions.windowMs,
    )) {
      return Errors.tooManyRequests();
    }

    const parsed = ListQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!parsed.success) return Errors.unprocessable(parsed.error.flatten());

    const { limit, before_created_at, include_in_progress } = parsed.data;
    const supabase = await createClient();

    const { sessions, hasMore } = await listForgeSessions(supabase, auth.userId, {
      limit,
      before_created_at,
      includeInProgress: include_in_progress,
    });

    logRequest(req, 200, Date.now() - start);
    return apiSuccess(sessions, 200, { hasMore, limit });
  } catch (err) {
    console.error('[GET /api/forge/sessions]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requireAuth();
    if (!auth) return Errors.unauthorized();

    if (!checkRateLimit(
      `forge:sessions:create:${auth.userId}`,
      FORGE_RATE_LIMITS.sessions.maxRequests,
      FORGE_RATE_LIMITS.sessions.windowMs,
    )) {
      return Errors.tooManyRequests();
    }

    const body: unknown = await req.json();
    const parsed = CreateSessionSchema.safeParse(body);
    if (!parsed.success) return Errors.unprocessable(parsed.error.flatten());

    const supabase = await createClient();
    const session = await createForgeSession(supabase, auth.userId, parsed.data);

    logRequest(req, 201, Date.now() - start);
    return apiSuccess(session, 201);
  } catch (err) {
    console.error('[POST /api/forge/sessions]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}
