import { z } from 'zod';
import type { ForgeDrillType } from './constants';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format');

// ── Per-ball outcome arrays ───────────────────────────────────────────────────

const DrivingOutcome = z.enum(['bad_left', 'good_left', 'fairway', 'good_right', 'bad_right']);
const ApproachOutcome = z.enum(['eagle', 'birdie', 'par', 'double']);
const ChippingOutcome = z.enum(['birdie', 'par', 'bogey', 'double', 'triple']);
const PuttingOutcome  = z.enum(['make', 'par', 'miss']);

// ── Per-drill input schemas ───────────────────────────────────────────────────

export const DrivingInputSchema = z.object({
  level:            z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  gender:           z.enum(['men', 'women']),
  avg_distance_yd:  z.number().int().min(100).max(350),
  ball_outcomes:    z.array(DrivingOutcome).min(1).max(40),
  notes_per_ball:   z.array(z.string()).optional(),
});
export type DrivingInput = z.infer<typeof DrivingInputSchema>;

export const ApproachInputSchema = z.object({
  version:       z.enum(['stock', 'variable']),
  ball_outcomes: z.array(ApproachOutcome).min(1).max(40),
});
export type ApproachInput = z.infer<typeof ApproachInputSchema>;

export const ChippingInputSchema = z.object({
  level:         z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  lie:           z.enum(['fairway', 'rough', 'bunker', 'mixed']),
  ball_outcomes: z.array(ChippingOutcome).min(1).max(40),
});
export type ChippingInput = z.infer<typeof ChippingInputSchema>;

export const PuttingInputSchema = z.object({
  tier_3_outcomes: z.array(PuttingOutcome).min(1).max(40),
  tier_2_outcomes: z.array(PuttingOutcome).min(0).max(40),
  tier_1_outcomes: z.array(PuttingOutcome).min(0).max(40),
});
export type PuttingInput = z.infer<typeof PuttingInputSchema>;

// Discriminated union — one input schema per drill type.
export const DrillInputSchema = z.discriminatedUnion('drill_type', [
  z.object({ drill_type: z.literal('driving'),  inputs: DrivingInputSchema }),
  z.object({ drill_type: z.literal('approach'), inputs: ApproachInputSchema }),
  z.object({ drill_type: z.literal('chipping'), inputs: ChippingInputSchema }),
  z.object({ drill_type: z.literal('putting'),  inputs: PuttingInputSchema }),
]);
export type DrillInput = z.infer<typeof DrillInputSchema>;

// ── Session I/O ───────────────────────────────────────────────────────────────

export const CreateSessionSchema = z.object({
  session_date: isoDate,
  notes:        z.string().max(1000).optional(),
});
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

export const UpdateSessionSchema = z.object({
  notes:        z.string().max(1000).optional(),
  completed_at: z.string().datetime({ offset: true }).optional(),
});
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;

// ── Drill score write ─────────────────────────────────────────────────────────

export const CreateDrillScoreSchema = z.object({
  drill_type: z.enum(['driving', 'approach', 'chipping', 'putting']),
  raw_inputs: z.record(z.string(), z.unknown()),
  notes:      z.string().max(500).optional(),
});
export type CreateDrillScoreInput = z.infer<typeof CreateDrillScoreSchema>;

export const HistoryQuerySchema = z.object({
  drill_type: z.enum(['driving', 'approach', 'chipping', 'putting']).optional(),
  limit:      z.coerce.number().int().min(1).max(100).default(50),
});
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;

// ── DB row shapes ─────────────────────────────────────────────────────────────

export interface ForgeProfile {
  user_id:  string;
  name:     string | null;
  handicap: number | null;
}

export interface ForgeSession {
  id:             string;
  user_id:        string;
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
  user_id:     string;
  drill_type:  ForgeDrillType;
  game_type:   string; // retained for DB compatibility; app doesn't use game-level variants any more
  raw_inputs:  Record<string, unknown>;
  skill_index: number;
  notes:       string | null;
  recorded_at: string;
  created_at:  string;
  updated_at:  string;
}

export interface ForgeSessionWithDrills extends ForgeSession {
  forge_drill_scores: ForgeDrillScore[];
}

export interface ForgeHistoryPoint {
  session_date:   string;
  ryp_index:      number | null;
  driving_index:  number | null;
  approach_index: number | null;
  chipping_index: number | null;
  putting_index:  number | null;
}
