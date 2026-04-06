/**
 * GET /api/forge/history — historical session data for chart rendering
 *
 * Returns slim rows: session_date + all pillar indexes + ryp_index,
 * sorted oldest → newest (ready for Recharts time-series charts).
 *
 * Query params:
 *   player_id  (required) — uuid
 *   drill_type (optional) — filter to a specific pillar
 *   limit      (optional) — max rows, default 50, max 100
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess, Errors, requireAuth,
  checkRateLimit, logRequest,
} from '@/lib/api/middleware';
import { HistoryQuerySchema } from '@/lib/forge/schemas';
import { getForgeHistory, getPersonalBests } from '@/lib/forge/queries';
import { FORGE_RATE_LIMITS } from '@/lib/forge/constants';

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requireAuth();
    if (!auth) return Errors.unauthorized();

    if (!checkRateLimit(
      `forge:history:${auth.userId}`,
      FORGE_RATE_LIMITS.history.maxRequests,
      FORGE_RATE_LIMITS.history.windowMs,
    )) {
      return Errors.tooManyRequests();
    }

    const parsed = HistoryQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return Errors.unprocessable(parsed.error.flatten());
    }

    const { player_id, drill_type, limit } = parsed.data;
    const supabase = await createClient();

    // Access control: players can only view their own history
    if (auth.role === 'player') {
      const { data: playerRow } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', auth.userId)
        .is('deleted_at', null)
        .single();

      if (!playerRow || playerRow.id !== player_id) {
        return Errors.forbidden();
      }
    }

    const [history, bests] = await Promise.all([
      getForgeHistory(supabase, player_id, { drillType: drill_type, limit }),
      getPersonalBests(supabase, player_id),
    ]);

    logRequest(req, 200, Date.now() - start);
    return apiSuccess({ history, personal_bests: bests });
  } catch (err) {
    console.error('[GET /api/forge/history]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}
