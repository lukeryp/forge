/**
 * GET  /api/forge/sessions/[id]/drills — list drill scores for a session
 * POST /api/forge/sessions/[id]/drills — record / replace a drill score
 *
 * There is exactly one drill score per pillar (driving, approach, chipping,
 * putting) per session. POSTing an existing drill_type replaces it via
 * the (session_id, drill_type) UNIQUE constraint.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess, Errors, requireAuth,
  checkRateLimit, logRequest,
} from '@/lib/api/middleware';
import {
  CreateDrillScoreSchema,
  GameInputSchema,
} from '@/lib/forge/schemas';
import { FORGE_GAME_CONFIGS, FORGE_RATE_LIMITS } from '@/lib/forge/constants';
import {
  getForgeSession,
  listDrillScoresForSession,
  upsertDrillScore,
} from '@/lib/forge/queries';

// ── Game-specific input schema lookup ─────────────────────────────────────────
// We validate raw_inputs against the correct per-game Zod schema by wrapping
// them in the discriminated union GameInputSchema.

function validateGameInputs(
  gameType: string,
  rawInputs: Record<string, unknown>,
): { success: true; data: Record<string, unknown> } | { success: false; error: unknown } {
  const result = GameInputSchema.safeParse({ game_type: gameType, inputs: rawInputs });
  if (!result.success) return { success: false, error: result.error.flatten() };
  return { success: true, data: result.data.inputs as Record<string, unknown> };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── GET /api/forge/sessions/[id]/drills ───────────────────────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
  const start = Date.now();
  try {
    const auth = await requireAuth();
    if (!auth) return Errors.unauthorized();

    if (!checkRateLimit(
      `forge:drills:${auth.userId}`,
      FORGE_RATE_LIMITS.drills.maxRequests,
      FORGE_RATE_LIMITS.drills.windowMs,
    )) {
      return Errors.tooManyRequests();
    }

    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Verify session exists and caller has access
    const session = await getForgeSession(supabase, sessionId);
    if (!session) return Errors.notFound('Session');

    const drills = await listDrillScoresForSession(supabase, sessionId);

    logRequest(req, 200, Date.now() - start);
    return apiSuccess(drills);
  } catch (err) {
    console.error('[GET /api/forge/sessions/[id]/drills]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}

// ── POST /api/forge/sessions/[id]/drills ─────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  const start = Date.now();
  try {
    const auth = await requireAuth();
    if (!auth) return Errors.unauthorized();

    if (!checkRateLimit(
      `forge:drills:${auth.userId}`,
      FORGE_RATE_LIMITS.drills.maxRequests,
      FORGE_RATE_LIMITS.drills.windowMs,
    )) {
      return Errors.tooManyRequests();
    }

    const { id: sessionId } = await params;
    const body: unknown = await req.json();

    // Phase 1: validate outer shape (drill_type, game_type, raw_inputs)
    const outerParsed = CreateDrillScoreSchema.safeParse(body);
    if (!outerParsed.success) {
      return Errors.unprocessable(outerParsed.error.flatten());
    }

    const { drill_type, game_type, raw_inputs, notes } = outerParsed.data;

    // Phase 2: verify game_type maps to the correct drill_type
    const gameConfig = FORGE_GAME_CONFIGS[game_type];
    if (gameConfig.drill !== drill_type) {
      return Errors.badRequest(
        `Game "${game_type}" belongs to the "${gameConfig.drill}" drill, not "${drill_type}"`,
      );
    }

    // Phase 3: validate game-specific raw_inputs
    const inputsValidation = validateGameInputs(game_type, raw_inputs);
    if (!inputsValidation.success) {
      return Errors.unprocessable(inputsValidation.error);
    }

    const supabase = await createClient();

    // Verify session exists and is accessible
    const session = await getForgeSession(supabase, sessionId);
    if (!session) return Errors.notFound('Session');

    // Players can only score their own sessions
    if (auth.role === 'player') {
      const { data: playerRow } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', auth.userId)
        .is('deleted_at', null)
        .single();

      if (!playerRow || session.player_id !== playerRow.id) {
        return Errors.forbidden();
      }
    } else if (auth.role !== 'super_admin' && session.club_id !== auth.clubId) {
      return Errors.forbidden();
    }

    const drill = await upsertDrillScore(
      supabase,
      sessionId,
      session.player_id,
      session.club_id,
      drill_type,
      game_type,
      inputsValidation.data,
      notes ?? null,
    );

    logRequest(req, 201, Date.now() - start);
    return apiSuccess(drill, 201);
  } catch (err) {
    console.error('[POST /api/forge/sessions/[id]/drills]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}
