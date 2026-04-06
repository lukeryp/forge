/**
 * FORGE — typed data access layer.
 *
 * All Supabase queries for FORGE tables live here.
 * API routes call these functions; they never write raw Supabase queries
 * themselves. This keeps the data layer centralised and easy to audit.
 *
 * All functions accept a pre-built Supabase client so they can be called
 * from both Server Components (server client) and API routes (server client).
 * The RLS on the DB enforces access control — we don't duplicate that logic here,
 * but callers are responsible for passing the right client (anon vs service).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ForgeSession,
  ForgeDrillScore,
  ForgeSessionWithDrills,
  ForgeHistoryPoint,
  CreateSessionInput,
  UpdateSessionInput,
} from './schemas';
import type { ForgeDrillType, ForgeGameType } from './constants';
import { FORGE_HISTORY_LIMIT } from './constants';
import {
  computeSkillIndex,
  computeRypIndex,
  drillTypeToIndexColumn,
} from './scoring';

// ── Sessions ───────────────────────────────────────────────────────────────────

/**
 * List a player's FORGE sessions, most recent first.
 * Supports cursor-based pagination via `before_created_at`.
 */
export async function listForgeSessions(
  supabase: SupabaseClient,
  playerId: string,
  options: {
    limit:             number;
    before_created_at?: string; // cursor: ISO timestamptz
    includeInProgress?: boolean;
  },
): Promise<{ sessions: ForgeSession[]; hasMore: boolean }> {
  let query = supabase
    .from('forge_sessions')
    .select('*')
    .eq('player_id', playerId)
    .order('session_date', { ascending: false })
    .order('created_at',   { ascending: false })
    .limit(options.limit + 1); // fetch one extra to know if there are more

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

/**
 * List sessions for all players in a club (coach / admin view).
 * RLS ensures callers can only see their own club's data.
 */
export async function listForgeSessionsByClub(
  supabase: SupabaseClient,
  clubId: string,
  options: {
    limit:             number;
    playerId?:         string; // filter to one player
    before_created_at?: string;
  },
): Promise<{ sessions: ForgeSession[]; hasMore: boolean }> {
  let query = supabase
    .from('forge_sessions')
    .select('*')
    .eq('club_id', clubId)
    .order('session_date', { ascending: false })
    .order('created_at',   { ascending: false })
    .limit(options.limit + 1);

  if (options.playerId)         query = query.eq('player_id', options.playerId);
  if (options.before_created_at) query = query.lt('created_at', options.before_created_at);

  const { data, error } = await query;
  if (error) throw error;

  const sessions = (data ?? []) as ForgeSession[];
  const hasMore  = sessions.length > options.limit;
  return {
    sessions: hasMore ? sessions.slice(0, options.limit) : sessions,
    hasMore,
  };
}

/** Fetch a single session by id. Returns null if not found. */
export async function getForgeSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ForgeSession | null> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }
  return data as ForgeSession;
}

/** Fetch a session with its drill scores eagerly loaded. */
export async function getForgeSessionWithDrills(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ForgeSessionWithDrills | null> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .select('*, forge_drill_scores(*)')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as ForgeSessionWithDrills;
}

