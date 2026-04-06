/**
 * GET  /api/forge/sessions — list player's FORGE sessions (cursor-paginated)
 * POST /api/forge/sessions — create a new FORGE session
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess, Errors, requireAuth,
  checkRateLimit, logRequest,
} from '@/lib/api/middleware';
import { CreateSessionSchema } from '@/lib/forge/schemas';
import {
  listForgeSessions,
  listForgeSessionsByClub,
  createForgeSession,
} from '@/lib/forge/queries';
import { FORGE_RATE_LIMITS } from '@/lib/forge/constants';

// ── GET /api/forge/sessions ───────────────────────────────────────────────────

const ListQuerySchema = z.object({
  player_id:          z.string().uuid().optional(),
  limit:              z.coerce.number().int().min(1).max(50).default(20),
  before_created_at:  z.string().datetime({ offset: true }).optional(),
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
    if (!parsed.success) {
      return Errors.unprocessable(parsed.error.flatten());
    }

    const { player_id, limit, before_created_at, include_in_progress } = parsed.data;
    const supabase = await createClient();

    if (auth.role === 'player') {
      // Players can only see their own sessions.
      // Resolve the player_id from the authenticated user.
      const { data: playerRow } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', auth.userId)
        .is('deleted_at', null)
        .single();

      if (!playerRow) return Errors.notFound('Player profile');

      const { sessions, hasMore } = await listForgeSessions(
        supabase,
        playerRow.id,
        { limit, before_created_at, includeInProgress: include_in_progress },
      );

      logRequest(req, 200, Date.now() - start);
      return apiSuccess(sessions, 200, { hasMore, limit });
    }

    // Coaches / admins: list by club, optionally filtered by player
    if (!auth.clubId) return Errors.forbidden();

    const { sessions, hasMore } = await listForgeSessionsByClub(
      supabase,
      auth.clubId,
      { limit, playerId: player_id, before_created_at },
    );

    logRequest(req, 200, Date.now() - start);
    return apiSuccess(sessions, 200, { hasMore, limit });
  } catch (err) {
    console.error('[GET /api/forge/sessions]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}

// ── POST /api/forge/sessions ──────────────────────────────────────────────────

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
    if (!parsed.success) {
      return Errors.unprocessable(parsed.error.flatten());
    }

    const { data } = parsed;
    const supabase = await createClient();

    // Verify the target player exists and auth user has access
    const { data: player } = await supabase
      .from('players')
      .select('id, club_id, user_id')
      .eq('id', data.player_id)
      .is('deleted_at', null)
      .single();

    if (!player) return Errors.notFound('Player');

    // Players can only create sessions for themselves
    if (auth.role === 'player' && player.user_id !== auth.userId) {
      return Errors.forbidden();
    }

    // Coaches/admins must be in the same club
    if (auth.role !== 'super_admin' && auth.clubId !== player.club_id) {
      return Errors.forbidden();
    }

    const session = await createForgeSession(supabase, data, player.club_id);

    logRequest(req, 201, Date.now() - start);
    return apiSuccess(session, 201);
  } catch (err) {
    console.error('[POST /api/forge/sessions]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}
