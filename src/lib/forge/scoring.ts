/**
 * FORGE — Scoring engine.
 *
 * Pure functions only. No side effects, no I/O.
 * Every public function is unit-tested in __tests__/forge/scoring.test.ts.
 *
 * Normalisation convention:
 *   skill_index = 0..100 where:
 *     100 = perfect execution
 *      50 = par / expected performance
 *       0 = worst measurable result
 *
 * RYP Performance Index:
 *   Equal-weighted mean of all completed pillar indexes.
 *   Rounds to two decimal places.
 */

import type {
  FairwayFunnelsInput,
  ColdStartInput,
  TheGauntletInput,
  NeverRepeatInput,
  NineShotInput,
  TheLadderInput,
  UpAndDownSurvivorInput,
  PressureChipInput,
  GateDrillInput,
  SpeedLadderInput,
  TheCloserInput,
} from './schemas';
import type { ForgeDrillType, ForgeGameType } from './constants';

// ── Utility ────────────────────────────────────────────────────────────────────

/**
 * Clamp a value to [min, max] and round to 2 decimal places.
 * All skill_index values pass through here before being returned.
 */
function normalise(raw: number, min = 0, max = 100): number {
  const clamped = Math.min(max, Math.max(min, raw));
  return Math.round(clamped * 100) / 100;
}

// ── Driving ────────────────────────────────────────────────────────────────────

/**
 * Fairway Funnels (20 balls, 4 segments of 5).
 *
 * Design rationale:
 *   Segments narrow from 30 yd → 25 → 20 → 15 yd, so later segments are
 *   harder. We apply a progressive difficulty weight to each segment:
 *   seg 1 = 1.0×, seg 2 = 1.2×, seg 3 = 1.4×, seg 4 = 1.6×
 *   This rewards players who hold up under tightening targets.
 *
 *   perfect_weighted = 5*(1.0+1.2+1.4+1.6) = 5*5.2 = 26
 *   score = clamp(actual_weighted / 26 * 100)
 */
export function scoreFairwayFunnels(inputs: FairwayFunnelsInput): number {
  const WEIGHTS = [1.0, 1.2, 1.4, 1.6] as const;
  const PERFECT = 5 * WEIGHTS.reduce((sum, w) => sum + w, 0); // 26

  const weighted =
    inputs.segment_1_hits * WEIGHTS[0] +
    inputs.segment_2_hits * WEIGHTS[1] +
    inputs.segment_3_hits * WEIGHTS[2] +
    inputs.segment_4_hits * WEIGHTS[3];

  return normalise((weighted / PERFECT) * 100);
}

/**
 * Cold Start (3 first-tee drives, hit or miss).
 *
 * Design rationale:
 *   Simple binary hit rate. Three drives = plenty of variance, but
 *   over many sessions the trend is meaningful.
 *
 *   score = hits / 3 * 100
 */
export function scoreColdStart(inputs: ColdStartInput): number {
  const hits = [inputs.drive_1_hit, inputs.drive_2_hit, inputs.drive_3_hit].filter(Boolean).length;
  return normalise((hits / 3) * 100);
}

/**
 * The Gauntlet (9 simulated holes).
 *
 * Per-hole scoring: -1 birdie, 0 par, 1 bogey, 2 double bogey.
 * Chapter 15 par for the course = 0 (nine pars).
 *
 * Design rationale:
 *   Map total score linearly:
 *     -9 (all birdies)  → 100
 *      0 (all pars)     →  50
 *     +9 (all bogeys)   →   0
 *   Formula: score = clamp(50 + (-total * 50/9), 0, 100)
 *   Anything worse than +9 is clamped to 0.
 */
export function scoreTheGauntlet(inputs: TheGauntletInput): number {
  const total = inputs.hole_scores.reduce((sum, s) => sum + s, 0);
  return normalise(50 + (-total * (50 / 9)));
}

// ── Approach ───────────────────────────────────────────────────────────────────

/**
 * Never-Repeat Challenge (40 shots).
 *
 * Two factors:
 *   1. Completion rate: shots_completed / 40 (penalises early resets)
 *   2. Quality: avg score per shot (lower = better; 0 = par quality)
 *
 * We combine them:
 *   completion_factor = shots_completed / 40  (0..1)
 *   quality_score     = clamp(50 - avg_score_per_shot * 25, 0, 100)
 *   final             = completion_factor * quality_score
 *
 * A player who completes all 40 at avg 0 scores 50 (par).
 * Completion < 40 reduces the score proportionally — a partial session
 * cannot score higher than full completion.
 */
