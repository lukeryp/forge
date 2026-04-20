/**
 * FORGE — Scoring engine (cert.rypgolf.com spec).
 *
 * Convention: golf scoring, per-ball outcomes from Eagle (−2) to Triple (+3).
 *   Pillar Index = running total (+ handicap baseline for Driving).
 *   Lower is better. Elite Driver ≤ −10. Needs Work ≥ 24.
 *
 * Composite FORGE Performance Index (outdoor):
 *   Approach 40% · Driving 20% · Chipping 20% · Putting 20%
 *
 * Pure functions only. No I/O.
 */

import type {
  DrivingInput,
  ApproachInput,
  ChippingInput,
  PuttingInput,
} from './schemas';
import type { ForgeDrillType, InterpretationTier } from './constants';
import {
  DRIVING_LEVELS,
  DRIVING_BASELINE_MEN,
  DRIVING_BASELINE_WOMEN,
  CHIPPING_LEVELS,
  INTERPRETATION_BY_DRILL,
  COMPOSITE_WEIGHTS,
} from './constants';

// ── Utility ───────────────────────────────────────────────────────────────────

function roundTo(val: number, decimals = 2): number {
  const k = 10 ** decimals;
  return Math.round(val * k) / k;
}

// ── Driving ───────────────────────────────────────────────────────────────────
// Driving Index = baseline(handicap/distance) + running_total(ball_outcomes)

export function driverBaseline(
  gender: 'men' | 'women',
  avgDistanceYd: number,
): number {
  const table = gender === 'men' ? DRIVING_BASELINE_MEN : DRIVING_BASELINE_WOMEN;
  // Find the highest baseline the player qualifies for (table is descending by distance)
  const qualifying = table.find((row) => avgDistanceYd >= row.avg_distance_yd);
  if (qualifying) return qualifying.baseline;
  // Below all thresholds — floor at the worst baseline
  const last = table[table.length - 1];
  return last ? last.baseline : 25;
}

export function scoreDriving(input: DrivingInput): number {
  const level = DRIVING_LEVELS.find((l) => l.level === input.level);
  if (!level) throw new Error(`Unknown driving level: ${input.level}`);

  const runningTotal = input.ball_outcomes.reduce((sum, column) => {
    switch (column) {
      case 'fairway':
        return sum + level.fairway_hit_points;
      case 'good_left':
      case 'good_right':
        return sum + level.good_miss_points;
      case 'bad_left':
      case 'bad_right':
        return sum + level.bad_miss_points;
      default:
        return sum;
    }
  }, 0);

  const baseline = driverBaseline(input.gender, input.avg_distance_yd);
  return roundTo(baseline + runningTotal, 0);
}

// ── Approach ──────────────────────────────────────────────────────────────────

const APPROACH_POINTS: Record<string, number> = {
  eagle:  -2, // within 5%
  birdie: -1, // within 10%
  par:     0, // beyond 10%
  double: +2, // mishit
};

export function scoreApproach(input: ApproachInput): number {
  const total = input.ball_outcomes.reduce(
    (sum, o) => sum + (APPROACH_POINTS[o] ?? 0),
    0,
  );
  return roundTo(total, 0);
}

// ── Chipping ──────────────────────────────────────────────────────────────────

export function scoreChipping(input: ChippingInput): number {
  const level = CHIPPING_LEVELS.find((l) => l.level === input.level);
  if (!level) throw new Error(`Unknown chipping level: ${input.level}`);

  const points: Record<string, number> = {};
  for (const o of level.outcomes) points[o.id] = o.points;

  const total = input.ball_outcomes.reduce(
    (sum, o) => sum + (points[o] ?? 0),
    0,
  );
  return roundTo(total, 0);
}

// ── Putting ───────────────────────────────────────────────────────────────────

const PUTTING_POINTS: Record<string, number> = {
  make: -1,
  par:   0,
  miss: +1,
};

