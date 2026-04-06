/**
 * FORGE — Zod schemas (single source of truth).
 *
 * All TypeScript types in this module are derived from Zod schemas
 * via z.infer. Never define types manually here — always derive them.
 *
 * Consumption:
 *   - API route handlers: parse/validate incoming request bodies
 *   - Client forms: useForm + zodResolver (react-hook-form)
 *   - Scoring engine: receives typed inputs from these schemas
 */

import { z } from 'zod';
import { SCORE_BOUNDS, FORGE_GAME_TYPES, FORGE_DRILL_TYPES } from './constants';
import type { ForgeDrillType, ForgeGameType } from './constants';

// ── Shared primitives ──────────────────────────────────────────────────────────

const uuid = z.string().uuid();

/** ISO date string: YYYY-MM-DD */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format');

// ── Game-specific raw input schemas ───────────────────────────────────────────
// Each schema validates exactly the inputs needed to compute a skill_index.
// Bounds come from SCORE_BOUNDS so that constants and schemas can't drift.

const { fairway_funnels: FF, the_gauntlet: TG,
        never_repeat: NR, nine_shot: NS, the_ladder: TL,
        up_and_down_survivor: UD, pressure_chip: PC,
        gate_drill: GD, speed_ladder: SL, the_closer: TC } = SCORE_BOUNDS;

// Driving ─────────────────────────────────────────────────────────────────────

/**
 * Fairway Funnels: 4 segments × 5 balls.
 * Widths narrow each segment (30 → 25 → 20 → 15 yd).
 * The scoring engine weights later segments higher for difficulty.
 */
export const FairwayFunnelsInputSchema = z.object({
  segment_1_hits: z.number().int().min(FF.segment_hits_min).max(FF.segment_hits_max),
  segment_2_hits: z.number().int().min(FF.segment_hits_min).max(FF.segment_hits_max),
  segment_3_hits: z.number().int().min(FF.segment_hits_min).max(FF.segment_hits_max),
  segment_4_hits: z.number().int().min(FF.segment_hits_min).max(FF.segment_hits_max),
  /** Number of resets during the session (informational, not used in scoring) */
  resets: z.number().int().min(0).default(0),
});
export type FairwayFunnelsInput = z.infer<typeof FairwayFunnelsInputSchema>;

/**
 * Cold Start: 3 first-tee drives, no warm-up.
 * Each drive is either a fairway hit (true) or miss (false).
 */
export const ColdStartInputSchema = z.object({
  drive_1_hit: z.boolean(),
  drive_2_hit: z.boolean(),
  drive_3_hit: z.boolean(),
});
export type ColdStartInput = z.infer<typeof ColdStartInputSchema>;

/**
 * The Gauntlet: 9 simulated holes, one drive each.
 * Score per hole: -1 birdie, 0 par, 1 bogey, 2 double bogey.
 */
const gauntletHoleScore = z
  .number()
  .int()
  .min(TG.hole_score_min)
  .max(TG.hole_score_max);

export const TheGauntletInputSchema = z.object({
  hole_scores: z
    .array(gauntletHoleScore)
    .length(TG.holes, `Must have exactly ${TG.holes} hole scores`),
  /** Number of restarts during the session */
  resets: z.number().int().min(0).default(0),
});
export type TheGauntletInput = z.infer<typeof TheGauntletInputSchema>;

// Approach ────────────────────────────────────────────────────────────────────

/**
 * Never-Repeat Challenge: 40 shots, never same club/target consecutively.
 * We record how many shots were completed before a reset (or 40 if clean)
 * and the average skill-index score per shot.
 * avg_score_per_shot: lower = better (like stroke average vs par)
 */
export const NeverRepeatInputSchema = z.object({
  shots_completed:      z.number().int().min(NR.shots_min).max(NR.shots_max),
  avg_score_per_shot:   z.number().min(NR.avg_score_min).max(NR.avg_score_max),
  /** Resets triggered during this session */
  resets:               z.number().int().min(0).default(0),
});
export type NeverRepeatInput = z.infer<typeof NeverRepeatInputSchema>;

/**
 * The 9-Shot: one club, nine shots across 3 trajectories × 3 shapes.
 * -1 = birdie (both shape and trajectory correct)
 *  0 = par (one of shape or trajectory correct)
 * +1 = bogey (neither correct)
 */
