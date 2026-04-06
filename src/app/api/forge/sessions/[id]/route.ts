/**
 * GET    /api/forge/sessions/[id] — fetch session with drill scores
 * PATCH  /api/forge/sessions/[id] — update notes / mark complete
 * DELETE /api/forge/sessions/[id] — delete session (cascades drills)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess, Errors, requireAuth,
  checkRateLimit, logRequest,
} from '@/lib/api/middleware';
import { UpdateSessionSchema } from '@/lib/forge/schemas';
import {
  getForgeSessionWithDrills,
  updateForgeSession,
  deleteForgeSession,
} from '@/lib/forge/queries';
import { FORGE_RATE_LIMITS } from '@/lib/forge/constants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── GET /api/forge/sessions/[id] ──────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const supabase = await createClient();

    // RLS enforces access — if the session doesn't belong to the user
    // (or their club, for coaches) it won't be returned.
    const session = await getForgeSessionWithDrills(supabase, id);
    if (!session) return Errors.notFound('Session');

    logRequest(req, 200, Date.now() - start);
    return apiSuccess(session);
  } catch (err) {
    console.error('[GET /api/forge/sessions/[id]]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}

// ── PATCH /api/forge/sessions/[id] ───────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = UpdateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return Errors.unprocessable(parsed.error.flatten());
    }

    const supabase = await createClient();

    // Verify session exists and is accessible (RLS check via select)
    const existing = await getForgeSessionWithDrills(supabase, id);
    if (!existing) return Errors.notFound('Session');

    const updated = await updateForgeSession(supabase, id, parsed.data);

    logRequest(req, 200, Date.now() - start);
    return apiSuccess(updated);
  } catch (err) {
    console.error('[PATCH /api/forge/sessions/[id]]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}

// ── DELETE /api/forge/sessions/[id] ──────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const supabase = await createClient();

    // Verify session exists and caller has access before deleting
    const existing = await getForgeSessionWithDrills(supabase, id);
    if (!existing) return Errors.notFound('Session');

    await deleteForgeSession(supabase, id);

    logRequest(req, 200, Date.now() - start);
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/forge/sessions/[id]]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}
