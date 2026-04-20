import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ForgeSession,
  ForgeDrillScore,
  ForgeSessionWithDrills,
  ForgeHistoryPoint,
  ForgeProfile,
  CreateSessionInput,
  UpdateSessionInput,
} from './schemas';
import type { ForgeDrillType } from './constants';
import { FORGE_HISTORY_LIMIT } from './constants';
import { computeSkillIndex, computeRypIndex, drillTypeToIndexColumn } from './scoring';

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getForgeProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ForgeProfile | null> {
  const { data, error } = await supabase
    .from('forge_profiles')
    .select('user_id, name, handicap')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as ForgeProfile | null) ?? null;
}

export async function ensureForgeProfile(
  supabase: SupabaseClient,
  userId: string,
  emailFallback?: string,
): Promise<ForgeProfile> {
  const existing = await getForgeProfile(supabase, userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('forge_profiles')
    .insert({
      user_id: userId,
      name:    emailFallback?.split('@')[0] ?? null,
    })
    .select('user_id, name, handicap')
    .single();

  if (error) throw error;
  return data as ForgeProfile;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function listForgeSessions(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit:              number;
    before_created_at?: string;
    includeInProgress?: boolean;
  },
): Promise<{ sessions: ForgeSession[]; hasMore: boolean }> {
  let query = supabase
    .from('forge_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .order('created_at',   { ascending: false })
    .limit(options.limit + 1);

  if (options.before_created_at) {
    query = query.lt('created_at', options.before_created_at);
  }
  if (!options.includeInProgress) {
    query = query.not('completed_at', 'is', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const sessions = (data ?? []) as ForgeSession[];
  const hasMore  = sessions.length > options.limit;
  return {
    sessions: hasMore ? sessions.slice(0, options.limit) : sessions,
    hasMore,
  };
}

export async function getForgeSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ForgeSession | null> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw error;
  return (data as ForgeSession | null) ?? null;
}

export async function getForgeSessionWithDrills(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ForgeSessionWithDrills | null> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .select('*, forge_drill_scores(*)')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw error;
  return (data as ForgeSessionWithDrills | null) ?? null;
}

export async function createForgeSession(
  supabase: SupabaseClient,
  userId: string,
  input: CreateSessionInput,
): Promise<ForgeSession> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .insert({
      user_id:      userId,
      session_date: input.session_date,
      notes:        input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ForgeSession;
}

export async function updateForgeSession(
  supabase: SupabaseClient,
  sessionId: string,
  input: UpdateSessionInput,
): Promise<ForgeSession> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .update({
      notes:        input.notes,
      completed_at: input.completed_at ?? null,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as ForgeSession;
}

export async function deleteForgeSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('forge_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

// ── Drill scores ──────────────────────────────────────────────────────────────

export async function listDrillScoresForSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ForgeDrillScore[]> {
  const { data, error } = await supabase
    .from('forge_drill_scores')
    .select('*')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ForgeDrillScore[];
}

export async function upsertDrillScore(
  supabase: SupabaseClient,
  sessionId: string,
  userId:    string,
  drillType: ForgeDrillType,
  rawInputs: Record<string, unknown>,
  notes:     string | null,
): Promise<ForgeDrillScore> {
  const skillIndex = computeSkillIndex(drillType, rawInputs);

  const { data: drillData, error: drillError } = await supabase
    .from('forge_drill_scores')
    .upsert(
      {
        session_id:  sessionId,
        user_id:     userId,
        drill_type:  drillType,
        game_type:   null,
        raw_inputs:  rawInputs,
        skill_index: skillIndex,
        notes,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,drill_type' },
    )
    .select()
    .single();

  if (drillError) throw drillError;

  await recomputeSessionIndexes(supabase, sessionId);
  return drillData as ForgeDrillScore;
}

async function recomputeSessionIndexes(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  const drills = await listDrillScoresForSession(supabase, sessionId);

  const byDrillType: Record<string, number> = {};
  for (const drill of drills) {
    byDrillType[drill.drill_type] = drill.skill_index;
  }

  const pillars = {
    driving_index:  byDrillType['driving']  ?? null,
    approach_index: byDrillType['approach'] ?? null,
    chipping_index: byDrillType['chipping'] ?? null,
    putting_index:  byDrillType['putting']  ?? null,
  };

  const rypResult = computeRypIndex(pillars);

  const { error } = await supabase
    .from('forge_sessions')
    .update({
      ...pillars,
      ryp_index: rypResult?.ryp_index ?? null,
    })
    .eq('id', sessionId);

  if (error) throw error;
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getForgeHistory(
  supabase: SupabaseClient,
  userId:   string,
  options: {
    drillType?: ForgeDrillType;
    limit?:     number;
  } = {},
): Promise<ForgeHistoryPoint[]> {
  const limit = options.limit ?? FORGE_HISTORY_LIMIT;

  const { data, error } = await supabase
    .from('forge_sessions')
    .select(
      'session_date, ryp_index, driving_index, approach_index, chipping_index, putting_index',
    )
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('session_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as ForgeHistoryPoint[]).reverse();
}

export async function getLastDrillIndex(
  supabase: SupabaseClient,
  userId:    string,
  drillType: ForgeDrillType,
): Promise<number | null> {
  const column = drillTypeToIndexColumn(drillType);

  const { data, error } = await supabase
    .from('forge_sessions')
    .select(column)
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .not(column, 'is', null)
    .order('session_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return ((data as Record<string, number | null> | null) ?? {})[column] ?? null;
}

// Personal bests: lower is better in the new system.
export interface PersonalBests {
  driving_index_best:  number | null;
  approach_index_best: number | null;
  chipping_index_best: number | null;
  putting_index_best:  number | null;
  ryp_index_best:      number | null;
  sessions_total:      number;
}

export async function getPersonalBests(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalBests> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .select('driving_index, approach_index, chipping_index, putting_index, ryp_index')
    .eq('user_id', userId)
    .not('completed_at', 'is', null);

  if (error) throw error;

  const sessions = (data ?? []) as Pick<
    ForgeSession,
    'driving_index' | 'approach_index' | 'chipping_index' | 'putting_index' | 'ryp_index'
  >[];

  function minOrNull(vals: (number | null)[]): number | null {
    const nonNull = vals.filter((v): v is number => v !== null);
    return nonNull.length ? Math.min(...nonNull) : null;
  }

  return {
    driving_index_best:  minOrNull(sessions.map((s) => s.driving_index)),
    approach_index_best: minOrNull(sessions.map((s) => s.approach_index)),
    chipping_index_best: minOrNull(sessions.map((s) => s.chipping_index)),
    putting_index_best:  minOrNull(sessions.map((s) => s.putting_index)),
    ryp_index_best:      minOrNull(sessions.map((s) => s.ryp_index)),
    sessions_total:      sessions.length,
  };
}