export function scoreNeverRepeat(inputs: NeverRepeatInput): number {
  const completionFactor = inputs.shots_completed / 40;
  const qualityScore = normalise(50 - inputs.avg_score_per_shot * 25);
  return normalise(completionFactor * qualityScore);
}

/**
 * The 9-Shot (9 shots: 3 trajectories × 3 shapes).
 *
 * Per-shot: -1 birdie (both correct), 0 par (one correct), +1 bogey (neither).
 * Total range: -9 to +9.
 *
 * Design rationale (same logic as The Gauntlet):
 *   -9 → 100, 0 → 50, +9 → 0
 *   score = clamp(50 + (-total * 50/9))
 */
export function scoreNineShot(inputs: NineShotInput): number {
  const total = inputs.shot_scores.reduce((sum, s) => sum + s, 0);
  return normalise(50 + (-total * (50 / 9)));
}

/**
 * The Ladder (5 ascending distance rungs).
 *
 * Simple: each rung = 20 points. Miss-and-reset at rung 4 scores 60.
 * This rewards getting further even without a clean completion.
 *
 *   score = rungs_completed / 5 * 100
 */
export function scoreTheLadder(inputs: TheLadderInput): number {
  return normalise((inputs.rungs_completed / 5) * 100);
}

// ── Chipping ───────────────────────────────────────────────────────────────────

/**
 * Up-and-Down Survivor (10 balls from varied lies).
 *
 *   score = made / 10 * 100
 *   6/10 (pass threshold) → 60
 *   10/10 (perfect)       → 100
 */
export function scoreUpAndDownSurvivor(inputs: UpAndDownSurvivorInput): number {
  return normalise((inputs.made / inputs.total) * 100);
}

/**
 * Pressure Chip (10 chips: towel land + close finish = +1, miss = -1).
 *
 * Net points range: -10 to +10. Target = +5 → 75 score.
 *
 * Linear map: -10 → 0, 0 → 50, +10 → 100
 *   score = (net_points + 10) / 20 * 100
 */
export function scorePressureChip(inputs: PressureChipInput): number {
  return normalise(((inputs.net_points + 10) / 20) * 100);
}

// ── Putting ────────────────────────────────────────────────────────────────────

/**
 * Gate Drill Under Fire (10 putts through narrow gate).
 *
 * Gate misses are double failures (already factored into `made`
 * by the player recording: a gate miss = a failure, and they note
 * the gate misses separately for coaching insight).
 *
 *   score = made / 10 * 100
 *   Pass threshold (8/10) → 80
 */
export function scoreGateDrill(inputs: GateDrillInput): number {
  return normalise((inputs.made / 10) * 100);
}

/**
 * Speed Ladder (5 rungs at increasing distances).
 *
 *   score = rungs_completed / 5 * 100
 */
export function scoreSpeedLadder(inputs: SpeedLadderInput): number {
  return normalise((inputs.rungs_completed / 5) * 100);
}

/**
 * The Closer (3 stages of escalating difficulty).
 *
 * Stage weights reflect increasing difficulty: 1, 2, 3.
 * We compute a weighted percentage:
 *
 *   stage_1_pct = made / 5  (max 5 putts)
 *   stage_2_pct = made / 5
 *   stage_3_pct = made / 5
 *
 *   But players only reach later stages if earlier ones passed, so
 *   we only count stages that were attempted (stages_completed caps this).
 *
 *   weighted = (s1 * 1 + s2 * 2 + s3 * 3) / (1 + 2 + 3)
 *   score = weighted * 100
 *
 * A player who completes stage 1 perfectly but no further scores:
 *   (1.0 * 1) / 6 * 100 ≈ 16.7
 * Completing all 3 stages perfectly:
 *   (1 + 2 + 3) / 6 * 100 = 100
 */
export function scoreTheCloser(inputs: TheCloserInput): number {
  const WEIGHTS = [1, 2, 3] as const;
  const MAX_WEIGHT_SUM = WEIGHTS.reduce((sum, w) => sum + w, 0); // 6

  const s1 = inputs.stages_completed >= 1 ? inputs.stage_1_made / 5 : 0;
  const s2 = inputs.stages_completed >= 2 ? inputs.stage_2_made / 5 : 0;
  const s3 = inputs.stages_completed >= 3 ? inputs.stage_3_made / 5 : 0;

  const weighted = s1 * WEIGHTS[0] + s2 * WEIGHTS[1] + s3 * WEIGHTS[2];
  return normalise((weighted / MAX_WEIGHT_SUM) * 100);
}