const nineShotScore = z
  .number()
  .int()
  .min(NS.shot_score_min)
  .max(NS.shot_score_max);

export const NineShotInputSchema = z.object({
  shot_scores: z
    .array(nineShotScore)
    .length(NS.shots, `Must have exactly ${NS.shots} shot scores`),
});
export type NineShotInput = z.infer<typeof NineShotInputSchema>;

/**
 * The Ladder: 5 ascending distance targets.
 * Record how many rungs were successfully climbed (0–5).
 */
export const TheLadderInputSchema = z.object({
  rungs_completed: z.number().int().min(TL.rungs_min).max(TL.rungs_max),
  /** Resets triggered (informational) */
  resets:          z.number().int().min(0).default(0),
});
export type TheLadderInput = z.infer<typeof TheLadderInputSchema>;

// Chipping ────────────────────────────────────────────────────────────────────

/**
 * Up-and-Down Survivor: 10 chips from varied lies.
 * Record how many successful up-and-downs were made.
 */
export const UpAndDownSurvivorInputSchema = z.object({
  made:  z.number().int().min(UD.made_min).max(UD.made_max),
  total: z.literal(10),
  /** Survival rounds needed (informational) */
  rounds_to_survive: z.number().int().min(1).default(1),
});
export type UpAndDownSurvivorInput = z.infer<typeof UpAndDownSurvivorInputSchema>;

/**
 * Pressure Chip: 10 chips from same spot.
 * Towel land + within club-length = +1; miss = -1.
 * net_points ranges -10 to +10; target = +5.
 */
export const PressureChipInputSchema = z.object({
  net_points:       z.number().int().min(PC.net_min).max(PC.net_max),
  /** Additional rounds needed for penalty sessions (informational) */
  penalty_rounds:   z.number().int().min(0).default(0),
});
export type PressureChipInput = z.infer<typeof PressureChipInputSchema>;

// Putting ─────────────────────────────────────────────────────────────────────

/**
 * Gate Drill Under Fire: 10 putts through a narrow gate.
 * 8/10 to pass; missing the gate = double failure (counts as 2 misses).
 */
export const GateDrillInputSchema = z.object({
  made:         z.number().int().min(GD.made_min).max(GD.made_max),
  gate_misses:  z.number().int().min(0).max(10),
  /** Total putts including any penalty rounds */
  total_putts:  z.number().int().min(10),
});
export type GateDrillInput = z.infer<typeof GateDrillInputSchema>;

/**
 * Speed Ladder: 5 putts at 5ft / 10ft / 15ft / 20ft / 30ft.
 * Each must finish past hole but within 3ft. Miss = reset to rung 1.
 */
export const SpeedLadderInputSchema = z.object({
  rungs_completed: z.number().int().min(SL.rungs_min).max(SL.rungs_max),
  resets:          z.number().int().min(0).default(0),
});
export type SpeedLadderInput = z.infer<typeof SpeedLadderInputSchema>;

/**
 * The Closer: 3 escalating stages.
 * Stage 1 (6ft): need 4/5. Stage 2 (8ft): need 3/5. Stage 3 (10ft): need 2/5.
 * Fail any stage = full sequence reset.
 */
export const TheCloserInputSchema = z
  .object({
    stage_1_made:       z.number().int().min(TC.stage_made_min).max(TC.stage_made_max),
    stage_2_made:       z.number().int().min(TC.stage_made_min).max(TC.stage_made_max),
    stage_3_made:       z.number().int().min(TC.stage_made_min).max(TC.stage_made_max),
    /** 0 = stopped at stage 1, 1 = stopped at stage 2, etc. */
    stages_completed:   z.number().int().min(0).max(TC.stages),
    resets:             z.number().int().min(0).default(0),
  })
  .refine(
    (d) => {
      // stage_2/3 data only meaningful if previous stage was reached
      if (d.stages_completed < 1 && d.stage_2_made > 0) return false;
      if (d.stages_completed < 2 && d.stage_3_made > 0) return false;
      return true;
    },
    {
      message: 'stage_2_made / stage_3_made must be 0 if that stage was not reached',
    },
  );
export type TheCloserInput = z.infer<typeof TheCloserInputSchema>;

