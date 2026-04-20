import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess, Errors, requireAuth,
  checkRateLimit, logRequest,
} from '@/lib/api/middleware';
import { CreateDrillScoreSchema, DrillInputSchema } from '@/lib/forge/schemas';
import { FORGE_RATE_LIMITS } from '@/lib/forge/constants';
import {
  getForgeSession,
  listDrillScoresForSession,
  upsertDrillScore,
} from '@/lib/forge/queries';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

    const outerParsed = CreateDrillScoreSchema.safeParse(body);
    if (!outerParsed.success) return Errors.unprocessable(outerParsed.error.flatten());

    const { drill_type, raw_inputs, notes } = outerParsed.data;

    // Validate per-drill inputs via the discriminated union.
    const inputParsed = DrillInputSchema.safeParse({
      drill_type,
      inputs: raw_inputs,
    });
    if (!inputParsed.success) return Errors.unprocessable(inputParsed.error.flatten());

    const supabase = await createClient();

    const session = await getForgeSession(supabase, sessionId);
    if (!session) return Errors.notFound('Session');
    if (session.user_id !== auth.userId) return Errors.forbidden();

    const drill = await upsertDrillScore(
      supabase,
      sessionId,
      auth.userId,
      drill_type,
      raw_inputs,
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
