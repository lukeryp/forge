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
    if (!parsed.success) return Errors.unprocessable(parsed.error.flatten());

    const { drill_type, limit } = parsed.data;
    const supabase = await createClient();

    const [history, bests] = await Promise.all([
      getForgeHistory(supabase, auth.userId, { drillType: drill_type, limit }),
      getPersonalBests(supabase, auth.userId),
    ]);

    logRequest(req, 200, Date.now() - start);
    return apiSuccess({ history, personal_bests: bests });
  } catch (err) {
    console.error('[GET /api/forge/history]', err);
    logRequest(req, 500, Date.now() - start);
    return Errors.internal();
  }
}