/** Create a new FORGE session. Returns the created row. */
export async function createForgeSession(
  supabase: SupabaseClient,
  input: CreateSessionInput,
  clubId: string,
): Promise<ForgeSession> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .insert({
      player_id:    input.player_id,
      club_id:      clubId,
      session_date: input.session_date,
      notes:        input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ForgeSession;
}

/** Update session notes or mark it complete. Returns the updated row. */
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

/** Delete a session (cascades to drill scores via FK). */
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

// ── Drill scores ───────────────────────────────────────────────────────────────

/** Fetch all drill scores for a session. */
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

/** Fetch a single drill score by id. Returns null if not found. */
export async function getDrillScore(
  supabase: SupabaseClient,
  drillScoreId: string,
): Promise<ForgeDrillScore | null> {
  const { data, error } = await supabase
    .from('forge_drill_scores')
    .select('*')
    .eq('id', drillScoreId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as ForgeDrillScore;
}

/**
 * Upsert a drill score for a session.
 *
 * If a drill of this type already exists for the session, it's replaced
 * (the UNIQUE constraint on (session_id, drill_type) is used for conflict
 * resolution). After writing the drill, this function recomputes and
 * writes the session's denormalised index columns (including ryp_index).
 *
 * Returns the upserted drill score row.
 */
export async function upsertDrillScore(
  supabase: SupabaseClient,
  sessionId: string,
  playerId:  string,
  clubId:    string,
  drillType: ForgeDrillType,
  gameType:  ForgeGameType,
  rawInputs: Record<string, unknown>,
  notes:     string | null,
): Promise<ForgeDrillScore> {
  // Compute the normalised skill index from the raw inputs
  const skillIndex = computeSkillIndex(gameType, rawInputs);

  const { data: drillData, error: drillError } = await supabase
    .from('forge_drill_scores')
    .upsert(
      {
        session_id:  sessionId,
        player_id:   playerId,
        club_id:     clubId,
        drill_type:  drillType,
        game_type:   gameType,
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

  // Re-fetch all drill scores for this session to recompute the composite index
  await recomputeSessionIndexes(supabase, sessionId);

  return drillData as ForgeDrillScore;
}

/**
 * Delete a drill score. Re-computes session indexes after deletion.
 * The session's pillar column for this drill type is set to null.
 */
export async function deleteDrillScore(
  supabase: SupabaseClient,
  drillScoreId: string,
  sessionId:    string,
): Promise<void> {
  const { error } = await supabase
    .from('forge_drill_scores')
    .delete()
    .eq('id', drillScoreId);

  if (error) throw error;

  await recomputeSessionIndexes(supabase, sessionId);
}

// ── Session index recomputation ───────────────────────────────────────────────

/**
 * Recompute the denormalised pillar indexes and ryp_index on a session.
 *
 * Called after every drill score write/delete so that list queries
 * don't need to aggregate drill scores at read time.
 *
 * This is the only place in the app that writes index columns —
 * do not write them directly from API routes.
 */
async function recomputeSessionIndexes(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  // Fetch current drill scores for this session
  const drills = await listDrillScoresForSession(supabase, sessionId);

  // Build a map of drill_type → skill_index
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

// ── History ────────────────────────────────────────────────────────────────────

/**
 * Fetch historical session data for chart rendering.
 * Returns slim rows (date + index columns only) sorted oldest → newest.
 * Only returns completed sessions.
 */
export async function getForgeHistory(
  supabase: SupabaseClient,
  playerId:  string,
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
    .eq('player_id', playerId)
    .not('completed_at', 'is', null)
    .order('session_date', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Return oldest → newest so charts render left-to-right chronologically
  const rows = ((data ?? []) as ForgeHistoryPoint[]).reverse();
  return rows;
}

/**
 * Fetch the most recent completed skill_index for a specific drill type.
 * Used to show the "previous session" baseline on drill score forms.
 */
export async function getLastDrillIndex(
  supabase: SupabaseClient,
  playerId:  string,
  drillType: ForgeDrillType,
): Promise<number | null> {
  const column = drillTypeToIndexColumn(drillType);

  const { data, error } = await supabase
    .from('forge_sessions')
    .select(column)
    .eq('player_id', playerId)
    .not('completed_at', 'is', null)
    .not(column, 'is', null)
    .order('session_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return (data as Record<string, number | null>)[column] ?? null;
}

/**
 * Fetch the player's personal best for each pillar and overall ryp_index.
 * Scans all completed sessions. Used in the FORGE dashboard.
 */
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
  playerId: string,
): Promise<PersonalBests> {
  const { data, error } = await supabase
    .from('forge_sessions')
    .select('driving_index, approach_index, chipping_index, putting_index, ryp_index')
    .eq('player_id', playerId)
    .not('completed_at', 'is', null);

  if (error) throw error;

  const sessions = (data ?? []) as Pick<
    ForgeSession,
    'driving_index' | 'approach_index' | 'chipping_index' | 'putting_index' | 'ryp_index'
  >[];

  function maxOrNull(vals: (number | null)[]): number | null {
    const nonNull = vals.filter((v): v is number => v !== null);
    return nonNull.length ? Math.max(...nonNull) : null;
  }

  return {
    driving_index_best:  maxOrNull(sessions.map((s) => s.driving_index)),
    approach_index_best: maxOrNull(sessions.map((s) => s.approach_index)),
    chipping_index_best: maxOrNull(sessions.map((s) => s.chipping_index)),
    putting_index_best:  maxOrNull(sessions.map((s) => s.putting_index)),
    ryp_index_best:      maxOrNull(sessions.map((s) => s.ryp_index)),
    sessions_total:      sessions.length,
  };
}