// ── Dispatch table ─────────────────────────────────────────────────────────────
// Called by API routes to compute skill_index from raw_inputs + game_type.
// Using a typed dispatch avoids a giant switch statement in each route.

type ScoringFunction = (inputs: Record<string, unknown>) => number;

const SCORING_FUNCTIONS: Record<ForgeGameType, ScoringFunction> = {
  fairway_funnels:      (i) => scoreFairwayFunnels(i as FairwayFunnelsInput),
  cold_start:           (i) => scoreColdStart(i as ColdStartInput),
  the_gauntlet:         (i) => scoreTheGauntlet(i as TheGauntletInput),
  never_repeat:         (i) => scoreNeverRepeat(i as NeverRepeatInput),
  nine_shot:            (i) => scoreNineShot(i as NineShotInput),
  the_ladder:           (i) => scoreTheLadder(i as TheLadderInput),
  up_and_down_survivor: (i) => scoreUpAndDownSurvivor(i as UpAndDownSurvivorInput),
  pressure_chip:        (i) => scorePressureChip(i as PressureChipInput),
  gate_drill:           (i) => scoreGateDrill(i as GateDrillInput),
  speed_ladder:         (i) => scoreSpeedLadder(i as SpeedLadderInput),
  the_closer:           (i) => scoreTheCloser(i as TheCloserInput),
};

/**
 * Compute the normalised skill_index (0–100) for any game.
 * Raw inputs must already be validated by the appropriate Zod schema.
 */
export function computeSkillIndex(
  gameType: ForgeGameType,
  rawInputs: Record<string, unknown>,
): number {
  const fn = SCORING_FUNCTIONS[gameType];
  return fn(rawInputs);
}

// ── RYP Performance Index ──────────────────────────────────────────────────────

export interface PillarIndexes {
  driving_index:  number | null;
  approach_index: number | null;
  chipping_index: number | null;
  putting_index:  number | null;
}

export interface RypIndexResult {
  ryp_index:      number;
  /** How many pillars contributed (1–4). Less than 4 = partial session. */
  pillars_scored: number;
  /** True when all 4 pillars are scored (full RYP index). */
  is_complete:    boolean;
}

/**
 * Compute the RYP Performance Index from pillar indexes.
 *
 * Equal-weighted mean of all non-null pillar scores.
 * Returns null if no pillars have been scored yet.
 *
 * Chapter 15 context: the index is designed to give a single number
 * that represents overall practice quality. Equal weighting reflects
 * the philosophy that all four pillars matter equally.
 */
export function computeRypIndex(pillars: PillarIndexes): RypIndexResult | null {
  const values = [
    pillars.driving_index,
    pillars.approach_index,
    pillars.chipping_index,
    pillars.putting_index,
  ].filter((v): v is number => v !== null);

  if (values.length === 0) return null;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    ryp_index:      normalise(mean),
    pillars_scored: values.length,
    is_complete:    values.length === 4,
  };
}

/**
 * Map a drill_type to its pillar index key on a session row.
 * Used when updating session denormalised columns after a drill is scored.
 */
export function drillTypeToIndexColumn(
  drillType: ForgeDrillType,
): keyof PillarIndexes {
  const MAP: Record<ForgeDrillType, keyof PillarIndexes> = {
    driving:  'driving_index',
    approach: 'approach_index',
    chipping: 'chipping_index',
    putting:  'putting_index',
  };
  return MAP[drillType];
}

/**
 * Produce a human-readable label for a skill index value.
 *
 *   90–100 = Elite
 *   75–89  = Advanced
 *   60–74  = Developing
 *   45–59  = Foundational
 *   0–44   = Building
 */
export function skillIndexLabel(score: number): string {
  if (score >= 90) return 'Elite';
  if (score >= 75) return 'Advanced';
  if (score >= 60) return 'Developing';
  if (score >= 45) return 'Foundational';
  return 'Building';
}

/**
 * Delta between two skill index values, formatted as a signed string.
 * Used in trend indicators: "+4.5" or "-2.1".
 */
export function formatIndexDelta(current: number, previous: number): string {
  const delta = current - previous;
  const sign  = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}