export function scorePutting(input: PuttingInput): number {
  const allOutcomes = [
    ...input.tier_3_outcomes,
    ...input.tier_2_outcomes,
    ...input.tier_1_outcomes,
  ];
  const total = allOutcomes.reduce((sum, o) => sum + (PUTTING_POINTS[o] ?? 0), 0);
  return roundTo(total, 0);
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export function computeSkillIndex(
  drillType: ForgeDrillType,
  rawInputs: Record<string, unknown>,
): number {
  switch (drillType) {
    case 'driving':  return scoreDriving(rawInputs as unknown as DrivingInput);
    case 'approach': return scoreApproach(rawInputs as unknown as ApproachInput);
    case 'chipping': return scoreChipping(rawInputs as unknown as ChippingInput);
    case 'putting':  return scorePutting(rawInputs as unknown as PuttingInput);
  }
}

// ── Composite FORGE Performance Index ─────────────────────────────────────────

export interface PillarIndexes {
  driving_index:  number | null;
  approach_index: number | null;
  chipping_index: number | null;
  putting_index:  number | null;
}

export interface RypIndexResult {
  ryp_index:      number;
  pillars_scored: number;
  is_complete:    boolean;
}

/**
 * Weighted composite. Uses only pillars that are scored; re-normalises the
 * weights so a partial session still produces a comparable number.
 *
 *   ryp = sum(pillar * weight) / sum(weights for scored pillars)
 *
 * Lower is better.
 */
export function computeRypIndex(pillars: PillarIndexes): RypIndexResult | null {
  const entries: Array<{ key: keyof PillarIndexes; value: number; weight: number }> = [
    { key: 'driving_index',  value: pillars.driving_index  ?? NaN, weight: COMPOSITE_WEIGHTS.driving },
    { key: 'approach_index', value: pillars.approach_index ?? NaN, weight: COMPOSITE_WEIGHTS.approach },
    { key: 'chipping_index', value: pillars.chipping_index ?? NaN, weight: COMPOSITE_WEIGHTS.chipping },
    { key: 'putting_index',  value: pillars.putting_index  ?? NaN, weight: COMPOSITE_WEIGHTS.putting },
  ];

  const scored = entries.filter((e) => !Number.isNaN(e.value));
  if (scored.length === 0) return null;

  const weightSum  = scored.reduce((s, e) => s + e.weight, 0);
  const weightedSum = scored.reduce((s, e) => s + e.value * e.weight, 0);

  return {
    ryp_index:      roundTo(weightedSum / weightSum, 1),
    pillars_scored: scored.length,
    is_complete:    scored.length === 4,
  };
}

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

// ── Interpretation ────────────────────────────────────────────────────────────

export function indexTier(
  drillType: ForgeDrillType,
  index: number,
): InterpretationTier {
  const tiers = INTERPRETATION_BY_DRILL[drillType];
  const hit = tiers.find((t) => index <= t.maxIndex);
  return hit ?? tiers[tiers.length - 1]!;
}

export function skillIndexLabel(drillType: ForgeDrillType, index: number): string {
  return indexTier(drillType, index).label;
}

/**
 * Tone colour for an index value. Lower is better, so the colour scale
 * is inverted from what we had before.
 *
 *   Elite / Tour   → Fairway (primary)
 *   Strong/Average → Bone (neutral foreground)
 *   Developing     → Ash (muted)
 *   Needs Work     → Clay (warning)
 */
export function indexTone(drillType: ForgeDrillType, index: number): 'elite' | 'tour' | 'strong' | 'average' | 'developing' | 'needs_work' {
  return indexTier(drillType, index).tone;
}

export function formatIndexDelta(current: number, previous: number): string {
  // For this pillar system, negative delta = improvement.
  const delta = current - previous;
  const sign  = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(0)}`;
}

// ── Composite-level interpretation (weighted composite) ───────────────────────
// The composite scale mirrors the approach scale since Approach dominates (40%).

export function compositeTier(index: number): InterpretationTier {
  return indexTier('approach', index);
}