// ── Discriminated union of all raw inputs ─────────────────────────────────────

export const GameInputSchema = z.discriminatedUnion('game_type', [
  z.object({ game_type: z.literal('fairway_funnels'),     inputs: FairwayFunnelsInputSchema }),
  z.object({ game_type: z.literal('cold_start'),          inputs: ColdStartInputSchema }),
  z.object({ game_type: z.literal('the_gauntlet'),        inputs: TheGauntletInputSchema }),
  z.object({ game_type: z.literal('never_repeat'),        inputs: NeverRepeatInputSchema }),
  z.object({ game_type: z.literal('nine_shot'),           inputs: NineShotInputSchema }),
  z.object({ game_type: z.literal('the_ladder'),          inputs: TheLadderInputSchema }),
  z.object({ game_type: z.literal('up_and_down_survivor'), inputs: UpAndDownSurvivorInputSchema }),
  z.object({ game_type: z.literal('pressure_chip'),       inputs: PressureChipInputSchema }),
  z.object({ game_type: z.literal('gate_drill'),          inputs: GateDrillInputSchema }),
  z.object({ game_type: z.literal('speed_ladder'),        inputs: SpeedLadderInputSchema }),
  z.object({ game_type: z.literal('the_closer'),          inputs: TheCloserInputSchema }),
]);
export type GameInput = z.infer<typeof GameInputSchema>;

// ── Session schemas ────────────────────────────────────────────────────────────

export const CreateSessionSchema = z.object({
  player_id:    uuid,
  session_date: isoDate,
  notes:        z.string().max(1000).optional(),
});
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

export const UpdateSessionSchema = z.object({
  notes:        z.string().max(1000).optional(),
  completed_at: z.string().datetime({ offset: true }).optional(),
});
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;

// ── Drill score schemas ────────────────────────────────────────────────────────

const ForgeGameTypeEnum   = z.enum(FORGE_GAME_TYPES);
const ForgeDrillTypeEnum  = z.enum(FORGE_DRILL_TYPES);

export const CreateDrillScoreSchema = z.object({
  drill_type: ForgeDrillTypeEnum,
  game_type:  ForgeGameTypeEnum,
  raw_inputs: z.record(z.string(), z.unknown()),
  notes:      z.string().max(500).optional(),
});
export type CreateDrillScoreInput = z.infer<typeof CreateDrillScoreSchema>;

export const UpdateDrillScoreSchema = z.object({
  raw_inputs: z.record(z.string(), z.unknown()),
  notes:      z.string().max(500).optional(),
});
export type UpdateDrillScoreInput = z.infer<typeof UpdateDrillScoreSchema>;

// ── History query params ───────────────────────────────────────────────────────

export const HistoryQuerySchema = z.object({
  player_id:  uuid,
  drill_type: ForgeDrillTypeEnum.optional(),
  /** Max sessions to return (default 50, max 100) */
  limit:      z.coerce.number().int().min(1).max(100).default(50),
});
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;

// ── Database row shapes (derived from what Supabase returns) ───────────────────
// These are not Zod schemas — they describe DB output. Keep aligned with migration.

export interface ForgeSession {
  id:             string;
  player_id:      string;
  club_id:        string;
  session_date:   string;
  notes:          string | null;
  completed_at:   string | null;
  driving_index:  number | null;
  approach_index: number | null;
  chipping_index: number | null;
  putting_index:  number | null;
  ryp_index:      number | null;
  created_at:     string;
  updated_at:     string;
}

export interface ForgeDrillScore {
  id:          string;
  session_id:  string;
  player_id:   string;
  club_id:     string;
  drill_type:  ForgeDrillType;
  game_type:   ForgeGameType;
  raw_inputs:  Record<string, unknown>;
  skill_index: number;
  notes:       string | null;
  recorded_at: string;
  created_at:  string;
  updated_at:  string;
}

/** Session row with its drill scores eagerly loaded */
export interface ForgeSessionWithDrills extends ForgeSession {
  forge_drill_scores: ForgeDrillScore[];
}

/** Slim session + ryp_index for history chart queries */
export interface ForgeHistoryPoint {
  session_date:   string;
  ryp_index:      number | null;
  driving_index:  number | null;
  approach_index: number | null;
  chipping_index: number | null;
  putting_index:  number | null;
}
